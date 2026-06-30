import { useEffect } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import { NotificationStatus, notificationStatusMetaMap, notificationTitleMap } from '@/constants/ui'
import { useNotificationStore } from '@/stores/useNotificationStore'
import type { NotificationLog } from '@shared/types'

export default function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications)
  const loading = useNotificationStore((s) => s.loading)
  const loadNotifications = useNotificationStore((s) => s.loadNotifications)
  const retryNotification = useNotificationStore((s) => s.retryNotification)

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleRetry = async (id: number) => {
    try {
      Taro.showLoading({ title: '重试中...' })
      await retryNotification(id)
      Taro.hideLoading()
      Taro.showToast({ title: '已重试', icon: 'success' })
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({ title: '重试失败', icon: 'none' })
    }
  }

  return (
    <Page title='通知记录' tone='sky' topSpacerMode='header'>
      {loading ? (
        <View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : notifications.length === 0 ? (
        <EmptyState tone='gray' title='还没有通知' description='任务相关通知会在这里出现。' />
      ) : (
        <View>
          {notifications.map((item: NotificationLog) => {
            const statusMeta = notificationStatusMetaMap[item.status as NotificationStatus]
            return (
              <View key={item.id} className='feature-list-card'>
                <View className='mb-2 flex items-center justify-between'>
                  <Text className='feature-list-card__title'>{notificationTitleMap[item.bizType]}</Text>
                  <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                </View>
                <Text className='feature-list-card__meta'>{item.createdAt || '暂无'}</Text>
                {item.errorMessage ? (
                  <Text className='mt-2 block text-sm text-rose-500'>错误：{item.errorMessage}</Text>
                ) : null}
                {item.status === 'failed' ? (
                  <View className='mt-3'>
                    <Button className='app-button app-button--warn app-button--mini' onClick={() => handleRetry(item.id)}>
                      重试
                    </Button>
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      )}
    </Page>
  )
}
