import Taro from '@tarojs/taro'

type RouteParams = Record<string, string | undefined> | undefined

export const getRouteNumberParam = (
  params: RouteParams,
  ...keys: string[]
) => {
  for (const key of keys) {
    const value = Number(params?.[key] || 0)
    if (Number.isInteger(value) && value > 0) {
      return value
    }
  }

  return 0
}

export const reLaunchToWorkspaceEntry = () => {
  Taro.reLaunch({
    url: '/pages/workspace-entry/index',
  })
}
