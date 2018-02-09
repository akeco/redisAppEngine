const jwt = require('jsonwebtoken');

exports.generateToken = (email) => {
    "use strict";
    const token = jwt.sign({
        exp: Math.floor(new Date().getTime() + 3600000*24*7),
        data: email,
    }, process.env.TOKEN_SECRET);
    return token;
};


exports.tokenValidation = (req, res, next) => {
    "use strict";
    if(req.body.data.token){
        var decoded = jwt.verify(req.body.data.token, process.env.TOKEN_SECRET);
        console.info("DECODED", decoded);
        if(decoded) next();
        else res.sendStatus(401);
    }
    else res.sendStatus(401);
};

