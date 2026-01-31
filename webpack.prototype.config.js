const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/server-prototype.ts',
  target: 'node',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle-prototype.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  node: {
    __dirname: true,
    __filename: true,
  },
  mode: 'development',
};
