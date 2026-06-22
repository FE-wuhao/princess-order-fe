// 通知状态管理
import { create } from 'zustand'
import { messageApi } from '@/services/message.api'
import type { NotificationLog } from '@shared/types'

interface NotificationState {
  notifications: NotificationLog[]
  unreadCount: number
  loading: boolean

  loadNotifications: () => Promise<void>
  retryNotification: (id: number) => Promise<void>
  setUnreadCount: (count: number) => void
}

export const useNotificationStore = create<NotificationState>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,

    loadNotifications: async () => {
      set({ loading: true })
      try {
        const data = await messageApi.getNotifications()
        const notifications = data || []
        const unreadCount = notifications.filter(
          (n) => n.status === 'failed',
        ).length
        set({ notifications, unreadCount, loading: false })
      } catch {
        set({ loading: false })
      }
    },

    retryNotification: async (id: number) => {
      try {
        await messageApi.retryNotification(id)
        // 重试后刷新
        await get().loadNotifications()
      } catch {
        // 失败不额外处理，notification 页面会展示错误
      }
    },

    setUnreadCount: (count: number) => {
      set({ unreadCount: count })
    },
  }),
)
