import { request } from './request'
import type { WorkspaceRoleTemplate } from '@shared/types'

export const tagApi = {
  getList: (
    workspaceId: number,
    roleType?: 'requester' | 'cook' | 'both' | 'neutral',
  ) =>
    request<WorkspaceRoleTemplate[]>({
      url: `/workspaces/${workspaceId}/role-templates`,
    }).then((items) =>
      roleType
        ? (items || []).filter(
            (item) => item.roleType === roleType,
          )
        : items,
    ),

  create: (
    workspaceId: number,
    name: string,
    roleType: 'requester' | 'cook' | 'both' | 'neutral',
  ) =>
    request<WorkspaceRoleTemplate>({
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
    request<WorkspaceRoleTemplate>({
      url: `/workspaces/${workspaceId}/role-templates/${id}`,
      method: 'PATCH',
      data,
    }),

  delete: (workspaceId: number, id: number) =>
    request<void>({
      url: `/workspaces/${workspaceId}/role-templates/${id}`,
      method: 'DELETE',
    }),
}
