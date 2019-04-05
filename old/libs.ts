
import {loadIsoConfigFromComponent} from "infrastructure-components";

export const TEMP_FOLDER = ".infrastructure_temp";

/**
 * transforms a function into a Promise
 */
export const promisify = foo => new Promise((resolve, reject) => {
    foo((error, result, stderr) => {
        if(error) {
            reject(error)
        } else if (stderr) {
            reject(error)
        } else {
            resolve(result)
        }
    })
});



export function getStaticBucketName (stackName: string, assetsPath: string, stage: string) {
    return `${stackName}-${assetsPath}-${stage}`;
}

/**
 * Loads the configuration from the file-system (relative to the calling project)
 *
 * @param configFilePath relative path to the webpack.config.js
 * @returns webpack-config-object
 */
export async function loadConfiguration (configFilePath: string) {

    //console.log("loadConfiguration");
    const path = require('path');
    const cmd = require('node-cmd');

    const pwd = await promisify(callback => cmd.get(`pwd`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return "";
        });

    const absolutePath = pwd.toString().replace(/(?:\r\n|\r|\n)/g, "");

    console.log("absolutePath: " , absolutePath);
    //console.log(webpackConfig.module.rules[1]);

    // pack the source code of the configuration file. This way, we include all imports/requires!
    await runWebpack(complementWebpackConfig({
        entry: {
            config: "./"+configFilePath
        },
        output: {
            libraryTarget: "commonjs2",
            path: path.join(absolutePath, TEMP_FOLDER),
            filename: 'config.js'
        },
        target: "node"
    }));


    const data = await promisify(callback => cmd.get(`cat ${path.join(absolutePath, TEMP_FOLDER, "config.js")}`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    if (!data) {
        return;
    }

    console.log("loadConfiguration: run eval!");

    const resolvedConfigPath = path.join(absolutePath, TEMP_FOLDER, 'config.js');
    console.log("path: " , resolvedConfigPath);


    var configStr = "";
    eval (`configStr=JSON.stringify(require("${resolvedConfigPath}"), (name, val) => name ==='type' && typeof val === 'function' ? val.toString() :val)`)

    console.log("configStr: ", configStr);


    // convert the json into an object
    var config = undefined;
    eval('config=' + configStr);

    return parseConfig(config);
};

/**
 * checks whether the configuration is done by a SlsIsomorphic-Component
 *
 * @param config
 */
export function parseConfig(config: any) {
    if (config && config.default && config.default.props) {

        console.log("found component!", config.default);
        return loadIsoConfigFromComponent(config.default);
    }

    console.log("found object-config: ",config);
    return config;
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
            webpackConfig.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', "mjs"];
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


export function startDevServer(webpackConfig: any) {
    const path = require('path');
    const express = require('express');
    const webpack = require('webpack');


    const app = express();
    const port = process.env.PORT || 3000;


    /*
     filename: '[name].bundle.js',
     path: require('path').resolve(__dirname, './build/client'),

     /**
     * The public path is the relative path from the url where the `bundle.js` will be found
     * It must have a leading slash here!
     *
     * we use the `STAGE_PATH` from the environment to specify the url

     publicPath: "/"+require('./src/config/route').pathToAssets()
     


    entry: {
        app: ['./src/client/index.tsx']
    },
    output: {
        path: path.resolve(__dirname, 'build', 'client'),
            filename: '[name].bundle.js'
     publicPath: "/"+require('./src/config/route').pathToAssets()
    },
     */

    const bundlePath = path.join(
        webpackConfig.output.publicPath !== undefined ? webpackConfig.output.publicPath : "",
        webpackConfig.output.filename.replace("[name]", Object.keys(webpackConfig.entry))
    );

    //const bundlePath = path.join("js", "app.bundle.js");
    console.log("path: ", bundlePath);
    // serve a basic html with the app.bundle.js
    app.get('/', (req, res) => {
        return res.send(`
<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        
      </head>
      <body >
        <div id="root" />‚
        <script src="${bundlePath}"></script>
      </body>
    </html>
`);
    });

    let compiler = webpack(webpackConfig);
    app.use(require('webpack-dev-middleware')(compiler, {
        noInfo: true, publicPath: webpackConfig.output.publicPath, stats: {colors: true}
    }));

    // let the started server apply changes on-the-fly
    app.use(require('webpack-hot-middleware')(compiler));

    // this path directs to the output of the client, as defined in `webpack.config.client.js`
    app.use(express.static(webpackConfig.output.path));


    app.listen(port, () => {
        console.log(`App is listening on port ${port}`)
    });
}


export function runWebpack (clientWpConfig) {
    const webpack = require('webpack');

    console.log("starting webpack, ", clientWpConfig);

    return new Promise(function(resolve, reject) {
        webpack(clientWpConfig, (err, stats) => {
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

            console.log("finishing webpack...", clientWpConfig.entry);
            resolve();
        })
    });
}






