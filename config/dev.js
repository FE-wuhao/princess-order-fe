module.exports = {
  env: {
    NODE_ENV: '"development"',
  },
  defineConstants: {
    TARO_APP_API_BASE_URL: '"http://localhost:3001/api"',
  },
  mini: {},
  h5: {
    devServer: {
      port: 10086,
      open: true,
    },
  },
};
