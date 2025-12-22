module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    'postcss-pxtransform': {
      platform: 'weapp',
      designWidth: 375,
    },
  },
}

