import Taro from '@tarojs/taro'

export const getErrorMessage = (
  error: unknown,
  fallback = '请求失败',
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: unknown
      errMsg?: unknown
    }

    if (
      typeof maybeError.message === 'string' &&
      maybeError.message.trim()
    ) {
      return maybeError.message
    }

    if (typeof maybeError.errMsg === 'string' && maybeError.errMsg.trim()) {
      return maybeError.errMsg
    }
  }

  return fallback
}

export const showErrorToast = (
  error: unknown,
  fallback = '请求失败',
): void => {
  Taro.showToast({
    title: getErrorMessage(error, fallback),
    icon: 'none',
  })
}
