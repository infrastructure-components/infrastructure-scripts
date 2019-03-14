/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */

import { loadConfiguration, startDevServer } from './libs';

/**
 *
 * @param configFilePath
 */
export async function start (configFilePath: string) {

    const webpackConfig = await loadConfiguration(configFilePath);

    // when we have a browser app, we start it directly

    if (webpackConfig.target == undefined || webpackConfig.target === "web") {
        startDevServer(webpackConfig)
    } else {
        // TODO implement starting a server application!
        console.error("TODO implement starting a server application!")
    }


}
