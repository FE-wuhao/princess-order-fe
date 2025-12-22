import { useState, useEffect, useCallback } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { userApi } from '../../services/api'

export default function Profile() {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await userApi.getProfile()
      setUser(data)
    } catch (error) {
      Taro.showToast({
        title: '加载失败',
        icon: 'none',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (loading) {
    return <View className='p-5'>加载中...</View>
  }

  return (
    <View className='p-5 min-h-screen bg-gray-100'>
      <View className='mb-5'>
        <Text className='text-xl font-bold'>个人中心</Text>
      </View>

      {user && (
        <View className='bg-white p-5 rounded-lg'>
          <Text className='text-base'>{user.nickname || '未设置昵称'}</Text>
        </View>
      )}
    </View>
  )
}
