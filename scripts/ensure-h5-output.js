const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const outputDirs = ['js', 'chunk', 'css'].map((name) => path.join(distDir, name));

for (const outputDir of outputDirs) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Ensured H5 output directories:', outputDirs.map((dir) => path.relative(projectRoot, dir)).join(', '));
