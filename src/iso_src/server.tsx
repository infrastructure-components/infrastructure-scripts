// this must be imported to allow async-functions within an AWS lambda environment
// see: https://github.com/babel/babel/issues/5085
import "@babel/polyfill";

import React, { ReactNode} from "react";
import ReactDOMServer from "react-dom/server";
import express from "express";
import serverless from "serverless-http";

const createServer = () => {

    // express is the web-framework that lets us configure the endpoints
    const app = express();


    // in production, API-Gateway proxy redirects the request to S3
    // serve static files - the async components of the server - only used of localhost
    // TODO parametize this request
    app.use('/assets', express.static('./build/server/assets'));


    // split the routes here and define a function for each of the routes, with the right middleware
    require('IsoConfig').isoConfig.routes.filter(route => route.middlewareCallbacks !== undefined && route.middlewareCallbacks.length > 0)
        .map(route => {
            if (route.method.toUpperCase() == "GET") {
                app.get(route.path, ...route.middlewareCallbacks)
            } else if (route.method.toUpperCase() == "POST") {
                app.post(route.path, ...route.middlewareCallbacks)
            } else if (route.method.toUpperCase() == "PUT") {
                app.put(route.path, ...route.middlewareCallbacks)
            } else if (route.method.toUpperCase() == "DELETE") {
                app.delete(route.path, ...route.middlewareCallbacks)
            }

            return route;
        });


    return app;
}


// we're exporting the handler-function as default, must match the sls-config!
export default serverless(createServer());