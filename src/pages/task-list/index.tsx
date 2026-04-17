import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { OrderStatus, orderStatusMetaMap } from '@/constants/ui'
import { orderApi } from '@/services/api'

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
    <View className='page-shell page-shell--sky px-4 py-5 pb-8'>
      <PageHero
        badge='Task Board'
        title='任务进度一眼看清'
        description='这里不是首页的展开版，而是按状态管理任务的工作台，适合随时推进、确认和补进度。'
        tone='sky'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>待跟进任务</Text>
              <Text className='hero-stat-card__value'>{pendingCount}</Text>
              <Text className='hero-stat-card__hint'>优先关注待响应、制作中和待确认</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>总任务数</Text>
              <Text className='hero-stat-card__value'>{orders.length}</Text>
              <Text className='hero-stat-card__hint'>所有历史任务都在这里收口</Text>
            </View>
          </View>
        }
        actions={
          <Button className='app-button app-button--ghost' onClick={loadOrders}>
            刷新任务列表
          </Button>
        }
      />

      {loading ? (
        <SectionCard title='任务看板' description='正在同步最新任务状态。'>
          <View className='py-10 text-center text-gray-500'>加载中...</View>
        </SectionCard>
      ) : (
        <View>
          {boardSections.map((section) => (
            <SectionCard
              key={section.key}
              title={section.title}
              description={section.description}
              meta={`${section.orders.length} 条`}
              variant='soft'
            >
              {section.orders.length === 0 ? (
                <EmptyState
                  tone='sky'
                  title='这一栏现在是空的'
                  description='状态分栏会自动归档，空出来说明这一阶段没有待处理任务。'
                />
              ) : (
                <View>
                  {section.orders.map((order) => {
                    const statusMeta = orderStatusMetaMap[order.status]

                    return (
                      <View
                        key={order.id}
                        className='feature-list-card feature-list-card--sky'
                        onClick={() => handleTaskClick(order.id)}
                      >
                        <View className='mb-2 flex items-center justify-between'>
                          <Text className='feature-list-card__title'>
                            {order.recipe?.name || `任务 #${order.id}`}
                          </Text>
                          <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                        </View>
                        <Text className='feature-list-card__description'>
                          分组：{order.group?.name || '未命名分组'}
                        </Text>
                        <Text className='feature-list-card__meta'>
                          发起人：{order.creator?.nickname || '未命名'} / 执行人：
                          {order.assignee?.nickname || '未命名'}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </SectionCard>
          ))}
        </View>
      )}
    </View>
  )
}
