
/**
 * the resolved assets path is the path ot the assets folder in the running environment
 */
export const resolveAssetsPath = (buildPath: string, serverName: string, assetsPath: string) => {
    const path = require('path');

    const resolvedPath = path.resolve(buildPath, serverName, assetsPath);

    return !resolvedPath.endsWith("/") ? resolvedPath+"/" : resolvedPath;
};


/**
 * TODO 
 * 
 * @param publicPath
 * @param outputPath
 */
export function startDevServer(publicPath: any, outputPath: string) {
    const path = require('path');
    const express = require('express');
    const webpack = require('webpack');


    const app = express();

    // TODO load from the environment-configuration rather than from the env-file!
    const port = process.env.PORT || 3000;


    /*
     filename: '[name].bundle.js',
     path: require('path').resolve(__dirname, './build/client'),

     /**
     * The public path is the relative path from the url where the `bundle.js` will be found
     * It must have a leading slash here!
     *
     * we use the `STAGE_PATH` from the environment to specify the url

     publicPath: "/"+require('./src/config/route').pathToAssets()



     entry: {
     app: ['./src/client/index.tsx']
     },
     output: {
     path: path.resolve(__dirname, 'build', 'client'),
     filename: '[name].bundle.js'
     publicPath: "/"+require('./src/config/route').pathToAssets()
     },


    const bundlePath = path.join(
        webpackConfig.output.publicPath !== undefined ? webpackConfig.output.publicPath : "",
        webpackConfig.output.filename.replace("[name]", Object.keys(webpackConfig.entry))
    );
     */
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

    let compiler = webpack(webpackConfig);
    app.use(require('webpack-dev-middleware')(compiler, {
        noInfo: true, publicPath: publicPath, stats: {colors: true}
    }));

    // let the started server apply changes on-the-fly
    //app.use(require('webpack-hot-middleware')(compiler));

    // this path directs to the output of the client, as defined in `webpack.config.client.js`
    app.use(express.static(outputPath));


    app.listen(port, () => {
        console.log(`App is listening on port ${port}`)
    });
}