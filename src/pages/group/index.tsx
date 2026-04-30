import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { groupApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'

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
      showErrorToast(error, '加载失败')
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
      showErrorToast(error, '生成失败')
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
      showErrorToast(error, '复制失败')
    }
  }

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  if (!group) {
    return <View className='p-5'>分组不存在</View>
  }

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <PageHero
        badge='Group Space'
        title={group.name}
        description={`成员 ${group.members?.length || 0} 人，可用菜谱 ${activeRecipes.length} 个，可接单成员 ${orderableMembers.length} 人。`}
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>协作成员</Text>
              <Text className='hero-stat-card__value'>{group.members?.length || 0}</Text>
              <Text className='hero-stat-card__hint'>按角色管理发单和接单权限</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>可用菜谱</Text>
              <Text className='hero-stat-card__value'>{activeRecipes.length}</Text>
              <Text className='hero-stat-card__hint'>常做菜集中沉淀，发单更快</Text>
            </View>
          </View>
        }
      />

      <SectionCard
        title='加入方式'
        description='邀请码是这个分组最重要的外部入口，单独做成重点模块。'
        actions={
          <Button className='app-button app-button--secondary app-button--mini' onClick={handleRefreshInviteCode}>
            刷新邀请码
          </Button>
        }
        variant='accent'
      >
        <View className='feature-list-card feature-list-card--amber'>
          <Text className='feature-list-card__meta'>Invite Code</Text>
          <Text className='page-hero__title'>{group.inviteCode || '暂未生成'}</Text>
          <Text className='feature-list-card__description'>
            {group.inviteExpiredAt
              ? `有效期至 ${group.inviteExpiredAt}`
              : '刷新一次就会生成新的邀请码，适合分享给新成员。'}
          </Text>
          <View className='mt-3'>
            <Button className='app-button app-button--ghost app-button--mini' onClick={handleCopyInviteCode}>
              复制邀请码
            </Button>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title='成员与角色'
        description='把可发单、可接单和角色信息放在同一块，方便快速调整。'
        actions={
          <Button className='app-button app-button--ghost app-button--mini' onClick={handleTagClick}>
            标签管理
          </Button>
        }
      >
        <View>
          {group.members?.map((member) => (
            <View
              key={member.id}
              className='feature-list-card feature-list-card--rose'
              onClick={() => handleMemberClick(member.id)}
            >
              <View className='flex items-center justify-between'>
                <Text className='feature-list-card__title'>
                  {member.user?.nickname || member.tag?.name || '未命名成员'}
                </Text>
                <Text className='tool-pill'>
                  {member.displayRole ? roleLabelMap[member.displayRole] : '未定义'}
                </Text>
              </View>
              <Text className='feature-list-card__description'>
                {member.canCreateOrder ? '可发单' : '不可发单'} /{' '}
                {member.canAcceptOrder ? '可接单' : '不可接单'}
              </Text>
              <Text className='feature-list-card__meta'>点击调整角色、权限和标签归属</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title='菜谱库'
        description='让菜谱区域更像内容资产库，而不是普通列表。'
        actions={
          <Button className='app-button app-button--primary app-button--mini' onClick={handleCreateRecipe}>
            新建菜谱
          </Button>
        }
        meta={`${activeRecipes.length} 个可用`}
        variant='soft'
      >
        {activeRecipes.length > 0 ? (
          <View>
            {activeRecipes.map((recipe) => (
              <View
                key={recipe.id}
                className='feature-list-card feature-list-card--sky'
                onClick={() => handleRecipeClick(recipe.id)}
              >
                <Text className='feature-list-card__title'>{recipe.name}</Text>
                <Text className='feature-list-card__description'>
                  {recipe.description || '进入查看做法、食材和 AI 补全结果'}
                </Text>
                <Text className='feature-list-card__meta'>点进详情继续编辑和发起点餐</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='amber'
            title='暂无菜谱'
            description='建议先补一个常做菜，再发起任务，整个分组的协作效率会更高。'
          />
        )}
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--primary'
          disabled={activeRecipes.length === 0 || orderableMembers.length === 0}
          onClick={handleOrderClick}
        >
          发起点餐任务
        </Button>
      </BottomActionBar>
    </View>
  )
}
