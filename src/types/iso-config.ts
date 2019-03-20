import {AppConfig} from "./app-config";
import {SsrConfig} from "./ssr-config";
import {complementWebpackConfig, promisify, runWebpack} from "../libs";
import {ConfigTypes} from "../lib/config";
import {startSlsOffline, toSlsConfig} from "./sls-config";


export interface IRoute {

    /**
     * the relative  path of the route, e.g. "/" for the root, or "/something", or "*" for any
     */
    path: string,

    /**
     * The http method of the route, e.g. get, post, ...
     */
    method: string,

    /**
     * array of callbacks to be used of a route before handing over to the "*"-callback
     */
    middlewareCallbacks: Array<any>,



}

export interface IsoConfig {

    // TODO EXPERIMENTAL! not supposed to be used here!
    createServerApp: () => any,


    /**
     * The middleware-functions to apply generally
     */
    middlewares: Array<any>,

    /**
     * specific routes that the app consists of
     */
    routes: Array<IRoute>

}

export async function isoToSsr (iso: IsoConfig, ssrConfig: SsrConfig): Promise<SsrConfig> {

    const fs = require('fs');
    const path = require('path');
    const cmd = require('node-cmd');

    // get the current path from the main project
    const pwd = await promisify(callback => cmd.get(`pwd`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return "";
        });

    const absolutePath = pwd.toString().replace(/(?:\r\n|\r|\n)/g, "");
    const tempPath = path.join(absolutePath, '.infrastructure-temp');
    const indexPath = path.join(tempPath, "index.js");


    console.log("tempPath: ", tempPath);
    if ( !fs.existsSync( tempPath ) ) {
        fs.mkdirSync( tempPath );
    }


    // pack the source code of the isomorphic server
    await runWebpack(complementWebpackConfig({
        entry: {
            // TODO refactor this!!!!
            server: "./"+path.join("node_modules", "sls-aws-infrastructure", "dist", "iso_src", "server.js")
        },
        output: {
            libraryTarget: "commonjs2",
            path: tempPath,
            filename: '[name].js'
        },
        resolve: {
            alias: {
                CreateServer: path.resolve(absolutePath, "isomorphic.config")
            }
        },
        target: "node"
    }));

    //console.log(createServer(iso, ssrConfig).toString());
    //return;

    // create an index-file for the server:
    //console.log("iso: ", iso)

    await fs.writeFile(indexPath, `const lib = require ('./server');
const server = lib.default;
exports.default = server;`, function (err) {
        if (err) throw err;
        console.log('serverless.yml created...');
    });


    ssrConfig["clientConfig"] = {
        entry: './src/client/index.tsx',
        name: 'app'
    };

    // TODO we need a file as entry here, we would need to compile this using webpack?+tsc+babel
    ssrConfig["serverConfig"] = {
        entry: indexPath, //'./src/server/index.tsx',
        name: 'server'
    };

    /*
    const result = {
        type: ConfigTypes.SSR,
        ssrConfig: ssrConfig
    };*/

    return ssrConfig;
};

/*
export async function startIso (isoConfig: IsoConfig, ssrConfig: SsrConfig, keepSlsYaml: boolean) {

    // prepare the sls-config
    const slsConfig = toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath);

    // start the sls-config
    startSlsOffline(slsConfig, keepSlsYaml);

}*/
