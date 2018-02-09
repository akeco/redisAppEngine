"use strict";
const mongoose = require("mongoose"),
    Question = require("../models/question"),
    Questions = require("../models/questions");

module.exports = async ({question, answer}) => {
    console.info("QUESTION", question, "ANSWER", answer);
    const newQuestion = new Question({
        _id: new mongoose.Types.ObjectId(),
        question,
        answer
    });

    newQuestion.save((err)=>{
        if(err) console.info("SAVE ERROR", err);
        //const result = await Questions.findOne({created: newQuestion.created});
        //console.info("NASAO", result);
    });

};