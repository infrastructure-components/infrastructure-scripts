
import { AppConfig, toClientWebpackConfig, toServerWebpackConfig, getBuildPath } from './app-config';
import {complementWebpackConfig, runWebpack, copyAssets, s3sync} from '../libs';
import { toSlsConfig, startSlsOffline, deploySls } from './sls-config';


/**
 * 
 */
export interface SsrConfig {

    /**
     * The name of the CloudFormation stack
     * it is allowed to use env-variables, but don't forget to specify them
     * e.g. "${env:CLOUDSTACKNAME}-${env:STAGE}"
     */
    stackName: string,

    /**
     * the **relative** path (from the main-project) to the build directory
     */
    buildPath: string,

    /**
     * the relative path of the assets folder
     */
    assetsPath: string,

    /**
     * the SPA-client(s) of the SSR app
     * can be undefined when using higher level isomorphic api
     */
    clientConfig: AppConfig | Array<AppConfig> | undefined,

    /**
     * the server-app configuration
     * can be undefined when using higher level isomorphic api
     */
    serverConfig: AppConfig | undefined
}

export const resolveAssetsPath = (ssrConfig: SsrConfig) => {
    const path = require('path');
    const assetsPath = path.resolve(getBuildPath(ssrConfig.serverConfig, ssrConfig.buildPath), ssrConfig.assetsPath);

    return !assetsPath.endsWith("/") ? assetsPath+"/" : assetsPath;
};


export async function startSsr (ssrConfig: SsrConfig, keepSlsYaml: boolean) {

    // prepare the sls-config
    const slsConfig = toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath);

    // start the sls-config
    startSlsOffline(slsConfig, keepSlsYaml);

}

export async function buildSsr (ssrConfig: SsrConfig) {


    const fs = require('fs');
    const path = require('path');
    
    // prepare the client(')s(') config(s)
    const clientWpConfig = prepareClientConfig(ssrConfig.clientConfig, ssrConfig.buildPath)

    // preapre the server config
    const serverWpConfig = complementWebpackConfig(toServerWebpackConfig(ssrConfig.serverConfig, ssrConfig.buildPath))

    // build the clients
    await Array.isArray(clientWpConfig) ? clientWpConfig.map(async c => await runWebpack(c)) : await runWebpack(clientWpConfig)


    // build the server
    await runWebpack(serverWpConfig);

    const assetsPath = resolveAssetsPath(ssrConfig);
    console.log("assetsPath: ", assetsPath);
    
    // copy the client apps to the assets-folder
    Array.isArray(ssrConfig.clientConfig) ?
        ssrConfig.clientConfig.map(c => copyAssets(getBuildPath(c, ssrConfig.buildPath), assetsPath)) :
        await copyAssets(getBuildPath(ssrConfig.clientConfig, ssrConfig.buildPath), assetsPath);

}

export async function deploySsr (ssrConfig: SsrConfig, keepSlsYaml: boolean) {
// prepare the sls-config
    const slsConfig = toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath);


    // start the sls-config
    await deploySls(slsConfig, {
        assetsPath: `"${ssrConfig.assetsPath}"`
    }, keepSlsYaml);


    // copy the client apps to the assets-folder
    console.log("start S3 Sync");
    Array.isArray(ssrConfig.clientConfig) ?
        ssrConfig.clientConfig.map(async c => await s3sync(getBuildPath(c, ssrConfig.buildPath))) :
        await s3sync(getBuildPath(ssrConfig.clientConfig, ssrConfig.buildPath));
    console.log("S3 Sync completed");
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
};