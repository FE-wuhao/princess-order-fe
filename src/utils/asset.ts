declare const TARO_APP_API_BASE_URL: string

export const resolveAssetUrl = (value?: string | null): string => {
  if (!value?.trim()) {
    return ''
  }

  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const apiBase = TARO_APP_API_BASE_URL.replace(/\/api\/?$/, '')
  return `${apiBase}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}
