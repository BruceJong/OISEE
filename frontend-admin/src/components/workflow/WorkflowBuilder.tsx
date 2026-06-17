/**
 * 简化版 COZE 风格工作流编辑器
 *
 * - 节点上下垂直堆叠（流水线视图）
 * - 节点类型：参考图 / 提示词 / 模型 / 生成 / 部件标注 / 知识点提取
 * - 节点之间用 SVG 箭头连接
 * - 点击节点编辑参数（行内展开）
 * - 工具栏按钮添加新节点
 *
 * 数据结构：{ nodes: WorkflowNode[] }
 * 持久化到 Item.parts JSON（爆炸图）或 Item.videoWorkflow JSON（视频）
 */
import { useState } from 'react';
import { Button, Card, Input, Select, Space, Tag, Typography, Tooltip, message } from 'antd';
import {
  PictureOutlined, EditOutlined, ApiOutlined, ThunderboltOutlined,
  BookOutlined, VideoCameraOutlined, DeleteOutlined, PlusOutlined, ArrowDownOutlined,
  UploadOutlined,
} from '@ant-design/icons';

export type WorkflowNodeType =
  | 'reference'   // 参考图
  | 'prompt'      // 提示词
  | 'model'       // 模型选择
  | 'generate'    // 触发生成
  | 'annotate'    // 部件标注（爆炸图特有）
  | 'extract_kp'  // 知识点提取
  | 'video_gen';  // 视频生成

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  config: Record<string, any>;
}

interface WorkflowBuilderProps {
  /** 工作流场景：'exploded' | 'video' */
  scene: 'exploded' | 'video';
  /** 工作流节点 */
  nodes: WorkflowNode[];
  /** 节点变化回调 */
  onChange: (nodes: WorkflowNode[]) => void;
  /** 触发"执行工作流"按钮 */
  onRun?: () => void;
}

const NODE_META: Record<WorkflowNodeType, {
  icon: React.ReactNode; label: string; color: string;
  scenes: ('exploded' | 'video')[];
  defaultConfig: () => Record<string, any>;
}> = {
  reference: {
    icon: <PictureOutlined />, label: '参考图', color: '#1677ff',
    scenes: ['exploded', 'video'],
    defaultConfig: () => ({ imageUrl: '' }),
  },
  prompt: {
    icon: <EditOutlined />, label: '提示词', color: '#52c41a',
    scenes: ['exploded', 'video'],
    defaultConfig: () => ({ text: '' }),
  },
  model: {
    icon: <ApiOutlined />, label: '模型选择', color: '#722ed1',
    scenes: ['exploded', 'video'],
    defaultConfig: () => ({ modelId: '' }),
  },
  generate: {
    icon: <ThunderboltOutlined />, label: '生成图片', color: '#fa8c16',
    scenes: ['exploded'],
    defaultConfig: () => ({ output: null }),
  },
  video_gen: {
    icon: <VideoCameraOutlined />, label: '生成视频', color: '#fa8c16',
    scenes: ['video'],
    defaultConfig: () => ({ output: null, duration: 15 }),
  },
  annotate: {
    icon: <EditOutlined />, label: '部件标注', color: '#13c2c2',
    scenes: ['exploded'],
    defaultConfig: () => ({ parts: [] as Array<{ no: string; name: string; desc: string }> }),
  },
  extract_kp: {
    icon: <BookOutlined />, label: '提取知识点', color: '#eb2f96',
    scenes: ['exploded', 'video'],
    defaultConfig: () => ({ subject: 'PHYSICS', difficulty: 'L1' }),
  },
};

export function WorkflowBuilder({ scene, nodes, onChange, onRun }: WorkflowBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addNode(type: WorkflowNodeType) {
    const meta = NODE_META[type];
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const next = [...nodes, { id, type, config: meta.defaultConfig() }];
    onChange(next);
    setExpandedId(id);
  }

  function updateNode(id: string, patch: Partial<WorkflowNode>) {
    onChange(nodes.map(n => (n.id === id ? { ...n, ...patch } : n)));
  }

  function updateConfig(id: string, key: string, value: any) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    updateNode(id, { config: { ...node.config, [key]: value } });
  }

  function removeNode(id: string) {
    onChange(nodes.filter(n => n.id !== id));
  }

  function moveNode(id: string, dir: -1 | 1) {
    const idx = nodes.findIndex(n => n.id === id);
    if (idx < 0) return;
    const next = [...nodes];
    const target = idx + dir;
    if (target < 0 || target >= nodes.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    onChange(next);
  }

  // 工具栏：只展示当前 scene 支持的节点类型
  const toolbarTypes = (Object.keys(NODE_META) as WorkflowNodeType[])
    .filter(t => NODE_META[t].scenes.includes(scene));

  return (
    <div style={{ display: 'flex', gap: 12, minHeight: 320 }}>
      {/* 左侧节点工具栏 */}
      <div
        style={{
          width: 140, flexShrink: 0,
          background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0',
          padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
        }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 11, padding: '4px 6px' }}>
          节点工具栏
        </Typography.Text>
        {toolbarTypes.map(type => {
          const meta = NODE_META[type];
          return (
            <Button
              key={type}
              size="small"
              block
              icon={meta.icon}
              onClick={() => addNode(type)}
              style={{ justifyContent: 'flex-start', borderColor: `${meta.color}55` }}
            >
              {meta.label}
            </Button>
          );
        })}
        <div style={{ flex: 1 }} />
        {onRun && (
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={onRun}
            disabled={nodes.length === 0}
            block
          >
            执行工作流
          </Button>
        )}
      </div>

      {/* 中央画布：垂直流水线 */}
      <div
        style={{
          flex: 1, padding: 16,
          background: 'linear-gradient(180deg, #f6f9ff 0%, #eef3fc 100%)',
          borderRadius: 8, border: '1px dashed #c8d2e0',
          minHeight: 280,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 0,
        }}
      >
        {nodes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '60px 0' }}>
            <PictureOutlined style={{ fontSize: 32, opacity: 0.3 }} />
            <div style={{ marginTop: 12 }}>从左侧工具栏添加节点构建工作流</div>
          </div>
        ) : (
          nodes.map((node, idx) => (
            <div key={node.id} style={{ width: '100%', maxWidth: 480 }}>
              <NodeCard
                node={node}
                expanded={expandedId === node.id}
                onToggle={() => setExpandedId(expandedId === node.id ? null : node.id)}
                onConfigChange={(k, v) => updateConfig(node.id, k, v)}
                onRemove={() => removeNode(node.id)}
                onMoveUp={() => moveNode(node.id, -1)}
                onMoveDown={() => moveNode(node.id, 1)}
                canMoveUp={idx > 0}
                canMoveDown={idx < nodes.length - 1}
              />
              {/* 连线箭头 */}
              {idx < nodes.length - 1 && (
                <div style={{ textAlign: 'center', padding: '6px 0' }}>
                  <ArrowDownOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── 单个节点卡片 ───
function NodeCard({
  node, expanded, onToggle, onConfigChange, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  node: WorkflowNode;
  expanded: boolean;
  onToggle: () => void;
  onConfigChange: (key: string, value: any) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const meta = NODE_META[node.type];
  return (
    <Card
      size="small"
      style={{
        borderColor: meta.color,
        borderWidth: 1.5,
        boxShadow: expanded ? `0 4px 16px ${meta.color}33` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      bodyStyle={{ padding: 10 }}
      title={
        <Space size={6}>
          <span style={{ color: meta.color, fontSize: 14 }}>{meta.icon}</span>
          <span style={{ fontSize: 13 }}>{meta.label}</span>
          <Tag color={meta.color} style={{ margin: 0, fontSize: 10 }}>
            {nodeStatus(node)}
          </Tag>
        </Space>
      }
      extra={
        <Space size={2}>
          <Tooltip title="上移">
            <Button size="small" type="text" disabled={!canMoveUp} onClick={onMoveUp}>↑</Button>
          </Tooltip>
          <Tooltip title="下移">
            <Button size="small" type="text" disabled={!canMoveDown} onClick={onMoveDown}>↓</Button>
          </Tooltip>
          <Tooltip title={expanded ? '收起' : '展开配置'}>
            <Button size="small" type="text" onClick={onToggle}>{expanded ? '收起' : '配置'}</Button>
          </Tooltip>
          <Tooltip title="删除">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
          </Tooltip>
        </Space>
      }
    >
      {expanded && <NodeConfig node={node} onChange={onConfigChange} />}
    </Card>
  );
}

function nodeStatus(node: WorkflowNode) {
  switch (node.type) {
    case 'reference':
      return node.config.imageUrl ? '已设置' : '待配置';
    case 'prompt':
      return node.config.text ? `${(node.config.text as string).slice(0, 8)}…` : '空';
    case 'model':
      return node.config.modelId || '未选';
    case 'generate':
    case 'video_gen':
      return node.config.output ? '已产出' : '待执行';
    case 'annotate':
      return `${node.config.parts?.length ?? 0} 个部件`;
    case 'extract_kp':
      return `${node.config.subject ?? 'PHYSICS'} · ${node.config.difficulty ?? 'L1'}`;
    default:
      return '';
  }
}

// ─── 节点配置 ───
function NodeConfig({ node, onChange }: {
  node: WorkflowNode;
  onChange: (key: string, value: any) => void;
}) {
  if (node.type === 'reference') {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={6}>
        <Input
          placeholder="参考图 URL（可手动粘贴或上传）"
          value={node.config.imageUrl}
          onChange={(e) => onChange('imageUrl', e.target.value)}
          size="small"
        />
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          作为生成时的参考图（如 image-to-image 模式）
        </Typography.Text>
      </Space>
    );
  }
  if (node.type === 'prompt') {
    return (
      <Input.TextArea
        rows={3}
        placeholder="详细描述要生成的内容，例如：微波炉爆炸图，各部件分离展示..."
        value={node.config.text}
        onChange={(e) => onChange('text', e.target.value)}
      />
    );
  }
  if (node.type === 'model') {
    return (
      <Select
        size="small"
        style={{ width: '100%' }}
        placeholder="选择 AI 模型"
        value={node.config.modelId || undefined}
        onChange={(v) => onChange('modelId', v)}
        options={[
          { value: 'dalle3', label: 'DALL·E 3' },
          { value: 'sd_xl', label: 'Stable Diffusion XL' },
          { value: 'tongyi', label: '通义万象' },
        ]}
      />
    );
  }
  if (node.type === 'generate' || node.type === 'video_gen') {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={6}>
        {node.type === 'video_gen' && (
          <Input
            type="number"
            size="small"
            addonBefore="时长(秒)"
            value={node.config.duration ?? 15}
            onChange={(e) => onChange('duration', Number(e.target.value))}
          />
        )}
        {node.config.output ? (
          <div style={{ padding: 8, background: '#f6ffed', borderRadius: 6, fontSize: 12 }}>
            ✓ 已产出：<a href={node.config.output} target="_blank" rel="noreferrer">{node.config.output}</a>
          </div>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            点击"执行工作流"按钮后会调用模型生成
          </Typography.Text>
        )}
      </Space>
    );
  }
  if (node.type === 'annotate') {
    const parts = node.config.parts ?? [];
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={6}>
        {parts.map((p: any, idx: number) => (
          <Space.Compact key={idx} style={{ width: '100%' }}>
            <Input
              size="small"
              placeholder="编号"
              style={{ width: 64 }}
              value={p.no}
              onChange={(e) => {
                const next = [...parts];
                next[idx] = { ...p, no: e.target.value };
                onChange('parts', next);
              }}
            />
            <Input
              size="small"
              placeholder="部件名"
              style={{ width: 120 }}
              value={p.name}
              onChange={(e) => {
                const next = [...parts];
                next[idx] = { ...p, name: e.target.value };
                onChange('parts', next);
              }}
            />
            <Input
              size="small"
              placeholder="描述"
              value={p.desc}
              onChange={(e) => {
                const next = [...parts];
                next[idx] = { ...p, desc: e.target.value };
                onChange('parts', next);
              }}
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onChange('parts', parts.filter((_: any, i: number) => i !== idx))}
            />
          </Space.Compact>
        ))}
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() =>
            onChange('parts', [...parts, { no: `P${parts.length + 1}`, name: '', desc: '' }])
          }
        >
          添加部件
        </Button>
      </Space>
    );
  }
  if (node.type === 'extract_kp') {
    return (
      <Space style={{ width: '100%' }}>
        <Select
          size="small" style={{ width: 130 }}
          value={node.config.subject || 'PHYSICS'}
          onChange={(v) => onChange('subject', v)}
          options={[
            { value: 'PHYSICS', label: '物理' },
            { value: 'CHEMISTRY', label: '化学' },
            { value: 'BIOLOGY', label: '生物' },
            { value: 'GEOGRAPHY', label: '地理' },
            { value: 'OTHER', label: '其他' },
          ]}
        />
        <Select
          size="small" style={{ width: 100 }}
          value={node.config.difficulty || 'L1'}
          onChange={(v) => onChange('difficulty', v)}
          options={[
            { value: 'L1', label: 'L1 启蒙' },
            { value: 'L2', label: 'L2 探索' },
            { value: 'L3', label: 'L3 深化' },
          ]}
        />
      </Space>
    );
  }
  return null;
}
