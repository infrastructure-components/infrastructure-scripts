
import { keys } from 'ts-transformer-keys';
import { IPlugin, implementsInterface } from '../types/plugin';
import { IConfigParseResult } from '../types/config-parse-result';
import { IIsomorphic } from './iso-component';

/**
 * A Plugin to detect Isomorphic-App-Components
 * @param props
 */
export default (props: any): IPlugin => {

    const result: IPlugin = {
        // identify Isomorphic-App-Components
        applies: (component): boolean => {
            return implementsInterface(component, keys<IIsomorphic>());
        },

        // convert the component into configuration parts
        process: (component: any, childConfigs: Array<IConfigParseResult>, compileMode: boolean): IConfigParseResult => {

            // TODO !!!
            return {
                slsConfigs: {},
                webpackConfigs: [],
                postBuilds: [],
            }
        }
    }

    return result;

};