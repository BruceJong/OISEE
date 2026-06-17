/**
 * 世界地图编辑弹窗
 * 一级场景共用同一张地图背景；此弹窗负责生成/上传该地图。
 * 各一级场景的位置标记通过各自的编辑弹窗设置，此处仅展示总览。
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Space,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { AiGenerationPanel } from '@/components/ai/AiGenerationPanel';
import type { SceneGroup } from '@/api/scene-groups';

interface WorldMapEditModalProps {
  open: boolean;
  onClose: () => void;
  sceneGroups: SceneGroup[];
}

const DEFAULT_MAP_PROMPT =
  '儿童科普插画风格，俯视角度2.5D等距城市地图，包含家园、学校、公园、医院、超市、商场、游乐场等区域，色彩鲜明活泼，可爱卡通风格，高清，白色背景';

/**
 * 用户端当前正在使用的地图（硬编码在 ScenesMapPage.tsx）
 * 当管理员还没在 settings 里设置 world_map 时，回退到这张图
 */
const FALLBACK_MAP_URL = '/uploads/home/map-v11.png';

export function WorldMapEditModal({ open, onClose, sceneGroups }: WorldMapEditModalProps) {
  const qc = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState(DEFAULT_MAP_PROMPT);

  // 加载已保存的世界地图设置
  const { data: worldMapSetting } = useQuery({
    queryKey: ['settings', 'world_map'],
    queryFn: () => settingsApi.get('world_map'),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      const saved = worldMapSetting as any;
      // 已存设置 → 用存的；否则回退到用户端在用的地图
      setImageUrl(saved?.imageUrl ?? FALLBACK_MAP_URL);
      setImagePrompt(saved?.imagePrompt ?? DEFAULT_MAP_PROMPT);
    }
  }, [open, worldMapSetting]);

  const saveMut = useMutation({
    mutationFn: () =>
      settingsApi.set('world_map', { imageUrl, imagePrompt }),
    onSuccess: () => {
      message.success('世界地图已保存');
      qc.invalidateQueries({ queryKey: ['settings', 'world_map'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
      onClose();
    },
  });

  // sceneGroups 字段保留 prop，未来扩展可用
  void sceneGroups;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="编辑世界地图"
      width={760}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
            保存
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
        所有一级场景共用此地图。生成或上传后，在各一级场景的「地图位置」标签中标记具体坐标。
      </Typography.Text>

      <AiGenerationPanel
        entityType="world"
        entityId="world_map"
        purpose="map_image"
        prompt={imagePrompt}
        onPromptChange={setImagePrompt}
        value={imageUrl}
        onChange={setImageUrl}
        label="世界地图"
        previewHeight={320}
      />
    </Modal>
  );
}
