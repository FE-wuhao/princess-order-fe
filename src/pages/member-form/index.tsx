import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Input, Picker, Switch, Text, View } from '@tarojs/components'
import AsyncContainer from '@/components/async-container'
import MemberAvatar from '@/components/member-avatar'
import Page from '@/components/page'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import { workspaceApi } from '@/services/api'
import type { WorkspaceMemberView } from '@/services/workspace.api'
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

// 高优先级权限置顶
const permissionItems: Array<{ key: keyof MemberFormState; title: string }> = [
  { key: 'canCreateTask', title: '发起任务' },
  { key: 'canAcceptTask', title: '接受制作' },
  { key: 'canManageRecipes', title: '管理菜谱' },
  { key: 'canManageMembers', title: '管理成员' },
  { key: 'canManageWorkspace', title: '管理空间' },
]

const roleIndexByValue = roleOptions.reduce<Record<string, number>>((acc, o, i) => { acc[o.value] = i; return acc }, {} as Record<string, number>)
const statusIndexByValue = statusOptions.reduce<Record<string, number>>((acc, o, i) => { acc[o.value] = i; return acc }, {} as Record<string, number>)

export default function MemberForm() {
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
      tone='sunset'
      topSpacerMode='header'
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
              {/* 识别条 — 紧凑，不占大标题位 */}
              <View className='member-form-identity'>
                <MemberAvatar member={m} size='md' />
                <View className='member-form-identity__text'>
                  <Text className='member-form-identity__name'>{displayName}</Text>
                  {subtitle ? <Text className='member-form-identity__subtitle'>{subtitle}</Text> : null}
                </View>
              </View>

              {/* 空间内备注 — 主输入 */}
              <View className='recipe-primary-name'>
                <Input
                  className='recipe-primary-name__input'
                  confirmType='done'
                  placeholder='空间内备注，例如：管家、小厨'
                  placeholderClass='recipe-primary-name__placeholder'
                  maxlength={50}
                  value={form.remark}
                  onConfirm={handleSave}
                  onInput={(e) => setForm((c) => ({ ...c, remark: e.detail.value }))}
                />
              </View>

              {/* 角色与状态 — 属性条 */}
              <View className='recipe-attr-bar'>
                <Picker mode='selector' range={roleOptions.map((o) => o.label)}
                  value={roleIndexByValue[form.displayRole] || 0}
                  onChange={(e) => { const idx = Number(e.detail.value); setForm((c) => ({ ...c, displayRole: roleOptions[idx]?.value || 'cook' })) }}>
                  <View className='recipe-attr-bar__field'>
                    <Text className='recipe-attr-bar__field-label'>角色</Text>
                    <Text className='recipe-attr-bar__picker'>{roleOptions[roleIndexByValue[form.displayRole] || 0].label}</Text>
                  </View>
                </Picker>
                <Picker mode='selector' range={statusOptions.map((o) => o.label)}
                  value={statusIndexByValue[form.status] || 0}
                  onChange={(e) => { const idx = Number(e.detail.value); setForm((c) => ({ ...c, status: statusOptions[idx]?.value || 'active' })) }}>
                  <View className='recipe-attr-bar__field'>
                    <Text className='recipe-attr-bar__field-label'>状态</Text>
                    <Text className='recipe-attr-bar__picker'>{statusOptions[statusIndexByValue[form.status] || 0].label}</Text>
                  </View>
                </Picker>
              </View>

              {/* 权限 — 紧凑开关，无 desc */}
              <SectionCard title='权限' meta={`${permissionItems.length} 项`} variant='soft'>
                <View>
                  {permissionItems.map((item) => (
                    <View key={item.key} className='permission-row permission-row--compact'>
                      <Text className='permission-row__title'>{item.title}</Text>
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
