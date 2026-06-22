// 认证状态管理
import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { authApi } from '@/services/auth.api'
import { userApi } from '@/services/user.api'
import type { User } from '@shared/types'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean

  isLoggedIn: () => boolean
  wxLogin: () => Promise<void>
  accountLogin: (username: string, password: string) => Promise<void>
  accountRegister: (username: string, password: string) => Promise<void>
  logout: () => void
  loadProfile: () => Promise<void>
  refreshToken: (token: string) => void
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 初始化时从 storage 读取
  const storedToken = Taro.getStorageSync('token') || null

  if (storedToken) {
    Taro.setStorageSync('token', storedToken)
  }

  return {
    token: storedToken,
    user: null,
    loading: false,

    isLoggedIn: () => !!get().token,

    wxLogin: async () => {
      set({ loading: true })
      try {
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
          set({ token: res.token })
        }
      } finally {
        set({ loading: false })
      }
    },

    accountLogin: async (username: string, password: string) => {
      set({ loading: true })
      try {
        const res = await authApi.login(username.trim(), password)
        if (res.token) {
          Taro.setStorageSync('token', res.token)
          set({ token: res.token })
        }
      } finally {
        set({ loading: false })
      }
    },

    accountRegister: async (username: string, password: string) => {
      set({ loading: true })
      try {
        const res = await authApi.register(username.trim(), password)
        if (res.token) {
          Taro.setStorageSync('token', res.token)
          set({ token: res.token })
        }
      } finally {
        set({ loading: false })
      }
    },

    logout: () => {
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('preferredWorkspaceId')
      set({ token: null, user: null })
      Taro.reLaunch({ url: '/pages/login/index' })
    },

    loadProfile: async () => {
      try {
        const user = await userApi.getProfile()
        set({ user })
      } catch {
        // 获取失败不清除已登录状态
      }
    },

    refreshToken: (token: string) => {
      Taro.setStorageSync('token', token)
      set({ token })
    },
  }
})
