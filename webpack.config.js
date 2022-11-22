const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    context: __dirname,
    entry: "./src/main.ts",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"), 
        publicPath: "/dist/",
        clean: true
    },
    plugins:[
        new HtmlWebpackPlugin({filename: "index.html", template: "./src/index.html"})
    ],
    devServer: {
        static: path.join(__dirname, "dist"),
        hot: true
    },

    module: {
        rules: [ 
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.wgsl$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-shader-loader"
                }
            },
            {   
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                exclude: /node_modules/,
                type: 'asset/resource',
            },
        ]
    },

    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    }
}