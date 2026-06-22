// ConfirmDialog — 通用确认弹窗
// 替代散落在各页面中的 Taro.showModal 调用，提供更好的视觉效果
import { Button, Text, View } from '@tarojs/components'
import './index.module.scss'

interface ConfirmDialogProps {
  /** 是否可见 */
  visible: boolean
  /** 标题 */
  title: string
  /** 内容描述 */
  description?: string
  /** 确认按钮文字 */
  confirmText?: string
  /** 取消按钮文字 */
  cancelText?: string
  /** 确认按钮色调（warn 为危险操作红色） */
  tone?: 'primary' | 'warn'
  /** 确认中 */
  loading?: boolean
  /** 点击确认 */
  onConfirm: () => void
  /** 点击取消 */
  onCancel: () => void
}

export default function ConfirmDialog({
  visible,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!visible) return null

  const handleMaskClick = () => {
    if (!loading) onCancel()
  }

  return (
    <View className='dialog-mask' onClick={handleMaskClick}>
      <View className='dialog-card dialog-card--confirm' onClick={(e) => e.stopPropagation()}>
        <View className='dialog-card__body'>
          <Text className='dialog-card__title'>{title}</Text>
          {description ? (
            <Text className='dialog-card__description'>{description}</Text>
          ) : null}
        </View>
        <View className='dialog-card__actions dialog-card__actions--split'>
          <Button
            className='app-button app-button--ghost'
            disabled={loading}
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            className={`app-button ${
              tone === 'warn' ? 'app-button--warn' : 'app-button--primary'
            }`}
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
