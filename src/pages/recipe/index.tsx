import { useState, useEffect, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import CompactHeader from '@/components/compact-header'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
import Pressable from '@/components/pressable'
import QuickCreateSheet from '@/components/quick-create-sheet'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import { recipeApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/router'
import type { Recipe, RecipeIngredient, RecipeMethod } from '@shared/types'

export default function RecipePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [quickCreateVisible, setQuickCreateVisible] = useState(false)

  const router = useRouter()
  const recipeId = getRouteNumberParam(router.params, 'id')
  const workspaceId = getRouteNumberParam(router.params, 'workspaceId')

  const loadRecipe = useCallback(async () => {
    if (!recipeId) return
    setLoading(true)
    try {
      const data = await recipeApi.getDetail(workspaceId, recipeId)
      setRecipe(data)
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [recipeId, workspaceId])

  useEffect(() => {
    loadRecipe()
  }, [loadRecipe])

  const handleEdit = () => {
    Taro.navigateTo({ url: `/pages/recipe-form/index?id=${recipeId}&workspaceId=${workspaceId}` })
  }

  const difficultyLabel =
    recipe?.difficulty === 'easy' ? '简单'
    : recipe?.difficulty === 'hard' ? '有点挑战'
    : recipe?.difficulty ? '适中'
    : '未设置'

  const footer = (
    <View className='action-row'>
      <Button className='action-row__item app-button app-button--ghost' onClick={() => Taro.navigateBack()}>
        返回
      </Button>
      <Button
        className='action-row__item app-button app-button--primary'
        onClick={() => setQuickCreateVisible(true)}
      >
        发起任务
      </Button>
    </View>
  )

  return (
    <>
      <Page
        title='菜谱详情'
        tone='sunset'
        topSpacerMode='header'
        footer={footer}
        headerRight={
          <Button className='app-button app-button--ghost app-button--mini' onClick={handleEdit}>
            编辑
          </Button>
        }
      >
        <AsyncContainer
          loading={loading}
          data={recipe}
          skeleton={<View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>}
          empty={<EmptyState tone='gray' title='菜谱不存在' description='该菜谱可能已被删除或归档。' />}
        >
          {(data) => (
            <View>
              <CompactHeader
                tone='sunset'
                title={data.name}
                desc={data.description || undefined}
                meta={
                  <>
                    <Text className='compact-header__meta-item'>{difficultyLabel}</Text>
                    <Text className='compact-header__meta-item'>{data.methods?.length || 0} 步</Text>
                    {data.estimatedMinutes ? (
                      <Text className='compact-header__meta-item'>{data.estimatedMinutes} 分钟</Text>
                    ) : null}
                    {data.servingSize ? (
                      <Text className='compact-header__meta-item'>{data.servingSize} 人份</Text>
                    ) : null}
                  </>
                }
              />

              <SectionCard
                title='食材'
                meta={`${(data.ingredients as RecipeIngredient[] | undefined)?.length || 0} 项`}
                variant='soft'
              >
                {data.ingredients && (data.ingredients as RecipeIngredient[]).length > 0 ? (
                  <View className='recipe-detail-ingredient-cloud'>
                    {(data.ingredients as RecipeIngredient[]).map((ingredient) => (
                      <View key={ingredient.id} className='recipe-detail-ingredient-chip'>
                        <Text className='recipe-detail-ingredient-chip__name'>{ingredient.name}</Text>
                        <Text className='recipe-detail-ingredient-chip__amount'>
                          {[ingredient.amount, ingredient.unit].filter(Boolean).join(' ') || '适量'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState tone='amber' title='暂无食材' description='回到编辑页补充食材，发单时会更方便。' />
                )}
              </SectionCard>

              <SectionCard title='做法' meta={`${data.methods?.length || 0} 步`} variant='accent'>
                {data.methods && (data.methods as RecipeMethod[]).length > 0 ? (
                  <View>
                    {(data.methods as RecipeMethod[]).map((method, index) => (
                      <View key={method.id} className='feature-list-card feature-list-card--rose'>
                        <View className='flex items-start justify-between gap-2'>
                          <Text className='tool-pill'>{index + 1}</Text>
                          <Text className='feature-list-card__description flex-1'>{method.content}</Text>
                          {method.source === 'ai' ? <StatusChip label='AI' tone='accent' /> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState tone='rose' title='暂无做法' description='先手写 1～2 步也可以，后续再用 AI 补全。' />
                )}
              </SectionCard>
            </View>
          )}
        </AsyncContainer>
      </Page>

      <QuickCreateSheet
        visible={quickCreateVisible}
        workspaceId={workspaceId}
        preSelectedRecipeId={recipeId}
        onClose={() => setQuickCreateVisible(false)}
        onCreated={(taskId) => {
          if (taskId) Taro.redirectTo({ url: `/pages/task/index?id=${taskId}` })
        }}
      />
    </>
  )
}
