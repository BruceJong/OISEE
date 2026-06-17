import axios from 'axios';
import { getToken, clearSession } from '@/utils/auth';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 30000, // 思考模型（年级定位）可能较慢
});

// 请求拦截：附带登录 token
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (resp) => {
    const body = resp.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      throw new Error(body.message ?? '请求失败');
    }
    return body;
  },
  (err) => {
    // 401：登录态失效 → 清理本地 session
    if (err.response?.status === 401) {
      clearSession();
    }
    const msg = err.response?.data?.message ?? err.message ?? '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default client;
