import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import InputDialog from '@/components/input-dialog'
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
import { requestAssigneeOrderSubscriptions } from '@/utils/subscribe-message'
import type { User } from '@shared/types'
import './index.scss'

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
  recipeSnapshot?: {
    recipeName?: string
    description?: string | null
    ingredientsJson?: Array<{ name: string; amount: string; unit: string }>
    stepsJson?: Array<{ content: string; source: string }>
  } | null
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

interface PromptDialogState {
  visible: boolean
  title: string
  placeholder: string
  value: string
}

const taskStageMap: Record<
  TaskStatus,
  {
    title: string
    description: string
    next: string
    cardTone: 'warning' | 'info' | 'accent' | 'success' | 'danger' | 'neutral'
  }
> = {
  created: {
    title: '等待接单响应',
    description: '先看菜谱和步骤，再决定是否接受这次制作任务。',
    next: '下一步：接受任务或说明拒绝原因',
    cardTone: 'warning',
  },
  accepted: {
    title: '已接单，准备开做',
    description: '任务已经进入执行阶段，先备齐食材，再开始制作。',
    next: '下一步：开始制作',
    cardTone: 'info',
  },
  cooking: {
    title: '正在制作中',
    description: '页面已切换到执行台，按步骤推进并在完成后提交。',
    next: '下一步：提交完成',
    cardTone: 'accent',
  },
  completed: {
    title: '已提交，等待确认',
    description: '制作人已提交完成，等待发起人确认这次任务。',
    next: '下一步：确认完成',
    cardTone: 'success',
  },
  confirmed: {
    title: '任务已完成',
    description: '本次制作已经闭环，后续可以查看完整流转记录。',
    next: '已归档',
    cardTone: 'success',
  },
  rejected: {
    title: '任务已拒绝',
    description: '执行人没有接受这次任务，拒绝原因会保留在记录里。',
    next: '无需继续处理',
    cardTone: 'danger',
  },
  cancelled: {
    title: '任务已取消',
    description: '这次任务已经停止，取消原因会保留在记录里。',
    next: '无需继续处理',
    cardTone: 'neutral',
  },
  expired: {
    title: '任务已超时',
    description: '任务在有效时间内没有完成响应或流转。',
    next: '无需继续处理',
    cardTone: 'danger',
  },
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
  const [showRecipeDetail, setShowRecipeDetail] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>({
    visible: false,
    title: '',
    placeholder: '',
    value: '',
  })
  const promptResolverRef = useRef<((value: string | null) => void) | null>(null)

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

  const closePromptDialog = (value: string | null) => {
    promptResolverRef.current?.(value)
    promptResolverRef.current = null
    setPromptDialog({
      visible: false,
      title: '',
      placeholder: '',
      value: '',
    })
  }

  const promptText = (title: string, placeholder: string) => new Promise<string | null>((resolve) => {
    promptResolverRef.current = resolve
    setPromptDialog({
      visible: true,
      title,
      placeholder,
      value: '',
    })
  })

  const handlePromptCancel = () => {
    closePromptDialog(null)
  }

  const handlePromptConfirm = () => {
    closePromptDialog(promptDialog.value.trim())
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
    runAction(
      'accept',
      async () => {
        await requestAssigneeOrderSubscriptions()
        return taskApi.accept(taskId)
      },
      '已接任务',
    )
  }

  const handleReject = async () => {
    const reason = await promptText('拒绝任务', '告诉对方这次为什么不能接')
    if (reason === null || !reason) return
    runAction(
      'reject',
      async () => {
        await requestAssigneeOrderSubscriptions()
        return taskApi.reject(taskId, reason)
      },
      '已拒绝',
    )
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
      async () => {
        await requestAssigneeOrderSubscriptions()
        return taskApi.complete(taskId, remark || undefined)
      },
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
    if (isAssignee && task.status === 'cooking') {
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
      <Page title='任务详情' tone='sky' topSpacerMode='header'>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Page>
    )
  }

  if (!task) {
    return (
      <Page title='任务详情' tone='sky' topSpacerMode='header'>
        <EmptyState tone='gray' title='任务不存在' description='该任务可能已被删除。' />
      </Page>
    )
  }

  const orderStatusMeta = orderStatusMetaMap[task.status]
  const taskStage = taskStageMap[task.status]
  const taskTitle = task.recipeSnapshot?.recipeName || task.recipe?.name || `任务 #${task.id}`
  const workspaceName = task.workspace?.name || '未命名空间'
  const ingredients = task.recipeSnapshot?.ingredientsJson || []
  const steps = task.recipeSnapshot?.stepsJson || []
  const latestEvent = task.events?.[0]
  const recipeCountText = [
    ingredients.length ? `${ingredients.length} 个食材` : '',
    steps.length ? `${steps.length} 个步骤` : '',
  ].filter(Boolean).join(' · ')
  const shouldShowFullRecipe = task.status === 'created' || showRecipeDetail
  const shouldShowExecutionRecipe = !showRecipeDetail && ['accepted', 'cooking'].includes(task.status)
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
      tone='sky'
      topSpacerMode='header'
      footer={footer}
    >
      <View className={`task-status-card task-status-card--${taskStage.cardTone}`}>
        <View className='task-status-card__header'>
          <View className='task-status-card__title-group'>
            <Text className='task-status-card__eyebrow'>{taskTitle}</Text>
            <Text className='task-status-card__title'>{taskStage.title}</Text>
          </View>
          <StatusChip label={orderStatusMeta.label} tone={orderStatusMeta.tone} size='md' />
        </View>
        <Text className='task-status-card__description'>{taskStage.description}</Text>
        <View className='task-status-card__meta-row'>
          <Text className='task-status-card__meta'>
            {task.creator?.nickname || '未命名'} → {task.assignee?.nickname || '待指派'}
          </Text>
          <Text className='task-status-card__meta'>{workspaceName}</Text>
        </View>
        <View className='task-status-card__next'>
          <Text className='task-status-card__next-label'>当前提示</Text>
          <Text className='task-status-card__next-text'>{taskStage.next}</Text>
        </View>
        {latestEvent ? (
          <View className='task-status-card__event'>
            <Text className='task-status-card__event-label'>最新动态</Text>
            <Text className='task-status-card__event-text'>
              {eventLabelMap[latestEvent.eventType] || latestEvent.eventType}
              {latestEvent.operator?.nickname ? ` · ${latestEvent.operator.nickname}` : ''}
              {latestEvent.createdAt ? ` · ${latestEvent.createdAt}` : ''}
            </Text>
          </View>
        ) : null}
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

      {ingredients.length || steps.length ? (
        <SectionCard
          title={shouldShowExecutionRecipe ? '制作执行台' : '制作内容'}
          description={
            shouldShowExecutionRecipe
              ? '食材先压缩成备料摘要，步骤按执行顺序推进。'
              : undefined
          }
          meta={recipeCountText || undefined}
          variant={shouldShowExecutionRecipe ? 'accent' : 'soft'}
          actions={
            task.status !== 'created' ? (
              <Text
                className='form-text-link'
                onClick={() => setShowRecipeDetail((value) => !value)}
              >
                {showRecipeDetail ? '收起详情' : '查看详情'}
              </Text>
            ) : null
          }
        >
          {shouldShowExecutionRecipe ? (
            <View>
              {ingredients.length ? (
                <View className='task-recipe-summary'>
                  <Text className='task-recipe-summary__label'>备料摘要</Text>
                  <Text className='task-recipe-summary__text'>
                    {ingredients
                      .map((ing) => `${ing.name}${[ing.amount, ing.unit].filter(Boolean).join('') || ''}`)
                      .join('、')}
                  </Text>
                </View>
              ) : null}
              {steps.length ? (
                <View className={ingredients.length ? 'task-step-list task-step-list--spaced' : 'task-step-list'}>
                  {steps.map((step, idx) => (
                    <View
                      key={idx}
                      className={`task-step-card ${
                        task.status === 'cooking' && idx === 0 ? 'task-step-card--active' : ''
                      }`}
                    >
                      <Text className='task-step-card__index'>{idx + 1}</Text>
                      <Text className='task-step-card__text'>{step.content}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          {shouldShowFullRecipe ? (
            <View>
              {ingredients.length ? (
                <View className='recipe-detail-ingredient-cloud'>
                  {ingredients.map((ing, idx) => (
                    <View key={idx} className='recipe-detail-ingredient-chip'>
                      <Text className='recipe-detail-ingredient-chip__name'>{ing.name}</Text>
                      <Text className='recipe-detail-ingredient-chip__amount'>
                        {[ing.amount, ing.unit].filter(Boolean).join(' ') || '适量'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {steps.length ? (
                <View className={ingredients.length ? 'mt-3' : ''}>
                  {steps.map((step, idx) => (
                    <View key={idx} className='feature-list-card feature-list-card--rose'>
                      <View className='flex items-start justify-between gap-2'>
                        <Text className='tool-pill'>{idx + 1}</Text>
                        <Text className='feature-list-card__description flex-1'>{step.content}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          {!shouldShowExecutionRecipe && !shouldShowFullRecipe ? (
            <View className='task-recipe-summary'>
              <Text className='task-recipe-summary__label'>内容已收起</Text>
              <Text className='task-recipe-summary__text'>点「查看详情」展开食材和完整制作步骤。</Text>
            </View>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title='任务时间线'
        meta={task.events?.length ? `${task.events.length} 条` : undefined}
        actions={
          <Text
            className='form-text-link'
            onClick={() => setShowTimeline((v) => !v)}
          >
            {showTimeline ? '收起' : '展开'}
          </Text>
        }
      >
        {showTimeline ? (
          task.events && task.events.length > 0 ? (
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
            <EmptyState tone='sky' title='暂无事件记录' description='任务流转后这里会自动补齐。' />
          )
        ) : (
          <Text className='block text-sm text-gray-500'>点「展开」查看完整流转记录。</Text>
        )}
      </SectionCard>

      {/* 通知记录 — 默认折叠 */}
      <SectionCard
        title='通知记录'
        meta={task.notificationLogs?.length ? `${task.notificationLogs.length} 条` : undefined}
        variant='soft'
        actions={
          <Text
            className='form-text-link'
            onClick={() => setShowNotifications((v) => !v)}
          >
            {showNotifications ? '收起' : '展开'}
          </Text>
        }
      >
        {showNotifications ? (
          task.notificationLogs && task.notificationLogs.length > 0 ? (
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
                  <Text className='mt-1 block text-xs text-gray-500'>
                    发送：{log.sentAt || '未发送'}
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
            <EmptyState tone='gray' title='还没有通知记录' description='任务相关通知会在这里出现。' />
          )
        ) : (
          <Text className='block text-sm text-gray-500'>点「展开」查看发送状态与异常。</Text>
        )}
      </SectionCard>

      <InputDialog
        visible={promptDialog.visible}
        title={promptDialog.title}
        value={promptDialog.value}
        placeholder={promptDialog.placeholder}
        confirmText='确认'
        maxLength={120}
        onChange={(value) => setPromptDialog((current) => ({ ...current, value }))}
        onCancel={handlePromptCancel}
        onConfirm={handlePromptConfirm}
      />
    </Page>
  )
}
