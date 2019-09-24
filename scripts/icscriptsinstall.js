#!/usr/bin/env node

const YAML = "service:\n  name: install-config\nplugins:\n  - serverless-dynamodb-local\nprovider:\n  name: aws\n  runtime: nodejs8.10";

/**
 * using await at top-level.
 * see: https://stackoverflow.com/questions/39679505/using-await-outside-of-an-async-function
 */
;(async () => {


    const fs = require("fs");

    await fs.writeFile('../../serverless.yml', YAML, function (err) {
        if (err) throw err;
        console.log('serverless.yml created...');
    });

    console.log("install local DynamoDB");


    await (require('../dist/infra-comp-utils/sls-libs').runSlsCmd(
        "cd .. && cd .. && sls dynamodb install"
    ));



    /*
    await (require('../dist/infra-comp-utils/sls-libs').runSlsCmd(
        "sls plugin install --name serverless-dynamodb-local"
    ));*/

})();
