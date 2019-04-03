
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

/**
 * creates a basic webpack-configuration of a WebApp. Must be complemented using [[complementWebpackConfig]]
 *
 * @param entryPath the path to the entry-point (e.g. to index.js)
 * @param buildPath
 * @param appName
 * @param aliasDict a js-object whose keys are resolved to their values when importing them
 * @param replaceDict a js-object whose keys are replaced by their values
 */
export const createClientWebpackConfig = (
    entryPath: string, buildPath: string, appName: string, aliasDict: any, replaceDict: any) => {

    const fs = require('fs');
    const path = require('path');

    const clientPath = path.join(buildPath, appName);

    const ReplacePlugin = require('webpack-plugin-replace');

    return {
        entry: {
            app: entryPath
        },
        output: {
            path: clientPath,
            filename: appName+".js"
        },
        resolve: {
            alias: aliasDict,
        },
        plugins: [
            new ReplacePlugin({
                values: replaceDict
            })
        ],
        /*node: {
            assert: 'empty',
            buffer: 'empty',
            child_process: 'empty',
            cluster: 'empty',
            constants: 'empty',
            crypto: 'empty',
            dgram: 'empty',
            dns: 'empty',
            domain: 'empty',
            events: 'empty',
            fs: 'empty',
            http: 'empty',
            https: 'empty',
            module: 'empty',
            net: 'empty',
            os: 'empty',
            path: 'empty',
            process: false,
            punycode: 'empty',
            querystring: 'empty',
            readline: 'empty',
            repl: 'empty',
            stream: 'empty',
            string_decoder: 'empty',
            sys: 'empty',
            timers: 'empty',
            tls: 'empty',
            tty: 'empty',
            url: 'empty',
            util: 'empty',
            vm: 'empty',
            zlib: 'empty'
        },*/
        target: "web"
    };

};


export function complementWebpackConfig(webpackConfig: any) {
    if (webpackConfig !== undefined) {

        /**
         * the webpack-configuration depends on the target
         * see: https://webpack.js.org/configuration/target/
         *
         * the default is "web" (browser-environment)
         */
        const target = webpackConfig.target !== undefined ? webpackConfig.target : "web";
        console.log("loading configuration for environment: ", target);

        webpackConfig.mode = "development";

        webpackConfig.devtool = 'source-map';

        if (webpackConfig.resolve !== undefined) {
            webpackConfig.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', ]; //'.json'
        } else {
            webpackConfig.resolve = {
                extensions: ['.js', '.jsx', '.ts', '.tsx']
            };
        }


        webpackConfig.optimization = {
            // We no not want to minimize our code.
            minimize: false
        };

        webpackConfig.performance = {
            // Turn off size warnings for entry points
            hints: false
        };

        if (target === "node") {
            webpackConfig.externals = [require("webpack-node-externals")()];
        }


        webpackConfig.module = {
            rules: [
                {
                    // fixes https://github.com/graphql/graphql-js/issues/1272
                    test: /\.mjs$/,
                    include: /node_modules/,
                    type: 'javascript/auto'
                },
                {
                    test: /\.(ts|tsx)$/,
                    exclude: [/node_modules/],
                    use: [{
                        /**
                         * The Babel loader compiles Typescript to plain Javascript. The Babel compile options
                         * can be found in `tsconfig.json`
                         *
                         * The general  Babel configuration is done in `babel.config.js`
                         *
                         */
                        loader: require.resolve('babel-loader'),
                        options: {
                            presets: [
                                /**
                                 * the @babel/env loader requires deactivated modules for async function support
                                 * see: https://github.com/babel/babel/issues/5085
                                 */
                                require.resolve('@babel/preset-typescript'),
                                [require.resolve("@babel/preset-env"), target !== "web" ? {"modules": false, "targets": { "node": "8.10" }} : {}],
                                require.resolve('@babel/preset-react')
                            ],
                            plugins: [
                                require.resolve("@babel/plugin-syntax-class-properties"),
                                require.resolve("@babel/plugin-proposal-class-properties"),
                                require.resolve("@babel/plugin-syntax-dynamic-import"),
                                require.resolve("babel-plugin-styled-components")
                            ]
                        }
                    }]

                },
                {
                    enforce: "pre",
                    test: /\.(js|jsx)$/,
                    loader: require.resolve("source-map-loader")
                },
                {
                    test: /\.css$/,
                    /*the style loader does not work server-side, thus using css-loader only*/
                    use: target === "node" ?
                        [require.resolve('css-loader')] :
                        [require('style-loader'), require.resolve('css-loader')]
                }, {
                    test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                    loader: require.resolve('url-loader')
                }
            ]
        };
    } else {
        console.error("configuration is invalid");
        return undefined;
    }

    return webpackConfig;
}