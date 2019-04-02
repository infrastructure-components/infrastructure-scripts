
import { loadConfiguration } from './utils/configuration-lib';
import { parseConfiguration } from "./utils/parser";

/**
 *
 * @param configFilePath
 */
export async function develop (configFilePath: string) {

    // load the configuration statically (without objects)
    const config = await loadConfiguration(configFilePath);

    console.log("\n--------------------------------------------------");
    console.log("config: ", config);
    console.log("--------------------------------------------------\n");

    // parse the loaded configuration in compile mode (statically)
    const parsedConfig = await parseConfiguration(config, true);

    console.log("\n--------------------------------------------------");
    console.log("parsed config: ", parsedConfig);
    console.log("--------------------------------------------------\n");


};
