
import { IPlugin } from '../types/plugin';
import { IConfigParseResult } from '../types/config-parse-result';
import { IIsomorphic, isIsomorphicApp } from './iso-component';
//import {toSlsConfig} from "../utils/sls-libs";

/**
 * A Plugin to detect Isomorphic-App-Components
 * @param props
 */
export const IsoPlugin = (props: any): IPlugin => {

    const result: IPlugin = {
        // identify Isomorphic-App-Components
        applies: (component): boolean => {

            return isIsomorphicApp(component);
        },

        // convert the component into configuration parts
        process: (component: any, childConfigs: Array<IConfigParseResult>, infrastructureMode: string | undefined): IConfigParseResult => {

            //console.log("found iso: ", component);

            return {
                slsConfigs: [//TODO
                    /*toSlsConfig(
                        component.props.stackName,
                        component.props.stackName, // we use the stackname as name of the server-app, too!
                        component.props.buildPath,
                        component.props.assetsPath,
                        component.props.region),

                    ...childConfigs.map(config => config.slsConfigs)*/
                ],

                webpackConfigs: childConfigs.reduce((result, config) => result.concat(config.webpackConfigs), []),
                postBuilds: childConfigs.reduce((result, config) => result.concat(config.postBuilds), []),
            }
        }
    }

    return result;

};