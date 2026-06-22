// 菜谱 Store — 管理当前空间的菜谱列表
import { create } from 'zustand'
import { recipeApi } from '@/services/recipe.api'
import type { Recipe } from '@shared/types'
import { isCacheValid } from './createAsyncSlice'
import { useWorkspaceStore } from './useWorkspaceStore'

interface DomainMeta {
  loading: boolean
  error: string | null
  loadedAt: number | null
}

interface RecipeState {
  recipes: Recipe[]
  recipesMeta: DomainMeta
  lastWorkspaceId: number

  refreshRecipes: (forceRefresh?: boolean) => Promise<void>
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  recipesMeta: { loading: false, error: null, loadedAt: null },
  lastWorkspaceId: 0,

  refreshRecipes: async (forceRefresh = false) => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId
    if (!wsId) return

    const { recipesMeta, lastWorkspaceId } = get()
    const wsChanged = wsId !== lastWorkspaceId

    if (!forceRefresh && !wsChanged && isCacheValid(recipesMeta.loadedAt)) {
      return
    }

    set({ recipesMeta: { loading: true, error: null, loadedAt: null } })

    try {
      const recipes = await recipeApi.getList(wsId)
      set({
        recipes,
        lastWorkspaceId: wsId,
        recipesMeta: { loading: false, error: null, loadedAt: Date.now() },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载菜谱失败'
      set({ recipesMeta: { loading: false, error: message, loadedAt: null } })
    }
  },
}))
