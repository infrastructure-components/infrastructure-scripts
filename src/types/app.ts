
import {IPlugin} from "./plugin";

export const INFRASTRUCTURE_TYPE_APP = "INFRASTRUCTURE_TYPE_APP";

/**
 * used in the parser during compilation, we get a real object here!
 *
 * @param parsedComponent
 */
export const isAppConfig = (parsedComponent): boolean => {
    if (parsedComponent !== undefined) {
        return parsedComponent.createPlugins !== undefined &&
            parsedComponent.infrastructureType === INFRASTRUCTURE_TYPE_APP
    }

    return false;
};



export function extractPlugins(app: IApp, configPath: string) {
    
    return app.createPlugins(configPath);
}



/**
 * An App is the top-level node of an infrastructure-components project
 */
export interface IApp {

    /**
     * like every infrastructure-component, an App must have a type
     */
    infrastructureType: string,

    /**
     * An App may provide plugins, the Plugins may need some data that we provide here!
     */
    createPlugins: (configPath: string) => Array<IPlugin>

}