import React, {ReactNode} from 'react';

import Types from '../types';
import { IClient } from "../types/client";

export const WEBAPP_INSTANCE_TYPE = "WebAppComponent";


/**
 * Specifies all the properties that a Client-Component must have
 */
export interface IWebApp {

    /**
     * a unique id or name of the route
     */
    id: string,

    /**
     * the relative  path of the route, e.g. "/" for the root, or "/something", or "*" for any
     * Can be a regex to filter the paths of the routes and redirects
     */
    path: string,

    /**
     * The http method of the route, e.g. get, post, ...
     */
    method: string,
}


/**
 * identifies a component as a WebApp: it implements all the required fields
 *
 * @param component to be tested
 */
export function isWebApp(component) {
    return component !== undefined &&
        component.instanceType === WEBAPP_INSTANCE_TYPE
}

/**
 * The WebApp is a client that runs in the browser, SPA or SSR
 *
 * @param props
 */
export default (props: IWebApp | any) => {

    console.log ("webapp: ",props );

    // the WebAppComponent must have all the properties of IClient
    const clientProps: IClient = {
        infrastructureType: Types.INFRASTRUCTURE_TYPE_CLIENT,
        instanceType: WEBAPP_INSTANCE_TYPE
    };

    return Object.assign(clientProps, props);


};
