import { Image, Text, View } from '@tarojs/components'
import { resolveAssetUrl } from '@/utils/asset'
import {
  getMemberAvatarFallbackText,
  MemberDisplaySource,
} from '@/utils/member'

interface MemberAvatarProps {
  member: MemberDisplaySource
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClassMap = {
  sm: 'member-avatar--sm',
  md: 'member-avatar--md',
  lg: 'member-avatar--lg',
}

export default function MemberAvatar({
  member,
  size = 'md',
  className = '',
}: MemberAvatarProps) {
  const avatarUrl = resolveAssetUrl(member.user?.avatar)
  const sizeClass = sizeClassMap[size]

  if (avatarUrl) {
    return (
      <Image
        className={`member-avatar member-avatar--image ${sizeClass} ${className}`}
        mode='aspectFill'
        src={avatarUrl}
      />
    )
  }

  return (
    <View
      className={`member-avatar member-avatar--fallback ${sizeClass} ${className}`}
    >
      <Text>{getMemberAvatarFallbackText(member)}</Text>
    </View>
  )
}
