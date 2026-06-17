/**
 * 一级场景编辑弹窗
 * - 基础信息：名称 / Slug / 描述 / 锁定 / 解锁条件
 * - 地图位置：在共享世界地图上点击设置坐标 + 调节可点击半径
 */
import { useEffect, useState } from 'react';
import {
  Button, Form, Input, Modal, Select, Space, Switch, Tabs, Typography, message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sceneGroupsApi, type SceneGroup } from '@/api/scene-groups';
import { settingsApi } from '@/api/settings';
import { MapPositionEditor } from '@/components/ai/MapPositionEditor';

interface SceneGroupEditModalProps {
  open: boolean;
  group?: SceneGroup | null;
  allGroups?: SceneGroup[];
  onClose: () => void;
}

export function SceneGroupEditModal({
  open, group, allGroups = [], onClose,
}: SceneGroupEditModalProps) {
  const isNew = !group;
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [mapPosition, setMapPosition] = useState<{ x: number; y: number; radius?: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const { data: worldMapSetting } = useQuery({
    queryKey: ['settings', 'world_map'],
    queryFn: () => settingsApi.get('world_map'),
    enabled: open,
  });
  const FALLBACK_MAP_URL = '/uploads/home/map-v11.png';
  const worldMapImageUrl = (worldMapSetting as any)?.imageUrl ?? FALLBACK_MAP_URL;

  useEffect(() => {
    if (open) {
      if (group) {
        form.setFieldsValue({
          ...group,
          unlockGroupIds: group.unlockConditions?.groupIds ?? [],
        });
        setMapPosition((group as any).mapPosition ?? null);
        setIsLocked(!!group.isLocked);
      } else {
        form.resetFields();
        setMapPosition(null);
        setIsLocked(false);
      }
    }
  }, [open, group, form]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const payload: any = {
        slug: values.slug,
        name: values.name,
        description: values.description ?? null,
        mapPosition,
        isLocked: !!values.isLocked,
        unlockHint: values.isLocked ? values.unlockHint ?? null : null,
        unlockConditions: values.isLocked && values.unlockGroupIds?.length
          ? { type: 'after_groups', groupIds: values.unlockGroupIds }
          : null,
      };
      if (isNew) return sceneGroupsApi.create(payload);
      return sceneGroupsApi.update(group!.id, payload);
    },
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'scene-groups'] });
      qc.invalidateQueries({ queryKey: ['public', 'scene-groups'] });
      onClose();
    },
  });

  const otherMarkers = allGroups
    .filter((g) => g.id !== group?.id && (g as any).mapPosition)
    .map((g) => {
      const mp = (g as any).mapPosition as any;
      return { id: g.id, x: mp.x, y: mp.y, radius: mp.radius, label: g.name };
    });

  // 可作为"解锁前置"的一级场景（不能是自己）
  const unlockOptions = allGroups
    .filter(g => g.id !== group?.id)
    .map(g => ({ value: g.id, label: g.name }));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isNew ? '新建一级场景' : `编辑 · ${group?.name}`}
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
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <>
                  <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                    <Input placeholder="如：家" />
                  </Form.Item>
                  <Form.Item
                    name="slug"
                    label="Slug"
                    rules={[
                      { required: true },
                      { pattern: /^[a-z0-9-]+$/, message: '仅小写字母、数字、短横线' },
                    ]}
                  >
                    <Input placeholder="如：home" />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={2} placeholder="场景组简介" />
                  </Form.Item>

                  {/* ── 锁定 / 解锁条件 ── */}
                  <Form.Item name="isLocked" label="是否锁定" valuePropName="checked">
                    <Switch onChange={setIsLocked} />
                  </Form.Item>

                  {isLocked && (
                    <>
                      <Form.Item
                        name="unlockGroupIds"
                        label="解锁条件 · 完成下列一级场景后解锁"
                      >
                        <Select
                          mode="multiple"
                          placeholder="选择前置一级场景（多选）"
                          options={unlockOptions}
                          allowClear
                          onChange={(ids: string[]) => {
                            const names = ids
                              .map(id => allGroups.find(g => g.id === id)?.name)
                              .filter(Boolean);
                            if (names.length > 0) {
                              form.setFieldValue(
                                'unlockHint',
                                `完成${names.map(n => `「${n}」`).join('、')}的探索后开放`
                              );
                            }
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name="unlockHint"
                        label="锁定提示文案（可编辑）"
                        rules={[{ required: true, message: '请填写锁定提示' }]}
                        extra="选择解锁条件后自动生成，可手动调整"
                      >
                        <Input.TextArea
                          rows={2}
                          placeholder="如：完成「家」的探索后开放"
                          maxLength={300}
                          showCount
                        />
                      </Form.Item>
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'position',
              label: '地图位置',
              children: (
                <>
                  <Typography.Text
                    type="secondary"
                    style={{ display: 'block', marginBottom: 12, fontSize: 13 }}
                  >
                    点击地图设置「{form.getFieldValue('name') || '该场景'}」位置；拖动 Slider 调整用户端可点击范围。
                  </Typography.Text>
                  <MapPositionEditor
                    mapImageUrl={worldMapImageUrl}
                    value={mapPosition}
                    onChange={setMapPosition}
                    otherMarkers={otherMarkers}
                    currentName={form.getFieldValue('name') || '当前场景'}
                    height={360}
                  />
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
