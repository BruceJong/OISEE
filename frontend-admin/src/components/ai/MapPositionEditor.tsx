import { useRef, useState, useCallback } from 'react';
import { Typography, Slider, Space } from 'antd';
import { EnvironmentFilled } from '@ant-design/icons';

interface Marker {
  id: string;
  x: number;          // 0-100 百分比
  y: number;
  radius?: number;    // 可点击范围半径（百分比，相对宽度）
  label?: string;
}

export interface PositionValue {
  x: number;
  y: number;
  radius?: number;    // 可点击半径，默认 8
}

interface MapPositionEditorProps {
  /** 地图背景图 URL */
  mapImageUrl?: string | null;
  /** 当前场景的位置标记 */
  value?: PositionValue | null;
  /** 位置变化回调 */
  onChange?: (pos: PositionValue) => void;
  /** 其他场景的标记（只读，参考用） */
  otherMarkers?: Marker[];
  /** 高度 */
  height?: number;
  /** 当前编辑中的场景名称 */
  currentName?: string;
  /** 是否显示半径调节器（默认显示） */
  showRadiusControl?: boolean;
}

const DEFAULT_RADIUS = 8;

export function MapPositionEditor({
  mapImageUrl,
  value,
  onChange,
  otherMarkers = [],
  height = 320,
  currentName = '当前场景',
  showRadiusControl = true,
}: MapPositionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const currentRadius = value?.radius ?? DEFAULT_RADIUS;

  const getRelativePos = useCallback(
    (e: MouseEvent | React.MouseEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getRelativePos(e);
      if (pos) onChange?.({ ...pos, radius: currentRadius });
    },
    [getRelativePos, onChange, currentRadius]
  );

  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDragging(true);
      const onMove = (me: MouseEvent) => {
        const pos = getRelativePos(me);
        if (pos) onChange?.({ ...pos, radius: currentRadius });
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [getRelativePos, onChange, currentRadius]
  );

  function handleRadiusChange(r: number) {
    if (value) onChange?.({ ...value, radius: r });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {mapImageUrl
          ? '点击或拖动蓝色标记设置位置；蓝色虚线圆是用户端可点击范围。'
          : '尚无地图背景，请先生成或上传。'}
      </Typography.Text>

      <div
        ref={containerRef}
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          height,
          background: mapImageUrl ? `url(${mapImageUrl}) center/cover no-repeat` : '#f0f0f0',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
          cursor: dragging ? 'grabbing' : 'crosshair',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {!mapImageUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
              fontSize: 13,
            }}
          >
            暂无地图背景
          </div>
        )}

        {/* 其他场景标记 + 它们的点击范围（半透明） */}
        {otherMarkers.map((m) => (
          <div key={m.id} style={{ pointerEvents: 'none' }}>
            {/* 范围圆 */}
            <div
              style={{
                position: 'absolute',
                left: `${m.x}%`,
                top: `${m.y}%`,
                width: `${(m.radius ?? DEFAULT_RADIUS) * 2}%`,
                paddingBottom: `${(m.radius ?? DEFAULT_RADIUS) * 2}%`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'rgba(140,140,140,0.12)',
                border: '1px dashed rgba(140,140,140,0.45)',
                zIndex: 0,
              }}
            />
            {/* 中心标记 */}
            <div
              style={{
                position: 'absolute',
                left: `${m.x}%`,
                top: `${m.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: 1,
              }}
            >
              <EnvironmentFilled style={{ fontSize: 18, color: '#8c8c8c' }} />
              {m.label && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                >
                  {m.label}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 当前标记 + 当前范围圆 */}
        {value && (
          <>
            {/* 范围圆 */}
            <div
              style={{
                position: 'absolute',
                left: `${value.x}%`,
                top: `${value.y}%`,
                width: `${currentRadius * 2}%`,
                paddingBottom: `${currentRadius * 2}%`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'rgba(22,119,255,0.10)',
                border: '2px dashed rgba(22,119,255,0.65)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            {/* 中心标记（可拖动） */}
            <div
              style={{
                position: 'absolute',
                left: `${value.x}%`,
                top: `${value.y}%`,
                transform: 'translate(-50%, -100%)',
                cursor: 'grab',
                zIndex: 3,
              }}
              onMouseDown={handleMarkerMouseDown}
              onClick={(e) => e.stopPropagation()}
            >
              <EnvironmentFilled style={{ fontSize: 26, color: '#1677ff' }} />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1677ff',
                  color: '#fff',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                }}
              >
                {currentName}
              </div>
            </div>
          </>
        )}
      </div>

      {value && (
        <Space size="middle" style={{ width: '100%' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            位置：x={value.x}% · y={value.y}%
          </Typography.Text>
          {showRadiusControl && (
            <>
              <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                可点击范围：
              </Typography.Text>
              <Slider
                style={{ flex: 1, minWidth: 180 }}
                min={3}
                max={20}
                step={1}
                value={currentRadius}
                onChange={handleRadiusChange}
                tooltip={{ formatter: (v) => `${v}%` }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12, width: 32 }}>
                {currentRadius}%
              </Typography.Text>
            </>
          )}
        </Space>
      )}
    </div>
  );
}
