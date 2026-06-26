// TabBarPlus — 自定义 TabBar（替代 H5 原生 TabBar）
// 三项 Tab + 中心点单按钮，图标用纯 CSS 绘制以跟随 currentColor 着色
// 小程序端对 SVG 兼容性差，故不使用 SVG，改用 CSS 图形
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import QuickCreateSheet from '@/components/quick-create-sheet'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import './index.module.scss'

type TabKey = 'index' | 'recipes' | 'profile'

interface TabBarPlusProps {
  activeKey?: TabKey
}

export default function TabBarPlus({ activeKey }: TabBarPlusProps) {
  const [quickCreateVisible, setQuickCreateVisible] = useState(false)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const pages = Taro.getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route || ''
  const selectedKey: TabKey =
    activeKey ||
    (currentRoute === 'pages/index/index'
      ? 'index'
      : currentRoute === 'pages/recipes/index'
        ? 'recipes'
        : currentRoute === 'pages/profile/index'
          ? 'profile'
          : 'index')

  const handleTabClick = (pagePath: string) => {
    Taro.switchTab({ url: pagePath })
  }

  const handlePlusClick = () => {
    if (!activeWorkspaceId) {
      Taro.showToast({ title: '请先在首页选择空间', icon: 'none' })
      return
    }
    setQuickCreateVisible(true)
  }

  return (
    <View>
      {/* 占位：防止页面内容被 TabBar 遮挡 */}
      <View className='custom-tabbar-spacer' />

      {/* 自定义 TabBar */}
      <View className='custom-tabbar'>
        {/* 今日 */}
        <View
          className={`custom-tabbar__item ${selectedKey === 'index' ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => handleTabClick('/pages/index/index')}
        >
          <View className='custom-tabbar__icon custom-tabbar__icon--home'>
            <View className='custom-tabbar__home-door' />
          </View>
          <Text className='custom-tabbar__text'>今日</Text>
        </View>

        {/* 菜谱 */}
        <View
          className={`custom-tabbar__item ${selectedKey === 'recipes' ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => handleTabClick('/pages/recipes/index')}
        >
          <View className='custom-tabbar__icon custom-tabbar__icon--recipe'>
            <View className='custom-tabbar__recipe-line custom-tabbar__recipe-line--1' />
            <View className='custom-tabbar__recipe-line custom-tabbar__recipe-line--2' />
          </View>
          <Text className='custom-tabbar__text'>菜谱</Text>
        </View>

        {/* 快捷点单 */}
        <View className='custom-tabbar__item custom-tabbar__item--plus' onClick={handlePlusClick}>
          <View className='custom-tabbar__icon custom-tabbar__icon--plus'>
            <View className='custom-tabbar__plus-h' />
            <View className='custom-tabbar__plus-v' />
          </View>
          <Text className='custom-tabbar__text'>点单</Text>
        </View>

        {/* 我的 */}
        <View
          className={`custom-tabbar__item ${selectedKey === 'profile' ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => handleTabClick('/pages/profile/index')}
        >
          <View className='custom-tabbar__icon custom-tabbar__icon--profile' />
          <Text className='custom-tabbar__text'>我的</Text>
        </View>
      </View>

      <QuickCreateSheet
        visible={quickCreateVisible}
        workspaceId={activeWorkspaceId}
        onClose={() => setQuickCreateVisible(false)}
        onCreated={(taskId) => {
          if (taskId) Taro.navigateTo({ url: `/pages/task/index?id=${taskId}` })
        }}
      />
    </View>
  )
}
