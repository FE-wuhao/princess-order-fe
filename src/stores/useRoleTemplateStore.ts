// 称谓模板 Store — 管理当前空间的称谓模板列表
import { create } from 'zustand'
import type { WorkspaceRoleTemplate } from '@shared/types'
import { isCacheValid } from './createAsyncSlice'
import { useWorkspaceStore } from './useWorkspaceStore'

interface DomainMeta {
  loading: boolean
  error: string | null
  loadedAt: number | null
}

interface RoleTemplateState {
  roleTemplates: WorkspaceRoleTemplate[]
  roleTemplatesMeta: DomainMeta
  lastWorkspaceId: number

  refreshRoleTemplates: (forceRefresh?: boolean) => Promise<void>
}

export const useRoleTemplateStore = create<RoleTemplateState>((set, get) => ({
  roleTemplates: [],
  roleTemplatesMeta: { loading: false, error: null, loadedAt: null },
  lastWorkspaceId: 0,

  refreshRoleTemplates: async (forceRefresh = false) => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId
    if (!wsId) return

    const { roleTemplatesMeta, lastWorkspaceId } = get()
    const wsChanged = wsId !== lastWorkspaceId

    if (!forceRefresh && !wsChanged && isCacheValid(roleTemplatesMeta.loadedAt)) {
      return
    }

    set({ roleTemplatesMeta: { loading: true, error: null, loadedAt: null } })

    try {
      const tagApi = (await import('@/services/tag.api')).tagApi
      const templates = await tagApi.getList(wsId)
      set({
        roleTemplates: templates || [],
        lastWorkspaceId: wsId,
        roleTemplatesMeta: { loading: false, error: null, loadedAt: Date.now() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载称谓模板失败'
      set({ roleTemplatesMeta: { loading: false, error: message, loadedAt: null } })
    }
  },
}))
