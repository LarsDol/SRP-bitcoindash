module.exports = {
  development: {
    db: 'mongodb://localhost/bitcoindash_dev',
    port: 3000,
    app: {
      name: 'Realtime Bitcoin Dashboard'
    },
    stylus: {
      srcPath: __dirname + '/views',
      destPath: __dirname + '/public'
    }
  },

  production: {}
}