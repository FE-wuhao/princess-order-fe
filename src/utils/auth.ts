import Taro from '@tarojs/taro'
import { authApi } from '@/services/api'
import { isH5 } from '@/utils/platform'

const LOGIN_PAGE = '/pages/login/index'
const WORKSPACE_ENTRY_PAGE = '/pages/workspace-entry/index'

export const wxLogin = async () => {
  const loginRes = await Taro.login()
  if (!loginRes.code) {
    throw new Error('获取登录code失败')
  }

  let userInfo: { nickname?: string; avatar?: string } = {}
  try {
    const userInfoRes = await Taro.getUserProfile({
      desc: '用于完善用户资料',
    })
    userInfo = {
      nickname: userInfoRes.userInfo.nickName,
      avatar: userInfoRes.userInfo.avatarUrl,
    }
  } catch {
    console.warn('获取用户信息失败，使用默认信息')
  }

  const res = await authApi.wxLogin(loginRes.code, userInfo)
  if (res.token) {
    Taro.setStorageSync('token', res.token)
  }
  return res
}

export const accountLogin = async (username: string, password: string) => {
  const res = await authApi.login(username.trim(), password)
  if (res.token) {
    Taro.setStorageSync('token', res.token)
  }
  return res
}

export const accountRegister = async (username: string, password: string) => {
  const res = await authApi.register(username.trim(), password)
  if (res.token) {
    Taro.setStorageSync('token', res.token)
  }
  return res
}

export const checkAuth = () => !!Taro.getStorageSync('token')

export const redirectToLogin = () => {
  Taro.redirectTo({ url: LOGIN_PAGE })
}

export const redirectToWorkspaceEntry = () => {
  Taro.reLaunch({ url: WORKSPACE_ENTRY_PAGE })
}

export const ensureAuth = async (): Promise<boolean> => {
  if (checkAuth()) {
    return true
  }

  if (isH5) {
    redirectToLogin()
    return false
  }

  await wxLogin()
  return true
}

export const logout = () => {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('preferredWorkspaceId')
  if (isH5) {
    Taro.reLaunch({ url: LOGIN_PAGE })
    return
  }
  Taro.reLaunch({ url: LOGIN_PAGE })
}
