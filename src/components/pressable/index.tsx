// Pressable — 跨平台按压反馈包装器
// 小程序不支持 :hover/:active 伪类，用 Touch 事件模拟
// H5 端使用 CSS :active 伪类
import { ReactNode, useState, useCallback } from 'react'
import { View } from '@tarojs/components'
import './index.module.scss'

interface PressableProps {
  /** 子元素 */
  children: ReactNode
  /** 按压时的缩放比例，默认 0.96 */
  scale?: number
  /** 按压时的透明度，H5 保留默认（由 CSS 处理）*/
  opacity?: number
  /** 自定义类名 */
  className?: string
  /** 点击回调 */
  onClick?: () => void
  /** 是否禁用按压效果 */
  disabled?: boolean
}

export default function Pressable({
  children,
  scale = 0.96,
  className = '',
  onClick,
  disabled = false,
}: PressableProps) {
  const [pressed, setPressed] = useState(false)

  const handleTouchStart = useCallback(() => {
    if (disabled) return
    setPressed(true)
  }, [disabled])

  const handleTouchEnd = useCallback(() => {
    if (disabled) return
    setPressed(false)
    onClick?.()
  }, [disabled, onClick])

  const pressedClass = pressed && !disabled ? 'pressable--pressed' : ''

  return (
    <View
      className={`pressable ${pressedClass} ${className}`}
      style={{
        transform: pressed && !disabled ? `scale(${scale})` : 'scale(1)',
        transition: 'transform 0.12s ease, opacity 0.12s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setPressed(false)}
      onClick={onClick}
    >
      {children}
    </View>
  )
}
