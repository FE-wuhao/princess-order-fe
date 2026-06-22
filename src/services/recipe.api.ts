import { request } from './request'
import type { Recipe, RecipeIngredient, RecipeMethod } from '@shared/types'

interface RecipeDraft {
  name: string
  description: string
  difficulty: 'easy' | 'normal' | 'hard'
  estimatedMinutes: number
  servingSize: number
  ingredients: Array<{ name: string; amount?: string; unit?: string }>
  methods: string[]
}

export const recipeApi = {
  getList: (workspaceId: number): Promise<Recipe[]> => {
    if (!workspaceId || workspaceId < 1) {
      return Promise.resolve([])
    }
    return request({ url: `/recipes?workspaceId=${workspaceId}` })
  },

  getDetail: (_workspaceId: number, id: number) =>
    request<Recipe>({ url: `/recipes/${id}` }),

  generateDraft: (prompt: string) =>
    request<RecipeDraft>({
      url: '/recipes/ai-draft',
      method: 'POST',
      data: { prompt },
    }),

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
    request<Recipe>({
      url: '/recipes',
      method: 'POST',
      data: { workspaceId, ...data },
    }),

  update: (
    _workspaceId: number,
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
    request<Recipe>({
      url: `/recipes/${id}`,
      method: 'PATCH',
      data,
    }),

  archive: (_workspaceId: number, id: number) =>
    request<Recipe>({
      url: `/recipes/${id}/archive`,
      method: 'PATCH',
    }),

  delete: (_workspaceId: number, id: number) =>
    request<void>({
      url: `/recipes/${id}`,
      method: 'DELETE',
    }),

  replaceIngredients: (
    _workspaceId: number,
    recipeId: number,
    ingredients: Array<{
      name: string
      amount?: string
      unit?: string
      orderIndex: number
    }>,
  ) =>
    request<RecipeIngredient[]>({
      url: `/recipes/${recipeId}/ingredients`,
      method: 'PUT',
      data: { ingredients },
    }),

  replaceMethods: (
    _workspaceId: number,
    recipeId: number,
    methods: Array<{
      content: string
      source?: 'manual' | 'ai'
      orderIndex: number
    }>,
  ) =>
    request<RecipeMethod[]>({
      url: `/recipes/${recipeId}/steps`,
      method: 'PUT',
      data: { methods },
    }),

  addMethod: (
    _workspaceId: number,
    recipeId: number,
    content: string,
  ) =>
    request<RecipeMethod>({
      url: `/recipes/${recipeId}/steps`,
      method: 'POST',
      data: { content },
    }),

  updateMethod: (
    _workspaceId: number,
    recipeId: number,
    methodId: number,
    content: string,
  ) =>
    request<RecipeMethod>({
      url: `/recipes/${recipeId}/steps/${methodId}`,
      method: 'PUT',
      data: { content },
    }),

  deleteMethod: (
    _workspaceId: number,
    recipeId: number,
    methodId: number,
  ) =>
    request<void>({
      url: `/recipes/${recipeId}/steps/${methodId}`,
      method: 'DELETE',
    }),

  addAiMethods: (_workspaceId: number, recipeId: number) =>
    request<RecipeMethod[]>({
      url: `/recipes/${recipeId}/ai-steps`,
      method: 'POST',
    }),
}
