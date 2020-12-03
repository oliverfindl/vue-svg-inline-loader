const { join } = require('path')

module.exports = {
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-svg-inline-loader')
//      .loader('vue-svg-inline-loader') // in your project
        .loader(join(__dirname, '../../index.js'))
        .options({ /* ... */ })
  }
}
