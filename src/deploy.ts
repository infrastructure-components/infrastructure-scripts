/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */

import { parseConfiguration } from './infra-comp-utils/configuration-lib';
import { getStaticBucketName } from 'infrastructure-components';
import { deploySls, s3sync, createSlsYaml } from './infra-comp-utils/sls-libs';
import * as deepmerge from 'deepmerge';


import {
    IConfigParseResult,
} from 'infrastructure-components';

/**
 * uses the current serverless.yml (created by previous build!) to deploy the stack
 *
 * @param configFilePath
 */
export async function deploy (configFilePath: string, stage: string) {

    const path = require('path');
    
    // load and parse the configuration from the temporary folder
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath);

    // TODO when adding environments, take the stage_path from it!

    const slsConfig = deepmerge.all([parsedConfig.slsConfigs, {
        provider: {
            STAGE_PATH: stage, // TODO ! props.stagePath
        }
    }]);

    // (re-)create the serverless.yml
    createSlsYaml(slsConfig, true);

    // start the sls-config
    await deploySls();

    // TODO do not take the STAGE from environmental variables!
    const staticBucketName = getStaticBucketName(parsedConfig.stackName, parsedConfig.assetsPath, stage);

    // copy the client apps to the assets-folder
    console.log("start S3 Sync");

    await Promise.all(
        // only copy webapps
        parsedConfig.webpackConfigs.filter(wpConfig => wpConfig.target === "web").map(async wpConfig => {
            await s3sync(parsedConfig.region, staticBucketName, path.join(parsedConfig.buildPath, wpConfig.name))
        })
    );

};