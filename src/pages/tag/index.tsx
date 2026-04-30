import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import EmptyState from '@/components/empty-state'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import StatusChip from '@/components/status-chip'
import { tagApi } from '@/services/api'
import { showErrorToast } from '@/utils/error'

interface Tag {
  id: number
  name: string
  roleType: 'requester' | 'cook' | 'neutral'
}

export default function Tag() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)

  const groupId = useMemo(() => {
    const params = Taro.getCurrentInstance().router?.params
    return parseInt(params?.groupId || '0')
  }, [])

  const loadTags = useCallback(async () => {
    setLoading(true)
    try {
      const data = await tagApi.getList(groupId)
      setTags(data)
    } catch (error) {
      showErrorToast(error, '加载失败')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  if (loading) {
    return (
      <View className='page-shell px-4 py-5'>
        <Text className='block text-center text-gray-500'>加载中...</Text>
      </View>
    )
  }

  const roleLabel = (roleType: Tag['roleType']) =>
    roleType === 'requester' ? '点餐人' : roleType === 'cook' ? '制作者' : '中性'

  const roleTone = (roleType: Tag['roleType']) =>
    roleType === 'requester' ? 'warning' : roleType === 'cook' ? 'accent' : 'neutral'

  return (
    <View className='page-shell px-4 py-5'>
      <PageHero
        badge='Tags'
        title='标签管理'
        description='标签用于快速识别角色偏好，成员页里也能直接绑定标签。'
        tone='brand'
        stats={
          <View className='hero-stat-grid'>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>标签数量</Text>
              <Text className='hero-stat-card__value'>{tags.length}</Text>
              <Text className='hero-stat-card__hint'>按分组维度维护</Text>
            </View>
            <View className='hero-stat-card'>
              <Text className='hero-stat-card__label'>当前分组</Text>
              <Text className='hero-stat-card__value'>{groupId ? '已定位' : '未知'}</Text>
              <Text className='hero-stat-card__hint'>从分组页进入更准确</Text>
            </View>
          </View>
        }
      />

      <SectionCard
        title='标签列表'
        description='目前仅展示与角色类型，后续可以扩展默认标签等配置。'
        meta={`${tags.length} 条`}
        variant='soft'
      >
        {tags.length > 0 ? (
          <View>
            {tags.map((tag) => (
              <View key={tag.id} className='feature-list-card'>
                <View className='flex items-center justify-between'>
                  <Text className='feature-list-card__title'>{tag.name}</Text>
                  <StatusChip label={roleLabel(tag.roleType)} tone={roleTone(tag.roleType)} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState tone='gray' title='暂无标签' description='先从成员页或这里开始沉淀一套常用标签。' />
        )}
      </SectionCard>
    </View>
  )
}
