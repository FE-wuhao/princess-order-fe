import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { tagApi } from '../../services/api'

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
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  return (
    <View className='p-5 min-h-screen bg-gray-100'>
      <View className='mb-5'>
        <Text className='text-xl font-bold'>标签管理</Text>
      </View>

      {tags.length > 0 ? (
        <View>
          {tags.map((tag) => (
            <View
              key={tag.id}
              className='bg-white p-4 mb-2-5 rounded-lg flex justify-between items-center'
            >
              <Text className='text-base'>{tag.name}</Text>
              <Text className='text-gray-500 text-sm'>
                {tag.roleType === 'requester'
                  ? '点餐人'
                  : tag.roleType === 'cook'
                    ? '制作者'
                    : '中性'}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View className='text-center py-10 text-gray-500'>暂无标签</View>
      )}
    </View>
  )
}
