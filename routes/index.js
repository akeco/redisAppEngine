var express = require('express');
var router = express.Router();
const axios = require('axios');
const {tokenValidation} = require('../controlers/oauth');
const login_controller = require('../controlers/login_controller');

/* GET home page. */

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/oauth', tokenValidation, function(req, res, next){
    res.sendStatus(200);
});

router.get('/email-validation/:randomID', async (req, res, next)=>{
    try{
        const result = await axios.get(`http://localhost:3000/api/UserModels?filter[where][emailToken]=${req.params.randomID}`);
        if(result.status == 200 && result.data && result.data.length){
                const patchResult = await axios.patch(`http://localhost:3000/api/UserModels/${result.data[0].id}`,{
                    emailVerified: true,
                    emailToken: null
                });
                if(patchResult.status == 200 && patchResult.data){
                    res.send(`Email ${result.data[0].email} je verifikovan. Možete pristupiti mobilnoj aplikaciji!`);
                }
        }
    }
    catch(e){
        console.info("AJAX request error", e);
    }
});

router.get("*", function (req, res, next) {
    res.render('index', { title: 'Express' });
});

router.use(function (error, req, res, next) {
   console.info("ERROR", error);
   res.redirect("/login");
});

module.exports = router;
