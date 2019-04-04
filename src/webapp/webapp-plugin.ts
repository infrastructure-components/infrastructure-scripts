
import { IPlugin } from '../types/plugin';
import { IConfigParseResult } from '../types/config-parse-result';
import { IWebApp, isWebApp } from './webapp-component';
import {createClientWebpackConfig, complementWebpackConfig} from "../utils/webpack-libs";

/**
 * Parameters that apply to the whole Plugin, passed by other plugins
 */
export interface IWebAppPlugin {

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
 * A Plugin to detect WebApp-Components
 * @param props
 */
export const WebAppPlugin = (props: IWebAppPlugin): IPlugin => {
    const path = require('path');

    const result: IPlugin = {
        // identify Isomorphic-App-Components
        applies: (component): boolean => {

            return isWebApp(component);
        },

        // convert the component into configuration parts
        process: (component: any, childConfigs: Array<IConfigParseResult>, infrastructureMode: string | undefined): IConfigParseResult => {

            console.log("found webapp: ", component);

            // get the current path (at compilation time)
            const absolutePath = process.cwd().toString().replace(/(?:\r\n|\r|\n)/g, "");

            // where do we find the webpacked-configuration?
            const isoConfigPath = path.resolve(
                absolutePath,
                props.configFilePath.replace(/\.[^/.]+$/, "")
            );

            console.log("isoConfigPath: ", isoConfigPath);

            console.log("id: " , component.props.id)
            return {
                slsConfigs: [],

                // a webapp has its own webpack configuration
                webpackConfigs: [
                    complementWebpackConfig(createClientWebpackConfig(
                        "./"+path.join("node_modules", "infrastructure-scripts", "assets", "client.tsx"), //entryPath: string,
                        path.join(absolutePath, props.buildPath), //use the buildpath from the parent plugin
                        component.props.id,
                        {
                            IsoConfig: isoConfigPath // replace the IsoConfig-Placeholder with the real path to the main-config-bundle
                        }, {
                            WEB_APP_ID: `"${component.props.id}"` // replace the webAppId-placeholder
                        }
                    ))
                ],

                postBuilds: [],
            }
        }
    }

    return result;

};