
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



/**
 * npm run build && node -r dotenv/config -e 'require(\"./src/config\").slsLogin()' dotenv_config_path=.dev.env && sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
 */
export async function loadEnv(env: string) {
    if (env.endsWith(".env")) {

        const cmd = require('node-cmd');

        await cmd.run(`export $(grep -v '^#' ${env} | xargs) `);

        const dotenv = require('dotenv');
        const result = dotenv.config({ path: env });
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
 * Login to Severless framework
 *
 * Requires env-variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 */
export function slsLogin () {

    require('child_process').exec(`sls config credentials -o --provider aws --key ${process.env.AWS_ACCESS_KEY_ID} --secret ${process.env.AWS_SECRET_ACCESS_KEY}`,
        function(err, stdout, stderr) {
            if (err) {
                console.log(err);
            }
            console.log(stdout, stderr);
        });

};

/**
 * uploads the static assets (compiled client) to the S3-bucket of the current stage
 * implements [[DeployStaticAssestsSpec]]
 *
 * uses: https://www.npmjs.com/package/s3-node-client
 *
 * Requires env-variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - STATIC_ASSETS_BUCKET
 * - STAGE
 */
export async function s3sync (srcFolder: string) {

    return new Promise((resolve, reject) => {
        var client = require('s3-node-client').createClient({
            maxAsyncS3: 20,     // this is the default
            s3RetryCount: 3,    // this is the default
            s3RetryDelay: 1000, // this is the default
            multipartUploadThreshold: 20971520, // this is the default (20 MB)
            multipartUploadSize: 15728640, // this is the default (15 MB)
            s3Options: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION,
                // endpoint: 's3.yourdomain.com',
                // sslEnabled: false
                // any other options are passed to new AWS.S3()
                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
            },
        });

        var params = {
            localDir: srcFolder, //"./build/client",
            deleteRemoved: false, // default false, whether to remove s3 objects that have no corresponding local file.
            s3Params: {
                // the bucket must match the name that is constructed in serverless.yml
                Bucket: process.env.STATIC_ASSETS_BUCKET+"-"+process.env.STAGE,
                //Prefix: "",
                // other options supported by putObject, except Body and ContentLength.
                // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
            },
        };

        var uploader = client.uploadDir(params);
        uploader.on('error', function(err) {
            console.error("unable to sync:", err.stack);
            reject();
        });
        uploader.on('progress', function() {
            console.log("progress", uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function() {
            console.log("done uploading");
            resolve();
        });
    });

}

/**
 * Loads the configuration from the file-system (relative to the calling project)
 *
 * @param configFilePath relative path to the webpack.config.js
 * @returns webpack-config-object
 */
export async function loadConfiguration (configFilePath: string) {

    console.log("loadConfiguration");
    const path = require('path');
    const cmd = require('node-cmd');

    const pwd = await promisify(callback => cmd.get(`pwd`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return "";
        });

    const absolutePath = pwd.toString().replace(/(?:\r\n|\r|\n)/g, "");

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


    const data = await promisify(callback => cmd.get(`cat ${configFilePath}`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    if (!data) {
        return;
    }

    console.log("loadConfiguration: run eval!");

    const resolvedConfigPath = "./"+path.join(TEMP_FOLDER, 'config.js');

    const configStr = await promisify(callback => cmd.get(`node -e "console.log(JSON.stringify(eval(require(\\\"./${resolvedConfigPath}\\\"))))"`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    console.log("configStr: ", configStr);


    var config = undefined;
    eval('config=' + configStr);

    if (config.default && config.default.props) {
        console.log("found component!");
        config = config.default.props;
    }
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
                                //require.resolve('@babel/preset-typescript'),
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


export function copyAssets( source, targetFolder ) {

    const fs = require('fs');
    const path = require('path');

    var files = [];

    //check if folder needs to be created or integrated
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder, {recursive: true} );
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




