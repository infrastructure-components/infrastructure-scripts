import {SsrConfig} from "./ssr-config";
import {complementWebpackConfig, promisify, runWebpack, TEMP_FOLDER} from "../libs";
import { ReactNode} from "react";
import {AppConfig} from "./app-config";

export interface IRoute {

    /**
     * a unique id or name of the route
     */
    id: string,

    /**
     * the relative  path of the route, e.g. "/" for the root, or "/something", or "*" for any
     */
    path: string,

    /**
     * The http method of the route, e.g. get, post, ...
     */
    method: string,

    /**
     * Function that creates the ClientApp corresponding to the middleware-rendering
     */
    createClientApp: () => ReactNode,

    /**
     * array of callbacks to be used of a route before handing over to the "*"-callback
     */
    middlewareCallbacks: Array<any>,



}

export interface IsoConfig {

    // EXPERIMENTAL! not supposed to be used here!
    //createServerApp: () => any,
    //createClientApp: () => any,

    /**
     * The middleware-functions to apply generally
     */
    middlewares: Array<any>,

    /**
     * specific routes that the app consists of
     */
    routes: Array<IRoute>

}

export async function isoToSsr (configFilePath: string, iso: IsoConfig, ssrConfig: SsrConfig): Promise<SsrConfig> {

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

    if ( !fs.existsSync( tempPath ) ) {
        fs.mkdirSync( tempPath );
    };

    const serverPath = path.join(tempPath, "server");
    if ( !fs.existsSync( serverPath ) ) {
        fs.mkdirSync( serverPath );
    }

    const isoConfigPath = path.resolve(
        absolutePath,
        configFilePath.replace(/\.[^/.]+$/, "")
    );

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
                IsoConfig: isoConfigPath
            }
        },
        target: "node"
    }));

    const serverIndexPath = path.join(serverPath, "index.js");
    await fs.writeFile(serverIndexPath, `const lib = require ('./server');
const server = lib.default;
exports.default = server;`, function (err) {
        if (err) throw err;
        console.log('serverindex created...');
    });

    ssrConfig["serverConfig"] = {
        entry: serverIndexPath, //'./src/server/index.tsx',
        name: 'server'
    };

    var configs: Array<AppConfig> = new Array<AppConfig>();


    ssrConfig["clientConfig"] = await Promise.all(
        iso.routes.map(async (route, index) =>await createClientApp(isoConfigPath, tempPath, route, index))
    );


    return ssrConfig;
};

async function createClientApp(isoConfigPath: string, outputPath: string, route: IRoute, index: number): Promise<AppConfig> {

    const fs = require('fs');
    const path = require('path');

    const clientPath = path.join(outputPath, route.id);
    if ( !fs.existsSync( clientPath ) ) {
        fs.mkdirSync( clientPath );
    }

    const filename = route.id+".js";
    const clientIndexPath = path.join(clientPath, filename);


    const ReplacePlugin = require('webpack-plugin-replace');


    // pack the source code of the isomorphic client
    await runWebpack(complementWebpackConfig({
        entry: {
            // TODO refactor this!!!!
            client: "./"+path.join("node_modules", "sls-aws-infrastructure", "dist", "iso_src", "client.js")
        },
        output: {
            path: clientPath,
            filename: filename
        },
        resolve: {
            alias: {
                IsoConfig: isoConfigPath
            }
        },
        target: "web",
        plugins: [
            new ReplacePlugin({
                values: {
                    '"INDEX_OF_ROUTE"': index
                }
            })
        ]
    }));

    //console.log(createServer(iso, ssrConfig).toString());
    //return;

    // create an index-file for the server:
    //console.log("iso: ", iso)

    return {
        entry: clientIndexPath,
        name: route.id
    }
}


/*
export async function startIso (isoConfig: IsoConfig, ssrConfig: SsrConfig, keepSlsYaml: boolean) {

    // prepare the sls-config
    const slsConfig = toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath);

    // start the sls-config
    startSlsOffline(slsConfig, keepSlsYaml);

}*/
