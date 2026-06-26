import { ReactNode } from 'react'
import { ScrollView, View } from '@tarojs/components'
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
  className,
  contentClassName,
}: PageProps) {
  const shouldShowHeader = showHeader ?? Boolean(title)
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
        <View className='page-layout__header'>
          <SubPageHeader title={title || ''} right={headerRight} />
        </View>
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
