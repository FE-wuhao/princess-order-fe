import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { orderApi, recipeApi, groupApi } from '../../services/api'

export default function Order() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null)
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

  const handleSelectAssignee = (assigneeId: number) => {
    setSelectedAssigneeId(assigneeId)
  }

  const handleSubmit = async () => {
    if (!selectedRecipeId) {
      Taro.showToast({
        title: '请选择菜谱',
        icon: 'none',
      })
      return
    }

    if (!selectedAssigneeId) {
      Taro.showToast({
        title: '请选择执行人',
        icon: 'none',
      })
      return
    }

    try {
      Taro.showLoading({ title: '提交中...' })
      const order = await orderApi.create(groupId, selectedRecipeId, selectedAssigneeId)
      Taro.hideLoading()
      Taro.showToast({
        title: '点餐成功',
        icon: 'success',
      })
      setTimeout(() => {
        if (order?.id) {
          Taro.redirectTo({
            url: `/pages/task/index?id=${order.id}`,
          })
          return
        }

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

  const assignees = useMemo(() => {
    return members.filter((member) => member.canAcceptOrder)
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
              className={`mb-2-5 rounded border p-3 ${
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
        <Text className='text-base font-bold mb-2-5 block'>选择执行人</Text>
        {assignees.length > 0 ? (
          <View>
            {assignees.map((member) => (
              <View
                key={member.userId}
              className={`mb-2-5 rounded border p-3 ${
                  selectedAssigneeId === member.userId
                    ? 'border-primary bg-pink-50'
                    : 'border-gray-200'
                }`}
                onClick={() => handleSelectAssignee(member.userId)}
              >
                <Text>
                  {member.user?.nickname || member.tag?.name || '执行人'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='text-center py-5 text-gray-500'>暂无可接单成员</View>
        )}
      </View>

      <View className='fixed bottom-0 left-0 right-0 p-5 bg-white shadow-top'>
        <Button
          type='primary'
          disabled={!selectedRecipeId || !selectedAssigneeId}
          onClick={handleSubmit}
        >
          点餐
        </Button>
      </View>
    </View>
  )
}
