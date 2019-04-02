
/**
 * runs the provided webpack-configuration (as js-object)
 * 
 */
export function runWebpack (webpackConfig) {
    const webpack = require('webpack');

    console.log("starting webpack, ", webpackConfig);

    return new Promise(function(resolve, reject) {
        webpack(webpackConfig, (err, stats) => {
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
                reject();
                return;
            }

            if (stats.hasWarnings()) {
                console.warn(info.warnings);
            }

            console.log("finishing webpack...", webpackConfig.entry);
            resolve();
        })
    });
}
