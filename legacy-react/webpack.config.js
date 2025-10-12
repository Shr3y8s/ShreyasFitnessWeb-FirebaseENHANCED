// webpack.config.js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: {
    signup: './src/react/signup/index.js'
  },
  output: {
    filename: '[name]-bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  devServer: {
    static: { directory: path.join(__dirname, '../') },
    hot: true,
    open: true,
    port: 3000,
    historyApiFallback: {
      rewrites: [
        { from: /./, to: '/index.html' }
      ],
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env', '@babel/preset-react'] }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: []
};
