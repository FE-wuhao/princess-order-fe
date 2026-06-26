import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

interface PageToolbarProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** 右侧操作区，通常是主按钮 */
  actions?: ReactNode
}

/** 列表/Tab 页顶部工具栏：左侧上下文 + 右侧主操作，替代大面积 PageHero */
export default function PageToolbar({ title, subtitle, actions }: PageToolbarProps) {
  return (
    <View className='page-toolbar'>
      <View className='page-toolbar__main'>
        {title ? <Text className='page-toolbar__title'>{title}</Text> : null}
        {subtitle ? <Text className='page-toolbar__subtitle'>{subtitle}</Text> : null}
      </View>
      {actions ? <View className='page-toolbar__actions'>{actions}</View> : null}
    </View>
  )
}
