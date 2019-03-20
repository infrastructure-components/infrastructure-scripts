
import {loadConfiguration, complementWebpackConfig, runWebpack, promisify} from './libs';
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

    const webpack = require('webpack');

    const pwd = await promisify(callback => cmd.get(`pwd`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return "";
        });

    const absolutePath = pwd.toString().replace(/(?:\r\n|\r|\n)/g, "");

    // pack the source code of the isomorphic server
    await runWebpack(complementWebpackConfig({
        entry: {
            server: "./"+configFilePath
        },
        output: {
            libraryTarget: "commonjs2",
            path: path.join(absolutePath, ".infrastructure-temp"),
            filename: 'config.js'
        },
        target: "node"
    }));

    const config = await loadConfiguration("./"+path.join(".infrastructure-temp", 'config.js'));

    //const config = await loadConfiguration(configFilePath);


    // && scripts build webpack.config.server.js && cp -rf ./dist/js/ ./build/server/assets/

    if (config.type === ConfigTypes.LOWLEVEL_SPA || config.type === ConfigTypes.LOWLEVEL_SERVER ) {
        await runWebpack(complementWebpackConfig(config.webpackConfig));

    } else if (config.type === ConfigTypes.SSR && config.ssrConfig !== undefined) {

        const { ssrConfig } = config;
        await buildSsr(ssrConfig);
        
    }  else if (config.type === ConfigTypes.ISOMORPHIC && config.ssrConfig !== undefined && config.isoConfig !== undefined) {




        const { isoConfig, ssrConfig } = config;
        await buildSsr(await isoToSsr(isoConfig, ssrConfig));

    } else {
        // TODO implement the build process for higher level APIs

    }




};
