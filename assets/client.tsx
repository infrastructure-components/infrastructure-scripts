//import {getChildrenArray, INFRASTRUCTURE_MODES, parseInfrastructureComponent} from "../utils/parser";

const extractWebApp = (component) => {
    
    const webAppId = WEB_APP_ID; // this constant is replaced during compilation
/*
    // get an infrastructure-component or undefined if it is not...
    const parsedComponent = parseInfrastructureComponent(component, INFRASTRUCTURE_MODES.RUNTIME);

    // we search a webapp with the specified id
    if (isWebAppConfig(parsedComponent) && component.props.id === webAppId) {

        return parsedComponent;

    } else {

        // search the children
        return getChildrenArray(component).reduce((result, child) => {

            // when we found our app, we can return it
            if (result !== undefined) {
                return result;
            } else {
                // otherwise, we need to search the current child
                return extractWebApp(child);
            }

        }, undefined)
    }
*/

// TODO
    return component;
}


/**
 * The global declaration is required of the typedoc documentation
 */
declare global {
    interface Window {
        __BASENAME__: any;
    }
}


// this must be imported to allow async-functions within an AWS lambda environment
// see: https://github.com/babel/babel/issues/5085
import "@babel/polyfill";

import React from 'react';
import { hydrate } from 'react-dom';
import { createClientApp } from './routed-app';
//import {isWebAppConfig} from "../types/webapp";

/**
 * For a not yet known reason (maybe because compiled on "web"), this module must not import anything
 * that does not exist in web-mode, e.g. fs
 *
 * Creates the main Client WebApp. The `./src/client/index.tsx` module exports the result of calling this function
 * This serves as Entry-Point specified in the [[webpackConfigClient]]
 *
 * This function takes the data that is generated from the server endpoint
 */
const createClientWebApp = () => {

    var basename: string = "";
    if (typeof window != 'undefined' && window.__BASENAME__) {
        basename = window.__BASENAME__;
        delete window.__BASENAME__;
    }


    // TODO NOTE: we use a compiled version of the configuration here, may cause the context-problem??!
    // the IsoConfig is the overall configuration! this path is replaced by the webapp-plugin
    var IsoConfig = require('IsoConfig');
    const webApp = {
        routes: [],
        redirects: []
    }; //extractWebApp(IsoConfig.default);

    // TODO parse it !!!!
    /*if (IsoConfig && IsoConfig.default && IsoConfig.default.props) {
        IsoConfig = loadIsoConfigFromComponent(IsoConfig.default, false);
    }*/


    // TODO!!!!
    //const clientApp = IsoConfig.isoConfig.clientApps["INDEX_OF_CLIENT"];

    /*const hydrateFromDataLayer = clientApp.dataLayer !== undefined ?
        clientApp.dataLayer.type({infrastructureMode: "component"}).hydrateFromDataLayer :
        (node) => {
            console.log("this is the dummy data layer hydration")
            return node;
        }*/

    hydrate(//hydrateFromDataLayer(
        createClientApp(
            webApp.routes,
            webApp.redirects,
            basename),//),
        document.getElementById('root')
    );


};

// this module MUST NOT export anything else. Because it would also load the default, which would be executed right away
export default createClientWebApp();