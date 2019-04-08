/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */

import { startDevServer } from './infra-comp-utils/iso-libs';
/**
 *
 * @param configFilePath
 */
export async function app (configFilePath: string) {

    /**
     * TODO make hot-loading of webapp possible
     * - get app-id from script
     * - create a webpack config
     * - the entry point should be a temporary file that loads/imports the entry-point-configuration
     * - this should allow the webpack observer to identify when changes occur in the file
     */

    // TODO make the app to be started dynamic
    startDevServer("/" , "./build/main/main.bundle.js")

    // TODO allow got reloading of the SPA


}
