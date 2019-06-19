
import { prepareConfiguration, loadStaticConfiguration } from './infra-comp-utils/configuration-lib';
import {runWebpack} from "./infra-comp-utils/webpack-libs";

import { createSlsYaml, toSlsConfig } from './infra-comp-utils/sls-libs';

import { parseConfiguration } from './infra-comp-utils/configuration-lib';

import { IEnvironmentArgs, IConfigParseResult, PARSER_MODES } from 'infrastructure-components';


/*
async function getEndpoints(onEndpoint: (data) => void) {
    const cmd = require('node-cmd');

    return new Promise((resolve, reject) => {
        let expectEndpoint = false;
        //let data_line = '';
        const processRef = cmd.get("echo $(sls info)");
        processRef.stdout.on(
            'data',
            async function(data) {
                console.log("data: " , data)

                if (data.startsWith("endpoints")) {
                    expectEndpoint = true;
                    return;
                }

                if (data[0] !== " ") {
                    expectEndpoint = false;
                    return;
                }

                if (expectEndpoint) {
                    onEndpoint(data)
                }
            }
        );

        processRef.on("exit", function (code, signal) {
            console.log('child process exited with ' +`code ${code} and signal ${signal}`);
            resolve();
        });

    });
}*/

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
    await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));
    

    await require('infrastructure-components').fetchData("build", {
        proj: parsedConfig.stackName
    });

    writeMessage();

};

const max = 76; // + 2 spaces + 2 frame == 80
const clc = require('cli-color');

const frameText = (txt, fColor) =>  "║ "+fColor(txt)+"".concat(new Array(Math.max(max-txt.length,0)).join(" ")).concat(" ║");
const frameTop = () => "\n╔═".concat(new Array(max).join("═"), "═╗");
const frameBottom = () => "╚═".concat(new Array(max).join("═"), "═╝\n");
const singleLine = () => "║-".concat(new Array(max).join("-"), "-║")
const emptyLine = () => frameText("", clc.black);

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

    console.log(emptyLine());

    console.log(frameText(" -- You don't have an AWS account to deploy to? Try our managed service:", clc.magenta));
    console.log(frameText("    https://www.code-architect.com", clc.green));


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
                    result["start-"+env.name] = `scripts start ${configFilePath} ${env.name}`;

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