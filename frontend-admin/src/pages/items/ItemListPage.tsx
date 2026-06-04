import { Button, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { itemsApi, scenesApi, type ItemListItem } from '@/api/content';
import { CONTENT_STATUS_LABEL } from '@oisee/shared';

export function ItemListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [sceneId, setSceneId] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'items', { keyword, sceneId }],
    queryFn: () => itemsApi.list({ keyword, sceneId }),
  });

  const { data: scenes } = useQuery({
    queryKey: ['admin', 'scenes', {}],
    queryFn: () => scenesApi.list(),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => itemsApi.publish(id),
    onSuccess: () => {
      message.success('已发布');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => itemsApi.archive(id),
    onSuccess: () => {
      message.success('已归档');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => itemsApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          物品管理
        </Typography.Title>
        <Space>
          <Select
            placeholder="按场景筛选"
            allowClear
            value={sceneId}
            onChange={setSceneId}
            style={{ width: 180 }}
            options={scenes?.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input.Search
            placeholder="搜索名称 / slug"
            allowClear
            onSearch={setKeyword}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/items/new')}>
            新建物品
          </Button>
        </Space>
      </Space>

      <Table<ItemListItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '名称', dataIndex: 'name', width: 140 },
          { title: 'slug', dataIndex: 'slug', width: 140 },
          {
            title: '所属场景',
            width: 140,
            render: (_, r) => r.scene?.name ?? '—',
          },
          { title: '简介', dataIndex: 'shortDesc', ellipsis: true },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (s) => (
              <Tag color={s === 'PUBLISHED' ? 'green' : s === 'DRAFT' ? 'gold' : 'default'}>
                {CONTENT_STATUS_LABEL[s as keyof typeof CONTENT_STATUS_LABEL]}
              </Tag>
            ),
          },
          {
            title: '知识点',
            width: 80,
            render: (_, r) => r._count?.knowledgePoints ?? 0,
          },
          {
            title: '操作',
            key: 'op',
            width: 200,
            render: (_, r) => (
              <Space size="small">
                <Link to={`/items/${r.id}`}>编辑</Link>
                {r.status !== 'PUBLISHED' ? (
                  <a onClick={() => publishMut.mutate(r.id)}>发布</a>
                ) : (
                  <a onClick={() => archiveMut.mutate(r.id)}>归档</a>
                )}
                <Popconfirm
                  title="确定删除？"
                  onConfirm={() => removeMut.mutate(r.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <a style={{ color: '#ff4d4f' }}>删除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
