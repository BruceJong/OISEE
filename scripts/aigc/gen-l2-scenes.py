#!/usr/bin/env python3
"""批量生成 42 个 L2 场景 2.5D 图片

  策略：
    1. 上传参考图 sample-厨房2.5D.jpeg 到 litterbox（一次）
    2. 对每个 L2 场景，提交 wan2.7-image-pro 异步任务（带自定义 prompt）
    3. 并发轮询所有任务
    4. 下载结果到 data/uploads/l2-scenes/{slug}.png

  完成后更新 DB 中 scene.sceneImageUrl
"""
import os, sys, json, time, uuid, urllib.request, urllib.error, concurrent.futures

API_KEY = os.environ["DASHSCOPE_API_KEY"]
MODEL   = "wan2.7-image-pro"
REF_IMG = "/Users/bruce/Desktop/BRUCE/coding/ohsee/docs/prototype/sample-厨房2.5D.jpeg"
OUT_DIR = "/Users/bruce/Desktop/BRUCE/coding/ohsee/data/uploads/l2-scenes"
UA      = "Mozilla/5.0"

# 每个 L2 场景的内容描述（保持风格仿参考、内容由 prompt 决定）
SCENES = [
    # ── 家 ──
    ("home-living",   "客厅",   "isometric 2.5D cutaway 3D clay-render style living room with sofa, TV, coffee table, ceiling lamp, plant in pot, soft pastel colors, two visible walls, warm light"),
    ("home-bath",     "卫生间", "isometric 2.5D cutaway bathroom with bathtub, sink, mirror, toilet, towel rack, plant, soft pastel turquoise and white tones"),
    ("home-bedroom",  "卧室",   "isometric 2.5D cutaway bedroom with double bed, nightstand with lamp, wardrobe, window with curtain, soft warm pastel colors"),
    ("home-study",    "书房",   "isometric 2.5D cutaway study room with wooden desk, computer monitor, bookshelf, swivel chair, desk lamp, plant, warm wood tones"),
    ("home-balcony",  "阳台",   "isometric 2.5D cutaway balcony with clothes drying rack, potted plants, small table and chair, wooden fence, sunshine, light blue sky"),
    # ── 公园 ──
    ("park-lawn",     "草坪",   "isometric 2.5D cutaway outdoor lawn scene with green grass, small mushrooms, ants, dandelions, trees in background, sunny day, soft pastel colors"),
    ("park-lake",     "湖边",   "isometric 2.5D cutaway lakeside scene with calm blue pond, lotus flowers, small fish, stone bridge, willow tree, wooden bench, soft pastel"),
    ("park-flower",   "花圃",   "isometric 2.5D cutaway flower bed scene with colorful tulips and roses, butterflies, bees, small garden gate, soft pastel colors"),
    ("park-fitness",  "健身区", "isometric 2.5D cutaway outdoor fitness area with elliptical machine, swing, seesaw, pull-up bar, green grass, soft pastel colors"),
    ("park-pavilion", "凉亭",   "isometric 2.5D cutaway garden pavilion with curved roof, four wooden pillars, stone bench inside, surrounding plants, soft pastel colors"),
    # ── 学校 ──
    ("school-classroom", "教室", "isometric 2.5D cutaway classroom with blackboard, projector, rows of desks, fluorescent lights, world map on wall, soft pastel colors"),
    ("school-lab",       "实验室", "isometric 2.5D cutaway chemistry lab with alcohol burner, beakers, balance, test tubes, magnet, lab counter, periodic table on wall, soft pastel"),
    ("school-sports",    "操场", "isometric 2.5D cutaway sports ground with running track, basketball hoop, flagpole, soccer ball, jump rope, soft pastel colors"),
    ("school-library",   "校园图书馆", "isometric 2.5D cutaway library with tall bookshelves filled with books, reading table with lamp, window with sound-absorbing panel, soft pastel"),
    ("school-cafeteria", "食堂", "isometric 2.5D cutaway cafeteria with steaming bamboo steamer, warming food tray, dining trays, bowl of soup, bowl of rice, soft pastel"),
    ("school-art",       "美术室", "isometric 2.5D cutaway art classroom with easel, watercolor paints, brushes, drawing paper, water jar, splashes of color, soft pastel"),
    # ── 医院 ──
    ("hospital-emergency", "急诊室", "isometric 2.5D cutaway emergency room with ECG monitor on stand, defibrillator, IV drip pole, hospital bed, oxygen tank, soft pastel medical white blue"),
    ("hospital-xray",      "X 光室", "isometric 2.5D cutaway X-ray room with X-ray machine, lead apron hanging, viewing monitor, examination table, soft pastel"),
    ("hospital-pharmacy",  "药房", "isometric 2.5D cutaway pharmacy with shelves of pill bottles, electronic scale, syrup bottle, medicine refrigerator, soft pastel"),
    ("hospital-waiting",   "候诊室", "isometric 2.5D cutaway hospital waiting room with thermometer, blood pressure cuff, masks dispenser, disinfectant bottle, queue display screen, soft pastel"),
    ("hospital-surgery",   "手术室", "isometric 2.5D cutaway operating room with surgical lamp, scalpel tray, anesthesia machine, suture kit, vital signs monitor, soft pastel"),
    ("hospital-ward",      "病房", "isometric 2.5D cutaway hospital ward with electric adjustable bed, call button, IV pump, window, privacy curtain, soft pastel"),
    # ── 超市 ──
    ("super-fresh",    "生鲜区", "isometric 2.5D cutaway supermarket fresh produce area with vegetable misting spray, fresh produce lamp, leafy greens, fruits, weighing scale, soft pastel"),
    ("super-frozen",   "冷冻区", "isometric 2.5D cutaway supermarket frozen section with cold cabinet, ice cream display, frost on shelves, frozen food packages, temperature monitor, soft pastel blue"),
    ("super-drinks",   "饮料区", "isometric 2.5D cutaway supermarket beverage aisle with rows of soda bottles, mineral water, juice, tea cans, refrigerated display shelf, soft pastel"),
    ("super-checkout", "收银台", "isometric 2.5D cutaway supermarket checkout counter with barcode scanner, weighing scale, receipt printer, POS machine, conveyor belt, soft pastel"),
    ("super-bakery",   "烘焙区", "isometric 2.5D cutaway bakery with fresh bread loaves, oven, dough mixer, cookies on tray, whipped cream cake, soft pastel warm"),
    # ── 商场 ──
    ("mall-electronics", "电器店", "isometric 2.5D cutaway electronics store with TVs on display wall, smartphones, speakers, camera, headphones on stands, soft pastel"),
    ("mall-food",        "美食广场", "isometric 2.5D cutaway food court with grill station, fryer, soup pot, microwave, shaved ice machine, soft pastel"),
    ("mall-cinema",      "电影院", "isometric 2.5D cutaway movie theater with projector beam, large screen, reclining seats, 3D glasses, popcorn machine, soft pastel dark"),
    ("mall-arcade",      "游戏厅", "isometric 2.5D cutaway arcade with arcade cabinets, VR headset, claw machine, drumming game, colorful LED lights, soft pastel neon"),
    ("mall-clothing",    "服装店", "isometric 2.5D cutaway clothing store with hanging clothes on racks, dyed fabrics, full-length mirror, hangers, security tag detector, soft pastel"),
    # ── 游乐场 ──
    ("play-carousel", "旋转木马", "isometric 2.5D cutaway carousel with decorative horses, central column, music box, colorful canopy, ring of lights, soft pastel"),
    ("play-coaster",  "过山车", "isometric 2.5D cutaway roller coaster with twisting track, cars, loop, brake section, lift chain, soft pastel colors"),
    ("play-seesaw",   "跷跷板", "isometric 2.5D cutaway playground seesaw with central fulcrum, board, handle grips, buffer springs, sand pit below, soft pastel"),
    ("play-slide",    "滑梯", "isometric 2.5D cutaway playground slide with smooth slide surface, ladder, handrails, curved section, landing mat, soft pastel"),
    ("play-ferris",   "摩天轮", "isometric 2.5D cutaway ferris wheel with cabins, spokes, drive motor below, panoramic view, decorative lights, soft pastel"),
    ("play-bumper",   "碰碰车", "isometric 2.5D cutaway bumper car arena with electric cars, conductive ceiling grid, contact pole on car roof, rubber bumpers, blinking lights, soft pastel"),
]

STYLE_SUFFIX = ", in the same isometric 2.5D clay-render mobile game art style as the reference image, soft pastel colors, two visible walls cutaway view, warm cozy atmosphere, soft shadows, ABSOLUTELY NO TEXT NO UI NO WATERMARK, photorealistic detail with cartoon stylization"

# ── 上传参考图（一次） ────────────────────────────────────────
def upload_litterbox(path):
    with open(path, "rb") as f: data = f.read()
    b = b"----X" + uuid.uuid4().hex.encode()
    crlf = b"\r\n"
    body = b""
    for k, v in [("reqtype", "fileupload"), ("time", "12h")]:
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
        headers={"Content-Type": f"multipart/form-data; boundary={b.decode()}", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8").strip()

print(f"[upload-ref] {REF_IMG}", flush=True)
REF_URL = upload_litterbox(REF_IMG)
print(f"[ref-url] {REF_URL}\n", flush=True)


# ── 提交单个任务 ──────────────────────────────────────────────
def submit_task(prompt):
    body = json.dumps({
        "model": MODEL,
        "input": {"messages": [{"role": "user",
                                 "content": [{"image": REF_URL}, {"text": prompt}]}]},
        "parameters": {"size": "1024*1024", "n": 1, "watermark": False, "prompt_extend": True},
    }, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
            "X-DashScope-Async": "enable",
        })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)["output"]["task_id"]
    except urllib.error.HTTPError as e:
        print(f"  submit failed: {e.code} {e.read().decode('utf-8','ignore')[:150]}")
        return None


# ── 轮询单个任务直至 SUCCEEDED ───────────────────────────────
def poll_one(task_id, label):
    url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
    for _ in range(180):
        time.sleep(5)
        try:
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {API_KEY}"})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)
            st = d["output"]["task_status"]
            if st == "SUCCEEDED":
                _o = d["output"]; _ch = _o.get("choices") or []
                if _ch:
                    for _c in _ch[0].get("message", {}).get("content", []):
                        if "image" in _c: return _c["image"]
                _r = _o.get("results") or []
                if _r: return _r[0].get("url")
                return None
            if st in ("FAILED", "CANCELED", "UNKNOWN"):
                print(f"  [{label}] {st}", flush=True)
                return None
        except Exception as e:
            print(f"  [{label}] poll err: {e}", flush=True)
    return None


def process_scene(slug, name, content_prompt):
    out_path = os.path.join(OUT_DIR, f"{slug}.png")
    if os.path.exists(out_path):
        print(f"[skip] {slug} 已存在", flush=True)
        return slug, True
    full_prompt = content_prompt + STYLE_SUFFIX
    tid = submit_task(full_prompt)
    if not tid:
        return slug, False
    img_url = poll_one(tid, slug)
    if not img_url:
        return slug, False
    try:
        raw = urllib.request.urlopen(img_url, timeout=180).read()
        with open(out_path, "wb") as f: f.write(raw)
        print(f"  ✓ {slug} ({len(raw)//1024}KB)", flush=True)
        return slug, True
    except Exception as e:
        print(f"  ✗ {slug} download: {e}", flush=True)
        return slug, False


# ── 并发执行（限制最大并发，避免 API 限流） ───────────────────
print(f"开始生成 {len(SCENES)} 个 L2 场景图（并发 4）…\n", flush=True)
done, fail = 0, 0
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
    futures = {ex.submit(process_scene, s, n, p): s for s, n, p in SCENES}
    for f in concurrent.futures.as_completed(futures):
        slug, ok = f.result()
        if ok: done += 1
        else: fail += 1

print(f"\n完成：{done}/{len(SCENES)}  失败：{fail}", flush=True)
