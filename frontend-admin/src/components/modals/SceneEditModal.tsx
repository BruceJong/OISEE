import { useEffect, useState } from 'react';
import {
  Button, Form, Input, Modal, Select, Space, Switch, Tabs, message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scenesApi, type SceneListItem } from '@/api/content';
import { sceneGroupsApi, type SceneGroup } from '@/api/scene-groups';
import { AiGenerationPanel } from '@/components/ai/AiGenerationPanel';

interface SceneEditModalProps {
  open: boolean;
  scene?: SceneListItem | null;
  defaultGroupId?: string;
  allGroups?: SceneGroup[];
  onClose: () => void;
}

/**
 * 为指定二级场景生成默认 AI 提示词。
 * 使用场景名 + 所属一级场景拼出更"贴身"的描述。
 * 用户保存后会持久化到 scene.sceneImagePrompt，下次打开优先用保存的。
 */
function buildDefaultPrompt(sceneName: string, groupName?: string) {
  const base = sceneName || '场景';
  const ctx = groupName ? `${groupName}内的${base}` : base;
  return `儿童科普插画风格的${ctx}，2.5D等距俯视角，色彩明亮活泼，可爱卡通画风。展现该场景的典型物品布局（如${base}里常见的物体），细节丰富，构图清晰，白色背景，高清PNG，适合6-12岁儿童`;
}

export function SceneEditModal({
  open, scene, defaultGroupId, allGroups = [], onClose,
}: SceneEditModalProps) {
  const isNew = !scene;
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [sceneImagePrompt, setSceneImagePrompt] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const { data: groups = allGroups } = useQuery({
    queryKey: ['admin', 'scene-groups'],
    queryFn: () => sceneGroupsApi.list(),
    initialData: allGroups.length > 0 ? allGroups : undefined,
  });

  const selectedGroupId = Form.useWatch('sceneGroupId', form) ?? defaultGroupId;
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // 当前场景的所有兄弟场景（用于解锁条件）
  // —— 二级场景的解锁前置 = 同一级场景下的其他二级场景 ——
  const siblingScenes = scene?.sceneGroupId
    ? [] // 同组兄弟见下方动态查询
    : [];

  const { data: sceneList = [] } = useQuery({
    queryKey: ['admin', 'scenes', { sceneGroupId: selectedGroupId }],
    queryFn: () => scenesApi.list(),
    enabled: open,
  });
  const sameGroupScenes = sceneList.filter(
    s => s.sceneGroupId === selectedGroupId && s.id !== scene?.id
  );

  useEffect(() => {
    if (open) {
      if (scene) {
        const groupName = groups.find(g => g.id === scene.sceneGroupId)?.name;
        form.setFieldsValue({
          ...scene,
          sceneGroupId: scene.sceneGroupId ?? defaultGroupId,
          unlockSceneIds: scene.unlockConditions?.groupIds ?? [],
        });
        setSceneImageUrl(scene.sceneImageUrl ?? null);
        setSceneImagePrompt(
          scene.sceneImagePrompt ?? buildDefaultPrompt(scene.name, groupName)
        );
        setIsLocked(!!scene.isLocked);
      } else {
        form.resetFields();
        form.setFieldsValue({ sceneGroupId: defaultGroupId });
        setSceneImageUrl(null);
        setSceneImagePrompt('');
        setIsLocked(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scene, defaultGroupId, form]);

  // 名称或所属一级场景变化时，新建模式下自动重算默认提示词
  const watchedName = Form.useWatch('name', form);
  useEffect(() => {
    if (isNew && watchedName) {
      setSceneImagePrompt(buildDefaultPrompt(watchedName, selectedGroup?.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedName, selectedGroup?.name, isNew]);

  const saveMut = useMutation({
    mutationFn: async (values: any) => {
      const groupSlug = groups.find(g => g.id === values.sceneGroupId)?.slug;
      const payload: any = {
        slug: values.slug,
        name: values.name,
        sceneGroupId: values.sceneGroupId ?? null,
        groupName: groupSlug ?? values.groupName ?? '',
        description: values.description ?? null,
        sceneImageUrl,
        sceneImagePrompt,
        isLocked: !!values.isLocked,
        unlockHint: values.isLocked ? values.unlockHint ?? null : null,
        unlockConditions: values.isLocked && values.unlockSceneIds?.length
          ? { type: 'after_groups', groupIds: values.unlockSceneIds }
          : null,
      };
      // 二级场景不再编辑：默认开放 / 排序 / 地图位置
      if (isNew) return scenesApi.create(payload);
      return scenesApi.update(scene!.id, payload);
    },
    onSuccess: () => {
      message.success('已保存');
      qc.invalidateQueries({ queryKey: ['admin', 'scenes'] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isNew ? '新建二级场景' : `编辑 · ${scene?.name}`}
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
                    <Input placeholder="如：厨房" />
                  </Form.Item>
                  <Form.Item
                    name="slug"
                    label="Slug"
                    rules={[
                      { required: true },
                      { pattern: /^[a-z0-9-]+$/, message: '仅小写字母、数字、短横线' },
                    ]}
                  >
                    <Input placeholder="如：home-kitchen" />
                  </Form.Item>
                  <Form.Item name="sceneGroupId" label="所属一级场景">
                    <Select
                      allowClear
                      placeholder="选择一级场景"
                      options={groups.map(g => ({ value: g.id, label: g.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={2} />
                  </Form.Item>

                  {/* ── 锁定 / 解锁条件 ── */}
                  <Form.Item name="isLocked" label="是否锁定" valuePropName="checked">
                    <Switch onChange={setIsLocked} />
                  </Form.Item>

                  {isLocked && (
                    <>
                      <Form.Item
                        name="unlockSceneIds"
                        label="解锁条件 · 完成下列同组二级场景后解锁"
                      >
                        <Select
                          mode="multiple"
                          placeholder="选择前置二级场景（多选）"
                          options={sameGroupScenes.map(s => ({ value: s.id, label: s.name }))}
                          allowClear
                          onChange={(ids: string[]) => {
                            const names = ids
                              .map(id => sameGroupScenes.find(s => s.id === id)?.name)
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
                          placeholder="如：先探索厨房 80%"
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
              key: 'image',
              label: '场景图片',
              children: (
                <AiGenerationPanel
                  entityType="scene"
                  entityId={scene?.id}
                  purpose="scene_image"
                  prompt={sceneImagePrompt}
                  onPromptChange={setSceneImagePrompt}
                  value={sceneImageUrl}
                  onChange={setSceneImageUrl}
                  label="2.5D 场景大图"
                  previewHeight={240}
                />
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
