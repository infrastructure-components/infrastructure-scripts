import React, {ReactNode} from 'react';
import { IWebApp, INFRASTRUCTURE_TYPE_WEBAPP } from '../types/webapp';

import { WebAppPlugin } from './webapp-plugin';

/**
 * Specifies all the properties that a ClientApp-Component must have
 * Although this component is called "WebApp" it is NOT an App in the sense of this library!
 * Rather: WebApp is a name of its own!
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
 * The WebApp is a client that runs in the browser, SPA or SSR
 *
 * @param props
 */
export default (props: IWebApp | any) => {

    console.log ("webapp: ",props );

    const webAppProps: IWebApp = {
        infrastructureType: INFRASTRUCTURE_TYPE_WEBAPP,

    };

    return Object.assign(webAppProps, props);


};

export function isWebApp(component) {
    return component.props !== undefined &&
        component.props.id !== undefined &&
        component.props.path !== undefined &&
        component.props.method !== undefined
}