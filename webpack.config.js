// webpack.config.js
const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

// Load .env files - first look for .env.local, then fallback to .env
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
const env = dotenv.config({ path: envPath }).parsed || {};

// Reduce env variables to a format webpack can use
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  mode: 'development', // Change to 'production' for production builds
  entry: './src/react/signup/index.js',
  output: {
    filename: 'signup-bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
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
  plugins: [
    new webpack.DefinePlugin(envKeys),
    // Add hardcoded fallbacks for Stripe and Firebase keys in case they're missing in .env
    new webpack.DefinePlugin({
      'process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY': JSON.stringify(
        env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 
        'pk_test_51Hg4SwBjx3iGODd6fpJzOpYnyoBLQfoZS4ZMusKkfV82WhhHL0z15HWLe2Fs2K45x5GlNzX91ywD6lJkYfsbAHCz002TVq3QZn'
      ),
      'process.env.REACT_APP_FIREBASE_API_KEY': JSON.stringify(
        env.REACT_APP_FIREBASE_API_KEY ||
        'AIzaSyADF9yuram-pvlzjg6kBtdCk7LuK0M65tk'
      ),
      // Add other environment variables as needed
    })
  ]
};
