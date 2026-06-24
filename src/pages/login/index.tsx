import { useEffect, useState } from 'react'
import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import FormField from '@/components/form-field'
import PageHero from '@/components/page-hero'
import SectionCard from '@/components/section-card'
import { APP_VERSION } from '@/config/app-version'
import { accountLogin, accountRegister, checkAuth } from '@/utils/auth'
import { showErrorToast } from '@/utils/error'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})

  const canSubmit = username.trim().length >= 3 && password.length >= 6

  useEffect(() => {
    if (checkAuth()) {
      Taro.reLaunch({ url: '/pages/workspace-entry/index' })
    }
  }, [])

  const validate = (): boolean => {
    const next: { username?: string; password?: string } = {}
    if (username.trim().length < 3) next.username = '用户名至少 3 位'
    if (password.length < 6) next.password = '密码至少 6 位'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!validate()) return

    setSubmitting(true)
    try {
      Taro.showLoading({ title: mode === 'login' ? '登录中...' : '注册中...' })
      if (mode === 'login') {
        await accountLogin(username.trim(), password)
      } else {
        await accountRegister(username.trim(), password)
      }
      Taro.hideLoading()
      Taro.reLaunch({ url: '/pages/workspace-entry/index' })
    } catch (error) {
      Taro.hideLoading()
      showErrorToast(error, mode === 'login' ? '登录失败' : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View
      className='page-shell page-shell--sky page-shell--login px-4 py-5 animate-fade-in-down'
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <View className='login-page__content'>
        <PageHero
          badge='Welcome'
          title='公主请点餐吧'
          description={mode === 'login' ? '用熟悉的账号重新回到你的小厨房。' : '先创建一个账号，再去建立属于你们的家庭空间。'}
          tone='sky'
        />

        <SectionCard title={mode === 'login' ? '登录' : '注册'} variant='accent'>
          <FormField label='用户名' error={errors.username}>
            <Input
              className='form-control form-control--on-tint'
              confirmType='done'
              value={username}
              maxlength={32}
              placeholder='字母、数字、下划线，3-32 位'
              onConfirm={handleSubmit}
              onInput={(event) => { setUsername(event.detail.value); setErrors((e) => ({ ...e, username: undefined })) }}
            />
          </FormField>

          <FormField label='密码' error={errors.password}>
            <Input
              className='form-control form-control--on-tint'
              confirmType='done'
              password
              value={password}
              maxlength={64}
              placeholder='至少 6 位'
              onConfirm={handleSubmit}
              onInput={(event) => { setPassword(event.detail.value); setErrors((e) => ({ ...e, password: undefined })) }}
            />
          </FormField>

          <View className='action-stack mt-4'>
            <Button
              className='app-button app-button--primary'
              loading={submitting}
              disabled={submitting || !canSubmit}
              onClick={handleSubmit}
            >
              {mode === 'login' ? '登录' : '注册并登录'}
            </Button>
            <Button className='app-button app-button--ghost' onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? '没有账号？去注册' : '已有账号？去登录'}
            </Button>
          </View>
        </SectionCard>
      </View>

      <View className='login-page__version'>版本号：{APP_VERSION}</View>
    </View>
  )
}
