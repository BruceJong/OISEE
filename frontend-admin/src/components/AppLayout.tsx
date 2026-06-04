import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, theme } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  BulbOutlined,
  BookOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

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
    { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/scenes', icon: <AppstoreOutlined />, label: '场景管理' },
    { key: '/items', icon: <BulbOutlined />, label: '物品管理' },
    { key: '/knowledge', icon: <BookOutlined />, label: '知识点管理' },
  ];

  const selectedKey =
    menuItems.find((m) => m.key !== '/' && location.pathname.startsWith(m.key))?.key ?? '/';

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
            fontWeight: 600,
            letterSpacing: 2,
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
          }}
        >
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
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{admin?.username ?? '管理员'}</span>
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
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
