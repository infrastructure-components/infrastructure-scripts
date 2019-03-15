
import { loadConfiguration, complementWebpackConfig } from './libs';
import { ConfigTypes } from './config';


/**
 *
 * @param configFilePath
 */
export async function build (configFilePath: string) {

    const webpack = require('webpack');
    const config = await loadConfiguration(configFilePath);

    // TODO depending on the configuration, we might need to build more than one webpack package
    // && scripts build webpack.config.server.js && cp -rf ./dist/js/ ./build/server/assets/

    if (config.type === ConfigTypes.LOWLEVEL_SPA || config.type === ConfigTypes.LOWLEVEL_SERVER ) {
        await webpack(complementWebpackConfig(config.webpackConfig), (err, stats) => {
            if (err) {
                console.error(err.stack || err);
                if (err.details) {
                    console.error(err.details);
                }
                return;
            }

            const info = stats.toJson();

            if (stats.hasErrors()) {
                console.error(info.errors);
            }

            if (stats.hasWarnings()) {
                console.warn(info.warnings);
            }


        });
    } else {
        // TODO implement the build process for higher level APIs
    }




};
