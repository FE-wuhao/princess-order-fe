import { useEffect, useState } from 'react'
import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import BottomActionBar from '@/components/bottom-action-bar'
import FormField from '@/components/form-field'
import InputDialog from '@/components/input-dialog'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { SkeletonCard } from '@/components/skeleton'
import SubPageHeader from '@/components/sub-page-header'
import { useFormList } from '@/hooks/useFormList'
import { recipeApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'
import { getRouteNumberParam, reLaunchToWorkspaceEntry } from '@/utils/router'

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

  // 动态列表 — 用 useFormList hook 管理
  const ingredients = useFormList<RecipeIngredientFormItem>({
    createEmpty: createEmptyIngredient,
  })

  const methods = useFormList<RecipeMethodFormItem>({
    createEmpty: createEmptyMethod,
  })

  // AI 生成弹窗
  const [aiDialogVisible, setAiDialogVisible] = useState(false)
  const [aiPromptDraft, setAiPromptDraft] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  // ── 加载已有菜谱 ──
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
      } catch (error) {
        showErrorToast(error, '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadRecipe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, isEdit, recipeId])

  // ── 保存 ──
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
      Taro.showToast({ title: '请先填写菜名', icon: 'none' })
      return
    }

    const preparedMethods = getPreparedMethods()
    if (preparedMethods.length === 0) {
      Taro.showToast({ title: '至少写一条做法', icon: 'none' })
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

  // ── AI 生成 ──
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

      setAiDialogVisible(false)
      setAiPromptDraft('')
      Taro.showToast({ title: '已生成草稿', icon: 'success' })
    } catch (error) {
      showErrorToast(error, 'AI 生成失败')
    } finally {
      setAiGenerating(false)
    }
  }

  // ── 归档 ──
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

  // ── 加载中 ──
  if (loading) {
    return (
      <View className='page-shell page-shell--sunset px-4 py-5'>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    )
  }

  // ── 渲染 ──
  return (
    <View className='page-shell page-shell--sunset px-4 py-5 pb-32'>
      <SubPageHeader
        title={isEdit ? '编辑菜谱' : '新建菜谱'}
        description='需要返回时不用依赖浏览器返回，直接点这里即可。'
      />
      <PageHero
        badge='Recipe Studio'
        title={isEdit ? '编辑菜谱' : '新建菜谱'}
        description='先把基础信息、食材和步骤整理好；如果懒得从零写，可以先让 AI 生成草稿。'
        tone='sunset'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已填食材</Text>
              <Text className='hero-stat-card__value'>{ingredients.validCount}</Text>
              <Text className='hero-stat-card__hint'>有名称的食材会参与保存</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>已写步骤</Text>
              <Text className='hero-stat-card__value'>{methods.validCount}</Text>
              <Text className='hero-stat-card__hint'>至少保留一条有效做法</Text>
            </View>
          </View>
        }
        actions={
          <Button
            className='app-button app-button--ghost'
            onClick={() => {
              setAiPromptDraft('')
              setAiDialogVisible(true)
            }}
          >
            AI 生成草稿
          </Button>
        }
      />

      {/* 基础信息 */}
      <SectionCard
        title='基础信息'
        description='菜名和描述会出现在发单和任务详情里，尽量写清楚一点。'
        variant='accent'
      >
        <FormField label='菜名'>
          <Input
            className='form-control'
            confirmType='done'
            placeholder='比如：番茄滑蛋'
            value={name}
            onConfirm={handleSave}
            onInput={(event) => setName(event.detail.value)}
          />
        </FormField>

        <FormField label='一句话描述'>
          <Textarea
            className='form-control form-control--textarea'
            placeholder='写一点口味、场景或提醒，比如下饭、十分钟快手菜'
            value={description}
            onInput={(event) => setDescription(event.detail.value)}
          />
        </FormField>

        <FormField label='难度'>
          <Picker
            mode='selector'
            range={difficultyOptions.map((item) => item.label)}
            value={difficultyOptions.findIndex((item) => item.value === difficulty)}
            onChange={(event) => {
              const selected = difficultyOptions[Number(event.detail.value)]
              if (selected) setDifficulty(selected.value)
            }}
          >
            <View className='form-picker'>
              <Text className='form-picker__value'>
                {difficultyOptions.find((item) => item.value === difficulty)?.label || '选择难度'}
              </Text>
            </View>
          </Picker>
        </FormField>

        <View className='grid grid-cols-2 gap-3'>
          <FormField label='预计时长（分钟）'>
            <Input
              className='form-control'
              type='number'
              confirmType='done'
              placeholder='20'
              value={estimatedMinutes}
              onConfirm={handleSave}
              onInput={(event) => setEstimatedMinutes(event.detail.value)}
            />
          </FormField>
          <FormField label='适合人数'>
            <Input
              className='form-control'
              type='number'
              confirmType='done'
              placeholder='2'
              value={servingSize}
              onConfirm={handleSave}
              onInput={(event) => setServingSize(event.detail.value)}
            />
          </FormField>
        </View>
      </SectionCard>

      {/* 食材列表 */}
      <SectionCard
        title='食材'
        description='按行填写，没有名称的行不会保存。'
        actions={
          <Button className='app-button app-button--secondary app-button--mini' onClick={ingredients.appendItem}>
            新增食材
          </Button>
        }
        meta={`${ingredients.items.length} 行`}
        variant='soft'
      >
        {ingredients.items.map((ingredient, index) => (
          <View key={`ingredient-${index}`} className='feature-list-card feature-list-card--amber mb-3'>
            <FormField label='食材名'>
              <Input
                className='form-control form-control--on-tint'
                confirmType='done'
                placeholder='比如：番茄'
                value={ingredient.name}
                onConfirm={handleSave}
                onInput={(event) => ingredients.updateItem(index, { name: event.detail.value })}
              />
            </FormField>

            <View className='grid grid-cols-2 gap-3'>
              <FormField label='数量'>
                <Input
                  className='form-control form-control--on-tint'
                  confirmType='done'
                  placeholder='2'
                  value={ingredient.amount}
                  onConfirm={handleSave}
                  onInput={(event) => ingredients.updateItem(index, { amount: event.detail.value })}
                />
              </FormField>
              <FormField label='单位'>
                <Input
                  className='form-control form-control--on-tint'
                  confirmType='done'
                  placeholder='个 / 克 / 勺'
                  value={ingredient.unit}
                  onConfirm={handleSave}
                  onInput={(event) => ingredients.updateItem(index, { unit: event.detail.value })}
                />
              </FormField>
            </View>

            <View className='mt-2 text-right'>
              <Text className='form-text-link' onClick={() => ingredients.removeItem(index)}>
                删除这项
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>

      {/* 做法列表 */}
      <SectionCard
        title='做法'
        description='步骤尽量一句一事，执行人看起来更轻松。'
        actions={
          <Button className='app-button app-button--secondary app-button--mini' onClick={methods.appendItem}>
            新增步骤
          </Button>
        }
        meta={`${methods.items.length} 步`}
      >
        {methods.items.map((method, index) => (
          <View key={`method-${index}`} className='feature-list-card feature-list-card--rose mb-3'>
            <View className='form-dynamic-head'>
              <Text className='feature-list-card__title'>步骤 {index + 1}</Text>
              <Text className='form-text-link' onClick={() => methods.removeItem(index)}>
                删除
              </Text>
            </View>

            <Textarea
              className='form-control form-control--textarea-lg form-control--on-tint'
              placeholder='写清楚这个步骤做什么'
              value={method.content}
              onInput={(event) => methods.updateItem(index, { content: event.detail.value })}
            />
          </View>
        ))}
      </SectionCard>

      {/* 底部操作栏 */}
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

      {/* AI 生成弹窗 */}
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
    </View>
  )
}
