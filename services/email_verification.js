const nodemailer = require('nodemailer');
const { getRandomIntInclusive } = require("../services/functions");
const axios = require('axios');
require('dotenv').config();


module.exports = (emailAddress, userId) => {

    const rndToken = getRandomIntInclusive(1000, 9999);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });

    var mailOptions = {
        from: process.env.EMAIL,
        //to: process.env.SEND_TO,
        subject: 'Verifikuj QuizApp korisnika',
        //text: process.env.EMAIL_HOST+"/email-validation/"+rndToken,
        text: "Unesite sljedeći code u vašu mobilnu aplikaciju: " + rndToken,
        to: emailAddress
    };

    axios.patch(`${process.env.API_HOSTNAME}/api/UserModels/${userId}`, {
        emailToken: rndToken
    }).then((response)=>{
        if(response.status == 200){
            console.info("EMAIL TOKEN SUCCESSFULLY CHANGED", response.status);
            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }
    }).catch((error)=>{
        console.info("EMAIL TOKEN UPDATE FAILED", error);
    });
};