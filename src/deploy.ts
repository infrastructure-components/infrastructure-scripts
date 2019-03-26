/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */


import { loadConfiguration, complementWebpackConfig, startDevServer } from './libs';
import { ConfigTypes } from 'infrastructure-components';


import { startSlsOffline, deploySls } from './types/sls-config';
import { startSsr, deploySsr } from './types/ssr-config';
import {isoToSsr} from "./types/iso-config";

/**
 *
 * @param configFilePath
 */
export async function deploy (configFilePath: string) {

    const config = await loadConfiguration(configFilePath);

    // when we have a browser app, we start it directly
    if (config.type === ConfigTypes.LOWLEVEL_SPA && config.webpackConfig !== undefined) {


        console.log("Deploy SPA!");
        // TODO implement spa deployment to S3
        console.error("Cannot start the provided configuration!")
        
    } else if (config.type === ConfigTypes.LOWLEVEL_SERVER && config.slsConfig !== undefined) {

        console.log("Deploy LowLevel SSR!");
        deploySls(config.slsConfig, true);


    } else if (config.type === ConfigTypes.SSR && config.ssrConfig !== undefined) {

        console.log("deploy ssr");
        deploySsr(config.ssrConfig, true);

    } else if (config.type === ConfigTypes.ISOMORPHIC && config.ssrConfig !== undefined && config.isoConfig !== undefined) {

        const { isoConfig, ssrConfig } = config;
        console.log("deploy iso");
        deploySsr((await isoToSsr(configFilePath, isoConfig, ssrConfig)), config.slsConfig !== undefined ? config.slsConfig : {}, true);

    } else {
        console.error("Cannot deploy the provided configuration!")
    }


}
