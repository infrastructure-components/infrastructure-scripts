/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */


import { ConfigTypes, IConfigParseResult, PARSER_MODES } from 'infrastructure-components';
import {runWebpack} from "./infra-comp-utils/webpack-libs";
import { startDevServer } from './app';

import {createSlsYaml, startSlsOffline} from './infra-comp-utils/sls-libs';
import {parseConfiguration} from "./infra-comp-utils/configuration-lib";
import {currentAbsolutePath} from "./infra-comp-utils/system-libs";




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

    await require('infrastructure-components').fetchData("offline", {
        stackname: parsedConfig.stackName,
        envi: stage
    });

    if (parsedConfig.stackType !== "SOA" ) {
        console.log(`running ${parsedConfig.postBuilds.length} postscripts...`);
        // now run the post-build functions
        await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));

        startSlsOffline(true);
    } else {

        // run slsOffline asynchronically
        startSlsOffline(true, undefined, false); //3001,

        console.log(`running ${parsedConfig.postBuilds.length} postscripts...`);
        // now run the post-build functions
        await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild({serviceEndpoints: ["http://localhost:3001"]})));


        const path = require('path');

        //console.log("parsedConfig: ", parsedConfig)

        // we provide the localUrl==index.html to use the template created by the SoaPlugin
        startDevServer(parsedConfig.webpackConfigs[0], "http://localhost:3001",
            path.resolve(
                currentAbsolutePath(),
                parsedConfig.buildPath, parsedConfig.stackName, "index.html"
            )
        );

    }
}
