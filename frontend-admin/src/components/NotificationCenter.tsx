import { useEffect } from 'react';
import {
  Badge,
  Button,
  Empty,
  List,
  Popover,
  Progress,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { aiTasksApi } from '@/api/ai-tasks';
import { useAiTasksStore, getActiveTasks } from '@/stores/ai-tasks';

const PURPOSE_LABEL: Record<string, string> = {
  map_image: '地图图片',
  scene_image: '场景图片',
  cover: '封面图',
  item_image: '场景贴图',
  exploded: '爆炸图',
  illustration: '知识点插图',
  video_cover: '视频封面',
};

const ENTITY_LABEL: Record<string, string> = {
  scene_group: '一级场景',
  scene: '二级场景',
  item: '物品',
  knowledge_point: '知识点',
};

export function NotificationCenter() {
  const { tasks, setTasks, upsertTask, clearDone } = useAiTasksStore();
  const activeCount = getActiveTasks(tasks).length;

  // 轮询最新任务
  const { data: latestTasks } = useQuery({
    queryKey: ['ai-tasks-poll'],
    queryFn: () => aiTasksApi.list({ }),
    refetchInterval: activeCount > 0 ? 2000 : 10000,
    staleTime: 0,
  });

  useEffect(() => {
    if (latestTasks) setTasks(latestTasks);
  }, [latestTasks, setTasks]);

  const content = (
    <div style={{ width: 360 }}>
      <div
        style={{
          padding: '8px 16px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography.Text strong>AI 生成任务</Typography.Text>
        {tasks.length > 0 && (
          <Button
            size="small"
            type="text"
            icon={<ClearOutlined />}
            onClick={clearDone}
          >
            清除已完成
          </Button>
        )}
      </div>
      {tasks.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无任务"
          style={{ padding: '24px 0' }}
        />
      ) : (
        <List
          dataSource={tasks.slice(0, 20)}
          style={{ maxHeight: 440, overflowY: 'auto' }}
          renderItem={(task) => (
            <List.Item
              style={{ padding: '10px 16px', cursor: 'default' }}
              key={task.id}
            >
              <div style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space size={6}>
                    {task.status === 'PENDING' && (
                      <LoadingOutlined style={{ color: '#1677ff' }} />
                    )}
                    {task.status === 'RUNNING' && (
                      <LoadingOutlined spin style={{ color: '#1677ff' }} />
                    )}
                    {task.status === 'DONE' && (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    )}
                    {task.status === 'FAILED' && (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                    <Typography.Text style={{ fontSize: 13 }}>
                      {ENTITY_LABEL[task.entityType] ?? task.entityType}
                      &nbsp;·&nbsp;
                      {PURPOSE_LABEL[task.purpose] ?? task.purpose}
                    </Typography.Text>
                  </Space>
                  <Tag
                    color={
                      task.status === 'DONE'
                        ? 'success'
                        : task.status === 'FAILED'
                        ? 'error'
                        : 'processing'
                    }
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {task.status === 'PENDING'
                      ? '排队'
                      : task.status === 'RUNNING'
                      ? '生成中'
                      : task.status === 'DONE'
                      ? '完成'
                      : '失败'}
                  </Tag>
                </Space>

                {(task.status === 'RUNNING' || task.status === 'PENDING') && (
                  <Progress
                    percent={task.progress}
                    size="small"
                    style={{ marginTop: 6, marginBottom: 0 }}
                    strokeColor={{ '0%': '#1677ff', '100%': '#52c41a' }}
                  />
                )}

                {task.status === 'FAILED' && task.errorMessage && (
                  <Typography.Text
                    type="danger"
                    style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                  >
                    {task.errorMessage}
                  </Typography.Text>
                )}

                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                >
                  模型: {task.modelId} &nbsp;·&nbsp;
                  {new Date(task.createdAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{ padding: 0, borderRadius: 8 }}
    >
      <Badge count={activeCount} size="small">
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 17 }} />}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Badge>
    </Popover>
  );
}
