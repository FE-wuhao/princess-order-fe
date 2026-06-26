import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Input, Picker, Switch, Text, View } from '@tarojs/components'
import AsyncContainer from '@/components/async-container'
import FormField from '@/components/form-field'
import MemberAvatar from '@/components/member-avatar'
import Page from '@/components/page'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import { workspaceApi } from '@/services/api'
import type { WorkspaceMemberView } from '@/services/workspace.api'
import type { Workspace } from '@shared/types'
import { showErrorToast } from '@/utils/error'
import { getMemberDisplayName, getMemberSubtitle } from '@/utils/member'
import { getRouteNumberParam, reLaunchToWorkspaceEntry } from '@/utils/router'

type DisplayRole = 'requester' | 'cook' | 'both'
type MemberStatus = 'active' | 'left' | 'removed'

interface MemberFormState {
  remark: string
  displayRole: DisplayRole
  status: MemberStatus
  canManageWorkspace: boolean
  canManageMembers: boolean
  canManageRecipes: boolean
  canCreateTask: boolean
  canAcceptTask: boolean
}

const roleOptions: Array<{ label: string; value: DisplayRole }> = [
  { label: '点餐人', value: 'requester' },
  { label: '制作者', value: 'cook' },
  { label: '双角色', value: 'both' },
]

const statusOptions: Array<{ label: string; value: MemberStatus }> = [
  { label: '正常', value: 'active' },
  { label: '已离开', value: 'left' },
  { label: '已移除', value: 'removed' },
]

const permissionItems: Array<{ key: keyof MemberFormState; title: string; description: string }> = [
  { key: 'canManageWorkspace', title: '管理空间', description: '可刷新邀请码、调整空间级配置' },
  { key: 'canManageMembers', title: '管理成员', description: '可调整成员角色、权限和成员状态' },
  { key: 'canManageRecipes', title: '管理菜谱', description: '可新增、编辑和归档菜谱' },
  { key: 'canCreateTask', title: '发起任务', description: '可创建新的点餐任务' },
  { key: 'canAcceptTask', title: '接受制作', description: '可被指定为任务执行人' },
]

const roleIndexByValue = roleOptions.reduce<Record<string, number>>((acc, o, i) => { acc[o.value] = i; return acc }, {} as Record<string, number>)
const statusIndexByValue = statusOptions.reduce<Record<string, number>>((acc, o, i) => { acc[o.value] = i; return acc }, {} as Record<string, number>)

export default function MemberForm() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [member, setMember] = useState<WorkspaceMemberView | null>(null)
  const [form, setForm] = useState<MemberFormState>({
    remark: '', displayRole: 'cook', status: 'active',
    canManageWorkspace: false, canManageMembers: false, canManageRecipes: true,
    canCreateTask: false, canAcceptTask: true,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const router = useRouter()
  const workspaceId = getRouteNumberParam(router.params, 'workspaceId')
  const memberId = getRouteNumberParam(router.params, 'memberId')

  const loadMember = useCallback(async () => {
    if (!workspaceId || !memberId) { reLaunchToWorkspaceEntry(); return }
    setLoading(true)
    try {
      const data = await workspaceApi.getDetail(workspaceId)
      const currentMember = ((data?.members || []) as WorkspaceMemberView[]).find((item) => item.id === memberId)
      if (!currentMember) { Taro.showToast({ title: '成员不存在', icon: 'none' }); return }
      setWorkspace(data)
      setMember(currentMember)
      setForm({
        remark: currentMember.remark || '',
        displayRole: (currentMember.displayRole as DisplayRole) || 'cook',
        status: (currentMember.status as MemberStatus) || 'active',
        canManageWorkspace: Boolean(currentMember.canManageWorkspace),
        canManageMembers: Boolean(currentMember.canManageMembers),
        canManageRecipes: currentMember.canManageRecipes !== false,
        canCreateTask: Boolean(currentMember.canCreateTask),
        canAcceptTask: currentMember.canAcceptTask !== false,
      })
    } catch (error) { showErrorToast(error, '加载失败') }
    finally { setLoading(false) }
  }, [memberId, workspaceId])

  useEffect(() => { loadMember() }, [loadMember])
  useDidShow(() => { loadMember() })

  const handleSave = async () => {
    if (saving || !workspaceId || !memberId) return
    setSaving(true)
    try {
      await workspaceApi.updateMember(workspaceId, memberId, { ...form, remark: form.remark.trim() || null })
      Taro.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => { Taro.navigateBack() }, 500)
    } catch (error) { showErrorToast(error, '保存失败') }
    finally { setSaving(false) }
  }

  const footer = (
    <Button className='app-button app-button--primary' loading={saving} disabled={saving} onClick={handleSave}>
      保存成员设置
    </Button>
  )

  return (
    <Page
      title='成员设置'
      description='调整空间内备注、角色、状态和权限。'
      tone='sunset'
      footer={footer}
    >
      <AsyncContainer
        loading={loading}
        data={member}
        skeleton={<View><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>}
        empty={<EmptyStatePlaceholder />}
      >
        {(m) => {
          const displayName = getMemberDisplayName(m)
          const subtitle = getMemberSubtitle(m)
          return (
            <View>
              <PageHero badge='Member Setting' title={displayName}
                description={`${workspace?.name || '当前空间'} · 成员 ID ${m.id}`} tone='sunset' />

              <SectionCard title='成员资料' description='空间内备注会覆盖昵称显示。' variant='accent'>
                <View className='feature-list-card feature-list-card--rose'>
                  <View className='flex items-center'>
                    <MemberAvatar className='mr-3' member={m} size='lg' />
                    <View>
                      <Text className='feature-list-card__title'>{displayName}</Text>
                      {subtitle ? <Text className='mt-1 block text-sm text-slate-500'>{subtitle}</Text> : null}
                    </View>
                  </View>
                  <Text className='mt-4 block feature-list-card__meta'>空间内备注</Text>
                  <Input className='form-control form-control--on-tint mt-2' maxlength={50} confirmType='done'
                    placeholder='例如：管家、小厨、对象' value={form.remark}
                    onConfirm={handleSave} onInput={(e) => setForm((c) => ({ ...c, remark: e.detail.value }))} />
                </View>
              </SectionCard>

              <SectionCard title='角色与状态' description='展示角色影响标签与发单体验。' variant='accent'>
                <FormField label='展示角色'>
                  <Picker mode='selector' range={roleOptions.map((o) => o.label)}
                    value={roleIndexByValue[form.displayRole] || 0}
                    onChange={(e) => { const idx = Number(e.detail.value); setForm((c) => ({ ...c, displayRole: roleOptions[idx]?.value || 'cook' })) }}>
                    <View className='form-picker'>
                      <Text className='form-picker__value'>{roleOptions[roleIndexByValue[form.displayRole] || 0].label}</Text>
                    </View>
                  </Picker>
                </FormField>
                <FormField label='成员状态'>
                  <Picker mode='selector' range={statusOptions.map((o) => o.label)}
                    value={statusIndexByValue[form.status] || 0}
                    onChange={(e) => { const idx = Number(e.detail.value); setForm((c) => ({ ...c, status: statusOptions[idx]?.value || 'active' })) }}>
                    <View className='form-picker'>
                      <Text className='form-picker__value'>{statusOptions[statusIndexByValue[form.status] || 0].label}</Text>
                    </View>
                  </Picker>
                </FormField>
              </SectionCard>

              <SectionCard title='权限开关' description='按最小权限原则配置。' meta={`${permissionItems.length} 项`} variant='soft'>
                <View>
                  {permissionItems.map((item) => (
                    <View key={item.key} className='permission-row'>
                      <View className='permission-row__text'>
                        <Text className='permission-row__title'>{item.title}</Text>
                        <Text className='permission-row__desc'>{item.description}</Text>
                      </View>
                      <Switch checked={Boolean(form[item.key])}
                        onChange={(e) => setForm((c) => ({ ...c, [item.key]: Boolean(e.detail.value) }))} />
                    </View>
                  ))}
                </View>
              </SectionCard>
            </View>
          )
        }}
      </AsyncContainer>
    </Page>
  )
}

// 内联占位组件
function EmptyStatePlaceholder() {
  return (
    <Text className='block text-center text-gray-500'>成员不存在</Text>
  )
}
