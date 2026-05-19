import Taro from '@tarojs/taro'

const PREFERRED_WORKSPACE_STORAGE_KEY = 'preferredWorkspaceId'

export const getPreferredWorkspaceId = () => {
  const value = Number(Taro.getStorageSync(PREFERRED_WORKSPACE_STORAGE_KEY) || 0)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export const setPreferredWorkspaceId = (workspaceId: number) => {
  if (!workspaceId || workspaceId <= 0) {
    Taro.removeStorageSync(PREFERRED_WORKSPACE_STORAGE_KEY)
    return
  }

  Taro.setStorageSync(PREFERRED_WORKSPACE_STORAGE_KEY, workspaceId)
}
