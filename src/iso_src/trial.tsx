// this must be imported to allow async-functions within an AWS lambda environment
// see: https://github.com/babel/babel/issues/5085
import "@babel/polyfill";

import React, { ReactNode} from "react";
import ReactDOMServer from "react-dom/server";
import express from "express";
import serverless from "serverless-http";


//import { createServerApp } from '../app';


export function createServerApp () {

    return <div>Hello Server From App/index.tsx</div>;
};

function renderFullPage(html) {


	return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        
      </head>
      <body>
        <div id="root">${html.trim()}</div>
        <script src="assets/main.bundle.js"></script>
      </body>
    </html>`
}


async function serve (req, res) {

    // collect the styles from the connected app
    const htmlData = ReactDOMServer.renderToString(createServerApp());

    // render a page with the state and return it in the response
    res.status(200).send(renderFullPage(htmlData)).end();


}


const createServer = () => {
    
    // express is the web-framework that lets us configure the endpoints
    const app = express();


    // in production, API-Gateway proxy redirects the request to S3
    // serve static files - the async components of the server - only used of localhost
    // TODO parametize this request
    app.use('/assets', express.static('./build/server/assets'));

    
    /**
     *  serve any 'get'-request made to the server
     *
     *  put at the end so that all the special routes are handled before!
     */
    app.get('*', async function (req, res, next) {

        await serve(req,res);
    });

    return app;
}

// we're exporting the handler-function as default, must match the sls-config!
export default (assetsDir, resolvedAssetsPath) => {
    console.log("ISO-CONFIG-PATH: ", require('IsoConfig').isoConfig);

    return serverless(createServer());
}