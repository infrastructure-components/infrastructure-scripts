
import { AppConfig, toClientWebpackConfig, toServerWebpackConfig, getBuildPath } from 'infrastructure-components';
import {complementWebpackConfig, runWebpack, copyAssets, s3sync, getStaticBucketName} from '../libs';
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
    serverConfig: AppConfig | undefined,

    /**
     * the data layers of the ssr-app
     */
    datalayerConfig?: AppConfig | Array<AppConfig> | undefined,
}

export const resolveAssetsPath = (ssrConfig: SsrConfig) => {
    const path = require('path');
    const assetsPath = path.resolve(getBuildPath(ssrConfig.serverConfig, ssrConfig.buildPath), ssrConfig.assetsPath);

    return !assetsPath.endsWith("/") ? assetsPath+"/" : assetsPath;
};


export async function buildSsr (ssrConfig: SsrConfig) {


    const fs = require('fs');
    const path = require('path');
    
    // prepare the client(')s(') config(s)
    const clientWpConfig = prepareClientConfig(ssrConfig.clientConfig, ssrConfig.buildPath)

    console.log("buildSsr, server Config BEFORE: ", ssrConfig.serverConfig)
    
    // preapre the server config
    const serverWpConfig = complementWebpackConfig(toServerWebpackConfig(ssrConfig.serverConfig, ssrConfig.buildPath))

    // build the clients
    if (Array.isArray(clientWpConfig)) {
        await Promise.all(clientWpConfig.map(async c => await runWebpack(c)));
    } else {
        await runWebpack(clientWpConfig);
    }


    const dataLayerWpConfig = prepareDataLayerConfig(ssrConfig.datalayerConfig, ssrConfig.buildPath)

    // build the data layers
    if (Array.isArray(dataLayerWpConfig)) {
        await Promise.all(dataLayerWpConfig.map(async c => await runWebpack(c)));
    } else {
        await runWebpack(dataLayerWpConfig);
    }

    console.log("buildSsr, server Config: ", serverWpConfig)


    // build the server
    await runWebpack(serverWpConfig);

    const assetsPath = resolveAssetsPath(ssrConfig);
    console.log("assetsPath: ", assetsPath);
    
    // copy the client apps to the assets-folder
    if (Array.isArray(ssrConfig.clientConfig)) {
        await Promise.all(ssrConfig.clientConfig.map(
            async c =>await copyAssets(getBuildPath(c, ssrConfig.buildPath), assetsPath)
        ));
    } else {
        copyAssets(getBuildPath(ssrConfig.clientConfig, ssrConfig.buildPath), assetsPath);
    }


}

export async function startSsr (ssrConfig: SsrConfig, slsConfig: any = {}, keepSlsYaml: boolean = false) {

    // start the sls-config
    startSlsOffline(
        toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath, ssrConfig.assetsPath, slsConfig),
        keepSlsYaml
    );

}


export async function deploySsr (ssrConfig: SsrConfig, slsConfig: any = {}, keepSlsYaml: boolean = false) {
// prepare the sls-config

    // start the sls-config
    await deploySls(
        toSlsConfig(ssrConfig.stackName, ssrConfig.serverConfig, ssrConfig.buildPath, ssrConfig.assetsPath, slsConfig),
        keepSlsYaml
    );

    const staticBucketName = getStaticBucketName(ssrConfig.stackName, ssrConfig.assetsPath, process.env.STAGE);

    // copy the client apps to the assets-folder
    console.log("start S3 Sync");
    
    if (Array.isArray(ssrConfig.clientConfig)) {
        await Promise.all(ssrConfig.clientConfig.map(async c => await s3sync(staticBucketName, getBuildPath(c, ssrConfig.buildPath))));
    } else {
        s3sync(staticBucketName, getBuildPath(ssrConfig.clientConfig, ssrConfig.buildPath));
    }

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

export const prepareDataLayerConfig = (clientConfig: AppConfig | Array<AppConfig>, buildPath: string) => {
    return Array.isArray(clientConfig) ?
        clientConfig.map(c => complementWebpackConfig(toServerWebpackConfig(c, buildPath))) :
        complementWebpackConfig(toServerWebpackConfig(clientConfig, buildPath))
};