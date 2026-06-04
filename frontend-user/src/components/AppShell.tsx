import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

/**
 * 每次路由切换都把滚动位置归零
 *
 * 默认情况下浏览器在 SPA 路由跳转时保留上一页的滚动位置：从长列表
 * 翻到底部后点进详情页，页面会停在底部。这里监听 pathname 变化，
 * 一切换路由就把 window / documentElement / body 都置回顶部。
 *
 * 浏览器原生前进 / 后退也会触发 pathname 变化 → 同样回顶。
 * OISee 大多数页面更适合从顶部重新阅读，所以不去恢复 history scroll。
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

export function AppShell() {
  return (
    <>
      <ScrollToTop />
      <TopNav />
      <Outlet />
      <Footer />
    </>
  );
}

function TopNav() {
  const navItems = [
    { to: '/', label: '首页', exact: true },
    { to: '/scenes', label: '场景探索' },
    { to: '/items', label: '物品仓库' },
    { to: '/knowledge', label: '知识探索' },
    { to: '/experiments', label: '动手实验' },
  ];
  return (
    <header className="topnav">
      <Link to="/" className="logo">
        <span className="name">OISee</span>
        <span className="tagline">看见 · 身边的科学</span>
      </Link>
      <nav>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={({ isActive }) => isActive ? 'active' : ''}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="user-hud">
        <div className="hud-points">
          <b>320</b><span style={{ fontSize: 11 }}>pt</span>
        </div>
        <Link to="/backpack" className="hud-avatar" title="我的书包">航</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="brand-block">
          <div className="logo-line">OISee</div>
          <p>看见身边的科学。一个面向 6-16 岁青少年的科普平台，从生活中的物品出发，建立属于自己的科学思维。</p>
        </div>
        <div>
          <h5>探索</h5>
          <ul>
            <li><Link to="/scenes">场景地图</Link></li>
            <li><Link to="/items">物品仓库</Link></li>
            <li><Link to="/knowledge">知识库</Link></li>
            <li><Link to="/experiments">动手实验</Link></li>
            <li><Link to="/backpack">我的书包</Link></li>
          </ul>
        </div>
        <div>
          <h5>给家长</h5>
          <ul>
            <li><a href="#">教育理念</a></li>
            <li><a href="#">难度分层说明</a></li>
            <li><a href="#">安全与陪伴指南</a></li>
            <li><a href="#">家长账号（即将上线）</a></li>
          </ul>
        </div>
        <div>
          <h5>合规</h5>
          <ul>
            <li><a href="#">用户协议</a></li>
            <li><a href="#">隐私政策</a></li>
            <li><a href="#">未成年人保护</a></li>
            <li><a href="#">内容审核机制</a></li>
          </ul>
        </div>
        <div>
          <h5>联系</h5>
          <ul>
            <li><a href="#">contact@oisee.cn</a></li>
            <li><a href="#">官方微信</a></li>
            <li><a href="#">合作申请</a></li>
            <li><a href="#">意见反馈</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 OISee Science Lab · 面向青少年的生活科普平台</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>ICP 备 2026 0000 号 · v0.1 PROTOTYPE</span>
      </div>
    </footer>
  );
}
