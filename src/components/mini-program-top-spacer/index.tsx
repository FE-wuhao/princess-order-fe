import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'

export function getMiniProgramNavMetrics() {
  if (process.env.TARO_ENV === 'h5') {
    return { height: 0, menuTop: 0, menuHeight: 0 }
  }

  try {
    const menuButton = Taro.getMenuButtonBoundingClientRect?.()
    if (menuButton?.bottom) {
      return {
        height: menuButton.bottom + 8,
        menuTop: menuButton.top,
        menuHeight: menuButton.height,
      }
    }

    const systemInfo = Taro.getSystemInfoSync?.()
    const statusBarHeight = systemInfo?.statusBarHeight || 20
    return {
      height: statusBarHeight + 44,
      menuTop: statusBarHeight,
      menuHeight: 44,
    }
  } catch {
    return { height: 64, menuTop: 20, menuHeight: 44 }
  }
}

const navMetrics = getMiniProgramNavMetrics()

export default function MiniProgramTopSpacer() {
  if (!navMetrics.height) {
    return null
  }

  return <View className='mini-program-top-spacer' style={{ height: `${navMetrics.height}px` }} />
}
