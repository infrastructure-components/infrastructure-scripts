/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */

import { parseConfiguration } from './infra-comp-utils/configuration-lib';
import { initDomain, s3sync, createSlsYaml } from './infra-comp-utils/sls-libs';


import {
    IConfigParseResult,
    PARSER_MODES,
    getStaticBucketName
} from 'infrastructure-components';

/**
 * uses the current serverless.yml (created by previous build!) to deploy the stack
 *
 * @param configFilePath
 */
export async function domain (configFilePath: string, stage: string) {

    const path = require('path');
    
    // load and parse the configuration from the temporary folder
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath, stage, PARSER_MODES.MODE_DEPLOY);

    // (re-)create the serverless.yml
    createSlsYaml(parsedConfig.slsConfigs, true);

    // start the sls-config
    await initDomain();


};