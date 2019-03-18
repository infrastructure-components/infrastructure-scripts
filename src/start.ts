/**
 * Starts an express-server on `localhost` that serves the client-web app on the port specified in
 * the environment variables or 3000 (default)
 */


import { loadConfiguration, complementWebpackConfig, startDevServer } from './libs';
import { ConfigTypes } from './config';
import { YamlEditor } from './yaml-edit';


import { promisify } from './libs';

import { SERVERLESS_YML } from './types/sls-config';

export function existsSlsYml () {
    const fs = require("fs");

    try {
        fs.statSync('serverless.yml');
    } catch (error){
        return false;
    }

    return true;
}

/**
 * convert json to yml: https://www.npmjs.com/package/json-to-pretty-yaml
 * 
 * @param ssrConfigPath path to a module that exports [[ServerSideRenderingConfig]]
 */
export async function startSlsOffline (slsConfig: any) {

    //const webpackConfig = await loadConfiguration(configFilePath);

    // create a serverless.yml in the root directory

    const fs = require("fs");
    const ymlExists = await existsSlsYml();
    /*if (ymlExists) {
        console.error("serverless.yml already exists. This file would be overwritten! Please remove it before proceeding.");
        return;
    }*/

    const cmd = require('node-cmd');
    let yamlEdit = YamlEditor(SERVERLESS_YML);

    // add the
    Object.keys(slsConfig).forEach(key => {
        console.log (key);
        yamlEdit.insertChild(key, slsConfig[key]);
    });

    let yamlString = yamlEdit.dump();

    console.log(yamlString);

    await fs.writeFile('serverless.yml', yamlString, function (err) {
        if (err) throw err;
        console.log('serverless.yml created...');
    });


    await new Promise((resolve, reject) => {
        let data_line = '';
        const processRef = cmd.get(`sls offline start`);
        processRef.stdout.on(
            'data',
            async function(data) {
                data_line += data;
                if (data_line[data_line.length-1] == '\n') {
                    console.log(data_line);

                    /*if (data_line.indexOf("Serverless: Offline listening") >= 0 && await existsSlsYml()) {
                        fs.unlink('serverless.yml', function (err) {
                            if (err) throw err;
                            console.log('serverless.yml removed...');
                        });

                    }*/

                }
            }
        );

    });

}


/**
 *
 * @param configFilePath
 */
export async function start (configFilePath: string) {

    const config = await loadConfiguration(configFilePath);

    // when we have a browser app, we start it directly
    if (config.type === ConfigTypes.LOWLEVEL_SPA && config.webpackConfig !== undefined) {
        
        console.log("start spa locally");
        startDevServer(complementWebpackConfig(config.webpackConfig));
        
    } else if (config.type === ConfigTypes.LOWLEVEL_SERVER && config.slsConfig !== undefined) {
        
        console.log("start ssr locally/offline");
        startSlsOffline(config.slsConfig);
        
    } else {
        console.error("Cannot start the provided configuration!")
    }


}
