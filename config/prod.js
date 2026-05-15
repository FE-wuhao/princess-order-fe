module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
    TARO_APP_API_BASE_URL: '"https://api.wuhao.space/api"'
  },
  mini: {},
  h5: {
    publicPath: 'https://princess-order.wuhao.space/',
    router: {
      mode: 'browser',
    },
  },
}

