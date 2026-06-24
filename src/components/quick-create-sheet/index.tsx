// QuickCreateSheet — 底部弹出式快速发起任务
// 一个弹窗内完成：选菜谱 → 选执行人 → 创建
import { useEffect, useMemo, useState } from 'react'
import { Button, Text, View, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import MemberAvatar from '@/components/member-avatar'
import { useMemberStore } from '@/stores/useMemberStore'
import { useRecipeStore } from '@/stores/useRecipeStore'
import { taskApi } from '@/services/api'
import type { Recipe } from '@shared/types'

import { getMemberDisplayName } from '@/utils/member'
import { showErrorToast } from '@/utils/error'
import './index.module.scss'

interface QuickCreateSheetProps {
  visible: boolean
  workspaceId: number
  /** 预选菜谱 ID — 提供后跳过选菜谱步骤，直接选执行人 */
  preSelectedRecipeId?: number
  onClose: () => void
  onCreated: (taskId: number) => void
}

export default function QuickCreateSheet({
  visible,
  workspaceId,
  preSelectedRecipeId,
  onClose,
  onCreated,
}: QuickCreateSheetProps) {
  const [step, setStep] = useState<'recipe' | 'assignee'>(
    preSelectedRecipeId ? 'assignee' : 'recipe',
  )
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(
    preSelectedRecipeId || null,
  )
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 从独立 Store 获取数据
  const recipes = useRecipeStore((s) => s.recipes)
  const refreshRecipes = useRecipeStore((s) => s.refreshRecipes)
  const members = useMemberStore((s) => s.members)
  const refreshMembers = useMemberStore((s) => s.refreshMembers)

  // 弹窗打开时加载数据
  useEffect(() => {
    if (visible && workspaceId) {
      setStep('recipe')
      setSelectedRecipeId(null)
      setSelectedAssigneeId(null)
      refreshRecipes(true)
      refreshMembers(true)
    }
  }, [visible, workspaceId, refreshRecipes, refreshMembers])

  const activeRecipes = useMemo(
    () => recipes.filter((r: Recipe) => (r as { status?: string }).status !== 'archived'),
    [recipes],
  )

  const assignees = useMemo(
    () => members.filter((m) => m.canAcceptTask),
    [members],
  )

  const selectedRecipe = activeRecipes.find((r) => r.id === selectedRecipeId)

  const handleCreate = async () => {
    if (!selectedRecipeId || !selectedAssigneeId || !workspaceId) return
    setSubmitting(true)
    try {
      Taro.showLoading({ title: '创建中...' })
      const task = await taskApi.create(workspaceId, selectedRecipeId, selectedAssigneeId)
      Taro.hideLoading()
      Taro.showToast({ title: '任务已创建', icon: 'success' })
      onCreated(task?.id || 0)
      onClose()
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <View className='qcs-mask' onClick={onClose}>
      <View className='qcs-sheet' onClick={(e) => e.stopPropagation()}>
        {/* 拖拽指示条 */}
        <View className='qcs-handle' />

        {/* 头部 */}
        <View className='qcs-header'>
          <Text className='qcs-title'>
            {step === 'recipe' ? '选择菜谱' : '选择执行人'}
          </Text>
          {step === 'assignee' && selectedRecipe ? (
            <Text className='qcs-subtitle'>菜谱：{selectedRecipe.name}</Text>
          ) : null}
        </View>

        {/* 步骤指示器 */}
        <View className='qcs-steps'>
          <View className={`qcs-step ${step === 'recipe' ? 'qcs-step--active' : 'qcs-step--done'}`}>
            <View className='qcs-step__dot'>1</View>
            <Text className='qcs-step__label'>选菜谱</Text>
          </View>
          <View className='qcs-step__line' />
          <View className={`qcs-step ${step === 'assignee' ? 'qcs-step--active' : ''}`}>
            <View className='qcs-step__dot'>2</View>
            <Text className='qcs-step__label'>选执行人</Text>
          </View>
        </View>

        {/* 内容区 */}
        <ScrollView className='qcs-body' scrollY>
          {step === 'recipe' ? (
            activeRecipes.length === 0 ? (
              <View className='qcs-empty'>
                <Text className='qcs-empty__icon'>菜</Text>
                <Text className='qcs-empty__text'>当前空间还没有菜谱</Text>
                <Button className='app-button app-button--secondary app-button--mini' onClick={() => {
                  onClose()
                  Taro.navigateTo({ url: `/pages/recipe-form/index?workspaceId=${workspaceId}` })
                }}>去新建菜谱</Button>
              </View>
            ) : (
              activeRecipes.map((recipe) => (
                <View
                  key={recipe.id}
                  className={`qcs-item ${selectedRecipeId === recipe.id ? 'qcs-item--selected' : ''}`}
                  onClick={() => {
                    setSelectedRecipeId(recipe.id)
                    setStep('assignee')
                  }}
                >
                  <View className='qcs-item__icon'>
                    {recipe.difficulty === 'easy' ? '易' : recipe.difficulty === 'hard' ? '难' : '常'}
                  </View>
                  <View className='qcs-item__content'>
                    <Text className='qcs-item__title'>{recipe.name}</Text>
                    <Text className='qcs-item__desc'>
                      {recipe.description || '暂无描述'} · {recipe.estimatedMinutes || '?'}分钟
                    </Text>
                  </View>
                  <View className='qcs-item__arrow'>→</View>
                </View>
              ))
            )
          ) : (
            assignees.length === 0 ? (
              <View className='qcs-empty'>
                <Text className='qcs-empty__icon'>人</Text>
                <Text className='qcs-empty__text'>暂无可接任务的成员</Text>
              </View>
            ) : (
              assignees.map((member) => (
                <View
                  key={member.id}
                  className={`qcs-item ${selectedAssigneeId === member.id ? 'qcs-item--selected' : ''}`}
                  onClick={() => setSelectedAssigneeId(member.id)}
                >
                  <MemberAvatar member={member} size='sm' />
                  <View className='qcs-item__content'>
                    <Text className='qcs-item__title'>{getMemberDisplayName(member)}</Text>
                  </View>
                  {selectedAssigneeId === member.id ? (
                    <View className='qcs-check'>✓</View>
                  ) : null}
                </View>
              ))
            )
          )}
        </ScrollView>

        {/* 底部操作 */}
        <View className='qcs-footer'>
          {step === 'assignee' ? (
            <View className='qcs-footer__row'>
              <Button className='app-button app-button--ghost' onClick={() => setStep('recipe')}>
                返回选菜谱
              </Button>
              <Button
                className='app-button app-button--primary'
                disabled={!selectedAssigneeId || submitting}
                loading={submitting}
                onClick={handleCreate}
              >
                创建任务
              </Button>
            </View>
          ) : (
            <Button className='app-button app-button--ghost' onClick={onClose}>
              取消
            </Button>
          )}
        </View>
      </View>
    </View>
  )
}
