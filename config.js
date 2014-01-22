module.exports = {
  development: {
    port: 1337,
    app: {
      name: 'Realtime Bitcoin Dashboard'
    },
    stylus: {
      srcPath: __dirname + '/views',
      destPath: __dirname + '/public'
    }
  },

  production: {}
};