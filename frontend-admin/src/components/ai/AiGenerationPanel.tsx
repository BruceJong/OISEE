import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Input,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  Image,
  Alert,
  Spin,
} from 'antd';
import {
  ThunderboltOutlined,
  UploadOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiTasksApi, type AiTask } from '@/api/ai-tasks';
import { settingsApi } from '@/api/settings';
import { mediaApi } from '@/api/content';
import { useAiTasksStore } from '@/stores/ai-tasks';
import { message } from 'antd';

interface AiGenerationPanelProps {
  /** 实体类型 */
  entityType: string;
  /** 实体 ID */
  entityId?: string;
  /** 生成目的标识 */
  purpose: string;
  /** 默认提示词（非受控，仅初始化用） */
  defaultPrompt?: string;
  /** 受控提示词（如传入则以此为准，内部修改同步通知父组件） */
  prompt?: string;
  /** 提示词变化回调（受控模式） */
  onPromptChange?: (prompt: string) => void;
  /** 当前图片 URL */
  value?: string | null;
  /** 图片变化回调（手动上传或AI生成完成后） */
  onChange?: (url: string) => void;
  /** 标签 */
  label?: string;
  /** 高度占位（px） */
  previewHeight?: number;
}

const STATUS_LABEL: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '排队中' },
  RUNNING: { color: 'processing', text: '生成中' },
  DONE: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '生成失败' },
};

export function AiGenerationPanel({
  entityType,
  entityId,
  purpose,
  defaultPrompt = '',
  prompt: promptProp,
  onPromptChange,
  value,
  onChange,
  label = '图片',
  previewHeight = 200,
}: AiGenerationPanelProps) {
  // 受控优先：如果外部传了 prompt 则以外部为准
  const isControlled = promptProp !== undefined;
  const [promptInternal, setPromptInternal] = useState(defaultPrompt);
  const prompt = isControlled ? promptProp : promptInternal;
  const setPrompt = (v: string) => {
    if (!isControlled) setPromptInternal(v);
    onPromptChange?.(v);
  };
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AiTask | null>(null);
  const upsertTask = useAiTasksStore((s) => s.upsertTask);

  // ─── 历史栈：保存"被替换前"的图片，用于撤销 ───
  const [history, setHistory] = useState<string[]>([]);
  const prevValueRef = useRef<string | null | undefined>(value);

  // 包装 onChange：每次 value 即将被新值覆盖时，把旧值推入历史
  const pushAndChange = useCallback(
    (next: string | null) => {
      const old = prevValueRef.current;
      if (old && old !== next) {
        setHistory((h) => [...h, old as string]);
      }
      prevValueRef.current = next;
      onChange?.(next as string);
    },
    [onChange]
  );

  // 撤销到上一张
  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1]!;
      prevValueRef.current = prev;
      onChange?.(prev);
      return h.slice(0, -1);
    });
  }, [onChange]);

  // 同步外部 value 变更（不经过本组件，例如父组件 reset）
  useEffect(() => {
    if (value !== prevValueRef.current && !history.includes(value as string)) {
      prevValueRef.current = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 查询模型列表
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.listAll(),
  });

  const models = settings?.ai_models ?? [];
  const defaultModelId = settings?.ai_default_model ?? models[0]?.id ?? '';
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModelId);

  useEffect(() => {
    if (defaultModelId && !selectedModelId) {
      setSelectedModelId(defaultModelId);
    }
  }, [defaultModelId, selectedModelId]);

  // ─── 当前模型的动态参数（除 prompt 外，如 size / negativePrompt）───
  const currentModel = models.find((m) => m.id === (selectedModelId || defaultModelId));
  const dynParams = (Array.isArray(currentModel?.variables) ? currentModel!.variables! : [])
    .filter((v) => v.isDynamic && v.name.toLowerCase() !== 'prompt');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  // 切换模型时用模型配置的默认值（globalValue）初始化参数
  useEffect(() => {
    const init: Record<string, string> = {};
    dynParams.forEach((v) => { init[v.name] = v.globalValue ?? ''; });
    setParamValues(init);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModel?.id, dynParams.map((v) => v.name).join(',')]);

  // 轮询任务进度
  const { data: polledTask } = useQuery({
    queryKey: ['ai-task', activeTaskId],
    queryFn: () => aiTasksApi.getOne(activeTaskId!),
    enabled: !!activeTaskId && taskStatus?.status !== 'DONE' && taskStatus?.status !== 'FAILED',
    refetchInterval: 1500,
  });

  useEffect(() => {
    if (polledTask) {
      setTaskStatus(polledTask);
      upsertTask(polledTask);
      if (polledTask.status === 'DONE' && polledTask.resultUrl) {
        pushAndChange(polledTask.resultUrl);
      }
    }
  }, [polledTask, onChange, upsertTask]);

  // 创建任务
  const createMut = useMutation({
    mutationFn: () => {
      // 空值不传，后端会用模型配置的默认值兜底
      const dynamicValues: Record<string, string> = {};
      Object.entries(paramValues).forEach(([k, v]) => {
        if (v !== '') dynamicValues[k] = v;
      });
      return aiTasksApi.create({
        entityType,
        entityId: entityId ?? 'pending',
        purpose,
        prompt,
        modelId: selectedModelId || defaultModelId,
        dynamicValues,
      });
    },
    onSuccess: (task) => {
      setActiveTaskId(task.id);
      setTaskStatus(task);
      upsertTask(task);
    },
    onError: () => message.error('创建生图任务失败'),
  });

  // 取消任务
  const cancelMut = useMutation({
    mutationFn: () => aiTasksApi.cancel(activeTaskId!),
    onSuccess: (task) => {
      setTaskStatus(task);
      setActiveTaskId(null);
    },
  });

  // 手动上传
  const [uploading, setUploading] = useState(false);
  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        message.error('仅支持图片格式');
        return;
      }
      setUploading(true);
      try {
        const { url } = await mediaApi.upload(file, purpose);
        pushAndChange(url);
        message.success('上传成功');
      } catch {
        message.error('上传失败');
      } finally {
        setUploading(false);
      }
    },
    [onChange, purpose]
  );

  const isRunning = taskStatus?.status === 'PENDING' || taskStatus?.status === 'RUNNING';
  const isDone = taskStatus?.status === 'DONE';
  const isFailed = taskStatus?.status === 'FAILED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 当前图片预览 */}
      {value && (
        <div
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            background: '#f5f5f5',
            height: previewHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            src={value}
            alt={label}
            style={{ maxHeight: previewHeight, objectFit: 'contain' }}
            preview={{ mask: '查看大图' }}
          />
        </div>
      )}

      {!value && (
        <div
          style={{
            height: previewHeight / 2,
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bbb',
            fontSize: 13,
          }}
        >
          暂无{label}
        </div>
      )}

      {/* 任务进度 */}
      {taskStatus && (isRunning || isDone || isFailed) && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: isDone ? '#f6ffed' : isFailed ? '#fff2f0' : '#e6f4ff',
            border: `1px solid ${isDone ? '#b7eb8f' : isFailed ? '#ffccc7' : '#91caff'}`,
          }}
        >
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={6}>
              {isRunning && <Spin size="small" />}
              {isDone && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
              {isFailed && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              <Tag
                color={STATUS_LABEL[taskStatus.status]?.color}
                style={{ margin: 0 }}
              >
                {STATUS_LABEL[taskStatus.status]?.text}
              </Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {taskStatus.modelId}
              </Typography.Text>
            </Space>
            {isRunning && (
              <Button
                size="small"
                danger
                type="text"
                icon={<CloseCircleOutlined />}
                onClick={() => cancelMut.mutate()}
                loading={cancelMut.isPending}
              >
                取消
              </Button>
            )}
            {(isDone || isFailed) && (
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => { setActiveTaskId(null); setTaskStatus(null); }}
              >
                重新生成
              </Button>
            )}
          </Space>
          {isRunning && (
            <Progress
              percent={taskStatus.progress}
              size="small"
              style={{ marginTop: 8, marginBottom: 0 }}
              strokeColor={{ '0%': '#1677ff', '100%': '#52c41a' }}
            />
          )}
          {isFailed && taskStatus.errorMessage && (
            <Typography.Text type="danger" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              {taskStatus.errorMessage}
            </Typography.Text>
          )}
        </div>
      )}

      {/* AI 生图区 */}
      {!isRunning && (
        <div
          style={{
            padding: '12px 16px',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            background: '#fafafa',
          }}
        >
          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            <ThunderboltOutlined style={{ color: '#1677ff', marginRight: 4 }} />
            AI 文生图
          </Typography.Text>

          <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
            <Select
              size="small"
              style={{ width: 160 }}
              value={selectedModelId || defaultModelId}
              onChange={setSelectedModelId}
              options={models.map((m) => ({
                value: m.id,
                label: m.name,
                disabled: !m.enabled,
              }))}
              placeholder="选择模型"
            />
          </Space.Compact>

          <Input.TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="输入文生图提示词，描述你想要的图片..."
            style={{ fontSize: 13 }}
          />

          {/* 模型动态参数（如 size / negativePrompt），留空使用模型默认值 */}
          {dynParams.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {dynParams.map((v) => (
                <div key={v.name} style={{ minWidth: 140, flex: '1 1 140px' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {v.name}
                  </Typography.Text>
                  <Input
                    size="small"
                    value={paramValues[v.name] ?? ''}
                    onChange={(e) =>
                      setParamValues((p) => ({ ...p, [v.name]: e.target.value }))
                    }
                    placeholder={v.globalValue ? `默认 ${v.globalValue}` : '（可空）'}
                  />
                </div>
              ))}
            </div>
          )}

          <Space style={{ marginTop: 8 }}>
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              loading={createMut.isPending}
              onClick={() => createMut.mutate()}
              disabled={!prompt.trim() || !selectedModelId}
            >
              开始生成
            </Button>
            <Upload
              accept="image/*"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => { handleUpload(file); return false; }}
            >
              <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                手动上传
              </Button>
            </Upload>
            {history.length > 0 && (
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={handleUndo}
              >
                撤销（剩 {history.length} 张）
              </Button>
            )}
            {value && (
              <Button
                size="small"
                type="text"
                danger
                onClick={() => pushAndChange(null)}
              >
                清除图片
              </Button>
            )}
          </Space>

          {(() => {
            const enabled = models.filter((m) => m.enabled);
            const cur = enabled.find((m) => m.id === (selectedModelId || defaultModelId));
            if (enabled.length === 0) {
              return (
                <Alert
                  style={{ marginTop: 8 }}
                  type="warning" showIcon
                  message={<span style={{ fontSize: 12 }}>
                    暂无已启用的模型，请前往{' '}
                    <a href="/cms/settings" target="_blank" rel="noreferrer">设置页面</a>{' '}配置。
                  </span>}
                />
              );
            }
            // 检查当前模型是否填好所有全局变量
            if (cur) {
              const vars = Array.isArray(cur.variables) ? cur.variables : [];
              const missing = vars.filter((v: any) => !v.isDynamic && !v.globalValue);
              if (!cur.requestTemplate) {
                return (
                  <Alert
                    style={{ marginTop: 8 }}
                    type="warning" showIcon
                    message={<span style={{ fontSize: 12 }}>
                      {cur.name} 未配置调用模板，生成将使用占位图。
                      请到{' '}<a href="/cms/settings" target="_blank" rel="noreferrer">设置页面</a>{' '}配置。
                    </span>}
                  />
                );
              }
              if (missing.length > 0) {
                return (
                  <Alert
                    style={{ marginTop: 8 }}
                    type="warning" showIcon
                    message={<span style={{ fontSize: 12 }}>
                      {cur.name} 以下全局变量未填：{missing.map((m: any) => m.name).join(', ')}。
                      请到{' '}<a href="/cms/settings" target="_blank" rel="noreferrer">设置页面</a>{' '}补齐。
                    </span>}
                  />
                );
              }
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}
