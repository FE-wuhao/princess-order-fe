import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

interface SectionCardProps {
  title: string
  description?: string
  meta?: string
  actions?: ReactNode
  children: ReactNode
  variant?: 'default' | 'accent' | 'soft'
}

export default function SectionCard({
  title,
  description,
  meta,
  actions,
  children,
  variant = 'default',
}: SectionCardProps) {
  return (
    <View className={`section-card section-card--${variant}`}>
      <View className='section-card__header'>
        <View className='section-card__heading'>
          <Text className='section-card__title'>{title}</Text>
          {description ? (
            <Text className='section-card__description'>{description}</Text>
          ) : null}
        </View>
        {actions ? <View>{actions}</View> : null}
        {!actions && meta ? <Text className='section-card__meta'>{meta}</Text> : null}
      </View>
      {actions && meta ? <Text className='section-card__meta'>{meta}</Text> : null}
      <View>{children}</View>
    </View>
  )
}
