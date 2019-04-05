
/**
 * returns the current working directory
 */
export const currentAbsolutePath =() => process.cwd().toString().replace(/(?:\r\n|\r|\n)/g, "");

/**
 *
 * @param configFilePath
 * @return the absolute path to the main configuration of the project
 *
 */
export const pathToConfigFile = (configFilePath: string): string => {
    const path = require('path');

    return  path.resolve(
        currentAbsolutePath(),
        configFilePath.replace(/\.[^/.]+$/, "")
    );
};


/**
 * npm run build && node -r dotenv/config -e 'require(\"./src/config\").slsLogin()' dotenv_config_path=.dev.env && sls deploy && node -r dotenv/config -e 'require(\"./src/config\").s3sync()' dotenv_config_path=.dev.env",
 */
export async function loadEnv(env: string) {
    if (env.endsWith(".env")) {

        const cmd = require('node-cmd');

        await cmd.run(`export $(grep -v '^#' ${env} | xargs) `);

        const dotenv = require('dotenv');
        const result = dotenv.config({ path: env });
        if (result.error) {
            throw result.error;
        }

        //const { parsed: envs } = result;
        //console.log(envs);

        return true;
    }

    return false;
};


export function copyAssets( source, targetFolder ) {

    const fs = require('fs');
    const path = require('path');

    var files = [];

    //check if folder needs to be created or integrated
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder, {recursive: true} );
    }

    //copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            console.log("source: " , curSource);
            console.log("dest: " , path.join(targetFolder, path.parse(curSource).base));
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                fs.copyFileSync( curSource, path.join(targetFolder, path.parse(curSource).base) );
            }
        } );
    }
}


export function copyFolderRecursiveSync( source, target ) {
    const fs = require('fs');
    const path = require('path');

    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }

    //copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                fs.copyFileSync( curSource, path.join(targetFolder, path.parse(curSource).base) );
            }
        } );
    }
}