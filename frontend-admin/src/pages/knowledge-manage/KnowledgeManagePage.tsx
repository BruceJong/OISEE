/**
 * 知识点管理
 * - 上方：按学科分 Tab，展示该学科下的所有知识点（卡片网格）
 * - 底部：物品展示架（横向滚动），从展示架拖动/点击物品到上方知识点 → 建立关联
 */
import { useState } from 'react';
import {
  Button, Card, Empty, Skeleton, Space, Tabs, Tag, Typography, Popconfirm, message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, BulbOutlined, LinkOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  itemsApi, knowledgeApi,
  type KnowledgeListItem, type ItemListItem,
} from '@/api/content';
import { KnowledgePointEditModal } from '@/components/modals/KnowledgePointEditModal';
import { SUBJECT, SUBJECT_LABEL } from '@oisee/shared';

const DIFFICULTY_COLOR: Record<string, string> = {
  L1: 'green',
  L2: 'orange',
  L3: 'volcano',
};

const SUBJECT_COLOR: Record<string, string> = {
  PHYSICS:   '#1677ff',
  CHEMISTRY: '#722ed1',
  BIOLOGY:   '#52c41a',
  GEOGRAPHY: '#fa8c16',
  OTHER:     '#8c8c8c',
};

export function KnowledgeManagePage() {
  const qc = useQueryClient();
  const [activeSubject, setActiveSubject] = useState<string>(SUBJECT.PHYSICS);
  const [selectedKpId, setSelectedKpId] = useState<string | undefined>();
  const [kpModal, setKpModal] = useState<{ open: boolean; kp?: KnowledgeListItem | null }>({ open: false });

  const { data: allKps = [], isLoading } = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
  });

  // 当前选中知识点详情（含关联的物品 ID）
  const { data: selectedKpDetail } = useQuery({
    queryKey: ['admin', 'kp', selectedKpId],
    queryFn: () => knowledgeApi.detail(selectedKpId!),
    enabled: !!selectedKpId,
  });

  const linkedItemIds = new Set(
    (selectedKpDetail as any)?.items?.map((it: any) => it.itemId) ?? []
  );

  // 关联 / 取消关联
  const toggleLinkMut = useMutation({
    mutationFn: async (itemId: string) => {
      if (!selectedKpId || !selectedKpDetail) return;
      const current = new Set(linkedItemIds);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      // 用 update 重设 itemIds（KP API 支持）
      await knowledgeApi.update(selectedKpId, {
        ...selectedKpDetail,
        itemIds: Array.from(current),
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'kp', selectedKpId] });
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.remove(id),
    onSuccess: () => { message.success('已删除'); qc.invalidateQueries({ queryKey: ['admin', 'kps'] }); },
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.publish(id),
    onSuccess: () => { message.success('已发布到用户端'); qc.invalidateQueries({ queryKey: ['admin', 'kps'] }); },
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.archive(id),
    onSuccess: () => { message.success('已下架'); qc.invalidateQueries({ queryKey: ['admin', 'kps'] }); },
  });

  // 按学科分组
  const subjectKps = allKps.filter(k => k.subject === activeSubject);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>知识点管理</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            按学科分类，选中一个知识点后点击底部展示架的物品即可建立关联
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setKpModal({ open: true, kp: null })}
        >
          新建知识点
        </Button>
      </div>

      {/* 学科 Tab */}
      <Tabs
        activeKey={activeSubject}
        onChange={setActiveSubject}
        items={Object.values(SUBJECT).map((s) => ({
          key: s,
          label: (
            <span>
              <span style={{
                display: 'inline-block',
                width: 8, height: 8, borderRadius: '50%',
                background: SUBJECT_COLOR[s],
                marginRight: 6,
              }} />
              {SUBJECT_LABEL[s]}
              <Tag style={{ marginLeft: 6 }}>{allKps.filter(k => k.subject === s).length}</Tag>
            </span>
          ),
        }))}
      />

      {/* 知识点卡片网格 */}
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
        {isLoading ? (
          <Skeleton active />
        ) : subjectKps.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`${SUBJECT_LABEL[activeSubject as keyof typeof SUBJECT_LABEL]}下暂无知识点`}
            style={{ padding: '60px 0' }}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {subjectKps.map(kp => (
              <KpCard
                key={kp.id}
                kp={kp}
                selected={kp.id === selectedKpId}
                onSelect={() => setSelectedKpId(kp.id === selectedKpId ? undefined : kp.id)}
                onEdit={() => setKpModal({ open: true, kp })}
                onDelete={() => deleteMut.mutate(kp.id)}
                onPublish={() => publishMut.mutate(kp.id)}
                onArchive={() => archiveMut.mutate(kp.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部物品展示架 */}
      <Card
        size="small"
        title={
          <Space>
            <BulbOutlined />
            <span>物品展示架</span>
            {selectedKpId && (
              <Tag color="processing">
                正在关联：{allKps.find(k => k.id === selectedKpId)?.name}
              </Tag>
            )}
            {!selectedKpId && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                先在上方选中一个知识点
              </Typography.Text>
            )}
          </Space>
        }
        bodyStyle={{
          padding: 12,
          background: 'linear-gradient(180deg, #faf6ed 0%, #ede2c8 100%)',
          borderRadius: 0,
        }}
        style={{ flexShrink: 0 }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {allItems.length === 0 ? (
            <Typography.Text type="secondary" style={{ padding: 12 }}>
              暂无物品
            </Typography.Text>
          ) : (
            allItems.map(it => (
              <ItemShelfCard
                key={it.id}
                item={it}
                linked={linkedItemIds.has(it.id)}
                clickable={!!selectedKpId}
                loading={toggleLinkMut.isPending}
                onClick={() => {
                  if (selectedKpId) toggleLinkMut.mutate(it.id);
                  else message.info('请先在上方选中一个知识点');
                }}
              />
            ))
          )}
        </div>
      </Card>

      <KnowledgePointEditModal
        open={kpModal.open}
        kp={kpModal.kp}
        onClose={() => setKpModal({ open: false })}
      />
    </div>
  );
}

const KP_STATUS_CONFIG = {
  DRAFT:     { color: 'default', label: '草稿' },
  PUBLISHED: { color: 'success', label: '已发布' },
  ARCHIVED:  { color: 'warning', label: '已归档' },
} as const;

// ── 知识点卡片 ──
function KpCard({
  kp, selected, onSelect, onEdit, onDelete, onPublish, onArchive,
}: {
  kp: KnowledgeListItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onArchive: () => void;
}) {
  const statusCfg = KP_STATUS_CONFIG[kp.status] ?? KP_STATUS_CONFIG.DRAFT;
  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 10,
        border: `2px solid ${selected ? '#1677ff' : '#f0f0f0'}`,
        padding: 12,
        cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: selected ? '0 2px 12px rgba(22,119,255,0.18)' : 'none',
      }}
    >
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 4 }}>
        <Space size={4}>
          <Tag color={SUBJECT_COLOR[kp.subject]} style={{ margin: 0, fontSize: 10 }}>
            {SUBJECT_LABEL[kp.subject]}
          </Tag>
          <Tag color={DIFFICULTY_COLOR[kp.difficulty]} style={{ margin: 0, fontSize: 10 }}>
            {kp.difficulty}
          </Tag>
          <Tag color={statusCfg.color} style={{ margin: 0, fontSize: 10 }}>
            {statusCfg.label}
          </Tag>
        </Space>
        <Space size={2} onClick={(e) => e.stopPropagation()}>
          {kp.status !== 'PUBLISHED' ? (
            <Button size="small" type="text" style={{ color: '#52c41a', padding: '0 4px' }} onClick={onPublish}>
              发布
            </Button>
          ) : (
            <Button size="small" type="text" style={{ color: '#fa8c16', padding: '0 4px' }} onClick={onArchive}>
              下架
            </Button>
          )}
          <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
          <Popconfirm title="确认删除？" onConfirm={onDelete}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </Space>
      <Typography.Text strong style={{ fontSize: 14, display: 'block', marginTop: 2 }}>
        <BookOutlined style={{ color: '#722ed1', marginRight: 4 }} />
        {kp.name}
      </Typography.Text>
      {kp.summary && (
        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}
          ellipsis={{ rows: 2 }}
        >
          {kp.summary}
        </Typography.Paragraph>
      )}
      <Tag color="purple" style={{ marginTop: 6, margin: 0, fontSize: 10 }}>
        关联 {kp._count?.items ?? 0} 个物品
      </Tag>
    </div>
  );
}

// ── 物品展示架卡片 ──
function ItemShelfCard({
  item, linked, clickable, loading, onClick,
}: {
  item: ItemListItem;
  linked: boolean;
  clickable: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const img = item.itemImageUrl || item.coverUrl;
  return (
    <Tooltip title={linked ? '点击取消关联' : clickable ? '点击建立关联' : '请先选择知识点'}>
      <div
        onClick={loading ? undefined : onClick}
        style={{
          flexShrink: 0,
          width: 110,
          background: '#fff',
          borderRadius: 8,
          border: linked ? '2px solid #1677ff' : '1px solid #ddd2b0',
          boxShadow: linked
            ? '0 4px 16px rgba(22,119,255,0.25)'
            : '0 2px 6px rgba(120,98,40,0.08)',
          cursor: clickable ? 'pointer' : 'default',
          opacity: !clickable && !linked ? 0.65 : 1,
          overflow: 'hidden',
          position: 'relative',
          transition: 'transform .12s',
        }}
        onMouseEnter={(e) => {
          if (clickable) e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
        }}
      >
        <div
          style={{
            height: 80,
            background: img ? `url(${img}) center/contain no-repeat #fff` : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bbb',
            fontSize: 22,
          }}
        >
          {!img && <BulbOutlined />}
        </div>
        <div style={{ padding: '4px 6px', textAlign: 'center' }}>
          <Typography.Text style={{ fontSize: 11 }} ellipsis>{item.name}</Typography.Text>
        </div>
        {linked && (
          <div
            style={{
              position: 'absolute', top: 2, right: 2,
              background: '#1677ff', color: '#fff',
              borderRadius: '50%',
              width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10,
            }}
          >
            <LinkOutlined />
          </div>
        )}
      </div>
    </Tooltip>
  );
}
