import { useEffect, useState } from 'react'
import { Button, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import FormField from '@/components/form-field'
import InputDialog from '@/components/input-dialog'
import Page from '@/components/page'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import { useFormList } from '@/hooks/useFormList'
import { recipeApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getRouteNumberParam, reLaunchToWorkspaceEntry } from '@/utils/router'

type Difficulty = 'easy' | 'normal' | 'hard'
type StepViewMode = 'list' | 'swipe'

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

const recipeNamePlaceholderStyle =
  'color: rgba(50, 31, 37, 0.42); font-weight: 500;'

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
  const router = useRouter()
  const workspaceId = getRouteNumberParam(router.params, 'workspaceId')
  const recipeId = getRouteNumberParam(router.params, 'id')
  const isEdit = recipeId > 0

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [servingSize, setServingSize] = useState('')

  const ingredients = useFormList<RecipeIngredientFormItem>({
    createEmpty: createEmptyIngredient,
  })

  const methods = useFormList<RecipeMethodFormItem>({
    createEmpty: createEmptyMethod,
  })

  const [aiDialogVisible, setAiDialogVisible] = useState(false)
  const [aiPromptDraft, setAiPromptDraft] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(0)
  const [editingMethodIndex, setEditingMethodIndex] = useState(0)
  const [stepViewMode, setStepViewMode] = useState<StepViewMode>('list')

  useEffect(() => {
    if (!workspaceId) {
      reLaunchToWorkspaceEntry()
      return
    }
    if (!isEdit || !workspaceId) return

    const loadRecipe = async () => {
      setLoading(true)
      try {
        const recipe = await recipeApi.getDetail(workspaceId, recipeId)
        setName(recipe?.name || '')
        setDescription(recipe?.description || '')
        setDifficulty(recipe?.difficulty || 'normal')
        setEstimatedMinutes(recipe?.estimatedMinutes ? String(recipe.estimatedMinutes) : '')
        setServingSize(recipe?.servingSize ? String(recipe.servingSize) : '')

        if (recipe?.ingredients?.length) {
          ingredients.setItems(
            recipe.ingredients.map((ing) => ({
              name: ing.name || '',
              amount: ing.amount || '',
              unit: ing.unit || '',
            })),
          )
        }
        if (recipe?.methods?.length) {
          methods.setItems(
            recipe.methods.map((m) => ({
              content: m.content || '',
              source: m.source || 'manual',
            })),
          )
        }
        setEditingIngredientIndex(-1)
        setEditingMethodIndex(-1)
      } catch (error) {
        showErrorToast(error, '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadRecipe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, isEdit, recipeId])

  const getPreparedIngredients = () =>
    ingredients.items
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        name: item.name.trim(),
        amount: item.amount.trim(),
        unit: item.unit.trim(),
        orderIndex: index,
      }))

  const getPreparedMethods = () =>
    methods.items
      .filter((item) => item.content.trim())
      .map((item, index) => ({
        content: item.content.trim(),
        source: item.source,
        orderIndex: index,
      }))

  const handleSave = async () => {
    if (saving || !workspaceId) return

    if (!name.trim()) {
      setShowValidationErrors(true)
      return
    }

    const preparedMethods = getPreparedMethods()
    if (preparedMethods.length === 0) {
      setShowValidationErrors(true)
      return
    }

    setShowValidationErrors(false)
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
        ? await recipeApi.update(workspaceId, recipeId, payload)
        : await recipeApi.create(workspaceId, payload)
      const targetRecipeId = recipe?.id || recipeId

      if (!targetRecipeId) throw new Error('recipe-id-missing')

      await Promise.all([
        recipeApi.replaceIngredients(workspaceId, targetRecipeId, getPreparedIngredients()),
        recipeApi.replaceMethods(workspaceId, targetRecipeId, preparedMethods),
      ])

      Taro.hideLoading()
      Taro.showToast({ title: isEdit ? '保存成功' : '创建成功', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/recipe/index?id=${targetRecipeId}&workspaceId=${workspaceId}`,
        })
      }, 400)
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, isEdit ? '保存失败' : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateByAi = async () => {
    const prompt = aiPromptDraft.trim()
    if (!prompt) {
      Taro.showToast({ title: '请先描述想做什么菜', icon: 'none' })
      return
    }

    setAiGenerating(true)
    try {
      const draft = await recipeApi.generateDraft(prompt)
      setName(draft?.name || '')
      setDescription(draft?.description || '')
      setDifficulty(draft?.difficulty || 'normal')
      setEstimatedMinutes(draft?.estimatedMinutes ? String(draft.estimatedMinutes) : '')
      setServingSize(draft?.servingSize ? String(draft.servingSize) : '')

      ingredients.setItems(
        draft?.ingredients?.length
          ? draft.ingredients.map((ing) => ({
              name: ing.name || '',
              amount: ing.amount || '',
              unit: ing.unit || '',
            }))
          : [createEmptyIngredient()],
      )
      methods.setItems(
        draft?.methods?.length
          ? draft.methods.map((content) => ({
              content,
              source: 'ai',
            }))
          : [createEmptyMethod()],
      )
      setShowValidationErrors(false)
      setEditingIngredientIndex(-1)
      setEditingMethodIndex(-1)

      setAiDialogVisible(false)
      setAiPromptDraft('')
      Taro.showToast({ title: '已生成草稿', icon: 'success' })
    } catch (error) {
      showErrorToast(error, 'AI 生成失败')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAppendIngredient = () => {
    setEditingIngredientIndex(ingredients.items.length)
    ingredients.appendItem()
  }

  const handleRemoveIngredient = (index: number) => {
    const currentLength = ingredients.items.length
    ingredients.removeItem(index)
    setEditingIngredientIndex((current) => {
      if (currentLength <= 1) return 0
      if (current === index) return -1
      if (current > index) return current - 1
      return current
    })
  }

  const handleAppendMethod = () => {
    setEditingMethodIndex(methods.items.length)
    methods.appendItem()
  }

  const handleRemoveMethod = (index: number) => {
    const currentLength = methods.items.length
    methods.removeItem(index)
    setEditingMethodIndex((current) => {
      if (currentLength <= 1) return 0
      if (current === index) return -1
      if (current > index) return current - 1
      return current
    })
  }

  const getIngredientSummary = (ingredient: RecipeIngredientFormItem) => {
    const itemName = ingredient.name.trim() || '未填写食材'
    const amount = ingredient.amount.trim()
    const unit = ingredient.unit.trim()
    const amountText = `${amount}${unit}`.trim()
    return amountText ? `${itemName} · ${amountText}` : itemName
  }

  const getIngredientAmountText = (ingredient: RecipeIngredientFormItem) => {
    const amount = ingredient.amount.trim()
    const unit = ingredient.unit.trim()
    return `${amount}${unit}`.trim()
  }

  const getMethodPreview = (method: RecipeMethodFormItem) =>
    method.content.trim() || '还没有写步骤内容'

  const preparedIngredientCount = getPreparedIngredients().length
  const preparedMethodCount = getPreparedMethods().length
  const missingName = !name.trim()
  const missingMethods = preparedMethodCount === 0
  const nameError = showValidationErrors && missingName ? '请输入菜名' : ''
  const methodsError = showValidationErrors && missingMethods ? '至少添加 1 条做法' : ''
  const footerHint = `${preparedIngredientCount} 个食材 · ${preparedMethodCount} 个步骤`

  const handleArchive = async () => {
    if (!isEdit || archiving) return

    const result = await Taro.showModal({
      title: '归档菜谱',
      content: '归档后不会出现在默认菜谱列表里，仍可查看历史记录。',
      confirmText: '确认归档',
    })
    if (!result.confirm) return

    setArchiving(true)
    Taro.showLoading({ title: '归档中...' })
    try {
      await recipeApi.archive(workspaceId, recipeId)
      Taro.hideLoading()
      Taro.showToast({ title: '已归档', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/group/index?id=${workspaceId}` })
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
      <Page title={isEdit ? '编辑菜谱' : '新建菜谱'} tone='sunset' topSpacerMode='header'>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Page>
    )
  }

  const footer = (
    <View className='recipe-form-footer'>
      <Text className='recipe-form-footer__hint'>{footerHint}</Text>
      <Button
        className='app-button app-button--primary'
        disabled={saving || archiving}
        loading={saving}
        onClick={handleSave}
      >
        {isEdit ? '保存菜谱' : '创建菜谱'}
      </Button>
    </View>
  )

  const headerRight = isEdit ? (
    <Text className='sub-page-header__action' onClick={handleArchive}>
      {archiving ? '处理中' : '归档'}
    </Text>
  ) : null

  return (
    <Page
      title={isEdit ? '编辑菜谱' : '新建菜谱'}
      tone='sunset'
      topSpacerMode='header'
      headerRight={headerRight}
      footer={footer}
    >
      <View className='recipe-form-intro'>
        <Input
          className='recipe-form-name-input'
          confirmType='done'
          placeholder='输入菜名，比如：番茄滑蛋'
          placeholderStyle={recipeNamePlaceholderStyle}
          value={name}
          onConfirm={handleSave}
          onInput={(event) => {
            setName(event.detail.value)
          }}
        />
        {nameError ? <Text className='recipe-form-validation-error'>{nameError}</Text> : null}
        <Text
          className='recipe-form-ai-pill'
          onClick={() => {
            setAiPromptDraft('')
            setAiDialogVisible(true)
          }}
        >
          用 AI 生成草稿
        </Text>
      </View>

      <View className='recipe-form-meta-card'>
        <FormField label='一句话描述'>
          <Textarea
            className='form-control form-control--textarea recipe-form-description-input'
            placeholder='写一点口味、场景或提醒，比如下饭、十分钟快手菜'
            value={description}
            onInput={(event) => setDescription(event.detail.value)}
          />
        </FormField>

        <View className='recipe-form-attribute-strip'>
          <View className='recipe-form-difficulty-group'>
            {difficultyOptions.map((item) => (
              <Text
                key={item.value}
                className={`recipe-form-difficulty-chip ${
                  difficulty === item.value ? 'recipe-form-difficulty-chip--active' : ''
                }`}
                onClick={() => setDifficulty(item.value)}
              >
                {item.label}
              </Text>
            ))}
          </View>

          <View className='recipe-form-inline-fields'>
            <FormField label='时长' className='recipe-form-inline-field'>
              <Input
                className='form-control recipe-form-inline-input'
                type='number'
                confirmType='done'
                placeholder='20'
                value={estimatedMinutes}
                onConfirm={handleSave}
                onInput={(event) => setEstimatedMinutes(event.detail.value)}
              />
            </FormField>
            <FormField label='人数' className='recipe-form-inline-field'>
              <Input
                className='form-control recipe-form-inline-input'
                type='number'
                confirmType='done'
                placeholder='2'
                value={servingSize}
                onConfirm={handleSave}
                onInput={(event) => setServingSize(event.detail.value)}
              />
            </FormField>
          </View>
        </View>
      </View>

      <SectionCard
        title='食材'
        meta={`${ingredients.validCount}/${ingredients.items.length} 行`}
        variant='soft'
      >
        <View className='recipe-ingredient-editor'>
          <View className='recipe-ingredient-cloud'>
            {ingredients.items.map((ingredient, index) => {
              const amountText = getIngredientAmountText(ingredient)
              const isBlank = !ingredient.name.trim()

              if (isBlank && editingIngredientIndex !== index) return null

              return (
                <View
                  key={`ingredient-${index}`}
                  className={`recipe-ingredient-chip ${
                    editingIngredientIndex === index ? 'recipe-ingredient-chip--active' : ''
                  } ${isBlank ? 'recipe-ingredient-chip--empty' : ''}`}
                >
                  <Text
                    className='recipe-ingredient-chip__main'
                    onClick={() => setEditingIngredientIndex(index)}
                  >
                    {isBlank ? `食材 ${index + 1}` : ingredient.name.trim()}
                  </Text>
                  {amountText ? (
                    <Text
                      className='recipe-ingredient-chip__amount'
                      onClick={() => setEditingIngredientIndex(index)}
                    >
                      {amountText}
                    </Text>
                  ) : null}
                  <Text className='recipe-ingredient-chip__remove' onClick={() => handleRemoveIngredient(index)}>
                    x
                  </Text>
                </View>
              )
            })}
          </View>

          {ingredients.items[editingIngredientIndex] ? (
            <View className='recipe-ingredient-edit-panel'>
              <View className='recipe-builder-row__head'>
                <Text className='recipe-builder-row__index'>
                  {String(editingIngredientIndex + 1).padStart(2, '0')}
                </Text>
                <Text className='recipe-builder-row__title'>
                  {getIngredientSummary(ingredients.items[editingIngredientIndex])}
                </Text>
                <Text className='recipe-builder-row__action' onClick={() => setEditingIngredientIndex(-1)}>
                  收起
                </Text>
                <Text
                  className='recipe-builder-row__delete'
                  onClick={() => handleRemoveIngredient(editingIngredientIndex)}
                >
                  删除
                </Text>
              </View>

              <View className='recipe-ingredient-grid'>
                <FormField label='食材' className='recipe-ingredient-grid__name'>
                  <Input
                    className='form-control form-control--on-tint'
                    confirmType='done'
                    placeholder='比如：番茄'
                    value={ingredients.items[editingIngredientIndex].name}
                    onConfirm={handleSave}
                    onInput={(event) =>
                      ingredients.updateItem(editingIngredientIndex, { name: event.detail.value })
                    }
                  />
                </FormField>

                <FormField label='数量'>
                  <Input
                    className='form-control form-control--on-tint'
                    confirmType='done'
                    placeholder='2'
                    value={ingredients.items[editingIngredientIndex].amount}
                    onConfirm={handleSave}
                    onInput={(event) =>
                      ingredients.updateItem(editingIngredientIndex, { amount: event.detail.value })
                    }
                  />
                </FormField>

                <FormField label='单位'>
                  <Input
                    className='form-control form-control--on-tint'
                    confirmType='done'
                    placeholder='个 / 克 / 勺'
                    value={ingredients.items[editingIngredientIndex].unit}
                    onConfirm={handleSave}
                    onInput={(event) =>
                      ingredients.updateItem(editingIngredientIndex, { unit: event.detail.value })
                    }
                  />
                </FormField>
              </View>
            </View>
          ) : null}

          <Button className='recipe-builder-add' onClick={handleAppendIngredient}>
            新增食材
          </Button>
        </View>
      </SectionCard>

      <SectionCard
        title='做法'
        actions={
          <View className='recipe-step-mode-toggle'>
            <Text
              className={`recipe-step-mode-toggle__item ${
                stepViewMode === 'list' ? 'recipe-step-mode-toggle__item--active' : ''
              }`}
              onClick={() => setStepViewMode('list')}
            >
              列表
            </Text>
            <Text
              className={`recipe-step-mode-toggle__item ${
                stepViewMode === 'swipe' ? 'recipe-step-mode-toggle__item--active' : ''
              }`}
              onClick={() => setStepViewMode('swipe')}
            >
              横滑
            </Text>
          </View>
        }
        meta={`${methods.validCount}/${methods.items.length} 步`}
      >
        {methodsError ? <Text className='recipe-form-validation-error recipe-form-validation-error--section'>{methodsError}</Text> : null}
        {stepViewMode === 'list' ? (
          <View className='recipe-builder-list'>
            {methods.items.map((method, index) => {
              const isEditing = editingMethodIndex === index || !method.content.trim()

              return (
                <View
                  key={`method-${index}`}
                  className={`recipe-builder-row recipe-builder-row--step ${
                    isEditing ? 'recipe-builder-row--open' : 'recipe-builder-row--compact'
                  }`}
                >
                  <View className='recipe-builder-row__head'>
                    <Text className='recipe-builder-row__index'>{String(index + 1).padStart(2, '0')}</Text>
                    <View className='recipe-builder-row__text'>
                      <Text className='recipe-builder-row__title'>步骤 {index + 1}</Text>
                      {!isEditing ? (
                        <Text className='recipe-builder-row__preview'>{getMethodPreview(method)}</Text>
                      ) : null}
                    </View>
                    <Text
                      className='recipe-builder-row__action'
                      onClick={() => setEditingMethodIndex(isEditing ? -1 : index)}
                    >
                      {isEditing ? '收起' : '编辑'}
                    </Text>
                    <Text className='recipe-builder-row__delete' onClick={() => handleRemoveMethod(index)}>
                      删除
                    </Text>
                  </View>

                  {isEditing ? (
                    <Textarea
                      className='form-control form-control--textarea form-control--on-tint recipe-step-input'
                      placeholder='写清楚这个步骤做什么'
                      value={method.content}
                      onInput={(event) => methods.updateItem(index, { content: event.detail.value })}
                    />
                  ) : null}
                </View>
              )
            })}

            <Button className='recipe-builder-add recipe-builder-add--step' onClick={handleAppendMethod}>
              新增步骤
            </Button>
          </View>
        ) : (
          <View className='recipe-step-carousel-wrap'>
            <ScrollView className='recipe-step-carousel' scrollX scrollWithAnimation>
              <View className='recipe-step-carousel__track'>
                {methods.items.map((method, index) => {
                  const isEditing = editingMethodIndex === index || !method.content.trim()

                  return (
                    <View key={`method-slide-${index}`} className='recipe-step-slide'>
                      <View
                        className='recipe-builder-row recipe-builder-row--step recipe-builder-row--open recipe-step-slide__card'
                      >
                        <View className='recipe-builder-row__head'>
                          <Text className='recipe-builder-row__index'>{String(index + 1).padStart(2, '0')}</Text>
                          <View className='recipe-builder-row__text'>
                            <Text className='recipe-builder-row__title'>步骤 {index + 1}</Text>
                            <Text className='recipe-builder-row__preview'>
                              {index + 1}/{methods.items.length} 步
                            </Text>
                          </View>
                          <Text
                            className='recipe-builder-row__action'
                            onClick={() => setEditingMethodIndex(isEditing ? -1 : index)}
                          >
                            {isEditing ? '收起' : '编辑'}
                          </Text>
                          <Text className='recipe-builder-row__delete' onClick={() => handleRemoveMethod(index)}>
                            删除
                          </Text>
                        </View>

                        {isEditing ? (
                          <Textarea
                            className='form-control form-control--textarea form-control--on-tint recipe-step-input'
                            placeholder='写清楚这个步骤做什么'
                            value={method.content}
                            onInput={(event) => methods.updateItem(index, { content: event.detail.value })}
                          />
                        ) : (
                          <Text className='recipe-step-slide__content'>{getMethodPreview(method)}</Text>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            </ScrollView>

            <Button className='recipe-builder-add recipe-builder-add--step' onClick={handleAppendMethod}>
              新增步骤
            </Button>
          </View>
        )}
      </SectionCard>

      <InputDialog
        visible={aiDialogVisible}
        title='AI 生成菜谱'
        value={aiPromptDraft}
        placeholder='例如：想做一个酸甜口、适合两个人、二十分钟内完成的鸡肉家常菜'
        confirmText='生成'
        loading={aiGenerating}
        multiline
        maxLength={500}
        onChange={setAiPromptDraft}
        onCancel={() => {
          setAiDialogVisible(false)
          setAiPromptDraft('')
        }}
        onConfirm={handleGenerateByAi}
      />
    </Page>
  )
}
