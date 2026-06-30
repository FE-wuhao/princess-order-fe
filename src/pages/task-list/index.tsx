import { useCallback, useEffect, useMemo } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
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
  statuses: TaskStatus[]
  variant: 'warning' | 'info' | 'success' | 'neutral'
  emptyTone: 'amber' | 'sky' | 'rose' | 'gray'
}> = [
  {
    key: 'waiting',
    title: '待响应',
    statuses: ['created', 'accepted'],
    variant: 'warning',
    emptyTone: 'amber',
  },
  {
    key: 'cooking',
    title: '制作中',
    statuses: ['cooking'],
    variant: 'info',
    emptyTone: 'sky',
  },
  {
    key: 'confirming',
    title: '待确认',
    statuses: ['completed'],
    variant: 'success',
    emptyTone: 'rose',
  },
  {
    key: 'history',
    title: '已结束',
    statuses: ['confirmed', 'cancelled', 'rejected', 'expired'],
    variant: 'neutral',
    emptyTone: 'gray',
  },
]

export default function TaskList() {
  const tasks = useTaskStore((s) => s.tasks)
  const tasksLoading = useTaskStore((s) => s.tasksMeta.loading)
  const refreshTasks = useTaskStore((s) => s.refreshTasks)
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

  const loadData = useCallback(async () => {
    try {
      await loadWorkspaces()
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

  const nonEmptySections = boardSections.filter((s) => s.tasks.length > 0)

  return (
    <Page title='任务面板' tone='sky' topSpacerMode='header'>
      <View className='page-toolbar'>
        <View className='page-toolbar__main'>
          <Text className='page-toolbar__title'>任务面板</Text>
          <Text className='page-toolbar__subtitle'>
            待跟进 {pendingCount} · 共 {tasks.length}
          </Text>
        </View>
        <Button
          className='app-button app-button--ghost app-button--mini'
          onClick={() => refreshTasks({ mine: true }, true)}
        >
          刷新
        </Button>
      </View>

      <AsyncContainer
        loading={tasksLoading && tasks.length === 0}
        data={nonEmptySections}
        skeleton={
          <View><SkeletonCard /><SkeletonCard /></View>
        }
      >
        {(sections) => (
          <View>
            {sections.length === 0 ? (
              <EmptyState tone='gray' title='还没有任务' description='点一道菜、选个执行人，发起第一个任务。' />
            ) : (
              sections.map((section) => (
                <SectionCard
                  key={section.key}
                  title={section.title}
                  meta={`${section.tasks.length} 条`}
                  variant={section.variant}
                >
                  <View>
                    {section.tasks.map((task) => {
                      const statusMeta = orderStatusMetaMap[task.status as OrderStatus]
                      const workspaceName = (task as { workspace?: { name?: string } }).workspace?.name || ''

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
                </SectionCard>
              ))
            )}
          </View>
        )}
      </AsyncContainer>
    </Page>
  )
}

