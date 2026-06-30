import { Button, Input, Text, Textarea, View } from '@tarojs/components'

interface InputDialogProps {
  visible: boolean
  title: string
  value: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  multiline?: boolean
  loading?: boolean
  maxLength?: number
  onChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export default function InputDialog({
  visible,
  title,
  value,
  placeholder,
  confirmText = '确认',
  cancelText = '取消',
  multiline = false,
  loading = false,
  maxLength = 200,
  onChange,
  onCancel,
  onConfirm,
}: InputDialogProps) {
  if (!visible) {
    return null
  }

  return (
    <View className='dialog-mask'>
      <View className='dialog-card'>
        <Text className='dialog-card__title'>{title}</Text>
        {multiline ? (
          <Textarea
            className='form-control form-control--textarea-lg mt-4'
            maxlength={maxLength}
            placeholder={placeholder}
            value={value}
            onInput={(event) => onChange(event.detail.value)}
          />
        ) : (
          <Input
            className='form-control dialog-card__input mt-4'
            maxlength={maxLength}
            confirmType='done'
            placeholder={placeholder}
            placeholderClass='dialog-card__input-placeholder'
            value={value}
            onConfirm={onConfirm}
            onInput={(event) => onChange(event.detail.value)}
          />
        )}
        <View className='dialog-card__actions'>
          <Button className='app-button app-button--ghost' disabled={loading} onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            className='app-button app-button--primary'
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </View>
      </View>
    </View>
  )
}
