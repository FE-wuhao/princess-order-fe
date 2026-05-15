import { useEffect, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { accountLogin, accountRegister, checkAuth } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (checkAuth()) {
      Taro.switchTab({ url: '/pages/index/index' })
    }
  }, [])

  const handleSubmit = async () => {
    const name = username.trim()
    const pwd = password

    if (!name) {
      Taro.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }

    if (pwd.length < 6) {
      Taro.showToast({ title: '密码至少 6 位', icon: 'none' })
      return
    }

    if (submitting) {
      return
    }

    setSubmitting(true)
    try {
      Taro.showLoading({ title: mode === 'login' ? '登录中...' : '注册中...' })
      if (mode === 'login') {
        await accountLogin(name, pwd)
      } else {
        await accountRegister(name, pwd)
      }
      Taro.hideLoading()
      Taro.switchTab({ url: '/pages/index/index' })
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, mode === 'login' ? '登录失败' : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'))
  }

  return (
    <View className='page-shell page-shell--sky px-4 py-5'>
      <PageHero
        title='公主请点餐吧'
        subtitle={mode === 'login' ? '账号登录' : '注册新账号'}
      />

      <View className='mt-4'>
      <SectionCard title={mode === 'login' ? '登录' : '注册'} variant='accent'>
        <View className='form-field'>
          <Text className='form-label'>用户名</Text>
          <Input
            className='form-control form-control--on-tint'
            value={username}
            maxlength={32}
            placeholder='字母、数字、下划线，3-32 位'
            onInput={(event) => setUsername(event.detail.value)}
          />
        </View>

        <View className='form-field'>
          <Text className='form-label'>密码</Text>
          <Input
            className='form-control form-control--on-tint'
            password
            value={password}
            maxlength={64}
            placeholder='至少 6 位'
            onInput={(event) => setPassword(event.detail.value)}
          />
        </View>

        <View className='action-stack mt-4'>
          <Button
            className='app-button app-button--primary'
            loading={submitting}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {mode === 'login' ? '登录' : '注册并登录'}
          </Button>

          <Button className='app-button app-button--ghost' onClick={toggleMode}>
            {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
          </Button>
        </View>
      </SectionCard>
      </View>
    </View>
  )
}
