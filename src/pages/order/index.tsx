import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { orderApi, recipeApi, groupApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'

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
      showErrorToast(error, '加载失败')
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
      showErrorToast(error, '点餐失败')
    }
  }

  const assignees = useMemo(() => {
    return members.filter((member) => member.canAcceptOrder)
  }, [members])

  if (loading) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <PageHero
        badge='Order Studio'
        title='发起点餐任务'
        description='先选菜谱，再指定执行人。系统会自动生成一笔任务，后续进度都在任务详情里推进。'
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已选菜谱</Text>
              <Text className='hero-stat-card__value'>{selectedRecipeId ? 1 : 0}</Text>
              <Text className='hero-stat-card__hint'>从可用菜谱库中选择</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已选执行人</Text>
              <Text className='hero-stat-card__value'>{selectedAssigneeId ? 1 : 0}</Text>
              <Text className='hero-stat-card__hint'>仅展示可接单成员</Text>
            </View>
          </View>
        }
      />

      <SectionCard
        title='选择菜谱'
        description='建议优先选常做菜，任务信息会更清晰。'
        meta={`${recipes.length} 个可用`}
        variant='accent'
      >
        {recipes.length > 0 ? (
          <View>
            {recipes.map((recipe) => (
              <View
                key={recipe.id}
                className={
                  selectedRecipeId === recipe.id
                    ? 'feature-list-card feature-list-card--amber'
                    : 'feature-list-card'
                }
                onClick={() => handleSelectRecipe(recipe.id)}
              >
                <Text className='feature-list-card__title'>{recipe.name}</Text>
                <Text className='feature-list-card__meta'>
                  {selectedRecipeId === recipe.id ? '已选中' : '点击选中'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='amber'
            title='暂无菜谱'
            description='先在分组里新建一个菜谱，再回来发起点餐任务。'
          />
        )}
      </SectionCard>

      <SectionCard
        title='选择执行人'
        description='执行人需要具备可接单权限，才能被分配任务。'
        meta={`${assignees.length} 人可接单`}
        variant='soft'
      >
        {assignees.length > 0 ? (
          <View>
            {assignees.map((member) => (
              <View
                key={member.userId}
                className={
                  selectedAssigneeId === member.userId
                    ? 'feature-list-card feature-list-card--rose'
                    : 'feature-list-card'
                }
                onClick={() => handleSelectAssignee(member.userId)}
              >
                <Text className='feature-list-card__title'>
                  {member.user?.nickname || member.tag?.name || '执行人'}
                </Text>
                <Text className='feature-list-card__meta'>
                  {selectedAssigneeId === member.userId ? '已选中' : '点击选中'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='rose'
            title='暂无可接单成员'
            description='请先在成员设置里打开“可接单”权限，再回来发起点餐。'
          />
        )}
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--primary'
          disabled={!selectedRecipeId || !selectedAssigneeId}
          onClick={handleSubmit}
        >
          点餐
        </Button>
      </BottomActionBar>
    </View>
  )
}
