/**
 * 实验管理
 * - 列表：表格展示全部实验（状态/难度/时长/关联数）
 * - 编辑：弹窗（基础信息 + 材料清单 + 关联知识点/物品）
 * - 发布 / 下架 / 删除
 */
import { useEffect, useState } from 'react';
import {
  Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag,
  Typography, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  experimentsApi, itemsApi, knowledgeApi,
  type ExperimentListItem,
} from '@/api/content';
import { SUBJECT_LABEL } from '@oisee/shared';

const STATUS_CONFIG = {
  DRAFT:     { color: 'default', label: '草稿' },
  PUBLISHED: { color: 'success', label: '已发布' },
  ARCHIVED:  { color: 'warning', label: '已归档' },
} as const;

const DIFFICULTY_COLOR: Record<string, string> = { L1: 'green', L2: 'orange', L3: 'volcano' };

export function ExperimentManagePage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [modal, setModal] = useState<{ open: boolean; exp?: ExperimentListItem | null }>({ open: false });

  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ['admin', 'experiments', { keyword }],
    queryFn: () => experimentsApi.list(keyword ? { keyword } : undefined),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'experiments'] });
    qc.invalidateQueries({ queryKey: ['public', 'experiments'] });
  };
  const publishMut = useMutation({
    mutationFn: (id: string) => experimentsApi.publish(id),
    onSuccess: () => { message.success('已发布到用户端'); invalidate(); },
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => experimentsApi.archive(id),
    onSuccess: () => { message.success('已下架'); invalidate(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => experimentsApi.remove(id),
    onSuccess: () => { message.success('已删除'); invalidate(); },
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>实验管理</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            动手实验：材料清单、安全提示、关联知识点与物品
          </Typography.Text>
        </div>
        <Space>
          <Input.Search
            placeholder="搜索名称 / slug"
            allowClear
            style={{ width: 240 }}
            onSearch={setKeyword}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, exp: null })}>
            新建实验
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={experiments}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        columns={[
          {
            title: '实验',
            dataIndex: 'name',
            render: (_, r) => (
              <Space direction="vertical" size={0}>
                <Typography.Text strong>{r.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.slug}</Typography.Text>
              </Space>
            ),
          },
          {
            title: '难度',
            dataIndex: 'difficulty',
            width: 90,
            render: (d) => <Tag color={DIFFICULTY_COLOR[d]}>{d}</Tag>,
          },
          { title: '时长', dataIndex: 'durationMin', width: 90, render: (m) => `${m} 分钟` },
          {
            title: '家长陪同',
            dataIndex: 'needParent',
            width: 100,
            render: (v) => (v ? <Tag color="red">需要</Tag> : <Tag>不需要</Tag>),
          },
          {
            title: '关联',
            width: 140,
            render: (_, r) => (
              <Space size={4}>
                <Tag color="purple" style={{ margin: 0 }}>{r._count?.knowledgePoints ?? 0} KP</Tag>
                <Tag color="blue" style={{ margin: 0 }}>{r._count?.items ?? 0} 物品</Tag>
              </Space>
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: keyof typeof STATUS_CONFIG) => (
              <Tag color={STATUS_CONFIG[s]?.color}>{STATUS_CONFIG[s]?.label}</Tag>
            ),
          },
          {
            title: '操作',
            width: 220,
            render: (_, r) => (
              <Space size={4}>
                {r.status !== 'PUBLISHED' ? (
                  <Button size="small" type="link" style={{ color: '#52c41a', padding: '0 4px' }}
                    onClick={() => publishMut.mutate(r.id)}>
                    发布
                  </Button>
                ) : (
                  <Button size="small" type="link" style={{ color: '#fa8c16', padding: '0 4px' }}
                    onClick={() => archiveMut.mutate(r.id)}>
                    下架
                  </Button>
                )}
                <Button size="small" type="text" icon={<EditOutlined />}
                  onClick={() => setModal({ open: true, exp: r })} />
                <Popconfirm title="确认删除此实验？" onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <ExperimentEditModal
        open={modal.open}
        exp={modal.exp}
        onClose={() => setModal({ open: false })}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════
//   编辑弹窗
// ════════════════════════════════════════════════════
function ExperimentEditModal({ open, exp, onClose }: {
  open: boolean; exp?: ExperimentListItem | null; onClose: () => void;
}) {
  const isNew = !exp;
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data: detail } = useQuery({
    queryKey: ['admin', 'experiment', exp?.id],
    queryFn: () => experimentsApi.detail(exp!.id),
    enabled: !!exp?.id && open,
  });
  const { data: allKps = [] } = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
    enabled: open,
  });
  const { data: allItems = [] } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const data = detail ?? exp;
    if (data) {
      form.setFieldsValue({
        slug: data.slug,
        name: data.name,
        difficulty: data.difficulty,
        durationMin: data.durationMin,
        needParent: data.needParent,
        materialType: data.materialType ?? null,
        description: data.description,
        materialsHome: (data.materialsHome as string[]) ?? [],
        materialsKit: (data.materialsKit as string[]) ?? [],
        safety: data.safety ?? '',
        videoUrl: data.videoUrl ?? '',
        knowledgePointIds: (detail?.knowledgePoints ?? []).map((k) => k.knowledgePointId),
        itemIds: (detail?.items ?? []).map((i) => i.itemId),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        difficulty: 'L1', durationMin: 10, needParent: false,
        materialsHome: [], materialsKit: [], knowledgePointIds: [], itemIds: [],
      });
    }
  }, [open, exp, detail, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        slug: values.slug,
        name: values.name,
        difficulty: values.difficulty,
        durationMin: values.durationMin,
        needParent: !!values.needParent,
        materialType: values.materialType ?? null,
        description: values.description,
        materialsHome: values.materialsHome?.length ? values.materialsHome : null,
        materialsKit: values.materialsKit?.length ? values.materialsKit : null,
        safety: values.safety?.trim() ? values.safety.trim() : null,
        videoUrl: values.videoUrl?.trim() ? values.videoUrl.trim() : null,
        knowledgePointIds: values.knowledgePointIds ?? [],
        itemIds: values.itemIds ?? [],
      };
      if (isNew) return experimentsApi.create(payload);
      return experimentsApi.update(exp!.id, payload);
    },
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'experiments'] });
      qc.invalidateQueries({ queryKey: ['admin', 'experiment', exp?.id] });
      onClose();
    },
    onError: (e: any) => message.error(e?.message ?? '保存失败'),
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isNew ? '新建实验' : `编辑 · ${exp?.name}`}
      width={720}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saveMut.isPending} onClick={() => form.submit()}>保存</Button>
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)} style={{ marginTop: 8 }}>
        <Space size="large" style={{ width: '100%' }} align="start">
          <Form.Item name="name" label="名称" rules={[{ required: true }]} style={{ width: 300 }}>
            <Input placeholder="如：微波炉里的棉花糖巨人" maxLength={60} />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/, message: '仅小写字母、数字、短横线' }]}
            style={{ width: 280 }}
          >
            <Input placeholder="如：exp-marshmallow" />
          </Form.Item>
        </Space>
        <Space size="large" align="start">
          <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
            <Select style={{ width: 130 }} options={[
              { value: 'L1', label: 'L1 启蒙' },
              { value: 'L2', label: 'L2 探索' },
              { value: 'L3', label: 'L3 深化' },
            ]} />
          </Form.Item>
          <Form.Item name="durationMin" label="时长（分钟）" rules={[{ required: true }]}>
            <InputNumber min={1} max={600} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="needParent" label="需家长陪同" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="materialType" label="材料类型">
            <Select style={{ width: 140 }} allowClear options={[
              { value: '家用物品', label: '家用物品' },
              { value: '材料包', label: '材料包' },
            ]} />
          </Form.Item>
        </Space>
        <Form.Item name="description" label="实验描述" rules={[{ required: true }]}>
          <Input.TextArea rows={3} maxLength={1000} showCount placeholder="实验做什么、能观察到什么现象" />
        </Form.Item>
        <Space size="large" style={{ width: '100%' }} align="start">
          <Form.Item name="materialsHome" label="家用材料清单" style={{ width: 320 }}>
            <Select mode="tags" placeholder="输入后回车添加" open={false} />
          </Form.Item>
          <Form.Item name="materialsKit" label="材料包清单" style={{ width: 320 }}>
            <Select mode="tags" placeholder="输入后回车添加" open={false} />
          </Form.Item>
        </Space>
        <Form.Item name="safety" label="安全提示">
          <Input.TextArea rows={2} maxLength={500} showCount placeholder="如：需要用到微波炉，请在家长陪同下进行" />
        </Form.Item>
        <Form.Item name="videoUrl" label="演示视频 URL">
          <Input placeholder="https://... 或 /uploads/...（留空时用户端播放演示视频）" />
        </Form.Item>
        <Form.Item name="knowledgePointIds" label="关联知识点">
          <Select
            mode="multiple"
            placeholder="选择用到的知识点"
            optionFilterProp="label"
            maxTagCount="responsive"
            options={allKps.map((k) => ({
              value: k.id,
              label: `${k.name}（${SUBJECT_LABEL[k.subject] ?? k.subject} · ${k.difficulty}）`,
            }))}
          />
        </Form.Item>
        <Form.Item name="itemIds" label="关联物品">
          <Select
            mode="multiple"
            placeholder="选择相关物品"
            optionFilterProp="label"
            maxTagCount="responsive"
            options={allItems.map((it) => ({
              value: it.id,
              label: `${it.name}（${it.scene?.name ?? '—'}）`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
