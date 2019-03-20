import {AppConfig} from "./app-config";
import {SsrConfig} from "./ssr-config";
import {complementWebpackConfig, promisify, runWebpack, TEMP_FOLDER} from "../libs";
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
    const tempPath = path.join(absolutePath, TEMP_FOLDER);

    console.log("tempPath: ", tempPath);
    if ( !fs.existsSync( tempPath ) ) {
        fs.mkdirSync( tempPath );
    };

    const serverPath = path.join(tempPath, "server");
    if ( !fs.existsSync( serverPath ) ) {
        fs.mkdirSync( serverPath );
    }


    // pack the source code of the isomorphic server
    await runWebpack(complementWebpackConfig({
        entry: {
            // TODO refactor this!!!!
            server: "./"+path.join("node_modules", "sls-aws-infrastructure", "dist", "iso_src", "server.js")
        },
        output: {
            libraryTarget: "commonjs2",
            path: serverPath,
            filename: 'server.js'
        },
        resolve: {
            alias: {
                // TODO use name from the script!
                IsoConfig: path.resolve(absolutePath, "isomorphic.config")
            }
        },
        target: "node"
    }));


    const clientPath = path.join(tempPath, "client");
    if ( !fs.existsSync( clientPath ) ) {
        fs.mkdirSync( clientPath );
    }

    // pack the source code of the isomorphic client
    await runWebpack(complementWebpackConfig({
        entry: {
            // TODO refactor this!!!!
            client: "./"+path.join("node_modules", "sls-aws-infrastructure", "dist", "iso_src", "client.js")
        },
        output: {
            path: clientPath,
            filename: 'client.js'
        },
        resolve: {
            alias: {
                // TODO use name from the script!
                IsoConfig: path.resolve(absolutePath, "isomorphic.config")
            }
        },
        target: "web"
    }));

    //console.log(createServer(iso, ssrConfig).toString());
    //return;

    // create an index-file for the server:
    //console.log("iso: ", iso)

    const clientIndexPath = path.join(clientPath, "client.js");

    ssrConfig["clientConfig"] = {
        entry: clientIndexPath, //'./src/client/index.tsx',
        name: 'app'
    };


    const serverIndexPath = path.join(serverPath, "index.js");
    await fs.writeFile(serverIndexPath, `const lib = require ('./server');
const server = lib.default;
exports.default = server;`, function (err) {
        if (err) throw err;
        console.log('serverindex created...');
    });

    // TODO we need a file as entry here, we would need to compile this using webpack?+tsc+babel
    ssrConfig["serverConfig"] = {
        entry: serverIndexPath, //'./src/server/index.tsx',
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
