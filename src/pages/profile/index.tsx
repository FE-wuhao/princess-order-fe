import { useState, useEffect, useCallback } from 'react'
import { Button, View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { groupApi, messageApi, userApi } from '../../services/api'

interface NotificationItem {
  id: number
  bizType: 'order_created' | 'order_accepted' | 'order_rejected' | 'order_completed' | 'order_expired'
  status: 'pending' | 'success' | 'failed'
  templateCode: string
  createdAt?: string
  errorMessage?: string | null
}

const notificationTitleMap: Record<NotificationItem['bizType'], string> = {
  order_created: '发单通知',
  order_accepted: '接单通知',
  order_rejected: '拒单通知',
  order_completed: '完成通知',
  order_expired: '超时通知',
}

const notificationToneMap: Record<NotificationItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
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
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
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
      Taro.showToast({
        title: '加入失败',
        icon: 'none',
      })
    }
  }

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  return (
    <View className='min-h-screen bg-gray-100 p-5'>
      <View className='mb-5 rounded-3xl bg-gradient-to-br from-slate-200 via-white to-cyan-100 p-5 shadow-sm'>
        <Text className='text-xl font-bold'>个人中心</Text>
        <Text className='mt-2 block text-sm text-gray-600'>
          这里放加入分组的入口，也能顺手看看最近通知有没有发成功。
        </Text>
      </View>

      {user && (
        <View className='mb-5 rounded-3xl bg-white p-5 shadow-sm'>
          <Text className='text-base'>{user.nickname || '未设置昵称'}</Text>
        </View>
      )}

      <View className='mb-5 rounded-3xl bg-white p-5 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>加入分组</Text>
          <Button size='mini' type='primary' onClick={handleJoinGroup}>
            输入邀请码
          </Button>
        </View>
        <Text className='text-sm text-gray-500'>
          向群主拿到邀请码之后，直接在这里加入对应分组。
        </Text>
      </View>

      <View className='rounded-3xl bg-white p-5 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>最近通知</Text>
          <Text className='text-xs text-gray-500'>最近 20 条</Text>
        </View>
        {notifications.length === 0 ? (
          <View className='rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500'>
            还没有通知记录。
          </View>
        ) : (
            <View>
            {notifications.map((item) => (
              <View
                key={item.id}
                  className='mb-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3'
              >
                <View className='mb-2 flex items-center justify-between'>
                  <Text className='text-base font-medium text-gray-900'>
                    {notificationTitleMap[item.bizType]}
                  </Text>
                  <Text
                    className={`rounded-full px-2 py-1 text-xs ${notificationToneMap[item.status]}`}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text className='block text-xs text-gray-500'>
                  模板：{item.templateCode}
                </Text>
                <Text className='mt-1 block text-xs text-gray-500'>
                  时间：{item.createdAt || '暂无'}
                </Text>
                {item.errorMessage ? (
                  <Text className='mt-2 block text-xs text-rose-500'>
                    错误：{item.errorMessage}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
