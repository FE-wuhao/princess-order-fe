import { useState, useEffect, useCallback } from 'react'
import { Button, View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { NotificationStatus, notificationStatusMetaMap, notificationTitleMap } from '@/constants/ui'
import { groupApi, messageApi, userApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'

interface NotificationItem {
  id: number
  bizType: 'order_created' | 'order_accepted' | 'order_rejected' | 'order_completed' | 'order_expired'
  status: 'pending' | 'success' | 'failed'
  templateCode: string
  createdAt?: string
  errorMessage?: string | null
}

export default function Profile() {
  const [user, setUser] = useState<any | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const [profile, logs] = await Promise.all([
        userApi.getProfile(),
        messageApi.getNotifications(),
      ])
      setUser(profile)
      setNotifications(logs || [])
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useDidShow(() => {
    loadProfile()
  })

  const handleJoinGroup = async () => {
    const result = await Taro.showModal({
      title: '输入邀请码',
      editable: true,
      placeholderText: '例如：GRBQ7X',
      confirmText: '加入',
    })

    if (!result.confirm) {
      return
    }

    const inviteCode = result.content?.trim().toUpperCase()

    if (!inviteCode) {
      Taro.showToast({
        title: '请输入邀请码',
        icon: 'none',
      })
      return
    }

    try {
      Taro.showLoading({ title: '加入中...' })
      await groupApi.joinByInvite(inviteCode)
      Taro.hideLoading()
      Taro.showToast({
        title: '加入成功',
        icon: 'success',
      })
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '加入失败')
    }
  }

  if (loading) {
    return (
      <View className='page-shell page-shell--sky px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='page-shell page-shell--sky px-4 py-5'>
      <PageHero
        badge='Profile'
        title={user?.nickname || '个人中心'}
        description='加入分组入口与最近通知都在这里，方便随时确认协作状态。'
        tone='sky'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>最近通知</Text>
              <Text className='hero-stat-card__value'>{notifications.length}</Text>
              <Text className='hero-stat-card__hint'>默认展示最近 20 条</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>账号状态</Text>
              <Text className='hero-stat-card__value'>{user ? '已登录' : '未登录'}</Text>
              <Text className='hero-stat-card__hint'>登录后可加入分组并接单</Text>
            </View>
          </View>
        }
      />

      <SectionCard
        title='加入分组'
        description='向群主拿到邀请码后，直接在这里加入对应分组。'
        actions={
          <Button className='app-button app-button--primary app-button--mini' onClick={handleJoinGroup}>
            输入邀请码
          </Button>
        }
        variant='accent'
      >
        <View className='feature-list-card feature-list-card--sky'>
          <Text className='feature-list-card__title'>通过邀请码加入</Text>
          <Text className='feature-list-card__description'>
            加入成功后回到首页或分组页刷新，就能看到新空间。
          </Text>
          <Text className='feature-list-card__meta'>邀请码通常是 6 位大写字母数字组合</Text>
        </View>
      </SectionCard>

      <SectionCard
        title='最近通知'
        description='通知记录能帮助你确认发单、接单、完成等关键节点是否推送成功。'
        meta='最近 20 条'
        variant='soft'
      >
        {notifications.length === 0 ? (
          <EmptyState tone='gray' title='还没有通知记录' description='当系统尝试发送通知后，这里会自动出现记录。' />
        ) : (
          <View>
            {notifications.map((item) => (
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
