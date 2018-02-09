const {generateToken} = require('./oauth');

const login_controller = (req, res, next) => {
    "use strict";
    const {email} = req.body.data;
    console.info("EMAIL",req.body.data);
    if(email == 'admin') req.token = generateToken(req.body.email);
    next();
};

module.exports = login_controller;