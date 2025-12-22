import Taro from '@tarojs/taro';
import { authApi } from '../services/api';

export const wxLogin = async () => {
  try {
    // 获取微信登录code
    const loginRes = await Taro.login();
    if (!loginRes.code) {
      throw new Error('获取登录code失败');
    }

    // 获取用户信息（需要用户授权）
    let userInfo: { nickname?: string; avatar?: string } = {};
    try {
      const userInfoRes = await Taro.getUserProfile({
        desc: '用于完善用户资料',
      });
      userInfo = {
        nickname: userInfoRes.userInfo.nickName,
        avatar: userInfoRes.userInfo.avatarUrl,
      };
    } catch (err) {
      console.warn('获取用户信息失败，使用默认信息');
    }

    // 调用后端登录接口
    const res = await authApi.wxLogin(loginRes.code, userInfo);
    
    // 保存token
    if (res.token) {
      Taro.setStorageSync('token', res.token);
    }

    return res;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

export const checkAuth = () => {
  const token = Taro.getStorageSync('token');
  return !!token;
};

