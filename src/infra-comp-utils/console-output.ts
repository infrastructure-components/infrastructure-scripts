/**
 * Created by frank.zickert on 20.06.19.
 */


const max = 76; // + 2 spaces + 2 frame == 80
const clc = require('cli-color');

export const frameText = (txt, fColor) =>  "║ "+fColor(txt)+"".concat(new Array(Math.max(max-txt.length,0)).join(" ")).concat(" ║");
export const frameTop = () => "\n╔═".concat(new Array(max).join("═"), "═╗");
export const frameBottom = () => "╚═".concat(new Array(max).join("═"), "═╝\n");
export const singleLine = () => "║-".concat(new Array(max).join("-"), "-║")
export const emptyLine = () => frameText("", clc.black);
