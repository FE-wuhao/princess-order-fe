import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import EmptyState from '@/components/empty-state'
import InputDialog from '@/components/input-dialog'
import PageHero from '@/components/page-hero'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard, SkeletonHero } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import WorkspaceSwitcher from '@/components/workspace-switcher'
import { orderStatusMetaMap } from '@/constants/ui'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { showErrorToast } from '@/utils/error'
import type { TaskStatus } from '@shared/types'

type HomeDialogMode = 'create' | 'join' | null

const taskCardToneClassMap: Record<TaskStatus, string> = {
  created: 'feature-list-card--warning',
  accepted: 'feature-list-card--info',
  rejected: 'feature-list-card--danger',
  cooking: 'feature-list-card--accent',
  completed: 'feature-list-card--success',
  confirmed: 'feature-list-card--success',
  cancelled: 'feature-list-card--neutral',
  expired: 'feature-list-card--danger',
}

export default function Index() {
  // ── Zustand stores ──
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const ensureAuth = useAuthStore((s) => s.wxLogin)

  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const loading = useWorkspaceStore((s) => s.loading)
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace)
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  // 任务数据 — 独立 Store
  const tasks = useTaskStore((s) => s.tasks)
  const tasksLoading = useTaskStore((s) => s.tasksMeta.loading)
  // 通知 — 独立 Store
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const loadNotifications = useNotificationStore((s) => s.loadNotifications)

  // ── Local UI state ──
  const [dialogMode, setDialogMode] = useState<HomeDialogMode>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lastLoadTimeRef = useRef(0)

  // ── Derived ──
  const currentWorkspace = activeWorkspace()
  const workspacesForSwitcher = useMemo(
    () => workspaces.map((w) => ({ id: w.id, name: w.name })),
    [workspaces],
  )

  const recentTasks = useMemo(() => tasks.slice(0, 4), [tasks])

  const pendingTasks = useMemo(
    () =>
      tasks.filter((t) =>
        (['created', 'accepted', 'cooking', 'completed'] as TaskStatus[]).includes(
          t.status as TaskStatus,
        ),
      ),
    [tasks],
  )

  // ── 加载逻辑 ──
  const loadDashboard = useCallback(async () => {
    lastLoadTimeRef.current = Date.now()
    try {
      await loadWorkspaces()
      // 后台加载通知计数
      loadNotifications()
    } catch (error) {
      showErrorToast(error, '首页加载失败')
    }
  }, [loadWorkspaces, loadNotifications])

  const ensureLoginAndLoad = useCallback(async () => {
    if (isLoggedIn) {
      loadDashboard()
      return
    }
    try {
      await ensureAuth()
      loadDashboard()
    } catch {
      // ensureAuth 内部已处理跳转
    }
  }, [ensureAuth, isLoggedIn, loadDashboard])

  useEffect(() => {
    ensureLoginAndLoad()
  }, [ensureLoginAndLoad])

  useDidShow(() => {
    if (isLoggedIn && Date.now() - lastLoadTimeRef.current > 3000) {
      loadDashboard()
    }
  })

  // ── 交互 ──
  const handleSelectWorkspace = async (workspaceId: number) => {
    try {
      await switchWorkspace(workspaceId)
    } catch (error) {
      showErrorToast(error, '切换空间失败')
    }
  }

  const handleCreateTask = () => {
    if (!currentWorkspace?.id) return
    Taro.navigateTo({ url: `/pages/order/index?workspaceId=${currentWorkspace.id}` })
  }

  const handleRecipeHubClick = () => {
    Taro.switchTab({ url: '/pages/recipes/index' })
  }

  const handleTaskBoardClick = () => {
    Taro.switchTab({ url: '/pages/task-list/index' })
  }

  const handleNotificationClick = () => {
    Taro.navigateTo({ url: '/pages/notifications/index' })
  }

  const handleTaskClick = (task: { id: number }) => {
    Taro.navigateTo({ url: `/pages/task/index?id=${task.id}` })
  }

  const handleWorkspaceManage = (workspace: { id: number }) => {
    Taro.navigateTo({ url: `/pages/group/index?workspaceId=${workspace.id}` })
  }

  const handleCreateWorkspace = async () => {
    const name = dialogValue.trim()
    if (!name) {
      Taro.showToast({ title: '请输入空间名', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const { workspaceApi } = await import('@/services/workspace.api')
      await workspaceApi.create(name)
      setDialogValue('')
      setDialogMode(null)
      Taro.showToast({ title: '创建成功', icon: 'success' })
      await loadDashboard()
    } catch (error) {
      showErrorToast(error, '创建空间失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinWorkspace = async () => {
    const inviteCode = dialogValue.trim().toUpperCase()
    if (!inviteCode) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      const { workspaceApi } = await import('@/services/workspace.api')
      const membership = await workspaceApi.joinByInvite(inviteCode)
      const workspaceId = (membership as { workspace?: { id: number } })?.workspace?.id || 0
      if (workspaceId) {
        setDialogValue('')
        setDialogMode(null)
        Taro.showToast({ title: '加入成功', icon: 'success' })
        await loadDashboard()
      }
    } catch (error) {
      showErrorToast(error, '加入空间失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──
  return (
    <View className='page-shell px-4 py-5'>
      <View className='toolbar-row'>
        <View className='toolbar-row__main'>
          <WorkspaceSwitcher
            workspaces={workspacesForSwitcher}
            selectedWorkspaceId={activeWorkspaceId}
            onSelect={handleSelectWorkspace}
            onEdit={handleWorkspaceManage}
            onCreate={() => { setDialogValue(''); setDialogMode('create') }}
            onJoin={() => { setDialogValue(''); setDialogMode('join') }}
          />
        </View>
        <Pressable onClick={handleNotificationClick}>
          <View className='toolbar-icon-button' style={{ position: 'relative' }}>
            <View className='icon-bell' />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  background: 'var(--ui-danger-text, #c2415d)',
                  color: '#fff',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      <PageHero
        badge='Princess Order'
        title='今天吃什么，先从当前空间开始'
        description='首页只负责总览与分流：当前空间定好以后，菜谱和任务都会跟着这个上下文走。'
        stats={
          <AsyncContainer
            loading={tasksLoading && tasks.length === 0}
            data={pendingTasks}
            isEmpty={(d) => d == null || d.length === 0}
            empty={
              <View className='hero-stat-grid'>
                <View className='hero-stat-card'>
                  <Text className='hero-stat-card__label'>待跟进任务</Text>
                  <Text className='hero-stat-card__value'>0</Text>
                  <Text className='hero-stat-card__hint'>暂无待处理任务</Text>
                </View>
                <View className='hero-stat-card'>
                  <Text className='hero-stat-card__label'>当前空间</Text>
                  <Text className='hero-stat-card__value'>{currentWorkspace?.name || '未选择'}</Text>
                  <Text className='hero-stat-card__hint'>下次进入时会自动记住</Text>
                </View>
              </View>
            }
            skeleton={<SkeletonHero />}
            emptyTitle=''
            emptyDescription=''
          >
            {() => (
              <View className='hero-stat-grid'>
                <View className='hero-stat-card'>
                  <Text className='hero-stat-card__label'>待跟进任务</Text>
                  <Text className='hero-stat-card__value'>{pendingTasks.length}</Text>
                  <Text className='hero-stat-card__hint'>优先处理待响应、制作中和待确认</Text>
                </View>
                <View className='hero-stat-card'>
                  <Text className='hero-stat-card__label'>当前空间</Text>
                  <Text className='hero-stat-card__value'>{currentWorkspace?.name || '未选择'}</Text>
                  <Text className='hero-stat-card__hint'>下次进入时会自动记住</Text>
                </View>
              </View>
            )}
          </AsyncContainer>
        }
        actions={
          <View className='space-y-3'>
            <Button className='app-button app-button--primary' onClick={handleRecipeHubClick}>
              进入菜谱库
            </Button>
            <Button className='app-button app-button--ghost' onClick={handleTaskBoardClick}>
              查看任务看板
            </Button>
            <Button className='app-button app-button--secondary' disabled={!currentWorkspace?.id} onClick={handleCreateTask}>
              直接发起任务
            </Button>
          </View>
        }
      />

      <SectionCard
        title='最近任务'
        description='不同状态直接用不同底色区分，空状态也会按分区语义保持一致。'
        actions={
          <Button className='app-button app-button--ghost app-button--mini' onClick={handleTaskBoardClick}>
            查看全部
          </Button>
        }
        variant='soft'
      >
        <AsyncContainer
          loading={loading}
          data={recentTasks}
          skeleton={<View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>}
          empty={<EmptyState tone='gray' title='还没有任务' description='从当前空间发起第一笔任务后，这里会展示最近进度。' />}
        >
          {(taskList) => (
            <View>
              {taskList.map((task) => {
                const statusMeta = orderStatusMetaMap[task.status as TaskStatus]
                return (
                  <Pressable key={task.id} onClick={() => handleTaskClick(task)}>
                    <View className={`feature-list-card ${taskCardToneClassMap[task.status as TaskStatus]}`}>
                      <View className='mb-2 flex items-center justify-between'>
                        <Text className='feature-list-card__title'>
                          {task.recipe?.name || `任务 #${task.id}`}
                        </Text>
                        <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                      </View>
                      <Text className='feature-list-card__description'>
                        空间：{(task as { workspace?: { name?: string } }).workspace?.name || '未命名空间'}
                      </Text>
                      <Text className='feature-list-card__meta'>
                        发起人：{task.creator?.nickname || '未命名'} / 执行人：{task.assignee?.nickname || '未命名'}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}
        </AsyncContainer>
      </SectionCard>

      <InputDialog
        visible={dialogMode === 'create'}
        title='新建空间'
        value={dialogValue}
        placeholder='例如：我们家厨房'
        confirmText='创建'
        loading={submitting}
        onChange={setDialogValue}
        onCancel={() => { setDialogMode(null); setDialogValue('') }}
        onConfirm={handleCreateWorkspace}
      />
      <InputDialog
        visible={dialogMode === 'join'}
        title='输入邀请码'
        value={dialogValue}
        placeholder='例如：GRBQ7X'
        confirmText='加入'
        loading={submitting}
        onChange={(value: string) => setDialogValue(value.toUpperCase())}
        onCancel={() => { setDialogMode(null); setDialogValue('') }}
        onConfirm={handleJoinWorkspace}
      />
    </View>
  )
}
