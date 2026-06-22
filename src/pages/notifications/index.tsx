import { useEffect } from 'react'
import { Text, View } from '@tarojs/components'
import EmptyState from '@/components/empty-state'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import SubPageHeader from '@/components/sub-page-header'
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

  return (
    <View className='page-shell page-shell--sky px-4 py-5'>
      <SubPageHeader title='通知记录' description='发单、接单、完成和失败通知，统一在这里查看。' />

      <SectionCard title='最近通知' description='点击首页的通知入口也会来到这里。' variant='soft'>
        {loading ? (
          <View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
        ) : notifications.length === 0 ? (
          <EmptyState tone='gray' title='还没有通知记录' description='当系统尝试发送通知后，这里会自动出现记录。' />
        ) : (
          <View>
            {notifications.map((item: NotificationLog) => (
              <View key={item.id} className='feature-list-card'>
                <View className='mb-2 flex items-center justify-between'>
                  <Text className='feature-list-card__title'>{notificationTitleMap[item.bizType]}</Text>
                  <StatusChip
                    label={notificationStatusMetaMap[item.status as NotificationStatus].label}
                    tone={notificationStatusMetaMap[item.status as NotificationStatus].tone}
                  />
                </View>
                <Text className='feature-list-card__meta'>模板：{item.templateCode}</Text>
                <Text className='feature-list-card__meta'>时间：{item.createdAt || '暂无'}</Text>
                {item.errorMessage ? (
                  <Text className='mt-2 block text-sm text-rose-500'>错误：{item.errorMessage}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </View>
  )
}
