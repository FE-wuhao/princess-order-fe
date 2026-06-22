import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import AsyncContainer from '@/components/async-container'
import BottomActionBar from '@/components/bottom-action-bar'
import EmptyState from '@/components/empty-state'
import MemberAvatar from '@/components/member-avatar'
import PageHero from '@/components/page-hero'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard, SkeletonHero } from '@/components/skeleton'
import SubPageHeader from '@/components/sub-page-header'
import { userApi, workspaceApi } from '@/services/api'
import type { WorkspaceMemberView } from '@/services/workspace.api'
import type { Workspace } from '@shared/types'
import { showErrorToast } from '@/utils/error'
import { getMemberDisplayName } from '@/utils/member'
import { getRouteNumberParam, reLaunchToWorkspaceEntry } from '@/utils/router'
import { setPreferredWorkspaceId } from '@/utils/workspace'

const roleLabelMap: Record<string, string> = {
  requester: '点餐人', cook: '制作者', both: '双角色',
}

const formatInviteExpiry = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const getWorkspaceMemberSubtitle = (member: WorkspaceMemberView) => {
  const nickname = member.user?.nickname?.trim()
  const remark = member.remark?.trim()
  const tagName = member.tag?.name?.trim()
  if (remark && nickname && remark !== nickname) return `昵称：${nickname}`
  if (tagName && tagName !== remark && tagName !== nickname) return `称谓模板：${tagName}`
  return ''
}

export default function Group() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(0)
  const [myRemarkDraft, setMyRemarkDraft] = useState('')
  const [savingMyRemark, setSavingMyRemark] = useState(false)

  const router = useRouter()
  const workspaceId = getRouteNumberParam(router.params, 'workspaceId', 'id')

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) { reLaunchToWorkspaceEntry(); return }
    setLoading(true)
    try {
      const data = await workspaceApi.getDetail(workspaceId)
      const profile = await userApi.getProfile()
      setPreferredWorkspaceId(data?.id || workspaceId)
      setWorkspace(data)
      setCurrentUserId(profile?.id || 0)
      const myMember = ((data?.members || []) as WorkspaceMemberView[]).find((m) => m.userId === profile?.id)
      setMyRemarkDraft(myMember?.remark || '')
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { loadWorkspace() }, [loadWorkspace])

  const members = (workspace?.members || []) as WorkspaceMemberView[]
  const recipes = (workspace?.recipes || []) as Array<{ id: number; name: string; status?: string; description?: string | null }>
  const activeRecipes = useMemo(() => recipes.filter((r) => r.status !== 'archived'), [recipes])
  const orderableMembers = useMemo(() => members.filter((m) => m.canAcceptTask), [members])

  const handleRecipeClick = (recipeId: number) => { Taro.navigateTo({ url: `/pages/recipe/index?id=${recipeId}&workspaceId=${workspaceId}` }) }
  const handleMemberClick = (memberId: number) => { Taro.navigateTo({ url: `/pages/member-form/index?workspaceId=${workspaceId}&memberId=${memberId}` }) }

  const handleSaveMyRemark = async () => {
    if (savingMyRemark) return
    setSavingMyRemark(true)
    try {
      Taro.showLoading({ title: '保存中...' })
      await workspaceApi.updateMyRemark(workspaceId, myRemarkDraft.trim() || null)
      Taro.hideLoading()
      Taro.showToast({ title: '备注已保存', icon: 'success' })
      await loadWorkspace()
    } catch (error) { Taro.hideLoading(); showErrorToast(error, '保存失败') }
    finally { setSavingMyRemark(false) }
  }

  const handleRefreshInviteCode = async () => {
    try {
      Taro.showLoading({ title: '生成中...' })
      const invite = await workspaceApi.createInvite(workspaceId)
      Taro.hideLoading()
      setWorkspace((cur) => cur ? { ...cur, inviteCode: invite?.inviteCode || cur.inviteCode, inviteExpiredAt: invite?.expiredAt || cur.inviteExpiredAt } as Workspace : cur)
      Taro.showToast({ title: '邀请码已更新', icon: 'success' })
    } catch (error) { Taro.hideLoading(); showErrorToast(error, '生成失败') }
  }

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <AsyncContainer
        loading={loading}
        data={workspace}
        skeleton={<View><SkeletonHero /><SkeletonCard /><SkeletonCard /></View>}
        empty={<EmptyState tone='gray' title='空间不存在' description='该空间可能已被删除。' />}
      >
        {(ws) => (
          <View>
            <SubPageHeader title={ws.name} description='成员、邀请码、菜谱和任务入口都收在这个空间工作台里。' />
            <PageHero
              badge='Workspace'
              title={ws.name}
              description={`成员 ${members.length} 人，可用菜谱 ${activeRecipes.length} 个，可接任务成员 ${orderableMembers.length} 人。`}
              tone='sunset'
              stats={
                <View className='hero-stat-grid'>
                  <View className='hero-stat-card'>
                    <Text className='hero-stat-card__label'>协作成员</Text>
                    <Text className='hero-stat-card__value'>{members.length}</Text>
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

            <SectionCard title='加入方式' description='邀请码是这个空间最重要的外部入口。'
              actions={<Button className='app-button app-button--secondary app-button--mini' onClick={handleRefreshInviteCode}>刷新邀请码</Button>}
              variant='accent'
            >
              <View className='feature-list-card feature-list-card--amber'>
                <Text className='feature-list-card__meta'>Invite Code</Text>
                <Text className='page-hero__title'>{ws.inviteCode || '暂未生成'}</Text>
                <Text className='feature-list-card__description'>
                  {ws.inviteExpiredAt ? `有效期至 ${formatInviteExpiry(ws.inviteExpiredAt)}` : '刷新一次就会生成新的邀请码'}
                </Text>
                <View className='mt-3'>
                  <Button className='app-button app-button--ghost app-button--mini' onClick={async () => {
                    if (!ws.inviteCode) { Taro.showToast({ title: '暂无邀请码', icon: 'none' }); return }
                    try { await Taro.setClipboardData({ data: ws.inviteCode }); Taro.showToast({ title: '已复制', icon: 'success' }) }
                    catch (e) { showErrorToast(e, '复制失败') }
                  }}>复制邀请码</Button>
                </View>
              </View>
            </SectionCard>

            <SectionCard title='成员与角色' description='展示头像、空间备注和角色权限。'
              actions={<Button className='app-button app-button--ghost app-button--mini' onClick={() => Taro.navigateTo({ url: `/pages/tag/index?workspaceId=${workspaceId}` })}>称谓模板</Button>}
            >
              {currentUserId ? (
                <View className='feature-list-card feature-list-card--sky mb-3'>
                  <Text className='feature-list-card__title'>我在本空间的称呼</Text>
                  <Text className='feature-list-card__description'>只影响当前空间里的展示，例如"管家""小厨"。</Text>
                  <Input className='form-control form-control--on-tint mt-3' maxlength={50} confirmType='done' placeholder='可选，留空则显示昵称'
                    value={myRemarkDraft} onConfirm={handleSaveMyRemark} onInput={(e) => setMyRemarkDraft(e.detail.value)} />
                  <View className='mt-3'>
                    <Button className='app-button app-button--secondary app-button--mini' loading={savingMyRemark} disabled={savingMyRemark} onClick={handleSaveMyRemark}>保存我的备注</Button>
                  </View>
                </View>
              ) : null}
              <View>
                {members.map((member) => {
                  const subtitle = getWorkspaceMemberSubtitle(member)
                  return (
                    <Pressable key={member.id} onClick={() => handleMemberClick(member.id)}>
                      <View className='feature-list-card feature-list-card--rose'>
                        <View className='flex items-center justify-between'>
                          <View className='flex items-center'>
                            <MemberAvatar className='mr-3' member={member} size='md' />
                            <View>
                              <Text className='feature-list-card__title'>{getMemberDisplayName(member)}</Text>
                              {subtitle ? <Text className='mt-1 block text-sm text-slate-500'>{subtitle}</Text> : null}
                            </View>
                          </View>
                          <Text className='tool-pill'>{member.displayRole ? roleLabelMap[member.displayRole] : '未定义'}</Text>
                        </View>
                        <Text className='feature-list-card__description'>
                          {member.canCreateTask ? '可发任务' : '不可发任务'} / {member.canAcceptTask ? '可接任务' : '不可接任务'}
                        </Text>
                        <Text className='feature-list-card__meta'>点击调整角色、权限和成员备注</Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </SectionCard>

            <SectionCard title='菜谱库' description='让菜谱区域更像内容资产库。'
              actions={<Button className='app-button app-button--primary app-button--mini' onClick={() => Taro.navigateTo({ url: `/pages/recipe-form/index?workspaceId=${workspaceId}` })}>新建菜谱</Button>}
              meta={`${activeRecipes.length} 个可用`} variant='soft'
            >
              {activeRecipes.length > 0 ? (
                <View>
                  {activeRecipes.map((recipe) => (
                    <Pressable key={recipe.id} onClick={() => handleRecipeClick(recipe.id)}>
                      <View className='feature-list-card feature-list-card--sky'>
                        <Text className='feature-list-card__title'>{recipe.name}</Text>
                        <Text className='feature-list-card__description'>{recipe.description || '进入查看做法、食材和 AI 补全结果'}</Text>
                        <Text className='feature-list-card__meta'>点进详情继续编辑和发起任务</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyState tone='amber' title='暂无菜谱' description='建议先补一个常做菜，再发起任务。' />
              )}
            </SectionCard>
          </View>
        )}
      </AsyncContainer>

      <BottomActionBar>
        <Button className='app-button app-button--primary'
          disabled={activeRecipes.length === 0 || orderableMembers.length === 0}
          onClick={() => Taro.navigateTo({ url: `/pages/order/index?workspaceId=${workspaceId}` })}>
          发起任务
        </Button>
      </BottomActionBar>
    </View>
  )
}
