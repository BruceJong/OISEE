/**
 * 物品管理
 * - 左侧栏：场景树筛选（全部 / 一级场景 → 二级场景）
 * - 右侧：物品以虚拟展示柜（图片网格）呈现
 * - 点击物品打开编辑弹窗
 */
import { useState, useMemo } from 'react';
import {
  Button, Card, Empty, Skeleton, Space, Tag, Tree, Typography, Popconfirm, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, BulbOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sceneGroupsApi } from '@/api/scene-groups';
import { scenesApi, itemsApi, type ItemListItem } from '@/api/content';
import { ItemEditModal } from '@/components/modals/ItemEditModal';
import type { DataNode } from 'antd/es/tree';

const ALL_KEY = '__all__';

export function ItemManagePage() {
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>(ALL_KEY);
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: ItemListItem | null }>({ open: false });

  const { data: groups = [] } = useQuery({
    queryKey: ['admin', 'scene-groups'],
    queryFn: () => sceneGroupsApi.list(),
  });
  const { data: allScenes = [] } = useQuery({
    queryKey: ['admin', 'scenes', {}],
    queryFn: () => scenesApi.list(),
  });
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => itemsApi.publish(id),
    onSuccess: () => {
      message.success('已发布到用户端');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => itemsApi.archive(id),
    onSuccess: () => {
      message.success('已下架');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });

  // 构造树
  const treeData: DataNode[] = useMemo(() => {
    const root: DataNode = {
      key: ALL_KEY,
      title: (
        <span>
          <AppstoreOutlined /> 全部 <Tag style={{ marginLeft: 4, fontSize: 11 }}>{allItems.length}</Tag>
        </span>
      ),
      children: groups.map(g => {
        const inGroup = allScenes.filter(s => s.sceneGroupId === g.id);
        const itemCountInGroup = allItems.filter(it => inGroup.some(s => s.id === it.sceneId)).length;
        return {
          key: `group:${g.id}`,
          title: (
            <span>
              {g.name} <Tag style={{ marginLeft: 4, fontSize: 10 }}>{itemCountInGroup}</Tag>
            </span>
          ),
          children: inGroup.map(s => {
            const cnt = allItems.filter(it => it.sceneId === s.id).length;
            return {
              key: `scene:${s.id}`,
              title: (
                <span style={{ fontSize: 13 }}>
                  {s.name} <Tag style={{ marginLeft: 4, fontSize: 10 }}>{cnt}</Tag>
                </span>
              ),
            };
          }),
        };
      }),
    };
    return [root];
  }, [groups, allScenes, allItems]);

  // 过滤逻辑
  const filtered = useMemo(() => {
    if (selectedKey === ALL_KEY || !selectedKey) return allItems;
    if (selectedKey.startsWith('group:')) {
      const groupId = selectedKey.slice('group:'.length);
      const scenesInGroup = allScenes.filter(s => s.sceneGroupId === groupId).map(s => s.id);
      return allItems.filter(it => scenesInGroup.includes(it.sceneId));
    }
    if (selectedKey.startsWith('scene:')) {
      const sceneId = selectedKey.slice('scene:'.length);
      return allItems.filter(it => it.sceneId === sceneId);
    }
    return allItems;
  }, [selectedKey, allItems, allScenes]);

  // 当前选中的场景 ID（用于新建时预填）
  const defaultSceneIdForNew = selectedKey.startsWith('scene:')
    ? selectedKey.slice('scene:'.length)
    : selectedKey.startsWith('group:')
      ? allScenes.find(s => s.sceneGroupId === selectedKey.slice('group:'.length))?.id
      : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>物品管理</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            左侧选择场景过滤，右侧展示柜陈列物品
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setItemModal({ open: true, item: null })}
        >
          新建物品
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* 左侧栏：场景筛选树 */}
        <Card
          size="small"
          title="场景筛选"
          bodyStyle={{ padding: 8, overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}
        >
          <Tree
            treeData={treeData}
            defaultExpandAll
            selectedKeys={[selectedKey]}
            onSelect={(keys) => {
              const k = keys[0] as string | undefined;
              setSelectedKey(k ?? ALL_KEY);
            }}
            blockNode
          />
        </Card>

        {/* 右侧：展示柜 */}
        <Card
          bordered={false}
          bodyStyle={{
            padding: 24,
            background: 'linear-gradient(180deg, #fafaf7 0%, #f0ece2 100%)',
            borderRadius: 12,
            minHeight: 480,
            overflow: 'auto',
          }}
        >
          {isLoading ? (
            <Skeleton active />
          ) : filtered.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={selectedKey === ALL_KEY ? '暂无物品' : '该场景下暂无物品'}
              style={{ padding: '60px 0' }}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 18,
              }}
            >
              {filtered.map(it => (
                <ItemCard
                  key={it.id}
                  item={it}
                  onEdit={() => setItemModal({ open: true, item: it })}
                  onDelete={() => deleteMut.mutate(it.id)}
                  onPublish={() => publishMut.mutate(it.id)}
                  onArchive={() => archiveMut.mutate(it.id)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <ItemEditModal
        open={itemModal.open}
        item={itemModal.item}
        defaultSceneId={defaultSceneIdForNew}
        onClose={() => setItemModal({ open: false })}
      />
    </div>
  );
}

const ITEM_STATUS_CONFIG = {
  DRAFT:     { color: 'default', label: '草稿' },
  PUBLISHED: { color: 'success', label: '已发布' },
  ARCHIVED:  { color: 'warning', label: '已归档' },
} as const;

function ItemCard({ item, onEdit, onDelete, onPublish, onArchive }: {
  item: ItemListItem; onEdit: () => void; onDelete: () => void;
  onPublish: () => void; onArchive: () => void;
}) {
  // 卡片封面优先用渲染图（itemImageUrl），其次封面图，最后兜底用图标
  const img = item.itemImageUrl || item.coverUrl || item.iconUrl;
  const statusCfg = ITEM_STATUS_CONFIG[item.status] ?? ITEM_STATUS_CONFIG.DRAFT;
  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #ecd9b4',
        boxShadow: '0 4px 12px rgba(120,98,40,0.07)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onClick={onEdit}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 18px rgba(120,98,40,0.13)';
        const a = e.currentTarget.querySelector<HTMLDivElement>('[data-actions]');
        if (a) a.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(120,98,40,0.07)';
        const a = e.currentTarget.querySelector<HTMLDivElement>('[data-actions]');
        if (a) a.style.opacity = '0';
      }}
    >
      <div
        style={{
          height: 130,
          background: img ? `url(${img}) center/contain no-repeat #fff` : '#f5f5f5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#bbb', fontSize: 28,
          borderBottom: '1px solid #f0ece2',
        }}
      >
        {!img && <BulbOutlined />}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <Typography.Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
          {item.name}
        </Typography.Text>
        <Space size={4} style={{ marginTop: 4 }} wrap>
          <Tag color={statusCfg.color} style={{ margin: 0, fontSize: 10 }}>{statusCfg.label}</Tag>
          <Tag style={{ margin: 0, fontSize: 10 }}>{item.scene?.name ?? '—'}</Tag>
          {item._count?.knowledgePoints !== undefined && (
            <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>
              {item._count.knowledgePoints} KP
            </Tag>
          )}
        </Space>
        <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
          {item.status !== 'PUBLISHED' ? (
            <Button size="small" type="link" style={{ padding: 0, height: 20, color: '#52c41a' }} onClick={onPublish}>
              发布
            </Button>
          ) : (
            <Button size="small" type="link" style={{ padding: 0, height: 20, color: '#fa8c16' }} onClick={onArchive}>
              下架
            </Button>
          )}
        </div>
      </div>
      <div
        data-actions
        style={{
          position: 'absolute', top: 4, right: 4,
          opacity: 0, transition: 'opacity .15s',
          display: 'flex', gap: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
        <Popconfirm title="确认删除此物品？" onConfirm={onDelete} okText="删除" cancelText="取消">
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    </div>
  );
}
