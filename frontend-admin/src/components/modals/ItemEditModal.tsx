/**
 * 物品编辑弹窗
 * Tab：
 *   1. 基础信息（无一物三看，那个属于知识点）
 *   2. 图片信息（图标 + 渲染图，图标使用 iconUrl 字段并回显）
 *   3. 爆炸图（COZE 风格工作流编辑器）
 *   4. 视频（COZE 风格工作流编辑器）
 *   5. 知识点（关联知识点列表 + 一键从爆炸图工作流生成）
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Form, Input, Modal, Select, Space, Tabs, Tag, Typography, message, Empty,
} from 'antd';
import { PlusOutlined, BookOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi, scenesApi, knowledgeApi, type ItemListItem } from '@/api/content';
import { sceneGroupsApi } from '@/api/scene-groups';
import { AiGenerationPanel } from '@/components/ai/AiGenerationPanel';
import { WorkflowBuilder, type WorkflowNode } from '@/components/workflow/WorkflowBuilder';
import { KnowledgePointEditModal } from '@/components/modals/KnowledgePointEditModal';

interface ItemEditModalProps {
  open: boolean;
  item?: ItemListItem | null;
  defaultSceneId?: string;
  onClose: () => void;
}

const ICON_PROMPT_TPL =
  '简笔卡通风格的{name}图标，圆润可爱，纯色填充，白色背景，居中构图，扁平化设计';
const RENDER_PROMPT_TPL =
  '高清渲染图风格的{name}，工业产品质感，白色透明背景，正面视角，清晰光照，无阴影，PNG透明';

function fill(tpl: string, name: string) {
  return tpl.replace(/{name}/g, name || '物品');
}

export function ItemEditModal({ open, item, defaultSceneId, onClose }: ItemEditModalProps) {
  const isNew = !item;
  const qc = useQueryClient();
  const [form] = Form.useForm();

  // 图片资源
  const [iconUrl, setIconUrl]               = useState<string | null>(null);
  const [itemImageUrl, setItemImageUrl]     = useState<string | null>(null);
  const [explodedImageUrl, setExplodedImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl]             = useState<string | null>(null);

  // 提示词
  const [iconPrompt, setIconPrompt]         = useState('');
  const [imagePrompt, setImagePrompt]       = useState('');

  // 工作流
  const [explodedWorkflow, setExplodedWorkflow] = useState<WorkflowNode[]>([]);
  const [videoWorkflow, setVideoWorkflow]       = useState<WorkflowNode[]>([]);

  // 知识点弹窗
  const [kpModal, setKpModal] = useState<{ open: boolean; kp?: any }>({ open: false });

  // 数据
  const { data: scenes = [] } = useQuery({
    queryKey: ['admin', 'scenes', {}],
    queryFn: () => scenesApi.list(),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ['admin', 'scene-groups'],
    queryFn: () => sceneGroupsApi.list(),
  });
  const { data: itemDetail } = useQuery({
    queryKey: ['admin', 'item', item?.id],
    queryFn: () => itemsApi.detail(item!.id),
    enabled: !!item?.id && open,
  });
  const { data: allKps = [] } = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
    enabled: open,
  });

  // 当前物品关联的知识点
  const linkedKps = (itemDetail as any)?.knowledgePoints
    ?.map((rel: any) => allKps.find(k => k.id === rel.knowledgePointId))
    .filter(Boolean) ?? [];

  // 场景下拉（按一级分组）
  const sceneOptions = groups.map(g => ({
    label: g.name,
    options: scenes
      .filter(s => s.sceneGroupId === g.id)
      .map(s => ({ value: s.id, label: s.name })),
  }));

  useEffect(() => {
    if (!open) return;
    const data = itemDetail ?? item;
    if (data) {
      form.setFieldsValue({
        slug: data.slug,
        name: data.name,
        sceneId: data.sceneId ?? defaultSceneId,
        shortDesc: data.shortDesc,
        videoTitle: (data as any).videoTitle ?? null,
        videoDurationSec: (data as any).videoDurationSec ?? null,
      });
      setIconUrl((data as any).iconUrl ?? null);
      setItemImageUrl((data as any).itemImageUrl ?? (data as any).coverUrl ?? null);
      setExplodedImageUrl((data as any).explodedImageUrl ?? null);
      setVideoUrl((data as any).principleVideoUrl ?? null);
      // parts JSON 复用为 explodedWorkflow.annotate 节点
      const partsArr = (data as any).parts ?? [];
      setExplodedWorkflow(restoreWorkflowFromParts(partsArr));
      setVideoWorkflow([]);
      const nm = data.name;
      setIconPrompt(fill(ICON_PROMPT_TPL, nm));
      setImagePrompt(fill(RENDER_PROMPT_TPL, nm));
    } else {
      form.resetFields();
      form.setFieldsValue({ sceneId: defaultSceneId });
      setIconUrl(null);
      setItemImageUrl(null);
      setExplodedImageUrl(null);
      setVideoUrl(null);
      setExplodedWorkflow([]);
      setVideoWorkflow([]);
      setIconPrompt(fill(ICON_PROMPT_TPL, ''));
      setImagePrompt(fill(RENDER_PROMPT_TPL, ''));
    }
  }, [open, item, itemDetail, defaultSceneId, form]);

  const watchedName = Form.useWatch('name', form);
  useEffect(() => {
    if (isNew && watchedName) {
      setIconPrompt(fill(ICON_PROMPT_TPL, watchedName));
      setImagePrompt(fill(RENDER_PROMPT_TPL, watchedName));
    }
  }, [watchedName, isNew]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const partsFromWorkflow = explodedWorkflow.find(n => n.type === 'annotate')?.config?.parts ?? [];
      const payload: any = {
        slug: values.slug,
        name: values.name,
        sceneId: values.sceneId,
        shortDesc: values.shortDesc,
        iconUrl,
        coverUrl: itemImageUrl,
        itemImageUrl,
        explodedImageUrl,
        principleVideoUrl: videoUrl,
        videoTitle: values.videoTitle?.trim() ? values.videoTitle.trim() : null,
        videoDurationSec: values.videoDurationSec ? Number(values.videoDurationSec) : null,
        parts: partsFromWorkflow.length > 0 ? partsFromWorkflow : null,
      };
      if (isNew) return itemsApi.create(payload);
      return itemsApi.update(item!.id, payload);
    },
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
      qc.invalidateQueries({ queryKey: ['admin', 'item', item?.id] });
      onClose();
    },
  });

  // ─── 爆炸图工作流"执行" → 把所有 annotate 部件批量生成知识点 ───
  const runExplodedWorkflowMut = useMutation({
    mutationFn: async () => {
      const annotateNode = explodedWorkflow.find(n => n.type === 'annotate');
      const extractNode  = explodedWorkflow.find(n => n.type === 'extract_kp');
      const parts: any[] = annotateNode?.config?.parts ?? [];
      if (parts.length === 0) {
        throw new Error('请先在「部件标注」节点添加部件');
      }
      const subject    = extractNode?.config?.subject    ?? 'PHYSICS';
      const difficulty = extractNode?.config?.difficulty ?? 'L1';

      const itemName = form.getFieldValue('name') ?? item?.name ?? '物品';
      const created: any[] = [];
      for (const part of parts) {
        if (!part.name?.trim()) continue;
        const slug = `${(item?.slug ?? 'item')}-${part.no}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const kp = await knowledgeApi.create({
          slug,
          name: `${itemName}·${part.name}`,
          subject,
          difficulty,
          summary: (part.desc ?? '').slice(0, 200),
          content: `# ${part.name}\n\n${part.desc ?? ''}\n\n（由爆炸图工作流自动生成，请补充详细内容。）`,
          itemIds: item?.id ? [item.id] : [],
        } as any);
        created.push(kp);
      }
      return created;
    },
    onSuccess: (created) => {
      message.success(`工作流完成：生成了 ${created.length} 个知识点，请到「知识点」标签查看`);
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'item', item?.id] });
    },
    onError: (e: any) => message.error(e?.message ?? '工作流执行失败'),
  });

  // ─── 视频工作流"执行" → 创建 1 个知识点草稿 ───
  const runVideoWorkflowMut = useMutation({
    mutationFn: async () => {
      const extractNode  = videoWorkflow.find(n => n.type === 'extract_kp');
      const promptNode   = videoWorkflow.find(n => n.type === 'prompt');
      const itemName = form.getFieldValue('name') ?? item?.name ?? '物品';
      const slug = `${(item?.slug ?? 'item')}-video-kp`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      return knowledgeApi.create({
        slug,
        name: `${itemName}·原理视频`,
        subject: extractNode?.config?.subject ?? 'PHYSICS',
        difficulty: extractNode?.config?.difficulty ?? 'L1',
        summary: (promptNode?.config?.text ?? `${itemName} 的原理介绍`).slice(0, 200),
        content: `# ${itemName} 原理\n\n${promptNode?.config?.text ?? ''}\n\n（由视频工作流自动生成）`,
        videoUrl,
        itemIds: item?.id ? [item.id] : [],
      } as any);
    },
    onSuccess: () => {
      message.success('工作流完成：已生成 1 个知识点');
      qc.invalidateQueries({ queryKey: ['admin', 'kps'] });
      qc.invalidateQueries({ queryKey: ['admin', 'item', item?.id] });
    },
    onError: (e: any) => message.error(e?.message ?? '工作流执行失败'),
  });

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={isNew ? '新建物品' : `编辑 · ${item?.name}`}
        width={880}
        footer={
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" loading={saveMut.isPending} onClick={() => form.submit()}>保存</Button>
          </Space>
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)} style={{ marginTop: 8 }}>
          <Tabs
            items={[
              // ─── 1. 基础信息 ───
              {
                key: 'basic',
                label: '基础信息',
                children: (
                  <>
                    <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                      <Input placeholder="如：微波炉" />
                    </Form.Item>
                    <Form.Item
                      name="slug"
                      label="Slug"
                      rules={[
                        { required: true },
                        { pattern: /^[a-z0-9-]+$/, message: '仅小写字母、数字、短横线' },
                      ]}
                    >
                      <Input placeholder="如：microwave" />
                    </Form.Item>
                    <Form.Item name="sceneId" label="所属场景" rules={[{ required: true }]}>
                      <Select placeholder="选择场景" options={sceneOptions} />
                    </Form.Item>
                    <Form.Item name="shortDesc" label="一句话简介" rules={[{ required: true }]}>
                      <Input placeholder="如：发出看不见的「波」让食物变热" maxLength={120} />
                    </Form.Item>
                    <Alert
                      type="info"
                      showIcon
                      message="一物三看（L1/L2/L3）按难度分级的内容由对应难度的知识点承担，不再在物品层级编辑。"
                      style={{ fontSize: 12 }}
                    />
                  </>
                ),
              },

              // ─── 2. 图片信息 ───
              {
                key: 'image',
                label: '图片信息',
                children: (
                  <>
                    <Card size="small" title="物品图标" style={{ marginBottom: 16 }}>
                      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                        简笔卡通图标，用于知识点详情等紧凑预览
                      </Typography.Paragraph>
                      <AiGenerationPanel
                        entityType="item"
                        entityId={item?.id}
                        purpose="item-icon"
                        prompt={iconPrompt}
                        onPromptChange={setIconPrompt}
                        value={iconUrl}
                        onChange={setIconUrl}
                        label="图标"
                        previewHeight={160}
                      />
                    </Card>
                    <Card size="small" title="物品渲染图">
                      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                        白底/透明 PNG，用于场景内贴图与物品详情主图
                      </Typography.Paragraph>
                      <AiGenerationPanel
                        entityType="item"
                        entityId={item?.id}
                        purpose="item-image"
                        prompt={imagePrompt}
                        onPromptChange={setImagePrompt}
                        value={itemImageUrl}
                        onChange={setItemImageUrl}
                        label="渲染图"
                        previewHeight={200}
                      />
                    </Card>
                  </>
                ),
              },

              // ─── 3. 爆炸图工作流 ───
              {
                key: 'exploded',
                label: '爆炸图',
                children: (
                  <>
                    <Alert
                      type="info" showIcon style={{ marginBottom: 12 }}
                      message="可视化工作流：左侧添加节点构建流程，参考图 → 提示词 → 模型 → 生成 → 部件标注 → 提取知识点"
                    />
                    <WorkflowBuilder
                      scene="exploded"
                      nodes={explodedWorkflow}
                      onChange={setExplodedWorkflow}
                      onRun={() => runExplodedWorkflowMut.mutate()}
                    />
                    {explodedImageUrl && (
                      <div style={{ marginTop: 12, padding: 8, background: '#f6ffed', borderRadius: 6 }}>
                        <Typography.Text style={{ fontSize: 12 }}>
                          当前爆炸图：<a href={explodedImageUrl} target="_blank" rel="noreferrer">查看</a>
                        </Typography.Text>
                      </div>
                    )}
                  </>
                ),
              },

              // ─── 4. 视频工作流 ───
              {
                key: 'video',
                label: '视频',
                children: (
                  <>
                    <Card size="small" title="视频信息" style={{ marginBottom: 12 }}>
                      <Form.Item name="videoTitle" label="视频标题" style={{ marginBottom: 12 }}>
                        <Input placeholder="如：微波炉是怎么把食物加热的？" maxLength={60} />
                      </Form.Item>
                      <Space size="large" align="start">
                        <Form.Item name="videoDurationSec" label="时长（秒）" style={{ marginBottom: 0 }}>
                          <Input type="number" min={0} style={{ width: 140 }} placeholder="如：180" />
                        </Form.Item>
                        <Form.Item label="视频 URL" style={{ marginBottom: 0 }}>
                          <Input
                            style={{ width: 360 }}
                            placeholder="https://... 或 /uploads/..."
                            value={videoUrl ?? ''}
                            onChange={(e) => setVideoUrl(e.target.value || null)}
                          />
                        </Form.Item>
                      </Space>
                      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                        时长用于用户端展示与探索度计算（视频观看占物品进度 50%），URL 为空时用户端播放演示视频。
                      </Typography.Paragraph>
                    </Card>
                    <Alert
                      type="info" showIcon style={{ marginBottom: 12 }}
                      message="可视化工作流：参考图 → 提示词 → 模型 → 生成视频 → 提取知识点"
                    />
                    <WorkflowBuilder
                      scene="video"
                      nodes={videoWorkflow}
                      onChange={setVideoWorkflow}
                      onRun={() => runVideoWorkflowMut.mutate()}
                    />
                    {videoUrl && (
                      <div style={{ marginTop: 12, padding: 8, background: '#f6ffed', borderRadius: 6 }}>
                        <Typography.Text style={{ fontSize: 12 }}>
                          当前视频：<a href={videoUrl} target="_blank" rel="noreferrer">查看</a>
                        </Typography.Text>
                      </div>
                    )}
                  </>
                ),
              },

              // ─── 5. 知识点 ───
              {
                key: 'knowledge',
                label: <span>知识点 <Tag style={{ marginLeft: 4, fontSize: 11 }}>{linkedKps.length}</Tag></span>,
                children: (
                  <>
                    <Alert
                      type="info" showIcon style={{ marginBottom: 12 }}
                      message="此处列出当前物品关联的所有知识点。爆炸图工作流执行后会自动生成知识点草稿，可在此进一步编辑。"
                    />
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        icon={<PlusOutlined />}
                        onClick={() => setKpModal({ open: true, kp: null })}
                      >
                        手动新建知识点
                      </Button>
                      <Button
                        icon={<ThunderboltOutlined />}
                        onClick={() => runExplodedWorkflowMut.mutate()}
                        loading={runExplodedWorkflowMut.isPending}
                        disabled={!explodedWorkflow.find(n => n.type === 'annotate')?.config?.parts?.length}
                      >
                        从爆炸图工作流生成
                      </Button>
                    </Space>
                    {linkedKps.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联知识点" />
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {linkedKps.map((kp: any) => (
                          <Card
                            key={kp.id}
                            size="small"
                            hoverable
                            onClick={() => setKpModal({ open: true, kp })}
                          >
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Space size={4}>
                                <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>{kp.subject}</Tag>
                                <Tag style={{ margin: 0, fontSize: 10 }}>{kp.difficulty}</Tag>
                              </Space>
                              <Typography.Text strong style={{ fontSize: 13 }}>
                                <BookOutlined style={{ color: '#722ed1', marginRight: 4 }} />
                                {kp.name}
                              </Typography.Text>
                              {kp.summary && (
                                <Typography.Paragraph
                                  type="secondary"
                                  style={{ fontSize: 11, marginBottom: 0 }}
                                  ellipsis={{ rows: 2 }}
                                >
                                  {kp.summary}
                                </Typography.Paragraph>
                              )}
                              <div style={{ marginTop: 4 }}>
                                <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); setKpModal({ open: true, kp }); }}>
                                  编辑
                                </Button>
                              </div>
                            </Space>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>

      {/* 知识点编辑 */}
      <KnowledgePointEditModal
        open={kpModal.open}
        kp={kpModal.kp}
        onClose={() => setKpModal({ open: false })}
      />
    </>
  );
}

// ─── 工具：从老版 parts JSON 恢复成 workflow 节点 ───
function restoreWorkflowFromParts(parts: any[]): WorkflowNode[] {
  if (!parts || parts.length === 0) return [];
  return [
    {
      id: 'restored_annotate',
      type: 'annotate',
      config: { parts },
    },
  ];
}
