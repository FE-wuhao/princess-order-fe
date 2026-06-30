import Taro from '@tarojs/taro'
import templateIdsJson from '@/config/subscribe-template-ids.json'
import { isWeapp } from '@/utils/platform'

type SubscribeTemplateKey =
  | 'order_created'
  | 'order_accepted'
  | 'order_rejected'
  | 'order_completed'
  | 'order_expired'

const templateIds = templateIdsJson as Record<SubscribeTemplateKey, string>

const isConfiguredTemplateId = (templateId?: string) =>
  Boolean(templateId && /^[A-Za-z0-9_-]{20,}$/.test(templateId))

const chunk = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

export const requestOrderSubscribeMessages = async (
  keys: SubscribeTemplateKey[],
): Promise<void> => {
  if (!isWeapp) {
    return
  }

  const requestSubscribeMessage = (
    Taro as typeof Taro & {
      requestSubscribeMessage?: (options: {
        tmplIds: string[]
        success?: () => void
        fail?: () => void
        complete?: () => void
      }) => void
    }
  ).requestSubscribeMessage

  if (typeof requestSubscribeMessage !== 'function') {
    return
  }

  const ids = Array.from(
    new Set(keys.map((key) => templateIds[key]).filter(isConfiguredTemplateId)),
  )

  for (const tmplIds of chunk(ids, 3)) {
    await new Promise<void>((resolve) => {
      requestSubscribeMessage({
        tmplIds,
        complete: () => resolve(),
      })
    })
  }
}

export const requestCreatorOrderSubscriptions = () =>
  requestOrderSubscribeMessages([
    'order_accepted',
    'order_rejected',
    'order_completed',
    'order_expired',
  ])

export const requestAssigneeOrderSubscriptions = () =>
  requestOrderSubscribeMessages(['order_created'])
