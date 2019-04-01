import {resolveAssetsPath, SsrConfig} from "./ssr-config";
import {complementWebpackConfig, promisify, runWebpack, TEMP_FOLDER} from "../libs";
import {AppConfig, IClientApp} from "infrastructure-components";
import * as deepmerge from 'deepmerge';


export const ISOCONFIG_SERVERNAME = 'server';

/**
 * Structure of the promise returned by [[connectWithGraphQlDataLayer]]
 */
export interface IConnectionResult {
    connectedApp: any;
    getState: () => any;
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
    clientApps: Array<IClientApp>,

    /**
     * the Data layers that are defined in the app
     */
    dataLayers: Array<any>

}

export async function isoToSsr (configFilePath: string, iso: IsoConfig, ssrConfig: SsrConfig): Promise<SsrConfig> {

    const fs = require('fs');
    const path = require('path');
    const cmd = require('node-cmd');
    const ReplacePlugin = require('webpack-plugin-replace');


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

    // TODO server hardcoded here!
    const serverPath = path.join(tempPath, "server");
    if ( !fs.existsSync( serverPath ) ) {
        fs.mkdirSync( serverPath );
    }

    const isoConfigPath = path.resolve(
        absolutePath,
        configFilePath.replace(/\.[^/.]+$/, "")
    );

    

    //console.log("replaceValues: " , replaceValues);

    // the ssrConfig may already contain a serverConfig! merge it
    ssrConfig["serverConfig"] = deepmerge.all([
        ssrConfig.serverConfig !== undefined ? ssrConfig.serverConfig : {},
        {
            /*entry: iso.clientApps.reduce((res, app) => {
                console.log("processing app: " , app);
                // add to the entry point
                if (app.dataLayer !== undefined && app.dataLayer) {
                    console.log("data Layer during config: " ,app.dataLayer );
                    
                    // TODO refactor this, external dependency to DynamoDbGraphQlDataLayer
                    res[app.dataLayer.id] = "./"+path.join("node_modules", "DynamoDbGraphQlDataLayer", "build", "database.js");
                }

                return res;
            }, {
                // we start with the main entry point
                // TODO refactor this!!!!
                server: "./"+path.join("node_modules", "infrastructure-components", "dist", "iso_src", "server.js"),
            }),*/
            entry: {
                server: "./"+path.join("node_modules", "infrastructure-components", "dist", "iso_src", "server.js"),
            },
            name: ISOCONFIG_SERVERNAME,


        }
    ])

    ssrConfig["serverConfig"]["output"] = {
        libraryTarget: "commonjs2",
            path: serverPath,
            filename: '[name].js'
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


    // ATTENTION !! the overwriting the ssrConfig["serverConfig"] here!!!

    /*  NOT REQUIRED ANYMORE for the datalayers have their own entry points now
     entry: iso.clientApps.reduce((res, app) => {



     // add to the entry point
     if (app.dataLayer !== undefined && app.dataLayer) {
     console.log("data layer in server: " , app.dataLayer)

     res[app.dataLayer.id] = path.join(serverPath, app.dataLayer.id+".js");
     }

     return res;
     }, {
     // we start with the main entry point
     // TODO refactor this!!!!
     index: serverIndexPath,
     }),*/

    ssrConfig["serverConfig"] = {


        name: ISOCONFIG_SERVERNAME,
        entry: serverIndexPath, //'./src/server/index.tsx',
        //name: 'server'
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

    console.log('now building data layers...');

    // see: ssr-config --> there these temporary apps are finally built!
    ssrConfig["datalayerConfig"] = await Promise.all(
        iso.dataLayers.map(async (dl, index) => {
                
                console.log("index: ", index);
                console.log("dataLayer: ", dl);
                return await createDataLayer(isoConfigPath, tempPath, iso.dataLayers[index], index);
            }
        ));
    
    
    console.log("ISOTOSSR: ssrConfig: " , ssrConfig);

    return ssrConfig;
};

/**
 * @param isoConfigPath: the current path of the user's main app, use it to load the default, entry point, then
 * you can load the IsoConfig (runtime) from it and get all the objects you need
 */
async function createDataLayer(isoConfigPath: string, outputPath: string, dataLayer: any, index: number): Promise<AppConfig> {

    console.log('createDataLayer... ', isoConfigPath);

    const fs = require('fs');
    const path = require('path');
    const ReplacePlugin = require('webpack-plugin-replace');


    const dlPath = path.join(outputPath, dataLayer.id);
    if ( !fs.existsSync( dlPath ) ) {
        fs.mkdirSync( dlPath );
    }

    const filename = dataLayer.id+".js";
    const datalayerIndexPath = path.join(dlPath, filename);


    // pack the source code of the isomorphic client
    await runWebpack(complementWebpackConfig({
        entry: {
            // TODO refactor this, external dependency to DynamoDbGraphQlDataLayer
            dataLayer: "./"+path.join("node_modules", "ddb-gql-data-layer", "build", "database.js")
        },
        output: {
            libraryTarget: "commonjs2",
            path: dlPath,
            filename: filename
        },
        resolve: {
            alias: {
                IsoConfig: isoConfigPath
            }
        },
        target: "node",
        plugins: [
            new ReplacePlugin({
                values: {
                    '"INDEX_OF_DATALAYER"': index
                }
            })
        ]
    }));

    //console.log(createServer(iso, ssrConfig).toString());
    //return;

    // create an index-file for the server:
    //console.log("iso: ", iso)

    return {
        entry: datalayerIndexPath,
        name: dataLayer.id
    }
}



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
