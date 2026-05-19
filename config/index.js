const path = require("path");

// dev:* 使用 development，build:* 使用 production。
const config =
  process.env.NODE_ENV === "development" ? require("./dev") : require("./prod");

module.exports = {
  projectName: "princess-order-miniprogram",
  date: "2024-1-1",
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: "src",
  outputRoot: "dist",
  plugins: [
    "@tarojs/plugin-framework-react",
    "@tarojs/plugin-platform-h5",
  ],
  defineConstants: config.defineConstants || {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: "react",
  compiler: "webpack5",
  cache: {
    enable: false,
  },
  alias: {
    "@": path.resolve(__dirname, "..", "src"),
  },
  env: config.env || {},
  mini: {
    runtime: {
      enable: true,
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: "module",
          generateScopedName: "[name]__[local]___[hash:base64:5]",
        },
      },
    },
    ...(config.mini || {}),
  },
  h5: {
    publicPath: "/",
    staticDirectory: "static",
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      pxtransform: {
        enable: true,
        config: {
          targetUnit: "rem",
          baseFontSize: 20,
          maxRootSize: 40,
          minRootSize: 20,
        },
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: "module",
          generateScopedName: "[name]__[local]___[hash:base64:5]",
        },
      },
    },
    ...(config.h5 || {}),
  },
};
