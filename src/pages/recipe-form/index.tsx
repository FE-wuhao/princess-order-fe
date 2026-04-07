import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { recipeApi } from '../../services/api'

type Difficulty = 'easy' | 'normal' | 'hard'

interface RecipeIngredientFormItem {
  name: string
  amount: string
  unit: string
}

interface RecipeMethodFormItem {
  content: string
  source: 'manual' | 'ai'
}

const difficultyOptions: Array<{ label: string; value: Difficulty }> = [
  { label: '简单', value: 'easy' },
  { label: '适中', value: 'normal' },
  { label: '有点挑战', value: 'hard' },
]

const createEmptyIngredient = (): RecipeIngredientFormItem => ({
  name: '',
  amount: '',
  unit: '',
})

const createEmptyMethod = (): RecipeMethodFormItem => ({
  content: '',
  source: 'manual',
})

export default function RecipeForm() {
  const { groupId, recipeId } = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params

    return {
      groupId: parseInt(params?.groupId || '0'),
      recipeId: parseInt(params?.id || '0'),
    }
  }, [])
  const isEdit = recipeId > 0
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredientFormItem[]>([
    createEmptyIngredient(),
  ])
  const [methods, setMethods] = useState<RecipeMethodFormItem[]>([createEmptyMethod()])

  useEffect(() => {
    if (!isEdit || !groupId) {
      return
    }

    const loadRecipe = async () => {
      setLoading(true)

      try {
        const recipe = await recipeApi.getDetail(groupId, recipeId)
        setName(recipe?.name || '')
        setDescription(recipe?.description || '')
        setDifficulty(recipe?.difficulty || 'normal')
        setEstimatedMinutes(
          recipe?.estimatedMinutes ? String(recipe.estimatedMinutes) : '',
        )
        setServingSize(recipe?.servingSize ? String(recipe.servingSize) : '')
        setIngredients(
          recipe?.ingredients?.length
            ? recipe.ingredients.map((ingredient) => ({
                name: ingredient.name || '',
                amount: ingredient.amount || '',
                unit: ingredient.unit || '',
              }))
            : [createEmptyIngredient()],
        )
        setMethods(
          recipe?.methods?.length
            ? recipe.methods.map((method) => ({
                content: method.content || '',
                source: method.source || 'manual',
              }))
            : [createEmptyMethod()],
        )
      } catch (error) {
        Taro.showToast({
          title: '加载失败',
          icon: 'none',
        })
      } finally {
        setLoading(false)
      }
    }

    loadRecipe()
  }, [groupId, isEdit, recipeId])

  const updateIngredient = (
    index: number,
    key: keyof RecipeIngredientFormItem,
    value: string,
  ) => {
    setIngredients((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    )
  }

  const updateMethod = (
    index: number,
    key: keyof RecipeMethodFormItem,
    value: string,
  ) => {
    setMethods((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    )
  }

  const appendIngredient = () => {
    setIngredients((current) => [...current, createEmptyIngredient()])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) {
      setIngredients([createEmptyIngredient()])
      return
    }

    setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const appendMethod = () => {
    setMethods((current) => [...current, createEmptyMethod()])
  }

  const removeMethod = (index: number) => {
    if (methods.length === 1) {
      setMethods([createEmptyMethod()])
      return
    }

    setMethods((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const getPreparedIngredients = () =>
    ingredients
      .map((ingredient) => ({
        name: ingredient.name.trim(),
        amount: ingredient.amount.trim(),
        unit: ingredient.unit.trim(),
      }))
      .filter((ingredient) => ingredient.name)
      .map((ingredient, index) => ({
        ...ingredient,
        orderIndex: index,
      }))

  const getPreparedMethods = () =>
    methods
      .map((method) => ({
        content: method.content.trim(),
        source: method.source,
      }))
      .filter((method) => method.content)
      .map((method, index) => ({
        ...method,
        orderIndex: index,
      }))

  const handleSave = async () => {
    if (saving) {
      return
    }

    if (!groupId) {
      Taro.showToast({
        title: '分组信息异常',
        icon: 'none',
      })
      return
    }

    if (!name.trim()) {
      Taro.showToast({
        title: '请先填写菜名',
        icon: 'none',
      })
      return
    }

    const preparedMethods = getPreparedMethods()

    if (preparedMethods.length === 0) {
      Taro.showToast({
        title: '至少写一条做法',
        icon: 'none',
      })
      return
    }

    setSaving(true)
    Taro.showLoading({ title: isEdit ? '保存中...' : '创建中...' })

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        difficulty,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        servingSize: servingSize ? Number(servingSize) : undefined,
      }

      const recipe = isEdit
        ? await recipeApi.update(groupId, recipeId, payload)
        : await recipeApi.create(groupId, payload)
      const targetRecipeId = recipe?.id || recipeId

      if (!targetRecipeId) {
        throw new Error('recipe-id-missing')
      }

      await Promise.all([
        recipeApi.replaceIngredients(groupId, targetRecipeId, getPreparedIngredients()),
        recipeApi.replaceMethods(groupId, targetRecipeId, preparedMethods),
      ])

      Taro.hideLoading()
      Taro.showToast({
        title: isEdit ? '保存成功' : '创建成功',
        icon: 'success',
      })

      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/recipe/index?id=${targetRecipeId}&groupId=${groupId}`,
        })
      }, 400)
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: isEdit ? '保存失败' : '创建失败',
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!isEdit || archiving) {
      return
    }

    const result = await Taro.showModal({
      title: '归档菜谱',
      content: '归档后不会出现在默认菜谱列表里，仍可查看历史记录。',
      confirmText: '确认归档',
    })

    if (!result.confirm) {
      return
    }

    setArchiving(true)
    Taro.showLoading({ title: '归档中...' })

    try {
      await recipeApi.archive(groupId, recipeId)
      Taro.hideLoading()
      Taro.showToast({
        title: '已归档',
        icon: 'success',
      })
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/group/index?id=${groupId}`,
        })
      }, 400)
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: '归档失败',
        icon: 'none',
      })
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  return (
    <View className='min-h-screen bg-orange-50 px-4 py-5 pb-32'>
      <View className='mb-4 rounded-3xl bg-white p-4 shadow-sm'>
        <Text className='block text-xs uppercase tracking-wider text-orange-500'>
          Recipe Studio
        </Text>
        <Text className='mt-2 block text-2xl font-bold text-gray-900'>
          {isEdit ? '编辑菜谱' : '新建菜谱'}
        </Text>
        <Text className='mt-2 block text-sm text-gray-500'>
          先把基础信息、食材和步骤整理好，后面发单会顺手很多。
        </Text>
      </View>

      <View className='mb-4 rounded-3xl bg-white p-4 shadow-sm'>
        <Text className='mb-3 block text-base font-semibold text-gray-900'>基础信息</Text>

        <View className='mb-4'>
          <Text className='mb-2 block text-sm text-gray-600'>菜名</Text>
          <Input
            className='rounded-2xl bg-gray-50 px-4 py-3'
            placeholder='比如：番茄滑蛋'
            value={name}
            onInput={(event) => setName(event.detail.value)}
          />
        </View>

        <View className='mb-4'>
          <Text className='mb-2 block text-sm text-gray-600'>一句话描述</Text>
          <Textarea
            className='h-24 rounded-2xl bg-gray-50 px-4 py-3'
            placeholder='写一点口味、场景或提醒，比如下饭、十分钟快手菜'
            value={description}
            onInput={(event) => setDescription(event.detail.value)}
          />
        </View>

        <View className='mb-4'>
          <Text className='mb-2 block text-sm text-gray-600'>难度</Text>
          <Picker
            mode='selector'
            range={difficultyOptions.map((item) => item.label)}
            value={difficultyOptions.findIndex((item) => item.value === difficulty)}
            onChange={(event) => {
              const selected = difficultyOptions[Number(event.detail.value)]
              if (!selected) {
                return
              }

              setDifficulty(selected.value)
            }}
          >
            <View className='rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900'>
              {difficultyOptions.find((item) => item.value === difficulty)?.label || '选择难度'}
            </View>
          </Picker>
        </View>

        <View className='grid grid-cols-2 gap-3'>
          <View>
            <Text className='mb-2 block text-sm text-gray-600'>预计时长（分钟）</Text>
            <Input
              className='rounded-2xl bg-gray-50 px-4 py-3'
              type='number'
              placeholder='20'
              value={estimatedMinutes}
              onInput={(event) => setEstimatedMinutes(event.detail.value)}
            />
          </View>
          <View>
            <Text className='mb-2 block text-sm text-gray-600'>适合人数</Text>
            <Input
              className='rounded-2xl bg-gray-50 px-4 py-3'
              type='number'
              placeholder='2'
              value={servingSize}
              onInput={(event) => setServingSize(event.detail.value)}
            />
          </View>
        </View>
      </View>

      <View className='mb-4 rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-base font-semibold text-gray-900'>食材</Text>
          <Button size='mini' onClick={appendIngredient}>
            新增食材
          </Button>
        </View>

        {ingredients.map((ingredient, index) => (
          <View
            key={`ingredient-${index}`}
            className='mb-3 rounded-2xl bg-orange-50 p-3'
          >
            <View className='mb-3'>
              <Text className='mb-2 block text-sm text-gray-600'>食材名</Text>
              <Input
                className='rounded-2xl bg-white px-4 py-3'
                placeholder='比如：番茄'
                value={ingredient.name}
                onInput={(event) =>
                  updateIngredient(index, 'name', event.detail.value)
                }
              />
            </View>

            <View className='grid grid-cols-2 gap-3'>
              <View>
                <Text className='mb-2 block text-sm text-gray-600'>数量</Text>
                <Input
                  className='rounded-2xl bg-white px-4 py-3'
                  placeholder='2'
                  value={ingredient.amount}
                  onInput={(event) =>
                    updateIngredient(index, 'amount', event.detail.value)
                  }
                />
              </View>
              <View>
                <Text className='mb-2 block text-sm text-gray-600'>单位</Text>
                <Input
                  className='rounded-2xl bg-white px-4 py-3'
                  placeholder='个 / 克 / 勺'
                  value={ingredient.unit}
                  onInput={(event) =>
                    updateIngredient(index, 'unit', event.detail.value)
                  }
                />
              </View>
            </View>

            <View className='mt-3 text-right'>
              <Text
                className='text-sm text-gray-500'
                onClick={() => removeIngredient(index)}
              >
                删除这项
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className='rounded-3xl bg-white p-4 shadow-sm'>
        <View className='mb-3 flex items-center justify-between'>
          <Text className='text-base font-semibold text-gray-900'>做法</Text>
          <Button size='mini' onClick={appendMethod}>
            新增步骤
          </Button>
        </View>

        {methods.map((method, index) => (
          <View
            key={`method-${index}`}
            className='mb-3 rounded-2xl bg-amber-50 p-3'
          >
            <View className='mb-3 flex items-center justify-between'>
              <Text className='text-sm font-medium text-gray-900'>步骤 {index + 1}</Text>
              <Text
                className='text-sm text-gray-500'
                onClick={() => removeMethod(index)}
              >
                删除
              </Text>
            </View>

            <Textarea
              className='h-28 rounded-2xl bg-white px-4 py-3'
              placeholder='写清楚这个步骤做什么'
              value={method.content}
              onInput={(event) => updateMethod(index, 'content', event.detail.value)}
            />
          </View>
        ))}
      </View>

      <View className='fixed bottom-0 left-0 right-0 bg-white px-5 py-4 shadow-lg'>
        <View className='flex items-center gap-3'>
          {isEdit ? (
            <Button
              className='m-0 flex-1'
              disabled={saving || archiving}
              onClick={handleArchive}
            >
              归档
            </Button>
          ) : null}
          <Button
            className='m-0 flex-1'
            type='primary'
            disabled={saving || archiving}
            onClick={handleSave}
          >
            {isEdit ? '保存菜谱' : '创建菜谱'}
          </Button>
        </View>
      </View>
    </View>
  )
}
