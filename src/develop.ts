
import { parseConfiguration } from './utils/parser';

/**
 *
 * @param configFilePath
 */
export async function develop (configFilePath: string) {

    const config = await parseConfiguration(configFilePath);

    console.log("\n--------------------------------------------------");
    console.log("parsed config: ", config);
    console.log("--------------------------------------------------\n");




    if (config.type === ConfigTypes.ISOMORPHIC && config.ssrConfig !== undefined && config.isoConfig !== undefined) {

        const { isoConfig, ssrConfig } = config;


    } else {
        // TODO implement the build process for higher level APIs

    }




};
