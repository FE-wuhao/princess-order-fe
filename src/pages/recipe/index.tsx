import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { recipeApi } from '../../services/api'

interface RecipeMethod {
  id: number
  content: string
  source: 'manual' | 'ai'
}

interface Recipe {
  id: number
  name: string
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
      const data = await recipeApi.getDetail(recipeId)
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
      await recipeApi.addAiMethods(recipeId)
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

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  if (!recipe) {
    return <View className='p-5'>菜谱不存在</View>
  }

  return (
    <View className='p-5 min-h-screen bg-gray-100'>
      <View className='mb-5'>
        <Text className='text-xl font-bold'>{recipe.name}</Text>
      </View>

      <View className='bg-white p-4 rounded-lg mb-5'>
        <View className='flex justify-between items-center mb-2.5'>
          <Text className='text-base font-bold'>做法</Text>
          <Button size='mini' type='primary' onClick={handleAddAiMethods}>
            AI检索做法
          </Button>
        </View>

        {recipe.methods && recipe.methods.length > 0 ? (
          <View>
            {recipe.methods.map((method, index) => (
              <View key={method.id} className='flex items-start py-2.5 border-b border-gray-200 last:border-b-0'>
                <Text className='mr-2.5 text-gray-500'>{index + 1}.</Text>
                <Text className='flex-1 leading-relaxed'>{method.content}</Text>
                {method.source === 'ai' && (
                  <Text className='ml-2.5 px-1.5 py-0.5 bg-primary text-white rounded text-xs'>AI</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View className='text-center py-5 text-gray-500'>暂无做法</View>
        )}
      </View>
    </View>
  )
}
