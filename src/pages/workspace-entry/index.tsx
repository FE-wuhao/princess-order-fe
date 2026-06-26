import { useCallback, useEffect, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import InputDialog from '@/components/input-dialog'
import Page from '@/components/page'
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
        <Text className='workspace-entry__loading'>加载中…</Text>
      </Page>
    )
  }

  return (
    <Page tone='sunset' showHeader={false} className='animate-fade-in-up'>
      <View className='workspace-entry'>
        <Text className='workspace-entry__title'>加入或创建厨房空间</Text>
        <Text className='workspace-entry__desc'>有了空间，菜谱、成员和任务才能流转起来。</Text>
        <View className='space-y-3 workspace-entry__actions'>
          <Button className='app-button app-button--primary' onClick={() => { setDialogValue(''); setDialogMode('create') }}>创建我的空间</Button>
          <Button className='app-button app-button--ghost' onClick={() => { setDialogValue(''); setDialogMode('join') }}>通过邀请码加入</Button>
        </View>
      </View>

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
