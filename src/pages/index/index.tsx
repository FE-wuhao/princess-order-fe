import { useState, useEffect, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { groupApi } from '../../services/api'
import { wxLogin, checkAuth } from '../../utils/auth'

interface Group {
  id: number
  name: string
  adminId: number
}

export default function Index() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const data = await groupApi.getList()
      setGroups(data)
    } catch (error) {
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const checkLoginAndLoadGroups = useCallback(async () => {
    if (!checkAuth()) {
      try {
        await wxLogin()
      } catch (error) {
        Taro.showToast({
          title: '登录失败',
          icon: 'none',
        })
        return
      }
    }
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    checkLoginAndLoadGroups()
  }, [checkLoginAndLoadGroups])

  useDidShow(() => {
    loadGroups()
  })

  const handleCreateGroup = () => {
    Taro.navigateTo({
      url: '/pages/group/create',
    })
  }

  const handleGroupClick = (groupId: number) => {
    Taro.navigateTo({
      url: `/pages/group/index?id=${groupId}`,
    })
  }

  return (
    <View className='p-5 min-h-screen bg-gray-100'>
      <View className='flex justify-between items-center mb-5'>
        <Text className='text-xl font-bold'>我的分组</Text>
        <Button size='mini' type='primary' onClick={handleCreateGroup}>
          创建分组
        </Button>
      </View>

      {loading ? (
        <View className='text-center py-10 text-gray-500'>加载中...</View>
      ) : groups.length === 0 ? (
        <View className='text-center py-10 text-gray-500'>
          <Text>暂无分组，点击上方按钮创建</Text>
        </View>
      ) : (
        <View>
          {groups.map((group) => (
            <View
              key={group.id}
              className='bg-white p-4 mb-2.5 rounded-lg flex justify-between items-center shadow-sm'
              onClick={() => handleGroupClick(group.id)}
            >
              <Text className='text-base'>{group.name}</Text>
              <Text className='text-gray-500 text-xl'>›</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
