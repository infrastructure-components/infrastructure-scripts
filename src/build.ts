

import { promisify } from './libs';


export async function build (configFilePath: string) {

    const HtmlWebpackPlugin = require('html-webpack-plugin');
    const webpack = require("webpack");
    const cmd = require('node-cmd');
    
    const data = await promisify(callback => cmd.get(`cat ${configFilePath}`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    //console.log("data: ", data);

    if (!data) {
        return;
    }

    const configStr = await promisify(callback => cmd.get(`node -e "console.log(eval(require(\\\"./${configFilePath}\\\")))"`, callback))
        .then((data) => data)
        .catch(err => {
            console.log("err: ", err);
            return undefined;
        });

    //console.log("config: ",config);

    var config = undefined;
    eval('config='+configStr);

    console.log("config: ",config);

    config.mode = "development";

    config.devtool= 'source-map';
    config.resolve = {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
    };
    config.module = {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: require.resolve('ts-loader')
            },
            { enforce: "pre", test: /\.js$/, loader: require.resolve("source-map-loader") },
            {
                test:/\.css$/,
                use:[require('style-loader'),require.resolve('css-loader')]
            }, {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                loader: require.resolve('url-loader')
            },
        ]
    };

    config.plugins = [
        new HtmlWebpackPlugin({
            title: 'My App',
            filename: 'index.html'
        }),
        //new webpack.HotModuleReplacementPlugin()
    ];

    await webpack(config, (err, stats) => {
        if (err) {
            console.error(err.stack || err);
            if (err.details) {
                console.error(err.details);
            }
            return;
        }

        const info = stats.toJson();

        if (stats.hasErrors()) {
            console.error(info.errors);
        }

        if (stats.hasWarnings()) {
            console.warn(info.warnings);
        }

        // Log result...
    });

    console.log("end");
};
