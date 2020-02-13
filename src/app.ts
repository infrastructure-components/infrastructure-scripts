/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */

import { parseConfiguration } from './infra-comp-utils/configuration-lib';

import {
    IConfigParseResult,
    PARSER_MODES
} from 'infrastructure-components';

/**
 *
 * @param configFilePath
 */
export async function app (configFilePath: string, appName: string, stage: string | undefined) {

    // load and parse the configuration from the temporary folder
    const parsedConfig: IConfigParseResult = await parseConfiguration(configFilePath, stage, PARSER_MODES.MODE_START);


    // get the webpack-configuration of the app
    const wpConfig = parsedConfig.webpackConfigs.reduce(
        (res, wpConfig) => {
            //console.log("found webapp: ", wpConfig.name)
            return res !== undefined ? res : (wpConfig.name === appName ? wpConfig : undefined)
        }, undefined
    );

    if (wpConfig === undefined) {
        console.error("Could not find webapp: " , appName);
        return;
    }

    await require('infrastructure-components').fetchData("hotdev", {
        stackname: parsedConfig.stackName,
        envi: stage
    });

    // now we can start the dev-server
    startDevServer(wpConfig);

}

/**
 *
 * @param wpConfig
 * @param basename (optional) use in SOA to pass the base-url of the services endpoint
 */
export function startDevServer(wpConfig, basename=undefined, localUrl=undefined) {
    const path = require('path');
    const express = require('express');
    const webpack = require('webpack');


    const app = express();

    // TODO load from the environment-configuration rather than from the env-file!
    const port = process.env.PORT || 3000;

     const bundlePath = path.join(
         wpConfig.output.publicPath !== undefined ? wpConfig.output.publicPath : "",
         wpConfig.output.filename.replace("[name]", Object.keys(wpConfig.entry))
     );

    //const bundlePath = path.join("js", "app.bundle.js");
    console.log("path: ", bundlePath);
    // serve a basic html with the app.bundle.js
    app.get('/', (req, res) => {
        return localUrl !== undefined ? res.sendFile(localUrl) : res.send(`
<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
        <style>
            html, body, #root {
                display: block;
                margin: 0px;
                height: 100%;
            }
         </style>
      </head>
      <body >
        <div id="root" />
        <script>${basename !== undefined ? `window.__BASENAME__ ="${basename}";` : ""}</script>
        <script src="${bundlePath}"></script>
      </body>
    </html>
`);
    });

    let compiler = webpack(wpConfig);
    app.use(require('webpack-dev-middleware')(compiler, {
        noInfo: true, publicPath: wpConfig.output.publicPath, stats: {colors: true}
    }));

    // let the started server apply changes on-the-fly
    app.use(require('webpack-hot-middleware')(compiler));

    // this path directs to the output of the client, as defined in `webpack.config.client.js`
    app.use(express.static(wpConfig.output.path));


    app.listen(port, () => {
        console.log(`App is listening on port ${port}`)
    });
};
