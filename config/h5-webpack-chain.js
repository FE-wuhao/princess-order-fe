const deviceRatio = {
  640: 2.34 / 2,
  750: 1,
  375: 2,
  828: 1.81 / 2,
};

const getH5PostcssPlugins = () => [
  require('postcss-import'),
  require('autoprefixer')(),
  require('postcss-pxtransform')({
    platform: 'h5',
    designWidth: 750,
    deviceRatio,
    baseFontSize: 20,
    maxRootSize: 40,
    minRootSize: 20,
  }),
  require('postcss-html-transform')({
    platform: 'h5',
    removeCursorStyle: false,
  }),
];

const postcssLoaderOptions = () => ({
  postcssOptions: {
    plugins: getH5PostcssPlugins(),
  },
});

/** Taro H5 默认把 postcss 拆成独立 rule，scss 编译后 rpx 不会转成 rem，需手动接入 loader 链 */
const attachPostcssToRule = (rule, postcssOptions, beforeLoader) => {
  const useKey = 'h5-postcss-pxtransform';
  if (rule.uses.has(useKey)) {
    return;
  }

  const postcssUse = rule.use(useKey).loader('postcss-loader').options(postcssOptions);

  if (beforeLoader && rule.uses.has(beforeLoader)) {
    postcssUse.before(beforeLoader);
    return;
  }

  const loaderNames = rule.uses.entries();
  if (loaderNames.length > 0) {
    postcssUse.before(loaderNames[0]);
  }
};

const patchH5StylePipeline = (chain) => {
  const postcssOptions = postcssLoaderOptions();
  const styleRuleNames = ['scss', 'sass', 'less', 'stylus', 'css', 'postcss'];

  styleRuleNames.forEach((ruleName) => {
    if (!chain.module.rules.has(ruleName)) {
      return;
    }

    const rule = chain.module.rule(ruleName);

    if (rule.oneOfs && rule.oneOfs.store.size > 0) {
      rule.oneOfs.store.forEach((_value, oneOfName) => {
        attachPostcssToRule(rule.oneOf(oneOfName), postcssOptions, 'css-loader');
      });
      return;
    }

    attachPostcssToRule(
      rule,
      postcssOptions,
      ruleName === 'scss' || ruleName === 'sass' ? 'resolve-url-loader' : undefined,
    );
  });

  if (chain.module.rules.has('postcss')) {
    chain.module.rule('postcss').exclude.add(() => true);
  }
};

module.exports = {
  patchH5StylePipeline,
};
