import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tabs,
  Tag,
  Transfer,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  knowledgeApi, itemsApi, quizApi, kpRelationsApi,
  type KnowledgeListItem, type QuizQuestion,
} from '@/api/content';
import { AiGenerationPanel } from '@/components/ai/AiGenerationPanel';
import { SUBJECT, SUBJECT_LABEL } from '@oisee/shared';

interface KnowledgePointEditModalProps {
  open: boolean;
  kp?: KnowledgeListItem | null;
  onClose: () => void;
}

const ILLUSTRATION_PROMPT =
  '科学教育插图风格，清晰的原理示意图，适合儿童理解，色彩鲜明，有标注文字，白色背景，高清';

export function KnowledgePointEditModal({ open, kp, onClose }: KnowledgePointEditModalProps) {
  const isNew = !kp;
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);

  const { data: kpDetail } = useQuery({
    queryKey: ['admin', 'kp', kp?.id],
    queryFn: () => knowledgeApi.detail(kp!.id),
    enabled: !!kp?.id,
  });

  const { data: allItems } = useQuery({
    queryKey: ['admin', 'items', {}],
    queryFn: () => itemsApi.list(),
  });

  useEffect(() => {
    if (open) {
      const data = kpDetail ?? kp;
      if (data) {
        form.setFieldsValue({
          ...data,
          itemIds: (kpDetail as any)?.items?.map((it: any) => it.itemId) ?? [],
        });
        setIllustrationUrl((data as any).illustrationUrl ?? null);
      } else {
        form.resetFields();
        form.setFieldsValue({ subject: 'PHYSICS', difficulty: 'L1' });
        setIllustrationUrl(null);
      }
    }
  }, [open, kp, kpDetail, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        illustrationUrl,
      };
      if (isNew) return knowledgeApi.create(payload);
      return knowledgeApi.update(kp!.id, payload);
    },
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isNew ? '新建知识点' : `编辑 · ${kp?.name}`}
      width={720}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saveMut.isPending} onClick={() => form.submit()}>
            保存
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)} style={{ marginTop: 8 }}>
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <>
                  <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                    <Input placeholder="如：电磁波是什么" />
                  </Form.Item>
                  <Form.Item name="slug" label="Slug" rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/ }]}>
                    <Input placeholder="如：em-wave" />
                  </Form.Item>
                  <Space size="large">
                    <Form.Item name="subject" label="学科" rules={[{ required: true }]} style={{ width: 200 }}>
                      <Select
                        options={Object.values(SUBJECT).map((s) => ({
                          value: s,
                          label: SUBJECT_LABEL[s],
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name="difficulty" label="难度" rules={[{ required: true }]} style={{ width: 220 }}>
                      <Select
                        options={[
                          { value: 'L1', label: 'L1 启蒙（6-9 岁）' },
                          { value: 'L2', label: 'L2 探索（10-13 岁）' },
                          { value: 'L3', label: 'L3 深化（14-16 岁）' },
                        ]}
                      />
                    </Form.Item>
                  </Space>
                  <Form.Item name="summary" label="摘要">
                    <Input.TextArea rows={2} maxLength={200} showCount />
                  </Form.Item>
                  <Form.Item name="content" label="详细内容（Markdown）" rules={[{ required: true }]}>
                    <Input.TextArea rows={8} placeholder="详细原理讲解..." />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'illustration',
              label: '配图',
              children: (
                <>
                  <div style={{ marginBottom: 8, color: '#8c8c8c', fontSize: 13 }}>
                    为该知识点生成或上传配图。
                  </div>
                  <AiGenerationPanel
                    entityType="knowledge_point"
                    entityId={kp?.id}
                    purpose="illustration"
                    defaultPrompt={`${form.getFieldValue('name') || '知识点'} ${ILLUSTRATION_PROMPT}`}
                    value={illustrationUrl}
                    onChange={setIllustrationUrl}
                    label="配图"
                    previewHeight={200}
                  />
                </>
              ),
            },
            {
              key: 'video',
              label: '视频',
              children: (
                <>
                  <Form.Item name="videoTitle" label="视频标题">
                    <Input />
                  </Form.Item>
                  <Form.Item name="videoDurationSec" label="时长（秒）">
                    <Input type="number" style={{ width: 140 }} />
                  </Form.Item>
                  <Form.Item name="videoUrl" label="视频 URL">
                    <Input placeholder="https://..." />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'quiz',
              label: '小测题',
              children: kp?.id ? (
                <QuizTab kpId={kp.id} />
              ) : (
                <Alert type="info" showIcon message="请先保存知识点，再添加小测题。" />
              ),
            },
            {
              key: 'relations',
              label: '关联知识点',
              children: kp?.id ? (
                <RelationsTab kpId={kp.id} />
              ) : (
                <Alert type="info" showIcon message="请先保存知识点，再设置知识网络关联。" />
              ),
            },
            {
              key: 'items',
              label: '关联物品',
              children: (
                <Form.Item name="itemIds" label="关联物品">
                  <Transfer
                    dataSource={allItems?.map((it) => ({
                      key: it.id,
                      title: it.name,
                      description: it.scene?.name ?? '',
                    })) ?? []}
                    targetKeys={form.getFieldValue('itemIds') ?? []}
                    onChange={(keys) => form.setFieldValue('itemIds', keys)}
                    render={(it) => (
                      <span>
                        {it.title} <Tag>{it.description}</Tag>
                      </span>
                    )}
                    listStyle={{ width: '47%', height: 280 }}
                    titles={['全部物品', '已关联']}
                    showSearch
                  />
                </Form.Item>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}

// ════════════════════════════════════════════════════
//   小测题管理 Tab（考考你）
// ════════════════════════════════════════════════════
function QuizTab({ kpId }: { kpId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ open: boolean; q?: QuizQuestion | null }>({ open: false });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['admin', 'quiz', kpId],
    queryFn: () => quizApi.list(kpId),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => quizApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['admin', 'quiz', kpId] });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          单选题（4 选 1），发布状态的题目会出现在用户端「考考你」
        </Typography.Text>
        <Button size="small" icon={<PlusOutlined />} onClick={() => setEditing({ open: true, q: null })}>
          新增题目
        </Button>
      </Space>
      {isLoading ? null : questions.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无小测题" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {questions.map((q, i) => (
            <Card key={q.id} size="small" bodyStyle={{ padding: '10px 14px' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {String(i + 1).padStart(2, '0')}. {q.question}
                  </Typography.Text>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(q.choices ?? []).map((c, ci) => (
                      <Tag
                        key={ci}
                        color={ci === q.correctIndex ? 'success' : 'default'}
                        style={{ margin: 0, fontSize: 11 }}
                      >
                        {String.fromCharCode(65 + ci)}. {c}
                      </Tag>
                    ))}
                  </div>
                </div>
                <Space size={2}>
                  <Tag style={{ margin: 0, fontSize: 10 }}>{q.difficulty}</Tag>
                  <Button size="small" type="text" icon={<EditOutlined />}
                    onClick={() => setEditing({ open: true, q })} />
                  <Popconfirm title="确认删除此题？" onConfirm={() => removeMut.mutate(q.id)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Space>
            </Card>
          ))}
        </Space>
      )}
      <QuizEditModal
        open={editing.open}
        kpId={kpId}
        question={editing.q}
        onClose={() => setEditing({ open: false })}
      />
    </div>
  );
}

function QuizEditModal({ open, kpId, question, onClose }: {
  open: boolean; kpId: string; question?: QuizQuestion | null; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const isNew = !question;

  useEffect(() => {
    if (!open) return;
    if (question) {
      form.setFieldsValue({
        question: question.question,
        choices: question.choices ?? ['', '', '', ''],
        correctIndex: question.correctIndex,
        explanation: question.explanation ?? '',
        difficulty: question.difficulty,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ choices: ['', '', '', ''], correctIndex: 0, difficulty: 'L1' });
    }
  }, [open, question, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        question: values.question,
        choices: values.choices,
        correctIndex: values.correctIndex,
        explanation: values.explanation?.trim() ? values.explanation.trim() : null,
        difficulty: values.difficulty,
      };
      if (isNew) return quizApi.create(kpId, payload);
      return quizApi.update(question!.id, payload);
    },
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'quiz', kpId] });
      onClose();
    },
    onError: (e: any) => message.error(e?.message ?? '保存失败'),
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isNew ? '新增小测题' : '编辑小测题'}
      width={560}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saveMut.isPending} onClick={() => form.submit()}>保存</Button>
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)}>
        <Form.Item name="question" label="题干" rules={[{ required: true }]}>
          <Input.TextArea rows={2} maxLength={300} showCount />
        </Form.Item>
        <Form.Item label="选项（点选正确答案）" required>
          <Form.Item name="correctIndex" noStyle>
            <Radio.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {[0, 1, 2, 3].map((ci) => (
                  <Space key={ci} style={{ width: '100%' }} align="center">
                    <Radio value={ci}>{String.fromCharCode(65 + ci)}</Radio>
                    <Form.Item
                      name={['choices', ci]}
                      noStyle
                      rules={[{ required: true, message: '选项不能为空' }]}
                    >
                      <Input style={{ width: 380 }} maxLength={120} placeholder={`选项 ${String.fromCharCode(65 + ci)}`} />
                    </Form.Item>
                  </Space>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form.Item>
        <Space size="large" align="start">
          <Form.Item name="difficulty" label="难度">
            <Select style={{ width: 120 }} options={[
              { value: 'L1', label: 'L1 启蒙' },
              { value: 'L2', label: 'L2 探索' },
              { value: 'L3', label: 'L3 深化' },
            ]} />
          </Form.Item>
        </Space>
        <Form.Item name="explanation" label="答案解析（答题后展示）">
          <Input.TextArea rows={2} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ════════════════════════════════════════════════════
//   知识网络关联 Tab
// ════════════════════════════════════════════════════
function RelationsTab({ kpId }: { kpId: string }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: allKps = [] } = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
  });
  const { data: relations, isLoading } = useQuery({
    queryKey: ['admin', 'kp-relations', kpId],
    queryFn: () => kpRelationsApi.get(kpId),
  });

  useEffect(() => {
    if (relations) setSelectedIds(relations.relatedIds);
  }, [relations]);

  const saveMut = useMutation({
    mutationFn: () => kpRelationsApi.set(kpId, selectedIds),
    onSuccess: () => {
      message.success('知识网络关联已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'kp-relations', kpId] });
    },
    onError: (e: any) => message.error(e?.message ?? '保存失败'),
  });

  const options = allKps
    .filter((k) => k.id !== kpId)
    .map((k) => ({
      value: k.id,
      label: `${k.name}（${SUBJECT_LABEL[k.subject] ?? k.subject} · ${k.difficulty}）`,
    }));

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        关联的知识点会在用户端知识网络中以连线呈现，并出现在「相关知识点」推荐里。
      </Typography.Paragraph>
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder="选择相关知识点"
        loading={isLoading}
        value={selectedIds}
        onChange={setSelectedIds}
        options={options}
        optionFilterProp="label"
        maxTagCount="responsive"
      />
      <Button
        type="primary"
        size="small"
        style={{ marginTop: 12 }}
        loading={saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        保存关联（{selectedIds.length}）
      </Button>
    </div>
  );
}
