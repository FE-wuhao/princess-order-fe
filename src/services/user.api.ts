import { request } from './request'
import type { User } from '@shared/types'

export const userApi = {
  getProfile: () => request<User>({ url: '/users/profile' }),

  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    request<User>({
      url: '/users/profile',
      method: 'PATCH',
      data,
    }),
}
