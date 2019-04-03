
import { prepareConfiguration, loadStaticConfiguration } from './utils/configuration-lib';
import { parseForPlugins, extractConfigs } from "./utils/parser";
import { IConfigParseResult } from './types/config-parse-result';

/**
 *
 * @param configFilePath
 */
export async function develop (configFilePath: string) {

    // create a usable configuration
    const configPath = await prepareConfiguration(configFilePath);

    // parse the configuration for plugins
    const plugins = parseForPlugins(configPath);

    // load the configuration statically (without objects)
    const staticConfig = loadStaticConfiguration(configPath);

    // parse the loaded configuration in compile mode (statically)
    const parsedConfig: IConfigParseResult = await extractConfigs(staticConfig, plugins, true);

    /*
    console.log("\n--------------------------------------------------");
    console.log("config: ", config);
    console.log("--------------------------------------------------\n");
     */

    console.log("\n--------------------------------------------------");
    console.log("parsed config: ", parsedConfig);
    console.log("--------------------------------------------------\n");


};
