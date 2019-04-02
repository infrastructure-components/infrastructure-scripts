import {AppConfig, IClientApp} from "infrastructure-components";


/**
 * This interface prescribes the result of the parser
 */
export interface IIsomorphic {

    /**
     * The middleware-functions to apply generally
     */
    middlewares: Array<any>, //??ß

    /**
     * specific clientApps that the app consists of
     */
    //clientApps: Array<IClientApp>,

    /**
     * the Data layers that are defined in the app
     */
    //dataLayers: Array<any>,


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
     * the AWS region to deploy to
     */
    region?: string,

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