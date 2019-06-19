/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */

import { parseConfiguration } from './infra-comp-utils/configuration-lib';
import { deploySls, s3sync, createSlsYaml, runSlsCmd } from './infra-comp-utils/sls-libs';
import * as deepmerge from 'deepmerge';
import {runWebpack} from "./infra-comp-utils/webpack-libs";


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
export async function deploy (configFilePath: string, stage: string) {

    const path = require('path');
    const rimraf = require("rimraf");


    // load and parse the configuration from the temporary folder
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath, stage, PARSER_MODES.MODE_DEPLOY);

    // delete the build-folder
    rimraf.sync(parsedConfig.buildPath);


    // (re-)create the serverless.yml
    createSlsYaml(parsedConfig.slsConfigs, true);

    // now run the webpacks - except the web-targets
    await Promise.all(parsedConfig.webpackConfigs.filter(wpConfig => wpConfig.target !== "web").map(async wpConfig => {
        console.log("wpConfig: ", wpConfig);

        await runWebpack(wpConfig)

        console.log ("--- server webpacks done ---")
    }));

    console.log(`running ${parsedConfig.postBuilds.length} postscripts...`);
    // now run the post-build functions
    await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));


    // start the sls-config
    await deploySls();


    /* we can use the stage-arg here, because this is supposed to be the name of the environment anyway!
    const env = Array.isArray(parsedConfig.environments) && parsedConfig.environments.length > 0 ?
        parsedConfig.environments[0] : parsedConfig.environments;

    env !== undefined && env.name !== undefined ? env.name :*/

    const staticBucketName = getStaticBucketName(parsedConfig.stackName, parsedConfig.assetsPath, stage);

    // now run the web-targets webpacks -
    await Promise.all(parsedConfig.webpackConfigs.filter(wpConfig => wpConfig.target === "web").map(async wpConfig => {
        console.log("wpConfig: ", wpConfig);

        await runWebpack(wpConfig)

        console.log ("--- client webpacks done ---")
    }));


    // copy the client apps to the assets-folder
    console.log("start S3 Sync");

    await Promise.all(
        // only copy webapps
        parsedConfig.webpackConfigs.filter(wpConfig => wpConfig.target === "web").map(async wpConfig => {
            await s3sync(parsedConfig.region, staticBucketName, path.join(parsedConfig.buildPath, wpConfig.name))
        })
    );


    var eps: any = {};

    await runSlsCmd("echo $(sls info)", data => {
        //console.log("data: " , data);

        eps = data.split(" ").reduce(({inSection, endpoints}, val, idx) => {
            //console.log("eval: " , val);

            if (inSection && val.indexOf("https://") > -1) {
                return { inSection: true, endpoints: endpoints.concat(
                    val.indexOf("{proxy+}") == -1 ? [val] : []
                )}
            }

            if (val.startsWith("endpoints:")) {
                return { inSection: true, endpoints: endpoints }
            }

            if (val.startsWith("functions:")) {
                return { inSection: false, endpoints: endpoints }
            }

            return { inSection: inSection, endpoints: endpoints }

        }, {inSection: false, endpoints: []});

        console.log("endpoints" , eps)

    }, false);


    const data = Object.assign({
        proj: parsedConfig.stackName,
        envi: stage,
        domain: parsedConfig.domain
    }, eps.endpoints.length > 0 ? { endp: eps.endpoints[0]} : {});

    console.log("analytics: " , data);

    await require('infrastructure-components').fetchData("deploy", data);
    
    if (eps.length > 0) {
        console.log("Your React-App is now available at: ", eps[0])
    }

};