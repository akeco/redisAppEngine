module.exports = (expressServer) => {
    "use strict";

    const axios = require('axios');
    const redis = require('redis');
    require('dotenv').config();

    const clientSub = redis.createClient(process.env.REDISPORT, process.env.REDISHOST, {no_ready_check: true});
    const clientPub = redis.createClient(process.env.REDISPORT, process.env.REDISHOST, {no_ready_check: true});
    const io = require('socket.io').listen(expressServer);

    io.sockets.on('connection', function (socket){
        console.info("connected",socket.id);

        socket.on("join-room", (userId)=>{
            clientPub.sismember("disabled-users", userId, (err, response)=>{
                if(!err && response === 0){

                    clientPub.sismember("active-users", userId, (err, response)=>{
                        if(!err && response === 0){
                            clientPub.sadd("active-users", userId, (err, response)=>{
                                if(!err && response === 1){
                                    console.log("JOINED available-users-room");
                                    /*
                                        BEFORE JOINS TO ACTIVE ROOM, CHANGE DEFAULT ID TO CUSTOM ID
                                     */
                                    console.log("OLD ID", socket.id);
                                    socket.id = userId;
                                    console.log("NEW ID", socket.id);
                                    socket.join("available-users-room");
                                }
                            });
                        }
                        else if(response === 1){
                            socket.emit("user-already-joined");
                        }
                    });
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
            if(data){
                socket.leave("available-users-room");
                clientPub.sadd("disabled-users", userId);
                clientPub.srem("active-users", userId, (err, response)=>{
                    if(!err && response === 1){
                        socket.leave("available-users-room");
                    }
                });
                socket.disconnect();
            }
        });

        socket.once('disconnect', function () {
            console.info("disconnected", socket.id);
            socket.disconnect();
            clientPub.srem("active-users", socket.id, (err, response)=>{
                if(!err && response === 1){
                    socket.leave("available-users-room");
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
        if(channel === "receive-question"){
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
                            if((index % 2 != 0 || index == 0) && index != response.length-1){
                                scoreList.push({
                                    userID: JSON.parse(result).userId,
                                    username: JSON.parse(result).username,
                                    score: response[index+1]
                                });
                                formatedQuestionResult.push(JSON.parse(result).userId, response[index+1]);
                            }

                        });

                        if(scoreList.length){
                            axios.post('http://localhost:3000/api/questionResults',
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

                        clientPub.publish("send-result", formatedQuestionResult.toString());
                    }
                });

                clientPub.del('userList', function (err, succeeded) {
                    if(err) throw err;
                    console.log(succeeded); // will be true if successfull
                });

            }, 10000);
            io.sockets.to("available-users-room").emit("receive-question", data)
        }
    }).subscribe("receive-question");

};
