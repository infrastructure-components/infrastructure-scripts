declare var require: any;

const path = require ('path');
const HtmlWebpackPlugin = require ('html-webpack-plugin');

/**
 * This function should be exported to be a valid command in the command line interface
 * see: https://medium.com/netscape/a-guide-to-create-a-nodejs-command-line-package-c2166ad0452e
 * 
 * @param config
 * @param html_config
 */
export function build (config: any, html_config: any) {

    const webpack = require("webpack");

    config.mode = "development";


    config.devtool= 'source-map';
    config.resolve = {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
    };
    config.module = {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader'
            },
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
            {
                test:/\.css$/,
                use:['style-loader','css-loader']
            }, {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                loader: 'url-loader?limit=100000'
            },
        ]
    };

    config.plugins = [
        new HtmlWebpackPlugin(html_config),
        new webpack.HotModuleReplacementPlugin()
    ];
    
    webpack(config, (err, stats) => {
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
};

export const hello = (text: string) => {
    console.log(`hello ${text}`)
}