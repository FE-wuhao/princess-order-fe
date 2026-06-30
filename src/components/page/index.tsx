import type { CSSProperties, ReactNode } from 'react'
import { ScrollView, View } from '@tarojs/components'
import MiniProgramTopSpacer, { getMiniProgramNavMetrics } from '@/components/mini-program-top-spacer'
import SubPageHeader from '@/components/sub-page-header'

interface PageProps {
  children: ReactNode
  title?: string
  description?: string
  headerRight?: ReactNode
  footer?: ReactNode
  tone?: 'default' | 'sunset' | 'sky' | 'dashboard'
  padded?: boolean
  showHeader?: boolean
  showTopSpacer?: boolean
  topSpacerMode?: 'auto' | 'header' | 'standalone' | 'none'
  className?: string
  contentClassName?: string
}

export default function Page({
  children,
  title,
  description,
  headerRight,
  footer,
  tone = 'default',
  padded = true,
  showHeader,
  showTopSpacer = true,
  topSpacerMode = 'auto',
  className,
  contentClassName,
}: PageProps) {
  const shouldShowHeader = showHeader ?? Boolean(title)
  const resolvedTopSpacerMode = !showTopSpacer
    ? 'none'
    : topSpacerMode === 'auto'
      ? shouldShowHeader
        ? 'header'
        : 'standalone'
      : topSpacerMode
  const navMetrics = getMiniProgramNavMetrics()
  const shouldUseCustomNavHeader = resolvedTopSpacerMode === 'header' && navMetrics.height > 0
  const headerClassName = [
    'page-layout__header',
    shouldUseCustomNavHeader ? 'page-layout__header--custom-nav' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const headerStyle = shouldUseCustomNavHeader
    ? {
        height: `${navMetrics.height}px`,
        paddingTop: `${navMetrics.menuTop}px`,
        '--mini-nav-bar-height': `${navMetrics.menuHeight}px`,
      } as CSSProperties
    : undefined
  const shellToneClass = tone === 'default' ? '' : `page-shell--${tone}`
  const rootClassName = ['page-layout', 'page-shell', shellToneClass, className]
    .filter(Boolean)
    .join(' ')
  const bodyClassName = [
    'page-layout__scroll',
    padded ? 'page-layout__scroll--padded' : '',
    footer ? 'page-layout__scroll--with-footer' : '',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View className={rootClassName}>
      {shouldShowHeader ? (
        <View className={headerClassName} style={headerStyle}>
          <SubPageHeader title={title || ''} right={headerRight} />
        </View>
      ) : resolvedTopSpacerMode === 'standalone' ? (
        <MiniProgramTopSpacer />
      ) : null}

      <View className='page-layout__body'>
        <ScrollView className={bodyClassName} scrollY>
          {description ? <View className='page-layout__description'>{description}</View> : null}
          {children}
        </ScrollView>
      </View>

      {footer ? (
        <View className='page-layout__footer'>
          <View className='page-layout__footer-inner'>{footer}</View>
        </View>
      ) : null}
    </View>
  )
}
