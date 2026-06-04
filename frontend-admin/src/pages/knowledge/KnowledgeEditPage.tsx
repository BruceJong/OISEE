import { useEffect } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Transfer,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { knowledgeApi, itemsApi } from '@/api/content';
import { ImageUpload } from '@/components/ImageUpload';
import { SUBJECT, SUBJECT_LABEL } from '@oisee/shared';

export function KnowledgeEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kp', id],
    queryFn: () => knowledgeApi.detail(id!),
    enabled: !isNew,
  });

  const { data: allItems } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ...data,
        itemIds: data.items?.map((it: any) => it.itemId) ?? [],
      });
    }
  }, [data, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        slug: values.slug,
        name: values.name,
        subject: values.subject,
        difficulty: values.difficulty,
        summary: values.summary ?? null,
        content: values.content,
        illustrationUrl: values.illustrationUrl ?? null,
        itemIds: values.itemIds ?? [],
      };
      if (isNew) return knowledgeApi.create(payload);
      return knowledgeApi.update(id!, payload);
    },
    onSuccess: (res: any) => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'kp'] });
      if (isNew) navigate(`/knowledge/${res.id}`, { replace: true });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isNew ? '新建知识点' : '编辑知识点'}
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/knowledge')}>返回</Button>
          <Button type="primary" onClick={() => form.submit()} loading={saveMut.isPending}>
            保存
          </Button>
        </Space>
      </Space>

      <Form
        form={form}
        layout="vertical"
        disabled={!isNew && isLoading}
        initialValues={{ subject: 'PHYSICS', difficulty: 'L1' }}
        onFinish={(v) => saveMut.mutate(v)}
      >
        <Card title="基础信息" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：电磁波是什么" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: '请输入 slug' },
              { pattern: /^[a-z0-9-]+$/, message: '只允许小写字母、数字、短横线' },
            ]}
          >
            <Input placeholder="如：em-wave" />
          </Form.Item>
          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              name="subject"
              label="学科"
              rules={[{ required: true, message: '请选择学科' }]}
              style={{ width: 200 }}
            >
              <Select
                options={Object.values(SUBJECT).map((s) => ({
                  value: s,
                  label: SUBJECT_LABEL[s],
                }))}
              />
            </Form.Item>
            <Form.Item
              name="difficulty"
              label="难度"
              rules={[{ required: true, message: '请选择难度' }]}
              style={{ width: 200 }}
            >
              <Select
                options={[
                  { value: 'L1', label: 'L1 · 启蒙（6-9 岁）' },
                  { value: 'L2', label: 'L2 · 探索（10-13 岁）' },
                  { value: 'L3', label: 'L3 · 深化（14-16 岁）' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="summary" label="卡片摘要（1-2 句）">
            <Input.TextArea rows={2} maxLength={200} showCount />
          </Form.Item>
        </Card>

        <Card title="图文内容" style={{ marginBottom: 16 }}>
          <Form.Item name="illustrationUrl" label="主配图">
            <ImageUpload purpose="kp-illustration" />
          </Form.Item>
          <Form.Item
            name="content"
            label="详细内容（Markdown 或纯文本）"
            rules={[{ required: true, message: '请输入内容' }]}
            extra="MVP 阶段先用纯文本/Markdown；后续会切到 TipTap 富文本"
          >
            <Input.TextArea rows={10} placeholder="详细原理讲解..." />
          </Form.Item>
        </Card>

        <Card title="关联物品">
          <Form.Item name="itemIds" label="关联到哪些物品">
            <ItemSelector items={allItems ?? []} />
          </Form.Item>
        </Card>
      </Form>
    </div>
  );
}

function ItemSelector({
  value,
  onChange,
  items,
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
  items: any[];
}) {
  return (
    <Transfer
      dataSource={items.map((it) => ({
        key: it.id,
        title: it.name,
        description: it.scene?.name ?? '—',
      }))}
      targetKeys={value ?? []}
      onChange={(keys) => onChange?.(keys as string[])}
      render={(item) => (
        <span>
          {item.title} <Tag>{item.description}</Tag>
        </span>
      )}
      listStyle={{ width: '46%', height: 320 }}
      titles={['全部物品', '已关联']}
      showSearch
    />
  );
}
