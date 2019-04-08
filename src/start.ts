/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */


//import { loadConfiguration, complementWebpackConfig, startDevServer } from './libs';
import { ConfigTypes } from 'infrastructure-components';


import { startSlsOffline } from './infra-comp-utils/sls-libs';

/**
 *
 * @param configFilePath
 */
export async function start (configFilePath: string) {

    startSlsOffline(true);

}
