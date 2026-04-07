// Taro 的 build/watch 流程会把 NODE_ENV 置为 production，不能用它判断业务环境。
// 本地默认走 dev 配置；只有显式设置 APP_ENV=production 时才使用 prod。
const config =
  process.env.APP_ENV === "production" ? require("./prod") : require("./dev");

module.exports = {
  projectName: "princess-order-miniprogram",
  date: "2024-1-1",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: "src",
  outputRoot: "dist",
  plugins: ["@tarojs/plugin-framework-react"],
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
  alias: {},
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
