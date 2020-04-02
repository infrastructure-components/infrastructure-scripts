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


const getPathToAssets = (assetsFolder: string | undefined, stagePath: string | undefined) => {
    // the result must have a leading slash here!


    //console.log("stage: ", stage);
    const path = require('path');

    if (assetsFolder == undefined) {
        return "/";
    }

    // we only need to do something when we have a stagePath
    if (stagePath !== undefined && stagePath !== "undefined") {
        return  "/"+path.join(stagePath, assetsFolder)+"/";

    } else {
        // we just need to append the assets-directory
        return "/"+assetsFolder+"/";
    }



    //return /*(stage !== undefined && stage !== "undefined" ? path.join(stage, process.env.ASSETSDIR): )*/ process.env.ASSETSDIR + "/";
};

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
    entryPath: string,
    buildPath: string,
    appName: string,
    assetsPath: string | undefined,
    stagePath: string | undefined,
    aliasDict: any,
    replaceDict: any) => {

    const path = require('path');
    const clientPath = path.join(buildPath, appName);

    return Object.assign(
        createWebpackConfig(entryPath, aliasDict, replaceDict),
        {
            output: {
                path: clientPath,
                filename: appName+".bundle.js",
                /**
                 * The public path is the relative path from the url where the `bundle.js` will be found
                 * The publicPath is required of partly-bundles created through async-components
                 */
                publicPath: getPathToAssets(assetsPath,stagePath)
            },
            target: "web",
            name: appName,
            node: {
                fs: "empty",
                module: "empty",
                net: "empty",
                tls: "empty",
                child_process: "empty",
                dns: "empty"
            }
        }
    );

};

export const createServerWebpackConfig = (
    entryPath: string,
    buildPath: string,
    appName: string,
    aliasDict: any,
    replaceDict: any) => {

    const path = require('path');
    const serverPath = path.join(buildPath, appName);

    return Object.assign(
        createWebpackConfig(entryPath, aliasDict, replaceDict),
        {
            output: {
                libraryTarget: "commonjs2",
                path: serverPath,
                filename: appName+".js",
                publicPath: '/'
            },
            target: "node"
        }
    );

}


export const createWebpackConfig = (
    entryPath: string,
    aliasDict: any,
    replaceDict: any) => {

    const webpack = require('webpack');

    return {
        entry: entryPath,
        resolve: {
            alias: aliasDict,
        },
        plugins: [
            new webpack.DefinePlugin(Object.assign({}, replaceDict)),

            // TODO see: https://remarkablemark.org/blog/2017/02/25/webpack-ignore-module/
            // TODO get the list of plugins programmatically, not hard-coded like now!
            new webpack.IgnorePlugin(/infra-comp-utils\/sls-libs/),
            new webpack.IgnorePlugin(/infra-comp-utils\/system-libs/),
            new webpack.IgnorePlugin(/infra-comp-utils\/webpack-libs/),
            new webpack.IgnorePlugin(/infra-comp-utils\/configuration-lib/),
            //new webpack.IgnorePlugin(/infra-comp-utils\/parser/),
        ]
    };

};



export function complementWebpackConfig(webpackConfig: any, isProd?: boolean) {
    const path = require('path');


    if (webpackConfig !== undefined) {

        /**
         * the webpack-configuration depends on the target
         * see: https://webpack.js.org/configuration/target/
         *
         * the default is "web" (browser-environment)
         */
        const target = webpackConfig.target !== undefined ? webpackConfig.target : "web";
        console.log("loading configuration for environment: ", target);

        //webpackConfig.context = path.join(require("./system-libs").currentAbsolutePath());

        webpackConfig.mode = isProd ? "production" : "development";



        if (webpackConfig.resolve !== undefined) {
            webpackConfig.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.css' ]; //'.json'
        } else {
            webpackConfig.resolve = {
                extensions: ['.js', '.jsx', '.ts', '.tsx', '.css']
            };
        }

        if (!isProd) {
            webpackConfig.optimization = {
                // We no not want to minimize our code.
                minimize: false
            };

            webpackConfig.devtool = 'source-map';
        }


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
                    test: /\.(ts|tsx|js|jsx)$/,
                    /*include: [
                        path.join(currentAbsolutePath(),
                            "node_modules",
                            "infrastructure-components"
                        ),
                        path.join(currentAbsolutePath(),
                            "node_modules",
                            "react-router-dom"
                        ),
                        path.join(currentAbsolutePath(),
                            "node_modules",
                            "react-apollo"
                        )
                    ],*/
                    // we must NOT exclude node_modules for we use these modules as aliases! TODO ????
                    //exclude: [/node_modules/],
                    exclude: /node_modules\/(?!(infrastructure-components|react-router-dom|react-apollo)\/).*/,
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
                                require.resolve("babel-plugin-styled-components"),
                                [ require.resolve("@babel/plugin-proposal-decorators"), {"legacy": true } ]
                            ]
                        }
                    }]

                },
                /*{
                    enforce: "pre",
                    test: /\.(js|jsx)$/,
                    loader: require.resolve("source-map-loader")
                },*/
                {
                    test: /\.css$/,
                    include: /(node_modules|src)/,
                    /*the style loader does not work server-side, thus using css-loader only*/
                    loader: target === "node" ?
                        [require.resolve('css-loader')] :
                        [require.resolve('style-loader'), require.resolve('css-loader')],

                },{
                    test: /\.s[ac]ss$/i,
                    loader: target === "node" ? [require.resolve('css-loader'), require.resolve('sass-loader')] : [
                        // Creates `style` nodes from JS strings
                        require.resolve('style-loader'),
                        // Translates CSS into CommonJS
                        require.resolve('css-loader'),
                        // Compiles Sass to CSS
                        require.resolve('sass-loader'),
                    ],
                }, {
                    test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                    loader: require.resolve('url-loader')
                }, {
                    test: /\....$/,
                    exclude: /\.(mjs|ts|tsx|js|jsx|css|png|woff|woff2|eot|ttf|svg)$/,
                    loader: require.resolve('file-loader')
                }
            ]
        };
    } else {
        console.error("configuration is invalid");
        return undefined;
    }

    return webpackConfig;
}