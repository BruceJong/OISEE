import { useState, useEffect, useMemo } from 'react';
import {
  Button, Card, Collapse, Input, message, Modal, Select, Space, Steps, Switch, Table, Tabs,
  Tag, Typography, Tooltip, Alert,
} from 'antd';
import {
  PlusOutlined, EditOutlined, ApiOutlined, EyeOutlined, EyeInvisibleOutlined,
  ThunderboltOutlined, CheckCircleOutlined, LeftOutlined, RightOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type AiModelConfig, type ModelVariable, type ThinkingModelConfig } from '@/api/settings';
import { aiTasksApi } from '@/api/ai-tasks';

// ────────────────────────────────────────────────────
//   工具：本地变量提取（与后端逻辑一致）
// ────────────────────────────────────────────────────
function extractVariables(template: string): string[] {
  const matches = Array.from((template ?? '').matchAll(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1] as string)));
}

// 默认推断：含 "key" / "token" / "secret" 字样的变量视为敏感
function guessSecret(name: string) {
  return /key|token|secret|password/i.test(name);
}

// 脱敏渲染：sk-abcd1234efgh → sk-a****gh
function maskValue(v: string) {
  if (!v) return '';
  if (v.length <= 8) return v.slice(0, 2) + '****';
  return v.slice(0, 4) + '****' + v.slice(-4);
}

// ════════════════════════════════════════════════════
//   入口
// ════════════════════════════════════════════════════
export function SettingsPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>系统设置</Typography.Title>
      <Tabs
        items={[
          { key: 'models', label: <span><ApiOutlined /> 模型管理</span>, children: <ModelsTab /> },
        ]}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════
//   模型管理列表
// ════════════════════════════════════════════════════
function ModelsTab() {
  const qc = useQueryClient();
  const [editingModel, setEditingModel] = useState<AiModelConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.listAll(),
  });
  const models = settings?.ai_models ?? [];
  const defaultModelId = settings?.ai_default_model ?? '';

  const setDefaultMut = useMutation({
    mutationFn: (id: string) => settingsApi.set('ai_default_model', id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      message.success('默认模型已更新');
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (model: AiModelConfig) => {
      const next = models.map((m) =>
        m.id === model.id ? { ...m, enabled: !m.enabled } : m
      );
      await settingsApi.set('ai_models', next);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const next = models.filter((m) => m.id !== id);
      await settingsApi.set('ai_models', next);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  function openEdit(model?: AiModelConfig) {
    setEditingModel(model ?? null);
    setModalOpen(true);
  }

  const columns = [
    {
      title: '模型名称',
      dataIndex: 'name',
      render: (name: string, row: AiModelConfig) => (
        <Space>
          <span>{name}</span>
          {row.id === defaultModelId && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      render: (v: string) => <Typography.Text code style={{ fontSize: 12 }}>{v}</Typography.Text>,
    },
    {
      title: '模态',
      dataIndex: 'modalType',
      render: (t: string) => {
        const map: Record<string, { color: string; label: string }> = {
          chat:  { color: 'blue',   label: '💬 chat' },
          image: { color: 'green',  label: '🖼️ image' },
          video: { color: 'orange', label: '🎬 video' },
          audio: { color: 'purple', label: '🎵 audio' },
        };
        const m = map[t] ?? { color: 'default', label: t ?? '—' };
        return <Tag color={m.color} style={{ margin: 0, fontSize: 11 }}>{m.label}</Tag>;
      },
    },
    {
      title: '全局变量',
      render: (_: any, row: AiModelConfig) => {
        const arr = Array.isArray(row.variables) ? row.variables : [];
        const globals = arr.filter((v) => !v.isDynamic);
        return <Tag>{globals.length} 个</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      render: (enabled: boolean, row: AiModelConfig) => (
        <Switch
          checked={enabled}
          size="small"
          onChange={() => toggleMut.mutate(row)}
          loading={toggleMut.isPending}
        />
      ),
    },
    {
      title: '操作',
      render: (_: any, row: AiModelConfig) => (
        <Space size={4}>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button
            size="small" type="link"
            disabled={row.id === defaultModelId}
            onClick={() => setDefaultMut.mutate(row.id)}
          >
            设为默认
          </Button>
          <Button size="small" type="link" danger onClick={() => deleteMut.mutate(row.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ThinkingModelCard
        config={settings?.ai_thinking_model}
        onSaved={() => qc.invalidateQueries({ queryKey: ['settings'] })}
      />

      <Card
        title="AI 模型配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => openEdit()}>
            添加模型
          </Button>
        }
      >
        <Table
          dataSource={models}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={false}
        />
      </Card>

      <ModelEditModal
        open={modalOpen}
        editingModel={editingModel}
        existingModels={models}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['settings'] });
          setModalOpen(false);
        }}
      />
    </>
  );
}

// ════════════════════════════════════════════════════
//   内置思考模型卡片
//   「添加模型 → 粘贴示例 → 分析变量」使用的 LLM
//   冷启动默认 DeepSeek v4-pro，可修改 / 恢复默认
// ════════════════════════════════════════════════════
function ThinkingModelCard({
  config, onSaved,
}: {
  config?: ThinkingModelConfig;
  onSaved: () => void;
}) {
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // 后端配置加载后同步到表单
  useEffect(() => {
    if (!config) return;
    setEndpoint(config.endpoint ?? '');
    setModel(config.model ?? '');
    setApiKey(config.apiKey ?? '');
  }, [config]);

  // 与后端已存值比较；config 尚未返回（后端旧版本/加载中）时只要填了内容就允许保存
  const dirty =
    endpoint !== (config?.endpoint ?? '')
    || model !== (config?.model ?? '')
    || apiKey !== (config?.apiKey ?? '');

  const saveMut = useMutation({
    mutationFn: () => {
      if (!endpoint.trim() || !model.trim() || !apiKey.trim()) {
        throw new Error('Endpoint / 模型名 / API Key 均不能为空');
      }
      return settingsApi.set('ai_thinking_model', {
        name: `${model}（思考模型）`,
        endpoint: endpoint.trim(),
        model: model.trim(),
        apiKey: apiKey.trim(),
      });
    },
    onSuccess: () => {
      message.success('思考模型已更新');
      onSaved();
    },
    onError: (e: any) => message.error(e?.message ?? '保存失败'),
  });

  // 置 null → 后端删除记录，恢复内置默认（DeepSeek v4-pro）
  const resetMut = useMutation({
    mutationFn: () => settingsApi.set('ai_thinking_model', null),
    onSuccess: () => {
      message.success('已恢复内置默认（DeepSeek v4-pro）');
      onSaved();
    },
    onError: (e: any) => message.error(e?.message ?? '操作失败'),
  });

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, background: '#fafbff', borderColor: '#d6e4ff' }}
      title={
        <Space>
          <RobotOutlined style={{ color: '#722ed1' }} />
          <span>内置思考模型</span>
          {config && <Tag color="purple" style={{ margin: 0 }}>{config.model}</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button
            size="small"
            loading={resetMut.isPending}
            onClick={() => resetMut.mutate()}
          >
            恢复默认
          </Button>
          <Button
            size="small" type="primary"
            disabled={!dirty}
            loading={saveMut.isPending}
            onClick={() => saveMut.mutate()}
            icon={<CheckCircleOutlined />}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        添加模型时「粘贴示例 → 分析变量」由该模型完成（OpenAI 兼容 chat completions 协议）。
        默认使用 <b>DeepSeek v4-pro</b> 冷启动，可在此修改。
      </Typography.Paragraph>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 280 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Endpoint</label>
          <Input
            size="small"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.deepseek.com/chat/completions"
          />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>模型名</label>
          <Input
            size="small"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="deepseek-v4-pro"
          />
        </div>
        <div style={{ flex: 2, minWidth: 240 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>API Key</label>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="small"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="填写 API Key"
            />
            <Button
              size="small"
              icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowKey(!showKey)}
            />
          </Space.Compact>
          {apiKey && !showKey && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {maskValue(apiKey)}
            </Typography.Text>
          )}
        </div>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════
//   模型编辑弹窗
//   流程：基础信息 → 调用模板 → 变量配置 → 测试调用
// ════════════════════════════════════════════════════
interface ModelEditModalProps {
  open: boolean;
  editingModel: AiModelConfig | null;
  existingModels: AiModelConfig[];
  onClose: () => void;
  onSaved: () => void;
}

function ModelEditModal({ open, editingModel, existingModels, onClose, onSaved }: ModelEditModalProps) {
  const qc = useQueryClient();

  // 当前步骤（0-3）
  const [currentStep, setCurrentStep] = useState(0);
  // 本次弹窗内最近一次成功保存的快照（新建模型「保存并下一步」后用于测试与再次保存）
  const [savedModel, setSavedModel] = useState<AiModelConfig | null>(null);

  // 基础信息
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [modalType, setModalType] = useState<'chat' | 'image' | 'video' | 'audio'>('image');
  const [enabled, setEnabled] = useState(true);

  // 原始调用示例（用户在 Step 2 粘贴的）
  const [rawExample, setRawExample] = useState('');
  // 是否已完成 LLM 分析（决定能否进入 Step 3）
  const [analyzed, setAnalyzed] = useState(false);

  // 模板（由分析自动生成；用户在 Step 3 也可看到/微调）
  const [template, setTemplate] = useState('');
  const [responseImagePath, setResponseImagePath] = useState('data[0].b64_json');
  const [responseImageType, setResponseImageType] =
    useState<'base64' | 'url' | 'binary' | 'text'>('base64');

  // 变量元数据
  const [variables, setVariables] = useState<ModelVariable[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editingModel) {
      setId(editingModel.id);
      setName(editingModel.name);
      setModalType(editingModel.modalType ?? 'image');
      setEnabled(editingModel.enabled);
      setTemplate(editingModel.requestTemplate ?? '');
      setResponseImagePath(editingModel.responseImagePath ?? 'data[0].b64_json');
      setResponseImageType(editingModel.responseImageType ?? 'base64');
      // 编辑现有模型 = 已分析过；rawExample 留空（用户想重新分析时可贴）
      setRawExample('');
      setAnalyzed(!!editingModel.requestTemplate);
      // 兼容老格式
      const raw = editingModel.variables as any;
      if (Array.isArray(raw)) {
        setVariables(raw);
      } else if (raw && typeof raw === 'object') {
        // 老 Record 格式 → 转数组
        setVariables(
          Object.entries(raw).map(([n, val]) => ({
            name: n, isDynamic: false,
            globalValue: val as string,
            isSecret: guessSecret(n),
          }))
        );
      } else {
        setVariables([]);
      }
    } else {
      setId('');
      setName('');
      setModalType('image');
      setEnabled(true);
      setTemplate('');
      setResponseImagePath('data[0].b64_json');
      setResponseImageType('base64');
      setVariables([]);
      setRawExample('');
      setAnalyzed(false);
    }
  }, [open, editingModel]);

  // 模板变化时，同步变量列表（保留已有元数据）
  const detectedVars = useMemo(() => extractVariables(template), [template]);
  useEffect(() => {
    setVariables((prev) => {
      const next: ModelVariable[] = [];
      const seen = new Set<string>();
      for (const n of detectedVars) {
        if (seen.has(n)) continue;
        seen.add(n);
        const exist = prev.find((v) => v.name === n);
        if (exist) {
          next.push(exist);
        } else {
          // 智能默认：只有 prompt 默认动态；其他默认全局；含 key 的默认敏感
          next.push({
            name: n,
            isDynamic: n.toLowerCase() === 'prompt',
            globalValue: '',
            isSecret: guessSecret(n),
          });
        }
      }
      // 同时保留：detectedVars 中没有但元数据里有的（用户可能在编辑模板过程中暂存）
      return next;
    });
  }, [detectedVars.join(',')]);

  function updateVariable(name: string, patch: Partial<ModelVariable>) {
    setVariables((prev) =>
      prev.map((v) => (v.name === name ? { ...v, ...patch } : v))
    );
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!id.trim()) throw new Error('请填写模型 ID');
      if (!name.trim()) throw new Error('请填写模型名称');
      if (!template.trim()) throw new Error('请填写调用模板');
      if (responseImageType !== 'binary' && !responseImagePath.trim()) {
        throw new Error('请填写响应数据路径（在「全局变量」步骤展开「高级」即可填写）');
      }

      // 校验：所有非动态变量必须有 globalValue
      const missing = variables.filter((v) => !v.isDynamic && !v.globalValue);
      if (missing.length > 0) {
        throw new Error(`以下全局变量未填值：${missing.map((m) => m.name).join(', ')}`);
      }

      const payload: AiModelConfig = {
        id, name, modalType, enabled,
        requestTemplate: template,
        responseImagePath, responseImageType,
        variables,
      };

      const current = await settingsApi.get('ai_models') ?? [];
      const arr: AiModelConfig[] = Array.isArray(current) ? current : [];
      // 基准：编辑中的模型 / 本次弹窗已保存过的新模型 —— 避免新建模型二次保存时重复追加
      const baseline = savedModel ?? editingModel;
      const next = baseline && arr.some((m) => m.id === baseline.id)
        ? arr.map((m) => (m.id === baseline.id ? payload : m))
        : [...arr, payload];

      await settingsApi.set('ai_models', next);
      return payload;
    },
    onSuccess: (payload) => {
      setSavedModel(payload);
      qc.invalidateQueries({ queryKey: ['settings'] });
      if (currentStep === 2) {
        // 「保存并下一步」：保存成功后进入测试，不关闭弹窗
        message.success('已保存，进入测试调用');
        setCurrentStep(3);
      } else {
        message.success('已保存');
        onSaved();
      }
    },
    onError: (e: any) => message.error(e?.message ?? '保存失败'),
  });

  // 弹窗打开时重置到第一步
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setSavedModel(null);
    }
  }, [open]);

  // 检查模型 ID 冲突（编辑中 / 已保存过的不算冲突）
  const savedOrEditing = savedModel ?? editingModel;
  const idConflict = !savedOrEditing && existingModels.some((m) => m.id === id);

  // 各步骤的校验
  function validateCurrent(): string | null {
    if (currentStep === 0) {
      if (!id.trim()) return '请填写模型 ID';
      if (!name.trim()) return '请填写模型名称';
      if (idConflict) return '模型 ID 已存在';
      return null;
    }
    if (currentStep === 1) {
      // 下一步要么是「重新分析」(rawExample 非空)，要么是「跳过到 Step 3」(已分析过)
      if (analyzed || rawExample.trim()) return null;
      return '请粘贴调用示例';
    }
    if (currentStep === 2) {
      const missing = variables.filter((v) => !v.isDynamic && !v.globalValue);
      if (missing.length > 0) {
        return `以下全局变量未填值：${missing.map((m) => m.name).join(', ')}`;
      }
      return null;
    }
    return null;
  }

  // LLM 分析示例 → 直接填表并进入 Step 3
  const analyzeMut = useMutation({
    mutationFn: () => aiTasksApi.analyzeExample(rawExample),
    onSuccess: (result) => {
      setTemplate(result.template);
      // chat 模型兜底：分析结果缺类型/路径时按 OpenAI 兼容协议补齐，避免保存被卡
      const isChat = modalType === 'chat';
      const type = isChat && result.responseImageType === 'base64' ? 'text' : result.responseImageType;
      const path = result.responseImagePath
        || (type !== 'binary' && isChat ? 'choices[0].message.content' : '');
      setResponseImagePath(path);
      setResponseImageType(type);
      setVariables(result.variables.map((v) => ({
        name: v.name,
        isDynamic: v.isDynamic,
        globalValue: v.globalValue ?? '',
        isSecret: !!v.isSecret,
      })));
      setAnalyzed(true);
      message.success(`分析完成：识别出 ${result.variables.length} 个变量（${result.variables.filter(v => !v.isDynamic).length} 全局 / ${result.variables.filter(v => v.isDynamic).length} 临时）`);
      setCurrentStep(2);
    },
    onError: (e: any) => message.error(e?.message ?? '分析失败，请重试'),
  });

  function goNext() {
    if (currentStep === 1) {
      // 编辑模式且未填新示例 → 直接进入下一步
      if (analyzed && !rawExample.trim()) {
        setCurrentStep(2);
        return;
      }
      // 否则必须有示例 → 触发分析
      if (!rawExample.trim()) {
        message.error('请先粘贴调用示例');
        return;
      }
      analyzeMut.mutate();
      return;
    }
    const err = validateCurrent();
    if (err) { message.error(err); return; }
    setCurrentStep((s) => Math.min(3, s + 1));
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  // 步骤定义
  const steps = [
    { title: '基础信息',  description: '名称 · 模态' },
    { title: '调用示例',  description: '粘贴 → AI 分析' },
    { title: '全局变量',  description: '填默认值' },
    { title: '测试调用',  description: '临时变量 + 调通' },
  ];

  // 渲染当前步骤
  function renderStep() {
    if (currentStep === 0) {
      return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="info" showIcon
            message="第一步：填入模型的基础信息（仅用于在系统内识别此模型）"
          />
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              模型名称<span style={{ color: 'red' }}> *</span>
            </label>
            <Input
              placeholder="如：DALL·E 3 / 通义万象"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="large"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              模型 ID（唯一标识）<span style={{ color: 'red' }}> *</span>
            </label>
            <Input
              placeholder="如：dalle3（小写字母+数字+下划线）"
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={!!savedOrEditing}
              size="large"
            />
            {idConflict && (
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                ID 已存在
              </Typography.Text>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>
              模态类型<span style={{ color: 'red' }}> *</span>
            </label>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={modalType}
              onChange={(v) => {
                setModalType(v);
                // 联动：chat 模型默认 text 响应；image 默认 base64
                if (v === 'chat') setResponseImageType('text');
                else if (v === 'image') setResponseImageType('base64');
              }}
              options={[
                { value: 'image', label: '🖼️  生图模型（image）— 返回图片' },
                { value: 'chat',  label: '💬  对话模型（chat）— 返回文本' },
                { value: 'video', label: '🎬  视频模型（video）— 返回视频' },
                { value: 'audio', label: '🎵  音频模型（audio）— 返回音频' },
              ]}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              决定测试时如何展示结果，以及该模型可用于哪些功能模块
            </Typography.Text>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>启用状态</label>
            <Switch checked={enabled} onChange={setEnabled} />
            <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              关闭后该模型不会出现在调用选项中
            </Typography.Text>
          </div>
        </Space>
      );
    }

    if (currentStep === 1) {
      return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="info" showIcon
            message={
              <span style={{ fontSize: 12 }}>
                第二步：直接粘贴模型的真实调用示例（curl 命令或 raw HTTP，<b>含具体值</b>）。
                <br />
                点击下方「<b>分析变量</b>」按钮，AI 会自动识别哪些是全局变量、哪些是临时变量。
              </span>
            }
          />

          <Input.TextArea
            rows={16}
            placeholder={`例如：\n\ncurl -X POST "https://open.bigmodel.cn/api/paas/v4/chat/completions" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer your-api-key" \\\n  -d '{\n    "model": "glm-5.1",\n    "messages": [{"role": "user", "content": "你好"}],\n    "max_tokens": 65536\n  }'`}
            value={rawExample}
            onChange={(e) => {
              setRawExample(e.target.value);
              // 改了示例就标记为"未分析"
              if (analyzed) setAnalyzed(false);
            }}
            style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
          />

          {/* 已分析过的提示（编辑模式） */}
          {analyzed && !rawExample && (
            <div style={{
              padding: 10, background: '#f6ffed',
              borderRadius: 6, border: '1px solid #b7eb8f',
            }}>
              <Typography.Text style={{ fontSize: 12 }}>
                ✓ 该模型已分析过，变量配置可见下一步。如需重新分析，请在上方粘贴新示例。
              </Typography.Text>
            </div>
          )}

          {analyzeMut.isPending && (
            <Alert
              type="info" showIcon
              message="思考模型正在分析中，通常 10-60 秒，请耐心等待…"
            />
          )}
        </Space>
      );
    }

    if (currentStep === 2) {
      return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="info" showIcon
            message={
              <span style={{ fontSize: 12 }}>
                第三步：检查 AI 的变量分类并补值。<b>全局变量</b>（如 apiKey、endpoint）配置一次所有调用共用；
                <b>动态变量</b>（如 prompt、size）每次调用可改，这里填的是<b>默认值</b>。
                <br />
                分类不对可以用「全局/动态」开关直接调整。
              </span>
            }
          />
          <VariablesTab variables={variables} updateVariable={updateVariable} />

          <Collapse
            ghost size="small"
            items={[{
              key: 'advanced',
              label: (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ⚙️ 高级：调用模板与响应解析（一般由 AI 自动生成，无需修改）
                </Typography.Text>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>调用模板</label>
                    <Input.TextArea
                      rows={8}
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 220 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>响应数据类型</label>
                      <Select
                        size="small" style={{ width: '100%' }}
                        value={responseImageType}
                        onChange={(v) => setResponseImageType(v)}
                        options={[
                          { value: 'text',   label: 'text — JSON 字段里的文本（chat）' },
                          { value: 'base64', label: 'base64 — JSON 字段里的 base64 图片' },
                          { value: 'url',    label: 'url — JSON 字段里的链接' },
                          { value: 'binary', label: 'binary — 响应体即二进制' },
                        ]}
                      />
                    </div>
                    {responseImageType !== 'binary' && (
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>响应数据路径</label>
                        <Input
                          size="small"
                          value={responseImagePath}
                          onChange={(e) => setResponseImagePath(e.target.value)}
                          placeholder="如 choices[0].message.content / data[0].b64_json"
                        />
                      </div>
                    )}
                  </div>
                </Space>
              ),
            }]}
          />
        </Space>
      );
    }

    // currentStep === 3
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info" showIcon
          message="第四步：测试调用。下方列出所有「临时变量」，填入实际值后开始测试。系统会用前面保存的全局变量 + 这里的临时值实际调用模型 API。"
        />
        <TestTab
          editingModelId={savedOrEditing?.id ?? id}
          variables={variables}
          hasUnsavedChanges={savedOrEditing ? hasUnsavedChanges(savedOrEditing, { id, name, modalType, enabled, requestTemplate: template, responseImagePath, responseImageType, variables }) : true}
        />
      </Space>
    );
  }

  // 底部按钮
  const isLast = currentStep === 3;
  const isFirst = currentStep === 0;
  const allValid = !validateCurrent();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={editingModel ? `编辑模型 · ${editingModel.name}` : '添加模型'}
      width={860}
      destroyOnClose
      maskClosable={false}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            步骤 {currentStep + 1} / {steps.length}
          </Typography.Text>
          <Space>
            <Button onClick={onClose}>取消</Button>
            {!isFirst && (
              <Button icon={<LeftOutlined />} onClick={goPrev}>
                上一步
              </Button>
            )}
            {currentStep <= 1 && (
              <Button
                type="primary"
                disabled={!allValid}
                onClick={goNext}
                loading={currentStep === 1 && analyzeMut.isPending}
                icon={currentStep === 1 ? <RobotOutlined /> : undefined}
              >
                {currentStep === 1
                  ? (analyzed && !rawExample.trim() ? '下一步 ' : '🪄 分析变量 ')
                  : '下一步 '}
                <RightOutlined />
              </Button>
            )}
            {/* 第 3 步：保存并进入测试；第 4 步：保存并完成 —— 每步只有一个主按钮 */}
            {currentStep >= 2 && (
              <Button
                type="primary"
                loading={saveMut.isPending}
                onClick={() => saveMut.mutate()}
                disabled={idConflict}
                icon={<CheckCircleOutlined />}
              >
                {isLast ? '保存并完成' : '保存并下一步'}
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps
        size="small"
        current={currentStep}
        items={steps}
        onChange={(n) => {
          // 允许点击已通过的步骤跳回去；不允许跳到未完成的下一步
          if (n < currentStep) setCurrentStep(n);
          else if (n === currentStep) return;
          else {
            // 尝试逐步前进
            const err = validateCurrent();
            if (err) { message.error(err); return; }
            setCurrentStep(n);
          }
        }}
        style={{ marginBottom: 20 }}
      />
      <div style={{ minHeight: 360 }}>
        {renderStep()}
      </div>
    </Modal>
  );
}

/** 检测当前表单值是否与已保存的 editingModel 一致 */
function hasUnsavedChanges(editing: AiModelConfig, current: Partial<AiModelConfig>): boolean {
  if (!editing) return true;
  const fields: (keyof AiModelConfig)[] = ['name', 'modalType', 'enabled', 'requestTemplate', 'responseImagePath', 'responseImageType'];
  for (const f of fields) {
    if ((editing as any)[f] !== (current as any)[f]) return true;
  }
  // 变量数组对比
  const oldVars = Array.isArray(editing.variables) ? editing.variables : [];
  const newVars = Array.isArray(current.variables) ? current.variables : [];
  if (oldVars.length !== newVars.length) return true;
  for (let i = 0; i < oldVars.length; i++) {
    const a = oldVars[i]!;
    const b = newVars[i]!;
    if (a.name !== b.name || a.isDynamic !== b.isDynamic
      || a.globalValue !== b.globalValue || !!a.isSecret !== !!b.isSecret) {
      return true;
    }
  }
  return false;
}

// ════════════════════════════════════════════════════
//   变量配置 Tab
// ════════════════════════════════════════════════════
function VariablesTab({
  variables, updateVariable,
}: {
  variables: ModelVariable[];
  updateVariable: (name: string, patch: Partial<ModelVariable>) => void;
}) {
  if (variables.length === 0) {
    return (
      <Alert
        type="warning" showIcon
        message="请先返回上一步分析调用示例。"
      />
    );
  }

  // 全局在前、动态在后，便于先填必填项
  const sorted = [...variables].sort((a, b) => Number(a.isDynamic) - Number(b.isDynamic));

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {sorted.map((v) => (
        <VariableRow
          key={v.name}
          variable={v}
          onChange={(patch) => updateVariable(v.name, patch)}
          showTypeToggle
        />
      ))}
    </Space>
  );
}

function VariableRow({
  variable, onChange, showTypeToggle = true,
}: {
  variable: ModelVariable;
  onChange: (patch: Partial<ModelVariable>) => void;
  showTypeToggle?: boolean;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const valEmpty = !variable.globalValue;

  return (
    <Card
      size="small"
      style={{ borderColor: variable.isDynamic ? '#fa8c16' : '#1677ff' }}
      bodyStyle={{ padding: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* 变量名 */}
        <div style={{ minWidth: 120 }}>
          <Typography.Text code style={{ fontSize: 13 }}>{`{{${variable.name}}}`}</Typography.Text>
        </div>

        {/* 动态 / 全局切换（仅在配置环节显示，Step 3 不再显示） */}
        {showTypeToggle && (
          <Tooltip title={variable.isDynamic ? '每次调用时填写' : '配置一次，所有调用复用'}>
            <Switch
              checked={!variable.isDynamic}
              checkedChildren="全局"
              unCheckedChildren="动态"
              onChange={(checked) => onChange({ isDynamic: !checked })}
            />
          </Tooltip>
        )}

        {/* 敏感字段切换（仅全局变量有意义） */}
        {!variable.isDynamic && (
          <Tooltip title="敏感字段（如 API Key），UI 上脱敏显示">
            <Switch
              checked={!!variable.isSecret}
              checkedChildren="敏感"
              unCheckedChildren="普通"
              size="small"
              onChange={(checked) => onChange({ isSecret: checked })}
            />
          </Tooltip>
        )}

        {/* 全局值输入 */}
        {!variable.isDynamic && (
          <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 6 }}>
            {variable.isSecret ? (
              <>
                <Input
                  type={showSecret ? 'text' : 'password'}
                  size="small"
                  placeholder={`填写 ${variable.name} 的值`}
                  value={variable.globalValue ?? ''}
                  onChange={(e) => onChange({ globalValue: e.target.value })}
                  status={valEmpty ? 'warning' : ''}
                  style={{ fontFamily: showSecret ? 'inherit' : 'text-security-disc' }}
                />
                <Button
                  size="small"
                  type="text"
                  icon={showSecret ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowSecret(!showSecret)}
                />
                {variable.globalValue && !showSecret && (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {maskValue(variable.globalValue)}
                  </Typography.Text>
                )}
              </>
            ) : (
              <Input
                size="small"
                placeholder={`填写 ${variable.name} 的值`}
                value={variable.globalValue ?? ''}
                onChange={(e) => onChange({ globalValue: e.target.value })}
                status={valEmpty ? 'warning' : ''}
              />
            )}
          </div>
        )}

        {/* 动态变量：默认值输入（每次调用可覆盖） */}
        {variable.isDynamic && (
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              size="small"
              placeholder="默认值（可空；每次调用时可改）"
              value={variable.globalValue ?? ''}
              onChange={(e) => onChange({ globalValue: e.target.value })}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════
//   测试 Tab
// ════════════════════════════════════════════════════
function TestTab({
  editingModelId, variables, hasUnsavedChanges,
}: {
  editingModelId: string;
  variables: ModelVariable[];
  hasUnsavedChanges: boolean;
}) {
  const dynamicVars = variables.filter((v) => v.isDynamic);
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultModalType, setResultModalType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, string> = {};
    dynamicVars.forEach((v) => {
      if (v.name.toLowerCase() === 'prompt') {
        init[v.name] = v.globalValue || '你好，请用一句话介绍你自己';
      } else {
        // 预填模型配置的默认值
        init[v.name] = v.globalValue ?? '';
      }
    });
    setDynamicValues(init);
    setResultUrl(null);
    setResultText(null);
    setErrorMsg(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicVars.map((v) => v.name).join(',')]);

  const testMut = useMutation({
    mutationFn: () => aiTasksApi.test(editingModelId, dynamicValues),
    onSuccess: ({ url, text, modalType }) => {
      setResultUrl(url ?? null);
      setResultText(text ?? null);
      setResultModalType(modalType ?? null);
      setErrorMsg(null);
      message.success('测试成功');
    },
    onError: (e: any) => {
      setResultUrl(null);
      setResultText(null);
      setErrorMsg(e?.message ?? '测试失败');
    },
  });

  if (hasUnsavedChanges) {
    return (
      <Alert
        type="warning" showIcon
        message="请先保存模型配置后再测试"
        description="测试调用使用后端最近保存的模型配置（不读取表单当前未保存的修改）。"
      />
    );
  }

  if (dynamicVars.length === 0) {
    return (
      <Alert
        type="info" showIcon
        message="当前模板没有动态变量"
        description="所有变量都已配置为全局，直接点击「开始测试」可调用模型。"
        action={
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={testMut.isPending}
            onClick={() => testMut.mutate()}
          >
            开始测试
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message={
          <span style={{ fontSize: 12 }}>
            填入下方动态变量值后点击「开始测试」。系统会用<b>已保存的全局变量</b> + <b>下方输入的动态变量</b>实际调用模型 API。
          </span>
        }
      />

      <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 16 }}>
        {dynamicVars.map((v) => {
          const isLongText = v.name.toLowerCase() === 'prompt'
            || v.name.toLowerCase().includes('text');
          return (
            <div key={v.name}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
                <Typography.Text code>{`{{${v.name}}}`}</Typography.Text>
              </label>
              {isLongText ? (
                <Input.TextArea
                  rows={3}
                  value={dynamicValues[v.name] ?? ''}
                  onChange={(e) =>
                    setDynamicValues({ ...dynamicValues, [v.name]: e.target.value })
                  }
                />
              ) : (
                <Input
                  value={dynamicValues[v.name] ?? ''}
                  onChange={(e) =>
                    setDynamicValues({ ...dynamicValues, [v.name]: e.target.value })
                  }
                  placeholder={`填写 ${v.name}`}
                />
              )}
            </div>
          );
        })}
      </Space>

      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        loading={testMut.isPending}
        onClick={() => testMut.mutate()}
      >
        开始测试
      </Button>

      {/* 文本结果（chat 模型） */}
      {resultText !== null && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>
            结果（{resultModalType === 'chat' ? '对话文本' : '文本'}）：
          </Typography.Text>
          <div style={{
            marginTop: 8, padding: 14,
            background: '#f6ffed', borderRadius: 6,
            border: '1px solid #b7eb8f',
            maxHeight: 360, overflow: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: 'ui-sans-serif, system-ui', fontSize: 13, lineHeight: 1.6,
          }}>
            {resultText}
          </div>
        </div>
      )}

      {/* 图片/视频结果 */}
      {resultUrl && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>结果：</Typography.Text>
          <div style={{ marginTop: 8, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
            {resultModalType === 'video' ? (
              <video src={resultUrl} controls style={{ maxWidth: '100%', maxHeight: 400 }} />
            ) : (
              <img
                src={resultUrl}
                alt="测试结果"
                style={{
                  maxWidth: '100%', maxHeight: 400,
                  borderRadius: 6, border: '1px solid #b7eb8f',
                }}
              />
            )}
            <div style={{ marginTop: 6 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                <a href={resultUrl} target="_blank" rel="noreferrer">{resultUrl}</a>
              </Typography.Text>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{
          marginTop: 16, padding: 12,
          background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7',
        }}>
          <Typography.Text type="danger" style={{ fontSize: 13 }}>
            ❌ {errorMsg}
          </Typography.Text>
        </div>
      )}
    </div>
  );
}

