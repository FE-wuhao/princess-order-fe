import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { groupApi, recipeApi, orderApi } from '../../services/api'

interface GroupDetail {
  id: number
  name: string
  members: any[]
  recipes: any[]
}

export default function Group() {
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const groupId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.id || '0')
  }, [])

  const loadGroup = useCallback(async () => {
    setLoading(true)
    try {
      const data = await groupApi.getDetail(groupId)
      setGroup(data)
    } catch (error) {
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  const handleRecipeClick = (recipeId: number) => {
    Taro.navigateTo({
      url: `/pages/recipe/index?id=${recipeId}&groupId=${groupId}`,
    })
  }

  const handleOrderClick = () => {
    Taro.navigateTo({
      url: `/pages/order/index?groupId=${groupId}`,
    })
  }

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  if (!group) {
    return <View className='p-5'>分组不存在</View>
  }

  return (
    <View className='p-5 min-h-screen bg-gray-100 pb-24'>
      <View className='mb-5'>
        <Text className='text-xl font-bold'>{group.name}</Text>
      </View>

      <View className='bg-white p-4 rounded-lg mb-5'>
        <Text className='text-base font-bold mb-2.5 block'>菜谱列表</Text>
        {group.recipes && group.recipes.length > 0 ? (
          <View>
            {group.recipes.map((recipe) => (
              <View
                key={recipe.id}
                className='py-2.5 border-b border-gray-200 last:border-b-0'
                onClick={() => handleRecipeClick(recipe.id)}
              >
                <Text>{recipe.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='text-center py-5 text-gray-500'>暂无菜谱</View>
        )}
      </View>

      <View className='fixed bottom-0 left-0 right-0 p-5 bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.1)]'>
        <Button type='primary' onClick={handleOrderClick}>
          点餐
        </Button>
      </View>
    </View>
  )
}
