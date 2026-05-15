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

const WECHAT_TOAST_TITLE_LIMIT = 7

export const showErrorToast = (
  error: unknown,
  fallback = '请求失败',
): void => {
  const message = getErrorMessage(error, fallback)
  const titleLength = [...message].length

  if (titleLength > WECHAT_TOAST_TITLE_LIMIT) {
    void Taro.showModal({
      title: '操作失败',
      content: message,
      showCancel: false,
      confirmText: '知道了',
    })
    return
  }

  Taro.showToast({
    title: message,
    icon: 'none',
  })
}

export const hideLoadingAndShowError = (
  error: unknown,
  fallback = '请求失败',
): void => {
  Taro.hideLoading({
    complete: () => {
      showErrorToast(error, fallback)
    },
  })
}
