export interface MemberDisplaySource {
  remark?: string | null
  userId: number
  user?: {
    nickname?: string | null
    avatar?: string | null
  } | null
  tag?: {
    name: string
  } | null
}

export const getMemberDisplayName = (member: MemberDisplaySource): string => {
  if (member.remark?.trim()) {
    return member.remark.trim()
  }

  if (member.user?.nickname?.trim()) {
    return member.user.nickname.trim()
  }

  if (member.tag?.name?.trim()) {
    return member.tag.name.trim()
  }

  return `成员 #${member.userId}`
}

export const getMemberSubtitle = (member: MemberDisplaySource): string => {
  const displayName = getMemberDisplayName(member)
  const nickname = member.user?.nickname?.trim()

  if (member.remark?.trim() && nickname && nickname !== displayName) {
    return `昵称：${nickname}`
  }

  if (member.tag?.name?.trim() && member.tag.name.trim() !== displayName) {
    return `标签：${member.tag.name.trim()}`
  }

  return ''
}

export const getMemberAvatarFallbackText = (member: MemberDisplaySource): string =>
  getMemberDisplayName(member).slice(0, 1)
