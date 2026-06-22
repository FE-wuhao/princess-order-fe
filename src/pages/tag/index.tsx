import { useCallback, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import StatusChip from '@/components/status-chip'
import SubPageHeader from '@/components/sub-page-header'
import { useRoleTemplateStore } from '@/stores/useRoleTemplateStore'
import { tagApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getRouteNumberParam, reLaunchToWorkspaceEntry } from '@/utils/router'
import type { WorkspaceRoleTemplate } from '@shared/types'

const roleOptions: Array<{ label: string; value: WorkspaceRoleTemplate['roleType'] }> = [
  { label: '点餐人', value: 'requester' },
  { label: '制作者', value: 'cook' },
  { label: '双角色', value: 'both' },
  { label: '中性', value: 'neutral' },
]

export default function Tag() {
  const roleTemplates = useRoleTemplateStore((s) => s.roleTemplates)
  const loading = useRoleTemplateStore((s) => s.roleTemplatesMeta.loading)
  const refreshRoleTemplates = useRoleTemplateStore((s) => s.refreshRoleTemplates)

  const router = useRouter()
  const workspaceId = getRouteNumberParam(router.params, 'workspaceId')

  const loadData = useCallback(async () => {
    if (!workspaceId) { reLaunchToWorkspaceEntry(); return }
    await refreshRoleTemplates(true)
  }, [workspaceId, refreshRoleTemplates])

  useEffect(() => { loadData() }, [loadData])
  useDidShow(() => { refreshRoleTemplates() })

  const handleCreate = async () => {
    const nameResult = await Taro.showModal({ title: '新建称谓模板', editable: true, placeholderText: '例如：管家、小厨、主厨', confirmText: '下一步' })
    if (!nameResult.confirm) return
    const name = nameResult.content?.trim()
    if (!name) { Taro.showToast({ title: '请输入模板名称', icon: 'none' }); return }

    const roleTypeResult = await Taro.showActionSheet({ itemList: roleOptions.map((o) => o.label) })
    const selectedRoleType = roleOptions[roleTypeResult.tapIndex]?.value
    if (!selectedRoleType) return

    try {
      Taro.showLoading({ title: '创建中...' })
      await tagApi.create(workspaceId, name, selectedRoleType)
      Taro.hideLoading()
      Taro.showToast({ title: '已创建', icon: 'success' })
      await refreshRoleTemplates(true)
    } catch (error) { Taro.hideLoading(); showErrorToast(error, '创建失败') }
  }

  const handleDelete = async (template: WorkspaceRoleTemplate) => {
    const result = await Taro.showModal({ title: '删除称谓模板', content: `确定删除「${template.name}」吗？`, confirmText: '删除' })
    if (!result.confirm) return
    try {
      Taro.showLoading({ title: '删除中...' })
      await tagApi.delete(workspaceId, template.id)
      Taro.hideLoading()
      Taro.showToast({ title: '已删除', icon: 'success' })
      await refreshRoleTemplates(true)
    } catch (error) { Taro.hideLoading(); showErrorToast(error, '删除失败') }
  }

  const roleLabel = (rt: WorkspaceRoleTemplate['roleType']) => roleOptions.find((o) => o.value === rt)?.label || '未定义'
  const roleTone = (rt: WorkspaceRoleTemplate['roleType']) =>
    rt === 'requester' ? 'warning' : rt === 'cook' ? 'accent' : rt === 'both' ? 'success' : ('neutral' as const)

  return (
    <View className='page-shell px-4 py-5'>
      <SubPageHeader title='称谓模板' description='沉淀空间内常用的身份叫法。' />
      <PageHero
        badge='Role Templates' title='称谓模板'
        description='称谓模板用于沉淀空间里的常用身份叫法，成员页会直接引用它。'
        tone='brand'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>模板数量</Text>
              <Text className='hero-stat-card__value'>{roleTemplates.length}</Text>
              <Text className='hero-stat-card__hint'>按空间维度维护</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>当前空间</Text>
              <Text className='hero-stat-card__value'>{workspaceId ? '已定位' : '未知'}</Text>
              <Text className='hero-stat-card__hint'>从空间页进入更准确</Text>
            </View>
          </View>
        }
        actions={<Button className='app-button app-button--primary' onClick={handleCreate}>新建模板</Button>}
      />

      <SectionCard title='模板列表' description='双角色适合既能发任务也能接任务的人。' meta={`${roleTemplates.length} 条`} variant='soft'>
        <AsyncContainer
          loading={loading && roleTemplates.length === 0}
          data={roleTemplates}
          skeleton={<View><SkeletonCard /><SkeletonCard /></View>}
          empty={<EmptyState tone='gray' title='暂无称谓模板' description='先从这里沉淀一套常用称谓，成员页会更好配置。' />}
        >
          {(templates) => (
            <View>
              {templates.map((tpl) => (
                <View key={tpl.id} className='feature-list-card'>
                  <View className='flex items-center justify-between'>
                    <Text className='feature-list-card__title'>{tpl.name}</Text>
                    <StatusChip label={roleLabel(tpl.roleType)} tone={roleTone(tpl.roleType)} />
                  </View>
                  <Text className='feature-list-card__meta'>{tpl.isDefault ? '默认模板' : '自定义模板'}</Text>
                  {!tpl.isDefault ? (
                    <View className='mt-3'>
                      <Button className='app-button app-button--ghost app-button--mini' onClick={() => handleDelete(tpl)}>删除模板</Button>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </AsyncContainer>
      </SectionCard>
    </View>
  )
}
