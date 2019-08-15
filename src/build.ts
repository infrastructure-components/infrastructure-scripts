
import { prepareConfiguration, loadStaticConfiguration } from './infra-comp-utils/configuration-lib';
import {runWebpack} from "./infra-comp-utils/webpack-libs";

import { createSlsYaml, toSlsConfig } from './infra-comp-utils/sls-libs';

import { parseConfiguration } from './infra-comp-utils/configuration-lib';

import {
    frameText,
    frameTop,
    frameBottom,
    singleLine,
    emptyLine
} from './infra-comp-utils/console-output';

const clc = require('cli-color');


import { IEnvironmentArgs, IConfigParseResult, PARSER_MODES } from 'infrastructure-components';



/**
 *
 * @param configFilePath
 */
export async function build (configFilePath: string) {

    // load and parse the configuration from the temporary folder
    // when building, we do not provide a stage - this should run the environments in build mode (considering all of them)
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath, undefined, PARSER_MODES.MODE_BUILD);

    await createSlsYaml(parsedConfig.slsConfigs, true);

    writeScriptsToPackageJson(
        configFilePath,
        parsedConfig.webpackConfigs.filter(wpConfig => wpConfig.name !== undefined).map(wpConfig => wpConfig.name),
        parsedConfig.environments,
        parsedConfig.supportOfflineStart,
        parsedConfig.supportCreateDomain
    );

    // now run the webpacks
    await Promise.all(parsedConfig.webpackConfigs.map(async wpConfig => {
        console.log("wpConfig: ", wpConfig);
        
        await runWebpack(wpConfig)

        console.log ("--- done ---")
    }));

    console.log(`running ${parsedConfig.postBuilds.length} postscripts...`);

    // now run the post-build functions
    if (parsedConfig.stackType !== "SOA" ) {
        await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));
    } else {
        await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild({serviceEndpoints: ["localhost:3001"]})));
    }

    await require('infrastructure-components').fetchData("build", {
        stackname: parsedConfig.stackName
    });

    writeMessage();

};

const writeMessage = () => {

    console.log(frameTop());
    console.log(emptyLine());
    console.log(frameText("Thank you for using Infrastructure-Components!", clc.magenta.bold));
    console.log(emptyLine());

    console.log(singleLine());
    console.log(emptyLine());

    console.log(frameText("The Infrastructure-Components are under Active Development", clc.green));

    console.log(emptyLine());

    console.log(frameText(" -- In case you need help or discovered a bug, please let us know:", clc.magenta));
    console.log(frameText("    https://spectrum.chat/infrastructure", clc.green));


    console.log(emptyLine());

    console.log(frameText(" -- Make sure you don't miss the next update or the next feature! ", clc.magenta));


    console.log(frameText("    - on Medium.com:  https://medium.com/@fzickert", clc.green));
    console.log(frameText("    - in our Docs:    https://infrastructure-components.readthedocs.io", clc.green));
    console.log(frameText("    - on our Website: https://www.infrastructure-components.com", clc.green));

    /*console.log(emptyLine());

    console.log(frameText(" -- You don't have an AWS account to deploy to? Try our managed service:", clc.magenta));
    console.log(frameText("    https://www.code-architect.com", clc.green));
    */

    console.log(emptyLine());
    console.log(frameBottom());

}

export const writeScriptsToPackageJson = (
    configFilePath: string,
    webapps: Array<string>,
    environments: Array<IEnvironmentArgs>,
    supportOfflineStart: boolean | undefined,
    supportCreateDomain: boolean | undefined) => {

    const fs = require('fs');

    try {
        fs.copyFileSync( 'package.json', 'package_last.json' );
        let rawdata = fs.readFileSync('package.json');

        let packageJson = JSON.parse(rawdata);

        const domains =  (supportCreateDomain == true || supportCreateDomain == undefined) ?
            environments.filter(env => env.domain !== undefined).map(env => {
            var result = {};
            result["domain-"+env.name] = `scripts .env domain ${configFilePath} ${env.name}`;
            return result;
        }) : [{}];

        packageJson["scripts"] = Object.assign({}, packageJson.scripts,
            ...environments.map(env => {
                var result = {};

                if (supportOfflineStart == true || supportOfflineStart == undefined) {
                    result["start-"+env.name] = `scripts .env start ${configFilePath} ${env.name}`;

                }
                
                result["deploy-"+env.name] = `scripts .env deploy ${configFilePath} ${env.name}`;

                return result;
            }),

            
            ...webapps.map(app => {
                var obj = {};
                obj[app] = `scripts app ${configFilePath} ${app}`;
                return obj;
            }),

            ...domains
        );

        fs.writeFileSync('package.json', JSON.stringify(packageJson, null , 2));
        
    } catch (error) {
        console.error("Could not write scripts to package.json\n", error);
        return undefined;
    };

}