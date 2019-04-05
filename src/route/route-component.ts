import React, {ReactNode} from 'react';
import Types from '../types';
import {IComponent} from "../types/component";

export const ROUTE_INSTANCE_TYPE = "RouteComponent";


/**
 * Specifies all the properties that a Route-Component must have
 */
export interface IRoute {

    path: string,

    name: string,

    render?: any,

    component?: any
}


/**
 * The WebApp is a client that runs in the browser, SPA or SSR
 *
 * @param props
 */
export default (props: IRoute | any) => {

    console.log ("route: ",props );

    const routeProps: IComponent = {
        infrastructureType: Types.INFRASTRUCTURE_TYPE_COMPONENT,
        instanceType: ROUTE_INSTANCE_TYPE
    };

    return Object.assign(routeProps, props);


};

export const isRoute = (component) => {

    return component !== undefined &&
        component.instanceType === ROUTE_INSTANCE_TYPE;
};