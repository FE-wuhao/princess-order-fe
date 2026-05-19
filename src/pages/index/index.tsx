import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { orderStatusMetaMap } from '@/constants/ui'
import { taskApi, workspaceApi } from '@/services/api'
import { checkAuth, ensureAuth } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'
import { getPreferredWorkspaceId, setPreferredWorkspaceId } from '@/utils/workspace'

interface WorkspaceItem {
  id: number
  name: string
}

interface TaskItem {
  id: number
  status: keyof typeof orderStatusMetaMap
  recipe?: {
    id: number
    name: string
  }
  workspace?: {
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
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)

    try {
      const [workspacesData, tasksData] = await Promise.all([
        workspaceApi.getList(),
        taskApi.getList({ mine: true }),
      ])
      setWorkspaces(workspacesData || [])
      setTasks(tasksData || [])
    } catch (error) {
      showErrorToast(error, '看板加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const ensureLoginAndLoad = useCallback(async () => {
    try {
      const authed = await ensureAuth()
      if (!authed) {
        return
      }
    } catch (error) {
      showErrorToast(error, '登录失败')
      return
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

  const pendingTasks = useMemo(
    () =>
      tasks.filter((task) =>
        ['created', 'accepted', 'cooking', 'completed'].includes(task.status),
      ),
    [tasks],
  )

  const recentTasks = useMemo(() => tasks.slice(0, 3), [tasks])

  const activeWorkspace = useMemo(() => {
    if (workspaces.length === 0) {
      return null
    }

    const preferredWorkspaceId = getPreferredWorkspaceId()
    return (
      workspaces.find((workspace) => workspace.id === preferredWorkspaceId) ||
      workspaces[0]
    )
  }, [workspaces])

  const otherWorkspaces = useMemo(() => {
    if (!activeWorkspace) {
      return workspaces
    }

    return workspaces.filter((workspace) => workspace.id !== activeWorkspace.id)
  }, [activeWorkspace, workspaces])

  const handleWorkspaceClick = (workspaceId: number) => {
    setPreferredWorkspaceId(workspaceId)
    Taro.navigateTo({
      url: `/pages/group/index?id=${workspaceId}`,
    })
  }

  const handleTaskClick = (task: TaskItem) => {
    if (task.id) {
      Taro.navigateTo({
        url: `/pages/task/index?id=${task.id}`,
      })
      return
    }

    Taro.showToast({
      title: '该任务缺少空间信息',
      icon: 'none',
    })
  }

  const handleTaskBoardClick = () => {
    Taro.switchTab({
      url: '/pages/task-list/index',
    })
  }

  const handleRecipeHubClick = () => {
    if (activeWorkspace?.id) {
      setPreferredWorkspaceId(activeWorkspace.id)
    }

    Taro.switchTab({
      url: '/pages/recipes/index',
    })
  }

  const handleCreateWorkspace = async () => {
    const result = await Taro.showModal({
      title: '新建空间',
      editable: true,
      placeholderText: '输入一个温柔的空间名',
      confirmText: '创建',
    })

    if (!result.confirm) {
      return
    }

    const name = result.content?.trim()
    if (!name) {
      Taro.showToast({
        title: '请输入空间名',
        icon: 'none',
      })
      return
    }

    try {
      Taro.showLoading({ title: '创建中...' })
      await workspaceApi.create(name)
      Taro.hideLoading()
      Taro.showToast({
        title: '创建成功',
        icon: 'success',
      })
      loadDashboard()
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '创建失败')
    }
  }

  return (
    <View className='page-shell px-4 py-5'>
      <PageHero
        badge='Princess Order'
        title='今天吃什么，先从入口做对'
        description='首页现在只负责总览和分流：先看待推进的任务，再进入菜谱库或当前空间继续协作。'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>待跟进任务</Text>
              <Text className='hero-stat-card__value'>{pendingTasks.length}</Text>
              <Text className='hero-stat-card__hint'>优先处理正在推进中的任务</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>我的空间</Text>
              <Text className='hero-stat-card__value'>{workspaces.length}</Text>
              <Text className='hero-stat-card__hint'>空间只做协作上下文，不再和任务混在一起</Text>
            </View>
          </View>
        }
        actions={
          <View className='space-y-3'>
            <Button className='app-button app-button--primary' onClick={handleRecipeHubClick}>
              进入菜谱库
            </Button>
            <Button className='app-button app-button--ghost' onClick={handleTaskBoardClick}>
              查看任务看板
            </Button>
          </View>
        }
      />

      <SectionCard
        title='当前空间'
        description='空间保留为协作上下文层：首页只突出一个主空间，减少来回选择的成本。'
        actions={
          <Button className='app-button app-button--secondary app-button--mini' onClick={handleCreateWorkspace}>
            新建空间
          </Button>
        }
        variant='accent'
      >
        {loading ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : !activeWorkspace ? (
          <EmptyState
            tone='rose'
            title='还没有空间'
            description='先创建一个家庭空间，再把成员、菜谱和任务都收进来。'
          />
        ) : (
          <View className='feature-list-card feature-list-card--amber'>
            <Text className='feature-list-card__meta'>Preferred Workspace</Text>
            <Text className='feature-list-card__title'>{activeWorkspace.name}</Text>
            <Text className='feature-list-card__description'>
              从这里进入成员、称谓模板、邀请码和发起任务的工作台。
            </Text>
            <View className='mt-3 space-y-3'>
              <Button
                className='app-button app-button--primary app-button--mini'
                onClick={() => handleWorkspaceClick(activeWorkspace.id)}
              >
                打开空间
              </Button>
              <Button className='app-button app-button--ghost app-button--mini' onClick={handleRecipeHubClick}>
                在菜谱页查看当前空间菜谱
              </Button>
            </View>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title='最近任务'
        description='首页只保留少量最近任务，真正推进状态请直接进入任务 tab。'
        actions={
          <Button className='app-button app-button--ghost app-button--mini' onClick={handleTaskBoardClick}>
            查看全部
          </Button>
        }
        variant='soft'
      >
        {loading ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : recentTasks.length === 0 ? (
          <EmptyState
            tone='gray'
            title='还没有任务'
            description='等你从空间里发起第一笔任务，这里就会出现最近进度。'
          />
        ) : (
          <View>
            {recentTasks.map((task) => {
              const statusMeta = orderStatusMetaMap[task.status]
              const workspaceName = task.workspace?.name || '未命名空间'

              return (
                <View
                  key={task.id}
                  className='feature-list-card feature-list-card--rose'
                  onClick={() => handleTaskClick(task)}
                >
                  <View className='mb-2 flex items-center justify-between'>
                    <Text className='feature-list-card__title'>
                      {task.recipe?.name || `任务 #${task.id}`}
                    </Text>
                    <StatusChip label={statusMeta.label} tone={statusMeta.tone} />
                  </View>
                  <Text className='feature-list-card__description'>空间：{workspaceName}</Text>
                  <Text className='feature-list-card__meta'>
                    发起人：{task.creator?.nickname || '未命名'} / 执行人：
                    {task.assignee?.nickname || '未命名'}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </SectionCard>

      {otherWorkspaces.length > 0 ? (
        <SectionCard
          title='其他空间'
          description='如果你同时在多个家庭或小组里协作，可以从这里快速切换。'
          meta={`${otherWorkspaces.length} 个`}
        >
          <View>
            {otherWorkspaces.map((workspace) => (
              <View
                key={workspace.id}
                className='feature-list-card'
                onClick={() => handleWorkspaceClick(workspace.id)}
              >
                <View className='flex items-center justify-between'>
                  <View>
                    <Text className='feature-list-card__title'>{workspace.name}</Text>
                    <Text className='feature-list-card__description'>
                      查看成员、菜谱、邀请方式和点餐入口
                    </Text>
                  </View>
                  <Text className='tool-pill'>进入空间</Text>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}
    </View>
  )
}
