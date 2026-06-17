/**
 * 通用视频播放器（点击大封面 → 切到原生 video 控件）
 *
 * - 优先播放 `url`（来自 CMS / 数据库的真实视频地址）
 * - `url` 为空时回退到本地演示视频 `${VIDEO_BASE}/${DEMO_FILE}`
 * - 未播放时显示封面图 + 渐变叠层 + 「▶ Play」 + 标题/时长
 * - 点击后切换到 <video controls autoPlay>，结束后回到封面态
 *
 * 用法：
 *   <VideoPlayer
 *     url={item.principleVideoUrl}
 *     poster={item.itemImageUrl}
 *     title="微波炉 是如何工作的？"
 *     durationSec={item.videoDurationSec}
 *     accent="var(--amber)"     // 播放按钮主色，默认 amber
 *     eyebrowText="PRINCIPLE VIDEO"
 *     locked={false}            // 锁定时按钮 disabled + 显示徽章
 *   />
 */
import { useRef, useState } from 'react';

// 相对路径：开发走 Vite 代理（/video → 后端），生产由同源/CDN 提供
const VIDEO_BASE = '/video';
const DEMO_FILE  = 'sample_video.mp4';
/** 兜底演示视频地址：DB 字段空时使用 */
export const DEMO_VIDEO_URL = `${VIDEO_BASE}/${DEMO_FILE}`;

function formatDuration(s?: number | null) {
  if (!s || s <= 0) return '—:—';
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
}

export function VideoPlayer({
  url, poster, title, durationSec, accent = 'var(--amber)',
  eyebrowText = 'VIDEO',
  locked = false,
  lockedHint,
  fallbackSVG,
  aspectRatio = '16 / 9',
}: {
  url?: string | null;
  poster?: string | null;
  title: string;
  durationSec?: number | null;
  accent?: string;
  eyebrowText?: string;
  locked?: boolean;
  lockedHint?: string;
  /** 没有封面时的背景填充（SVG / 渐变） */
  fallbackSVG?: React.ReactNode;
  aspectRatio?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const src = url && url.trim().length > 0 ? url : DEMO_VIDEO_URL;
  const isDemo = src === DEMO_VIDEO_URL;

  return (
    <div style={{
      aspectRatio,
      background: 'linear-gradient(135deg, #0E1A33 0%, #1A2B4D 100%)',
      borderRadius: 8, position: 'relative', overflow: 'hidden',
      border: '1px solid var(--hairline)',
    }}>
      {playing ? (
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          playsInline
          onEnded={() => setPlaying(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
        />
      ) : (
        <>
          {/* 封面图 / SVG fallback */}
          {poster ? (
            <img
              src={poster}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
            />
          ) : (
            fallbackSVG ?? null
          )}
          {/* 渐变叠层 */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(14,26,51,0.8) 0%, rgba(14,26,51,0.1) 100%)',
          }}/>
          {/* 左下：播放按钮 + 标题 + 时长 */}
          <div style={{ position: 'absolute', left: 40, bottom: 40, display: 'flex', alignItems: 'center', gap: 20 }}>
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && setPlaying(true)}
              aria-label="播放视频"
              style={{
                width: 72, height: 72, borderRadius: 999, border: 'none',
                background: locked ? 'rgba(255,255,255,0.25)' : accent,
                color: 'var(--ink)',
                cursor: locked ? 'not-allowed' : 'pointer',
                display: 'grid', placeItems: 'center',
                transition: 'transform .15s',
              }}
              onMouseEnter={e => { if (!locked) e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { if (!locked) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></svg>
            </button>
            <div>
              <div className="font-mono" style={{ fontSize: 10, color: accent, letterSpacing: 2, marginBottom: 4 }}>
                {eyebrowText}
              </div>
              <div style={{ color: 'var(--paper)', fontSize: 18, fontWeight: 600 }}>
                {title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {formatDuration(durationSec)}{isDemo && <span style={{ marginLeft: 10, opacity: 0.6 }}>· DEMO</span>}
              </div>
            </div>
          </div>

          {/* 右上：锁定提示 */}
          {locked && lockedHint && (
            <div style={{
              position: 'absolute', top: 18, right: 18,
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(255,255,255,0.92)', color: 'var(--ink)',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              border: '1px solid var(--hairline)',
            }}>
              🔒 {lockedHint}
            </div>
          )}
        </>
      )}
    </div>
  );
}
