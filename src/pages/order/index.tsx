import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import MemberAvatar from '@/components/member-avatar'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { recipeApi, taskApi, workspaceApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getMemberDisplayName, getMemberSubtitle } from '@/utils/member'

export default function Order() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const workspaceId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.workspaceId || '0')
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [workspace, recipesData] = await Promise.all([
        workspaceApi.getDetail(workspaceId),
        recipeApi.getList(workspaceId),
      ])
      setRecipes(recipesData)
      setMembers(workspace.members || [])
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      const task = await taskApi.create(workspaceId, selectedRecipeId, selectedAssigneeId)
      Taro.hideLoading()
      Taro.showToast({
        title: '任务已创建',
        icon: 'success',
      })
      setTimeout(() => {
        if (task?.id) {
          Taro.redirectTo({
            url: `/pages/task/index?id=${task.id}`,
          })
          return
        }

        Taro.navigateBack()
      }, 800)
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '创建失败')
    }
  }

  const assignees = useMemo(
    () => members.filter((member) => member.canAcceptTask),
    [members],
  )

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
        badge='Task Studio'
        title='发起点餐任务'
        description='先选菜谱，再指定执行人。系统会自动生成一笔任务，后续进度都在任务详情里推进。'
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已选菜谱</Text>
              <Text className='hero-stat-card__value'>{selectedRecipeId ? 1 : 0}</Text>
              <Text className='hero-stat-card__hint'>从当前空间菜谱库中选择</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已选执行人</Text>
              <Text className='hero-stat-card__value'>{selectedAssigneeId ? 1 : 0}</Text>
              <Text className='hero-stat-card__hint'>仅展示可接任务成员</Text>
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
                onClick={() => setSelectedRecipeId(recipe.id)}
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
            description='先在空间里新建一个菜谱，再回来发起点餐任务。'
          />
        )}
      </SectionCard>

      <SectionCard
        title='选择执行人'
        description='执行人需要具备可接任务权限，才能被分配任务。'
        meta={`${assignees.length} 人可接任务`}
        variant='soft'
      >
        {assignees.length > 0 ? (
          <View>
            {assignees.map((member) => {
              const subtitle = getMemberSubtitle(member)

              return (
                <View
                  key={member.id}
                  className={
                    selectedAssigneeId === member.id
                      ? 'feature-list-card feature-list-card--rose'
                      : 'feature-list-card'
                  }
                  onClick={() => setSelectedAssigneeId(member.id)}
                >
                  <View className='flex items-center'>
                    <MemberAvatar className='mr-3' member={member} size='sm' />
                    <View>
                      <Text className='feature-list-card__title'>
                        {getMemberDisplayName(member)}
                      </Text>
                      {subtitle ? (
                        <Text className='mt-1 block text-sm text-slate-500'>{subtitle}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text className='feature-list-card__meta'>
                    {selectedAssigneeId === member.id ? '已选中' : '点击选中'}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : (
          <EmptyState
            tone='rose'
            title='暂无可接任务成员'
            description='请先在成员设置里打开“可接任务”权限，再回来发起点餐。'
          />
        )}
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--primary'
          disabled={!selectedRecipeId || !selectedAssigneeId}
          onClick={handleSubmit}
        >
          创建任务
        </Button>
      </BottomActionBar>
    </View>
  )
}
