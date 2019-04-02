/**
 * The folder into which we put temporary files
 * @type {string}
 */
export const TEMP_FOLDER = ".infrastructure_temp";

import { runWebpack } from './webpack-libs';
import { promisify } from './cmd-libs';
import { currentAbsolutePath } from './system-libs';

/**
 * The parser loads the con
 *
 * @param configFilePath relative path to the webpack.config.js
 * @returns webpack-config-object
 */
export async function parseConfiguration (configFilePath: string) {

    //console.log("loadConfiguration");
    const path = require('path');


    const absolutePath = await currentAbsolutePath();


    //console.log(webpackConfig.module.rules[1]);

    // pack the source code of the configuration file. This way, we include all imports/requires!
    await runWebpack(complementWebpackConfig({
        entry: {
            config: "./"+configFilePath
        },
        output: {
            libraryTarget: "commonjs2",
            path: path.join(absolutePath, TEMP_FOLDER),
            filename: 'config.js'
        },
        target: "node"
    }));


    const data = await promisify(callback => cmd.get(`cat ${path.join(absolutePath, TEMP_FOLDER, "config.js")}`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    if (!data) {
        return;
    }

    console.log("loadConfiguration: run eval!");

    const resolvedConfigPath = path.join(absolutePath, TEMP_FOLDER, 'config.js');
    console.log("path: " , resolvedConfigPath);


    var configStr = "";
    eval (`configStr=JSON.stringify(require("${resolvedConfigPath}"), (name, val) => name ==='type' && typeof val === 'function' ? val.toString() :val)`)

    console.log("configStr: ", configStr);


    // convert the json into an object
    var config = undefined;
    eval('config=' + configStr);

    return parseConfig(config);
};

