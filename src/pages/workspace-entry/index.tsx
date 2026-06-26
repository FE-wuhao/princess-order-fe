import { useCallback, useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import InputDialog from '@/components/input-dialog'
import EmptyState from '@/components/empty-state'
import Page from '@/components/page'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { SkeletonHero } from '@/components/skeleton'
import { ensureAuth } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'
import { workspaceApi } from '@/services/api'
import { setPreferredWorkspaceId } from '@/utils/workspace'

type DialogMode = 'create' | 'join' | null

export default function WorkspaceEntryPage() {
  const [loading, setLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectToHomeIfReady = useCallback(async () => {
    const workspaces = await workspaceApi.getList()
    if ((workspaces || []).length > 0) {
      setPreferredWorkspaceId(workspaces[0].id)
      Taro.switchTab({ url: '/pages/index/index' })
      return true
    }
    return false
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      const authed = await ensureAuth()
      if (!authed) return
      const redirected = await redirectToHomeIfReady()
      if (!redirected) setLoading(false)
    } catch (error) {
      setLoading(false)
      showErrorToast(error, '加载空间引导失败')
    }
  }, [redirectToHomeIfReady])

  useEffect(() => { bootstrap() }, [bootstrap])

  const handleCreateWorkspace = async () => {
    const name = dialogValue.trim()
    if (!name) { Taro.showToast({ title: '请输入空间名', icon: 'none' }); return }
    setSubmitting(true)
    try {
      const workspace = await workspaceApi.create(name)
      setPreferredWorkspaceId(workspace?.id || 0)
      setDialogValue(''); setDialogMode(null)
      Taro.showToast({ title: '创建成功', icon: 'success' })
      setTimeout(() => { Taro.switchTab({ url: '/pages/index/index' }) }, 350)
    } catch (error) { showErrorToast(error, '创建空间失败') }
    finally { setSubmitting(false) }
  }

  const handleJoinWorkspace = async () => {
    const inviteCode = dialogValue.trim().toUpperCase()
    if (!inviteCode) { Taro.showToast({ title: '请输入邀请码', icon: 'none' }); return }
    setSubmitting(true)
    try {
      const membership = await workspaceApi.joinByInvite(inviteCode)
      const wsId = membership?.workspace?.id || 0
      if (wsId) setPreferredWorkspaceId(wsId)
      setDialogValue(''); setDialogMode(null)
      Taro.showToast({ title: '加入成功', icon: 'success' })
      setTimeout(() => { Taro.switchTab({ url: '/pages/index/index' }) }, 350)
    } catch (error) { showErrorToast(error, '加入空间失败') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <Page tone='sunset' showHeader={false}>
        <SkeletonHero />
      </Page>
    )
  }

  return (
    <Page tone='sunset' showHeader={false} className='animate-fade-in-up'>
      <PageHero
        badge='Workspace Entry'
        title='先加入一个空间，再开始点餐协作'
        description='新用户第一次进入时，只需要决定一件事：创建自己的家庭空间，或者通过邀请码加入已有空间。'
        tone='sunset'
      />

      <SectionCard title='开始方式' description='只有当你真正拥有空间之后，首页、菜谱、任务和个人中心才会有意义。' variant='accent'>
        <View className='space-y-3'>
          <Button className='app-button app-button--primary' onClick={() => { setDialogValue(''); setDialogMode('create') }}>创建我的空间</Button>
          <Button className='app-button app-button--ghost' onClick={() => { setDialogValue(''); setDialogMode('join') }}>通过邀请码加入</Button>
        </View>
      </SectionCard>

      <SectionCard title='为什么先做这一步' description='空间是家庭协作的上下文。没有空间时，菜谱归属、成员关系和任务流转都无法成立。' variant='soft'>
        <EmptyState tone='amber' title='先定空间，再谈任务' description='一旦创建或加入成功，系统会自动把你带回首页，并记住当前空间。' />
      </SectionCard>

      <InputDialog visible={dialogMode === 'create'} title='创建空间' value={dialogValue}
        placeholder='例如：我们家厨房' confirmText='创建' loading={submitting}
        onChange={setDialogValue} onCancel={() => { setDialogMode(null); setDialogValue('') }} onConfirm={handleCreateWorkspace} />
      <InputDialog visible={dialogMode === 'join'} title='输入邀请码' value={dialogValue}
        placeholder='例如：GRBQ7X' confirmText='加入' loading={submitting}
        onChange={(value: string) => setDialogValue(value.toUpperCase())}
        onCancel={() => { setDialogMode(null); setDialogValue('') }} onConfirm={handleJoinWorkspace} />
    </Page>
  )
}
