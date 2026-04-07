import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { messageApi, orderApi, userApi } from '../../services/api'

interface UserSummary {
  id: number
  nickname?: string
}

interface OrderDetail {
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
  remark?: string | null
  rejectReason?: string | null
  cancelReason?: string | null
  createdAt?: string
  acceptedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  confirmedAt?: string | null
  recipe?: {
    id: number
    name: string
  }
  group?: {
    id: number
    name: string
  }
  creator?: UserSummary
  assignee?: UserSummary
  events?: Array<{
    id: number
    eventType:
      | 'created'
      | 'accepted'
      | 'rejected'
      | 'started'
      | 'completed'
      | 'confirmed'
      | 'cancelled'
      | 'expired'
    fromStatus?: string | null
    toStatus?: string | null
    payload?: Record<string, any> | null
    createdAt?: string
    operator?: UserSummary
  }>
  notificationLogs?: Array<{
    id: number
    bizType:
      | 'order_created'
      | 'order_accepted'
      | 'order_rejected'
      | 'order_completed'
      | 'order_expired'
    status: 'pending' | 'success' | 'failed'
    templateCode: string
    createdAt?: string
    sentAt?: string | null
    errorMessage?: string | null
  }>
}

const statusLabelMap: Record<OrderDetail['status'], string> = {
  created: '待响应',
  accepted: '已接单',
  rejected: '已拒绝',
  cooking: '制作中',
  completed: '待确认',
  confirmed: '已完成',
  cancelled: '已取消',
  expired: '已超时',
}

const statusToneMap: Record<OrderDetail['status'], string> = {
  created: 'bg-amber-100 text-amber-700',
  accepted: 'bg-sky-100 text-sky-700',
  rejected: 'bg-rose-100 text-rose-700',
  cooking: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-200 text-gray-600',
  expired: 'bg-orange-100 text-orange-700',
}

const eventLabelMap: Record<NonNullable<OrderDetail['events']>[number]['eventType'], string> = {
  created: '创建任务',
  accepted: '接受任务',
  rejected: '拒绝任务',
  started: '开始制作',
  completed: '提交完成',
  confirmed: '确认完成',
  cancelled: '取消任务',
  expired: '任务超时',
}

const notificationTitleMap: Record<
  NonNullable<OrderDetail['notificationLogs']>[number]['bizType'],
  string
> = {
  order_created: '发单通知',
  order_accepted: '接单通知',
  order_rejected: '拒单通知',
  order_completed: '完成通知',
  order_expired: '超时通知',
}

const notificationToneMap: Record<
  NonNullable<OrderDetail['notificationLogs']>[number]['status'],
  string
> = {
  pending: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
}

export default function Task() {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null)

  const orderId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.id || '0')
  }, [])

  const loadTask = useCallback(async () => {
    setLoading(true)
    try {
      const [orderData, profile] = await Promise.all([
        orderApi.getDetail(orderId),
        userApi.getProfile(),
      ])
      setOrder(orderData)
      setCurrentUser(profile)
    } catch (error) {
      Taro.showToast({
        title: '任务加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  const isCreator = order?.creator?.id === currentUser?.id
  const isAssignee = order?.assignee?.id === currentUser?.id

  const promptText = async (title: string, placeholderText: string) => {
    const result = await Taro.showModal({
      title,
      editable: true,
      placeholderText,
      confirmText: '确认',
    })

    if (!result.confirm) {
      return null
    }

    return result.content?.trim() || ''
  }

  const runAction = async (action: () => Promise<any>, successTitle: string) => {
    try {
      setActing(true)
      Taro.showLoading({ title: '处理中...' })
      await action()
      Taro.hideLoading()
      Taro.showToast({
        title: successTitle,
        icon: 'success',
      })
      loadTask()
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '操作失败',
        icon: 'none',
      })
    } finally {
      setActing(false)
    }
  }

  const handleAccept = () => {
    runAction(() => orderApi.accept(orderId), '已接单')
  }

  const handleReject = async () => {
    const reason = await promptText('拒绝任务', '告诉对方这次为什么不能接')
    if (reason === null || !reason) {
      return
    }
    runAction(() => orderApi.reject(orderId, reason), '已拒绝')
  }

  const handleStart = async () => {
    const remark = await promptText('开始制作', '可选填写一句备注')
    if (remark === null) {
      return
    }
    runAction(() => orderApi.start(orderId, remark || undefined), '已开始')
  }

  const handleComplete = async () => {
    const remark = await promptText('完成任务', '例如：已经做好啦')
    if (remark === null) {
      return
    }
    runAction(() => orderApi.complete(orderId, remark || undefined), '已完成')
  }

  const handleConfirm = async () => {
    const remark = await promptText('确认完成', '可选留一句反馈')
    if (remark === null) {
      return
    }
    runAction(() => orderApi.confirm(orderId, remark || undefined), '已确认')
  }

  const handleCancel = async () => {
    const reason = await promptText('取消任务', '可选说明取消原因')
    if (reason === null) {
      return
    }
    runAction(() => orderApi.cancel(orderId, reason || undefined), '已取消')
  }

  const handleRetryNotification = async (logId: number) => {
    try {
      setRetryingLogId(logId)
      Taro.showLoading({ title: '重试中...' })
      await messageApi.retryNotification(logId)
      Taro.hideLoading()
      Taro.showToast({
        title: '已重试',
        icon: 'success',
      })
      loadTask()
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '重试失败',
        icon: 'none',
      })
    } finally {
      setRetryingLogId(null)
    }
  }

  const actionButtons = useMemo(() => {
    if (!order) {
      return []
    }

    const actions: Array<{ key: string; text: string; onClick: () => void; type?: 'primary' | 'default' | 'warn' }> = []

    if (isAssignee && order.status === 'created') {
      actions.push({ key: 'accept', text: '接受', onClick: handleAccept, type: 'primary' })
      actions.push({ key: 'reject', text: '拒绝', onClick: handleReject, type: 'warn' })
    }

    if (isAssignee && order.status === 'accepted') {
      actions.push({ key: 'start', text: '开始制作', onClick: handleStart, type: 'primary' })
    }

    if (isAssignee && ['accepted', 'cooking'].includes(order.status)) {
      actions.push({ key: 'complete', text: '提交完成', onClick: handleComplete, type: 'primary' })
    }

    if (isCreator && order.status === 'completed') {
      actions.push({ key: 'confirm', text: '确认完成', onClick: handleConfirm, type: 'primary' })
    }

    if (isCreator && ['created', 'accepted', 'cooking'].includes(order.status)) {
      actions.push({ key: 'cancel', text: '取消任务', onClick: handleCancel, type: 'warn' })
    }

    return actions
  }, [order, isAssignee, isCreator])

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  if (!order) {
    return <View className='p-5'>任务不存在</View>
  }

  return (
    <View className='min-h-screen bg-sky-50 px-4 py-5 pb-28'>
      <View className='mb-5 rounded-3xl bg-white p-5 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-xl font-bold text-gray-900'>
            {order.recipe?.name || `任务 #${order.id}`}
          </Text>
          <Text className={`rounded-full px-3 py-1 text-xs ${statusToneMap[order.status]}`}>
            {statusLabelMap[order.status]}
          </Text>
        </View>
        <Text className='block text-sm text-gray-600'>
          分组：{order.group?.name || '未命名分组'}
        </Text>
        <Text className='mt-1 block text-sm text-gray-600'>
          发起人：{order.creator?.nickname || '未命名'} / 执行人：
          {order.assignee?.nickname || '未命名'}
        </Text>
        {order.remark ? (
          <View className='mt-4 rounded-2xl bg-sky-50 px-4 py-3'>
            <Text className='block text-xs uppercase tracking-wider text-sky-700'>
              备注
            </Text>
            <Text className='mt-2 block text-sm leading-6 text-gray-700'>
              {order.remark}
            </Text>
          </View>
        ) : null}
        {order.rejectReason ? (
          <View className='mt-4 rounded-2xl bg-rose-50 px-4 py-3'>
            <Text className='block text-xs uppercase tracking-wider text-rose-700'>
              拒绝原因
            </Text>
            <Text className='mt-2 block text-sm leading-6 text-gray-700'>
              {order.rejectReason}
            </Text>
          </View>
        ) : null}
        {order.cancelReason ? (
          <View className='mt-4 rounded-2xl bg-gray-100 px-4 py-3'>
            <Text className='block text-xs uppercase tracking-wider text-gray-600'>
              取消原因
            </Text>
            <Text className='mt-2 block text-sm leading-6 text-gray-700'>
              {order.cancelReason}
            </Text>
          </View>
        ) : null}
      </View>

      <View className='rounded-3xl bg-white p-4 shadow-sm'>
        <Text className='mb-3 block text-lg font-semibold text-gray-900'>任务时间线</Text>
        {order.events && order.events.length > 0 ? (
          <View>
            {order.events.map((event) => (
              <View key={event.id} className='mb-3 rounded-2xl bg-gray-50 px-4 py-3'>
                <View className='flex items-center justify-between'>
                  <Text className='text-sm font-medium text-gray-900'>
                    {eventLabelMap[event.eventType]}
                  </Text>
                  <Text className='text-xs text-gray-500'>
                    {event.createdAt || '暂无'}
                  </Text>
                </View>
                <Text className='mt-1 block text-xs text-gray-500'>
                  操作人：{event.operator?.nickname || '系统'}
                </Text>
                {event.fromStatus || event.toStatus ? (
                  <Text className='mt-1 block text-xs text-gray-500'>
                    状态：{event.fromStatus || '无'} → {event.toStatus || '无'}
                  </Text>
                ) : null}
                {event.payload?.remark ? (
                  <Text className='mt-2 block text-sm text-gray-700'>
                    备注：{event.payload.remark}
                  </Text>
                ) : null}
                {event.payload?.reason ? (
                  <Text className='mt-2 block text-sm text-gray-700'>
                    原因：{event.payload.reason}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View className='rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500'>
            暂无事件记录。
          </View>
        )}
      </View>

      <View className='mt-5 rounded-3xl bg-white p-4 shadow-sm'>
        <Text className='mb-3 block text-lg font-semibold text-gray-900'>通知记录</Text>
        {order.notificationLogs && order.notificationLogs.length > 0 ? (
          <View>
            {order.notificationLogs.map((log) => (
              <View key={log.id} className='mb-3 rounded-2xl bg-gray-50 px-4 py-3'>
                <View className='flex items-center justify-between'>
                  <Text className='text-sm font-medium text-gray-900'>
                    {notificationTitleMap[log.bizType]}
                  </Text>
                  <Text
                    className={`rounded-full px-2 py-1 text-xs ${notificationToneMap[log.status]}`}
                  >
                    {log.status}
                  </Text>
                </View>
                <Text className='mt-1 block text-xs text-gray-500'>
                  模板：{log.templateCode}
                </Text>
                <Text className='mt-1 block text-xs text-gray-500'>
                  创建：{log.createdAt || '暂无'} / 发送：{log.sentAt || '未发送'}
                </Text>
                {log.errorMessage ? (
                  <Text className='mt-2 block text-sm text-rose-500'>
                    错误：{log.errorMessage}
                  </Text>
                ) : null}
                {log.status === 'failed' ? (
                  <View className='mt-3'>
                    <Button
                      size='mini'
                      disabled={retryingLogId === log.id}
                      onClick={() => handleRetryNotification(log.id)}
                    >
                      {retryingLogId === log.id ? '重试中...' : '重试通知'}
                    </Button>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View className='rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500'>
            这笔任务还没有通知记录。
          </View>
        )}
      </View>

      {actionButtons.length > 0 ? (
      <View className='fixed bottom-0 left-0 right-0 bg-white px-5 py-4 shadow-lg'>
          <View>
            {actionButtons.map((action) => (
              <Button
                key={action.key}
                type={action.type || 'default'}
                disabled={acting}
                onClick={action.onClick}
              >
                {action.text}
              </Button>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}
