import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import MemberAvatar from '@/components/member-avatar'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { userApi, workspaceApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getMemberDisplayName, getMemberSubtitle } from '@/utils/member'
import { setPreferredWorkspaceId } from '@/utils/workspace'

interface WorkspaceMember {
  id: number
  userId: number
  remark?: string | null
  displayRole?: 'requester' | 'cook' | 'both'
  canCreateTask?: boolean
  canAcceptTask?: boolean
  user?: {
    id: number
    nickname?: string
    avatar?: string
  }
  tag?: {
    id: number
    name: string
  } | null
}

interface WorkspaceRecipe {
  id: number
  name: string
  status?: 'active' | 'archived'
  description?: string | null
}

interface WorkspaceDetail {
  id: number
  name: string
  inviteCode?: string | null
  inviteExpiredAt?: string | null
  members: WorkspaceMember[]
  recipes: WorkspaceRecipe[]
}

const roleLabelMap: Record<NonNullable<WorkspaceMember['displayRole']>, string> = {
  requester: '点餐人',
  cook: '制作者',
  both: '双角色',
}

const formatInviteExpiry = (value?: string | null) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Group() {
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(0)
  const [myRemarkDraft, setMyRemarkDraft] = useState('')
  const [savingMyRemark, setSavingMyRemark] = useState(false)

  const workspaceId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.workspaceId || params?.id || '0')
  }, [])

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    try {
      const [data, profile] = await Promise.all([
        workspaceApi.getDetail(workspaceId),
        userApi.getProfile(),
      ])
      setPreferredWorkspaceId(workspaceId)
      setWorkspace(data)
      setCurrentUserId(profile?.id || 0)
      const myMember = (data?.members || []).find(
        (member: WorkspaceMember) => member.userId === profile?.id,
      )
      setMyRemarkDraft(myMember?.remark || '')
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  const activeRecipes = useMemo(
    () => (workspace?.recipes || []).filter((recipe) => recipe.status !== 'archived'),
    [workspace],
  )

  const orderableMembers = useMemo(
    () => (workspace?.members || []).filter((member) => member.canAcceptTask),
    [workspace],
  )

  const handleRecipeClick = (recipeId: number) => {
    Taro.navigateTo({
      url: `/pages/recipe/index?id=${recipeId}&workspaceId=${workspaceId}`,
    })
  }

  const handleCreateRecipe = () => {
    Taro.navigateTo({
      url: `/pages/recipe-form/index?workspaceId=${workspaceId}`,
    })
  }

  const handleTaskComposerClick = () => {
    Taro.navigateTo({
      url: `/pages/order/index?workspaceId=${workspaceId}`,
    })
  }

  const handleMemberClick = (memberId: number) => {
    Taro.navigateTo({
      url: `/pages/member-form/index?workspaceId=${workspaceId}&memberId=${memberId}`,
    })
  }

  const handleRoleTemplateClick = () => {
    Taro.navigateTo({
      url: `/pages/tag/index?workspaceId=${workspaceId}`,
    })
  }

  const handleSaveMyRemark = async () => {
    if (savingMyRemark) {
      return
    }

    setSavingMyRemark(true)
    try {
      Taro.showLoading({ title: '保存中...' })
      await workspaceApi.updateMyRemark(workspaceId, myRemarkDraft.trim() || null)
      Taro.hideLoading()
      Taro.showToast({
        title: '备注已保存',
        icon: 'success',
      })
      await loadWorkspace()
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '保存失败')
    } finally {
      setSavingMyRemark(false)
    }
  }

  const handleRefreshInviteCode = async () => {
    try {
      Taro.showLoading({ title: '生成中...' })
      const invite = await workspaceApi.createInvite(workspaceId)
      Taro.hideLoading()
      setWorkspace((current) =>
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
    if (!workspace?.inviteCode) {
      Taro.showToast({
        title: '暂无邀请码',
        icon: 'none',
      })
      return
    }

    try {
      await Taro.setClipboardData({
        data: workspace.inviteCode,
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

  if (!workspace) {
    return <View className='p-5'>空间不存在</View>
  }

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <PageHero
        badge='Workspace'
        title={workspace.name}
        description={`成员 ${workspace.members?.length || 0} 人，可用菜谱 ${activeRecipes.length} 个，可接任务成员 ${orderableMembers.length} 人。`}
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>协作成员</Text>
              <Text className='hero-stat-card__value'>{workspace.members?.length || 0}</Text>
              <Text className='hero-stat-card__hint'>按角色管理发任务和接任务权限</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>可用菜谱</Text>
              <Text className='hero-stat-card__value'>{activeRecipes.length}</Text>
              <Text className='hero-stat-card__hint'>常做菜集中沉淀，发任务更快</Text>
            </View>
          </View>
        }
      />

      <SectionCard
        title='加入方式'
        description='邀请码是这个空间最重要的外部入口，单独做成重点模块。'
        actions={
          <Button
            className='app-button app-button--secondary app-button--mini'
            onClick={handleRefreshInviteCode}
          >
            刷新邀请码
          </Button>
        }
        variant='accent'
      >
        <View className='feature-list-card feature-list-card--amber'>
          <Text className='feature-list-card__meta'>Invite Code</Text>
          <Text className='page-hero__title'>{workspace.inviteCode || '暂未生成'}</Text>
          <Text className='feature-list-card__description'>
            {workspace.inviteExpiredAt
              ? `有效期至 ${formatInviteExpiry(workspace.inviteExpiredAt)}，过期后你再次打开空间页会自动更新`
              : '刷新一次就会生成新的邀请码，适合分享给新成员。'}
          </Text>
          <View className='mt-3'>
            <Button
              className='app-button app-button--ghost app-button--mini'
              onClick={handleCopyInviteCode}
            >
              复制邀请码
            </Button>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title='成员与角色'
        description='展示头像、空间备注和角色权限；管理员可点成员进入详细设置。'
        actions={
          <Button
            className='app-button app-button--ghost app-button--mini'
            onClick={handleRoleTemplateClick}
          >
            称谓模板
          </Button>
        }
      >
        {currentUserId ? (
          <View className='feature-list-card feature-list-card--sky mb-3'>
            <Text className='feature-list-card__title'>我在本空间的称呼</Text>
            <Text className='feature-list-card__description'>
              只影响当前空间里的展示，例如「管家」「小厨」。
            </Text>
            <Input
              className='mt-3 rounded-2xl bg-white/80 px-4 py-3 text-base text-slate-700'
              maxlength={50}
              placeholder='可选，留空则显示昵称'
              value={myRemarkDraft}
              onInput={(event) => setMyRemarkDraft(event.detail.value)}
            />
            <View className='mt-3'>
              <Button
                className='app-button app-button--secondary app-button--mini'
                loading={savingMyRemark}
                disabled={savingMyRemark}
                onClick={handleSaveMyRemark}
              >
                保存我的备注
              </Button>
            </View>
          </View>
        ) : null}

        <View>
          {workspace.members?.map((member) => {
            const subtitle = getMemberSubtitle(member)

            return (
              <View
                key={member.id}
                className='feature-list-card feature-list-card--rose'
                onClick={() => handleMemberClick(member.id)}
              >
                <View className='flex items-center justify-between'>
                  <View className='flex items-center'>
                    <MemberAvatar className='mr-3' member={member} size='md' />
                    <View>
                      <Text className='feature-list-card__title'>
                        {getMemberDisplayName(member)}
                      </Text>
                      {subtitle ? (
                        <Text className='mt-1 block text-sm text-slate-500'>{subtitle}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text className='tool-pill'>
                    {member.displayRole ? roleLabelMap[member.displayRole] : '未定义'}
                  </Text>
                </View>
                <Text className='feature-list-card__description'>
                  {member.canCreateTask ? '可发任务' : '不可发任务'} /{' '}
                  {member.canAcceptTask ? '可接任务' : '不可接任务'}
                </Text>
                <Text className='feature-list-card__meta'>点击调整角色、权限和成员备注</Text>
              </View>
            )
          })}
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
                <Text className='feature-list-card__meta'>点进详情继续编辑和发起任务</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='amber'
            title='暂无菜谱'
            description='建议先补一个常做菜，再发起任务，整个空间的协作效率会更高。'
          />
        )}
      </SectionCard>

      <BottomActionBar>
        <Button
          className='app-button app-button--primary'
          disabled={activeRecipes.length === 0 || orderableMembers.length === 0}
          onClick={handleTaskComposerClick}
        >
          发起任务
        </Button>
      </BottomActionBar>
    </View>
  )
}
