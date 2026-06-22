import Taro from '@tarojs/taro'

const PREFERRED_WORKSPACE_STORAGE_KEY = 'preferredWorkspaceId'

interface WorkspaceIdentity {
  id: number
}

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

export const resolvePreferredWorkspaceId = <T extends WorkspaceIdentity>(workspaces: T[]) => {
  if (workspaces.length === 0) {
    return 0
  }

  const preferredWorkspaceId = getPreferredWorkspaceId()
  return workspaces.find((workspace) => workspace.id === preferredWorkspaceId)?.id || workspaces[0].id
}
