import React, {ReactNode} from 'react';

import Types from '../types';
import { IComponent} from "../types/component";


export const MIDDLEWARE_INSTANCE_TYPE = "MiddlewareComponent";


/**
 * Specifies all the properties that a Middleware-Component must have
 */
export interface IMiddleware {

    /**
     * entry point of the middleware
     */
    callback: any,

}

/**
 * The Middleware (is an Express-Middleware!) has no Plugin because it requires no
 *
 * @param props
 */
export default (props: IMiddleware | any) => {

    console.log ("middleware: ",props );

    // the component must have the properties of IComponent
    const componentProps: IComponent = {
        infrastructureType: Types.INFRASTRUCTURE_TYPE_COMPONENT,
        instanceType: MIDDLEWARE_INSTANCE_TYPE
    };

    return Object.assign(componentProps, props);


};


export const isMiddleware = (component) => {

    return component !== undefined &&
        component.instanceType === MIDDLEWARE_INSTANCE_TYPE;
};
