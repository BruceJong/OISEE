import { Button, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { scenesApi, type SceneListItem } from '@/api/content';
import { CONTENT_STATUS_LABEL } from '@oisee/shared';

export function SceneListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'scenes', { keyword }],
    queryFn: () => scenesApi.list({ keyword }),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => scenesApi.publish(id),
    onSuccess: () => {
      message.success('已发布');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => scenesApi.archive(id),
    onSuccess: () => {
      message.success('已归档');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => scenesApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          场景管理
        </Typography.Title>
        <Space>
          <Input.Search
            placeholder="搜索名称 / slug"
            allowClear
            onSearch={setKeyword}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/scenes/new')}>
            新建场景
          </Button>
        </Space>
      </Space>

      <Table<SceneListItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '名称', dataIndex: 'name', width: 160 },
          { title: 'slug', dataIndex: 'slug', width: 160 },
          { title: '分组', dataIndex: 'groupName', width: 100 },
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
            title: '物品数',
            width: 80,
            render: (_, r) => r._count?.items ?? 0,
          },
          { title: '默认开放', dataIndex: 'isDefault', width: 100, render: (v) => (v ? '✅' : '—') },
          {
            title: '操作',
            key: 'op',
            render: (_, r) => (
              <Space size="small">
                <Link to={`/scenes/${r.id}`}>编辑</Link>
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
