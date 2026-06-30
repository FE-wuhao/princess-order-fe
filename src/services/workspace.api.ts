import { request } from './request'
import type {
  Workspace,
  WorkspaceMembership,
  WorkspaceInvite,
} from '@shared/types'

interface WorkspaceDetail extends Workspace {
  inviteCode: string | null
  inviteExpiredAt: string | null
  members: WorkspaceMemberView[]
  recipes: unknown[]
}

export interface WorkspaceMemberView {
  id: number
  userId: number
  remark: string | null
  displayRole: WorkspaceMembership['displayRole']
  status: WorkspaceMembership['status']
  canCreateTask: boolean
  canAcceptTask: boolean
  canManageWorkspace: boolean
  canManageMembers: boolean
  canManageRecipes: boolean
  user: { id: number; nickname: string | null; avatar: string | null } | null
  tag: { id: number; name: string } | null
}

const normalizeWorkspaceDetail = (
  workspace: Record<string, unknown> & { invites?: Array<Record<string, unknown>>; memberships?: Array<Record<string, unknown>> },
): WorkspaceDetail => {
  const activeInvite = (workspace.invites || []).find(
    (invite: Record<string, unknown>) => invite.status === 'active',
  )

  return {
    ...workspace,
    inviteCode: (activeInvite?.inviteCode as string) || null,
    inviteExpiredAt: (activeInvite?.expiredAt as string) || null,
    members: (workspace.memberships || []).map(
      (membership: Record<string, unknown>) => {
        const user = membership.user as Record<string, unknown> | undefined
        const roleTemplate = membership.roleTemplate as
          | Record<string, unknown>
          | undefined

        return {
          id: membership.id as number,
          userId: membership.userId as number,
          remark: (membership.remark as string) || null,
          displayRole: membership.displayRole as WorkspaceMembership['displayRole'],
          status: membership.status as WorkspaceMembership['status'],
          canCreateTask: membership.canCreateTask as boolean,
          canAcceptTask: membership.canAcceptTask as boolean,
          canManageWorkspace: membership.canManageWorkspace as boolean,
          canManageMembers: membership.canManageMembers as boolean,
          canManageRecipes: membership.canManageRecipes as boolean,
          user: user
            ? {
                id: user.id as number,
                nickname: (user.nickname as string) || null,
                avatar: (user.avatar as string) || null,
              }
            : null,
          tag: roleTemplate
            ? {
                id: roleTemplate.id as number,
                name: roleTemplate.name as string,
              }
            : null,
        }
      },
    ),
    recipes: (workspace.recipes as unknown[]) || [],
  } as WorkspaceDetail
}

export const workspaceApi = {
  getList: () => request<Workspace[]>({ url: '/workspaces' }),

  getDetail: async (id: number): Promise<WorkspaceDetail> =>
    normalizeWorkspaceDetail(
      (await request({ url: `/workspaces/${id}` })) as Parameters<typeof normalizeWorkspaceDetail>[0],
    ),

  create: (name: string) =>
    request<Workspace>({
      url: '/workspaces',
      method: 'POST',
      data: { name },
    }),

  update: (
    workspaceId: number,
    data: { name?: string; coverImage?: string | null },
  ) =>
    request<Workspace>({
      url: `/workspaces/${workspaceId}`,
      method: 'PATCH',
      data,
    }),

  delete: (workspaceId: number) =>
    request<{ success: boolean }>({
      url: `/workspaces/${workspaceId}`,
      method: 'DELETE',
    }),

  createInvite: (workspaceId: number, expiredAt?: string) =>
    request<WorkspaceInvite>({
      url: `/workspaces/${workspaceId}/invites`,
      method: 'POST',
      data: expiredAt ? { expiredAt } : undefined,
    }),

  joinByInvite: (inviteCode: string) =>
    request<WorkspaceMembership>({
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
    request<WorkspaceMembership>({
      url: `/workspaces/${workspaceId}/members/${memberId}`,
      method: 'PATCH',
      data,
    }),

  updateMyRemark: (
    workspaceId: number,
    remark?: string | null,
  ) =>
    request<WorkspaceMembership>({
      url: `/workspaces/${workspaceId}/members/me/remark`,
      method: 'PATCH',
      data: { remark },
    }),
}
