import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { tagApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'

interface RoleTemplate {
  id: number
  name: string
  roleType: 'requester' | 'cook' | 'both' | 'neutral'
  isDefault?: boolean
}

const roleOptions: Array<{
  label: string
  value: RoleTemplate['roleType']
}> = [
  { label: '点餐人', value: 'requester' },
  { label: '制作者', value: 'cook' },
  { label: '双角色', value: 'both' },
  { label: '中性', value: 'neutral' },
]

export default function Tag() {
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([])
  const [loading, setLoading] = useState(false)

  const workspaceId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.workspaceId || '0')
  }, [])

  const loadRoleTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tagApi.getList(workspaceId)
      setRoleTemplates(data || [])
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadRoleTemplates()
  }, [loadRoleTemplates])

  const handleCreate = async () => {
    const nameResult = await Taro.showModal({
      title: '新建称谓模板',
      editable: true,
      placeholderText: '例如：管家、小厨、主厨',
      confirmText: '下一步',
    })

    if (!nameResult.confirm) {
      return
    }

    const name = nameResult.content?.trim()
    if (!name) {
      Taro.showToast({
        title: '请输入模板名称',
        icon: 'none',
      })
      return
    }

    const roleTypeResult = await Taro.showActionSheet({
      itemList: roleOptions.map((option) => option.label),
    })

    const selectedRoleType = roleOptions[roleTypeResult.tapIndex]?.value
    if (!selectedRoleType) {
      return
    }

    try {
      Taro.showLoading({ title: '创建中...' })
      await tagApi.create(workspaceId, name, selectedRoleType)
      Taro.hideLoading()
      Taro.showToast({
        title: '已创建',
        icon: 'success',
      })
      await loadRoleTemplates()
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '创建失败')
    }
  }

  const handleDelete = async (roleTemplate: RoleTemplate) => {
    const result = await Taro.showModal({
      title: '删除称谓模板',
      content: `确定删除「${roleTemplate.name}」吗？`,
      confirmText: '删除',
    })

    if (!result.confirm) {
      return
    }

    try {
      Taro.showLoading({ title: '删除中...' })
      await tagApi.delete(workspaceId, roleTemplate.id)
      Taro.hideLoading()
      Taro.showToast({
        title: '已删除',
        icon: 'success',
      })
      await loadRoleTemplates()
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, '删除失败')
    }
  }

  if (loading) {
    return (
      <View className='page-shell px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  const roleLabel = (roleType: RoleTemplate['roleType']) =>
    roleOptions.find((item) => item.value === roleType)?.label || '未定义'

  const roleTone = (roleType: RoleTemplate['roleType']) =>
    roleType === 'requester'
      ? 'warning'
      : roleType === 'cook'
      ? 'accent'
      : roleType === 'both'
      ? 'success'
      : 'neutral'

  return (
    <View className='page-shell px-4 py-5'>
      <PageHero
        badge='Role Templates'
        title='称谓模板'
        description='称谓模板用于沉淀空间里的常用身份叫法，成员页会直接引用它。'
        tone='brand'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>模板数量</Text>
              <Text className='hero-stat-card__value'>{roleTemplates.length}</Text>
              <Text className='hero-stat-card__hint'>按空间维度维护</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>当前空间</Text>
              <Text className='hero-stat-card__value'>{workspaceId ? '已定位' : '未知'}</Text>
              <Text className='hero-stat-card__hint'>从空间页进入更准确</Text>
            </View>
          </View>
        }
        actions={
          <Button className='app-button app-button--primary' onClick={handleCreate}>
            新建模板
          </Button>
        }
      />

      <SectionCard
        title='模板列表'
        description='双角色适合既能发任务也能接任务的人，其余模板更偏单一职责。'
        meta={`${roleTemplates.length} 条`}
        variant='soft'
      >
        {roleTemplates.length > 0 ? (
          <View>
            {roleTemplates.map((roleTemplate) => (
              <View key={roleTemplate.id} className='feature-list-card'>
                <View className='flex items-center justify-between'>
                  <Text className='feature-list-card__title'>{roleTemplate.name}</Text>
                  <StatusChip
                    label={roleLabel(roleTemplate.roleType)}
                    tone={roleTone(roleTemplate.roleType)}
                  />
                </View>
                <Text className='feature-list-card__meta'>
                  {roleTemplate.isDefault ? '默认模板' : '自定义模板'}
                </Text>
                {!roleTemplate.isDefault ? (
                  <View className='mt-3'>
                    <Button
                      className='app-button app-button--ghost app-button--mini'
                      onClick={() => handleDelete(roleTemplate)}
                    >
                      删除模板
                    </Button>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            tone='gray'
            title='暂无称谓模板'
            description='先从这里沉淀一套常用称谓，成员页会更好配置。'
          />
        )}
      </SectionCard>
    </View>
  )
}
