const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const distIndexPath = path.join(projectRoot, 'dist', 'index.html')
const versionJsonPath = path.join(projectRoot, 'src', 'config', 'app-version.json')

if (!fs.existsSync(distIndexPath)) {
  throw new Error(`dist/index.html not found: ${distIndexPath}`)
}

if (!fs.existsSync(versionJsonPath)) {
  throw new Error(`app version json not found: ${versionJsonPath}`)
}

const { version } = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
const html = fs.readFileSync(distIndexPath, 'utf8')

const updated = html.replace(
  /((?:src|href)="(?:https?:\/\/[^\"]+\/)?[^\"]+\.(?:js|css))(\")/g,
  (match, url, suffix) => {
    if (url.includes('?v=')) {
      return match
    }

    return `${url}?v=${version}${suffix}`
  },
)

fs.writeFileSync(distIndexPath, updated, 'utf8')
console.log(`postbuilt index.html with version ${version}`)
