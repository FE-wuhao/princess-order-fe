import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { recipeApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'

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

  const filledIngredientCount = useMemo(
    () => ingredients.filter((item) => item.name.trim()).length,
    [ingredients],
  )

  const filledMethodCount = useMemo(
    () => methods.filter((item) => item.content.trim()).length,
    [methods],
  )

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
        showErrorToast(error, '加载失败')
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
      showErrorToast(error, isEdit ? '保存失败' : '创建失败')
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
      showErrorToast(error, '归档失败')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <PageHero
        badge='Recipe Studio'
        title={isEdit ? '编辑菜谱' : '新建菜谱'}
        description='先把基础信息、食材和步骤整理好，后面发单会顺手很多。'
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已填食材</Text>
              <Text className='hero-stat-card__value'>{filledIngredientCount}</Text>
              <Text className='hero-stat-card__hint'>有名称的食材会参与保存</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已写步骤</Text>
              <Text className='hero-stat-card__value'>{filledMethodCount}</Text>
              <Text className='hero-stat-card__hint'>至少保留一条有效做法</Text>
            </View>
          </View>
        }
      />

      <SectionCard
        title='基础信息'
        description='菜名和描述会出现在发单和任务详情里，尽量写清楚一点。'
        variant='accent'
      >
        <View className='form-field'>
          <Text className='form-label'>菜名</Text>
          <Input
            className='form-control'
            placeholder='比如：番茄滑蛋'
            value={name}
            onInput={(event) => setName(event.detail.value)}
          />
        </View>

        <View className='form-field'>
          <Text className='form-label'>一句话描述</Text>
          <Textarea
            className='form-control form-control--textarea'
            placeholder='写一点口味、场景或提醒，比如下饭、十分钟快手菜'
            value={description}
            onInput={(event) => setDescription(event.detail.value)}
          />
        </View>

        <View className='form-field'>
          <Text className='form-label'>难度</Text>
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
            <View className='form-picker'>
              <Text className='form-picker__value'>
                {difficultyOptions.find((item) => item.value === difficulty)?.label ||
                  '选择难度'}
              </Text>
            </View>
          </Picker>
        </View>

        <View className='grid grid-cols-2 gap-3'>
          <View className='form-field'>
            <Text className='form-label'>预计时长（分钟）</Text>
            <Input
              className='form-control'
              type='number'
              placeholder='20'
              value={estimatedMinutes}
              onInput={(event) => setEstimatedMinutes(event.detail.value)}
            />
          </View>
          <View className='form-field'>
            <Text className='form-label'>适合人数</Text>
            <Input
              className='form-control'
              type='number'
              placeholder='2'
              value={servingSize}
              onInput={(event) => setServingSize(event.detail.value)}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title='食材'
        description='按行填写，没有名称的行不会保存。'
        actions={
          <Button className='app-button app-button--secondary app-button--mini' onClick={appendIngredient}>
            新增食材
          </Button>
        }
        meta={`${ingredients.length} 行`}
        variant='soft'
      >
        {ingredients.map((ingredient, index) => (
          <View
            key={`ingredient-${index}`}
            className='feature-list-card feature-list-card--amber mb-3'
          >
            <View className='form-field'>
              <Text className='form-label'>食材名</Text>
              <Input
                className='form-control form-control--on-tint'
                placeholder='比如：番茄'
                value={ingredient.name}
                onInput={(event) =>
                  updateIngredient(index, 'name', event.detail.value)
                }
              />
            </View>

            <View className='grid grid-cols-2 gap-3'>
              <View className='form-field'>
                <Text className='form-label'>数量</Text>
                <Input
                  className='form-control form-control--on-tint'
                  placeholder='2'
                  value={ingredient.amount}
                  onInput={(event) =>
                    updateIngredient(index, 'amount', event.detail.value)
                  }
                />
              </View>
              <View className='form-field'>
                <Text className='form-label'>单位</Text>
                <Input
                  className='form-control form-control--on-tint'
                  placeholder='个 / 克 / 勺'
                  value={ingredient.unit}
                  onInput={(event) =>
                    updateIngredient(index, 'unit', event.detail.value)
                  }
                />
              </View>
            </View>

            <View className='mt-2 text-right'>
              <Text className='form-text-link' onClick={() => removeIngredient(index)}>
                删除这项
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard
        title='做法'
        description='步骤尽量一句一事，执行人看起来更轻松。'
        actions={
          <Button className='app-button app-button--secondary app-button--mini' onClick={appendMethod}>
            新增步骤
          </Button>
        }
        meta={`${methods.length} 步`}
      >
        {methods.map((method, index) => (
          <View
            key={`method-${index}`}
            className='feature-list-card feature-list-card--rose mb-3'
          >
            <View className='form-dynamic-head'>
              <Text className='feature-list-card__title'>步骤 {index + 1}</Text>
              <Text className='form-text-link' onClick={() => removeMethod(index)}>
                删除
              </Text>
            </View>

            <Textarea
              className='form-control form-control--textarea-lg form-control--on-tint'
              placeholder='写清楚这个步骤做什么'
              value={method.content}
              onInput={(event) => updateMethod(index, 'content', event.detail.value)}
            />
          </View>
        ))}
      </SectionCard>

      <BottomActionBar>
        <View className='action-row'>
          {isEdit ? (
            <Button
              className='action-row__item app-button app-button--ghost'
              disabled={saving || archiving}
              onClick={handleArchive}
            >
              归档
            </Button>
          ) : null}
          <Button
            className='action-row__item app-button app-button--primary'
            disabled={saving || archiving}
            loading={saving}
            onClick={handleSave}
          >
            {isEdit ? '保存菜谱' : '创建菜谱'}
          </Button>
        </View>
      </BottomActionBar>
    </View>
  )
}
