const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const configDir = path.join(projectRoot, 'src', 'config')
const tsPath = path.join(configDir, 'app-version.ts')
const jsonPath = path.join(configDir, 'app-version.json')

function formatVersion(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `V-${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const now = new Date()
const version = formatVersion(now)
const timestamp = now.toISOString()
const tsContent = `export const APP_VERSION = '${version}'\nexport const APP_VERSION_STORAGE_KEY = 'appVersion'\nexport const APP_VERSION_PREVIOUS_STORAGE_KEY = 'appVersionPrevious'\nexport const APP_VERSION_RECORD_TIME_STORAGE_KEY = 'appVersionRecordTime'\n`
const jsonContent = JSON.stringify({ version, generatedAt: timestamp }, null, 2) + '\n'

fs.mkdirSync(configDir, { recursive: true })
fs.writeFileSync(tsPath, tsContent, 'utf8')
fs.writeFileSync(jsonPath, jsonContent, 'utf8')

console.log(version)
