import { request } from './request'
import type { Order, OrderRecipeSnapshot } from '@shared/types'

interface TaskListQuery {
  workspaceId?: number
  status?: string
  mine?: boolean
  role?: 'creator' | 'assignee'
}

interface CreateTaskExtra {
  remark?: string
  priority?: 'low' | 'normal' | 'high'
  expectedAt?: string
}

export type TaskWithSnapshot = Order & {
  recipeSnapshot?: OrderRecipeSnapshot | null
}

const normalizeTask = (task: Order): TaskWithSnapshot => ({
  ...task,
  recipeSnapshot: (task as Record<string, unknown>).recipeSnapshot as OrderRecipeSnapshot | undefined ?? null,
})

export const taskApi = {
  create: (
    workspaceId: number,
    recipeId: number,
    assigneeId: number,
    extra?: CreateTaskExtra,
  ) =>
    request<Order>({
      url: '/tasks',
      method: 'POST',
      data: {
        workspaceId,
        recipeId,
        assigneeMembershipId: assigneeId,
        ...extra,
      },
    }),

  getList: async (params?: TaskListQuery): Promise<TaskWithSnapshot[]> => {
    const queryParams: Record<string, string> = {}

    if (params?.workspaceId)
      queryParams.workspaceId = String(params.workspaceId)
    if (params?.status) queryParams.status = params.status
    if (params?.mine !== undefined)
      queryParams.mine = String(params.mine)
    if (params?.role) queryParams.role = params.role

    const query = new URLSearchParams(queryParams).toString()
    const tasks = await request<Order[]>({
      url: `/tasks${query ? `?${query}` : ''}`,
    })
    return (tasks || []).map(normalizeTask)
  },

  getDetail: async (id: number): Promise<TaskWithSnapshot> => {
    const task = await request<Order>({ url: `/tasks/${id}` })
    return normalizeTask(task)
  },

  accept: (id: number, remark?: string) =>
    request<Order>({
      url: `/tasks/${id}/accept`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),

  reject: (id: number, reason: string) =>
    request<Order>({
      url: `/tasks/${id}/reject`,
      method: 'POST',
      data: { reason },
    }),

  start: (id: number, remark?: string) =>
    request<Order>({
      url: `/tasks/${id}/start`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),

  complete: (id: number, remark?: string) =>
    request<Order>({
      url: `/tasks/${id}/complete`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),

  confirm: (id: number, remark?: string) =>
    request<Order>({
      url: `/tasks/${id}/confirm`,
      method: 'POST',
      data: remark ? { remark } : undefined,
    }),

  cancel: (id: number, reason?: string) =>
    request<Order>({
      url: `/tasks/${id}/cancel`,
      method: 'POST',
      data: reason ? { reason } : undefined,
    }),
}
