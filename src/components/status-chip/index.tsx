import { Text } from '@tarojs/components'

type StatusTone = 'warning' | 'info' | 'danger' | 'accent' | 'success' | 'neutral'

interface StatusChipProps {
  label: string
  tone: StatusTone
  size?: 'sm' | 'md'
}

export default function StatusChip({
  label,
  tone,
  size = 'sm',
}: StatusChipProps) {
  return (
    <Text
      className={`status-chip status-chip--${tone} ${
        size === 'md' ? 'status-chip--md' : 'status-chip--sm'
      }`}
    >
      {label}
    </Text>
  )
}
