module.exports = (expressServer) => {
    "use strict";

    const axios = require('axios');
    const redis = require('redis');
    const emailVerification = require('../services/email_verification');
    const {clearAllRedisTables} = require('../services/functions');
    var QUESTION_COUTER = 0;
    var QUESTION_COUTER_LIMIT = null;
    require('dotenv').config();

    const clientSub = redis.createClient(process.env.REDISPORT, process.env.REDISHOST, {no_ready_check: true});
    const clientPub = redis.createClient(process.env.REDISPORT, process.env.REDISHOST, {no_ready_check: true});
    const io = require('socket.io').listen(expressServer);

    io.sockets.on('connection', function (socket){
        console.info("connected",socket.id);

        socket.on("join-room", (userId)=>{
            clientPub.hvals("user-id-alias", (err, response)=>{
                console.log("ALIASES", response);
                if(response){
                    const ifExist = response.indexOf(userId);
                    if(ifExist == -1){
                        clientPub.sismember("disabled-users", userId, (err, response)=>{
                            if(!err && response === 0){
                                clientPub.sadd("active-users", userId, (err, response)=>{
                                    if(!err && response === 1){
                                        console.log("JOINED available-users-room");
                                        socket.join("available-users-room");
                                        socket.emit("joined-available-users-room");
                                        clientPub.hset("user-id-alias", socket.id, userId, redis.print);
                                    }
                                });
                            }
                        });
                    }
                    else socket.emit("user-already-joined");
                }
            });
        });


        socket.on("send-answer", (data) => {
            if (data) {
                clientPub.zadd(["userList", data.score, data.user], (err, response) => {
                    if (err) throw err;
                    console.log('added ' + response + ' items.');
                });
            }
        });

        socket.on("disable-user", (userId) => {
            if(userId){
                socket.leave("available-users-room");
                clientPub.sadd("disabled-users", userId);
                clientPub.srem("active-users", userId, (err, response)=>{
                    if(!err && response === 1){
                        console.log("AVAILABLE ROOM LEAVED");
                        socket.leave("available-users-room");
                    }
                });
                clientPub.hdel("user-id-alias", socket.id, redis.print);
                socket.disconnect();
            }
        });

        socket.on("forceDisconnect", ()=>{
            console.info("forced disconnected", socket.id);
            clientPub.hget("user-id-alias", socket.id, (err, response)=>{
                console.log("FROM ACTIVE", response);
                if(response){
                    clientPub.srem("active-users", response, (err, response)=>{
                        if(!err && response === 1){
                            socket.leave("available-users-room");
                            clientPub.hdel("user-id-alias", socket.id, redis.print);
                        }
                    });
                    clientPub.hdel("user-id-alias", socket.id, redis.print);
                }
            });
            socket.disconnect();
        });

        socket.on("change-email-token", (userData)=>{
            if(userData && userData.email && userData.userId) emailVerification(userData.email, userData.userId);
        });

        socket.once('disconnect', function () {
            console.info("disconnected", socket.id);
            socket.disconnect();
            clientPub.hget("user-id-alias", socket.id, (err, response)=>{
                console.log("FROM ACTIVE", response);
                if(response){
                    clientPub.srem("active-users", response, (err, response)=>{
                        if(!err && response === 1){
                            socket.leave("available-users-room");
                            clientPub.hdel("user-id-alias", socket.id, redis.print);
                        }
                    });
                    clientPub.hdel("user-id-alias", socket.id, redis.print);
                }

            });
        });
    });

    clientPub.on('connect', function() {
        console.log('Connected to Redis Pub');

    }).on('error', function () {
        console.log('Redis connection error');
    });

    clientSub.on('connect', function() {
        console.log('Connected to Redis Sub');

    }).on('error', function () {
        console.log('Redis connection error');

    }).on("message", (channel, data)=>{

        switch (channel){
            case "set-question-limit-number":
                if(!isNaN(data)) QUESTION_COUTER_LIMIT = data;
                break;

            case "clear-user-bans":
                console.log("REMOVE ALL FROM REDIS");
                clearAllRedisTables(clientPub);
                break;

            case "receive-question":
                console.info("SEND DATA TO MOBILE", data);
                const questionID = JSON.parse(data).id;
                const date = JSON.parse(data).date;

                setTimeout(()=>{
                    clientPub.zrevrangebyscore([ 'userList', '+inf', '-inf', 'WITHSCORES' ], (error, response)=>{
                        if(error) return error;
                        console.info("Fetch", response);

                        if(response) {
                            var scoreList = [];
                            var formatedQuestionResult = [];

                            response.forEach((result, index)=>{
                                if(index % 2 == 0){
                                    console.info("RES ITEM", result);
                                    scoreList.push({
                                        userID: JSON.parse(result).userId,
                                        username: JSON.parse(result).username,
                                        score: response[index+1]
                                    });
                                    formatedQuestionResult.push(JSON.stringify({
                                        total: JSON.parse(result).total,
                                        score: response[index+1],
                                        userDetails: `${JSON.parse(result).username} ${JSON.parse(result).avatarURL}`
                                    }));
                                }
                            });


                            if(scoreList.length){
                                axios.post(`${process.env.API_HOSTNAME}/api/questionResults`,
                                    {
                                        scores: scoreList,
                                        questionID,
                                        date
                                    },
                                ).then((response)=>{
                                    if(response.status == 200){
                                        console.info("POST RESPONSE SUCCESS", response.data);
                                    }
                                }).catch((err)=>{
                                    console.info("POST REQUEST ERROR", err);
                                });
                            }

                            console.log("FORMATED LIST", formatedQuestionResult);
                            if(formatedQuestionResult) clientPub.publish("send-result", formatedQuestionResult.join('*-*'));
                        }
                    });


                    clientPub.del('userList', function (err, succeeded) {
                        if(err) throw err;
                        console.log(succeeded); // will be true if successfull
                    });


                    if(QUESTION_COUTER == QUESTION_COUTER_LIMIT) {
                        clearAllRedisTables(clientPub);
                        QUESTION_COUTER = 0;
                    }

                }, 10000);

                io.sockets.to("available-users-room").emit("receive-question", data);
                QUESTION_COUTER++;
                break;
        }
    }).subscribe("receive-question", "set-question-limit-number", "clear-user-bans");

};
