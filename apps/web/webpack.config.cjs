const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

module.exports = (_env, argv) => {
  const isProduction = argv.mode === "production";

  return {
  entry: path.resolve(__dirname, "src/main.jsx"),
  mode: isProduction ? "production" : "development",
  devtool: isProduction ? "source-map" : "eval-cheap-module-source-map",
  output: {
    clean: true,
    filename: "main.[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/"
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: "defaults" }],
              ["@babel/preset-react", { runtime: "automatic" }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|jpe?g)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[name].[contenthash][ext]"
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon: path.resolve(__dirname, "src/assets/favicon.png"),
      template: path.resolve(__dirname, "index.html")
    }),
    new webpack.DefinePlugin({
      "process.env.API_BASE_URL": JSON.stringify(process.env.VITE_API_BASE_URL || "http://localhost:4000/api")
    })
  ],
  devServer: {
    historyApiFallback: true,
    hot: true
  },
  performance: {
    hints: isProduction ? "warning" : false
  }
};
};
