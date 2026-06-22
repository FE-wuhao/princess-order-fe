// useFormList — 动态表单列表管理 hook
// 封装数组字段的增删改逻辑，减少 recipe-form 等页面的模板代码
import { useState, useCallback } from 'react'

interface UseFormListOptions<T> {
  /** 创建空项的工厂函数 */
  createEmpty: () => T
  /** 初始值 */
  initial?: T[]
  /** 最少保留项数（删除到最后一项时重置为空，而非移除） */
  minItems?: number
}

interface UseFormListReturn<T> {
  /** 列表数据 */
  items: T[]
  /** 设置整个列表 */
  setItems: (items: T[]) => void
  /** 更新指定索引的项 */
  updateItem: (index: number, updates: Partial<T>) => void
  /** 替换指定索引的项 */
  replaceItem: (index: number, item: T) => void
  /** 追加一项 */
  appendItem: () => void
  /** 删除指定索引的项 */
  removeItem: (index: number) => void
  /** 重置列表 */
  reset: () => void
  /** 有效项数量（根据 filterEmpty 判断） */
  validCount: number
}

/**
 * 动态表单列表 hook
 *
 * @example
 * ```tsx
 * const ingredients = useFormList({
 *   createEmpty: () => ({ name: '', amount: '', unit: '' }),
 * })
 *
 * // 渲染
 * {ingredients.items.map((item, i) => (
 *   <Input value={item.name}
 *     onInput={e => ingredients.updateItem(i, { name: e.detail.value })}
 *   />
 * ))}
 * <Button onClick={ingredients.appendItem}>新增</Button>
 * ```
 */
export function useFormList<T extends Record<string, unknown>>(
  options: UseFormListOptions<T>,
): UseFormListReturn<T> {
  const { createEmpty, initial, minItems = 1 } = options

  const [items, setItems] = useState<T[]>(
    initial && initial.length > 0 ? initial : [createEmpty()],
  )

  const updateItem = useCallback((index: number, updates: Partial<T>) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    )
  }, [])

  const replaceItem = useCallback((index: number, item: T) => {
    setItems((current) =>
      current.map((existing, i) => (i === index ? item : existing)),
    )
  }, [])

  const appendItem = useCallback(() => {
    setItems((current) => [...current, createEmpty()])
  }, [createEmpty])

  const removeItem = useCallback(
    (index: number) => {
      setItems((current) => {
        if (current.length <= minItems) {
          return [createEmpty()]
        }
        return current.filter((_, i) => i !== index)
      })
    },
    [createEmpty, minItems],
  )

  const reset = useCallback(() => {
    setItems(initial && initial.length > 0 ? initial : [createEmpty()])
  }, [createEmpty, initial])

  // 有效项计数：通过检查第一个 key 是否非空来判断
  const validCount = items.filter((item) => {
    const firstValue = Object.values(item)[0]
    if (typeof firstValue === 'string') return (firstValue as string).trim().length > 0
    return firstValue != null
  }).length

  return {
    items,
    setItems,
    updateItem,
    replaceItem,
    appendItem,
    removeItem,
    reset,
    validCount,
  }
}
