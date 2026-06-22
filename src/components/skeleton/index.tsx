// Skeleton 骨架屏组件系列
// 小程序端使用 opacity pulse 动画，H5 端使用 shimmer 效果
import { View } from '@tarojs/components'
import './index.module.scss'

interface SkeletonProps {
  /** 变体类型 */
  variant?: 'text' | 'circle' | 'rect' | 'card'
  /** 宽度 */
  width?: string
  /** 高度 */
  height?: string
  /** 自定义类名 */
  className?: string
}

/** 单条骨架 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const variantClass = `skeleton--${variant}`
  const style: Record<string, string> = {}
  if (width) style.width = width
  if (height) style.height = height

  return (
    <View
      className={`skeleton ${variantClass} ${className}`}
      style={style}
    />
  )
}

/** 单行文本骨架 */
export function SkeletonLine({ width = '100%' }: { width?: string }) {
  return <Skeleton variant='text' width={width} />
}

/** 矩形块骨架（模拟卡片/图片） */
export function SkeletonBlock({
  width = '100%',
  height = '96px',
}: {
  width?: string
  height?: string
}) {
  return <Skeleton variant='rect' width={width} height={height} />
}

/** 圆形骨架（模拟头像） */
export function SkeletonCircle({ size = '44px' }: { size?: string }) {
  return <Skeleton variant='circle' width={size} height={size} />
}

/** 卡片骨架 — 模拟 feature-list-card 的布局 */
export function SkeletonCard() {
  return (
    <View className='skeleton-card'>
      <View className='skeleton-card__header'>
        <SkeletonLine width='60%' />
        <Skeleton variant='rect' width='48px' height='22px' />
      </View>
      <SkeletonLine width='80%' />
      <View style={{ height: '8px' }} />
      <SkeletonLine width='50%' />
    </View>
  )
}

/** 页面 Hero 区域骨架 */
export function SkeletonHero() {
  return (
    <View className='skeleton-hero'>
      <Skeleton variant='rect' width='80px' height='22px' className='skeleton-hero__badge' />
      <View style={{ height: '12px' }} />
      <SkeletonLine width='70%' />
      <SkeletonLine width='90%' />
      <View style={{ height: '16px' }} />
      <View className='skeleton-hero__stats'>
        <SkeletonBlock width='48%' height='60px' />
        <SkeletonBlock width='48%' height='60px' />
      </View>
    </View>
  )
}

/** 列表骨架 — N 个 SkeletonCard */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  )
}
