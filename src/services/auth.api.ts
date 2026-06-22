import { request } from './request'
import type { LoginResponse, WxLoginDto, UsernameLoginDto, RegisterDto } from '@shared/types'

export const authApi = {
  wxLogin: (code: string, userInfo?: { nickname?: string; avatar?: string }) =>
    request<LoginResponse>({
      url: '/auth/wx-login',
      method: 'POST',
      data: { code, ...userInfo } as WxLoginDto,
    }),

  login: (username: string, password: string) =>
    request<LoginResponse>({
      url: '/auth/login',
      method: 'POST',
      data: { username, password } as UsernameLoginDto,
    }),

  register: (username: string, password: string) =>
    request<LoginResponse>({
      url: '/auth/register',
      method: 'POST',
      data: { username, password } as RegisterDto,
    }),
}
