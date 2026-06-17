import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentApi, type PublicKnowledgeDetail, type PublicKnowledge, type PublicExperimentBrief } from '@/api/content';
import { useBackNav, useBackStack, popBack, pushBack } from '@/utils/back-nav';
import { FitOneRow } from '@/components/FitOneRow';
import { ExperimentCard } from '@/components/ExperimentCard';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useQuizStore } from '@/utils/quiz-store';
import { useUserLevel } from '@/utils/user-level';
import { useDetailGate } from '@/utils/gate';

const ORDER: Record<string, number> = { L1: 1, L2: 2, L3: 3 };
function ord(k: string) { return ORDER[k] ?? 0; }

/* 首屏物品图标：单行固定 6 枚（图标尺寸固定，可硬编码）
   关联知识点 chip 的"放得下几个"动态由 FitOneRow 测量决定 */
const ITEMS_PREVIEW = 6;

const SUBJECT_COLOR: Record<string, string> = {
  PHYSICS: '#305FBE', CHEMISTRY: '#C95746', BIOLOGY: '#4A8662', GEOGRAPHY: '#8C6B2A', OTHER: '#6B4D8C',
};
const SUBJECT_LABEL: Record<string, string> = {
  PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物', GEOGRAPHY: '地理', OTHER: '其他',
};

type Tab = 'principle' | 'quiz' | 'try';

/* ════════════════════════════════════════════════════════════════
   主页面 —— 完全沿用 ItemDetailPage 的视觉与节奏：
     · 顶部 paper 区：1.6fr / 1fr 的视频 + 信息块
     · 下方 .page 区：4 个 Tab（PRINCIPLE / ITEMS / RELATED / QUIZ）
════════════════════════════════════════════════════════════════ */
export function KnowledgeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const back = useBackNav();
  const stack = useBackStack();

  const [tab, setTab] = useState<Tab>('principle');
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showKpsModal, setShowKpsModal]     = useState(false);
  const [kpsOverflow, setKpsOverflow]       = useState(0);  // 关联 KP 没放下几个
  const { level: userLevel } = useUserLevel();

  const { data: kp, isLoading } = useQuery({
    queryKey: ['public', 'kp', slug],
    queryFn: () => contentApi.knowledgeBySlug(slug!),
    enabled: !!slug,
  });

  const gateEl = useDetailGate('knowledge', slug);
  if (gateEl) return gateEl;

  if (isLoading) return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 2 }}>
      LOADING...
    </div>
  );
  if (!kp) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>知识点不存在</div>;

  const locked   = ord(kp.difficulty) > ord(userLevel);
  const relItems = kp.items ?? [];
  const related  = kp.related ?? [];
  const quizzes  = kp.quizQuestions ?? [];
  const c        = SUBJECT_COLOR[kp.subject] ?? '#305FBE';

  const exps = (kp.experiments ?? []).map(e => e.experiment);

  /* 二屏 Tabs：原理详解 + 考考你 + 试一试 */
  const TABS = [
    { id: 'principle' as const, label: '原理详解', en: 'PRINCIPLE', count: undefined as number | undefined },
    { id: 'quiz'      as const, label: '考考你',   en: 'QUIZ',      count: quizzes.length },
    { id: 'try'       as const, label: '试一试',   en: 'TRY IT',    count: exps.length },
  ];

  return (
    <div>
      {/* ═══════ 顶部 hero ═══════ */}
      <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="page" style={{ paddingBottom: 56 }}>
          {/* 返回 */}
          <button
            onClick={() => {
              const t = popBack(stack);
              if (t) nav(t.url, { state: t.state });
              else nav('/knowledge');
            }}
            style={{
              background: 'transparent', border: 'none', color: 'var(--ink-3)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0',
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <span>←</span> 返回{back?.label ?? '知识库'}
          </button>

          {/* 视频 + 信息块 —— 与 ItemDetail 同款 1.6/1 栅格 */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 56, alignItems: 'center' }}>
            {/* === 左：视频播放器（kp.videoUrl 优先；空则播 demo） === */}
            <VideoPlayer
              url={kp.videoUrl}
              poster={kp.illustrationUrl}
              title={kp.videoTitle ?? `${kp.name} 是怎么发生的？`}
              durationSec={kp.videoDurationSec}
              eyebrowText="PRINCIPLE VIDEO"
              locked={locked}
              lockedHint={locked ? `需要 ${kp.difficulty} 难度` : undefined}
              fallbackSVG={<VideoBgSVG c={c}/>}
            />

            {/* === 右：知识点信息块（沿用 ItemDetail 节奏） === */}
            <div>
              <div className="eyebrow">／  {SUBJECT_LABEL[kp.subject] ?? kp.subject} · {kp.difficulty} · KNOWLEDGE POINT</div>
              <h1 style={{ marginTop: 16, fontSize: 72, lineHeight: 1 }}>{kp.name}</h1>
              {!locked && kp.summary && (
                <p className="lead" style={{ marginTop: 16 }}>{kp.summary}</p>
              )}
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <LevelTag level={kp.difficulty}/>
                <span className="tag">{SUBJECT_LABEL[kp.subject] ?? kp.subject}</span>
                <span className="tag">{relItems.length} 关联物品</span>
                <span className="tag">{related.length} 相关知识点</span>
                {quizzes.length > 0 && <span className="tag">{quizzes.length} 道小测</span>}
              </div>

              {/* 关联物品（首屏：只显示简笔图标；溢出点击 → modal） */}
              {relItems.length > 0 && (
                <PreviewBlock
                  eyebrow="USED IN · 关联物品"
                  totalCount={relItems.length}
                  visibleCount={ITEMS_PREVIEW}
                  unit="件"
                  showAllLabel="查看更多"
                  onShowAll={() => setShowItemsModal(true)}
                >
                  <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8, overflow: 'hidden' }}>
                    {relItems.slice(0, ITEMS_PREVIEW).map(it => (
                      <ItemIconChip
                        key={it.item.id}
                        item={it.item}
                        kpSlug={kp.slug}
                        kpName={kp.name}
                        stack={stack}
                      />
                    ))}
                  </div>
                </PreviewBlock>
              )}

              {/* 关联知识点 chip 标签（首屏单行；FitOneRow 实时按宽度决定显示几个，剩余 → 弹窗） */}
              {related.length > 0 && (
                <PreviewBlock
                  eyebrow="RELATED · 关联知识点"
                  overflow={kpsOverflow}
                  unit="个"
                  onShowAll={() => setShowKpsModal(true)}
                  showAllLabel="查看更多"
                >
                  <FitOneRow
                    items={related}
                    gap={6}
                    onOverflowChange={setKpsOverflow}
                    renderItem={(r) => (
                      <RelKpChip
                        key={r.id}
                        kp={r}
                        backFrom={{ url: `/knowledge/${kp.slug}`, label: kp.name }}
                        stack={stack}
                      />
                    )}
                  />
                </PreviewBlock>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Tabs ═══════ */}
      <div className="page">
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--hairline)', marginBottom: 40 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '20px 28px', background: 'transparent', border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: -1,
                color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
                cursor: 'pointer', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: 'inherit',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: tab === t.id ? 'var(--amber)' : 'var(--ink-4)' }}>
                {t.en}
              </span>
              {t.label}
              {typeof t.count === 'number' && (
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'principle' && <PrincipleTab kp={kp} locked={locked} />}
        {tab === 'quiz'      && <QuizTab      kp={kp} c={c} />}
        {tab === 'try'       && <TryItTab     exps={exps} kpSlug={kp.slug} kpName={kp.name} />}
      </div>

      {/* 「关联物品-查看更多」弹窗 */}
      {showItemsModal && (
        <ItemsIconModal
          items={relItems}
          kpSlug={kp.slug}
          kpName={kp.name}
          stack={stack}
          onClose={() => setShowItemsModal(false)}
        />
      )}

      {/* 「关联知识点-查看更多」弹窗 */}
      {showKpsModal && (
        <KpsChipModal
          related={related}
          kpSlug={kp.slug}
          kpName={kp.name}
          stack={stack}
          onClose={() => setShowKpsModal(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   背景纹理 —— 与 ItemDetail 的 VideoBgSVG 同款，可被学科色覆盖
───────────────────────────────────────────────────────────── */
function VideoBgSVG({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 1200 675" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="kpvidgrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 0 48 M 0 0 L 48 0" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kpvidgrid)"/>
      <g stroke={c} strokeWidth="1.3" fill="none" opacity="0.4">
        <path d="M 100 200 Q 130 180 160 200 T 220 200 T 280 200"/>
        <path d="M 920 380 Q 950 360 980 380 T 1040 380 T 1100 380"/>
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tab：原理详解（单栏，去掉冗余的"关于这个知识点"侧卡）
───────────────────────────────────────────────────────────── */
function PrincipleTab({ kp, locked }: { kp: PublicKnowledgeDetail; locked: boolean }) {
  if (locked) {
    return (
      <div style={{ padding: '32px 0', maxWidth: 720 }}>
        <div style={{ padding: '24px 28px', background: 'var(--bg)', borderLeft: '3px solid var(--amber)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>内容已锁定</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>
            完整内容需要 {kp.difficulty} 难度，请先提升账号难度等级，或先浏览同主题的 L1 / L2 知识点。
          </p>
        </div>
      </div>
    );
  }
  return (
    <article style={{ maxWidth: 880 }}>
      <div className="eyebrow">／  PRINCIPLE · 原理详解</div>
      <h3 style={{ marginTop: 16, fontSize: 28 }}>这件事是这样发生的</h3>
      <p style={{ marginTop: 16, fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
        {kp.content ?? kp.summary ?? ''}
      </p>
      <div className="placeholder" style={{ height: 280, marginTop: 24 }}>
        SCHEMATIC ILLUSTRATION · 示意图
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────
   小组件：首屏预览块（eyebrow + 全部→ 按钮 + 内容）
───────────────────────────────────────────────────────────── */
/**
 * PreviewBlock - 首屏小标题 + "查看更多" 按钮 + 内容
 *
 * 两种 overflow 判定模式，二选一：
 *   - 固定模式：传 totalCount + visibleCount，溢出 = totalCount > visibleCount
 *   - 动态模式：传 overflow（剩余条数），溢出 = overflow > 0（FitOneRow 实时回填）
 */
type PreviewBlockProps = {
  eyebrow: string;
  unit: string;
  onShowAll: () => void;
  /** 按钮文案。默认 `全部 N {unit} →`，传入则用 `{showAllLabel}（N） →` */
  showAllLabel?: string;
  children: React.ReactNode;
} & (
  | { totalCount: number; visibleCount: number; overflow?: never }
  | { overflow: number; totalCount?: never; visibleCount?: never }
);

function PreviewBlock(props: PreviewBlockProps) {
  const { eyebrow, unit, onShowAll, showAllLabel, children } = props;
  const overflowing =
    'overflow' in props
      ? (props.overflow ?? 0) > 0
      : (props.totalCount ?? 0) > (props.visibleCount ?? 0);
  const totalForLabel =
    'overflow' in props
      ? props.overflow ?? 0
      : (props.totalCount ?? 0);
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div className="eyebrow">／  {eyebrow}</div>
        {overflowing && (
          <button
            onClick={onShowAll}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
              fontSize: 10, letterSpacing: 1.5, padding: 0,
            }}
          >
            {showAllLabel
              ? `${showAllLabel}（${totalForLabel}） →`
              : `全部 ${totalForLabel} ${unit} →`}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   首屏：关联物品简笔图标 chip
   - 48×48 圆角方块，hover 露出名称气泡
   - 优先用 iconUrl（简笔小图标），回退到 itemImageUrl
───────────────────────────────────────────────────────────── */
type ItemMini = PublicKnowledgeDetail['items'][number]['item'];

function ItemIconChip({ item, kpSlug, kpName, stack }: {
  item: ItemMini;
  kpSlug: string; kpName: string;
  stack: import('@/utils/back-nav').BackTarget[];
}) {
  const src = item.iconUrl ?? item.itemImageUrl;
  return (
    <Link
      to={`/items/${item.slug}`}
      state={pushBack(stack, { url: `/knowledge/${kpSlug}`, label: kpName })}
      title={item.name}
      aria-label={item.name}
      style={{
        position: 'relative',
        width: 48, height: 48,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--hairline)',
        background: 'var(--paper)',
        display: 'grid', placeItems: 'center',
        textDecoration: 'none', color: 'inherit',
        transition: 'border-color .15s, transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--amber)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 10px rgba(14,26,51,0.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--hairline)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {src ? (
        <img
          src={src}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: 22, opacity: 0.4 }}>📦</span>
      )}
    </Link>
  );
}

/* 「查看更多」弹窗：显示全部关联物品的简笔图标 + 名称 */
function ItemsIconModal({ items, kpSlug, kpName, stack, onClose }: {
  items: PublicKnowledgeDetail['items'];
  kpSlug: string; kpName: string;
  stack: import('@/utils/back-nav').BackTarget[];
  onClose: () => void;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>全部关联物品</h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              width: 32, height: 32, borderRadius: 999,
              border: '1px solid var(--hairline)',
              background: 'var(--bg)', color: 'var(--ink-3)',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
              fontSize: 14,
            }}
          >×</button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))',
          gap: 12,
        }}>
          {items.map(({ item }) => {
            const src = item.iconUrl ?? item.itemImageUrl;
            return (
              <Link
                key={item.id}
                to={`/items/${item.slug}`}
                state={pushBack(stack, { url: `/knowledge/${kpSlug}`, label: kpName })}
                onClick={onClose}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 8, borderRadius: 10,
                  border: '1px solid var(--hairline)',
                  background: 'var(--paper)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'border-color .15s, background .15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--amber)';
                  e.currentTarget.style.background = 'rgba(216,149,49,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--hairline)';
                  e.currentTarget.style.background = 'var(--paper)';
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 8,
                  overflow: 'hidden', background: 'var(--bg-2)',
                  display: 'grid', placeItems: 'center',
                }}>
                  {src ? (
                    <img src={src} alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  ) : (
                    <span style={{ fontSize: 22, opacity: 0.4 }}>📦</span>
                  )}
                </div>
                <div style={{
                  marginTop: 6,
                  fontSize: 11, fontWeight: 600, color: 'var(--ink)',
                  lineHeight: 1.25, textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  width: '100%',
                }}>
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   首屏：关联知识点 chip
───────────────────────────────────────────────────────────── */
function RelKpChip({ kp, backFrom, stack }: {
  kp: PublicKnowledge;
  backFrom: { url: string; label: string };
  stack: import('@/utils/back-nav').BackTarget[];
}) {
  const c = SUBJECT_COLOR[kp.subject] ?? '#305FBE';
  return (
    <Link
      to={`/knowledge/${kp.slug}`}
      state={pushBack(stack, backFrom)}
      title={kp.summary ?? kp.name}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 11px', borderRadius: 999,
        border: `1px solid ${c}55`,
        background: c + '10',
        color: 'var(--ink-2)',
        textDecoration: 'none',
        fontSize: 12, fontWeight: 500, lineHeight: 1.2,
        transition: 'background .15s, border-color .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = c + '20';
        e.currentTarget.style.borderColor = c;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = c + '10';
        e.currentTarget.style.borderColor = c + '55';
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }}/>
      <span>{kp.name}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, color: c, fontWeight: 700,
        letterSpacing: 0.5, opacity: 0.75,
      }}>
        {kp.difficulty}
      </span>
    </Link>
  );
}

/* 「关联知识点-查看更多」弹窗：所有 KP 以 chip 形式平铺 */
function KpsChipModal({ related, kpSlug, kpName, stack, onClose }: {
  related: PublicKnowledge[];
  kpSlug: string; kpName: string;
  stack: import('@/utils/back-nav').BackTarget[];
  onClose: () => void;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>全部关联知识点</h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              width: 32, height: 32, borderRadius: 999,
              border: '1px solid var(--hairline)',
              background: 'var(--bg)', color: 'var(--ink-3)',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
              fontSize: 14,
            }}
          >×</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {related.map(r => (
            <span key={r.id} onClick={onClose}>
              <RelKpChip
                kp={r}
                backFrom={{ url: `/knowledge/${kpSlug}`, label: kpName }}
                stack={stack}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tab：考考你（左题 / 右评估，含勋章 + 持久化 + 重做）
───────────────────────────────────────────────────────────── */
function QuizTab({ kp, c }: { kp: PublicKnowledgeDetail; c: string }) {
  const quizzes = kp.quizQuestions ?? [];
  const store = useQuizStore();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cur = store.getCurrent(kp.slug);
  const latest = store.getLatest(kp.slug);
  const best = store.getBest(kp.slug);
  const completed = store.isCompleted(kp.slug);

  // 当前 in-progress 答题视图（判分结果来自服务端，提交后回填）
  const answers = cur?.answers ?? {};
  const submitted = cur?.submitted ?? {};
  const results = cur?.results ?? {};

  const doneCount = quizzes.filter(q => submitted[q.id]).length;
  const allSubmitted = quizzes.length > 0 && doneCount === quizzes.length;
  const currentCorrect = quizzes.filter(q => results[q.id]?.correct).length;

  async function handleSubmit(qid: string) {
    const sel = answers[qid];
    if (sel === undefined || submittingId) return;
    setSubmittingId(qid);
    setSubmitError(null);
    try {
      const res = await contentApi.answerQuiz(qid, sel);
      store.submitAnswer(kp.slug, qid, res);
    } catch (e: any) {
      setSubmitError(e?.message ?? '提交失败，请重试');
    } finally {
      setSubmittingId(null);
    }
  }

  // 全部题已交但未 finalize → 触发一次 finalize
  useEffect(() => {
    if (!allSubmitted) return;
    if (!cur) return;
    // 已经存在 attempt 且 startedAt 一致 → 不重复
    const already = (store.getAttempts(kp.slug)).some(a => a.startedAt === cur.startedAt);
    if (!already) {
      store.finalizeAttempt(kp.slug, quizzes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSubmitted, cur?.startedAt]);

  if (!quizzes.length) {
    return (
      <div className="placeholder" style={{ height: 240 }}>
        <div>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>📝</div>
          <div>本知识点暂无小测题</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 40, alignItems: 'start' }}>
      {/* === 左：题目区 === */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div className="eyebrow">／  QUIZ · 考考你</div>
            <h3 style={{ marginTop: 14, fontSize: 24 }}>{quizzes.length} 道单选题</h3>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', letterSpacing: 1 }}>
            已答 <b style={{ color: 'var(--ink)' }}>{doneCount}</b> / {quizzes.length}
            <span style={{ margin: '0 8px' }}>·</span>
            答对 <b style={{ color: 'var(--L1, #4A8662)' }}>{currentCorrect}</b>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {quizzes.map((q, i) => {
            const selected = answers[q.id];
            const res = results[q.id];
            const done = submitted[q.id] && !!res;
            const correct = res?.correctIndex ?? -1;
            const tones: Record<string, { bg: string; border: string; color: string }> = {
              idle:    { bg: 'transparent', border: 'var(--hairline)', color: 'var(--ink-2)' },
              sel:     { bg: c + '12',     border: c,                 color: 'var(--ink)' },
              correct: { bg: 'rgba(74,134,98,0.12)',  border: 'var(--L1, #4A8662)', color: 'var(--ink)' },
              wrong:   { bg: 'rgba(201,87,70,0.10)', border: 'var(--coral, #C95746)', color: 'var(--ink)' },
            };
            return (
              <div
                key={q.id}
                style={{ padding: 22, borderRadius: 12, border: '1px solid var(--hairline)', background: 'var(--paper)' }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0,
                    width: 28, height: 28, borderRadius: 7,
                    background: c + '18', color: c,
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</div>
                </div>

                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {q.choices.map((choice, ci) => {
                    const isSel = selected === ci;
                    const isCorrect = ci === correct;
                    const tone =
                      !done ? (isSel ? 'sel' : 'idle')
                      : isCorrect ? 'correct'
                      : isSel ? 'wrong' : 'idle';
                    const t = tones[tone] ?? tones.idle!;
                    return (
                      <button
                        key={ci}
                        disabled={done}
                        onClick={() => store.selectAnswer(kp.slug, q.id, ci)}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: `1.5px solid ${t.border}`,
                          background: t.bg, color: t.color,
                          cursor: done ? 'default' : 'pointer',
                          fontFamily: 'inherit', fontSize: 14,
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'all .15s',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, opacity: 0.6 }}>
                          {String.fromCharCode(65 + ci)}
                        </span>
                        <span style={{ flex: 1 }}>{choice}</span>
                        {done && isCorrect && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.5L6.5 12L13 4.5" stroke="var(--L1, #4A8662)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {done && !isCorrect && isSel && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 3L11 11M11 3L3 11" stroke="var(--coral, #C95746)" strokeWidth="2.4" strokeLinecap="round"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!done ? (
                  <>
                    <button
                      disabled={selected === undefined || submittingId === q.id}
                      onClick={() => handleSubmit(q.id)}
                      style={{
                        marginTop: 14, padding: '8px 22px',
                        background: selected !== undefined ? 'var(--ink)' : 'var(--ink-4)',
                        color: 'var(--paper)',
                        border: 'none', borderRadius: 999,
                        cursor: selected !== undefined && submittingId !== q.id ? 'pointer' : 'not-allowed',
                        fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                        opacity: submittingId === q.id ? 0.7 : 1,
                      }}
                    >
                      {submittingId === q.id ? '判分中…' : '提交答案'}
                    </button>
                    {submitError && submittingId === null && answers[q.id] !== undefined && !submitted[q.id] && (
                      <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--coral, #C95746)' }}>{submitError}</span>
                    )}
                  </>
                ) : (
                  <div style={{
                    marginTop: 14, padding: '12px 14px',
                    background: 'var(--bg)', borderRadius: 8,
                    borderLeft: `3px solid ${res?.correct ? 'var(--L1, #4A8662)' : 'var(--coral, #C95746)'}`,
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: res?.correct ? 'var(--L1, #4A8662)' : 'var(--coral, #C95746)', letterSpacing: 1.5, marginBottom: 6 }}>
                      {res?.correct ? '✓ 答对了' : `✗ 答错了 · 正确答案是 ${String.fromCharCode(65 + correct)}`}
                    </div>
                    {res?.explanation && (
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{res.explanation}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* === 右：答题评估 / 勋章 === */}
      <aside style={{
        position: 'sticky', top: 24,
        padding: 22,
        borderRadius: 14,
        border: '1px solid var(--hairline)',
        background: 'var(--paper)',
      }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>RESULT · 答题评估</div>

        {/* 勋章 / 大头 */}
        <BadgeArea
          completed={completed}
          currentCorrect={currentCorrect}
          allSubmitted={allSubmitted}
          total={quizzes.length}
          kpName={kp.name}
          c={c}
        />

        {/* 进度条 */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1, marginBottom: 6 }}>
            <span>本次进度</span>
            <span><b style={{ color: 'var(--ink)' }}>{doneCount}</b> / {quizzes.length}</span>
          </div>
          <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${(doneCount / quizzes.length) * 100}%`, height: '100%',
              background: completed && allSubmitted ? 'var(--L1, #4A8662)' : 'var(--amber)',
              transition: 'width .4s ease',
            }}/>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            答对 {currentCorrect} 题 · 正确率 {doneCount === 0 ? 0 : Math.round((currentCorrect / doneCount) * 100)}%
          </div>
        </div>

        {/* 历史最佳 */}
        {best && (
          <div style={{
            marginTop: 20, padding: '12px 14px',
            background: 'var(--bg)', borderRadius: 8,
            borderLeft: `3px solid ${c}`,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: c, letterSpacing: 1.5, marginBottom: 4 }}>
              BEST · 历史最佳
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>
              {best.correct} / {best.total} 题
              <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                {Math.round((best.correct / best.total) * 100)}%
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              共尝试 {store.getAttempts(kp.slug).length} 次
            </div>
          </div>
        )}

        {/* 行动按钮：答完未满分 → 申请重做 */}
        {allSubmitted && !completed && (
          <button
            onClick={() => store.resetAttempt(kp.slug)}
            style={{
              marginTop: 20, width: '100%',
              padding: '10px 16px', borderRadius: 999,
              border: `1px solid ${c}`, background: c + '12', color: c,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            }}
          >
            ↻ 申请再做一次
          </button>
        )}

        {latest && allSubmitted && (
          <div style={{ marginTop: 16, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
            最近一次：{new Date(latest.finishedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </aside>
    </div>
  );
}

/* 勋章卡（满分 → 金色徽章 + "已学习"） */
function BadgeArea({ completed, currentCorrect, allSubmitted, total, kpName, c }: {
  completed: boolean; currentCorrect: number; allSubmitted: boolean;
  total: number; kpName: string; c: string;
}) {
  const isFullScoreNow = allSubmitted && currentCorrect === total;
  if (completed || isFullScoreNow) {
    return (
      <div style={{
        padding: '20px 16px', borderRadius: 12,
        background: 'linear-gradient(135deg, #FFF7E6 0%, #FFE8B0 60%, #F5C152 100%)',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(245,193,82,0.30)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 闪光 */}
        <div style={{
          position: 'absolute', inset: '-50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 60%)',
          animation: 'pulse 2.2s ease-in-out infinite',
          pointerEvents: 'none',
        }}/>
        <div style={{
          fontSize: 56, lineHeight: 1, marginBottom: 6,
          textShadow: '0 2px 8px rgba(0,0,0,0.10)',
        }}>🏅</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#5C3A00' }}>
          已学习
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#7A5300', fontFamily: 'var(--font-mono)', letterSpacing: 1.5 }}>
          {kpName} · {total}/{total} 满分
        </div>
      </div>
    );
  }
  // 未开始 / 进行中
  return (
    <div style={{
      padding: '20px 16px', borderRadius: 12,
      background: c + '08',
      textAlign: 'center',
      border: `1px dashed ${c}55`,
    }}>
      <div style={{ fontSize: 44, opacity: 0.4 }}>🎯</div>
      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
        {allSubmitted ? '继续努力，再做一次冲满分' : '答完全部题目解锁勋章'}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tab：试一试（关联实验卡片）
───────────────────────────────────────────────────────────── */
function TryItTab({ exps, kpSlug, kpName }: {
  exps: PublicExperimentBrief[];
  kpSlug: string; kpName: string;
}) {
  if (!exps.length) {
    return (
      <div className="placeholder" style={{ height: 240 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>🧪</div>
          <div>暂时还没有关联实验，我们正在准备…</div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div className="eyebrow">／  TRY IT · 试一试</div>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 2 }}>
          {exps.length} 个实验
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {exps.map(exp => (
          <ExperimentCard
            key={exp.id}
            exp={exp}
            backUrl={`/knowledge/${kpSlug}`}
            backLabel={kpName}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   通用：难度标签（与 ItemDetail 同款）
───────────────────────────────────────────────────────────── */
function LevelTag({ level }: { level: string }) {
  const labels: Record<string, string> = { L1: '启蒙', L2: '探索', L3: '深化' };
  return (
    <span className={`tag ${level}`}>{level} · {labels[level] ?? level}</span>
  );
}
