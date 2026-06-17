import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Button,
  Empty,
  Skeleton,
  Space,
  Tag,
  Typography,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sceneGroupsApi, type SceneGroup } from '@/api/scene-groups';
import { scenesApi, itemsApi, type SceneListItem, type ItemListItem } from '@/api/content';
import { SceneGroupEditModal } from '@/components/modals/SceneGroupEditModal';
import { SceneEditModal } from '@/components/modals/SceneEditModal';
import { ItemEditModal } from '@/components/modals/ItemEditModal';
import { WorldMapEditModal } from '@/components/modals/WorldMapEditModal';

// ─────────── 状态色标 ───────────
const STATUS_CONFIG = {
  DRAFT:     { color: 'default', icon: <ClockCircleOutlined />, label: '草稿' },
  PUBLISHED: { color: 'success', icon: <CheckCircleOutlined />, label: '已发布' },
  ARCHIVED:  { color: 'warning', icon: <InboxOutlined />,       label: '已归档' },
} as const;

// ─────────── Sortable Card ───────────
interface SortableCardProps<T> {
  id: string;
  item: T;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  renderContent: (item: T) => React.ReactNode;
}

function SortableCard<T>({
  id,
  item,
  selected,
  onClick,
  onEdit,
  onDelete,
  renderContent,
}: SortableCardProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      data-id={id}   // ← 放在外层 .panel-card，用于连线端点精确定位
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto' as any,
      }}
      className={`panel-card${selected ? ' panel-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="panel-card__drag" {...attributes} {...listeners}>
        <DragOutlined style={{ color: '#bbb', cursor: 'grab' }} />
      </div>
      <div className="panel-card__body">{renderContent(item)}</div>
      <div className="panel-card__actions" onClick={(e) => e.stopPropagation()}>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
        <Popconfirm title="确认删除？" onConfirm={onDelete} okText="删除" cancelText="取消">
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
  );
}

// ─────────── Panel Column ───────────
interface PanelColumnProps<T extends { id: string }> {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: T[];
  loading: boolean;
  selectedId?: string;
  columnRef: React.RefObject<HTMLDivElement>;
  headerExtra?: React.ReactNode;
  onSelect: (item: T) => void;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onReorder: (items: T[]) => void;
  renderContent: (item: T) => React.ReactNode;
}

function PanelColumn<T extends { id: string }>({
  title,
  icon,
  color,
  items,
  loading,
  selectedId,
  columnRef,
  headerExtra,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  renderContent,
}: PanelColumnProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oi = items.findIndex((i) => i.id === active.id);
      const ni = items.findIndex((i) => i.id === over.id);
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
          <Button size="small" icon={<PlusOutlined />} onClick={onAdd} type="primary" ghost>
            新建
          </Button>
        </Space>
      </div>

      <div className="panel-column__body">
        {loading ? (
          <div style={{ padding: '12px 16px' }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ) : items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无数据"
            style={{ padding: '32px 0' }}
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableCard
                  key={item.id}
                  id={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onClick={() => onSelect(item)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
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

// ─────────── SVG 连线（端到端贝塞尔曲线）───────────
interface ConnectionLinesProps {
  col1Ref: React.RefObject<HTMLDivElement>;
  col2Ref: React.RefObject<HTMLDivElement>;
  col3Ref: React.RefObject<HTMLDivElement>;
  selectedGroupId?: string;
  selectedSceneId?: string;
  scenes: SceneListItem[];
  items: ItemListItem[];
}

function ConnectionLines({
  col1Ref,
  col2Ref,
  col3Ref,
  selectedGroupId,
  selectedSceneId,
  scenes,
  items,
}: ConnectionLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; accent: boolean }>
  >([]);

  const computeLines = useCallback(() => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    // ── 一级场景 → 二级场景 ──
    if (selectedGroupId && col1Ref.current && col2Ref.current) {
      // 连线起点：col1 中选中卡片的右侧中点
      const srcEl = col1Ref.current.querySelector<HTMLElement>(`[data-id="${selectedGroupId}"]`);
      const srcRect = srcEl?.getBoundingClientRect();

      const relatedScenes = scenes.filter((s) => s.sceneGroupId === selectedGroupId);
      relatedScenes.forEach((scene) => {
        const dstEl = col2Ref.current!.querySelector<HTMLElement>(`[data-id="${scene.id}"]`);
        const dstRect = dstEl?.getBoundingClientRect();
        if (srcRect && dstRect) {
          newLines.push({
            x1: srcRect.right  - svgRect.left,
            y1: srcRect.top    + srcRect.height / 2 - svgRect.top,
            x2: dstRect.left   - svgRect.left,
            y2: dstRect.top    + dstRect.height / 2 - svgRect.top,
            accent: scene.id === selectedSceneId,
          });
        }
      });
    }

    // ── 二级场景 → 物品 ──
    if (selectedSceneId && col2Ref.current && col3Ref.current) {
      const srcEl = col2Ref.current.querySelector<HTMLElement>(`[data-id="${selectedSceneId}"]`);
      const srcRect = srcEl?.getBoundingClientRect();

      const relatedItems = items.filter((it) => it.sceneId === selectedSceneId);
      relatedItems.forEach((item) => {
        const dstEl = col3Ref.current!.querySelector<HTMLElement>(`[data-id="${item.id}"]`);
        const dstRect = dstEl?.getBoundingClientRect();
        if (srcRect && dstRect) {
          newLines.push({
            x1: srcRect.right - svgRect.left,
            y1: srcRect.top   + srcRect.height / 2 - svgRect.top,
            x2: dstRect.left  - svgRect.left,
            y2: dstRect.top   + dstRect.height / 2 - svgRect.top,
            accent: false,
          });
        }
      });
    }

    setLines(newLines);
  }, [col1Ref, col2Ref, col3Ref, selectedGroupId, selectedSceneId, scenes, items]);

  useEffect(() => {
    // 初次 + 数据变化后计算
    const timer = setTimeout(computeLines, 50);   // 等待 DOM 渲染稳定
    return () => clearTimeout(timer);
  }, [computeLines]);

  useEffect(() => {
    // 监听容器尺寸变化 & 滚动
    const ro = new ResizeObserver(() => setTimeout(computeLines, 30));
    [col1Ref, col2Ref, col3Ref].forEach((r) => { if (r.current) ro.observe(r.current); });
    window.addEventListener('scroll', computeLines, true);
    return () => { ro.disconnect(); window.removeEventListener('scroll', computeLines, true); };
  }, [computeLines]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      <defs>
        {/* 高亮连线末端箭头 */}
        <marker id="arrow-accent" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#1677ff" />
        </marker>
        <marker id="arrow-dim" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#bbb" />
        </marker>
      </defs>

      {lines.map((l, i) => {
        // 控制点：水平伸展 1/3 处，保证两侧切线水平（S形贝塞尔）
        const dx = Math.abs(l.x2 - l.x1);
        const cpOffset = Math.max(dx * 0.45, 40);
        const d = `M ${l.x1} ${l.y1} C ${l.x1 + cpOffset} ${l.y1}, ${l.x2 - cpOffset} ${l.y2}, ${l.x2} ${l.y2}`;

        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={l.accent ? '#1677ff' : '#c8c8c8'}
            strokeWidth={l.accent ? 2 : 1.5}
            strokeDasharray={l.accent ? undefined : '5 4'}
            opacity={l.accent ? 0.9 : 0.55}
            markerEnd={l.accent ? 'url(#arrow-accent)' : 'url(#arrow-dim)'}
          />
        );
      })}
    </svg>
  );
}

// ─────────── 主页 ───────────
export function QuickManagePage() {
  const qc = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [selectedSceneId, setSelectedSceneId] = useState<string>();

  const [groupModal, setGroupModal]     = useState<{ open: boolean; group?: SceneGroup | null }>({ open: false });
  const [sceneModal, setSceneModal]     = useState<{ open: boolean; scene?: SceneListItem | null }>({ open: false });
  const [itemModal,  setItemModal]      = useState<{ open: boolean; item?:  ItemListItem  | null }>({ open: false });
  const [worldMapOpen, setWorldMapOpen] = useState(false);

  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const col3Ref = useRef<HTMLDivElement>(null);

  // ── 数据 ──
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['admin', 'scene-groups'],
    queryFn: () => sceneGroupsApi.list(),
  });

  const { data: allScenes = [], isLoading: loadingScenes } = useQuery({
    queryKey: ['admin', 'scenes', {}],
    queryFn: () => scenesApi.list(),
  });

  const { data: allItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
  });

  // ── 过滤 ──
  const filteredScenes = selectedGroupId
    ? allScenes.filter((s) => s.sceneGroupId === selectedGroupId)
    : allScenes;
  const filteredItems = selectedSceneId
    ? allItems.filter((it) => it.sceneId === selectedSceneId)
    : [];

  // ── 本地排序态 ──
  const [localGroups, setLocalGroups] = useState<SceneGroup[]>([]);
  const [localScenes, setLocalScenes] = useState<SceneListItem[]>([]);
  const [localItems,  setLocalItems]  = useState<ItemListItem[]>([]);

  useEffect(() => { setLocalGroups(groups); }, [groups]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalScenes(filteredScenes); }, [filteredScenes.map((s) => s.id).join(',')]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocalItems(filteredItems);  }, [filteredItems.map((i) => i.id).join(',')]);

  // ── 默认选中第一条 ──
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0]!.id);
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (filteredScenes.length > 0) {
      if (!selectedSceneId || !filteredScenes.find((s) => s.id === selectedSceneId)) {
        setSelectedSceneId(filteredScenes[0]!.id);
      }
    } else {
      setSelectedSceneId(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, filteredScenes.map((s) => s.id).join(',')]);

  // ── 删除 ──
  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => sceneGroupsApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'scene-groups'] }); },
  });
  const deleteSceneMut = useMutation({
    mutationFn: (id: string) => scenesApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'scenes'] }); },
  });
  const deleteItemMut = useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'items'] }); },
  });

  // ── 排序持久化 ──
  const sortGroupsMut = useMutation({
    mutationFn: (it: SceneGroup[]) =>
      sceneGroupsApi.batchSort(it.map((g, idx) => ({ id: g.id, sortOrder: idx }))),
  });
  const sortScenesMut = useMutation({
    mutationFn: (it: SceneListItem[]) =>
      scenesApi.batchSort(it.map((s, idx) => ({ id: s.id, sortOrder: idx }))),
  });
  const sortItemsMut = useMutation({
    mutationFn: (it: ItemListItem[]) =>
      itemsApi.batchSort(it.map((i, idx) => ({ id: i.id, sortOrder: idx }))),
  });

  function handleReorderGroups(next: SceneGroup[]) { setLocalGroups(next); sortGroupsMut.mutate(next); }
  function handleReorderScenes(next: SceneListItem[]) { setLocalScenes(next); sortScenesMut.mutate(next); }
  function handleReorderItems(next: ItemListItem[])  { setLocalItems(next);  sortItemsMut.mutate(next); }

  const col2Title = selectedGroupId
    ? `${groups.find((g) => g.id === selectedGroupId)?.name ?? ''} · 场景`
    : '二级场景';

  const col3Title = selectedSceneId
    ? `${allScenes.find((s) => s.id === selectedSceneId)?.name ?? ''} · 物品`
    : '物品';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>快速管理</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          一级场景 → 二级场景 → 物品，点击选中查看关联，拖动排序
        </Typography.Text>
      </div>

      <div style={{ position: 'relative', flex: 1 }}>
        <ConnectionLines
          col1Ref={col1Ref}
          col2Ref={col2Ref}
          col3Ref={col3Ref}
          selectedGroupId={selectedGroupId}
          selectedSceneId={selectedSceneId}
          scenes={allScenes}
          items={allItems}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 16,
            height: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* 列 1：一级场景 ── 面板头部有「编辑地图」按钮 */}
          <PanelColumn<SceneGroup>
            title="一级场景"
            icon={<GlobalOutlined />}
            color="#1677ff"
            items={localGroups}
            loading={loadingGroups}
            selectedId={selectedGroupId}
            columnRef={col1Ref}
            headerExtra={
              <Tooltip title="编辑所有一级场景共享的世界地图">
                <Button
                  size="small"
                  icon={<PictureOutlined />}
                  onClick={() => setWorldMapOpen(true)}
                >
                  编辑地图
                </Button>
              </Tooltip>
            }
            onSelect={(g) => setSelectedGroupId(g.id)}
            onAdd={() => setGroupModal({ open: true, group: null })}
            onEdit={(g) => setGroupModal({ open: true, group: g })}
            onDelete={(id) => deleteGroupMut.mutate(id)}
            onReorder={handleReorderGroups}
            renderContent={(g) => (
              /* data-id 已移到外层 SortableCard，此处不再重复 */
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{g.name}</Typography.Text>
                  <Tag
                    color={STATUS_CONFIG[g.status]?.color}
                    icon={STATUS_CONFIG[g.status]?.icon}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {STATUS_CONFIG[g.status]?.label}
                  </Tag>
                </div>
                {g.description && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    {g.description}
                  </Typography.Text>
                )}
                <Tag color="blue" style={{ marginTop: 4, margin: 0, fontSize: 11 }}>
                  {g._count?.scenes ?? 0} 个场景
                </Tag>
              </div>
            )}
          />

          {/* 列 2：二级场景 */}
          <PanelColumn<SceneListItem>
            title={col2Title}
            icon={<AppstoreOutlined />}
            color="#52c41a"
            items={localScenes}
            loading={loadingScenes}
            selectedId={selectedSceneId}
            columnRef={col2Ref}
            onSelect={(s) => setSelectedSceneId(s.id)}
            onAdd={() => setSceneModal({ open: true, scene: null })}
            onEdit={(s) => setSceneModal({ open: true, scene: s })}
            onDelete={(id) => deleteSceneMut.mutate(id)}
            onReorder={handleReorderScenes}
            renderContent={(s) => (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{s.name}</Typography.Text>
                  <Tag
                    color={STATUS_CONFIG[s.status]?.color}
                    icon={STATUS_CONFIG[s.status]?.icon}
                    style={{ margin: 0, fontSize: 11 }}
                  >
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

          {/* 列 3：物品 */}
          <PanelColumn<ItemListItem>
            title={col3Title}
            icon={<BulbOutlined />}
            color="#fa8c16"
            items={localItems}
            loading={loadingItems && !!selectedSceneId}
            selectedId={undefined}
            columnRef={col3Ref}
            onSelect={() => {}}
            onAdd={() => setItemModal({ open: true, item: null })}
            onEdit={(it) => setItemModal({ open: true, item: it })}
            onDelete={(id) => deleteItemMut.mutate(id)}
            onReorder={handleReorderItems}
            renderContent={(it) => (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{it.name}</Typography.Text>
                  <Tag
                    color={STATUS_CONFIG[it.status]?.color}
                    icon={STATUS_CONFIG[it.status]?.icon}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {STATUS_CONFIG[it.status]?.label}
                  </Tag>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                  {it.shortDesc}
                </Typography.Text>
                <Tag color="orange" style={{ marginTop: 4, margin: 0, fontSize: 11 }}>
                  {it._count?.knowledgePoints ?? 0} 个知识点
                </Tag>
              </div>
            )}
          />
        </div>
      </div>

      {/* ── 弹窗 ── */}
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
        onClose={() => setSceneModal({ open: false })}
      />
      <ItemEditModal
        open={itemModal.open}
        item={itemModal.item}
        defaultSceneId={selectedSceneId}
        onClose={() => setItemModal({ open: false })}
      />
    </div>
  );
}
