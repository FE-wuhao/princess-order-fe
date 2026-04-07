import { request } from '../utils/request'

export const authApi = {
  wxLogin: (code: string, userInfo?: { nickname?: string; avatar?: string }) =>
    request({
      url: '/auth/wx-login',
      method: 'POST',
      data: { code, ...userInfo },
    }),
}

export const userApi = {
  getProfile: () => request({ url: '/users/profile' }),
}

export const groupApi = {
  getList: () => request({ url: '/groups' }),
  getDetail: (id: number) => request({ url: `/groups/${id}` }),
  create: (name: string) =>
    request({ url: '/groups', method: 'POST', data: { name } }),
  createInvite: (groupId: number, expiredAt?: string) =>
    request({
      url: `/groups/${groupId}/invites`,
      method: 'POST',
      data: expiredAt ? { expiredAt } : undefined,
    }),
  joinByInvite: (inviteCode: string) =>
    request({
      url: '/groups/join',
      method: 'POST',
      data: { inviteCode },
    }),
  addMember: (
    groupId: number,
    userId: number,
    displayRole?: 'requester' | 'cook' | 'both',
    tagId?: number,
  ) =>
    request({
      url: `/groups/${groupId}/members`,
      method: 'POST',
      data: { userId, displayRole, tagId },
    }),
  updateMember: (
    groupId: number,
    memberId: number,
    data: {
      displayRole?: 'requester' | 'cook' | 'both'
      tagId?: number | null
      status?: 'active' | 'left' | 'removed'
      canManageGroup?: boolean
      canManageMembers?: boolean
      canManageRecipes?: boolean
      canCreateOrder?: boolean
      canAcceptOrder?: boolean
    },
  ) =>
    request({
      url: `/groups/${groupId}/members/${memberId}`,
      method: 'PATCH',
      data,
    }),
  removeMember: (groupId: number, userId: number) =>
    request({
      url: `/groups/${groupId}/members/${userId}`,
      method: 'DELETE',
    }),
}

export const recipeApi = {
  getList: (groupId: number) => request({ url: `/groups/${groupId}/recipes` }),
  getDetail: (groupId: number, id: number) =>
    request({ url: `/groups/${groupId}/recipes/${id}` }),
  create: (
    groupId: number,
    data: {
      name: string
      description?: string
      coverImage?: string
      difficulty?: 'easy' | 'normal' | 'hard'
      estimatedMinutes?: number
      servingSize?: number
    },
  ) =>
    request({
      url: `/groups/${groupId}/recipes`,
      method: 'POST',
      data,
    }),
  update: (
    groupId: number,
    id: number,
    data: {
      name?: string
      description?: string | null
      coverImage?: string | null
      difficulty?: 'easy' | 'normal' | 'hard' | null
      estimatedMinutes?: number | null
      servingSize?: number | null
      status?: 'active' | 'archived'
    },
  ) =>
    request({
      url: `/groups/${groupId}/recipes/${id}`,
      method: 'PATCH',
      data,
    }),
  archive: (groupId: number, id: number) =>
    request({
      url: `/groups/${groupId}/recipes/${id}/archive`,
      method: 'PATCH',
    }),
  delete: (groupId: number, id: number) =>
    request({
      url: `/groups/${groupId}/recipes/${id}`,
      method: 'DELETE',
    }),
  replaceIngredients: (
    groupId: number,
    recipeId: number,
    ingredients: Array<{
      name: string
      amount?: string
      unit?: string
      orderIndex: number
    }>,
  ) =>
    request({
      url: `/groups/${groupId}/recipes/${recipeId}/ingredients`,
      method: 'PUT',
      data: { ingredients },
    }),
  replaceMethods: (
    groupId: number,
    recipeId: number,
    methods: Array<{
      content: string
      source?: 'manual' | 'ai'
      orderIndex: number
    }>,
  ) =>
    request({
      url: `/groups/${groupId}/recipes/${recipeId}/methods`,
      method: 'PUT',
      data: { methods },
    }),
  addMethod: (groupId: number, recipeId: number, content: string) =>
    request({
      url: `/groups/${groupId}/recipes/${recipeId}/methods`,
      method: 'POST',
      data: { content },
    }),
  updateMethod: (
    groupId: number,
    recipeId: number,
    methodId: number,
    content: string,
  ) =>
    request({
      url: `/groups/${groupId}/recipes/${recipeId}/methods/${methodId}`,
      method: 'PUT',
      data: { content },
    }),
  deleteMethod: (groupId: number, recipeId: number, methodId: number) =>
    request({
      url: `/groups/${groupId}/recipes/${recipeId}/methods/${methodId}`,
      method: 'DELETE',
    }),
  addAiMethods: (groupId: number, recipeId: number) =>
    request({
      url: `/groups/${groupId}/recipes/${recipeId}/ai-methods`,
      method: 'POST',
    }),
}

export const orderApi = {
  create: (
    groupId: number,
    recipeId: number,
    assigneeId: number,
    extra?: {
      remark?: string
      priority?: 'low' | 'normal' | 'high'
      expectedAt?: string
    },
  ) =>
    request({
      url: '/orders',
      method: 'POST',
      data: { groupId, recipeId, assigneeId, ...extra },
    }),
  getList: (params?: {
    groupId?: number
    status?: string
    mine?: boolean
    role?: 'creator' | 'assignee'
  }) => {
    const queryParams: Record<string, string> = {}

    if (params?.groupId) queryParams.groupId = String(params.groupId)
    if (params?.status) queryParams.status = params.status
    if (params?.mine !== undefined) queryParams.mine = String(params.mine)
    if (params?.role) queryParams.role = params.role

    const query = new URLSearchParams(queryParams).toString()
    return request({ url: `/orders${query ? `?${query}` : ''}` })
  },
  getDetail: (id: number) => request({ url: `/orders/${id}` }),
  accept: (id: number, remark?: string) =>
    request({
      url: `/orders/${id}/accept`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  reject: (id: number, reason: string) =>
    request({
      url: `/orders/${id}/reject`,
      method: 'POST',
      data: { reason },
    }),
  start: (id: number, remark?: string) =>
    request({
      url: `/orders/${id}/start`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  complete: (id: number, remark?: string) =>
    request({
      url: `/orders/${id}/complete`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  confirm: (id: number, remark?: string) =>
    request({
      url: `/orders/${id}/confirm`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  cancel: (id: number, reason?: string) =>
    request({
      url: `/orders/${id}/cancel`,
      method: 'POST',
      data: reason ? { reason } : undefined,
    }),
}

export const messageApi = {
  getNotifications: () => request({ url: '/messages/notifications' }),
  retryNotification: (id: number) =>
    request({
      url: `/messages/notifications/${id}/retry`,
      method: 'POST',
    }),
}

export const tagApi = {
  getList: (groupId: number, roleType?: 'requester' | 'cook' | 'neutral') => {
    const query = roleType ? `?roleType=${roleType}` : ''
    return request({ url: `/groups/${groupId}/tags${query}` })
  },
  create: (
    groupId: number,
    name: string,
    roleType: 'requester' | 'cook' | 'neutral',
  ) =>
    request({
      url: `/groups/${groupId}/tags`,
      method: 'POST',
      data: { name, roleType },
    }),
  update: (
    groupId: number,
    id: number,
    data: {
      name?: string
      roleType?: 'requester' | 'cook' | 'neutral'
      isDefault?: boolean
    },
  ) =>
    request({
      url: `/groups/${groupId}/tags/${id}`,
      method: 'PATCH',
      data,
    }),
  delete: (groupId: number, id: number) =>
    request({
      url: `/groups/${groupId}/tags/${id}`,
      method: 'DELETE',
    }),
}
