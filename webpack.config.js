// webpack.config.js
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/react/signup/index.js',
  output: {
    filename: 'signup-bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: { directory: path.join(__dirname, '/') },
    hot: true,
    open: true,
    port: 3000,
    historyApiFallback: true,
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
