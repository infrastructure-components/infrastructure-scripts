
import { prepareConfiguration, loadStaticConfiguration } from './infra-comp-utils/configuration-lib';
import {runWebpack} from "./infra-comp-utils/webpack-libs";

import { createSlsYaml, toSlsConfig } from './infra-comp-utils/sls-libs';

import { parseConfiguration } from './infra-comp-utils/configuration-lib';


import {
    IConfigParseResult,
} from 'infrastructure-components';

/**
 *
 * @param configFilePath
 */
export async function build (configFilePath: string) {

    // load and parse the configuration from the temporary folder
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath);

    createSlsYaml(parsedConfig.slsConfigs, true);

    writeScriptsToPackageJson(
        configFilePath,
        parsedConfig.webpackConfigs.filter(wpConfig => wpConfig.name !== undefined).map(wpConfig => wpConfig.name)
    );

    // now run the webpacks
    await Promise.all(parsedConfig.webpackConfigs.map(async wpConfig => {
        console.log("wpConfig: ", wpConfig);
        
        await runWebpack(wpConfig)

        console.log ("--- done ---")
    }));

    // now run the post-build functions
    await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));

};

export const writeScriptsToPackageJson = (configFilePath: string, webapps: Array<string>) => {
    const fs = require('fs');

    try {
        fs.copyFileSync( 'package.json', 'package_last.json' );
        let rawdata = fs.readFileSync('package.json');

        let packageJson = JSON.parse(rawdata);

        // TODO currently dev-environment hardcoded!
        
        packageJson["scripts"] = Object.assign({}, packageJson.scripts, {
            start: `scripts start ${configFilePath}`,
            deploy: `scripts .env deploy ${configFilePath} dev`,
        }, ...webapps.map(app => {
            var obj = {};
            obj[app] = `scripts app ${configFilePath} ${app}`;
            return obj;
        }));

        fs.writeFileSync('package.json', JSON.stringify(packageJson, null , 2));
        
    } catch (error) {
        console.error("Could not write scripts to package.json\n", error);
        return undefined;
    };

}