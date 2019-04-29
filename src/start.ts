/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */


//import { loadConfiguration, complementWebpackConfig, startDevServer } from './libs';
import { ConfigTypes, IConfigParseResult, PARSER_MODES } from 'infrastructure-components';
import {runWebpack} from "./infra-comp-utils/webpack-libs";


import {createSlsYaml, startSlsOffline} from './infra-comp-utils/sls-libs';
import {parseConfiguration} from "./infra-comp-utils/configuration-lib";

/**
 *
 * @param configFilePath
 */
export async function start (configFilePath: string, stage: string | undefined) {

    // load and parse the configuration from the temporary folder
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath, stage, PARSER_MODES.MODE_START);


    // (re-)create the serverless.yml
    createSlsYaml(parsedConfig.slsConfigs, true);

    // now run the webpacks
    await Promise.all(parsedConfig.webpackConfigs.map(async wpConfig => {
        console.log("wpConfig: ", wpConfig);

        await runWebpack(wpConfig)

        console.log ("--- done ---")
    }));

    console.log(`running ${parsedConfig.postBuilds.length} postscripts...`);
    // now run the post-build functions
    await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));

    startSlsOffline(true);

}
