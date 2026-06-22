// 工作空间 Store — 仅管理空间列表和当前选中空间
// 菜谱、任务、成员、称谓模板已拆分为独立 Store
import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { workspaceApi } from '@/services/workspace.api'
import type { Workspace } from '@shared/types'
import { isCacheValid } from './createAsyncSlice'

const PREFERRED_KEY = 'preferredWorkspaceId'

interface DomainMeta {
  loading: boolean
  error: string | null
  loadedAt: number | null
}

interface WorkspaceState {
  // ── 数据 ──
  workspaces: Workspace[]
  activeWorkspaceId: number
  loading: boolean
  workspacesMeta: DomainMeta

  // ── 派生 ──
  activeWorkspace: () => Workspace | null

  // ── actions ──
  loadWorkspaces: (forceRefresh?: boolean) => Promise<void>
  switchWorkspace: (id: number) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: 0,
  loading: false,
  workspacesMeta: { loading: false, error: null, loadedAt: null },

  activeWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get()
    return workspaces.find((w) => w.id === activeWorkspaceId) || null
  },

  loadWorkspaces: async (forceRefresh = false) => {
    const { workspacesMeta } = get()
    if (!forceRefresh && isCacheValid(workspacesMeta.loadedAt)) return

    set({
      loading: true,
      workspacesMeta: { loading: true, error: null, loadedAt: null },
    })

    try {
      const data = await workspaceApi.getList()
      const workspaces = data || []

      if (workspaces.length === 0) {
        set({
          workspaces,
          activeWorkspaceId: 0,
          loading: false,
          workspacesMeta: { loading: false, error: null, loadedAt: Date.now() },
        })
        return
      }

      const storedId = Taro.getStorageSync(PREFERRED_KEY)
      const preferredId =
        typeof storedId === 'number' && storedId > 0 ? storedId : workspaces[0].id
      const exists = workspaces.some((w) => w.id === preferredId)
      const resolvedId = exists ? preferredId : workspaces[0].id

      Taro.setStorageSync(PREFERRED_KEY, resolvedId)
      set({
        workspaces,
        activeWorkspaceId: resolvedId,
        loading: false,
        workspacesMeta: { loading: false, error: null, loadedAt: Date.now() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载空间失败'
      set({
        loading: false,
        workspacesMeta: { loading: false, error: message, loadedAt: null },
      })
    }
  },

  switchWorkspace: (id: number) => {
    Taro.setStorageSync(PREFERRED_KEY, id)
    set({ activeWorkspaceId: id })
    // 注意：switchWorkspace 只负责切换 ID
    // 各领域 Store 在下次 refresh 时自动检测 workspace 变化并重新加载
  },
}))
