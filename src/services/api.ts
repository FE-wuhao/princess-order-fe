import { request } from '../utils/request';

// 认证相关
export const authApi = {
  wxLogin: (code: string, userInfo?: { nickname?: string; avatar?: string }) =>
    request({
      url: '/auth/wx-login',
      method: 'POST',
      data: { code, ...userInfo },
    }),
};

// 用户相关
export const userApi = {
  getProfile: () => request({ url: '/users/profile' }),
};

// 分组相关
export const groupApi = {
  getList: () => request({ url: '/groups' }),
  getDetail: (id: number) => request({ url: `/groups/${id}` }),
  create: (name: string) => request({ url: '/groups', method: 'POST', data: { name } }),
  addMember: (groupId: number, userId: number, role?: 'princess' | 'servant', tagName?: string) =>
    request({
      url: `/groups/${groupId}/members`,
      method: 'POST',
      data: { userId, role, tagName },
    }),
  removeMember: (groupId: number, userId: number) =>
    request({
      url: `/groups/${groupId}/members/${userId}`,
      method: 'DELETE',
    }),
};

// 菜谱相关
export const recipeApi = {
  getList: (groupId: number) => request({ url: `/groups/${groupId}/recipes` }),
  getDetail: (id: number) => request({ url: `/recipes/${id}` }),
  create: (groupId: number, name: string) =>
    request({
      url: `/groups/${groupId}/recipes`,
      method: 'POST',
      data: { name },
    }),
  update: (id: number, name: string) =>
    request({
      url: `/recipes/${id}`,
      method: 'PUT',
      data: { name },
    }),
  delete: (id: number) =>
    request({
      url: `/recipes/${id}`,
      method: 'DELETE',
    }),
  addMethod: (recipeId: number, content: string) =>
    request({
      url: `/recipes/${recipeId}/methods`,
      method: 'POST',
      data: { content },
    }),
  updateMethod: (recipeId: number, methodId: number, content: string) =>
    request({
      url: `/recipes/${recipeId}/methods/${methodId}`,
      method: 'PUT',
      data: { content },
    }),
  deleteMethod: (recipeId: number, methodId: number) =>
    request({
      url: `/recipes/${recipeId}/methods/${methodId}`,
      method: 'DELETE',
    }),
  addAiMethods: (recipeId: number) =>
    request({
      url: `/recipes/${recipeId}/ai-methods`,
      method: 'POST',
    }),
};

// 点餐相关
export const orderApi = {
  create: (groupId: number, recipeId: number, servantId: number) =>
    request({
      url: '/orders',
      method: 'POST',
      data: { groupId, recipeId, servantId },
    }),
  getList: (groupId?: number, role?: 'princess' | 'servant') => {
    const params: any = {};
    if (groupId) params.groupId = groupId;
    if (role) params.role = role;
    const query = new URLSearchParams(params).toString();
    return request({ url: `/orders${query ? `?${query}` : ''}` });
  },
  getDetail: (id: number) => request({ url: `/orders/${id}` }),
  start: (id: number) =>
    request({
      url: `/orders/${id}/start`,
      method: 'PUT',
    }),
  complete: (id: number) =>
    request({
      url: `/orders/${id}/complete`,
      method: 'PUT',
    }),
};

// 标签相关
export const tagApi = {
  getList: (groupId: number, roleType?: 'princess' | 'servant') => {
    const query = roleType ? `?roleType=${roleType}` : '';
    return request({ url: `/groups/${groupId}/tags${query}` });
  },
  create: (groupId: number, name: string, roleType: 'princess' | 'servant') =>
    request({
      url: `/groups/${groupId}/tags`,
      method: 'POST',
      data: { name, roleType },
    }),
  update: (id: number, name?: string, roleType?: 'princess' | 'servant') =>
    request({
      url: `/tags/${id}`,
      method: 'PUT',
      data: { name, roleType },
    }),
  delete: (id: number) =>
    request({
      url: `/tags/${id}`,
      method: 'DELETE',
    }),
};

