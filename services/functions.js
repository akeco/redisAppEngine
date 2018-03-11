function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

const clearAllRedisTables = (clientPub) => {
    clientPub.del('disabled-users', function (err, succeeded) {
        if(err) throw err;
        console.log("REMOVED disabled-users", succeeded); // will be true if successfull
    });

    clientPub.del('active-users', function (err, succeeded) {
        if(err) throw err;
        console.log("REMOVED active-users", succeeded); // will be true if successfull
    });

    clientPub.del('user-id-alias', function (err, succeeded) {
        if(err) throw err;
        console.log("REMOVED user-id-alias", succeeded); // will be true if successfull
    });
};

module.exports = {
    getRandomIntInclusive,
    clearAllRedisTables
};