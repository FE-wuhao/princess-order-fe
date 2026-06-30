import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { Button, Input, Picker, Switch, Text, View } from '@tarojs/components'
import AsyncContainer from '@/components/async-container'
import MemberAvatar from '@/components/member-avatar'
import Page from '@/components/page'
import Pressable from '@/components/pressable'
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

const rolePermissionPresets: Record<
  DisplayRole,
  Pick<MemberFormState, 'canCreateTask' | 'canAcceptTask'>
> = {
  requester: {
    canCreateTask: true,
    canAcceptTask: false,
  },
  cook: {
    canCreateTask: false,
    canAcceptTask: true,
  },
  both: {
    canCreateTask: true,
    canAcceptTask: true,
  },
}

const permissionGroups: Array<{
  title: string
  description: string
  items: Array<{ key: keyof MemberFormState; title: string; desc: string }>
}> = [
  {
    title: '任务权限',
    description: '决定这个成员能否参与日常点餐流转。',
    items: [
      { key: 'canCreateTask', title: '发起任务', desc: '可以选择菜谱并指派成员制作。' },
      { key: 'canAcceptTask', title: '接受制作', desc: '可以成为任务的执行成员。' },
    ],
  },
  {
    title: '内容管理',
    description: '控制空间里的菜谱资产维护。',
    items: [
      { key: 'canManageRecipes', title: '管理菜谱', desc: '可以新增、编辑或归档空间菜谱。' },
    ],
  },
  {
    title: '空间管理',
    description: '只建议给真正负责维护空间的人。',
    items: [
      { key: 'canManageMembers', title: '管理成员', desc: '可以调整成员角色、称呼和权限。' },
      { key: 'canManageWorkspace', title: '管理空间', desc: '可以维护空间级设置和高级管理能力。' },
    ],
  },
]

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
  const [removing, setRemoving] = useState(false)

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

  const handleSelectRole = (displayRole: DisplayRole) => {
    setForm((current) => ({
      ...current,
      displayRole,
      ...rolePermissionPresets[displayRole],
    }))
  }

  const handleRemoveMember = async () => {
    if (removing || !workspaceId || !memberId || !member) return

    const displayName = getMemberDisplayName(member)
    const result = await Taro.showModal({
      title: '移除成员',
      content: `确认将「${displayName}」移出当前空间吗？移除后对方将不能继续进入该空间。`,
      confirmText: '移除',
      confirmColor: '#c2415d',
    })
    if (!result.confirm) return

    setRemoving(true)
    try {
      Taro.showLoading({ title: '移除中...' })
      await workspaceApi.updateMember(workspaceId, memberId, { status: 'removed' })
      Taro.hideLoading()
      Taro.showToast({ title: '已移除', icon: 'success' })
      setTimeout(() => { Taro.navigateBack() }, 500)
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '移除失败')
    } finally {
      setRemoving(false)
    }
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

              <View className='member-form-panel'>
                <Text className='member-form-panel__title'>空间内称呼</Text>
                <Text className='member-form-panel__desc'>只在当前空间显示，用来替代昵称。</Text>
                <Input
                  className='form-control member-form-panel__input'
                  confirmType='done'
                  placeholder='空间内备注，例如：管家、小厨'
                  maxlength={50}
                  value={form.remark}
                  onConfirm={handleSave}
                  onInput={(e) => setForm((c) => ({ ...c, remark: e.detail.value }))}
                />
              </View>

              <View className='member-form-panel'>
                <View className='member-form-panel__header'>
                  <View>
                    <Text className='member-form-panel__title'>角色</Text>
                    <Text className='member-form-panel__desc'>角色影响成员在任务里的默认定位。</Text>
                  </View>
                </View>
                <View className='member-role-segment'>
                  {roleOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      className='member-role-segment__item-wrap'
                      onClick={() => handleSelectRole(option.value)}
                    >
                      <View
                        className={`member-role-segment__item ${
                          form.displayRole === option.value
                            ? 'member-role-segment__item--active'
                            : ''
                        }`}
                      >
                        <Text className='member-role-segment__label'>{option.label}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Text className='member-form-panel__note'>
                  切换角色会同步调整发起任务和接受制作权限，管理权限需单独设置。
                </Text>
              </View>

              <View className='member-status-row'>
                <View>
                  <Text className='member-status-row__label'>成员状态</Text>
                  <Text className='member-status-row__desc'>异常状态会影响成员继续参与空间。</Text>
                </View>
                <Picker mode='selector' range={statusOptions.map((o) => o.label)}
                  value={statusIndexByValue[form.status] || 0}
                  onChange={(e) => { const idx = Number(e.detail.value); setForm((c) => ({ ...c, status: statusOptions[idx]?.value || 'active' })) }}>
                  <View className='member-status-row__picker'>
                    <Text className='member-status-row__value'>{statusOptions[statusIndexByValue[form.status] || 0].label}</Text>
                  </View>
                </Picker>
              </View>

              <SectionCard title='权限' description='按使用场景分组，日常权限和管理权限分开看。' variant='soft'>
                <View className='member-permission-groups'>
                  {permissionGroups.map((group) => (
                    <View key={group.title} className='member-permission-group'>
                      <View className='member-permission-group__header'>
                        <Text className='member-permission-group__title'>{group.title}</Text>
                        <Text className='member-permission-group__desc'>{group.description}</Text>
                      </View>
                      {group.items.map((item) => (
                        <View key={item.key} className='permission-row member-permission-row'>
                          <View className='permission-row__text'>
                            <Text className='permission-row__title'>{item.title}</Text>
                            <Text className='permission-row__desc'>{item.desc}</Text>
                          </View>
                          <Switch checked={Boolean(form[item.key])}
                            onChange={(e) => setForm((c) => ({ ...c, [item.key]: Boolean(e.detail.value) }))} />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard title='成员操作' description='移除后该成员不再显示在当前空间成员列表中。' variant='warning'>
                <View className='member-danger-card'>
                  <View>
                    <Text className='member-danger-card__title'>移除成员</Text>
                    <Text className='member-danger-card__desc'>
                      需要成员管理权限。不能直接移除自己。
                    </Text>
                  </View>
                  <Button
                    className='app-button app-button--warn app-button--mini'
                    loading={removing}
                    disabled={removing}
                    onClick={handleRemoveMember}
                  >
                    移除
                  </Button>
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
