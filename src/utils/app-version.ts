import Taro from '@tarojs/taro'
import {
  APP_VERSION,
  APP_VERSION_PREVIOUS_STORAGE_KEY,
  APP_VERSION_RECORD_TIME_STORAGE_KEY,
  APP_VERSION_STORAGE_KEY,
} from '@/config/app-version'

export const recordAppVersion = (version = APP_VERSION) => {
  const currentVersion = String(Taro.getStorageSync(APP_VERSION_STORAGE_KEY) || '')
  const now = new Date().toISOString()

  if (currentVersion && currentVersion !== version) {
    Taro.setStorageSync(APP_VERSION_PREVIOUS_STORAGE_KEY, currentVersion)
  }

  Taro.setStorageSync(APP_VERSION_STORAGE_KEY, version)
  Taro.setStorageSync(APP_VERSION_RECORD_TIME_STORAGE_KEY, now)

  return {
    currentVersion: version,
    previousVersion: currentVersion || '',
    recordedAt: now,
  }
}

export const getStoredAppVersion = () =>
  String(Taro.getStorageSync(APP_VERSION_STORAGE_KEY) || APP_VERSION)

export const getPreviousStoredAppVersion = () =>
  String(Taro.getStorageSync(APP_VERSION_PREVIOUS_STORAGE_KEY) || '')

export const getAppVersionRecordedAt = () =>
  String(Taro.getStorageSync(APP_VERSION_RECORD_TIME_STORAGE_KEY) || '')
