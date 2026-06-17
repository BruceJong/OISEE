/**
 * 内容管理页：物品 → 知识点 → 实验
 * 三列并排，点击选中后展示关联，拖拽排序
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Button,
  Empty,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  BulbOutlined,
  BookOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { itemsApi, knowledgeApi, type ItemListItem, type KnowledgeListItem } from '@/api/content';
import { ItemEditModal } from '@/components/modals/ItemEditModal';
import { KnowledgePointEditModal } from '@/components/modals/KnowledgePointEditModal';

const STATUS_CONFIG = {
  DRAFT: { color: 'default', icon: <ClockCircleOutlined />, label: '草稿' },
  PUBLISHED: { color: 'success', icon: <CheckCircleOutlined />, label: '已发布' },
  ARCHIVED: { color: 'warning', icon: <InboxOutlined />, label: '已归档' },
} as const;

// ─── Sortable Card ───
function SortableCard<T>({
  id, item, selected, onClick, onEdit, onDelete, renderContent,
}: {
  id: string;
  item: T;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  renderContent: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      data-id={id}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`panel-card${selected ? ' panel-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="panel-card__drag" {...attributes} {...listeners}>
        <DragOutlined style={{ color: '#bbb', cursor: 'grab' }} />
      </div>
      <div className="panel-card__body">{renderContent(item)}</div>
      <div className="panel-card__actions" onClick={(e) => e.stopPropagation()}>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
        <Popconfirm title="确认删除？" onConfirm={onDelete}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
  );
}

// ─── Panel Column ───
function PanelColumn<T extends { id: string }>({
  title, icon, color, items, loading, selectedId, columnRef, onSelect, onAdd, onEdit, onDelete, onReorder, renderContent,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: T[];
  loading: boolean;
  selectedId?: string;
  columnRef: React.RefObject<HTMLDivElement>;
  onSelect: (item: T) => void;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
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
        <Button size="small" icon={<PlusOutlined />} type="primary" ghost onClick={onAdd}>新建</Button>
      </div>
      <div className="panel-column__body">
        {loading ? (
          <div style={{ padding: '12px 16px' }}><Skeleton active paragraph={{ rows: 3 }} /></div>
        ) : items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" style={{ padding: '32px 0' }} />
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

// ─── SVG 连线（端到端贝塞尔曲线）───
function ConnectionLines({
  col1Ref, col2Ref, col3Ref, selectedItemId, selectedKpId, kps, items,
}: {
  col1Ref: React.RefObject<HTMLDivElement>;
  col2Ref: React.RefObject<HTMLDivElement>;
  col3Ref: React.RefObject<HTMLDivElement>;
  selectedItemId?: string;
  selectedKpId?: string;
  kps: KnowledgeListItem[];
  items: ItemListItem[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; accent: boolean }>>([]);

  const computeLines = useCallback(() => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    if (selectedItemId && col1Ref.current && col2Ref.current) {
      const srcEl = col1Ref.current.querySelector<HTMLElement>(`[data-id="${selectedItemId}"]`);
      const srcRect = srcEl?.getBoundingClientRect();

      kps.forEach((kp) => {
        const dstEl = col2Ref.current!.querySelector<HTMLElement>(`[data-id="${kp.id}"]`);
        const dstRect = dstEl?.getBoundingClientRect();
        if (srcRect && dstRect) {
          newLines.push({
            x1: srcRect.right - svgRect.left,
            y1: srcRect.top + srcRect.height / 2 - svgRect.top,
            x2: dstRect.left - svgRect.left,
            y2: dstRect.top + dstRect.height / 2 - svgRect.top,
            accent: kp.id === selectedKpId,
          });
        }
      });
    }
    setLines(newLines);
  }, [col1Ref, col2Ref, col3Ref, selectedItemId, selectedKpId, kps, items]);

  useEffect(() => {
    const t = setTimeout(computeLines, 50);
    return () => clearTimeout(t);
  }, [computeLines]);

  useEffect(() => {
    const ro = new ResizeObserver(() => setTimeout(computeLines, 30));
    [col1Ref, col2Ref, col3Ref].forEach((r) => { if (r.current) ro.observe(r.current); });
    window.addEventListener('scroll', computeLines, true);
    return () => { ro.disconnect(); window.removeEventListener('scroll', computeLines, true); };
  }, [computeLines]);

  return (
    <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 0 }}>
      <defs>
        <marker id="cm-arrow-accent" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#1677ff" />
        </marker>
        <marker id="cm-arrow-dim" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#bbb" />
        </marker>
      </defs>
      {lines.map((l, i) => {
        const dx = Math.abs(l.x2 - l.x1);
        const cp = Math.max(dx * 0.45, 40);
        return (
          <path
            key={i}
            d={`M ${l.x1} ${l.y1} C ${l.x1 + cp} ${l.y1}, ${l.x2 - cp} ${l.y2}, ${l.x2} ${l.y2}`}
            fill="none"
            stroke={l.accent ? '#1677ff' : '#c8c8c8'}
            strokeWidth={l.accent ? 2 : 1.5}
            strokeDasharray={l.accent ? undefined : '5 4'}
            opacity={l.accent ? 0.9 : 0.55}
            markerEnd={l.accent ? 'url(#cm-arrow-accent)' : 'url(#cm-arrow-dim)'}
          />
        );
      })}
    </svg>
  );
}

// ─── 主页 ───
export function ContentManagePage() {
  const qc = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [selectedKpId, setSelectedKpId] = useState<string>();
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: ItemListItem | null }>({ open: false });
  const [kpModal, setKpModal] = useState<{ open: boolean; kp?: KnowledgeListItem | null }>({ open: false });

  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const col3Ref = useRef<HTMLDivElement>(null);

  const { data: allItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
  });

  const { data: allKps = [], isLoading: loadingKps } = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
  });

  const [localItems, setLocalItems] = useState<ItemListItem[]>([]);
  const [localKps, setLocalKps] = useState<KnowledgeListItem[]>([]);

  useEffect(() => { setLocalItems(allItems); }, [allItems]);
  useEffect(() => { setLocalKps(allKps); }, [allKps]);

  useEffect(() => {
    if (allItems.length > 0 && !selectedItemId) setSelectedItemId(allItems[0]!.id);
  }, [allItems, selectedItemId]);

  const deleteItemMut = useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'items'] }); },
  });
  const deleteKpMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'kps'] }); },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>内容管理</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          物品 → 知识点 → 实验，点击选中查看关联，拖动排序
        </Typography.Text>
      </div>

      <div style={{ position: 'relative', flex: 1 }}>
        <ConnectionLines
          col1Ref={col1Ref}
          col2Ref={col2Ref}
          col3Ref={col3Ref}
          selectedItemId={selectedItemId}
          selectedKpId={selectedKpId}
          kps={allKps}
          items={allItems}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, height: '100%', position: 'relative', zIndex: 1 }}>
          {/* 物品列 */}
          <PanelColumn<ItemListItem>
            title="物品"
            icon={<BulbOutlined />}
            color="#fa8c16"
            items={localItems}
            loading={loadingItems}
            selectedId={selectedItemId}
            columnRef={col1Ref}
            onSelect={(it) => setSelectedItemId(it.id)}
            onAdd={() => setItemModal({ open: true, item: null })}
            onEdit={(it) => setItemModal({ open: true, item: it })}
            onDelete={(id) => deleteItemMut.mutate(id)}
            onReorder={setLocalItems}
            renderContent={(it) => (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{it.name}</Typography.Text>
                  <Tag color={STATUS_CONFIG[it.status]?.color} icon={STATUS_CONFIG[it.status]?.icon} style={{ margin: 0, fontSize: 11 }}>
                    {STATUS_CONFIG[it.status]?.label}
                  </Tag>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                  {it.shortDesc}
                </Typography.Text>
                <Tag color="orange" style={{ marginTop: 4, fontSize: 11 }}>
                  {it.scene?.name ?? '—'}
                </Tag>
              </div>
            )}
          />

          {/* 知识点列 */}
          <PanelColumn<KnowledgeListItem>
            title="知识点"
            icon={<BookOutlined />}
            color="#722ed1"
            items={localKps}
            loading={loadingKps}
            selectedId={selectedKpId}
            columnRef={col2Ref}
            onSelect={(kp) => setSelectedKpId(kp.id)}
            onAdd={() => setKpModal({ open: true, kp: null })}
            onEdit={(kp) => setKpModal({ open: true, kp })}
            onDelete={(id) => deleteKpMut.mutate(id)}
            onReorder={setLocalKps}
            renderContent={(kp) => (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>{kp.name}</Typography.Text>
                  <Tag color={STATUS_CONFIG[kp.status]?.color} icon={STATUS_CONFIG[kp.status]?.icon} style={{ margin: 0, fontSize: 11 }}>
                    {STATUS_CONFIG[kp.status]?.label}
                  </Tag>
                </div>
                <Space size={4} style={{ marginTop: 4 }}>
                  <Tag color="purple" style={{ fontSize: 11 }}>{kp.subject}</Tag>
                  <Tag style={{ fontSize: 11 }}>{kp.difficulty}</Tag>
                </Space>
              </div>
            )}
          />

          {/* 实验列（预留） */}
          <div className="panel-column" ref={col3Ref}>
            <div className="panel-column__header" style={{ borderTopColor: '#13c2c2' }}>
              <Space>
                <span style={{ color: '#13c2c2' }}><ExperimentOutlined /></span>
                <Typography.Text strong>实验</Typography.Text>
                <Tag style={{ margin: 0 }}>0</Tag>
              </Space>
              <Button size="small" type="primary" ghost icon={<PlusOutlined />} disabled>
                新建
              </Button>
            </div>
            <div className="panel-column__body">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    实验管理即将上线
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      将与知识点关联
                    </Typography.Text>
                  </span>
                }
                style={{ padding: '40px 0' }}
              />
            </div>
          </div>
        </div>
      </div>

      <ItemEditModal
        open={itemModal.open}
        item={itemModal.item}
        onClose={() => setItemModal({ open: false })}
      />
      <KnowledgePointEditModal
        open={kpModal.open}
        kp={kpModal.kp}
        onClose={() => setKpModal({ open: false })}
      />
    </div>
  );
}
