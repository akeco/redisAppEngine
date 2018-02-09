const add_questsion = require("../services/add_question");

const question_controller = async (req, res, next) => {
    "use strict";
    const result = await add_questsion(req.body.data);
    res.send("CONTROLLER WORKS");
};

module.exports = question_controller;