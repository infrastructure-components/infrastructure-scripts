import React, {ReactNode} from 'react';
import Types from '../types';
import {IComponent} from "../types/component";

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

    };

    return Object.assign(routeProps, props);


};

export const isRoute = (component) => {

    return component.props &&
        component.props.path !== undefined &&
        (component.props.render !== undefined || component.props.component !== undefined) &&
        component.props.name !== undefined;
};