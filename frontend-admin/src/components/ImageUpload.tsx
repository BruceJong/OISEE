import { Button, Input, Space, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { mediaApi } from '@/api/content';

interface ImageUploadProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  purpose: string;
}

export function ImageUpload({ value, onChange, purpose }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  async function handle(file: File) {
    if (!file.type.startsWith('image/')) {
      message.error('仅支持图片');
      return;
    }
    setLoading(true);
    try {
      const { url } = await mediaApi.upload(file, purpose);
      onChange?.(url);
      message.success('上传成功');
    } catch (e: any) {
      message.error(e.message ?? '上传失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <Upload
          accept="image/*"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => {
            handle(file);
            return false; // 阻止默认上传
          }}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            上传图片
          </Button>
        </Upload>
        {value && (
          <Button danger type="text" onClick={() => onChange?.(null)}>
            清除
          </Button>
        )}
      </Space>
      <Input
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value || null)}
        placeholder="或粘贴外链 URL"
      />
      {value && (
        <img
          src={value}
          alt="preview"
          style={{
            maxWidth: 320,
            maxHeight: 200,
            border: '1px solid #eee',
            borderRadius: 4,
            objectFit: 'contain',
          }}
        />
      )}
    </Space>
  );
}
