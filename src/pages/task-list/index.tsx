import { useCallback, useEffect, useMemo } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
import PageHero from '@/components/page-hero'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import { orderStatusMetaMap } from '@/constants/ui'
import { useTaskStore } from '@/stores/useTaskStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { redirectToWorkspaceEntry } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'
import type { OrderStatus, TaskStatus } from '@shared/types'

const boardDefinitions: Array<{
  key: string
  title: string
  description: string
  statuses: TaskStatus[]
  variant: 'warning' | 'info' | 'success' | 'neutral'
  emptyTone: 'amber' | 'sky' | 'rose' | 'gray'
}> = [
  {
    key: 'waiting',
    title: '待响应',
    description: '刚发出的任务和刚接住的任务，都在这里盯进度。',
    statuses: ['created', 'accepted'],
    variant: 'warning',
    emptyTone: 'amber',
  },
  {
    key: 'cooking',
    title: '制作中',
    description: '已经开做的任务，适合随时进去推进或补一句进度。',
    statuses: ['cooking'],
    variant: 'info',
    emptyTone: 'sky',
  },
  {
    key: 'confirming',
    title: '待确认',
    description: '菜已完成，等发起人最后确认。',
    statuses: ['completed'],
    variant: 'success',
    emptyTone: 'rose',
  },
  {
    key: 'history',
    title: '已结束',
    description: '完成、取消、拒绝和超时的历史记录。',
    statuses: ['confirmed', 'cancelled', 'rejected', 'expired'],
    variant: 'neutral',
    emptyTone: 'gray',
  },
]

const taskCardToneClassMap: Record<string, string> = {
  created: 'feature-list-card--warning',
  accepted: 'feature-list-card--info',
  rejected: 'feature-list-card--danger',
  cooking: 'feature-list-card--accent',
  completed: 'feature-list-card--success',
  confirmed: 'feature-list-card--success',
  cancelled: 'feature-list-card--neutral',
  expired: 'feature-list-card--danger',
}

export default function TaskList() {
  const tasks = useTaskStore((s) => s.tasks)
  const tasksLoading = useTaskStore((s) => s.tasksMeta.loading)
  const refreshTasks = useTaskStore((s) => s.refreshTasks)
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const loading = useWorkspaceStore((s) => s.loading)
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

  const loadData = useCallback(async () => {
    try {
      const wsList = await loadWorkspaces()
      // loadWorkspaces 返回 void，需要手动检查
      const currentWorkspaces = useWorkspaceStore.getState().workspaces
      if (currentWorkspaces.length === 0) {
        redirectToWorkspaceEntry()
        return
      }
      await refreshTasks({ mine: true })
    } catch (error) {
      showErrorToast(error, '任务列表加载失败')
    }
  }, [loadWorkspaces, refreshTasks])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    // 缓存有效则跳过
    refreshTasks({ mine: true }, true)
  })

  const boardSections = useMemo(
    () =>
      boardDefinitions.map((board) => ({
        ...board,
        tasks: tasks.filter((task) => board.statuses.includes(task.status as TaskStatus)),
      })),
    [tasks],
  )

  const pendingCount = useMemo(
    () =>
      tasks.filter((task) =>
        (['created', 'accepted', 'cooking', 'completed'] as TaskStatus[]).includes(
          task.status as TaskStatus,
        ),
      ).length,
    [tasks],
  )

  const handleTaskClick = (taskId: number) => {
    Taro.navigateTo({ url: `/pages/task/index?id=${taskId}` })
  }

  return (
    <Page title='任务面板' tone='sky'>
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
              <Text className='hero-stat-card__value'>{tasks.length}</Text>
              <Text className='hero-stat-card__hint'>所有历史任务都在这里收口</Text>
            </View>
          </View>
        }
        actions={
          <Button className='app-button app-button--ghost' onClick={() => refreshTasks({ mine: true }, true)}>
            刷新任务列表
          </Button>
        }
      />

      <AsyncContainer
        loading={tasksLoading && tasks.length === 0}
        data={boardSections}
        skeleton={
          <SectionCard title='任务看板' description='正在同步最新任务状态。'>
            <View><SkeletonCard /><SkeletonCard /></View>
          </SectionCard>
        }
      >
        {(sections) => (
          <View>
            {sections.map((section) => (
              <SectionCard
                key={section.key}
                title={section.title}
                description={section.description}
                meta={`${section.tasks.length} 条`}
                variant={section.variant}
              >
                {section.tasks.length === 0 ? (
                  <EmptyState
                    tone={section.emptyTone}
                    title='这一栏现在是空的'
                    description='状态分栏会自动归档，空出来说明这一阶段没有待处理任务。'
                  />
                ) : (
                  <View>
                    {section.tasks.map((task) => {
                      const statusMeta = orderStatusMetaMap[task.status as OrderStatus]
                      const workspaceName = (task as { workspace?: { name?: string } }).workspace?.name || '未命名空间'

                      return (
                        <Pressable key={task.id} onClick={() => handleTaskClick(task.id)}>
                          <View className={`task-card task-card--${statusMeta.tone}`}>
                            <View className='task-card__bar' />
                            <View className='task-card__body'>
                              <View className='task-card__header'>
                                <Text className='task-card__title'>
                                  {task.recipe?.name || `任务 #${task.id}`}
                                </Text>
                                <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                              </View>
                              <Text className='task-card__meta'>
                                {task.creator?.nickname || '未知'} → {task.assignee?.nickname || '待指派'}
                                {workspaceName ? ` · ${workspaceName}` : ''}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
              </SectionCard>
            ))}
          </View>
        )}
      </AsyncContainer>
    </Page>
  )
}
