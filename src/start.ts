/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */


//import { loadConfiguration, complementWebpackConfig, startDevServer } from './libs';
import { ConfigTypes, IConfigParseResult, PARSER_MODES } from 'infrastructure-components';


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

    startSlsOffline(true);

}
