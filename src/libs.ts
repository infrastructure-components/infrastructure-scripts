
/**
 * transforms a function into a Promise
 */
export const promisify = foo => new Promise((resolve, reject) => {
    foo((error, result, stderr) => {
        if(error) {
            reject(error)
        } else if (stderr) {
            reject(error)
        } else {
            resolve(result)
        }
    })
});


/*
 import cmd from 'node-cmd';
cmd.get(
    'ls',
    function(err, data, stderr){
        console.log('the current dir contains these files :\n\n',data)
    }
);

console.log(`hello ${args}`);*/