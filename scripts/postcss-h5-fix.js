const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const pxtransform = require('postcss-pxtransform');

const distDir = path.join(__dirname, '..', 'dist');
const deviceRatio = {
  640: 2.34 / 2,
  750: 1,
  375: 2,
  828: 1.81 / 2,
};

const plugins = [
  require('autoprefixer')(),
  pxtransform({
    platform: 'h5',
    designWidth: 750,
    deviceRatio,
    baseFontSize: 20,
    maxRootSize: 40,
    minRootSize: 20,
  }),
];

const collectCssFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectCssFiles(fullPath);
    }
    return entry.name.endsWith('.css') ? [fullPath] : [];
  });
};

const transformFile = async (filePath) => {
  const input = fs.readFileSync(filePath, 'utf8');
  if (!input.includes('rpx')) {
    return;
  }

  const result = await postcss(plugins).process(input, { from: filePath, to: filePath });
  fs.writeFileSync(filePath, result.css);
};

const run = async () => {
  const cssFiles = collectCssFiles(distDir);
  await Promise.all(cssFiles.map(transformFile));
  console.log(`postcss-h5-fix: processed ${cssFiles.length} css file(s)`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
