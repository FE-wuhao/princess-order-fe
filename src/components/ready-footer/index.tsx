import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'

interface ReadyFooterProps {
  /** 就绪指示文案，如 "5 个食材 · 3 个步骤" 或 "已选：番茄炒蛋 · 公主" */
  hint: ReactNode
  children: ReactNode
}

/** 表单/创建页底栏：一行就绪指示 + 主操作区，替代顶部装饰统计卡 */
export default function ReadyFooter({ hint, children }: ReadyFooterProps) {
  return (
    <View className='ready-footer'>
      {hint ? <Text className='ready-footer__hint'>{hint}</Text> : null}
      {children}
    </View>
  )
}
