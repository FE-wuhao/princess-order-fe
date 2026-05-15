/**
 * 将样式中的 px 数值按倍率缩放（750 设计习惯 → 375 设计稿时倍率为 0.5）
 */
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../src/app.scss'),
  path.join(__dirname, '../src/styles/ui-patterns.scss'),
  path.join(__dirname, '../src/styles/ui-tokens.scss'),
];

const scale = Number(process.argv[2] || '0.5');

const scalePxInContent = (content) =>
  content.replace(/(\d+(?:\.\d+)?)px/g, (match, raw) => {
    const value = Number(raw);
    if (value >= 9999) {
      return match;
    }
    const next = value * scale;
    const rounded = Math.round(next * 100) / 100;
    return `${rounded}px`;
  });

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const next = scalePxInContent(content);
  fs.writeFileSync(filePath, next);
  console.log(`scaled: ${path.relative(process.cwd(), filePath)}`);
});
