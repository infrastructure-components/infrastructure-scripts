
export const ConfigTypes = {
    SSR:'SSR',
    SPA:'SPA'
};

/**
 * This interface describes the input into the build-script
 */
export interface Config {

    /**
     * can be of ConfigTypes, either SSR or SPA
     */
    type: string,

    /**
     * A webpack-configuration of the app
     */
    webpackConfig: any,

    /**
     * the serverless.yml specification as js-object
     */
    slsConfig: any
}