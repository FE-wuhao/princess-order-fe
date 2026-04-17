import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

interface PageHeroProps {
  badge: string
  title: string
  description: string
  stats?: ReactNode
  actions?: ReactNode
  tone?: 'brand' | 'sunset' | 'sky'
}

export default function PageHero({
  badge,
  title,
  description,
  stats,
  actions,
  tone = 'brand',
}: PageHeroProps) {
  return (
    <View className={`page-hero page-hero--${tone}`}>
      <Text className='page-hero__badge'>{badge}</Text>
      <Text className='page-hero__title'>{title}</Text>
      <Text className='page-hero__description'>{description}</Text>
      {stats ? <View className='page-hero__stats'>{stats}</View> : null}
      {actions ? <View className='page-hero__actions'>{actions}</View> : null}
    </View>
  )
}
