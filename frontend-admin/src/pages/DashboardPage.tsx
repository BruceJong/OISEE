import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { scenesApi, itemsApi, knowledgeApi } from '@/api/content';

export function DashboardPage() {
  const scenes = useQuery({ queryKey: ['admin', 'scenes', {}], queryFn: () => scenesApi.list() });
  const items = useQuery({ queryKey: ['admin', 'items', {}], queryFn: () => itemsApi.list() });
  const kps = useQuery({
    queryKey: ['admin', 'kps', {}],
    queryFn: () => knowledgeApi.list(),
  });

  const stat = (data?: any[], status?: string) =>
    data?.filter((d) => (status ? d.status === status : true)).length ?? 0;

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        仪表盘
      </Typography.Title>
      <Typography.Paragraph type="secondary">内容生产概览</Typography.Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="场景总数"
              value={stat(scenes.data)}
              suffix={`/ 已发布 ${stat(scenes.data, 'PUBLISHED')}`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="物品总数"
              value={stat(items.data)}
              suffix={`/ 已发布 ${stat(items.data, 'PUBLISHED')}`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="知识点总数"
              value={stat(kps.data)}
              suffix={`/ 已发布 ${stat(kps.data, 'PUBLISHED')}`}
            />
          </Card>
        </Col>
      </Row>

      <Card title="使用指南" style={{ marginTop: 24 }}>
        <Typography.Paragraph>
          1. 在 <b>场景管理</b> 创建场景（如"厨房"、"客厅"）
        </Typography.Paragraph>
        <Typography.Paragraph>
          2. 在 <b>物品管理</b> 创建物品并关联到场景
        </Typography.Paragraph>
        <Typography.Paragraph>
          3. 在 <b>知识点管理</b> 创建知识点并关联到物品
        </Typography.Paragraph>
        <Typography.Paragraph>
          4. 把场景、物品、知识点 <b>发布</b>，用户网站立即可见
        </Typography.Paragraph>
        <Typography.Paragraph>
          5. 切换到{' '}
          <a href="http://localhost:5173" target="_blank" rel="noreferrer">
            http://localhost:5173
          </a>{' '}
          查看用户端效果
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
