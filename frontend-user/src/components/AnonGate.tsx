import { Link } from 'react-router-dom';
import { ANON_LIMIT } from '@/utils/gate';

/** 列表中的「锁定」占位卡片 —— 点击进登录页 */
export function LockedCard() {
  return (
    <Link
      to="/login"
      className="card"
      style={{
        position: 'relative', overflow: 'hidden', textDecoration: 'none', color: 'inherit',
        minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, borderStyle: 'dashed', background: 'var(--bg-2)',
      }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', fontSize: 24 }}>🔒</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>登录后解锁</div>
      <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1 }}>LOGIN TO UNLOCK</div>
    </Link>
  );
}

/** 列表底部的登录引导横幅 */
export function AnonGateBanner({ total }: { total: number }) {
  const rest = Math.max(0, total - ANON_LIMIT);
  return (
    <Link
      to="/login"
      style={{
        marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
        padding: '28px 36px', borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)',
        textDecoration: 'none', position: 'relative', overflow: 'hidden',
      }}
    >
      <div className="blueprint-grid-dark" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div className="eyebrow" style={{ color: 'var(--amber)' }}>／  MEMBERS ONLY</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>
          仅展示前 {ANON_LIMIT} 条 · 还有 {rest} 条内容等你解锁
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
          注册 / 登录后即可查看全部物品、知识点与实验
        </div>
      </div>
      <span className="btn amber" style={{ position: 'relative', flexShrink: 0 }}>登录 / 注册 →</span>
    </Link>
  );
}
