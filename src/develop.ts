
import { prepareConfiguration, loadStaticConfiguration } from './infra-comp-utils/configuration-lib';
import {parseForPlugins, extractConfigs} from "./infra-comp-utils/parser";
import {INFRASTRUCTURE_MODES, loadConfiguration} from "./infra-comp-utils/loader";
import { IConfigParseResult } from './infra-comp-utils/config-parse-result';
import {runWebpack} from "./infra-comp-utils/webpack-libs";

/**
 *
 * @param configFilePath
 */
export async function develop (configFilePath: string) {

    // create a usable configuration
    const configPath = await prepareConfiguration(configFilePath);

    // load the configuration
    const config = loadConfiguration(configPath, INFRASTRUCTURE_MODES.COMPILATION);

    // parse the configuration for plugins
    const plugins = parseForPlugins(config, configFilePath);
    console.log("plugins: ", plugins);

    // load the configuration statically (without objects)
    //const staticConfig = loadStaticConfiguration(configPath).default;
    //console.log("staticConfig: ", staticConfig);


    // parse the loaded configuration in compile mode (statically)
    const parsedConfig: IConfigParseResult = await extractConfigs(config, plugins, INFRASTRUCTURE_MODES.COMPILATION);


    console.log("\n--------------------------------------------------");
    console.log("parsed config: ", parsedConfig);
    console.log("--------------------------------------------------\n");


    // now run the webpacks
    await Promise.all(parsedConfig.webpackConfigs.map(async wpConfig => {
        //console.log("wpConfig: ", wpConfig);
        
        await runWebpack(wpConfig)
    }));

    // now run the post-build functions
    await Promise.all(parsedConfig.postBuilds.map(async postBuild => await postBuild()));
};
