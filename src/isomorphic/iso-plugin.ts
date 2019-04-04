
import { IPlugin } from '../types/plugin';
import { IConfigParseResult } from '../types/config-parse-result';
import { IIsomorphic, isIsomorphicApp } from './iso-component';
import { toSlsConfig } from "../utils/sls-libs";
import {createServerWebpackConfig, complementWebpackConfig} from "../utils/webpack-libs";
import  { resolveAssetsPath } from '../utils/iso-libs';

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
            // get the current path (at compilation time)
            const absolutePath = process.cwd().toString().replace(/(?:\r\n|\r|\n)/g, "");

            // where do we find the webpacked-configuration?
            const isoConfigPath = path.resolve(
                absolutePath,
                props.configFilePath.replace(/\.[^/.]+$/, "")
            );

            console.log("isoConfigPath: ", isoConfigPath);
            //console.log("found iso: ", component);


            // the isomorphic app has a server application
            const serverWebPack = complementWebpackConfig(
                createServerWebpackConfig(
                    "./"+path.join("node_modules", "infrastructure-scripts", "assets", "server.tsx"), //entryPath: string,
                    path.join(absolutePath, props.buildPath), //use the buildpath from the parent plugin
                    component.props.stackName, // name of the server
                    {
                        IsoConfig: isoConfigPath // replace the IsoConfig-Placeholder with the real path to the main-config-bundle
                    }, {
                        __ASSETS_PATH__: `"${component.props.assetsPath}"`,
                        __RESOLVED_ASSETS_PATH__: `"${resolveAssetsPath(component.props.buildPath, component.props.stackName, component.props.assetsPath ) }"`
                    }
                )
            );

            return {
                slsConfigs: [
                    toSlsConfig(
                        component.props.stackName,
                        component.props.stackName, // we use the stackname as name of the server-app, too!
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