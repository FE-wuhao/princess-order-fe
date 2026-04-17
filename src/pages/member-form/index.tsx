import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Picker, Switch, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { groupApi } from '@/services/api'

interface GroupMember {
  id: number
  userId: number
  displayRole?: 'requester' | 'cook' | 'both'
  tagId?: number | null
  status?: 'active' | 'left' | 'removed'
  canManageGroup?: boolean
  canManageMembers?: boolean
  canManageRecipes?: boolean
  canCreateOrder?: boolean
  canAcceptOrder?: boolean
  user?: {
    id: number
    nickname?: string
  }
  tag?: {
    id: number
    name: string
  } | null
}

interface GroupDetail {
  id: number
  name: string
  members: GroupMember[]
}

interface MemberFormState {
  displayRole: 'requester' | 'cook' | 'both'
  status: 'active' | 'left' | 'removed'
  canManageGroup: boolean
  canManageMembers: boolean
  canManageRecipes: boolean
  canCreateOrder: boolean
  canAcceptOrder: boolean
}

const roleOptions: Array<{ label: string; value: MemberFormState['displayRole'] }> = [
  { label: '点餐人', value: 'requester' },
  { label: '制作者', value: 'cook' },
  { label: '双角色', value: 'both' },
]

const statusOptions: Array<{ label: string; value: MemberFormState['status'] }> = [
  { label: '正常', value: 'active' },
  { label: '已离开', value: 'left' },
  { label: '已移除', value: 'removed' },
]

const permissionItems: Array<{
  key: keyof Pick<
    MemberFormState,
    | 'canManageGroup'
    | 'canManageMembers'
    | 'canManageRecipes'
    | 'canCreateOrder'
    | 'canAcceptOrder'
  >
  title: string
  description: string
}> = [
  {
    key: 'canManageGroup',
    title: '管理分组',
    description: '可刷新邀请码、调整分组级配置',
  },
  {
    key: 'canManageMembers',
    title: '管理成员',
    description: '可调整成员角色、权限和成员状态',
  },
  {
    key: 'canManageRecipes',
    title: '管理菜谱',
    description: '可新增、编辑和归档菜谱',
  },
  {
    key: 'canCreateOrder',
    title: '发起点餐',
    description: '可创建新的点餐任务',
  },
  {
    key: 'canAcceptOrder',
    title: '接受制作',
    description: '可被指定为任务执行人',
  },
]

const roleIndexByValue = roleOptions.reduce<Record<string, number>>(
  (acc, option, index) => {
    acc[option.value] = index
    return acc
  },
  {},
)

const statusIndexByValue = statusOptions.reduce<Record<string, number>>(
  (acc, option, index) => {
    acc[option.value] = index
    return acc
  },
  {},
)

export default function MemberForm() {
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [member, setMember] = useState<GroupMember | null>(null)
  const [form, setForm] = useState<MemberFormState>({
    displayRole: 'cook',
    status: 'active',
    canManageGroup: false,
    canManageMembers: false,
    canManageRecipes: true,
    canCreateOrder: false,
    canAcceptOrder: true,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const params = useMemo(() => {
    const routerParams = Taro.getCurrentInstance().router?.params
    return {
      groupId: parseInt(routerParams?.groupId || '0'),
      memberId: parseInt(routerParams?.memberId || '0'),
    }
  }, [])

  const loadMember = useCallback(async () => {
    if (!params.groupId || !params.memberId) {
      return
    }

    setLoading(true)
    try {
      const data = await groupApi.getDetail(params.groupId)
      const currentMember = (data?.members || []).find(
        (item) => item.id === params.memberId,
      )

      if (!currentMember) {
        Taro.showToast({
          title: '成员不存在',
          icon: 'none',
        })
        return
      }

      setGroup(data)
      setMember(currentMember)
      setForm({
        displayRole: currentMember.displayRole || 'cook',
        status: currentMember.status || 'active',
        canManageGroup: Boolean(currentMember.canManageGroup),
        canManageMembers: Boolean(currentMember.canManageMembers),
        canManageRecipes: currentMember.canManageRecipes !== false,
        canCreateOrder: Boolean(currentMember.canCreateOrder),
        canAcceptOrder: currentMember.canAcceptOrder !== false,
      })
    } catch (error) {
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [params.groupId, params.memberId])

  useEffect(() => {
    loadMember()
  }, [loadMember])

  const updatePermission = (
    key: keyof Pick<
      MemberFormState,
      | 'canManageGroup'
      | 'canManageMembers'
      | 'canManageRecipes'
      | 'canCreateOrder'
      | 'canAcceptOrder'
    >,
    value: boolean,
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    if (saving) {
      return
    }

    if (!params.groupId || !params.memberId) {
      Taro.showToast({
        title: '参数错误',
        icon: 'none',
      })
      return
    }

    setSaving(true)
    try {
      await groupApi.updateMember(params.groupId, params.memberId, {
        ...form,
      })
      Taro.showToast({
        title: '已保存',
        icon: 'success',
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 500)
    } catch (error) {
      Taro.showToast({
        title: '保存失败',
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  if (!member) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <Text className='block text-center text-gray-500'>成员不存在</Text>
      </View>
    )
  }

  const displayName = member.user?.nickname || member.tag?.name || '未命名成员'

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <PageHero
        badge='Member Setting'
        title={displayName}
        description={`${group?.name || '当前分组'} · 成员 ID ${member.id}`}
        tone='sunset'
      />

      <SectionCard
        title='角色与状态'
        description='展示角色影响标签与发单体验，状态用于标记是否仍在协作中。'
        variant='accent'
      >
        <View className='form-field'>
          <Text className='form-label'>展示角色</Text>
          <Picker
            mode='selector'
            range={roleOptions.map((item) => item.label)}
            value={roleIndexByValue[form.displayRole] || 0}
            onChange={(event) => {
              const index = Number(event.detail.value)
              setForm((current) => ({
                ...current,
                displayRole: roleOptions[index]?.value || 'cook',
              }))
            }}
          >
            <View className='form-picker'>
              <Text className='form-picker__label'>当前选择</Text>
              <Text className='form-picker__value'>
                {roleOptions[roleIndexByValue[form.displayRole] || 0].label}
              </Text>
            </View>
          </Picker>
        </View>

        <View className='form-field'>
          <Text className='form-label'>成员状态</Text>
          <Picker
            mode='selector'
            range={statusOptions.map((item) => item.label)}
            value={statusIndexByValue[form.status] || 0}
            onChange={(event) => {
              const index = Number(event.detail.value)
              setForm((current) => ({
                ...current,
                status: statusOptions[index]?.value || 'active',
              }))
            }}
          >
            <View className='form-picker'>
              <Text className='form-picker__label'>当前选择</Text>
              <Text className='form-picker__value'>
                {statusOptions[statusIndexByValue[form.status] || 0].label}
              </Text>
            </View>
          </Picker>
        </View>
      </SectionCard>

      <SectionCard
        title='权限开关'
        description='按最小权限原则配置，需要时再逐步放开。'
        meta={`${permissionItems.length} 项`}
        variant='soft'
      >
        <View>
          {permissionItems.map((item) => (
            <View key={item.key} className='permission-row'>
              <View className='permission-row__text'>
                <Text className='permission-row__title'>{item.title}</Text>
                <Text className='permission-row__desc'>{item.description}</Text>
              </View>
              <Switch
                checked={Boolean(form[item.key])}
                onChange={(event) => {
                  updatePermission(item.key, Boolean(event.detail.value))
                }}
              />
            </View>
          ))}
        </View>
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--primary'
          loading={saving}
          disabled={saving}
          onClick={handleSave}
        >
          保存成员设置
        </Button>
      </BottomActionBar>
    </View>
  )
}
