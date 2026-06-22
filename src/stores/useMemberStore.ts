// 成员 Store — 管理当前空间的成员列表
import { create } from 'zustand'
import { workspaceApi } from '@/services/workspace.api'
import type { WorkspaceMemberView } from '@/services/workspace.api'
import { isCacheValid } from './createAsyncSlice'
import { useWorkspaceStore } from './useWorkspaceStore'

interface DomainMeta {
  loading: boolean
  error: string | null
  loadedAt: number | null
}

interface MemberState {
  members: WorkspaceMemberView[]
  membersMeta: DomainMeta
  lastWorkspaceId: number

  // 派生
  assignableMembers: () => WorkspaceMemberView[]

  // actions
  refreshMembers: (forceRefresh?: boolean) => Promise<void>
}

export const useMemberStore = create<MemberState>((set, get) => ({
  members: [],
  membersMeta: { loading: false, error: null, loadedAt: null },
  lastWorkspaceId: 0,

  assignableMembers: () => {
    return get().members.filter((m) => m.canAcceptTask)
  },

  refreshMembers: async (forceRefresh = false) => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId
    if (!wsId) return

    const { membersMeta, lastWorkspaceId } = get()
    const wsChanged = wsId !== lastWorkspaceId

    if (!forceRefresh && !wsChanged && isCacheValid(membersMeta.loadedAt)) {
      return
    }

    set({ membersMeta: { loading: true, error: null, loadedAt: null } })

    try {
      const workspace = await workspaceApi.getDetail(wsId)
      set({
        members: workspace.members || [],
        lastWorkspaceId: wsId,
        membersMeta: { loading: false, error: null, loadedAt: Date.now() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载成员失败'
      set({ membersMeta: { loading: false, error: message, loadedAt: null } })
    }
  },
}))
