/**
 * PostCSS 插件：移除 CSS 类名中的转义字符，修复 WXSS 编译错误
 */
module.exports = () => {
  return {
    postcssPlugin: 'postcss-remove-escape',
    OnceExit(root) {
      root.walkRules((rule) => {
        // 替换类选择器中的转义字符
        // .mb-2\.5 -> .mb-2-5
        // .last\:mb-0 -> .last-mb-0
        rule.selector = rule.selector
          .replace(/\\\./g, '-') // \. -> -
          .replace(/\\:/g, '-'); // \: -> -
      });
    },
  };
};

module.exports.postcss = true;

