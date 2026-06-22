import { useState, useEffect, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import SubPageHeader from '@/components/sub-page-header'
import { recipeApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/router'
import type { Recipe, RecipeIngredient, RecipeMethod } from '@shared/types'

export default function RecipePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <SubPageHeader title='菜谱详情' description='从这里查看内容，修改或补 AI 草稿请进入编辑页。' />

      <AsyncContainer
        loading={loading}
        data={recipe}
        skeleton={<View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>}
        empty={<EmptyState tone='gray' title='菜谱不存在' description='该菜谱可能已被删除或归档。' />}
      >
        {(data) => (
          <View>
            <PageHero
              badge='Recipe'
              title={data.name}
              description={data.description || '把常做菜沉淀成菜谱，发单和执行都会更顺。'}
              tone='sunset'
              stats={
                <View className='hero-stat-grid'>
                  <View className='hero-stat-card'>
                    <Text className='hero-stat-card__label'>难度</Text>
                    <Text className='hero-stat-card__value'>{difficultyLabel}</Text>
                    <Text className='hero-stat-card__hint'>用于发单时快速判断</Text>
                  </View>
                  <View className='hero-stat-card'>
                    <Text className='hero-stat-card__label'>做法步骤</Text>
                    <Text className='hero-stat-card__value'>{data.methods?.length || 0}</Text>
                    <Text className='hero-stat-card__hint'>AI 生成步骤会打上标记</Text>
                  </View>
                </View>
              }
              actions={
                <Button className='app-button app-button--ghost' onClick={handleEdit}>
                  编辑菜谱
                </Button>
              }
            />

            <SectionCard
              title='食材'
              description='食材会同步到发单与执行场景，建议按可采购的粒度写。'
              meta={`${(data.ingredients as RecipeIngredient[] | undefined)?.length || 0} 项`}
              variant='soft'
            >
              {data.ingredients && (data.ingredients as RecipeIngredient[]).length > 0 ? (
                <View>
                  {(data.ingredients as RecipeIngredient[]).map((ingredient) => (
                    <View key={ingredient.id} className='feature-list-card feature-list-card--amber'>
                      <View className='flex items-center justify-between'>
                        <Text className='feature-list-card__title'>{ingredient.name}</Text>
                        <Text className='tool-pill'>
                          {[ingredient.amount, ingredient.unit].filter(Boolean).join(' ') || '—'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState tone='amber' title='暂无食材' description='回到编辑页补充食材，发单时会更方便。' />
              )}
            </SectionCard>

            <SectionCard
              title='做法'
              description='步骤尽量一句一事；如果要重新生成整套内容，请回到编辑页使用 AI 草稿。'
              meta={`${data.methods?.length || 0} 步`}
              variant='accent'
            >
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

      <BottomActionBar>
        <Button className='app-button app-button--secondary' onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </BottomActionBar>
    </View>
  )
}
