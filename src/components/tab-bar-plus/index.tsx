// TabBarPlus — 自定义 TabBar（替代 H5 原生 TabBar）
// 三项 Tab + 中心加号按钮，视觉上完全替代原生 TabBar
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import QuickCreateSheet from '@/components/quick-create-sheet'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import './index.module.scss'

const TABS = [
  { key: 'index', pagePath: '/pages/index/index', text: '今日', icon: require('@/assets/icons/home.png'), activeIcon: require('@/assets/icons/home-active.png') },
  { key: 'recipes', pagePath: '/pages/recipes/index', text: '菜谱', icon: require('@/assets/icons/recipe.png'), activeIcon: require('@/assets/icons/recipe-active.png') },
  { key: 'profile', pagePath: '/pages/profile/index', text: '我的', icon: require('@/assets/icons/profile.png'), activeIcon: require('@/assets/icons/profile-active.png') },
]

type TabKey = 'index' | 'recipes' | 'profile'

interface TabBarPlusProps {
  activeKey?: TabKey
}

export default function TabBarPlus({ activeKey }: TabBarPlusProps) {
  const [quickCreateVisible, setQuickCreateVisible] = useState(false)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const pages = Taro.getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route || ''
  const selectedKey = activeKey || TABS.find((tab) => currentRoute === tab.pagePath.replace(/^\//, ''))?.key || 'index'

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
        {/* 首页 */}
        <View
          className={`custom-tabbar__item ${selectedKey === 'index' ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => handleTabClick(TABS[0].pagePath)}
        >
          <Image className='custom-tabbar__icon' src={selectedKey === 'index' ? TABS[0].activeIcon : TABS[0].icon} />
          <Text className='custom-tabbar__text'>{TABS[0].text}</Text>
        </View>

        {/* 快捷点单 */}
        <View className='custom-tabbar__center-wrap' onClick={handlePlusClick}>
          <View className='custom-tabbar__plus-btn'>
            <View className='custom-tabbar__plus-icon' />
          </View>
          <Text className='custom-tabbar__text'>点单</Text>
        </View>

        {/* 菜谱 */}
        <View
          className={`custom-tabbar__item ${selectedKey === 'recipes' ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => handleTabClick(TABS[1].pagePath)}
        >
          <Image className='custom-tabbar__icon' src={selectedKey === 'recipes' ? TABS[1].activeIcon : TABS[1].icon} />
          <Text className='custom-tabbar__text'>{TABS[1].text}</Text>
        </View>

        {/* 我的 */}
        <View
          className={`custom-tabbar__item ${selectedKey === 'profile' ? 'custom-tabbar__item--active' : ''}`}
          onClick={() => handleTabClick(TABS[2].pagePath)}
        >
          <Image className='custom-tabbar__icon' src={selectedKey === 'profile' ? TABS[2].activeIcon : TABS[2].icon} />
          <Text className='custom-tabbar__text'>{TABS[2].text}</Text>
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
