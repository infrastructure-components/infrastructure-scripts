#!/usr/bin/env node

/**
 * Entry point of the script-commands
 *
 * the provided config should include `entry` and `output`
 *
 * use like:
 *
 * ```
 * const path = require('path');
 * module.exports = {
 *     entry: {
 *         app: ['./src/app/App.tsx']
 *     },
 *     output: {
 *         path: path.resolve(__dirname, 'dist'),
 *         filename: 'js/[name].bundle.js'
 *     }
 * };
 *
 * ```
 *
 * use like:
 * `scripts .env build webpack.config.js`
 * `scripts start webpack.config.js
 */


// get the provided args
const [,,...args] = process.argv;

const { loadEnv } = require('../dist/utils/system-libs');

// these are the commands that can be executed
/*const { build } = require('../dist/build');
const { start } = require('../dist/start');
const { deploy } = require('../dist/deploy');
const { init } = require('../dist/init');
*/
const { develop } = require('../dist/develop');

if (args.length > 0) {

    /**
     * using await at top-level.
     * see: https://stackoverflow.com/questions/39679505/using-await-outside-of-an-async-function
     */
    ;(async () => {
        // when the arg[0] is an .env variable, then the script starts at pos 1
        const scriptPos = await loadEnv(args[0]) ? 1 : 0;

        // the first arg must be the command, the rest is passed through
        // each arg is put into "..." to make it a valid string
        eval(`${args[scriptPos]}(${args.slice(scriptPos+1).map(arg => `"${arg}"`)})`);

    })();


} else {
    console.error("please provide the script-command");
}