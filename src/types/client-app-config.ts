import {IRedirect, IRoute} from "../iso_src/routed-app";
import {ReactNode} from "react";
import {IConnectionResult} from "./iso-config";

export interface IClientApp {

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

    /**
     * Array of Routes that this app serves
     */
    routes: Array<IRoute>,

    /**
     * Array of Redirects
     */
    redirects: Array<IRedirect>,

    /**
     * This function only takes the app as parameter, set the schema of the implementation to the real one
     * if you want to avoid network calls on the server side (rendering)
     */
    connectWithDataLayer?: (ReactNode) => IConnectionResult,

    /**
     * Puts the data back into the app
     * @param ReactNode
     */
    hydrateFromDataLayer?: (ReactNode) => ReactNode,

    /**
     * Function that creates the ClientApp corresponding to the middleware-rendering
     */
    //createClientApp: () => ReactNode,

    /**
     * array of callbacks to be used of a route before handing over to the "*"-callback
     */
    middlewareCallbacks: Array<any>,



}