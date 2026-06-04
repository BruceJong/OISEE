import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/stores/auth';

export interface ApiOk<T> {
  code: 0;
  message: string;
  data: T;
}

export interface ApiErr {
  code: number;
  message: string;
  data: null;
  details?: unknown;
}

export class BusinessError extends Error {
  code: number;
  details?: unknown;
  constructor(code: number, msg: string, details?: unknown) {
    super(msg);
    this.code = code;
    this.details = details;
  }
}

const client: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (resp) => {
    const body = resp.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      throw new BusinessError(body.code, body.message ?? '请求失败', body.details);
    }
    return body;
  },
  (err: AxiosError<ApiErr>) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      message.error('登录已过期，请重新登录');
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
      return Promise.reject(err);
    }
    const data = err.response?.data;
    const msg = data?.message ?? err.message ?? '网络错误';
    return Promise.reject(new BusinessError(data?.code ?? -1, msg));
  }
);

export default client;
