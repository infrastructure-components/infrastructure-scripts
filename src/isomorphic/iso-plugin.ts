
import { IPlugin } from '../utils/plugin';
import { IConfigParseResult } from '../utils/config-parse-result';
import { IIsomorphic, isIsomorphicApp } from './iso-component';
import { toSlsConfig } from "../utils/sls-libs";
import { createServerWebpackConfig, complementWebpackConfig } from "../utils/webpack-libs";
import { resolveAssetsPath } from '../utils/iso-libs';
import {currentAbsolutePath, pathToConfigFile} from "../utils/system-libs";

/**
 * Parameters that apply to the whole Plugin, passed by other plugins
 */
export interface IIsoPlugin {

    /**
     * path to a directory where we put the final bundles
     */
    buildPath: string,

    /**
     * path to the main config file
     */
    configFilePath: string
}

/**
 * A Plugin to detect Isomorphic-App-Components
 * @param props
 */
export const IsoPlugin = (props: IIsoPlugin): IPlugin => {

    const result: IPlugin = {
        // identify Isomorphic-App-Components
        applies: (component): boolean => {

            return isIsomorphicApp(component);
        },

        // convert the component into configuration parts
        process: (component: any, childConfigs: Array<IConfigParseResult>, infrastructureMode: string | undefined): IConfigParseResult => {

            const path = require('path');

            // we use the hardcoded name `server` as name
            const serverName = "server";

            // the isomorphic app has a server application
            const serverWebPack = complementWebpackConfig(
                createServerWebpackConfig(
                    "./"+path.join("node_modules", "infrastructure-scripts", "assets", "server.tsx"), //entryPath: string,
                    path.join(currentAbsolutePath(), props.buildPath), //use the buildpath from the parent plugin
                    serverName, // name of the server
                    {
                        __CONFIG_FILE_PATH__: pathToConfigFile(props.configFilePath) // replace the IsoConfig-Placeholder with the real path to the main-config-bundle
                    }, {
                        __ASSETS_PATH__: `"${component.props.assetsPath}"`,
                        __RESOLVED_ASSETS_PATH__: `"${resolveAssetsPath(
                            component.props.buildPath,
                            serverName, 
                            component.props.assetsPath ) 
                        }"`
                    }
                )
            );

            return {
                slsConfigs: [
                    toSlsConfig(
                        component.props.stackName,
                        serverName,
                        component.props.buildPath,
                        component.props.assetsPath,
                        component.props.region),

                    ...childConfigs.map(config => config.slsConfigs)
                ],

                // provide all client configs and the server config in a flat list
                webpackConfigs: childConfigs.reduce((result, config) => result.concat(config.webpackConfigs), [serverWebPack]),
                postBuilds: childConfigs.reduce((result, config) => result.concat(config.postBuilds), []),
            }
        }
    }

    return result;

};