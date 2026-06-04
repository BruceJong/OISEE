# AIGC 批量生成脚本

DashScope（阿里云百炼）异步任务客户端，用于批量生成内容图。
所有脚本读取环境变量 `DASHSCOPE_API_KEY`。

| 脚本 | 用途 | 模型 |
| --- | --- | --- |
| `gen-map.py`        | 场景地图（参考 `docs/prototype/sample_map_2.jpg`） | wan2.7-image-pro |
| `gen-l2-scenes.py`  | 42 张 L2 场景 2.5D 室内图（参考 `sample-厨房2.5D.jpeg`） | wan2.7-image-pro |
| `gen-items.py`      | 196 张物品图（苹果产品摄影风/纯色背景） | qwen-image |
| `gen-kps.py`        | 知识点配图（青少年友好插画风） | qwen-image |

## 使用

```bash
export DASHSCOPE_API_KEY=sk-xxx
python3 scripts/aigc/gen-items.py   # 等等
```

生成图默认落到 `data/uploads/`，然后用 `backend/prisma/seed-{scene,item,kp}-images.ts` 把 URL 写入数据库。
