const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const taroRemoteDir = path.join(projectRoot, 'node_modules', '.taro', 'weapp', 'remote')
const distPrebundleDir = path.join(distDir, 'prebundle')
const distProjectConfigPath = path.join(distDir, 'project.config.json')

process.env.NODE_ENV = 'production'

try {
  fs.rmSync(distDir, { recursive: true, force: true })
} catch (error) {
  console.warn(`Skipped dist cleanup: ${error.message}`)
}

require('./generate-app-version')
require('./generate-subscribe-template-config')

const result = spawnSync(
  'taro',
  ['build', '--type', 'weapp', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  },
)

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

if (result.status) {
  process.exit(result.status)
}

if (fs.existsSync(taroRemoteDir)) {
  fs.rmSync(distPrebundleDir, { recursive: true, force: true })
  fs.cpSync(taroRemoteDir, distPrebundleDir, { recursive: true })
  console.log(`Copied Taro prebundle files to ${path.relative(projectRoot, distPrebundleDir)}`)
}

if (fs.existsSync(distProjectConfigPath)) {
  const projectConfig = JSON.parse(fs.readFileSync(distProjectConfigPath, 'utf8'))
  projectConfig.setting = {
    ...(projectConfig.setting || {}),
    uploadWithSourceMap: false,
    compileHotReLoad: false,
  }
  fs.writeFileSync(distProjectConfigPath, JSON.stringify(projectConfig, null, 2) + '\n')
}

process.exit(0)
