import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { recipeApi, workspaceApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getPreferredWorkspaceId, setPreferredWorkspaceId } from '@/utils/workspace'

interface WorkspaceItem {
  id: number
  name: string
}

interface RecipeItem {
  id: number
  name: string
  description?: string | null
  difficulty?: 'easy' | 'normal' | 'hard' | null
  estimatedMinutes?: number | null
  servingSize?: number | null
  status?: 'active' | 'archived'
}

const getDifficultyLabel = (difficulty?: RecipeItem['difficulty']) => {
  if (difficulty === 'easy') {
    return '简单'
  }

  if (difficulty === 'hard') {
    return '有点挑战'
  }

  if (difficulty === 'normal') {
    return '适中'
  }

  return '未设置'
}

export default function RecipesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [recipes, setRecipes] = useState<RecipeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(0)

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [selectedWorkspaceId, workspaces],
  )

  const loadWorkspaces = useCallback(async () => {
    const workspaceList = await workspaceApi.getList()
    setWorkspaces(workspaceList || [])

    const preferredWorkspaceId = getPreferredWorkspaceId()
    const nextWorkspaceId =
      (workspaceList || []).find((workspace) => workspace.id === selectedWorkspaceId)?.id ||
      (workspaceList || []).find((workspace) => workspace.id === preferredWorkspaceId)?.id ||
      workspaceList?.[0]?.id ||
      0

    setSelectedWorkspaceId(nextWorkspaceId)
    if (nextWorkspaceId) {
      setPreferredWorkspaceId(nextWorkspaceId)
    }

    return nextWorkspaceId
  }, [selectedWorkspaceId])

  const loadRecipes = useCallback(async (workspaceId: number) => {
    if (!workspaceId) {
      setRecipes([])
      return
    }

    const recipeList = await recipeApi.getList(workspaceId)
    setRecipes((recipeList || []).filter((recipe) => recipe.status !== 'archived'))
  }, [])

  const loadPage = useCallback(async () => {
    setLoading(true)
    try {
      const workspaceId = await loadWorkspaces()
      await loadRecipes(workspaceId)
    } catch (error) {
      showErrorToast(error, '菜谱页加载失败')
    } finally {
      setLoading(false)
    }
  }, [loadRecipes, loadWorkspaces])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useDidShow(() => {
    loadPage()
  })

  const handleSelectWorkspace = async (workspaceId: number) => {
    if (workspaceId === selectedWorkspaceId) {
      return
    }

    setSelectedWorkspaceId(workspaceId)
    setPreferredWorkspaceId(workspaceId)
    setLoading(true)
    try {
      await loadRecipes(workspaceId)
    } catch (error) {
      showErrorToast(error, '切换空间失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenWorkspace = () => {
    if (!activeWorkspace?.id) {
      return
    }

    setPreferredWorkspaceId(activeWorkspace.id)
    Taro.navigateTo({
      url: `/pages/group/index?id=${activeWorkspace.id}`,
    })
  }

  const handleCreateRecipe = () => {
    if (!activeWorkspace?.id) {
      Taro.showToast({
        title: '请先选择空间',
        icon: 'none',
      })
      return
    }

    setPreferredWorkspaceId(activeWorkspace.id)
    Taro.navigateTo({
      url: `/pages/recipe-form/index?workspaceId=${activeWorkspace.id}`,
    })
  }

  const handleRecipeClick = (recipeId: number) => {
    if (!activeWorkspace?.id) {
      return
    }

    setPreferredWorkspaceId(activeWorkspace.id)
    Taro.navigateTo({
      url: `/pages/recipe/index?id=${recipeId}&workspaceId=${activeWorkspace.id}`,
    })
  }

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-8'>
      <PageHero
        badge='Recipe Library'
        title='把常做菜沉淀成家庭知识库'
        description='菜谱现在是一级入口：先切到一个空间，再维护菜谱、查看做法，后续任务都从这里挑选。'
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>当前空间菜谱</Text>
              <Text className='hero-stat-card__value'>{recipes.length}</Text>
              <Text className='hero-stat-card__hint'>只展示当前空间内可用的常做菜</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>可切换空间</Text>
              <Text className='hero-stat-card__value'>{workspaces.length}</Text>
              <Text className='hero-stat-card__hint'>菜谱独立成域，空间只负责归属与协作</Text>
            </View>
          </View>
        }
        actions={
          <View className='space-y-3'>
            <Button className='app-button app-button--primary' onClick={handleCreateRecipe}>
              新建菜谱
            </Button>
            {activeWorkspace ? (
              <Button className='app-button app-button--ghost' onClick={handleOpenWorkspace}>
                打开当前空间
              </Button>
            ) : null}
          </View>
        }
      />

      <SectionCard
        title='切换空间'
        description='如果你有多个家庭或小组，先切到当前要维护的空间，再看对应菜谱。'
        meta={activeWorkspace ? `当前：${activeWorkspace.name}` : '尚未选择'}
        variant='accent'
      >
        {loading && workspaces.length === 0 ? (
          <View className='py-8 text-center text-gray-500'>加载中...</View>
        ) : workspaces.length === 0 ? (
          <EmptyState
            tone='amber'
            title='还没有空间'
            description='先在首页创建一个空间，菜谱库才有落点。'
          />
        ) : (
          <View>
            {workspaces.map((workspace) => (
              <View
                key={workspace.id}
                className={
                  workspace.id === selectedWorkspaceId
                    ? 'feature-list-card feature-list-card--amber'
                    : 'feature-list-card'
                }
                onClick={() => handleSelectWorkspace(workspace.id)}
              >
                <View className='flex items-center justify-between'>
                  <View>
                    <Text className='feature-list-card__title'>{workspace.name}</Text>
                    <Text className='feature-list-card__description'>
                      {workspace.id === selectedWorkspaceId
                        ? '当前正在浏览这个空间下的菜谱'
                        : '点击切换到这个空间'}
                    </Text>
                  </View>
                  <Text className='tool-pill'>
                    {workspace.id === selectedWorkspaceId ? '当前空间' : '切换'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard
        title='菜谱库'
        description='从公共知识库里维护常做菜，任务发起时就不需要重新拼装信息。'
        meta={activeWorkspace ? `${activeWorkspace.name} · ${recipes.length} 个` : '未选择空间'}
        variant='soft'
      >
        {loading && activeWorkspace ? (
          <View className='py-8 text-center text-gray-500'>同步当前空间菜谱中...</View>
        ) : !activeWorkspace ? (
          <EmptyState
            tone='gray'
            title='先选一个空间'
            description='空间是菜谱的归属上下文，选定之后这里会显示对应的菜谱库。'
          />
        ) : recipes.length === 0 ? (
          <EmptyState
            tone='rose'
            title='这个空间还没有菜谱'
            description='先新建一个常做菜，后续发起任务时就能直接挑选。'
          />
        ) : (
          <View>
            {recipes.map((recipe) => (
              <View
                key={recipe.id}
                className='feature-list-card feature-list-card--rose'
                onClick={() => handleRecipeClick(recipe.id)}
              >
                <View className='mb-2 flex items-center justify-between'>
                  <Text className='feature-list-card__title'>{recipe.name}</Text>
                  <Text className='tool-pill'>{getDifficultyLabel(recipe.difficulty)}</Text>
                </View>
                <Text className='feature-list-card__description'>
                  {recipe.description || '进入详情查看食材、做法和 AI 补全结果。'}
                </Text>
                <Text className='feature-list-card__meta'>
                  预计 {recipe.estimatedMinutes || '—'} 分钟 / {recipe.servingSize || '—'} 人份
                </Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </View>
  )
}
