import { request } from '../utils/request'

const normalizeWorkspaceDetail = (workspace: any) => {
  const activeInvite = (workspace?.invites || []).find(
    (invite: any) => invite.status === 'active',
  )

  return {
    ...workspace,
    inviteCode: activeInvite?.inviteCode || null,
    inviteExpiredAt: activeInvite?.expiredAt || null,
    members: (workspace?.memberships || []).map((membership: any) => ({
      id: membership.id,
      userId: membership.userId,
      remark: membership.remark,
      displayRole: membership.displayRole,
      canCreateTask: membership.canCreateTask,
      canAcceptTask: membership.canAcceptTask,
      canManageWorkspace: membership.canManageWorkspace,
      canManageMembers: membership.canManageMembers,
      canManageRecipes: membership.canManageRecipes,
      user: membership.user,
      tag: membership.roleTemplate
        ? {
            id: membership.roleTemplate.id,
            name: membership.roleTemplate.name,
          }
        : null,
    })),
    recipes: workspace?.recipes || [],
  }
}

const normalizeTask = (task: any) => ({
  ...task,
  workspace: task?.workspace || null,
  recipeSnapshot: task?.recipeSnapshot || null,
})

export const authApi = {
  wxLogin: (code: string, userInfo?: { nickname?: string; avatar?: string }) =>
    request({
      url: '/auth/wx-login',
      method: 'POST',
      data: { code, ...userInfo },
    }),
  login: (username: string, password: string) =>
    request({
      url: '/auth/login',
      method: 'POST',
      data: { username, password },
    }),
  register: (username: string, password: string) =>
    request({
      url: '/auth/register',
      method: 'POST',
      data: { username, password },
    }),
}

export const userApi = {
  getProfile: () => request({ url: '/users/profile' }),
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    request({
      url: '/users/profile',
      method: 'PATCH',
      data,
    }),
}

export const workspaceApi = {
  getList: () => request({ url: '/workspaces' }),
  getDetail: async (id: number) =>
    normalizeWorkspaceDetail(await request({ url: `/workspaces/${id}` })),
  create: (name: string) =>
    request({ url: '/workspaces', method: 'POST', data: { name } }),
  createInvite: (workspaceId: number, expiredAt?: string) =>
    request({
      url: `/workspaces/${workspaceId}/invites`,
      method: 'POST',
      data: expiredAt ? { expiredAt } : undefined,
    }),
  joinByInvite: (inviteCode: string) =>
    request({
      url: '/invites/join',
      method: 'POST',
      data: { inviteCode },
    }),
  updateMember: (
    workspaceId: number,
    memberId: number,
    data: {
      remark?: string | null
      displayRole?: 'requester' | 'cook' | 'both' | 'neutral'
      roleTemplateId?: number | null
      status?: 'active' | 'left' | 'removed'
      canManageWorkspace?: boolean
      canManageMembers?: boolean
      canManageRecipes?: boolean
      canCreateTask?: boolean
      canAcceptTask?: boolean
    },
  ) =>
    request({
      url: `/workspaces/${workspaceId}/members/${memberId}`,
      method: 'PATCH',
      data: {
        remark: data.remark,
        displayRole: data.displayRole,
        roleTemplateId: data.roleTemplateId,
        status: data.status,
        canManageWorkspace: data.canManageWorkspace,
        canManageMembers: data.canManageMembers,
        canManageRecipes: data.canManageRecipes,
        canCreateTask: data.canCreateTask,
        canAcceptTask: data.canAcceptTask,
      },
    }),
  updateMyRemark: (workspaceId: number, remark?: string | null) =>
    request({
      url: `/workspaces/${workspaceId}/members/me/remark`,
      method: 'PATCH',
      data: { remark },
    }),
}

export const recipeApi = {
  getList: (workspaceId: number) =>
    request({ url: `/recipes?workspaceId=${workspaceId}` }),
  getDetail: (_workspaceId: number, id: number) => request({ url: `/recipes/${id}` }),
  create: (
    workspaceId: number,
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
      url: `/recipes`,
      method: 'POST',
      data: { workspaceId, ...data },
    }),
  update: (
    workspaceId: number,
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
      url: `/recipes/${id}`,
      method: 'PATCH',
      data,
    }),
  archive: (workspaceId: number, id: number) =>
    request({
      url: `/recipes/${id}/archive`,
      method: 'PATCH',
    }),
  delete: (workspaceId: number, id: number) =>
    request({
      url: `/recipes/${id}`,
      method: 'DELETE',
    }),
  replaceIngredients: (
    workspaceId: number,
    recipeId: number,
    ingredients: Array<{
      name: string
      amount?: string
      unit?: string
      orderIndex: number
    }>,
  ) =>
    request({
      url: `/recipes/${recipeId}/ingredients`,
      method: 'PUT',
      data: { ingredients },
    }),
  replaceMethods: (
    workspaceId: number,
    recipeId: number,
    methods: Array<{
      content: string
      source?: 'manual' | 'ai'
      orderIndex: number
    }>,
  ) =>
    request({
      url: `/recipes/${recipeId}/steps`,
      method: 'PUT',
      data: { methods },
    }),
  addMethod: (workspaceId: number, recipeId: number, content: string) =>
    request({
      url: `/recipes/${recipeId}/steps`,
      method: 'POST',
      data: { content },
    }),
  updateMethod: (
    workspaceId: number,
    recipeId: number,
    methodId: number,
    content: string,
  ) =>
    request({
      url: `/recipes/${recipeId}/steps/${methodId}`,
      method: 'PUT',
      data: { content },
    }),
  deleteMethod: (workspaceId: number, recipeId: number, methodId: number) =>
    request({
      url: `/recipes/${recipeId}/steps/${methodId}`,
      method: 'DELETE',
    }),
  addAiMethods: (workspaceId: number, recipeId: number) =>
    request({
      url: `/recipes/${recipeId}/ai-steps`,
      method: 'POST',
    }),
}

export const taskApi = {
  create: (
    workspaceId: number,
    recipeId: number,
    assigneeId: number,
    extra?: {
      remark?: string
      priority?: 'low' | 'normal' | 'high'
      expectedAt?: string
    },
  ) =>
    request({
      url: '/tasks',
      method: 'POST',
      data: {
        workspaceId,
        recipeId,
        assigneeMembershipId: assigneeId,
        ...extra,
      },
    }),
  getList: (params?: {
    workspaceId?: number
    status?: string
    mine?: boolean
    role?: 'creator' | 'assignee'
  }) => {
    const queryParams: Record<string, string> = {}

    if (params?.workspaceId) queryParams.workspaceId = String(params.workspaceId)
    if (params?.status) queryParams.status = params.status
    if (params?.mine !== undefined) queryParams.mine = String(params.mine)
    if (params?.role) queryParams.role = params.role

    const query = new URLSearchParams(queryParams).toString()
    return request({ url: `/tasks${query ? `?${query}` : ''}` }).then((tasks) =>
      (tasks || []).map(normalizeTask),
    )
  },
  getDetail: (id: number) =>
    request({ url: `/tasks/${id}` }).then(normalizeTask),
  accept: (id: number, remark?: string) =>
    request({
      url: `/tasks/${id}/accept`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  reject: (id: number, reason: string) =>
    request({
      url: `/tasks/${id}/reject`,
      method: 'POST',
      data: { reason },
    }),
  start: (id: number, remark?: string) =>
    request({
      url: `/tasks/${id}/start`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  complete: (id: number, remark?: string) =>
    request({
      url: `/tasks/${id}/complete`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  confirm: (id: number, remark?: string) =>
    request({
      url: `/tasks/${id}/confirm`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),
  cancel: (id: number, reason?: string) =>
    request({
      url: `/tasks/${id}/cancel`,
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
  getList: (
    workspaceId: number,
    roleType?: 'requester' | 'cook' | 'both' | 'neutral',
  ) =>
    request({ url: `/workspaces/${workspaceId}/role-templates` }).then((items) =>
      roleType ? (items || []).filter((item: any) => item.roleType === roleType) : items,
    ),
  create: (
    workspaceId: number,
    name: string,
    roleType: 'requester' | 'cook' | 'both' | 'neutral',
  ) =>
    request({
      url: `/workspaces/${workspaceId}/role-templates`,
      method: 'POST',
      data: { name, roleType },
    }),
  update: (
    workspaceId: number,
    id: number,
    data: {
      name?: string
      roleType?: 'requester' | 'cook' | 'both' | 'neutral'
      isDefault?: boolean
    },
  ) =>
    request({
      url: `/workspaces/${workspaceId}/role-templates/${id}`,
      method: 'PATCH',
      data,
    }),
  delete: (workspaceId: number, id: number) =>
    request({
      url: `/workspaces/${workspaceId}/role-templates/${id}`,
      method: 'DELETE',
    }),
}
