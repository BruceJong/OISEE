import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { BusinessError } from '@/api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: { username: string; password: string }) {
    setLoading(true);
    try {
      const result = await authApi.login(values.username, values.password);
      login(result);
      message.success(`欢迎回来，${result.admin.username}`);
      navigate('/');
    } catch (e) {
      message.error(e instanceof BusinessError ? e.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #0E1A33 0%, #1A2B4D 100%)',
      }}
    >
      <Card style={{ width: 380, padding: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ margin: 0, color: '#0E1A33' }}>OISee CMS</h2>
          <p style={{ marginTop: 8, color: '#6B7A98', fontSize: 13 }}>内容管理系统</p>
        </div>
        <Form
          name="login"
          size="large"
          initialValues={{ username: 'admin', password: 'admin123456' }}
          onFinish={onSubmit}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          默认账号：admin / admin123456
        </div>
      </Card>
    </div>
  );
}
