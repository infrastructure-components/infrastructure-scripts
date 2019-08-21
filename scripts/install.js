#!/usr/bin/env node

// get the provided args
const [,,...args] = process.argv;


;(async () => {
    var exec = require('child_process').exec;
    exec("./node_modules/.bin/serverless dynamodb install")
})();