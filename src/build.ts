
import { loadConfiguration } from './libs';

/**
 *
 * @param configFilePath
 */
export async function build (configFilePath: string) {

    const webpack = require('webpack');
    const config = await loadConfiguration(configFilePath);

    await webpack(config, (err, stats) => {
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


};
