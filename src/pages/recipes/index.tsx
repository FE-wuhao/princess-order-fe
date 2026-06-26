import { useCallback, useEffect, useMemo } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
import PageToolbar from '@/components/page-toolbar'
import Pressable from '@/components/pressable'
import TabBarPlus from '@/components/tab-bar-plus'
import { SkeletonCard } from '@/components/skeleton'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { redirectToWorkspaceEntry } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'
import type { Recipe } from '@shared/types'

const getDifficultyLabel = (difficulty?: string | null) => {
  if (difficulty === 'easy') return '简单'
  if (difficulty === 'hard') return '有点挑战'
  if (difficulty === 'normal') return '适中'
  return '未设置'
}

const isH5 = process.env.TARO_ENV === 'h5'

export default function RecipesPage() {
  const workspaces = useWorkspaceStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const loading = useWorkspaceStore((s) => s.loading)
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)
  // 菜谱数据 — 独立 Store
  const recipes = useRecipeStore((s) => s.recipes)
  const recipesMeta = useRecipeStore((s) => s.recipesMeta)
  const refreshRecipes = useRecipeStore((s) => s.refreshRecipes)

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || null,
    [activeWorkspaceId, workspaces],
  )

  // 过滤掉已归档的菜谱
  const activeRecipes = useMemo(
    () => recipes.filter((r: Recipe) => (r as { status?: string }).status !== 'archived'),
    [recipes],
  )

  const loadPage = useCallback(async () => {
    try {
      await loadWorkspaces()
      const currentWorkspaces = useWorkspaceStore.getState().workspaces
      if (currentWorkspaces.length === 0) {
        redirectToWorkspaceEntry()
        return
      }
      const wsId = useWorkspaceStore.getState().activeWorkspaceId
      if (wsId) {
        await refreshRecipes()
      }
    } catch (error) {
      showErrorToast(error, '菜谱页加载失败')
    }
  }, [loadWorkspaces, refreshRecipes])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useDidShow(() => {
    // 使用缓存机制，避免重复请求
    loadWorkspaces()
    const wsId = useWorkspaceStore.getState().activeWorkspaceId
    if (wsId) refreshRecipes()
  })

  const handleCreateRecipe = () => {
    if (!activeWorkspace?.id) {
      Taro.showToast({ title: '当前空间异常', icon: 'none' })
      return
    }
    Taro.navigateTo({
      url: `/pages/recipe-form/index?workspaceId=${activeWorkspace.id}`,
    })
  }

  const handleRecipeClick = (recipeId: number) => {
    if (!activeWorkspace?.id) return
    Taro.navigateTo({
      url: `/pages/recipe/index?id=${recipeId}&workspaceId=${activeWorkspace.id}`,
    })
  }

  const isLoading = (loading || recipesMeta.loading) && activeRecipes.length === 0

  return (
    <Page tone='sunset' showHeader={false} contentClassName='pb-28'>
      <PageToolbar
        title={activeWorkspace?.name || '菜谱'}
        subtitle={`${activeRecipes.length} 个菜谱`}
        actions={
          <Button className='app-button app-button--primary app-button--mini' onClick={handleCreateRecipe}>
            新建菜谱
          </Button>
        }
      />

      <AsyncContainer
        loading={isLoading}
        data={activeRecipes}
        skeleton={<View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>}
        empty={
          !activeWorkspace ? (
            <EmptyState tone='gray' title='还没有可用空间' description='请先回首页选择或加入一个空间。' />
          ) : (
            <EmptyState tone='rose' title='这个空间还没有菜谱' description='先新建一个常做菜，后续发起任务时就能直接挑选。' />
          )
        }
      >
        {(recipeList) => (
          <View>
            {recipeList.map((recipe: Recipe) => (
              <Pressable key={recipe.id} onClick={() => handleRecipeClick(recipe.id)}>
                <View className='feature-list-card feature-list-card--rose'>
                  <View className='mb-2 flex items-center justify-between'>
                    <Text className='feature-list-card__title'>{recipe.name}</Text>
                    <Text className='tool-pill'>{getDifficultyLabel(recipe.difficulty)}</Text>
                  </View>
                  <Text className='feature-list-card__meta'>
                    预计 {recipe.estimatedMinutes || '—'} 分钟 / {recipe.servingSize || '—'} 人份
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </AsyncContainer>

      {isH5 ? <TabBarPlus activeKey='recipes' /> : null}
    </Page>
  )
}

