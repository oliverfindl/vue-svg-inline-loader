// This is where project configuration and plugin options are located. 
// Learn more: https://gridsome.org/docs/config

// Changes here requires a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const { join } = require('path');

module.exports = {
  siteName: 'Gridsome',
  plugins: [],
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-svg-inline-loader')
//      .loader('vue-svg-inline-loader') // in your project
        .loader(join(__dirname, '../../index.js'))
        .options({ /* ... */ });
  }
}