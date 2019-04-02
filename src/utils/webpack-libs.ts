
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

export const toServerWebpackConfig = (config: AppConfig, buildPath: string) => {

    // here we need to take care of multiple entries



    return {
        /*entry: {
            handler: config.entry
        },*/
        entry: config.entry,
        output: {
            libraryTarget: "commonjs2",
            path: getBuildPath(config, buildPath),
            filename: getServerFilename(config.name), //'[name].js',
            publicPath: '/'
        },
        target: "node"
    }


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
            webpackConfig.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx'];
        } else {
            webpackConfig.resolve = {
                extensions: ['.js', '.jsx', '.ts', '.tsx', "mjs"]
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