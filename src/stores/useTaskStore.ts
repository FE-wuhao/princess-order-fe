// 任务 Store — 管理当前空间的任务列表
// 独立缓存 + 乐观更新，通过对比 activeWorkspaceId 自动感知空间切换
import { create } from 'zustand'
import { taskApi } from '@/services/task.api'
import type { TaskWithSnapshot } from '@/services/task.api'
import { isCacheValid } from './createAsyncSlice'
import { useWorkspaceStore } from './useWorkspaceStore'

interface DomainMeta {
  loading: boolean
  error: string | null
  loadedAt: number | null
}

interface TaskState {
  // ── 数据 ──
  tasks: TaskWithSnapshot[]
  tasksMeta: DomainMeta
  /** 上次加载时的空间 ID，变更时自动跳过缓存 */
  lastWorkspaceId: number

  // ── actions ──
  refreshTasks: (
    params?: { status?: string; mine?: boolean; role?: 'creator' | 'assignee' },
    forceRefresh?: boolean,
  ) => Promise<void>

  // ── 乐观更新 ──
  optimisticUpdateTask: (
    taskId: number,
    update: Partial<TaskWithSnapshot>,
  ) => { rollback: () => void }
  optimisticUpdateTaskStatus: (
    taskId: number,
    newStatus: string,
  ) => { rollback: () => void }
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  tasksMeta: { loading: false, error: null, loadedAt: null },
  lastWorkspaceId: 0,

  refreshTasks: async (params, forceRefresh = false) => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId
    if (!wsId) return

    const { tasksMeta, lastWorkspaceId } = get()
    const wsChanged = wsId !== lastWorkspaceId

    // 缓存检查：空间没变 + 缓存有效 + 非强制 → 跳过
    if (!forceRefresh && !wsChanged && isCacheValid(tasksMeta.loadedAt)) {
      return
    }

    set({ tasksMeta: { loading: true, error: null, loadedAt: null } })

    try {
      const tasks = await taskApi.getList({ workspaceId: wsId, ...params })
      set({
        tasks,
        lastWorkspaceId: wsId,
        tasksMeta: { loading: false, error: null, loadedAt: Date.now() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载任务失败'
      set({ tasksMeta: { loading: false, error: message, loadedAt: null } })
    }
  },

  optimisticUpdateTask: (taskId, update) => {
    const prevTasks = get().tasks
    const prevTask = prevTasks.find((t) => t.id === taskId)

    set({
      tasks: prevTasks.map((t) => (t.id === taskId ? { ...t, ...update } : t)),
    })

    return {
      rollback: () => {
        if (prevTask) {
          set({
            tasks: get().tasks.map((t) => (t.id === taskId ? prevTask : t)),
          })
        }
      },
    }
  },

  optimisticUpdateTaskStatus: (taskId, newStatus) => {
    const prevTasks = get().tasks
    const prevTask = prevTasks.find((t) => t.id === taskId)

    set({
      tasks: prevTasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } as TaskWithSnapshot : t,
      ),
    })

    return {
      rollback: () => {
        if (prevTask) {
          set({
            tasks: get().tasks.map((t) => (t.id === taskId ? prevTask : t)),
          })
        }
      },
    }
  },
}))
