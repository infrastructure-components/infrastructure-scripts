
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



/**
 * npm run build && node -r dotenv/config -e 'require(\"./src/config\").slsLogin()' dotenv_config_path=.dev.env && sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
 */
export async function loadEnv(env: string) {
    if (env.endsWith(".env")) {

        const cmd = require('node-cmd');

        await cmd.run(`export $(grep -v '^#' ${env} | xargs) `);

        const dotenv = require('dotenv');
        const result = dotenv.config();
        if (result.error) {
            throw result.error;
        }

        //const { parsed: envs } = result;
        //console.log(envs);

        return true;
    }

    return false;
}


/**
 * Loads the configuration from the file-system (relative to the calling project)
 *
 * @param configFilePath relative path to the webpack.config.js
 * @returns webpack-config-object
 */
export async function loadConfiguration (configFilePath: string) {

    const cmd = require('node-cmd');

    const data = await promisify(callback => cmd.get(`cat ${configFilePath}`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    if (!data) {
        return;
    }

    const configStr = await promisify(callback => cmd.get(`node -e "console.log(JSON.stringify(eval(require(\\\"./${configFilePath}\\\"))))"`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    console.log("configStr: ", configStr);


    var config = undefined;
    eval('config=' + configStr);

    console.log("config: ",config);

    return config;
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
        webpackConfig.resolve = {
            extensions: ['.js', '.jsx', '.ts', '.tsx', "mjs"]
        };

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
                         * // TODO document the tsconfig.json
                         *
                         * The general  Babel configuration is done in `babel.config.js`
                         *
                         * // TODO document the Babel configuration
                         */
                        loader: require.resolve('babel-loader'),
                        options: {
                            presets: [
                                /**
                                 * the @babel/env loader requires deactivated modules for async function support
                                 * see: https://github.com/babel/babel/issues/5085
                                 */
                                [require.resolve("@babel/preset-env"), target !== "web" ? {"modules": false} : {}],
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
                }, {
                    test: /\.(graphql|gql)$/,
                    exclude: /node_modules/,
                    loader: require.resolve('graphql-tag/loader')
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
    // TODO make the dir dynamic
    app.use(express.static(webpackConfig.output.path));


    app.listen(port, () => {
        console.log(`App is listening on port ${port}`)
    });
}

export async function startOfflineStack(webpackConfig: any) {

    const cmd = require('node-cmd');

    // TODO build the client projects

    // TODO create a serverless.yml

    await cmd.run(`sls offline start`);


}

export const logWebpack = (err, stats) => {
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


}


export function copyAssets( source, targetFolder ) {

    const fs = require('fs');
    const path = require('path');

    var files = [];

    //check if folder needs to be created or integrated
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }

    //copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            console.log("source: " , curSource);
            console.log("dest: " , path.join(targetFolder, path.parse(curSource).base));
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                fs.copyFileSync( curSource, path.join(targetFolder, path.parse(curSource).base) );
            }
        } );
    }
}


export function copyFolderRecursiveSync( source, target ) {
    const fs = require('fs');
    const path = require('path');

    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }

    //copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                fs.copyFileSync( curSource, path.join(targetFolder, path.parse(curSource).base) );
            }
        } );
    }
}




