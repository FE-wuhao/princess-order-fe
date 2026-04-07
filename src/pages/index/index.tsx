import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { groupApi, orderApi } from '../../services/api'
import { checkAuth, wxLogin } from '../../utils/auth'

interface GroupItem {
  id: number
  name: string
}

interface OrderItem {
  id: number
  status:
    | 'created'
    | 'accepted'
    | 'rejected'
    | 'cooking'
    | 'completed'
    | 'confirmed'
    | 'cancelled'
    | 'expired'
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

const statusLabelMap: Record<OrderItem['status'], string> = {
  created: '待响应',
  accepted: '已接单',
  rejected: '已拒绝',
  cooking: '制作中',
  completed: '待确认',
  confirmed: '已完成',
  cancelled: '已取消',
  expired: '已超时',
}

const statusToneMap: Record<OrderItem['status'], string> = {
  created: 'bg-amber-100 text-amber-700',
  accepted: 'bg-sky-100 text-sky-700',
  rejected: 'bg-rose-100 text-rose-700',
  cooking: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
  expired: 'bg-orange-100 text-orange-700',
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
    <View className='min-h-screen bg-rose-50 px-4 py-5'>
      <View className='mb-5 rounded-3xl bg-gradient-to-br from-rose-200 via-pink-100 to-amber-100 p-5 shadow-sm'>
        <Text className='block text-xs uppercase tracking-widest text-rose-700'>
          Princess Order
        </Text>
        <Text className='mt-2 block text-2xl font-bold text-gray-900'>
          今日点餐看板
        </Text>
        <Text className='mt-2 block text-sm leading-6 text-gray-700'>
          先看正在推进的任务，再进入你的分组和菜谱。
        </Text>
          <View className='mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3'>
          <View>
            <Text className='block text-xs text-gray-500'>待跟进任务</Text>
            <Text className='block text-xl font-semibold text-gray-900'>
              {pendingOrders.length}
            </Text>
          </View>
          <Button size='mini' type='primary' onClick={handleCreateGroup}>
            新建分组
          </Button>
        </View>
      </View>

      <View className='mb-5 rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>我的任务</Text>
          <Text className='text-xs text-sky-600' onClick={handleTaskBoardClick}>
            查看全部
          </Text>
        </View>

        {loading ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : recentOrders.length === 0 ? (
          <View className='rounded-2xl bg-rose-50 px-4 py-6 text-center text-sm text-gray-500'>
            还没有任务，去分组里发起第一单吧。
          </View>
        ) : (
          <View>
            {recentOrders.map((order) => (
              <View
                key={order.id}
                  className='mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3'
                onClick={() => handleOrderClick(order)}
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

      <View className='rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>我的分组</Text>
          <Text className='text-xs text-gray-500'>{groups.length} 个空间</Text>
        </View>

        {loading ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : groups.length === 0 ? (
          <View className='rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500'>
            还没有分组，先创建一个小空间吧。
          </View>
        ) : (
          <View>
            {groups.map((group) => (
              <View
                key={group.id}
                className='mb-3 flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-4'
                onClick={() => handleGroupClick(group.id)}
              >
                <View>
                  <Text className='block text-base font-medium text-gray-900'>
                    {group.name}
                  </Text>
                  <Text className='mt-1 block text-xs text-gray-500'>
                    点击查看成员、菜谱和点餐入口
                  </Text>
                </View>
                <Text className='text-lg text-gray-400'>›</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
