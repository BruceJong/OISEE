#!/usr/bin/env python3
"""map-v11e — wan2.7-image-pro，messages 多模态格式"""
import os, sys, json, time, uuid, urllib.request, urllib.error

API_KEY = os.environ["DASHSCOPE_API_KEY"]
MODEL   = "wan2.7-image-pro"
REF_IMG = "/Users/bruce/Desktop/BRUCE/coding/ohsee/docs/prototype/sample_map_2.jpg"
OUT     = "/Users/bruce/Desktop/BRUCE/coding/ohsee/data/uploads/home/map-v11.png"

PROMPT = (
    "参考这个图的风格、视角和比例尺，生成一个小镇。"
    "需要包含家、学校、医院、商场、公园、超市、游乐场，"
    "这些建筑需要有明显的标识特征，图片比例为横图16:9"
)

def upload(path: str) -> str:
    with open(path, "rb") as f: data = f.read()
    b = b"----X" + uuid.uuid4().hex.encode()
    crlf = b"\r\n"
    body = b""
    for k, v in [("reqtype", "fileupload"), ("time", "1h")]:
        body += b"--" + b + crlf
        body += f'Content-Disposition: form-data; name="{k}"'.encode() + crlf + crlf
        body += v.encode() + crlf
    body += b"--" + b + crlf
    body += b'Content-Disposition: form-data; name="fileToUpload"; filename="ref.jpg"' + crlf
    body += b"Content-Type: image/jpeg" + crlf + crlf
    body += data + crlf
    body += b"--" + b + b"--" + crlf
    req = urllib.request.Request(
        "https://litterbox.catbox.moe/resources/internals/api.php",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={b.decode()}",
                 "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8").strip()

print(f"[upload] {REF_IMG}", flush=True)
ref_url = upload(REF_IMG)
print(f"[ref] {ref_url}", flush=True)

endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation"

# messages 多模态格式
body = json.dumps({
    "model": MODEL,
    "input": {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"image": ref_url},
                    {"text": PROMPT},
                ],
            }
        ]
    },
    "parameters": {
        "size": "1664*928",
        "n": 1,
        "watermark": False,
        "prompt_extend": True,
    },
}, ensure_ascii=False).encode("utf-8")

req = urllib.request.Request(endpoint, data=body, headers={
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}",
    "X-DashScope-Async": "enable",
})

print(f"\n[submit] messages-style", flush=True)
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.load(r)
    print(f"  → {res}", flush=True)
except urllib.error.HTTPError as e:
    err = e.read().decode("utf-8", "ignore")
    print(f"  HTTP {e.code}: {err}", flush=True)
    sys.exit(1)

task_id = res["output"]["task_id"]
print(f"  task_id={task_id}", flush=True)

print("\n[wait] 轮询 …", flush=True)
poll_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
result = None
for i in range(180):
    time.sleep(5)
    req2 = urllib.request.Request(poll_url, headers={"Authorization": f"Bearer {API_KEY}"})
    with urllib.request.urlopen(req2, timeout=30) as r:
        d = json.load(r)
    st = d["output"]["task_status"]
    print(f"  poll#{i+1}  {st}", flush=True)
    if st == "SUCCEEDED":
        result = d; break
    if st in ("FAILED", "CANCELED", "UNKNOWN"):
        print(json.dumps(d, ensure_ascii=False, indent=2))
        sys.exit(1)

if not result:
    sys.exit(1)

# 结果格式可能不一样，多探测一下
out = result.get("output", {})
url = None
if "results" in out and out["results"]:
    url = out["results"][0].get("url")
elif "choices" in out and out["choices"]:
    for ch in out["choices"]:
        for c in ch.get("message", {}).get("content", []):
            if "image" in c:
                url = c["image"]; break
elif "image_url" in out:
    url = out["image_url"]

if not url:
    print(json.dumps(result, ensure_ascii=False, indent=2)); sys.exit(1)

print(f"\n[dl] {url[:100]}", flush=True)
raw = urllib.request.urlopen(url, timeout=180).read()
with open(OUT, "wb") as f: f.write(raw)
print(f"[ok] {OUT} ({len(raw)//1024}KB)")
