import { useState, useEffect, useCallback } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import MemberAvatar from '@/components/member-avatar'
import Page from '@/components/page'
import Pressable from '@/components/pressable'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import TabBarPlus from '@/components/tab-bar-plus'
import { userApi, workspaceApi } from '@/services/api'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { ensureAuth, logout, redirectToWorkspaceEntry } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'
import type { User } from '@shared/types'

const isH5 = process.env.TARO_ENV === 'h5'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const loadNotifications = useNotificationStore((s) => s.loadNotifications)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const [workspaces, profile] = await Promise.all([
        workspaceApi.getList(),
        userApi.getProfile(),
      ])

      if ((workspaces || []).length === 0) {
        redirectToWorkspaceEntry()
        return
      }

      setUser(profile)
      // 后台加载通知计数
      loadNotifications()
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [loadNotifications])

  const bootstrap = useCallback(async () => {
    const authed = await ensureAuth()
    if (!authed) {
      return
    }
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useDidShow(() => {
    bootstrap()
  })

  if (loading || !user) {
    return (
      <Page tone='sky' showHeader={false} contentClassName='pb-28'>
        <SkeletonCard />
        <SkeletonCard />
      </Page>
    )
  }

  const avatarMember = {
    userId: user.id,
    remark: null,
    user: {
      nickname: user.nickname || '未命名成员',
      avatar: user.avatar || '',
    },
  }

  return (
    <Page tone='sky' showHeader={false} contentClassName='pb-28'>
      <SectionCard title='我的账号' description='资料维护、通知查看和退出登录都收在这里。' variant='accent'>
        <View className='profile-summary'>
          <View
            className='profile-summary__hero'
            onClick={() => {
              Taro.navigateTo({ url: '/pages/profile-edit/index' })
            }}
          >
            <MemberAvatar member={avatarMember} size='lg' />
            <View className='profile-summary__text'>
              <Text className='profile-summary__name'>{user.nickname || '未填写昵称'}</Text>
              <Text className='profile-summary__hint'>点击头像进入资料维护页</Text>
            </View>
          </View>

          <View
            className='profile-summary__row'
            onClick={() => {
              Taro.navigateTo({ url: '/pages/profile-edit/index' })
            }}
          >
            <Text className='profile-summary__label'>我的资料</Text>
            <View className='profile-summary__value-wrap'>
              <Text className='profile-summary__value'>头像、昵称</Text>
              <View className='icon-arrow-right' />
            </View>
          </View>

          <View
            className='profile-summary__row'
            onClick={() => {
              Taro.navigateTo({ url: '/pages/notifications/index' })
            }}
          >
            <Text className='profile-summary__label'>通知记录</Text>
            <View className='profile-summary__value-wrap'>
              <Text className='profile-summary__value'>{unreadCount > 0 ? `${unreadCount} 条失败` : '查看'}</Text>
              <View className='icon-arrow-right' />
            </View>
          </View>
        </View>
      </SectionCard>

      <View className='mt-5'>
        <Button className='app-button app-button--danger' onClick={logout}>
          退出登录
        </Button>
      </View>
      {isH5 ? <TabBarPlus activeKey='profile' /> : null}
    </Page>
  )
}
