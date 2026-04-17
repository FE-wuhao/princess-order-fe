import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { orderStatusMetaMap } from '@/constants/ui'
import { groupApi, orderApi } from '@/services/api'
import { checkAuth, wxLogin } from '@/utils/auth'

interface GroupItem {
  id: number
  name: string
}

interface OrderItem {
  id: number
  status: keyof typeof orderStatusMetaMap
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

export default function Index() {
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)

    try {
      const [groupsData, ordersData] = await Promise.all([
        groupApi.getList(),
        orderApi.getList({ mine: true }),
      ])
      setGroups(groupsData || [])
      setOrders(ordersData || [])
    } catch (error) {
      Taro.showToast({
        title: '看板加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const ensureLoginAndLoad = useCallback(async () => {
    if (!checkAuth()) {
      try {
        await wxLogin()
      } catch (error) {
        Taro.showToast({
          title: '登录失败',
          icon: 'none',
        })
        return
      }
    }

    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    ensureLoginAndLoad()
  }, [ensureLoginAndLoad])

  useDidShow(() => {
    if (checkAuth()) {
      loadDashboard()
    }
  })

  const pendingOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['created', 'accepted', 'cooking', 'completed'].includes(order.status),
      ),
    [orders],
  )

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])

  const handleGroupClick = (groupId: number) => {
    Taro.navigateTo({
      url: `/pages/group/index?id=${groupId}`,
    })
  }

  const handleOrderClick = (order: OrderItem) => {
    if (order.id) {
      Taro.navigateTo({
        url: `/pages/task/index?id=${order.id}`,
      })
      return
    }

    Taro.showToast({
      title: '该任务缺少分组信息',
      icon: 'none',
    })
  }

  const handleTaskBoardClick = () => {
    Taro.navigateTo({
      url: '/pages/task-list/index',
    })
  }

  const handleCreateGroup = async () => {
    const result = await Taro.showModal({
      title: '新建分组',
      editable: true,
      placeholderText: '输入一个温柔的分组名',
      confirmText: '创建',
    })

    if (!result.confirm) {
      return
    }

    const name = result.content?.trim()
    if (!name) {
      Taro.showToast({
        title: '请输入分组名',
        icon: 'none',
      })
      return
    }

    try {
      Taro.showLoading({ title: '创建中...' })
      await groupApi.create(name)
      Taro.hideLoading()
      Taro.showToast({
        title: '创建成功',
        icon: 'success',
      })
      loadDashboard()
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '创建失败',
        icon: 'none',
      })
    }
  }

  return (
    <View className='page-shell px-4 py-5'>
      <PageHero
        badge='Princess Order'
        title='今天吃什么，先把节奏理顺'
        description='首页只保留决策入口：先看待推进的任务，再进入你的空间继续发单、接单和协作。'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>待跟进任务</Text>
              <Text className='hero-stat-card__value'>{pendingOrders.length}</Text>
              <Text className='hero-stat-card__hint'>优先处理正在推进中的单</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>我的分组</Text>
              <Text className='hero-stat-card__value'>{groups.length}</Text>
              <Text className='hero-stat-card__hint'>每个分组都是一套协作厨房</Text>
            </View>
          </View>
        }
        actions={
          <Button className='app-button app-button--primary' onClick={handleCreateGroup}>
            新建分组
          </Button>
        }
      />

      <SectionCard
        title='我的任务'
        description='只保留最近的关键任务，避免首页沦为任务列表的缩略版。'
        actions={
          <Button className='app-button app-button--ghost app-button--mini' onClick={handleTaskBoardClick}>
            查看全部
          </Button>
        }
        variant='accent'
      >
        {loading ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : recentOrders.length === 0 ? (
          <EmptyState
            tone='rose'
            title='还没有任务'
            description='去分组里发起第一单，把今天想吃的安排起来。'
          />
        ) : (
          <View>
            {recentOrders.map((order) => {
              const statusMeta = orderStatusMetaMap[order.status]

              return (
                <View
                  key={order.id}
                  className='feature-list-card feature-list-card--rose'
                  onClick={() => handleOrderClick(order)}
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

      <SectionCard
        title='我的分组'
        description='把常用空间做成更明确的入口卡，不再和任务信息长得一样。'
        meta={`${groups.length} 个空间`}
        variant='soft'
      >
        {loading ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : groups.length === 0 ? (
          <EmptyState
            tone='gray'
            title='还没有分组'
            description='先创建一个小空间，成员、菜谱和点餐任务都会围绕它展开。'
          />
        ) : (
          <View>
            {groups.map((group) => (
              <View
                key={group.id}
                className='feature-list-card'
                onClick={() => handleGroupClick(group.id)}
              >
                <View className='flex items-center justify-between'>
                  <View>
                    <Text className='feature-list-card__title'>{group.name}</Text>
                    <Text className='feature-list-card__description'>
                      查看成员、菜谱、邀请方式和点餐入口
                    </Text>
                  </View>
                  <Text className='tool-pill'>进入空间</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </View>
  )
}
