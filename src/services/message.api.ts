import { request } from './request'
import type { NotificationLog } from '@shared/types'

export const messageApi = {
  getNotifications: () =>
    request<NotificationLog[]>({ url: '/messages/notifications' }),

  retryNotification: (id: number) =>
    request<NotificationLog>({
      url: `/messages/notifications/${id}/retry`,
      method: 'POST',
    }),
}
