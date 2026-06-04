import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi } from '@/api/content';
import { useBackNav, useBackStack, popBack, pushBack } from '@/utils/back-nav';

const userLevel = 'L2';
const ORDER: Record<string, number> = { L1: 1, L2: 2, L3: 3 };
function ord(k: string) { return ORDER[k] ?? 0; }

const SUBJECT_COLOR: Record<string, string> = {
  PHYSICS: '#305FBE', CHEMISTRY: '#C95746', BIOLOGY: '#4A8662', GEOGRAPHY: '#8C6B2A', OTHER: '#6B4D8C',
};
const SUBJECT_ICON: Record<string, string> = {
  PHYSICS: '⚛', CHEMISTRY: '⚗', BIOLOGY: '🧬', GEOGRAPHY: '🌍', OTHER: '🔬',
};
const SUBJECT_LABEL: Record<string, string> = {
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物', GEOGRAPHY: '地理', OTHER: '其他',
};

export function KnowledgeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const back = useBackNav();
  const stack = useBackStack();

  const { data: kp, isLoading } = useQuery({
    queryKey: ['public', 'kp', slug],
    queryFn: () => contentApi.knowledgeBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 2 }}>
      LOADING...
    </div>
  );
  if (!kp) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>知识点不存在</div>;

  const locked = ord(kp.difficulty) > ord(userLevel);
  const relItems = kp.items ?? [];
  const related = kp.related ?? [];

  return (
    <div>
      {/* 头部 */}
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="page" style={{ paddingBottom: 64 }}>
          <button
            onClick={() => {
              const target = popBack(stack);
              if (target) nav(target.url, { state: target.state });
              else nav('/knowledge');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <span>←</span> 返回{back?.label ?? '知识库'}
          </button>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            {/* 左：文字 */}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <LevelTag level={kp.difficulty}/>
                <span className="tag">{SUBJECT_LABEL[kp.subject] ?? kp.subject}</span>
              </div>
              <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>{kp.name}</h1>
              {!locked ? (
                <p className="lead" style={{ marginTop: 24, maxWidth: 540 }}>{kp.summary}</p>
              ) : (
                <div style={{ marginTop: 28, padding: '20px 24px', background: 'var(--bg)', borderLeft: '2px solid var(--amber)', maxWidth: 540 }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>已锁定</div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>需达到 {kp.difficulty} 难度才能查看完整内容 · 当前难度 {userLevel}</p>
                </div>
              )}
            </div>
            {/* 右：封面 */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--hairline)' }}>
              <KnowledgeCover subject={kp.subject} name={kp.name} illustrationUrl={kp.illustrationUrl}/>
            </div>
          </div>
        </div>
      </div>

      {/* 正文 + 侧栏 */}
      <div className="page">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 56 }}>
          {/* 主内容 */}
          <article>
            <div className="eyebrow">／  PRINCIPLE · 原理详解</div>
            <h3 style={{ marginTop: 16, fontSize: 28 }}>这件事是这样发生的</h3>
            <p style={{ marginTop: 16, fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.85 }}>
              {kp.content ?? kp.summary}。这里展示完整图文内容：示意图、动画、视频。最终内容由 CMS 配置生成。
            </p>
            <div className="placeholder" style={{ height: 280, marginTop: 24 }}>
              SCHEMATIC ILLUSTRATION · 示意图
            </div>
            <p style={{ marginTop: 24, fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.85 }}>
              在生活中，你可以找到这个原理的应用。很多看似平常的现象，背后都基于同样的逻辑。下方的关联物品里，每一件都用到了它。
            </p>

            {/* 关联知识点 */}
            {related.length > 0 && (
              <div style={{ marginTop: 56 }}>
                <div className="eyebrow">／  RELATED · 关联知识点</div>
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {related.map((r: any) => (
                    <Link
                      key={r.id}
                      to={`/knowledge/${r.slug}`}
                      state={pushBack(stack, { url: `/knowledge/${kp.slug}`, label: kp.name })}
                      className="card lift"
                      style={{ display: 'flex', gap: 14, alignItems: 'stretch', padding: 0, textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}
                    >
                      {/* 小封面 —— 显示 illustrationUrl，缺图回退 emoji */}
                      <div style={{
                        width: 100, flexShrink: 0,
                        aspectRatio: '1 / 1',
                        position: 'relative',
                        background: (SUBJECT_COLOR[r.subject] ?? '#305FBE') + '18',
                        overflow: 'hidden',
                      }}>
                        {r.illustrationUrl ? (
                          <img src={r.illustrationUrl} alt={r.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 32, opacity: 0.35 }}>
                            {SUBJECT_ICON[r.subject] ?? '🔬'}
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', top: 0, left: 0,
                          width: 3, height: '100%',
                          background: SUBJECT_COLOR[r.subject] ?? '#305FBE',
                        }}/>
                      </div>

                      <div style={{ flex: 1, padding: '14px 16px 14px 0', minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <LevelTag level={r.difficulty}/>
                          <span className="tag">{SUBJECT_LABEL[r.subject] ?? r.subject}</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)' }}>{r.name}</div>
                        {r.summary && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.summary}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* 侧栏：关联物品 + 关联实验 */}
          <aside>
            <div className="eyebrow">／  USED IN · 关联物品</div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {relItems.length ? relItems.map(it => (
                <Link
                  key={it.item.id}
                  to={`/items/${it.item.slug}`}
                  state={pushBack(stack, { url: `/knowledge/${kp.slug}`, label: kp.name })}
                  className="card lift"
                  style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ width: 80, height: 80, flexShrink: 0, background: 'var(--bg)', borderRadius: 8, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                    {it.item.itemImageUrl ? (
                      <img src={it.item.itemImageUrl} alt={it.item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    ) : (
                      <span style={{ fontSize: 32, opacity: 0.4 }}>📦</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{it.item.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{it.item.shortDesc}</div>
                  </div>
                  <span style={{ color: 'var(--ink-3)' }}>→</span>
                </Link>
              )) : <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>暂无关联物品</div>}
            </div>

            {/* 关联实验（占位） */}
            <div className="eyebrow" style={{ marginTop: 36 }}>／  TRY IT · 关联实验</div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>暂无关联实验</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function LevelTag({ level }: { level: string }) {
  const labels: Record<string, string> = { L1: '启蒙', L2: '探索', L3: '深化' };
  return (
    <span className={`tag ${level}`}>{level} · {labels[level] ?? level}</span>
  );
}

function KnowledgeCover({ subject, name, illustrationUrl }: {
  subject: string; name: string; illustrationUrl?: string | null;
}) {
  const c = SUBJECT_COLOR[subject] ?? '#305FBE';
  return (
    <div style={{ aspectRatio: '4/3', background: c + '18', position: 'relative', overflow: 'hidden' }}>
      {illustrationUrl ? (
        <img src={illustrationUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 96, opacity: 0.25 }}>
          {SUBJECT_ICON[subject] ?? '🔬'}
        </div>
      )}
      {/* 4px 色条 + 学科 + 知识点名：玻璃毛叠层 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: c, zIndex: 3 }}/>
      <div className="font-mono" style={{
        position: 'absolute', bottom: 16, left: 18, zIndex: 3,
        padding: '5px 11px', borderRadius: 999,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        fontSize: 10, color: c, letterSpacing: 1.5, fontWeight: 700,
        border: `1px solid ${c}33`,
      }}>{subject}</div>
    </div>
  );
}
