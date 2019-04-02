/**
 * The folder into which we put temporary files
 * @type {string}
 */

export const TEMP_FOLDER = ".infrastructure_temp";

import { runWebpack, complementWebpackConfig } from './webpack-libs';
import { promisify } from './cmd-libs';
import { currentAbsolutePath } from './system-libs';

/**
 * loads the static configuration from the provided entry-file
 *
 * @param configFilePath relative path to the webpack.config.js
 * @returns webpack-config-object
 */
export async function loadConfiguration (configFilePath: string) {

    //console.log("loadConfiguration");
    const path = require('path');


    const absolutePath = await currentAbsolutePath();

    const webpackConfig = complementWebpackConfig({
        entry: {
            config: "./"+configFilePath
        },
        output: {
            libraryTarget: "commonjs2",
            path: path.join(absolutePath, TEMP_FOLDER),
            filename: 'config.js'
        },
        target: "node"
    });


    // pack the source code of the configuration file. This way, we include all imports/requires!
    await runWebpack(webpackConfig);

    // the path to the packed configuration file
    const resolvedConfigPath = path.join(absolutePath, TEMP_FOLDER, 'config.js');

    // load the configuration through stringification/jsonification --> no objects but only static evaluation of definitions
    var configStr = "";
    eval (`configStr=JSON.stringify(require("${resolvedConfigPath}"), (name, val) => name ==='type' && typeof val === 'function' ? val.toString() :val)`)

    // convert the json into an object
    var config = undefined;
    eval('config=' + configStr);

    return config;
};

