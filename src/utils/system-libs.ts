
import { promisify } from './cmd-libs';
/**
 * runs a command in the node-environment of the calling project
 * @return the absolute path of the current working directory
 */
export async function currentAbsolutePath () {
    const cmd = require('node-cmd');

    const pwd = await promisify(callback => cmd.get(`pwd`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return "";
        });

    const absolutePath = pwd.toString().replace(/(?:\r\n|\r|\n)/g, "");

    console.log("absolutePath: " , absolutePath);

    return absolutePath;
}