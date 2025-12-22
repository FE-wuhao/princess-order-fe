import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { orderApi, recipeApi, groupApi } from '../../services/api'

export default function Order() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [selectedServantId, setSelectedServantId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const groupId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.groupId || '0')
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [group, recipesData] = await Promise.all([
        groupApi.getDetail(groupId),
        recipeApi.getList(groupId),
      ])
      setRecipes(recipesData)
      setMembers(group.members || [])
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
    loadData()
  }, [loadData])

  const handleSelectRecipe = (recipeId: number) => {
    setSelectedRecipeId(recipeId)
  }

  const handleSelectServant = (servantId: number) => {
    setSelectedServantId(servantId)
  }

  const handleSubmit = async () => {
    if (!selectedRecipeId) {
      Taro.showToast({
        title: '请选择菜谱',
        icon: 'none',
      })
      return
    }

    if (!selectedServantId) {
      Taro.showToast({
        title: '请选择仆人',
        icon: 'none',
      })
      return
    }

    try {
      Taro.showLoading({ title: '提交中...' })
      await orderApi.create(groupId, selectedRecipeId, selectedServantId)
      Taro.hideLoading()
      Taro.showToast({
        title: '点餐成功',
        icon: 'success',
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '点餐失败',
        icon: 'none',
      })
    }
  }

  const servants = useMemo(() => {
    return members.filter((m) => m.role === 'servant')
  }, [members])

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  return (
    <View className='p-5 min-h-screen bg-gray-100 pb-24'>
      <View className='bg-white p-4 rounded-lg mb-5'>
        <Text className='text-base font-bold mb-2-5 block'>选择菜谱</Text>
        {recipes.length > 0 ? (
          <View>
            {recipes.map((recipe) => (
              <View
                key={recipe.id}
                className={`p-3 border rounded mb-2-5 last-mb-0 ${
                  selectedRecipeId === recipe.id
                    ? 'border-primary bg-pink-50'
                    : 'border-gray-200'
                }`}
                onClick={() => handleSelectRecipe(recipe.id)}
              >
                <Text>{recipe.name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='text-center py-5 text-gray-500'>暂无菜谱</View>
        )}
      </View>

      <View className='bg-white p-4 rounded-lg mb-5'>
        <Text className='text-base font-bold mb-2-5 block'>选择仆人</Text>
        {servants.length > 0 ? (
          <View>
            {servants.map((servant) => (
              <View
                key={servant.userId}
                className={`p-3 border rounded mb-2-5 last-mb-0 ${
                  selectedServantId === servant.userId
                    ? 'border-primary bg-pink-50'
                    : 'border-gray-200'
                }`}
                onClick={() => handleSelectServant(servant.userId)}
              >
                <Text>{servant.user?.nickname || servant.tagName || '仆人'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='text-center py-5 text-gray-500'>暂无仆人</View>
        )}
      </View>

      <View className='fixed bottom-0 left-0 right-0 p-5 bg-white shadow-top'>
        <Button
          type='primary'
          disabled={!selectedRecipeId || !selectedServantId}
          onClick={handleSubmit}
        >
          点餐
        </Button>
      </View>
    </View>
  )
}
