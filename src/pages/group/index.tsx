import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { groupApi } from '../../services/api'

interface GroupMember {
  id: number
  userId: number
  displayRole?: 'requester' | 'cook' | 'both'
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

interface GroupRecipe {
  id: number
  name: string
  status?: 'active' | 'archived'
  description?: string | null
}

interface GroupDetail {
  id: number
  name: string
  inviteCode?: string | null
  inviteExpiredAt?: string | null
  members: GroupMember[]
  recipes: GroupRecipe[]
}

const roleLabelMap: Record<NonNullable<GroupMember['displayRole']>, string> = {
  requester: '点餐人',
  cook: '制作者',
  both: '双角色',
}

export default function Group() {
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const groupId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.id || '0')
  }, [])

  const loadGroup = useCallback(async () => {
    setLoading(true)
    try {
      const data = await groupApi.getDetail(groupId)
      setGroup(data)
    } catch (error) {
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  const activeRecipes = useMemo(
    () => (group?.recipes || []).filter((recipe) => recipe.status !== 'archived'),
    [group],
  )

  const orderableMembers = useMemo(
    () => (group?.members || []).filter((member) => member.canAcceptOrder),
    [group],
  )

  const handleRecipeClick = (recipeId: number) => {
    Taro.navigateTo({
      url: `/pages/recipe/index?id=${recipeId}&groupId=${groupId}`,
    })
  }

  const handleCreateRecipe = () => {
    Taro.navigateTo({
      url: `/pages/recipe-form/index?groupId=${groupId}`,
    })
  }

  const handleOrderClick = () => {
    Taro.navigateTo({
      url: `/pages/order/index?groupId=${groupId}`,
    })
  }

  const handleTagClick = () => {
    Taro.navigateTo({
      url: `/pages/tag/index?groupId=${groupId}`,
    })
  }

  const handleMemberClick = (memberId: number) => {
    Taro.navigateTo({
      url: `/pages/member-form/index?groupId=${groupId}&memberId=${memberId}`,
    })
  }

  const handleRefreshInviteCode = async () => {
    try {
      Taro.showLoading({ title: '生成中...' })
      const invite = await groupApi.createInvite(groupId)
      Taro.hideLoading()
      setGroup((current) =>
        current
          ? {
              ...current,
              inviteCode: invite?.inviteCode || current.inviteCode,
              inviteExpiredAt: invite?.expiredAt || current.inviteExpiredAt,
            }
          : current,
      )
      Taro.showToast({
        title: '邀请码已更新',
        icon: 'success',
      })
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '生成失败',
        icon: 'none',
      })
    }
  }

  const handleCopyInviteCode = async () => {
    if (!group?.inviteCode) {
      Taro.showToast({
        title: '暂无邀请码',
        icon: 'none',
      })
      return
    }

    try {
      await Taro.setClipboardData({
        data: group.inviteCode,
      })
      Taro.showToast({
        title: '已复制邀请码',
        icon: 'success',
      })
    } catch (error) {
      Taro.showToast({
        title: '复制失败',
        icon: 'none',
      })
    }
  }

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  if (!group) {
    return <View className='p-5'>分组不存在</View>
  }

  return (
    <View className='min-h-screen bg-amber-50 px-4 py-5 pb-28'>
      <View className='mb-5 rounded-3xl bg-gradient-to-br from-amber-100 via-rose-100 to-white p-5 shadow-sm'>
        <Text className='block text-xs uppercase tracking-wider text-amber-700'>
          Group Space
        </Text>
        <Text className='mt-2 block text-2xl font-bold text-gray-900'>
          {group.name}
        </Text>
        <Text className='mt-2 block text-sm text-gray-600'>
          成员 {group.members?.length || 0} 人 / 可用菜谱 {activeRecipes.length} 个 /
          可接单成员 {orderableMembers.length} 人
        </Text>
      </View>

      <View className='mb-5 rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>加入方式</Text>
          <Button size='mini' onClick={handleRefreshInviteCode}>
            刷新邀请码
          </Button>
        </View>
        <View className='rounded-2xl bg-amber-50 px-4 py-4'>
          <Text className='block text-xs uppercase tracking-wider text-amber-700'>
            Invite Code
          </Text>
          <Text className='mt-2 block text-2xl font-bold tracking-widest text-gray-900'>
            {group.inviteCode || '暂未生成'}
          </Text>
          <Text className='mt-2 block text-xs text-gray-500'>
            {group.inviteExpiredAt
              ? `有效期至 ${group.inviteExpiredAt}`
              : '刷新一次就会生成新的邀请码'}
          </Text>
          <View className='mt-3'>
            <Button size='mini' onClick={handleCopyInviteCode}>
              复制邀请码
            </Button>
          </View>
        </View>
      </View>

      <View className='mb-5 rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>成员与角色</Text>
          <Button size='mini' onClick={handleTagClick}>
            标签
          </Button>
        </View>

        <View>
          {group.members?.map((member) => (
            <View
              key={member.id}
              className='mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3'
              onClick={() => handleMemberClick(member.id)}
            >
              <View className='flex items-center justify-between'>
                <Text className='text-base font-medium text-gray-900'>
                  {member.user?.nickname || member.tag?.name || '未命名成员'}
                </Text>
                <Text className='rounded-full bg-white px-2 py-1 text-xs text-amber-700'>
                  {member.displayRole ? roleLabelMap[member.displayRole] : '未定义'}
                </Text>
              </View>
              <Text className='mt-2 block text-xs text-gray-500'>
                {member.canCreateOrder ? '可发单' : '不可发单'} /{' '}
                {member.canAcceptOrder ? '可接单' : '不可接单'}
              </Text>
              <Text className='mt-1 block text-xs text-amber-700'>
                点击调整角色和权限
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className='rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-lg font-semibold text-gray-900'>菜谱库</Text>
          <View className='flex items-center gap-2'>
            <Text className='text-xs text-gray-500'>{activeRecipes.length} 个可用</Text>
            <Button size='mini' onClick={handleCreateRecipe}>
              新建
            </Button>
          </View>
        </View>

        {activeRecipes.length > 0 ? (
          <View>
            {activeRecipes.map((recipe) => (
              <View
                key={recipe.id}
                className='rounded-2xl border border-gray-100 px-4 py-4'
                onClick={() => handleRecipeClick(recipe.id)}
              >
                <Text className='block text-base font-medium text-gray-900'>
                  {recipe.name}
                </Text>
                <Text className='mt-1 block text-xs text-gray-500'>
                  {recipe.description || '进入查看做法、食材和 AI 补全结果'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500'>
            暂无菜谱，建议先补一个常做菜，再发起任务。
          </View>
        )}
      </View>

      <View className='fixed bottom-0 left-0 right-0 bg-white px-5 py-4 shadow-lg'>
        <Button
          type='primary'
          disabled={activeRecipes.length === 0 || orderableMembers.length === 0}
          onClick={handleOrderClick}
        >
          发起点餐任务
        </Button>
      </View>
    </View>
  )
}
