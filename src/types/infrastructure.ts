
import {IPlugin} from "../utils/plugin";
import Types from './index'

/**
 * An Infrastructure is the top-level node of an infrastructure-components project
 */
export interface IInfrastructure {

    /**
     * like every infrastructure-component, an Infrastructure must have a type
     * to be set to `Types.INFRASTRUCTURE_TYPE_INFRASTRUCTURE`
     */
    infrastructureType: string,

    /**
     * a unique identifier of the instance that allows finding it
     * CAUTION: this id must be the same even though it may be processed at different times!!
     */
    instanceId: string,

    /**
     * a string that identifies the specific type of infrastructure, e.g. IsomorphicApp, SinglePageApp, etc.
     */
    instanceType: string,

    /**
     * An Infrastructure may provide plugins, the Plugins may need some data that we provide here!
     */
    createPlugins: (configPath: string) => Array<IPlugin>

}

/**
 * A function to check whether a component serves as an Infrastructure
 *
 * used in the parser during compilation, we get a real object here!
 *
 * @param parsedComponent is the real object to be tested!
 */
export const isInfrastructure = (parsedComponent): boolean => {
    if (parsedComponent !== undefined) {
        return parsedComponent.createPlugins !== undefined &&
            parsedComponent.infrastructureType === Types.INFRASTRUCTURE_TYPE_INFRASTRUCTURE
    }

    return false;
};


/**
 * Extracts the plugins from an infrastructure
 *
 * @param infrastructure is the infrastructure-object
 * @param configPath specifies the path to the original configuration of the project, as passes as argument in the command
 *
 */
export function extractPlugins(infrastructure: IInfrastructure, configPath: string) {
    
    return infrastructure.createPlugins(configPath);
}


