var express = require('express');
var router = express.Router();
const {tokenValidation} = require('../controlers/oauth');
const login_controller = require('../controlers/login_controller');

/* GET home page. */

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/oauth', tokenValidation, function(req, res, next){
    res.sendStatus(200);
});

router.get("*", function (req, res, next) {
    res.render('index', { title: 'Express' });
});

router.use(function (error, req, res, next) {
   console.info("ERROR", error);
   res.redirect("/login");
});

module.exports = router;
