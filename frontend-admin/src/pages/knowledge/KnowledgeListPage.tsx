import { Button, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { knowledgeApi, type KnowledgeListItem } from '@/api/content';
import {
  CONTENT_STATUS_LABEL,
  SUBJECT_LABEL,
  SUBJECT_COLOR,
  DIFFICULTY_LABEL,
  LEVEL_COLOR,
  SUBJECT,
} from '@oisee/shared';

export function KnowledgeListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [subject, setSubject] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kps', { keyword, subject, difficulty }],
    queryFn: () => knowledgeApi.list({ keyword, subject, difficulty }),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.publish(id),
    onSuccess: () => {
      message.success('已发布');
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
    },
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.archive(id),
    onSuccess: () => {
      message.success('已归档');
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => knowledgeApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          知识点管理
        </Typography.Title>
        <Space>
          <Select
            placeholder="学科"
            allowClear
            value={subject}
            onChange={setSubject}
            style={{ width: 120 }}
            options={Object.values(SUBJECT).map((s) => ({
              value: s,
              label: SUBJECT_LABEL[s],
            }))}
          />
          <Select
            placeholder="难度"
            allowClear
            value={difficulty}
            onChange={setDifficulty}
            style={{ width: 100 }}
            options={['L1', 'L2', 'L3'].map((l) => ({ value: l, label: l }))}
          />
          <Input.Search
            placeholder="搜索名称 / slug"
            allowClear
            onSearch={setKeyword}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/knowledge/new')}>
            新建知识点
          </Button>
        </Space>
      </Space>

      <Table<KnowledgeListItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '名称', dataIndex: 'name', width: 180 },
          { title: 'slug', dataIndex: 'slug', width: 160 },
          {
            title: '学科',
            dataIndex: 'subject',
            width: 90,
            render: (s) => (
              <Tag color={SUBJECT_COLOR[s as keyof typeof SUBJECT_COLOR]}>
                {SUBJECT_LABEL[s as keyof typeof SUBJECT_LABEL]}
              </Tag>
            ),
          },
          {
            title: '难度',
            dataIndex: 'difficulty',
            width: 100,
            render: (d) => (
              <Tag color={LEVEL_COLOR[d as keyof typeof LEVEL_COLOR]}>
                {DIFFICULTY_LABEL[d as keyof typeof DIFFICULTY_LABEL]}
              </Tag>
            ),
          },
          { title: '摘要', dataIndex: 'summary', ellipsis: true },
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
            title: '关联物品',
            width: 90,
            render: (_, r) => r._count?.items ?? 0,
          },
          {
            title: '操作',
            key: 'op',
            width: 200,
            render: (_, r) => (
              <Space size="small">
                <Link to={`/knowledge/${r.id}`}>编辑</Link>
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
