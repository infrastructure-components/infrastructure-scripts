
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


/**
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

    const clientApp = require('IsoConfig').isoConfig.clientApps["INDEX_OF_CLIENT"];

    const hydrateFromDataLayer = clientApp.hydrateFromDataLayer !== undefined ?
        clientApp.hydrateFromDataLayer :
        (node) => node;

    hydrate(hydrateFromDataLayer(
        createClientApp(
            clientApp.routes,
            clientApp.redirects,
            basename)),
        document.getElementById('root')
    );


};

// this module MUST NOT export anything else. Because it would also load the default, which would be executed right away
export default createClientWebApp();