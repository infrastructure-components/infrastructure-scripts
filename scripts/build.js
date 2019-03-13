#!/usr/bin/env node

/**
 * Entry point of the build-command
 */

// get the provided args
const [,,...args] = process.argv;

//const { hello } = require('../dist/index');
//hello (args);

const { build } = require('../dist/build');
build(...args);


/*
var cmd=require('node-cmd');

cmd.get(
    'ls',
    function(err, data, stderr){
        console.log('the current dir contains these files :\n\n',data)
    }
);

console.log(`hello ${args}`);*/