// AsyncContainer — 统一的异步状态容器
// 消除页面中重复的 loading ? "加载中..." : empty ? <EmptyState> : <data> 模式
import { ReactNode } from 'react'
import { Button, Text, View } from '@tarojs/components'
import EmptyState from '@/components/empty-state'
import { SkeletonCard } from '@/components/skeleton'

interface AsyncContainerProps<T> {
  /** 加载中 */
  loading: boolean
  /** 错误信息 */
  error?: string | null
  /** 数据 */
  data: T | null | undefined
  /** 自定义骨架屏（默认使用内置骨架） */
  skeleton?: ReactNode
  /** 空数据展示（默认使用 EmptyState 组件） */
  empty?: ReactNode
  /** 空数据标题 */
  emptyTitle?: string
  /** 空数据描述 */
  emptyDescription?: string
  /** 空数据色调 */
  emptyTone?: 'rose' | 'gray' | 'amber' | 'sky'
  /** 自定义空判断（默认判断 data 是否为 null/undefined 或空数组） */
  isEmpty?: (data: T) => boolean
  /** 错误重试回调 */
  onRetry?: () => void
  /** 成功渲染 */
  children: (data: T) => ReactNode
  /** 加载文本（弃用，建议使用 skeleton prop） */
  loadingText?: string
}

/** 默认空判断 */
function defaultIsEmpty<T>(data: T): boolean {
  if (data == null) return true
  if (Array.isArray(data) && data.length === 0) return true
  return false
}

export default function AsyncContainer<T>({
  loading,
  error,
  data,
  skeleton,
  empty,
  emptyTitle = '暂无数据',
  emptyDescription = '当前还没有内容，快去创建第一个吧。',
  emptyTone = 'gray',
  isEmpty = defaultIsEmpty,
  onRetry,
  children,
  loadingText,
}: AsyncContainerProps<T>) {
  // ── 加载中 ──
  if (loading) {
    if (skeleton) return <>{skeleton}</>
    if (loadingText) {
      return (
        <View className='py-8 text-center'>
          <Text className='text-gray-500'>{loadingText}</Text>
        </View>
      )
    }
    // 默认骨架屏
    return (
      <View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    )
  }

  // ── 错误 ──
  if (error) {
    return (
      <View className='py-10 text-center'>
        <View className='mb-4'>
          <Text className='block text-lg font-semibold text-gray-700'>加载失败</Text>
          <Text className='mt-2 block text-sm text-gray-500'>{error}</Text>
        </View>
        {onRetry ? (
          <Button className='app-button app-button--secondary app-button--mini' onClick={onRetry}>
            重试
          </Button>
        ) : null}
      </View>
    )
  }

  // ── 空数据 ──
  if (data != null && isEmpty(data)) {
    if (empty) return <>{empty}</>
    return (
      <EmptyState
        tone={emptyTone}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  // ── 数据渲染 ──
  if (data != null) {
    return <>{children(data)}</>
  }

  // data 为 null 且非 loading/error → 不渲染
  return null
}
