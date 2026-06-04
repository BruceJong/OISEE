import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
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
    const msg = err.response?.data?.message ?? err.message ?? '网络错误';
    return Promise.reject(new Error(msg));
  }
);

export default client;
