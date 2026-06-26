import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import EmptyState from '@/components/empty-state'
import MemberAvatar from '@/components/member-avatar'
import Page from '@/components/page'
import Pressable from '@/components/pressable'
import ReadyFooter from '@/components/ready-footer'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
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
  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId],
  )
  const selectedAssignee = useMemo(
    () => assignees.find((m) => m.id === selectedAssigneeId) || null,
    [assignees, selectedAssigneeId],
  )
  const ready = Boolean(selectedRecipe) && Boolean(selectedAssignee)
  const footer = (
    <ReadyFooter
      hint={
        ready
          ? `已选：${selectedRecipe?.name || ''} · ${selectedAssignee ? getMemberDisplayName(selectedAssignee) : ''}`
          : selectedRecipe
          ? `已选菜谱：${selectedRecipe.name}，再选一位执行人`
          : '请选择菜谱和执行人'
      }
    >
      <Button
        className='app-button app-button--primary'
        disabled={!ready || submitting}
        loading={submitting}
        onClick={handleSubmit}
      >
        创建任务
      </Button>
    </ReadyFooter>
  )

  return (
    <Page title='发起任务' tone='sunset' footer={footer}>
      <SectionCard title='选择菜谱' meta={`${recipes.length} 个可用`} variant='accent'>
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

      <SectionCard title='选择执行人' meta={`${assignees.length} 人可接任务`} variant='soft'>
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
    </Page>
  )
}
