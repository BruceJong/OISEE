import { Link } from 'react-router-dom';

/** 登录 / 注册 共用的全屏布局（AppShell 外，无导航/页脚） */
export function AuthLayout({ title, subtitle, children, wide }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr', placeItems: 'center', background: 'var(--bg)', padding: '40px 20px', position: 'relative' }}>
      {/* 背景网格 */}
      <div className="blueprint-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: wide ? 560 : 420 }}>
        {/* 品牌 */}
        <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'center', textDecoration: 'none', color: 'inherit', marginBottom: 32 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>OISee</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.15em' }}>看见 · 身边的科学</span>
        </Link>

        <div className="card" style={{ padding: 40, boxShadow: '0 8px 40px rgba(14,26,51,0.08)' }}>
          <h1 style={{ fontSize: 28, marginBottom: subtitle ? 6 : 24 }}>{title}</h1>
          {subtitle && <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 28 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8,
};

export const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
  color: 'var(--ink)', background: 'var(--paper)',
  border: '1px solid var(--hairline)', borderRadius: 8, outline: 'none',
  boxSizing: 'border-box',
};
