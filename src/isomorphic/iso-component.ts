import React, {ReactNode} from 'react';

import Types from '../types';
import { IInfrastructure } from "../types/infrastructure";

import { isMiddleware } from '../middleware/middleware-component';
import { getChildrenArray } from '../utils/libs';

import { IsoPlugin } from './iso-plugin';
import { WebAppPlugin } from '../webapp/webapp-plugin';

import { loadInfrastructureComponent, INFRASTRUCTURE_MODES } from '../utils/loader';

export const ISOMORPHIC_INSTANCE_TYPE = "IsomorphicComponent";

/**
 * Specifies all the properties that an Isomorphic-Component must get from the user, as args
 */
export interface IIsomorphicArgs {

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
 * specifies the properties that an Isomorphic-Component has during runtime
 */
export interface IIsomorphicProps {

    /**
     * An isomorphic component supports middlewares, defines as direct children
     */
    middlewares: Array<any>
}

/**
 * The IsomorphicApp is an infrastructure and must implement [[IInfrastructure]]
 *
 * @param props
 */
export default (props: IIsomorphicArgs | any) => {

    console.log ("isomorphic: ",props );

    const infProps: IInfrastructure = {

        // allows to identify this component as Infrastructure
        infrastructureType: Types.INFRASTRUCTURE_TYPE_INFRASTRUCTURE,

        instanceId: props.stackName,
        
        instanceType: ISOMORPHIC_INSTANCE_TYPE,

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

    const isoProps: IIsomorphicProps = {
        middlewares: getChildrenArray(props.children)
            .filter(child => isMiddleware(child))
            .map(mw => mw.callback)
    }
    

    return Object.assign(props, infProps, isoProps);


};

export function isIsomorphicApp(component) {
    return component !== undefined &&
        component.instanceType === ISOMORPHIC_INSTANCE_TYPE
}