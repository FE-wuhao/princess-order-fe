import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

interface CompactHeaderProps {
  title: ReactNode
  desc?: ReactNode
  /** 右上角操作区，通常放次要操作如「编辑」文字链 */
  actions?: ReactNode
  /** 元信息胶囊条：难度 / 时长 / 人数 / 步骤数 等 */
  meta?: ReactNode
  tone?: 'accent' | 'sky' | 'sunset' | 'default'
}

/** 详情页紧凑头部：标题 + 一行 meta + 次要操作，替代 PageHero + 统计卡 */
export default function CompactHeader({
  title,
  desc,
  actions,
  meta,
  tone = 'default',
}: CompactHeaderProps) {
  const toneClass = tone === 'default' ? '' : `compact-header--${tone}`
  return (
    <View className={`compact-header ${toneClass}`}>
      <View className='compact-header__top'>
        <View className='compact-header__heading'>
          <Text className='compact-header__title'>{title}</Text>
          {desc ? <Text className='compact-header__desc'>{desc}</Text> : null}
        </View>
        {actions ? <View className='compact-header__actions'>{actions}</View> : null}
      </View>
      {meta ? <View className='compact-header__meta'>{meta}</View> : null}
    </View>
  )
}
