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
            return res !== undefined ? res : (wpConfig.name === appName ? wpConfig : undefined)
        }, undefined
    );

    if (wpConfig === undefined) {
        console.error("Could not find webapp: " , appName);
        return;
    }

    // now we can start the dev-server
    startDevServer(wpConfig);

}


export function startDevServer(wpConfig) {
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
        return res.send(`
<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        
      </head>
      <body >
        <div id="root" />‚
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
