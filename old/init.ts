
import {loadConfiguration, complementWebpackConfig, runWebpack, TEMP_FOLDER} from './libs';
import { ConfigTypes } from 'infrastructure-components';
import { buildSsr } from './types/ssr-config';
const path = require('path');
const cmd = require('node-cmd');

/**
 *
 * @param configFilePath
 */
export async function init (configFilePath: string) {

    //const webpack = require('webpack');

    const config = await loadConfiguration(configFilePath);

    //const config = await loadConfiguration(configFilePath);

    console.log("\n--------------------------------------------------");
    console.log("config-type: ", config);
    console.log("--------------------------------------------------\n");

    if (config.type === ConfigTypes.ISOMORPHIC && config.ssrConfig !== undefined && config.isoConfig !== undefined) {

        const { isoConfig, ssrConfig } = config;


    } else {
        // TODO implement the build process for higher level APIs

    }




};
