
import { loadConfiguration, complementWebpackConfig, runWebpack } from './libs';
import { ConfigTypes } from './config';
import { buildSsr } from './types/ssr-config';

/**
 *
 * @param configFilePath
 */
export async function build (configFilePath: string) {

    const webpack = require('webpack');
    const config = await loadConfiguration(configFilePath);

    // TODO depending on the configuration, we might need to build more than one webpack package
    // && scripts build webpack.config.server.js && cp -rf ./dist/js/ ./build/server/assets/

    if (config.type === ConfigTypes.LOWLEVEL_SPA || config.type === ConfigTypes.LOWLEVEL_SERVER ) {

        await runWebpack(complementWebpackConfig(config.webpackConfig));

    } else if (config.type === ConfigTypes.SSR && config.ssrConfig !== undefined) {

        const { ssrConfig } = config;
        await buildSsr(ssrConfig);
        
    } else {
        // TODO implement the build process for higher level APIs

    }




};
