/**
 * 通用实验卡片 —— 知识详情 / 物品详情的"试一试"Tab 共用
 *
 * 展示：
 *   封面 / 名称 / 难度 / 时长 / 是否需要家长陪同 / 完成度徽章
 * 点击：跳转 /experiments/:slug，并带 back state
 */
import { Link } from 'react-router-dom';
import type { PublicExperimentBrief } from '@/api/content';
import { useExperimentStore } from '@/utils/experiment-store';
import { backState } from '@/utils/back-nav';

const LEVEL_LABEL: Record<string, string> = { L1: '启蒙', L2: '探索', L3: '深化' };

export function ExperimentCard({ exp, backUrl, backLabel }: {
  exp: PublicExperimentBrief;
  /** 自定义返回路径（KP 或 Item 详情自身），默认走全局 backStack */
  backUrl?: string;
  backLabel?: string;
}) {
  const { getExperimentStatus } = useExperimentStore();
  const status = getExperimentStatus(exp.slug);

  /* 徽章固定使用不透明背景（白/深），与封面图明确分层；不再用半透明色块叠在图上 */
  const statusStyle: Record<typeof status, { text: string; bg: string; color: string; border: string }> = {
    'not-started': { text: '未开始', bg: '#ffffff',                  color: 'var(--ink-2)',       border: 'var(--hairline)' },
    'in-progress': { text: '进行中', bg: 'var(--amber)',             color: '#ffffff',            border: 'var(--amber)' },
    'done':        { text: '已完成', bg: 'var(--L1, #4A8662)',       color: '#ffffff',            border: 'var(--L1, #4A8662)' },
  };
  const s = statusStyle[status];

  return (
    <Link
      to={`/experiments/${exp.slug}`}
      state={backUrl && backLabel ? backState(backUrl, backLabel) : undefined}
      className="card lift"
      style={{
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        textDecoration: 'none', color: 'inherit',
      }}
    >
      {/* 封面 */}
      <div style={{
        aspectRatio: '16 / 9',
        background: 'var(--bg-2)',
        position: 'relative', overflow: 'hidden',
      }}>
        {exp.coverUrl ? (
          <img
            src={exp.coverUrl}
            alt={exp.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 48, opacity: 0.3 }}>
            🧪
          </div>
        )}
        {/* 完成度徽章 —— 与封面分层：不透明背景 + 投影 + 边框 */}
        <span style={{
          position: 'absolute', top: 12, right: 12,
          padding: '4px 11px', borderRadius: 999,
          background: s.bg, color: s.color,
          border: `1px solid ${s.border}`,
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 2px 8px rgba(14,26,51,0.25)',
        }}>
          {status === 'done' ? '✓ ' : ''}{s.text}
        </span>
      </div>

      {/* 信息 */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className={`tag ${exp.difficulty}`}>{exp.difficulty} · {LEVEL_LABEL[exp.difficulty] ?? ''}</span>
          {exp.materialType && <span className="tag">{exp.materialType}</span>}
        </div>
        <h4 style={{ margin: 0, fontSize: 16, lineHeight: 1.3 }}>{exp.name}</h4>
        {exp.description && (
          <p style={{
            margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {exp.description}
          </p>
        )}
        <div style={{
          marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--hairline)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: 0.5,
        }}>
          <span>{exp.durationMin}min · {exp.needParent ? '需家长' : '可自助'}</span>
          <span>试一试 →</span>
        </div>
      </div>
    </Link>
  );
}
