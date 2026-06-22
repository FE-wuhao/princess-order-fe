import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import InputDialog from '@/components/input-dialog'
import MemberAvatar from '@/components/member-avatar'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import SubPageHeader from '@/components/sub-page-header'
import { userApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { isH5 } from '@/utils/platform'
import { uploadAvatar } from '@/utils/upload'
import type { User } from '@shared/types'

export default function ProfileEditPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [nicknameDialogVisible, setNicknameDialogVisible] = useState(false)
  const [nicknameDraft, setNicknameDraft] = useState('')

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const profile = await userApi.getProfile()
      setUser(profile)
      setNicknameDraft(profile?.nickname || '')
    } catch (error) { showErrorToast(error, '资料加载失败') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const avatarMember = useMemo(() => ({
    userId: user?.id || 0,
    remark: null,
    user: { nickname: user?.nickname || '未命名成员', avatar: user?.avatar || '' },
  }), [user])

  const handleSaveNickname = async () => {
    const nickname = nicknameDraft.trim()
    if (!nickname) { Taro.showToast({ title: '请输入昵称', icon: 'none' }); return }
    setSaving(true)
    try {
      const nextUser = await userApi.updateProfile({ nickname, avatar: user?.avatar || undefined })
      setUser(nextUser)
      setNicknameDraft(nextUser?.nickname || '')
      setNicknameDialogVisible(false)
      Taro.showToast({ title: '昵称已更新', icon: 'success' })
    } catch (error) { showErrorToast(error, '昵称更新失败') }
    finally { setSaving(false) }
  }

  const uploadAvatarFromPath = async (tempPath: string) => {
    if (!tempPath || uploadingAvatar) return
    setUploadingAvatar(true)
    try {
      const { avatar } = await uploadAvatar(tempPath)
      const nextUser = await userApi.updateProfile({ nickname: user?.nickname || undefined, avatar })
      setUser(nextUser)
      Taro.showToast({ title: '头像已更新', icon: 'success' })
    } catch (error) { showErrorToast(error, '头像上传失败') }
    finally { setUploadingAvatar(false) }
  }

  if (loading || !user) {
    return (
      <View className='page-shell page-shell--sky px-4 py-5'>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    )
  }

  return (
    <View className='page-shell page-shell--sky px-4 py-5 animate-fade-in-up'>
      <SubPageHeader title='我的资料' description='头像和昵称会同步到空间成员列表和任务详情。' />

      <SectionCard title='账号信息' description='点击头像更新图片，点击昵称修改称呼。' variant='accent'>
        <View className='profile-row'>
          <Text className='profile-row__label'>头像</Text>
          <View className='flex items-center'>
            <Button
              className='profile-avatar-trigger'
              openType={isH5 ? undefined : 'chooseAvatar'}
              onChooseAvatar={isH5 ? undefined : (e: { detail: { avatarUrl: string } }) => uploadAvatarFromPath(e.detail.avatarUrl)}
              onClick={isH5 ? async () => {
                const result = await Taro.chooseImage({ count: 1 })
                const tempPath = result.tempFilePaths?.[0]
                if (tempPath) uploadAvatarFromPath(tempPath)
              } : undefined}
              loading={uploadingAvatar}
              disabled={uploadingAvatar}
            >
              <MemberAvatar member={avatarMember} size='md' />
            </Button>
            <View className='ml-2-5'><View className='icon-arrow-right' /></View>
          </View>
        </View>

        <Pressable onClick={() => { setNicknameDraft(user.nickname || ''); setNicknameDialogVisible(true) }}>
          <View className='profile-row'>
            <Text className='profile-row__label'>昵称</Text>
            <View className='flex items-center'>
              <Text className='profile-row__value'>{user.nickname || '未填写'}</Text>
              <View className='ml-2-5'><View className='icon-arrow-right' /></View>
            </View>
          </View>
        </Pressable>
      </SectionCard>

      <InputDialog
        visible={nicknameDialogVisible}
        title='修改昵称'
        value={nicknameDraft}
        placeholder='给自己起一个空间里容易识别的名字'
        confirmText='保存' loading={saving}
        onChange={setNicknameDraft}
        onCancel={() => setNicknameDialogVisible(false)}
        onConfirm={handleSaveNickname}
      />
    </View>
  )
}
