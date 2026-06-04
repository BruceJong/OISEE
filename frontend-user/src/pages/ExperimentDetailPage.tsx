import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi } from '@/api/content';

export function ExperimentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: exp, isLoading } = useQuery({
    queryKey: ['public', 'experiment', slug],
    queryFn: () => contentApi.experimentBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 2 }}>LOADING...</div>;
  if (!exp) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>实验不存在</div>;

  const kps = exp.knowledgePoints ?? [];
  const materialsHome = (exp.materialsHome as string[]) ?? [];
  const materialsKit = (exp.materialsKit as string[]) ?? [];
  const lvBg: Record<string, string> = {
    L1: 'linear-gradient(135deg, #1F3A2C 0%, #4A8662 100%)',
    L2: 'linear-gradient(135deg, #3E2A0F 0%, #D89531 100%)',
    L3: 'linear-gradient(135deg, #3D2B4F 0%, #6B4D8C 100%)',
  };

  function markDone() {
    setDone(true); setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2400);
  }

  return (
    <div>
      {/* 顶部 */}
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="page" style={{ paddingBottom: 56 }}>
          <button onClick={() => nav('/experiments')} style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <span>←</span> 返回实验库
          </button>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56, alignItems: 'center' }}>
            {/* 视频封面 */}
            <div style={{ aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', position: 'relative', background: lvBg[exp.difficulty] ?? lvBg.L1, border: '1px solid var(--hairline)' }}>
              {exp.coverUrl ? (
                <img src={exp.coverUrl} alt={exp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}/>
              ) : (
                <svg viewBox="0 0 1200 675" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
                  <defs><pattern id="expvid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 0 0 L 0 48 M 0 0 L 48 0" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/></pattern></defs>
                  <rect width="100%" height="100%" fill="url(#expvid)"/>
                  <g transform="translate(600 340)" opacity="0.85">
                    <ellipse cx="0" cy="60" rx="220" ry="20" fill="rgba(255,255,255,0.08)"/>
                    <rect x="-120" y="-100" width="240" height="160" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6"/>
                    <circle r="40" fill="rgba(255,255,255,0.7)"/><circle r="30" fill="rgba(255,255,255,0.95)"/>
                  </g>
                </svg>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,26,51,0.7) 0%, transparent 60%)' }}/>
              <div style={{ position: 'absolute', left: 32, bottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button style={{ width: 64, height: 64, borderRadius: 999, border: 'none', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>
                </button>
                <div style={{ color: 'var(--paper)' }}>
                  <div className="font-mono" style={{ fontSize: 10, opacity: 0.7, letterSpacing: 2 }}>DEMO VIDEO</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{exp.name}</div>
                </div>
              </div>
            </div>
            {/* 信息 */}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className={`tag ${exp.difficulty}`}>{`${exp.difficulty} · ${{L1:'启蒙',L2:'探索',L3:'深化'}[exp.difficulty]}`}</span>
                {exp.materialType && <span className="tag">{exp.materialType}</span>}
                <span className="tag">⏱ {exp.durationMin} 分钟</span>
                {exp.needParent && <span className="tag" style={{ background: 'rgba(201,87,70,0.08)', color: 'var(--coral)', borderColor: 'rgba(201,87,70,0.4)' }}>👪 家长陪同</span>}
              </div>
              <h1 style={{ fontSize: 52, lineHeight: 1.1 }}>{exp.name}</h1>
              <p className="lead" style={{ marginTop: 16, maxWidth: 480 }}>{exp.description}</p>
              {kps.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>用到的知识点</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {kps.map((k: any) => {
                      const kp = k.knowledgePoint ?? k;
                      return (
                        <Link key={kp.id} to={`/knowledge/${kp.slug}`} className="tag lift" style={{ cursor: 'pointer', padding: '6px 12px' }}>
                          {kp.name} →
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {exp.safety && (
                <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(201,87,70,0.06)', borderLeft: '2px solid var(--coral)' }}>
                  <div className="eyebrow" style={{ color: 'var(--coral)', marginBottom: 4 }}>安全提示</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{exp.safety}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page">
        {/* 材料 */}
        <div className="eyebrow">／  MATERIALS · 所需材料</div>
        <h2 style={{ marginTop: 14, fontSize: 36 }}>准备这些</h2>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <MaterialPanel title="材料包" en="MATERIAL KIT" subtitle="一站式套装，省心可买" items={materialsKit} ctaLabel="加入心愿单（二期开放采购）"/>
          <MaterialPanel title="家里的物品" en="HOME ITEMS" subtitle="翻翻家里，可以替代" items={materialsHome}/>
        </div>

        {/* 完成按钮 */}
        <hr className="hr" style={{ marginTop: 56, marginBottom: 40 }}/>
        <div style={{ padding: 48, textAlign: 'center', background: done ? 'linear-gradient(135deg, #E2EBE0 0%, #C7DDC4 100%)' : 'var(--ink)', color: done ? 'var(--ink)' : 'var(--paper)', borderRadius: 12 }}>
          {!done ? (
            <>
              <div className="eyebrow" style={{ color: 'var(--amber)', marginBottom: 14 }}>READY?</div>
              <h2 style={{ fontSize: 40, color: 'var(--paper)' }}>做完了吗？</h2>
              <p style={{ marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>点击下方按钮记录你的完成 · 二期支持上传照片打卡</p>
              <button className="btn amber lg" style={{ marginTop: 28 }} onClick={markDone}>✓ 我做完啦</button>
            </>
          ) : (
            <>
              <div className="eyebrow" style={{ color: 'var(--green)', marginBottom: 14 }}>COMPLETE</div>
              <h2 style={{ fontSize: 40 }}>太棒了！</h2>
              <p style={{ marginTop: 12, fontSize: 15, color: 'var(--ink-2)' }}>{exp.name} 已完成 · +50 积分 · 计入实验类勋章</p>
              <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn primary" onClick={() => nav('/experiments')}>看看其他实验</button>
                <button className="btn ghost" onClick={() => nav('/backpack')}>查看我的书包</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showConfetti && <Confetti />}
    </div>
  );
}

function MaterialPanel({ title, en, subtitle, items, ctaLabel }: { title: string; en: string; subtitle: string; items: string[]; ctaLabel?: string }) {
  if (!items.length) {
    return (
      <div className="card" style={{ padding: 28, opacity: 0.5 }}>
        <div className="eyebrow">／  {en}</div>
        <h3 style={{ marginTop: 14, fontSize: 24 }}>{title}</h3>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>本实验未提供此选项</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 28 }}>
      <div className="eyebrow">／  {en}</div>
      <h3 style={{ marginTop: 14, fontSize: 24 }}>{title}</h3>
      <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>{subtitle}</p>
      <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid var(--hairline)' }}>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', width: 24, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{it}</span>
          </li>
        ))}
      </ul>
      {ctaLabel && <button className="btn ghost" style={{ marginTop: 20 }}>{ctaLabel}</button>}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => i);
  const colors = ['var(--amber)', 'var(--blue)', 'var(--green)', 'var(--coral)'];
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      {pieces.map(i => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 1.6 + Math.random() * 1;
        const size = 6 + Math.random() * 6;
        return (
          <div key={i} style={{ position: 'absolute', left: `${left}%`, top: -20, width: size, height: size * 1.4, background: colors[i % colors.length], animation: `confetti-fall ${duration}s ${delay}s ease-in forwards` }}/>
        );
      })}
    </div>
  );
}
