import { ReactNode } from 'react'
import { View } from '@tarojs/components'

interface BottomActionBarProps {
  children: ReactNode
}

export default function BottomActionBar({ children }: BottomActionBarProps) {
  return <View className='bottom-action-bar'>{children}</View>
}
