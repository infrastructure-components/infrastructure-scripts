
import {ReactNode} from "react";
import {IConnectionResult} from "../types/iso-config";

/**
 * The DataLayer is a Isomorphic App that supports connecting a database and providing
 * server side data to the client
 */

export interface IDataLayer {
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
}