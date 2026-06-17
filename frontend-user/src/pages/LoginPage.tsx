import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuth } from '@/utils/auth';
import { AuthLayout, fieldStyle, labelStyle } from './auth-shared';

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { setSession } = useAuth();
  const from = (loc.state as { from?: string } | null)?.from ?? '/backpack';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'wechat'>('password');
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(username.trim(), password);
      setSession({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken });
      nav(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleWechatLogin() {
    setError(null);
    setLoading(true);
    setScanned(true);
    try {
      const profile = await authApi.wechatMockScan();
      const res = await authApi.wechatLogin(profile);
      setSession({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken });
      nav(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? '微信登录失败');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="欢迎回来" subtitle="登录后继续你的科学探索">
      {/* 切换：账密 / 微信 */}
      <div style={{ display: 'flex', gap: 4, border: '1px solid var(--hairline)', borderRadius: 999, padding: 4, marginBottom: 28 }}>
        <TabBtn active={mode === 'password'} onClick={() => setMode('password')}>账号密码</TabBtn>
        <TabBtn active={mode === 'wechat'} onClick={() => setMode('wechat')}>微信扫码</TabBtn>
      </div>

      {mode === 'password' ? (
        <form onSubmit={handlePasswordLogin}>
          <label style={labelStyle}>用户名</label>
          <input style={fieldStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入用户名" autoFocus />
          <label style={{ ...labelStyle, marginTop: 18 }}>密码</label>
          <input style={fieldStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
          {error && <div style={errStyle}>{error}</div>}
          <button className="btn primary lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 200, height: 200, margin: '0 auto', borderRadius: 12,
            border: '1px solid var(--hairline)', background: 'var(--bg-2)',
            display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {/* 二维码占位 */}
            <div style={{ fontSize: 80, opacity: scanned ? 0.25 : 0.85 }}>▦</div>
            {scanned && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(74,134,98,0.92)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 600 }}>
                {loading ? '扫码中…' : '✓ 已扫码'}
              </div>
            )}
          </div>
          <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 16 }}>请使用微信扫描二维码登录（演示环境为模拟扫码）</p>
          {error && <div style={errStyle}>{error}</div>}
          <button className="btn amber lg" onClick={handleWechatLogin} disabled={loading} style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
            {loading ? '处理中…' : '模拟扫码登录'}
          </button>
        </div>
      )}

      <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        还没有账号？<Link to="/register" style={{ color: 'var(--amber)', fontWeight: 600 }}>立即注册</Link>
      </div>
    </AuthLayout>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        flex: 1, padding: '8px 0', borderRadius: 999, fontSize: 13, fontWeight: 600,
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        transition: 'background .15s',
      }}
    >
      {children}
    </button>
  );
}

const errStyle: React.CSSProperties = {
  marginTop: 16, padding: '10px 14px', borderRadius: 8,
  background: 'rgba(201,87,70,0.08)', border: '1px solid rgba(201,87,70,0.3)',
  color: 'var(--coral)', fontSize: 13,
};
