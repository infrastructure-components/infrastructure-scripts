
import { runWebpack, complementWebpackConfig } from './webpack-libs';
import { currentAbsolutePath } from './system-libs';

/**
 * The folder into which we put temporary files
 * @type {string}
 */
export const TEMP_FOLDER = ".infrastructure_temp";


/**
 * prepares the configuration from the provided entry-file into a importable ("eval"uable) file
 *
 * @param configFilePath relative path to the webpack.config.js
 * @returns path to the created configuration file
 */
export async function prepareConfiguration (configFilePath: string) {

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

    return resolvedConfigPath;


};

/**
 * loads the configuration as a stringified/jsonified object
 */
export function loadStaticConfiguration(configFilePath: string) {
    // load the configuration through stringification/jsonification --> no objects but only static evaluation of definitions
    var configStr = "";
    eval (`configStr=JSON.stringify(require("${configFilePath}"), (name, val) => name ==='type' && typeof val === 'function' ? val.toString() :val)`)

    // convert the json into an object
    var config = undefined;
    eval('config=' + configStr);

    return config;
}