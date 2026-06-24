import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import MemberAvatar from '@/components/member-avatar'
import PageHero from '@/components/page-hero'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import SubPageHeader from '@/components/sub-page-header'
import { useMemberStore } from '@/stores/useMemberStore'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { taskApi } from '@/services/api'
import type { WorkspaceMemberView } from '@/services/workspace.api'
import type { Recipe } from '@shared/types'
import { showErrorToast } from '@/utils/error'
import { getMemberDisplayName } from '@/utils/member'
import { getRouteNumberParam, reLaunchToWorkspaceEntry } from '@/utils/router'

const getAssigneeSubtitle = (member: WorkspaceMemberView) => {
  const nickname = member?.user?.nickname?.trim()
  const remark = member?.remark?.trim()
  const tagName = member?.tag?.name?.trim()
  if (remark && nickname && remark !== nickname) return `昵称：${nickname}`
  if (tagName && tagName !== remark && tagName !== nickname) return `称谓模板：${tagName}`
  return ''
}

export default function Order() {
  const router = useRouter()
  const workspaceId = getRouteNumberParam(router.params, 'workspaceId')
  const preSelectedRecipeId = getRouteNumberParam(router.params, 'recipeId')

  // 使用独立 Store 获取数据
  const recipes = useRecipeStore((s) => s.recipes)
  const recipesLoading = useRecipeStore((s) => s.recipesMeta.loading)
  const refreshRecipes = useRecipeStore((s) => s.refreshRecipes)
  const members = useMemberStore((s) => s.members)
  const membersLoading = useMemberStore((s) => s.membersMeta.loading)
  const refreshMembers = useMemberStore((s) => s.refreshMembers)
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces)

  // 本地选择状态 — 支持预选菜谱
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(preSelectedRecipeId || null)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      reLaunchToWorkspaceEntry()
      return
    }
    try {
      await loadWorkspaces()
      await Promise.all([refreshRecipes(true), refreshMembers(true)])
    } catch (error) {
      showErrorToast(error, '加载失败')
    }
  }, [workspaceId, loadWorkspaces, refreshRecipes, refreshMembers])

  useEffect(() => {
    loadData()
  }, [loadData])

  useDidShow(() => {
    refreshRecipes()
    refreshMembers()
  })

  const handleSubmit = async () => {
    if (!selectedRecipeId) { Taro.showToast({ title: '请选择菜谱', icon: 'none' }); return }
    if (!selectedAssigneeId) { Taro.showToast({ title: '请选择执行人', icon: 'none' }); return }
    setSubmitting(true)
    try {
      Taro.showLoading({ title: '提交中...' })
      const task = await taskApi.create(workspaceId, selectedRecipeId, selectedAssigneeId)
      Taro.hideLoading()
      Taro.showToast({ title: '任务已创建', icon: 'success' })
      setTimeout(() => {
        if (task?.id) { Taro.redirectTo({ url: `/pages/task/index?id=${task.id}` }); return }
        Taro.navigateBack()
      }, 800)
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const assignees = useMemo(() => members.filter((m) => m.canAcceptTask), [members])
  const loading = recipesLoading || membersLoading

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <SubPageHeader title='发起任务' description='先选菜谱，再指定执行人。' />
      <PageHero
        badge='NEW ORDER'
        title='认真地点一道菜'
        description='先选今天想吃的，再把这份期待交给一位执行人。创建后，进度会安静地记录在任务详情里。'
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
        <AsyncContainer
          loading={recipesLoading && recipes.length === 0}
          data={recipes}
          skeleton={<View><SkeletonCard /><SkeletonCard /></View>}
          empty={<EmptyState tone='amber' title='暂无菜谱' description='先在空间里新建一个菜谱，再回来发起点餐任务。' />}
        >
          {(recipeList) => (
            <View>
              {recipeList.map((recipe: Recipe) => (
                <Pressable key={recipe.id} onClick={() => setSelectedRecipeId(recipe.id)}>
                  <View className={selectedRecipeId === recipe.id ? 'feature-list-card feature-list-card--amber' : 'feature-list-card'}>
                    <Text className='feature-list-card__title'>{recipe.name}</Text>
                    <Text className='feature-list-card__meta'>
                      {selectedRecipeId === recipe.id ? '已选中' : '点击选中'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </AsyncContainer>
      </SectionCard>

      <SectionCard
        title='选择执行人'
        description='执行人需要具备可接任务权限，才能被分配任务。'
        meta={`${assignees.length} 人可接任务`}
        variant='soft'
      >
        <AsyncContainer
          loading={membersLoading && assignees.length === 0}
          data={assignees}
          skeleton={<View><SkeletonCard /><SkeletonCard /></View>}
          empty={<EmptyState tone='rose' title='暂无可接任务成员' description='请先在成员设置里打开"可接任务"权限，再回来发起点餐。' />}
        >
          {(assigneeList) => (
            <View>
              {assigneeList.map((member) => {
                const subtitle = getAssigneeSubtitle(member)
                return (
                  <Pressable key={member.id} onClick={() => setSelectedAssigneeId(member.id)}>
                    <View className={selectedAssigneeId === member.id ? 'feature-list-card feature-list-card--rose' : 'feature-list-card'}>
                      <View className='flex items-center'>
                        <MemberAvatar className='mr-3' member={member} size='sm' />
                        <View>
                          <Text className='feature-list-card__title'>{getMemberDisplayName(member)}</Text>
                          {subtitle ? <Text className='mt-1 block text-sm text-slate-500'>{subtitle}</Text> : null}
                        </View>
                      </View>
                      <Text className='feature-list-card__meta'>
                        {selectedAssigneeId === member.id ? '已选中' : '点击选中'}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}
        </AsyncContainer>
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--primary'
          disabled={!selectedRecipeId || !selectedAssigneeId || submitting}
          loading={submitting}
          onClick={handleSubmit}
        >
          创建任务
        </Button>
      </BottomActionBar>
    </View>
  )
}
