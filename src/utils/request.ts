import Taro from "@tarojs/taro";

// 使用 Taro 的 defineConstants 定义的常量
// 在编译时会被替换为实际值，不会在运行时访问 process.env
declare const TARO_APP_API_BASE_URL: string;
const BASE_URL = TARO_APP_API_BASE_URL;

interface RequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: any;
  header?: Record<string, string>;
}

export const request = async <T = any>(
  options: RequestOptions
): Promise<T> => {
  const token = Taro.getStorageSync("token");

  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || "GET",
      data: options.data,
      header: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.header,
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          // 未授权，清除token并跳转到登录
          Taro.removeStorageSync("token");
          Taro.reLaunch({
            url: "/pages/index/index",
          });
          reject(new Error("未授权，请重新登录"));
        } else {
          reject(new Error(res.data?.message || "请求失败"));
        }
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};
