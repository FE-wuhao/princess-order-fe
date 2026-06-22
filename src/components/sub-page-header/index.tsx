import { ReactNode } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

interface SubPageHeaderProps {
  title: string
  description?: string
  right?: ReactNode
}

export default function SubPageHeader({
  title,
  description,
  right,
}: SubPageHeaderProps) {
  return (
    <View className='sub-page-header'>
      <View className='sub-page-header__bar'>
        <Button
          className='sub-page-header__back'
          onClick={() => {
            if (Taro.getCurrentPages().length > 1) {
              Taro.navigateBack()
              return
            }

            Taro.switchTab({ url: '/pages/index/index' })
          }}
        >
          <View className='icon-arrow-left' />
        </Button>
        <Text className='sub-page-header__title'>{title}</Text>
        <View className='sub-page-header__slot'>{right || null}</View>
      </View>
      {description ? <Text className='sub-page-header__description'>{description}</Text> : null}
    </View>
  )
}
