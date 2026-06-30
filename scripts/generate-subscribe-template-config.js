const fs = require('fs')
const path = require('path')

const serverEnvPath = path.resolve(__dirname, '..', '..', 'server', '.env')
const outputDir = path.resolve(__dirname, '..', 'src', 'config')
const outputPath = path.join(outputDir, 'subscribe-template-ids.json')

const emptyConfig = {
  order_created: '',
  order_accepted: '',
  order_rejected: '',
  order_completed: '',
  order_expired: '',
}

const parseEnvFile = (content) =>
  content.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return env
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      return env
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    env[key] = value.replace(/^["']|["']$/g, '')
    return env
  }, {})

const serverEnv = fs.existsSync(serverEnvPath)
  ? parseEnvFile(fs.readFileSync(serverEnvPath, 'utf8'))
  : {}

const subscribeTemplateIds = {
  order_created:
    serverEnv.WX_SUBSCRIBE_ORDER_CREATED_TEMPLATE_ID ||
    emptyConfig.order_created,
  order_accepted:
    serverEnv.WX_SUBSCRIBE_ORDER_ACCEPTED_TEMPLATE_ID ||
    emptyConfig.order_accepted,
  order_rejected:
    serverEnv.WX_SUBSCRIBE_ORDER_REJECTED_TEMPLATE_ID ||
    emptyConfig.order_rejected,
  order_completed:
    serverEnv.WX_SUBSCRIBE_ORDER_COMPLETED_TEMPLATE_ID ||
    emptyConfig.order_completed,
  order_expired:
    serverEnv.WX_SUBSCRIBE_ORDER_EXPIRED_TEMPLATE_ID ||
    emptyConfig.order_expired,
}

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(
  outputPath,
  JSON.stringify(subscribeTemplateIds, null, 2) + '\n',
  'utf8',
)

console.log(`subscribe templates synced: ${outputPath}`)
