
import * as deepmerge from 'deepmerge';

import { IPlugin } from './plugin';
import { loadConfiguration } from './configuration-lib';
import { IConfigParseResult, mergeParseResults } from './config-parse-result'
import { extractPlugins, isInfrastructure } from "../types/infrastructure";

export const INFRASTRUCTURE_MODES = {
    /**
     * When packing the application
     */
    COMPILATION : "COMPILATION",

    /**
     * when the app actually runs
     */
    RUNTIME: "RUNTIME"
}

/**
 * parses the configuration for plugins and returns a list of the plugins (objects)
 *
 * @param configPath the path to the compiled and evaluable configuration
 * @param origConfigPath the path to the original uncompiled configuration source!
 */
export function parseForPlugins (configPath: string, origConfigPath: string): Array<IPlugin> {

    const config = loadConfiguration(configPath);

    const parsedComponent = parseInfrastructureComponent(config, INFRASTRUCTURE_MODES.COMPILATION);

    //console.log("configPath: ", configPath);

    if (isInfrastructure(parsedComponent)) {
        return extractPlugins(parsedComponent, origConfigPath);

    } else {
        console.error("main component is not a valid app!")
        return [];
    }

};

export const parseInfrastructureComponent = (component, infrastructureMode: string | undefined) => {
    try {

        //console.log("parseInfrastructureComponent: ", component);

        const params = Object.assign({
            infrastructureMode: infrastructureMode,
        }, component.props);

        /*
        var custom = undefined;
        const parsed = `const f=${component.type}; f(${JSON.stringify(params)})`;

        const result = eval(parsed);*/

        const result = component.type(params);

        //
        //console.log("parsed: ", parsed);
        console.log("parsed InfrastructureComponent: ", result);

        return result.infrastructureType !== undefined ? result : undefined;

    } catch (error) {
        console.error("NOT an infrastructure component --> ", error);
        return undefined;
    }
}


/**
 * parses a configuration, this configuration must export the main component as default
 *
 *
 * @param component (main component of the configuration)
 * @param compileMode set to true to run the parser with a statically loaded configuration (without objects)
 */

export function extractConfigs(component, plugins, infrastructureMode: string | undefined): IConfigParseResult {

    const results: Array<IConfigParseResult> = plugins

        // check for plugins to apply
        .filter(plugin => plugin.applies(component))

        // apply applicable plugins
        .map(plugin => {
            const childConfigs = getChildrenArray(component).map(child => extractConfigs(child, plugins, infrastructureMode))
            const r= plugin.process(component, childConfigs, infrastructureMode);
            console.log("result: ", r);
            return r;
        })


    return mergeParseResults(results);

};

/**
 * Get the objects from the configuration
 *
 * This function runs on the compiled/webpacked bundle (Plugins removed!!)
 *
 * @param component
 */
export function extractObjects(component) {
    return {

    }
}

/**
 * Get the children of the current component as an array
 *
 *
 * @param component the parent component
 * @return an Array of the children, even if there is only a single child or no (empty array). If the component itself
 * is an array, its items are returned
 */
export const getChildrenArray = (component) => {

    if (component == undefined) {
        return [];
    }

    if (Array.isArray(component) && component.length > 0) {
        //console.log("component is array: ", component)
        return [...component] ;
    }

    if (component.props == undefined || component.props.children == undefined) {
        return [];
    }

    return Array.isArray(component.props.children) ? component.props.children : [component.props.children];
};