module.exports = {
  plugins: {
    autoprefixer: {},
    'postcss-pxtransform': {
      platform: 'weapp',
      designWidth: 375,
    },
  },
}

