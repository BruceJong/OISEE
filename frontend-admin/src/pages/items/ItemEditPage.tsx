import { useEffect } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Transfer,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { itemsApi, scenesApi, knowledgeApi } from '@/api/content';
import { ImageUpload } from '@/components/ImageUpload';

export function ItemEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'item', id],
    queryFn: () => itemsApi.detail(id!),
    enabled: !isNew,
  });

  const { data: scenes } = useQuery({
    queryKey: ['admin', 'scenes', {}],
    queryFn: () => scenesApi.list(),
  });

  const { data: allKps } = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ...data,
        L1: data.principleByLevel?.L1 ?? '',
        L2: data.principleByLevel?.L2 ?? '',
        L3: data.principleByLevel?.L3 ?? '',
        knowledgePointIds: data.knowledgePoints?.map((k: any) => k.knowledgePointId) ?? [],
      });
    }
  }, [data, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        slug: values.slug,
        name: values.name,
        sceneId: values.sceneId,
        shortDesc: values.shortDesc,
        coverUrl: values.coverUrl ?? null,
        itemImageUrl: values.itemImageUrl ?? null,
        svgSymbolId: values.svgSymbolId ?? null,
        principleByLevel: {
          L1: values.L1 ?? '',
          L2: values.L2 ?? '',
          L3: values.L3 ?? '',
        },
        videoTitle: values.videoTitle ?? null,
        videoDurationSec: values.videoDurationSec ?? null,
        principleVideoUrl: values.principleVideoUrl ?? null,
        explodedImageUrl: values.explodedImageUrl ?? null,
        sortOrder: values.sortOrder ?? 0,
      };
      // axios 拦截器已解包到 body.data；运行时是 {id,...}，但静态类型仍为 AxiosResponse → cast
      const saved = (isNew ? await itemsApi.create(payload) : await itemsApi.update(id!, payload)) as any;
      if (values.knowledgePointIds) {
        await itemsApi.setKnowledgePoints(saved.id, values.knowledgePointIds);
      }
      return saved;
    },
    onSuccess: (res: any) => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
      qc.invalidateQueries({ queryKey: ['admin', 'item'] });
      if (isNew) navigate(`/items/${res.id}`, { replace: true });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isNew ? '新建物品' : '编辑物品'}
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/items')}>返回</Button>
          <Button type="primary" onClick={() => form.submit()} loading={saveMut.isPending}>
            保存
          </Button>
        </Space>
      </Space>

      <Form
        form={form}
        layout="vertical"
        disabled={!isNew && isLoading}
        initialValues={{ sortOrder: 0 }}
        onFinish={(v) => saveMut.mutate(v)}
      >
        <Card title="基础信息" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：微波炉" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: '请输入 slug' },
              { pattern: /^[a-z0-9-]+$/, message: '只允许小写字母、数字、短横线' },
            ]}
          >
            <Input placeholder="如：microwave" />
          </Form.Item>
          <Form.Item
            name="sceneId"
            label="所属场景"
            rules={[{ required: true, message: '请选择场景' }]}
          >
            <Select
              placeholder="选择场景"
              options={scenes?.map((s) => ({ value: s.id, label: `${s.name}（${s.slug}）` }))}
            />
          </Form.Item>
          <Form.Item
            name="shortDesc"
            label="一句话简介"
            rules={[{ required: true, message: '请输入简介' }]}
          >
            <Input placeholder="如：发出看不见的「波」让食物变热" maxLength={120} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序权重">
            <InputNumber min={0} />
          </Form.Item>
        </Card>

        <Card title="一物三看" style={{ marginBottom: 16 }}>
          <Form.Item name="L1" label="L1 启蒙（现象描述，6-9 岁）">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="L2" label="L2 探索（原理机制，10-13 岁）">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
          <Form.Item name="L3" label="L3 深化（量化学科，14-16 岁）">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
        </Card>

        <Card title="视觉资产" style={{ marginBottom: 16 }}>
          <Form.Item name="coverUrl" label="封面图">
            <ImageUpload purpose="item-cover" />
          </Form.Item>
          <Form.Item name="itemImageUrl" label="透明 PNG（场景内贴图）">
            <ImageUpload purpose="item-image" />
          </Form.Item>
          <Form.Item name="explodedImageUrl" label="爆炸图">
            <ImageUpload purpose="item-exploded" />
          </Form.Item>
          <Form.Item
            name="svgSymbolId"
            label="SVG 兜底模板 ID（图缺失时使用）"
            extra="如 microwave / fridge / kettle（来自原型 SVG 库）"
          >
            <Input placeholder="如：microwave" />
          </Form.Item>
        </Card>

        <Card title="原理视频" style={{ marginBottom: 16 }}>
          <Form.Item name="videoTitle" label="视频标题">
            <Input placeholder="如：微波炉是怎么把食物加热的？" />
          </Form.Item>
          <Form.Item name="videoDurationSec" label="时长（秒）">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="principleVideoUrl" label="视频 URL">
            <Input placeholder="https://..." />
          </Form.Item>
        </Card>

        <Card title="关联知识点">
          <Form.Item name="knowledgePointIds" label="选择已发布或草稿态知识点">
            <KpSelector kps={allKps ?? []} />
          </Form.Item>
        </Card>
      </Form>
    </div>
  );
}

function KpSelector({
  value,
  onChange,
  kps,
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
  kps: any[];
}) {
  return (
    <Transfer
      dataSource={kps.map((k) => ({
        key: k.id,
        title: k.name,
        description: `${k.subject} · ${k.difficulty}`,
      }))}
      targetKeys={value ?? []}
      onChange={(keys) => onChange?.(keys as string[])}
      render={(item) => (
        <span>
          {item.title} <Tag>{item.description}</Tag>
        </span>
      )}
      listStyle={{ width: '46%', height: 320 }}
      titles={['全部知识点', '已选']}
      showSearch
    />
  );
}
