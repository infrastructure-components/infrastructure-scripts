
import {loadConfiguration, complementWebpackConfig, runWebpack, TEMP_FOLDER} from './libs';
import { ConfigTypes } from './lib/config';
import { buildSsr } from './types/ssr-config';
import { isoToSsr } from './types/iso-config';
const path = require('path');
const cmd = require('node-cmd');

/**
 *
 * @param configFilePath
 */
export async function build (configFilePath: string) {

    //const webpack = require('webpack');

    const config = await loadConfiguration(configFilePath);

    //const config = await loadConfiguration(configFilePath);

    console.log("config-type: ", config.type);

    // && scripts build webpack.config.server.js && cp -rf ./dist/js/ ./build/server/assets/

    if (config.type === ConfigTypes.LOWLEVEL_SPA || config.type === ConfigTypes.LOWLEVEL_SERVER ) {
        await runWebpack(complementWebpackConfig(config.webpackConfig));

    } else if (config.type === ConfigTypes.SSR && config.ssrConfig !== undefined) {

        const { ssrConfig } = config;
        await buildSsr(ssrConfig);
        
    }  else if (config.type === ConfigTypes.ISOMORPHIC && config.ssrConfig !== undefined && config.isoConfig !== undefined) {

        const { isoConfig, ssrConfig } = config;
        await buildSsr(await isoToSsr(configFilePath, isoConfig, ssrConfig));

    } else {
        // TODO implement the build process for higher level APIs

    }




};
