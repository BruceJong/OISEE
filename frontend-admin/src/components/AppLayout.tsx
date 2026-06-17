import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, theme, Typography } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  BulbOutlined,
  BookOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { NotificationCenter } from './NotificationCenter';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    { key: '/',          icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/scenes',    icon: <AppstoreOutlined />,  label: '场景管理' },
    { key: '/items',     icon: <BulbOutlined />,      label: '物品管理' },
    { key: '/knowledge', icon: <BookOutlined />,      label: '知识点管理' },
    { key: '/experiments', icon: <ExperimentOutlined />, label: '实验管理' },
    { key: '/settings',  icon: <SettingOutlined />,   label: '系统设置' },
  ];

  const selectedKey =
    menuItems
      .filter((m) => m.key !== '/')
      .find((m) => location.pathname.startsWith(m.key))?.key ?? '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 16 : 20,
            fontWeight: 700,
            letterSpacing: 2,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? 'OI' : 'OISee CMS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            gap: 8,
          }}
        >
          {/* 通知中心 */}
          <NotificationCenter />

          {/* 用户菜单 */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: () => {
                    logout();
                    navigate('/login');
                  },
                },
              ],
            }}
          >
            <Space style={{ cursor: 'pointer', marginLeft: 4 }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Typography.Text>{admin?.username ?? '管理员'}</Typography.Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 112px)',
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
