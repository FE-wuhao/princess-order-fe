import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { orderApi } from '../../services/api'

type OrderStatus =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'cooking'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'expired'

interface OrderItem {
  id: number
  status: OrderStatus
  recipe?: {
    id: number
    name: string
  }
  group?: {
    id: number
    name: string
  }
  creator?: {
    id: number
    nickname?: string
  }
  assignee?: {
    id: number
    nickname?: string
  }
}

const statusLabelMap: Record<OrderStatus, string> = {
  created: '待响应',
  accepted: '已接单',
  rejected: '已拒绝',
  cooking: '制作中',
  completed: '待确认',
  confirmed: '已完成',
  cancelled: '已取消',
  expired: '已超时',
}

const statusToneMap: Record<OrderStatus, string> = {
  created: 'bg-amber-100 text-amber-700',
  accepted: 'bg-sky-100 text-sky-700',
  rejected: 'bg-rose-100 text-rose-700',
  cooking: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
  expired: 'bg-orange-100 text-orange-700',
}

const boardDefinitions: Array<{
  key: string
  title: string
  description: string
  statuses: OrderStatus[]
}> = [
  {
    key: 'waiting',
    title: '待响应',
    description: '刚发出的单和刚接住的单，都在这里盯进度。',
    statuses: ['created', 'accepted'],
  },
  {
    key: 'cooking',
    title: '制作中',
    description: '已经开做的任务，适合随时进去推进或补一句进度。',
    statuses: ['cooking'],
  },
  {
    key: 'confirming',
    title: '待确认',
    description: '菜已完成，等发起人最后确认。',
    statuses: ['completed'],
  },
  {
    key: 'history',
    title: '已结束',
    description: '完成、取消、拒绝和超时的历史记录。',
    statuses: ['confirmed', 'cancelled', 'rejected', 'expired'],
  },
]

export default function TaskList() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)

    try {
      const data = await orderApi.getList({ mine: true })
      setOrders(data || [])
    } catch (error) {
      Taro.showToast({
        title: '任务列表加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useDidShow(() => {
    loadOrders()
  })

  const boardSections = useMemo(
    () =>
      boardDefinitions.map((board) => ({
        ...board,
        orders: orders.filter((order) => board.statuses.includes(order.status)),
      })),
    [orders],
  )

  const pendingCount = useMemo(
    () =>
      orders.filter((order) =>
        ['created', 'accepted', 'cooking', 'completed'].includes(order.status),
      ).length,
    [orders],
  )

  const handleTaskClick = (orderId: number) => {
    Taro.navigateTo({
      url: `/pages/task/index?id=${orderId}`,
    })
  }

  return (
    <View className='min-h-screen bg-cyan-50 px-4 py-5 pb-8'>
      <View className='mb-5 rounded-3xl bg-gradient-to-br from-cyan-200 via-sky-100 to-white p-5 shadow-sm'>
        <Text className='block text-xs uppercase tracking-widest text-cyan-700'>
          Task Board
        </Text>
        <Text className='mt-2 block text-2xl font-bold text-gray-900'>我的任务看板</Text>
        <Text className='mt-2 block text-sm leading-6 text-gray-700'>
          按状态把任务摊开看，会比只刷最近几条更不容易漏单。
        </Text>
          <View className='mt-4 rounded-2xl bg-white px-4 py-3'>
          <Text className='block text-xs text-gray-500'>待跟进任务</Text>
          <Text className='mt-1 block text-2xl font-semibold text-gray-900'>
            {pendingCount}
          </Text>
        </View>
      </View>

      {loading ? (
        <View className='rounded-3xl bg-white px-4 py-10 text-center text-gray-500 shadow-sm'>
          加载中...
        </View>
      ) : (
        <View>
          {boardSections.map((section) => (
            <View key={section.key} className='mb-5 rounded-3xl bg-white p-4 shadow-sm'>
              <View className='mb-3 flex items-center justify-between'>
                <View>
                  <Text className='block text-lg font-semibold text-gray-900'>
                    {section.title}
                  </Text>
                  <Text className='mt-1 block text-xs text-gray-500'>
                    {section.description}
                  </Text>
                </View>
                <Text className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600'>
                  {section.orders.length} 条
                </Text>
              </View>

              {section.orders.length === 0 ? (
                <View className='rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500'>
                  这一栏现在是空的。
                </View>
              ) : (
                <View>
                  {section.orders.map((order) => (
                    <View
                      key={order.id}
                    className='mb-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3'
                      onClick={() => handleTaskClick(order.id)}
                    >
                      <View className='mb-2 flex items-center justify-between'>
                        <Text className='text-base font-medium text-gray-900'>
                          {order.recipe?.name || `任务 #${order.id}`}
                        </Text>
                        <Text
                          className={`rounded-full px-2 py-1 text-xs ${statusToneMap[order.status]}`}
                        >
                          {statusLabelMap[order.status]}
                        </Text>
                      </View>
                      <Text className='block text-sm text-gray-600'>
                        分组：{order.group?.name || '未命名分组'}
                      </Text>
                      <Text className='mt-1 block text-xs text-gray-500'>
                        发起人：{order.creator?.nickname || '未命名'} / 执行人：
                        {order.assignee?.nickname || '未命名'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View className='mt-5'>
        <Button onClick={loadOrders}>刷新任务列表</Button>
      </View>
    </View>
  )
}
