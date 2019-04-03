
import * as deepmerge from 'deepmerge';

import { isPlugin, IPlugin } from '../types/plugin';
import { loadConfiguration } from './configuration-lib';
import { IConfigParseResult, mergeParseResults } from '../types/config-parse-result'

/**
 * parses the configuration for plugins and returns a list of the plugins (objects)
 *
 * @param configPath
 */
export function parseForPlugins (configPath: string): Array<IPlugin> {

    const config = loadConfiguration(configPath);
    
    return extractPlugins(config)
}

export function extractPlugins(component) {

    if (isPlugin(component)) {
        return [component]
    } else {
        return getChildrenArray(component).reduce((result, child) => result.concat(extractPlugins(child)), [])
    }
}

/**
 * parses a configuration, this configuration must export the main component as default
 *
 *
 * @param component (main component of the configuration)
 * @param compileMode set to true to run the parser with a statically loaded configuration (without objects)
 */

export function extractConfigs(component, plugins, compileMode): IConfigParseResult {

    const results: Array<IConfigParseResult> = plugins

        // check for plugins to apply
        .filter(plugin => plugin.applies(component))

        // apply applicable plugins
        .map(plugin => {
            const childConfigs = getChildrenArray(component).map(child => extractConfigs(child, plugins, compileMode))
            return plugin.process(component, childConfigs, compileMode)
        })


    return mergeParseResults(results);


};

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