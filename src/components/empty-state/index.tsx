import { Text, View } from '@tarojs/components'

interface EmptyStateProps {
  title: string
  description: string
  tone?: 'rose' | 'gray' | 'amber' | 'sky'
}

export default function EmptyState({
  title,
  description,
  tone = 'gray',
}: EmptyStateProps) {
  return (
    <View className={`empty-state empty-state--${tone}`}>
      <Text className='empty-state__title'>{title}</Text>
      <Text className='empty-state__description'>{description}</Text>
    </View>
  )
}
