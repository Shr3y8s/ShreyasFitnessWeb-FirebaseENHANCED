const path = require('path');

module.exports = {
  mode: 'production',
  entry: './js/amplify-bundle.js',
  output: {
    filename: 'amplify-bundle.min.js',
    path: path.resolve(__dirname, 'js'),
  },
  resolve: {
    extensions: ['.js'],
  },
};
