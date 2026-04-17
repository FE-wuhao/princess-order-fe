import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { recipeApi } from '@/services/api'

interface RecipeMethod {
  id: number
  content: string
  source: 'manual' | 'ai'
}

interface RecipeIngredient {
  id: number
  name: string
  amount?: string | null
  unit?: string | null
}

interface Recipe {
  id: number
  name: string
  description?: string | null
  difficulty?: 'easy' | 'normal' | 'hard' | null
  estimatedMinutes?: number | null
  servingSize?: number | null
  ingredients?: RecipeIngredient[]
  methods: RecipeMethod[]
}

export default function Recipe() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)

  const { recipeId, groupId } = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return {
      recipeId: parseInt(params?.id || '0'),
      groupId: parseInt(params?.groupId || '0'),
    }
  }, [])

  const loadRecipe = useCallback(async () => {
    setLoading(true)
    try {
      const data = await recipeApi.getDetail(groupId, recipeId)
      setRecipe(data)
    } catch (error) {
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [recipeId])

  useEffect(() => {
    loadRecipe()
  }, [loadRecipe])

  const handleAddAiMethods = async () => {
    try {
      Taro.showLoading({ title: '检索中...' })
      await recipeApi.addAiMethods(groupId, recipeId)
      Taro.hideLoading()
      Taro.showToast({
        title: '添加成功',
        icon: 'success',
      })
      loadRecipe()
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '添加失败',
        icon: 'none',
      })
    }
  }

  const handleEdit = () => {
    Taro.navigateTo({
      url: `/pages/recipe-form/index?id=${recipeId}&groupId=${groupId}`,
    })
  }

  if (loading) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  if (!recipe) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <Text className='block text-center text-gray-500'>菜谱不存在</Text>
      </View>
    )
  }

  const difficultyLabel =
    recipe.difficulty === 'easy'
      ? '简单'
      : recipe.difficulty === 'hard'
      ? '有点挑战'
      : recipe.difficulty
      ? '适中'
      : '未设置'

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <PageHero
        badge='Recipe'
        title={recipe.name}
        description={recipe.description || '把常做菜沉淀成菜谱，发单和执行都会更顺。'}
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
              <Text className='hero-stat-card__value'>{recipe.methods?.length || 0}</Text>
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
        meta={`${recipe.ingredients?.length || 0} 项`}
        variant='soft'
      >
        {recipe.ingredients && recipe.ingredients.length > 0 ? (
          <View>
            {recipe.ingredients.map((ingredient) => (
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
          <EmptyState
            tone='amber'
            title='暂无食材'
            description='回到编辑页补充食材，发单时会更方便。'
          />
        )}
      </SectionCard>

      <SectionCard
        title='做法'
        description='步骤尽量一句一事；如果缺步骤，可以用 AI 检索补充。'
        actions={
          <Button className='app-button app-button--primary app-button--mini' onClick={handleAddAiMethods}>
            AI 检索做法
          </Button>
        }
        meta={`${recipe.methods?.length || 0} 步`}
        variant='accent'
      >
        {recipe.methods && recipe.methods.length > 0 ? (
          <View>
            {recipe.methods.map((method, index) => (
              <View key={method.id} className='feature-list-card feature-list-card--rose'>
                <View className='flex items-start justify-between gap-2'>
                  <Text className='tool-pill'>{index + 1}</Text>
                  <Text className='feature-list-card__description flex-1'>{method.content}</Text>
                  {method.source === 'ai' ? (
                    <StatusChip label='AI' tone='accent' />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='rose'
            title='暂无做法'
            description='先手写 1～2 步也可以，后续再用 AI 补全。'
          />
        )}
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--secondary'
          onClick={() => {
            Taro.navigateBack()
          }}
        >
          返回
        </Button>
      </BottomActionBar>
    </View>
  )
}
