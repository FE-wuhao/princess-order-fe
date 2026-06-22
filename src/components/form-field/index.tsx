// FormField — 统一的表单字段组件
// 封装 label + control + error message + hint 的通用结构
import { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'
import './index.module.scss'

interface FormFieldProps {
  /** 标签文字 */
  label: string
  /** 内联验证错误信息 */
  error?: string
  /** 是否必填（显示红色星号） */
  required?: boolean
  /** 帮助提示文字 */
  hint?: string
  /** 自定义类名 */
  className?: string
  /** 表单控件 */
  children: ReactNode
}

export default function FormField({
  label,
  error,
  required = false,
  hint,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <View className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
      <View className='form-field__label-row'>
        {required ? <Text className='form-field__required'>*</Text> : null}
        <Text className='form-label'>{label}</Text>
      </View>
      {children}
      {error ? (
        <Text className='form-field__error'>{error}</Text>
      ) : hint ? (
        <Text className='form-field__hint'>{hint}</Text>
      ) : null}
    </View>
  )
}
