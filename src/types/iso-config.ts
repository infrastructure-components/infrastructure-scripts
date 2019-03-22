import {resolveAssetsPath, SsrConfig} from "./ssr-config";
import {complementWebpackConfig, promisify, runWebpack, TEMP_FOLDER} from "../libs";
import { ReactNode} from "react";
import {AppConfig} from "./app-config";
import {IRedirect, IRoute} from "../iso_src/routed-app";

/**
 * Structure of the promise returned by [[connectWithGraphQlDataLayer]]
 */
export interface IConnectionResult {
    connectedApp: any;
    getState: () => any;
}

export interface IClientApp {

    /**
     * a unique id or name of the route
     */
    id: string,

    /**
     * the relative  path of the route, e.g. "/" for the root, or "/something", or "*" for any
     * Can be a regex to filter the paths of the routes and redirects
     */
    path: string,

    /**
     * The http method of the route, e.g. get, post, ...
     */
    method: string,

    /**
     * Array of Routes that this app serves
     */
    routes: Array<IRoute>,

    /**
     * Array of Redirects
     */
    redirects: Array<IRedirect>,

    /**
     * This function only takes the app as parameter, set the schema of the implementation to the real one
     * if you want to avoid network calls on the server side (rendering)
     */
    connectWithDataLayer?: (ReactNode) => IConnectionResult,

    /**
     * Puts the data back into the app
     * @param ReactNode
     */
    hydrateFromDataLayer?: (ReactNode) => ReactNode,

    /**
     * Function that creates the ClientApp corresponding to the middleware-rendering
     */
    //createClientApp: () => ReactNode,

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
     * specific clientApps that the app consists of
     */
    clientApps: Array<IClientApp>

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


    ssrConfig["serverConfig"] = {
        entry: {
            // TODO refactor this!!!!
            server: "./"+path.join("node_modules", "infrastructure-components", "dist", "iso_src", "server.js")
        },
        name: "server"
    }

    ssrConfig["serverConfig"]["output"] = {
        libraryTarget: "commonjs2",
            path: serverPath,
            filename: 'server.js'
    };
    ssrConfig["serverConfig"]["resolve"] = {
        alias: {
            IsoConfig: isoConfigPath
        }
    };
    ssrConfig["serverConfig"]["target"] = "node";

    console.log("isoToSsr, run webpack on server config");
    // pack the source code of the isomorphic server
    await runWebpack(complementWebpackConfig(ssrConfig["serverConfig"]));

    //console.log("resolved: ", resolveAssetsPath(ssrConfig));

    const serverIndexPath = path.join(serverPath, "index.js");
    fs.writeFileSync(serverIndexPath, `const lib = require ('./server');
const server = lib.default('${ssrConfig.assetsPath}', '${resolveAssetsPath(ssrConfig)}');
exports.default = server;`);

    //
    console.log('serverindex created...');


    ssrConfig["serverConfig"] = {
        entry: serverIndexPath, //'./src/server/index.tsx',
        name: 'server'
    };

    var configs: Array<AppConfig> = new Array<AppConfig>();

    console.log('now building clients...');

    ssrConfig["clientConfig"] = await Promise.all(
        iso.clientApps.map(async (app, index) => {
            console.log("index: ", index);
            console.log("app: ", app);
            return await createClientApp(isoConfigPath, tempPath, iso.clientApps[index], index);
        }
    ));


    return ssrConfig;
};

async function createClientApp(isoConfigPath: string, outputPath: string, app: any, index: number): Promise<AppConfig> {

    console.log('createClientApp... ', isoConfigPath);

    const fs = require('fs');
    const path = require('path');

    const clientPath = path.join(outputPath, app.id);
    if ( !fs.existsSync( clientPath ) ) {
        fs.mkdirSync( clientPath );
    }

    const filename = app.id+".js";
    const clientIndexPath = path.join(clientPath, filename);


    const ReplacePlugin = require('webpack-plugin-replace');


    // pack the source code of the isomorphic client
    await runWebpack(complementWebpackConfig({
        entry: {
            // TODO refactor this!!!!
            client: "./"+path.join("node_modules", "infrastructure-components", "dist", "iso_src", "client.js")
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
                    '"INDEX_OF_CLIENT"': index
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
        name: app.id
    }
}


/*
export async function startIso (isoConfig: IsoConfig, ssrConfig: SsrConfig, keepSlsYaml: boolean) {

    // prepare the sls-config
    const slsConfig = toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath);

    // start the sls-config
    startSlsOffline(slsConfig, keepSlsYaml);

}*/
