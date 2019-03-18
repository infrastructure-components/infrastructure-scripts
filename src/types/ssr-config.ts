
import { AppConfig, toClientWebpackConfig, toServerWebpackConfig, getBuildPath } from './app-config';
import { complementWebpackConfig, logWebpack, copyAssets } from '../libs';


/**
 * 
 */
export interface SsrConfig {

    /**
     * the path (from the main-project) to the build directory
     */
    buildPath: string,

    /**
     * the relative path of the assets folder
     */
    assetsPath: string,

    /**
     * the SPA-client(s) of the SSR app
     */
    clientConfig: AppConfig | Array<AppConfig>,

    /**
     * the server-app configuration
     */
    serverConfig: AppConfig
}



export async function buildSsr (ssrConfig: SsrConfig) {

    const webpack = require('webpack');
    const fs = require('fs');
    const path = require('path');
    
    // prepare the client(')s(') config(s)
    const clientWpConfig = prepareClientConfig(ssrConfig.clientConfig, ssrConfig.buildPath)

    // preapre the server config
    const serverWpConfig = complementWebpackConfig(toServerWebpackConfig(ssrConfig.serverConfig, ssrConfig.buildPath))

    // build the clients
    await Array.isArray(clientWpConfig) ? clientWpConfig.map(async c => await webpack(c, logWebpack)) :
        await webpack(clientWpConfig, logWebpack);

    // build the server
    await webpack(serverWpConfig, logWebpack);

    const assetsPath = path.resolve(getBuildPath(ssrConfig.serverConfig, ssrConfig.buildPath), ssrConfig.assetsPath);
    console.log("assetsPath: ", assetsPath)
    
    // copy the client apps to the assets-folder
    Array.isArray(ssrConfig.clientConfig) ?
        ssrConfig.clientConfig.map(c => copyAssets(getBuildPath(c, ssrConfig.buildPath), assetsPath)) :
        await copyAssets(getBuildPath(ssrConfig.clientConfig, ssrConfig.buildPath), assetsPath);

}

/**
 * 
 * @param clientConfig
 * @param buildPath
 * 
 * return one (or an array of) Webpack Client Configs
 */
export const prepareClientConfig = (clientConfig: AppConfig | Array<AppConfig>, buildPath: string) => {
    return Array.isArray(clientConfig) ?
        clientConfig.map(c => complementWebpackConfig(toClientWebpackConfig(c, buildPath))) :
        complementWebpackConfig(toClientWebpackConfig(clientConfig, buildPath))
}

