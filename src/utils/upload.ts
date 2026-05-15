import Taro from '@tarojs/taro'
import { extractResponseMessage } from './request'

declare const TARO_APP_API_BASE_URL: string

export const uploadAvatar = (filePath: string): Promise<{ avatar: string }> => {
  const token = Taro.getStorageSync('token')

  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: `${TARO_APP_API_BASE_URL}/users/profile/avatar`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data =
              typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            const user = data as { avatar?: string }
            if (!user.avatar) {
              reject(new Error('头像上传失败'))
              return
            }
            resolve({ avatar: user.avatar })
          } catch {
            reject(new Error('头像上传响应解析失败'))
          }
          return
        }

        let payload: unknown = res.data
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload)
          } catch {
            payload = { message: payload }
          }
        }

        reject(new Error(extractResponseMessage(payload)))
      },
      fail: (error) => {
        reject(error)
      },
    })
  })
}
