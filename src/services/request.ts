import Taro from "@tarojs/taro";
import { isH5 } from "@/utils/platform";

// 使用 Taro 的 defineConstants 定义的常量
// 在编译时会被替换为实际值，不会在运行时访问 process.env
declare const TARO_APP_API_BASE_URL: string;
const BASE_URL = TARO_APP_API_BASE_URL;

interface RequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: any;
  header?: Record<string, string>;
}

const parseResponsePayload = (data: unknown): Record<string, unknown> => {
  if (!data) {
    return {};
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { message: data };
    }
    return { message: data };
  }

  if (typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return {};
};

export const extractResponseMessage = (
  data: unknown,
  fallback = "请求失败",
): string => {
  const payload = parseResponsePayload(data);
  const { message } = payload;

  if (Array.isArray(message)) {
    const text = message
      .filter((item): item is string => typeof item === "string" && item.trim())
      .join("；");
    if (text) {
      return text;
    }
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  return fallback;
};

export const request = async <T = any>(
  options: RequestOptions
): Promise<T> => {
  const token = Taro.getStorageSync("token");
  const header: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.header,
  };

  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || "GET",
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          Taro.removeStorageSync("token");
          Taro.reLaunch({
            url: isH5 ? "/pages/login/index" : "/pages/index/index",
          });
          reject(new Error("未授权，请重新登录"));
        } else {
          reject(new Error(extractResponseMessage(res.data)));
        }
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};
