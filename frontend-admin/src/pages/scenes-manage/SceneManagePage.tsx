/**
 * 场景管理页
 * 双面板：一级场景 + 二级场景，物品不在此页管理
 * 一级场景端到端连接所有关联的二级场景（不只在选中时显示）
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Button, Empty, Skeleton, Space, Tag, Typography, Popconfirm, message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, DragOutlined,
  GlobalOutlined, AppstoreOutlined, PictureOutlined,
  CheckCircleOutlined, ClockCircleOutlined, InboxOutlined, LockOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sceneGroupsApi, type SceneGroup } from '@/api/scene-groups';
import { scenesApi, type SceneListItem } from '@/api/content';
import { SceneGroupEditModal } from '@/components/modals/SceneGroupEditModal';
import { SceneEditModal } from '@/components/modals/SceneEditModal';
import { WorldMapEditModal } from '@/components/modals/WorldMapEditModal';

const STATUS_CONFIG = {
  DRAFT:     { color: 'default', icon: <ClockCircleOutlined />, label: '草稿' },
  PUBLISHED: { color: 'success', icon: <CheckCircleOutlined />, label: '已发布' },
  ARCHIVED:  { color: 'warning', icon: <InboxOutlined />,       label: '已归档' },
} as const;

// ───────── Sortable Card ─────────
function SortableCard<T extends { status?: string }>({
  id, item, selected, onClick, onEdit, onDelete, onPublish, onArchive, renderContent,
}: {
  id: string; item: T; selected: boolean;
  onClick: () => void; onEdit: () => void; onDelete: () => void;
  onPublish?: () => void; onArchive?: () => void;
  renderContent: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const isDraft     = item.status === 'DRAFT';
  const isPublished = item.status === 'PUBLISHED';
  return (
    <div
      ref={setNodeRef}
      data-id={id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : ('auto' as any),
      }}
      className={`panel-card${selected ? ' panel-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="panel-card__drag" {...attributes} {...listeners}>
        <DragOutlined style={{ color: '#bbb', cursor: 'grab' }} />
      </div>
      <div className="panel-card__body">{renderContent(item)}</div>
      <div className="panel-card__actions" onClick={(e) => e.stopPropagation()}>
        {/* 草稿态显示「发布」；已发布态显示「下架」 */}
        {isDraft && onPublish && (
          <Tooltip title="发布到用户端">
            <Button size="small" type="text" style={{ color: '#52c41a' }} onClick={onPublish}>
              发布
            </Button>
          </Tooltip>
        )}
        {isPublished && onArchive && (
          <Tooltip title="从用户端下架">
            <Button size="small" type="text" style={{ color: '#fa8c16' }} onClick={onArchive}>
              下架
            </Button>
          </Tooltip>
        )}
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
        <Popconfirm title="确认删除？" onConfirm={onDelete}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
  );
}

// ───────── Panel Column ─────────
function PanelColumn<T extends { id: string; status?: string }>({
  title, icon, color, items, loading, selectedId, columnRef, headerExtra,
  onSelect, onAdd, onEdit, onDelete, onPublish, onArchive, onReorder, renderContent,
}: {
  title: string; icon: React.ReactNode; color: string;
  items: T[]; loading: boolean; selectedId?: string;
  columnRef: React.RefObject<HTMLDivElement>;
  headerExtra?: React.ReactNode;
  onSelect: (item: T) => void;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onPublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  onReorder: (items: T[]) => void;
  renderContent: (item: T) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oi = items.findIndex(i => i.id === active.id);
      const ni = items.findIndex(i => i.id === over.id);
      onReorder(arrayMove(items, oi, ni));
    }
  }
  return (
    <div className="panel-column" ref={columnRef}>
      <div className="panel-column__header" style={{ borderTopColor: color }}>
        <Space>
          <span style={{ color }}>{icon}</span>
          <Typography.Text strong>{title}</Typography.Text>
          <Tag style={{ margin: 0 }}>{items.length}</Tag>
        </Space>
        <Space size={4}>
          {headerExtra}
          <Button size="small" icon={<PlusOutlined />} type="primary" ghost onClick={onAdd}>新建</Button>
        </Space>
      </div>
      <div className="panel-column__body">
        {loading ? (
          <div style={{ padding: '12px 16px' }}><Skeleton active paragraph={{ rows: 3 }} /></div>
        ) : items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" style={{ padding: '32px 0' }} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map(item => (
                <SortableCard
                  key={item.id} id={item.id} item={item}
                  selected={item.id === selectedId}
                  onClick={() => onSelect(item)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                  onPublish={onPublish ? () => onPublish(item.id) : undefined}
                  onArchive={onArchive ? () => onArchive(item.id) : undefined}
                  renderContent={renderContent}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// ───────── SVG 端到端连线 ─────────
function ConnectionLines({
  col1Ref, col2Ref, selectedGroupId, scenes,
}: {
  col1Ref: React.RefObject<HTMLDivElement>;
  col2Ref: React.RefObject<HTMLDivElement>;
  selectedGroupId?: string;
  scenes: SceneListItem[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; accent: boolean }>
  >([]);

  const compute = useCallback(() => {
    if (!svgRef.current || !col1Ref.current || !col2Ref.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    // 全量端到端：每个一级场景 → 它所有的二级场景
    const col1Cards = col1Ref.current.querySelectorAll<HTMLElement>('[data-id]');

    col1Cards.forEach((src) => {
      const groupId = src.getAttribute('data-id')!;
      const srcRect = src.getBoundingClientRect();
      const related = scenes.filter(s => s.sceneGroupId === groupId);
      related.forEach((scene) => {
        const dst = col2Ref.current!.querySelector<HTMLElement>(`[data-id="${scene.id}"]`);
        if (!dst) return;
        const dstRect = dst.getBoundingClientRect();
        newLines.push({
          x1: srcRect.right - svgRect.left,
          y1: srcRect.top + srcRect.height / 2 - svgRect.top,
          x2: dstRect.left - svgRect.left,
          y2: dstRect.top + dstRect.height / 2 - svgRect.top,
          accent: groupId === selectedGroupId,
        });
      });
    });

    setLines(newLines);
  }, [col1Ref, col2Ref, selectedGroupId, scenes]);

  useEffect(() => {
    const t = setTimeout(compute, 60);
    return () => clearTimeout(t);
  }, [compute]);

  useEffect(() => {
    const ro = new ResizeObserver(() => setTimeout(compute, 30));
    [col1Ref, col2Ref].forEach(r => { if (r.current) ro.observe(r.current); });
    const onScroll = () => compute();
    window.addEventListener('scroll', onScroll, true);
    return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll, true); };
  }, [compute, col1Ref, col2Ref]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible', zIndex: 0,
      }}
    >
      <defs>
        <marker id="sm-arrow-accent" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#1677ff" />
        </marker>
        <marker id="sm-arrow-dim" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#bbb" />
        </marker>
      </defs>
      {lines.map((l, i) => {
        const dx = Math.abs(l.x2 - l.x1);
        const cp = Math.max(dx * 0.5, 60);
        const d = `M ${l.x1} ${l.y1} C ${l.x1 + cp} ${l.y1}, ${l.x2 - cp} ${l.y2}, ${l.x2} ${l.y2}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={l.accent ? '#1677ff' : '#c8c8c8'}
            strokeWidth={l.accent ? 2 : 1.2}
            strokeDasharray={l.accent ? undefined : '5 4'}
            opacity={l.accent ? 0.9 : 0.4}
            markerEnd={l.accent ? 'url(#sm-arrow-accent)' : 'url(#sm-arrow-dim)'}
          />
        );
      })}
    </svg>
  );
}

// ───────── 主页 ─────────
export function SceneManagePage() {
  const qc = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [groupModal, setGroupModal]   = useState<{ open: boolean; group?: SceneGroup | null }>({ open: false });
  const [sceneModal, setSceneModal]   = useState<{ open: boolean; scene?: SceneListItem | null }>({ open: false });
  const [worldMapOpen, setWorldMapOpen] = useState(false);

  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['admin', 'scene-groups'],
    queryFn: () => sceneGroupsApi.list(),
  });
  const { data: allScenes = [], isLoading: loadingScenes } = useQuery({
    queryKey: ['admin', 'scenes', {}],
    queryFn: () => scenesApi.list(),
  });

  // 二级场景列表跟随选中的一级场景过滤；未选中时显示全部
  const filteredScenes = selectedGroupId
    ? allScenes.filter(s => s.sceneGroupId === selectedGroupId)
    : allScenes;

  const [localGroups, setLocalGroups] = useState<SceneGroup[]>([]);
  const [localScenes, setLocalScenes] = useState<SceneListItem[]>([]);

  useEffect(() => { setLocalGroups(groups); }, [groups]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalScenes(filteredScenes); }, [filteredScenes.map(s => s.id).join(',')]);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0]!.id);
  }, [groups, selectedGroupId]);

  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => sceneGroupsApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'scene-groups'] }); },
  });
  const deleteSceneMut = useMutation({
    mutationFn: (id: string) => scenesApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'scenes'] }); },
  });
  const sortGroupsMut = useMutation({
    mutationFn: (it: SceneGroup[]) =>
      sceneGroupsApi.batchSort(it.map((g, idx) => ({ id: g.id, sortOrder: idx }))),
  });
  const sortScenesMut = useMutation({
    mutationFn: (it: SceneListItem[]) =>
      scenesApi.batchSort(it.map((s, idx) => ({ id: s.id, sortOrder: idx }))),
  });

  // 发布 / 下架
  const publishGroupMut = useMutation({
    mutationFn: (id: string) => sceneGroupsApi.publish(id),
    onSuccess: () => {
      message.success('已发布到用户端');
      qc.invalidateQueries({ queryKey: ['admin', 'scene-groups'] });
      qc.invalidateQueries({ queryKey: ['public', 'scene-groups'] });
    },
  });
  const archiveGroupMut = useMutation({
    mutationFn: (id: string) => sceneGroupsApi.archive(id),
    onSuccess: () => {
      message.success('已下架');
      qc.invalidateQueries({ queryKey: ['admin', 'scene-groups'] });
      qc.invalidateQueries({ queryKey: ['public', 'scene-groups'] });
    },
  });
  const publishSceneMut = useMutation({
    mutationFn: (id: string) => scenesApi.publish(id),
    onSuccess: () => {
      message.success('已发布到用户端');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
      qc.invalidateQueries({ queryKey: ['public', 'scenes'] });
    },
  });
  const archiveSceneMut = useMutation({
    mutationFn: (id: string) => scenesApi.archive(id),
    onSuccess: () => {
      message.success('已下架');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
      qc.invalidateQueries({ queryKey: ['public', 'scenes'] });
    },
  });

  function handleReorderGroups(next: SceneGroup[]) { setLocalGroups(next); sortGroupsMut.mutate(next); }
  function handleReorderScenes(next: SceneListItem[]) { setLocalScenes(next); sortScenesMut.mutate(next); }

  const col2Title = selectedGroupId
    ? `${groups.find(g => g.id === selectedGroupId)?.name ?? ''} · 二级场景`
    : '二级场景';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>场景管理</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          一级场景 → 二级场景，端到端连接所有关联关系
        </Typography.Text>
      </div>

      <div style={{ position: 'relative', flex: 1 }}>
        <ConnectionLines
          col1Ref={col1Ref}
          col2Ref={col2Ref}
          selectedGroupId={selectedGroupId}
          scenes={allScenes}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 96,                  /* ← 两面板间距加大 */
            height: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <PanelColumn<SceneGroup>
            title="一级场景"
            icon={<GlobalOutlined />}
            color="#1677ff"
            items={localGroups}
            loading={loadingGroups}
            selectedId={selectedGroupId}
            columnRef={col1Ref}
            headerExtra={
              <Tooltip title="编辑共享世界地图">
                <Button size="small" icon={<PictureOutlined />} onClick={() => setWorldMapOpen(true)}>
                  编辑地图
                </Button>
              </Tooltip>
            }
            onSelect={(g) => setSelectedGroupId(g.id)}
            onAdd={() => setGroupModal({ open: true, group: null })}
            onEdit={(g) => setGroupModal({ open: true, group: g })}
            onDelete={(id) => deleteGroupMut.mutate(id)}
            onPublish={(id) => publishGroupMut.mutate(id)}
            onArchive={(id) => archiveGroupMut.mutate(id)}
            onReorder={handleReorderGroups}
            renderContent={(g) => (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {g.name}
                    {g.isLocked && <LockOutlined style={{ marginLeft: 6, color: '#faad14', fontSize: 12 }} />}
                  </Typography.Text>
                  <Tag color={STATUS_CONFIG[g.status]?.color} icon={STATUS_CONFIG[g.status]?.icon}
                       style={{ margin: 0, fontSize: 11 }}>
                    {STATUS_CONFIG[g.status]?.label}
                  </Tag>
                </div>
                {g.description && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    {g.description}
                  </Typography.Text>
                )}
                <Tag color="blue" style={{ marginTop: 4, margin: 0, fontSize: 11 }}>
                  {g._count?.scenes ?? 0} 个二级场景
                </Tag>
              </div>
            )}
          />

          <PanelColumn<SceneListItem>
            title={col2Title}
            icon={<AppstoreOutlined />}
            color="#52c41a"
            items={localScenes}
            loading={loadingScenes}
            columnRef={col2Ref}
            onSelect={() => {}}
            onAdd={() => setSceneModal({ open: true, scene: null })}
            onEdit={(s) => setSceneModal({ open: true, scene: s })}
            onDelete={(id) => deleteSceneMut.mutate(id)}
            onPublish={(id) => publishSceneMut.mutate(id)}
            onArchive={(id) => archiveSceneMut.mutate(id)}
            onReorder={handleReorderScenes}
            renderContent={(s) => (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {s.name}
                    {s.isLocked && <LockOutlined style={{ marginLeft: 6, color: '#faad14', fontSize: 12 }} />}
                  </Typography.Text>
                  <Tag color={STATUS_CONFIG[s.status]?.color} icon={STATUS_CONFIG[s.status]?.icon}
                       style={{ margin: 0, fontSize: 11 }}>
                    {STATUS_CONFIG[s.status]?.label}
                  </Tag>
                </div>
                {s.description && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    {s.description}
                  </Typography.Text>
                )}
                <Tag color="green" style={{ marginTop: 4, margin: 0, fontSize: 11 }}>
                  {s._count?.items ?? 0} 个物品
                </Tag>
              </div>
            )}
          />
        </div>
      </div>

      <WorldMapEditModal
        open={worldMapOpen}
        onClose={() => setWorldMapOpen(false)}
        sceneGroups={localGroups}
      />
      <SceneGroupEditModal
        open={groupModal.open}
        group={groupModal.group}
        allGroups={localGroups}
        onClose={() => setGroupModal({ open: false })}
      />
      <SceneEditModal
        open={sceneModal.open}
        scene={sceneModal.scene}
        defaultGroupId={selectedGroupId}
        allGroups={localGroups}
        onClose={() => setSceneModal({ open: false })}
      />
    </div>
  );
}
