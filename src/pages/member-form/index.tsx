import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Picker, Switch, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { groupApi } from '../../services/api'

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
    return <View className='p-5'>加载中...</View>
  }

  if (!member) {
    return <View className='p-5'>成员不存在</View>
  }

  return (
    <View className='min-h-screen bg-amber-50 px-4 py-5 pb-28'>
      <View className='mb-5 rounded-3xl bg-white p-5 shadow-sm'>
        <Text className='block text-xs uppercase tracking-wider text-amber-700'>
          Member Setting
        </Text>
        <Text className='mt-2 block text-2xl font-bold text-gray-900'>
          {member.user?.nickname || member.tag?.name || '未命名成员'}
        </Text>
        <Text className='mt-2 block text-sm text-gray-500'>
          {group?.name || '当前分组'} / 成员 ID：{member.id}
        </Text>
      </View>

      <View className='mb-5 rounded-3xl bg-white p-4 shadow-sm'>
        <Text className='mb-3 block text-lg font-semibold text-gray-900'>
          角色与状态
        </Text>

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
          <View className='mb-3 rounded-2xl border border-amber-100 px-4 py-4'>
            <Text className='block text-xs text-gray-500'>展示角色</Text>
            <Text className='mt-1 block text-base font-medium text-gray-900'>
              {roleOptions[roleIndexByValue[form.displayRole] || 0].label}
            </Text>
          </View>
        </Picker>

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
          <View className='rounded-2xl border border-amber-100 px-4 py-4'>
            <Text className='block text-xs text-gray-500'>成员状态</Text>
            <Text className='mt-1 block text-base font-medium text-gray-900'>
              {statusOptions[statusIndexByValue[form.status] || 0].label}
            </Text>
          </View>
        </Picker>
      </View>

      <View className='rounded-3xl bg-white p-4 shadow-sm'>
        <Text className='mb-3 block text-lg font-semibold text-gray-900'>
          权限开关
        </Text>
        <View>
          {permissionItems.map((item) => (
            <View
              key={item.key}
              className='mb-3 flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3'
            >
              <View className='flex-1 pr-3'>
                <Text className='block text-base font-medium text-gray-900'>
                  {item.title}
                </Text>
                <Text className='mt-1 block text-xs text-gray-500'>
                  {item.description}
                </Text>
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
      </View>

      <View className='fixed bottom-0 left-0 right-0 bg-white px-5 py-4 shadow-lg'>
        <Button type='primary' loading={saving} disabled={saving} onClick={handleSave}>
          保存成员设置
        </Button>
      </View>
    </View>
  )
}
