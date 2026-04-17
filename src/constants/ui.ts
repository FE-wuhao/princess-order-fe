export type OrderStatus =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'cooking'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'expired'

export type NotificationStatus = 'pending' | 'success' | 'failed'

export type NotificationBizType =
  | 'order_created'
  | 'order_accepted'
  | 'order_rejected'
  | 'order_completed'
  | 'order_expired'

export const orderStatusMetaMap: Record<
  OrderStatus,
  { label: string; tone: 'warning' | 'info' | 'danger' | 'accent' | 'success' | 'neutral' }
> = {
  created: { label: '待响应', tone: 'warning' },
  accepted: { label: '已接单', tone: 'info' },
  rejected: { label: '已拒绝', tone: 'danger' },
  cooking: { label: '制作中', tone: 'accent' },
  completed: { label: '待确认', tone: 'success' },
  confirmed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'neutral' },
  expired: { label: '已超时', tone: 'danger' },
}

export const notificationStatusMetaMap: Record<
  NotificationStatus,
  { label: string; tone: 'warning' | 'success' | 'danger' }
> = {
  pending: { label: '待发送', tone: 'warning' },
  success: { label: '发送成功', tone: 'success' },
  failed: { label: '发送失败', tone: 'danger' },
}

export const notificationTitleMap: Record<NotificationBizType, string> = {
  order_created: '发单通知',
  order_accepted: '接单通知',
  order_rejected: '拒单通知',
  order_completed: '完成通知',
  order_expired: '超时通知',
}
