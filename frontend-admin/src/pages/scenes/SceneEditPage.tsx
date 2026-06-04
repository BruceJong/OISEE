import { useEffect } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { scenesApi } from '@/api/content';
import { ImageUpload } from '@/components/ImageUpload';

export function SceneEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'scene', id],
    queryFn: () => scenesApi.detail(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ...data,
        mapPositionX: data.mapPosition?.x,
        mapPositionY: data.mapPosition?.y,
      });
    }
  }, [data, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        slug: values.slug,
        name: values.name,
        groupName: values.groupName,
        description: values.description ?? null,
        coverUrl: values.coverUrl ?? null,
        sceneImageUrl: values.sceneImageUrl ?? null,
        iconKind: values.iconKind ?? null,
        themeColor: values.themeColor ?? null,
        isDefault: values.isDefault ?? false,
        unlockHint: values.unlockHint ?? null,
        sortOrder: values.sortOrder ?? 0,
        mapPosition:
          values.mapPositionX != null && values.mapPositionY != null
            ? { x: values.mapPositionX, y: values.mapPositionY }
            : null,
      };
      if (isNew) return scenesApi.create(payload);
      return scenesApi.update(id!, payload);
    },
    onSuccess: (res: any) => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
      qc.invalidateQueries({ queryKey: ['admin', 'scene'] });
      if (isNew) navigate(`/scenes/${res.id}`, { replace: true });
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {isNew ? '新建场景' : '编辑场景'}
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate('/scenes')}>返回</Button>
          <Button type="primary" onClick={() => form.submit()} loading={saveMut.isPending}>
            保存
          </Button>
        </Space>
      </Space>

      <Form
        form={form}
        layout="vertical"
        disabled={!isNew && isLoading}
        initialValues={{ isDefault: false, sortOrder: 0 }}
        onFinish={(v) => saveMut.mutate(v)}
      >
        <Card title="基础信息" style={{ marginBottom: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：厨房" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug（URL 标识，小写字母+数字+短横线）"
            rules={[
              { required: true, message: '请输入 slug' },
              { pattern: /^[a-z0-9-]+$/, message: '只允许小写字母、数字、短横线' },
            ]}
          >
            <Input placeholder="如：home-kitchen" />
          </Form.Item>
          <Form.Item
            name="groupName"
            label="分组"
            rules={[{ required: true, message: '请选择分组' }]}
          >
            <Select
              options={[
                { value: '家', label: '家' },
                { value: '校园', label: '校园' },
                { value: '户外', label: '户外' },
                { value: '城市', label: '城市' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="场景简介" />
          </Form.Item>
          <Form.Item name="unlockHint" label="锁定提示文案">
            <Input placeholder="如：完成厨房 80% 探索度" />
          </Form.Item>
        </Card>

        <Card title="视觉资产" style={{ marginBottom: 16 }}>
          <Form.Item name="coverUrl" label="封面图">
            <ImageUpload purpose="scene-cover" />
          </Form.Item>
          <Form.Item name="sceneImageUrl" label="2.5D 大图（场景内背景）">
            <ImageUpload purpose="scene-image" />
          </Form.Item>
        </Card>

        <Card title="地图配置" style={{ marginBottom: 16 }}>
          <Space size="large">
            <Form.Item name="iconKind" label="地图图标样式" style={{ width: 200 }}>
              <Select
                allowClear
                options={[
                  { value: 'home', label: '房子' },
                  { value: 'school', label: '学校' },
                  { value: 'park', label: '公园' },
                  { value: 'hospital', label: '医院' },
                  { value: 'mall', label: '商场' },
                ]}
              />
            </Form.Item>
            <Form.Item name="themeColor" label="主色调" style={{ width: 200 }}>
              <Select
                allowClear
                options={[
                  { value: 'sun', label: '琥珀（sun）' },
                  { value: 'ocean', label: '海蓝（ocean）' },
                  { value: 'leaf', label: '叶绿（leaf）' },
                  { value: 'coral', label: '珊瑚（coral）' },
                  { value: 'berry', label: '紫莓（berry）' },
                ]}
              />
            </Form.Item>
            <Form.Item name="mapPositionX" label="地图 X (0-100)" style={{ width: 140 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mapPositionY" label="地图 Y (0-100)" style={{ width: 140 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Card>

        <Card title="其他">
          <Space size="large">
            <Form.Item name="isDefault" label="默认开放给匿名用户" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序权重">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
        </Card>
      </Form>
    </div>
  );
}
