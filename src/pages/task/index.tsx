import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import {
  NotificationStatus,
  notificationStatusMetaMap,
  notificationTitleMap,
  orderStatusMetaMap,
} from '@/constants/ui'
import { messageApi, taskApi, userApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/router'
import type { User } from '@shared/types'

type TaskStatus =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'cooking'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'expired'

interface TaskDetail {
  id: number
  status: TaskStatus
  remark?: string | null
  rejectReason?: string | null
  cancelReason?: string | null
  recipe?: { id: number; name: string }
  recipeSnapshot?: { recipeName?: string } | null
  workspace?: { id: number; name: string } | null
  creator?: Pick<User, 'id' | 'nickname'>
  assignee?: Pick<User, 'id' | 'nickname'>
  events?: Array<{
    id: number
    eventType: string
    fromStatus?: string | null
    toStatus?: string | null
    payload?: Record<string, unknown> | null
    createdAt?: string
    operator?: Pick<User, 'id' | 'nickname'>
  }>
  notificationLogs?: Array<{
    id: number
    bizType: string
    status: 'pending' | 'success' | 'failed'
    templateCode: string
    createdAt?: string
    sentAt?: string | null
    errorMessage?: string | null
  }>
}

const eventLabelMap: Record<string, string> = {
  created: '创建任务',
  accepted: '接受任务',
  rejected: '拒绝任务',
  started: '开始制作',
  completed: '提交完成',
  confirmed: '确认完成',
  cancelled: '取消任务',
  expired: '任务超时',
}

/** 状态流转映射：操作 → 预期的新状态（用于乐观更新） */
const optimisticStatusMap: Record<string, TaskStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  start: 'cooking',
  complete: 'completed',
  confirm: 'confirmed',
  cancel: 'cancelled',
}

export default function Task() {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [currentUser, setCurrentUser] = useState<Pick<User, 'id' | 'nickname'> | null>(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null)

  const router = useRouter()
  const taskId = getRouteNumberParam(router.params, 'id')

  const loadTask = useCallback(async () => {
    if (!taskId) return

    setLoading(true)
    try {
      const [taskData, profile] = await Promise.all([
        taskApi.getDetail(taskId),
        userApi.getProfile(),
      ])
      setTask(taskData)
      setCurrentUser(profile)
    } catch (error) {
      showErrorToast(error, '任务加载失败')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  const isCreator = task?.creator?.id === currentUser?.id
  const isAssignee = task?.assignee?.id === currentUser?.id

  const promptText = async (title: string, placeholderText: string) => {
    const result = await Taro.showModal({
      title,
      editable: true,
      placeholderText,
      confirmText: '确认',
    })
    if (!result.confirm) return null
    return result.content?.trim() || ''
  }

  /**
   * 执行任务操作，支持乐观更新
   * @param actionKey - 操作标识（用于乐观状态映射）
   * @param action - 异步 API 调用
   * @param successTitle - 成功提示
   */
  const runAction = async (
    actionKey: string,
    action: () => Promise<unknown>,
    successTitle: string,
  ) => {
    try {
      setActing(true)

      // ── 乐观更新：立即更新本地状态 ──
      const newStatus = optimisticStatusMap[actionKey]
      if (newStatus) {
        setTask((prev) => (prev ? { ...prev, status: newStatus } : prev))
      }

      Taro.showLoading({ title: '处理中...' })
      await action()
      Taro.hideLoading()
      Taro.showToast({ title: successTitle, icon: 'success' })
      // 操作成功后重新获取最新数据
      loadTask()
    } catch (error) {
      Taro.hideLoading()
      // ── 乐观更新回滚：重新加载真实数据 ──
      loadTask()
      showErrorToast(error, '操作失败')
    } finally {
      setActing(false)
    }
  }

  const handleAccept = () => {
    runAction('accept', () => taskApi.accept(taskId), '已接任务')
  }

  const handleReject = async () => {
    const reason = await promptText('拒绝任务', '告诉对方这次为什么不能接')
    if (reason === null || !reason) return
    runAction('reject', () => taskApi.reject(taskId, reason), '已拒绝')
  }

  const handleStart = async () => {
    const remark = await promptText('开始制作', '可选填写一句备注')
    if (remark === null) return
    runAction('start', () => taskApi.start(taskId, remark || undefined), '已开始')
  }

  const handleComplete = async () => {
    const remark = await promptText('完成任务', '例如：已经做好啦')
    if (remark === null) return
    runAction(
      'complete',
      () => taskApi.complete(taskId, remark || undefined),
      '已完成',
    )
  }

  const handleConfirm = async () => {
    const remark = await promptText('确认完成', '可选留一句反馈')
    if (remark === null) return
    runAction(
      'confirm',
      () => taskApi.confirm(taskId, remark || undefined),
      '已确认',
    )
  }

  const handleCancel = async () => {
    const reason = await promptText('取消任务', '可选说明取消原因')
    if (reason === null) return
    runAction(
      'cancel',
      () => taskApi.cancel(taskId, reason || undefined),
      '已取消',
    )
  }

  const handleRetryNotification = async (logId: number) => {
    try {
      setRetryingLogId(logId)
      Taro.showLoading({ title: '重试中...' })
      await messageApi.retryNotification(logId)
      Taro.hideLoading()
      Taro.showToast({ title: '已重试', icon: 'success' })
      loadTask()
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '重试失败')
    } finally {
      setRetryingLogId(null)
    }
  }

  const actionButtons = useMemo(() => {
    if (!task) return []

    const actions: Array<{
      key: string
      text: string
      onClick: () => void
      type?: 'primary' | 'default' | 'warn'
    }> = []

    if (isAssignee && task.status === 'created') {
      actions.push({ key: 'accept', text: '接受', onClick: handleAccept, type: 'primary' })
      actions.push({ key: 'reject', text: '拒绝', onClick: handleReject, type: 'warn' })
    }
    if (isAssignee && task.status === 'accepted') {
      actions.push({ key: 'start', text: '开始制作', onClick: handleStart, type: 'primary' })
    }
    if (isAssignee && ['accepted', 'cooking'].includes(task.status)) {
      actions.push({ key: 'complete', text: '提交完成', onClick: handleComplete, type: 'primary' })
    }
    if (isCreator && task.status === 'completed') {
      actions.push({ key: 'confirm', text: '确认完成', onClick: handleConfirm, type: 'primary' })
    }
    if (isCreator && ['created', 'accepted', 'cooking'].includes(task.status)) {
      actions.push({ key: 'cancel', text: '取消任务', onClick: handleCancel, type: 'warn' })
    }

    return actions
  }, [task, isAssignee, isCreator])

  if (loading) {
    return (
      <Page title='任务详情' tone='sky'>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Page>
    )
  }

  if (!task) {
    return (
      <Page title='任务详情' tone='sky'>
        <EmptyState tone='gray' title='任务不存在' description='该任务可能已被删除。' />
      </Page>
    )
  }

  const orderStatusMeta = orderStatusMetaMap[task.status]
  const taskTitle = task.recipeSnapshot?.recipeName || task.recipe?.name || `任务 #${task.id}`
  const workspaceName = task.workspace?.name || '未命名空间'
  const footer = actionButtons.length > 0 ? (
    <View className='action-stack'>
      {actionButtons.map((action) => (
        <Button
          key={action.key}
          className={`app-button ${
            action.type === 'primary'
              ? 'app-button--primary'
              : action.type === 'warn'
              ? 'app-button--warn'
              : 'app-button--ghost'
          }`}
          disabled={acting}
          onClick={action.onClick}
        >
          {action.text}
        </Button>
      ))}
    </View>
  ) : null

  return (
    <Page
      title='任务详情'
      description='任务状态、时间线和通知记录都在这里。'
      tone='sky'
      footer={footer}
    >
      <View className='section-card section-card--accent'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-xl font-bold text-gray-900'>{taskTitle}</Text>
          <StatusChip label={orderStatusMeta.label} tone={orderStatusMeta.tone} size='md' />
        </View>
        <Text className='block text-sm text-gray-600'>空间：{workspaceName}</Text>
        <Text className='mt-1 block text-sm text-gray-600'>
          发起人：{task.creator?.nickname || '未命名'} / 执行人：
          {task.assignee?.nickname || '未命名'}
        </Text>
        {task.remark ? (
          <View className='mt-4 rounded-2xl bg-sky-50 px-4 py-3'>
            <Text className='block text-xs uppercase tracking-wider text-sky-700'>备注</Text>
            <Text className='mt-2 block text-sm leading-6 text-gray-700'>{task.remark}</Text>
          </View>
        ) : null}
        {task.rejectReason ? (
          <View className='mt-4 rounded-2xl bg-rose-50 px-4 py-3'>
            <Text className='block text-xs uppercase tracking-wider text-rose-700'>拒绝原因</Text>
            <Text className='mt-2 block text-sm leading-6 text-gray-700'>{task.rejectReason}</Text>
          </View>
        ) : null}
        {task.cancelReason ? (
          <View className='mt-4 rounded-2xl bg-gray-100 px-4 py-3'>
            <Text className='block text-xs uppercase tracking-wider text-gray-600'>取消原因</Text>
            <Text className='mt-2 block text-sm leading-6 text-gray-700'>{task.cancelReason}</Text>
          </View>
        ) : null}
      </View>

      <SectionCard
        title='任务时间线'
        description='把关键动作和备注按顺序收好，方便快速回顾整笔任务。'
      >
        {task.events && task.events.length > 0 ? (
          <View>
            {task.events.map((event) => (
              <View key={event.id} className='feature-list-card feature-list-card--sky'>
                <View className='flex items-center justify-between'>
                  <Text className='text-sm font-medium text-gray-900'>
                    {eventLabelMap[event.eventType] || event.eventType}
                  </Text>
                  <Text className='text-xs text-gray-500'>{event.createdAt || '暂无'}</Text>
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
                    备注：{String(event.payload.remark)}
                  </Text>
                ) : null}
                {event.payload?.reason ? (
                  <Text className='mt-2 block text-sm text-gray-700'>
                    原因：{String(event.payload.reason)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='sky'
            title='暂无事件记录'
            description='任务时间线会在有人接任务、开始制作、完成或确认后自动补齐。'
          />
        )}
      </SectionCard>

      <SectionCard
        title='通知记录'
        description='系统通知的发送状态、模板和异常信息都在这里查看。'
        variant='soft'
      >
        {task.notificationLogs && task.notificationLogs.length > 0 ? (
          <View>
            {task.notificationLogs.map((log) => (
              <View key={log.id} className='feature-list-card'>
                <View className='flex items-center justify-between'>
                  <Text className='text-sm font-medium text-gray-900'>
                    {notificationTitleMap[log.bizType]}
                  </Text>
                  <StatusChip
                    label={notificationStatusMetaMap[log.status as NotificationStatus].label}
                    tone={notificationStatusMetaMap[log.status as NotificationStatus].tone}
                  />
                </View>
                <Text className='mt-1 block text-xs text-gray-500'>模板：{log.templateCode}</Text>
                <Text className='mt-1 block text-xs text-gray-500'>
                  创建：{log.createdAt || '暂无'} / 发送：{log.sentAt || '未发送'}
                </Text>
                {log.errorMessage ? (
                  <Text className='mt-2 block text-sm text-rose-500'>错误：{log.errorMessage}</Text>
                ) : null}
                {log.status === 'failed' ? (
                  <View className='mt-3'>
                    <Button
                      className='app-button app-button--warn app-button--mini'
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
          <EmptyState
            tone='gray'
            title='还没有通知记录'
            description='当系统尝试发送发任务、接任务、完成或超时通知时，这里会自动出现记录。'
          />
        )}
      </SectionCard>
    </Page>
  )
}
