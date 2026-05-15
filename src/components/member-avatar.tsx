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
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-20 w-20 text-2xl',
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
        className={`rounded-full border border-white/70 object-cover ${sizeClass} ${className}`}
        mode='aspectFill'
        src={avatarUrl}
      />
    )
  }

  return (
    <View
      className={`flex items-center justify-center rounded-full bg-white/70 text-rose-500 ${sizeClass} ${className}`}
    >
      <Text>{getMemberAvatarFallbackText(member)}</Text>
    </View>
  )
}
