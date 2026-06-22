// 通用异步状态管理工具
// 为 Zustand store 提供统一的 loading/error/cache 模式

export interface AsyncMeta {
  loading: boolean
  error: string | null
  loadedAt: number | null
}

export interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
  loadedAt: number | null
}

/** 默认缓存 TTL：30 秒 */
export const CACHE_TTL = 30_000
/** 强制刷新的最小间隔：3 秒（防止重复触发） */
export const MIN_REFRESH_INTERVAL = 3_000

/**
 * 检查缓存是否有效
 */
export function isCacheValid(loadedAt: number | null, ttl = CACHE_TTL): boolean {
  if (loadedAt == null) return false
  return Date.now() - loadedAt < ttl
}

/**
 * 创建异步状态的初始值
 */
export function initialAsyncState<T>(defaultData: T): AsyncState<T> {
  return {
    data: defaultData,
    loading: false,
    error: null,
    loadedAt: null,
  }
}

/**
 * 创建一个带 loading 管理的异步 action 包装器
 *
 * 使用方式：
 *   refreshMembers: createAsyncAction(
 *     set, get,
 *     async () => { ... },
 *     { cacheKey: 'members' }
 *   )
 */
export function createAsyncAction<T>(
  set: (partial: Record<string, unknown>) => void,
  get: () => Record<string, unknown>,
  fn: () => Promise<T>,
  options?: {
    /** 缓存检查的 loadedAt 字段名（在 store state 中） */
    cacheKey?: string
    /** 自定义 TTL */
    ttl?: number
    /** 是否强制刷新 */
    force?: boolean
  },
): () => Promise<T | undefined> {
  const ttl = options?.ttl ?? CACHE_TTL

  return async () => {
    const state = get() as Record<string, unknown>

    // 缓存检查
    if (options?.cacheKey && !options?.force) {
      const loadedAt = state[options.cacheKey] as number | null
      if (isCacheValid(loadedAt, ttl)) {
        return undefined
      }
    }

    // 设置 loading
    const loadingKey = options?.cacheKey
      ? `${options.cacheKey}Loading`
      : 'loading'
    const errorKey = options?.cacheKey
      ? `${options.cacheKey}Error`
      : 'error'
    const loadedAtKey = options?.cacheKey ?? 'loadedAt'

    set({ [loadingKey]: true, [errorKey]: null } as Record<string, unknown>)

    try {
      const result = await fn()
      set({
        [loadingKey]: false,
        [errorKey]: null,
        [loadedAtKey]: Date.now(),
      } as Record<string, unknown>)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败'
      set({
        [loadingKey]: false,
        [errorKey]: message,
      } as Record<string, unknown>)
      throw err
    }
  }
}
