import React, {ReactNode} from 'react';

import Types from '../types';
import { IInfrastructure } from "../types/infrastructure";


import { IsoPlugin } from './iso-plugin';
import { WebAppPlugin } from '../webapp/webapp-plugin';


/**
 * Specifies all the properties that an Isomorphic-Component must have
 * These are specified by the user
 */
export interface IIsomorphic {

    /**
     * name of the Cloudformation Stack
     */
    stackName: string,

    /**
     * Local, relative directory specifies where to put the final bundles
     */
    buildPath: string,

    /**
     * Relative directory specifies where to put the assets (e.g. client-app-bunde-js)
     */
    assetsPath: string,

    /**
     * The AWS region
     */
    region: string
}


/**
 * The IsomorphicApp is an infrastructure and must implement [[IInfrastructure]]
 *
 * @param props
 */
export default (props: IIsomorphic | any) => {

    console.log ("isomorphic: ",props );

    const appProps: IInfrastructure = {

        // allows to identify this component as Infrastructure
        infrastructureType: Types.INFRASTRUCTURE_TYPE_INFRASTRUCTURE,

        // only load plugins during compilation
        createPlugins: (configPath: string) => props.infrastructureMode === "COMPILATION" ? [
            // be able to process IsomorphicApps (as top-level-node)
            IsoPlugin({
                buildPath: props.buildPath,
                configFilePath: configPath
            }),

            // isomorphic apps can have webapps (i.e. clients!)
            WebAppPlugin({
                buildPath: props.buildPath,
                configFilePath: configPath
            })

        ] : []
    };

    return Object.assign(appProps, props);


};

export function isIsomorphicApp(component) {
    return component.props !== undefined &&
        component.props.stackName !== undefined &&
        component.props.buildPath !== undefined &&
        component.props.assetsPath !== undefined &&
        component.props.region !== undefined
}