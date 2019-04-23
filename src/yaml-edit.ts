
export const YamlEditor = (input) => {
    let yaml = input;

    function search(place) {
        let lines = yaml.split(/\n/);
        let indentlevel = 0;
        let levelname = '';
        let context = [];
        let found = false;
        let before = [];
        let after = [];
        lines.map((line, idx) => {
            let parts = line.match(/^( *)([^ :]+):/);
            if (parts) {
                indentlevel = parts[1].length / 2 || 0;
                levelname = parts[2];
                context[indentlevel] = levelname;
                let currContext = context.slice(0, indentlevel+1).join('.');
                if (found) {
                    after.push(line);
                } else {
                    before.push(line);
                }
                if (currContext == place) {
                    found = true;
                }
            } else {
                if (found) {
                    after.push(line);
                } else {
                    before.push(line);
                }
            }

        });
        return [
            before.join('\n'),
            after.join('\n')
        ];
    }

    function generateSnippet(doc, indentLevel, isArray) {
        console.log("generateSnippet" , doc, " - array: " , isArray)

        let keys = Object.keys(doc);
        let snippet = '';
        let lines = [];
        let indent = ' '.repeat(indentLevel * 2);
        if (isArray) {
            indent = indent.replace(/  $/, '- ');
        }

        if (typeof doc === "string") {
            lines.push(indent + doc);
        } else if (isArray && keys.length > 1) {
            // when we are in an array and the object has more than one key

            keys.map((k, idx) => {
                let val = doc[k];

                if (idx == 0) {
                    if (typeof(val) != 'object') {
                        lines.push(indent + k + ': ' + val);
                    } else {
                        lines.push(indent + k + ':');


                        if (Array.isArray(val)) {
                            val.map((arrItem, idx2) => {
                                //console.log("item: ", arrItem);
                                let arrLines=generateSnippet(arrItem, indentLevel+2, true);
                                lines = lines.concat(arrLines);
                            });
                        } else {
                            lines = lines.concat(generateSnippet(val, indentLevel + 1, false));
                        }
                    }

                } else {
                    if (typeof(val) != 'object') {
                        lines.push(' '.repeat(indentLevel * 2) + k + ': ' + val);
                    } else {
                        lines.push(' '.repeat(indentLevel * 2) + k + ':');
                        //lines = lines.concat(generateSnippet(val, indentLevel + 1, false));

                        if (Array.isArray(val)) {
                            //console.log("arr?: YES", val);
                            val.map((arrItem, idx2) => {
                                //console.log("item: ", arrItem);
                                let arrLines=generateSnippet(arrItem, indentLevel+2, true);
                                lines = lines.concat(arrLines);
                            });
                        } else {
                            lines = lines.concat(generateSnippet(val, indentLevel + 1, false));
                        }
                    }
                }


            });

        } else {
            keys.map((k, idx) => {
                let val = doc[k];

                if (typeof(val) != 'object') {
                    if (!isArray && keys.every((el: any,idx,arr) => !isNaN(el))) {
                        lines.push(indent + '- ' + val);
                    } else {
                        lines.push(indent + k + ': ' + val);
                    }

                } else {
                    lines.push(indent + k + ':');


                    if (Array.isArray(val)) {
                        //console.log("arr?: YES", val);
                        val.map((arrItem, idx2) => {
                            //console.log("item: ", arrItem);
                            let arrLines=generateSnippet(arrItem, indentLevel+2, true);
                            lines = lines.concat(arrLines);
                        });
                    } else {
                        lines = lines.concat(generateSnippet(val, indentLevel + 1, false));
                    }
                }
            });
        }



        return lines.join('\n');
    }

    return {
        dump: () => {
            return yaml;
        },
        init: (input) => {
            yaml = input;
            return module.exports;
        },
        hasKey: (place) => {
            const parts = search(place);
            if (parts[1].length == 0) {
                return false;
            } else {
                return true;
            }
        },
        insertChild: (place, doc) => {
            let parts = search(place);
            let begin = parts[0];
            let end = parts[1];
            if (! end) {
                return new Error(`Could not find place`);
            }
            let indentLevel = place.split('.').length;
            let insertText = generateSnippet(doc, indentLevel, false);

            yaml = [begin, insertText, end].join('\n');
            return null;
        }
    }
}