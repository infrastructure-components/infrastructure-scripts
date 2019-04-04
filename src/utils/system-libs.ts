
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