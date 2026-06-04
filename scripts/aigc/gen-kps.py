#!/usr/bin/env python3
"""为每个知识点生成卡通教育插画

  风格：扁平 2D 教育插画 + 柔和纯色背景
  尺寸：1664*928 (16:9 配合 KnowledgeCard 封面)
"""
import os, json, time, urllib.request, urllib.error, concurrent.futures

API_KEY = os.environ["DASHSCOPE_API_KEY"]
MODEL   = "qwen-image"
OUT_DIR = "/Users/bruce/Desktop/BRUCE/coding/ohsee/data/uploads/kp"

# 学科主题色
SUBJECT_BG = {
    "PHYSICS":   "soft sky blue pastel",
    "CHEMISTRY": "soft coral pastel",
    "BIOLOGY":   "soft sage green pastel",
    "GEOGRAPHY": "soft warm sand pastel",
    "OTHER":     "soft lavender pastel",
}

STYLE = (
    "flat 2D educational illustration, single concept visualization, "
    "cute friendly style for teenagers, "
    "bright bold colors, clean rounded shapes, "
    "minimal details, solid {bg} background, "
    "centered subject, no text labels, no characters, no people, "
    "16:9 horizontal framing, kids textbook illustration style, vector-art look, "
    "soft shadows, science illustration"
)

NEGATIVE = (
    "text, words, letters, watermark, logo, label, UI, "
    "people, faces, characters, hands, real photograph, photorealistic, "
    "harsh shadows, cluttered, low quality, blurry, sketch, line art only"
)

# 为每个 KP 设定专属视觉描述
KP_VISUALS = {
    # ── 力学 ──
    "kp-gravity":          "an apple falling down from a tree branch with a dashed downward arrow showing gravity",
    "kp-friction":         "a wooden block sliding on a rough surface with friction arrows opposing motion",
    "kp-lever":            "a balanced seesaw with a fulcrum triangle, weights on both sides labeled with arrows",
    "kp-pulley":           "a simple pulley system with rope and weight, mechanical illustration",
    "kp-energy-cons":      "a roller coaster going from a high point to a low point, with potential-to-kinetic energy arrows",
    "kp-momentum":         "two billiard balls colliding with momentum vectors as arrows",
    "kp-circular":         "an object moving along a circular path with radial arrows pointing inward",
    "kp-centripetal":      "an object spinning on a string with the string and inward centripetal force arrow",
    "kp-buoyancy":         "a colorful boat floating on blue water with an upward buoyancy arrow",
    "kp-pressure":         "a finger pressing on a balloon with concentrated pressure lines",
    "kp-incline":          "a wooden block on an inclined ramp with decomposed gravity vector arrows",
    "kp-elastic-collision":"two springs compressing and bouncing back, two balls bouncing apart",
    "kp-newton-2":         "an arrow pushing a box with F=ma equation visualized as arrow length",
    # ── 热学 ──
    "kp-heat-conduction":  "a metal rod heated at one end with red color spreading along it",
    "kp-convection":       "a pot of water heating with circulating arrows rising and falling, convection currents",
    "kp-radiation":        "a glowing sun emitting wavy red and orange rays outward",
    "kp-phase-change":     "ice melting into water and water boiling into steam, three states arranged",
    "kp-refrigerant":      "a simplified refrigeration cycle with cold and hot zones, pipe loops",
    "kp-evaporation":      "water droplets rising from a puddle into wavy steam upward",
    "kp-microwave":        "wavy electromagnetic waves heating a bowl from inside, vibrating water molecules",
    "kp-thermal-expansion":"a metal bar getting longer when heated, before-after comparison",
    # ── 光学 ──
    "kp-reflection":       "a light ray hitting a mirror and bouncing back at the same angle",
    "kp-refraction":       "a light ray bending as it enters water from air at an angle",
    "kp-lens":             "a convex lens focusing parallel light rays to a single point",
    "kp-color-mixing":     "three overlapping circles of red, green, blue showing additive color mixing",
    "kp-polarization":     "a light wave passing through vertical slits showing polarization",
    "kp-laser":            "a focused red laser beam line traveling straight with parallel arrows",
    "kp-spectrum":         "a prism splitting white light into rainbow colors",
    "kp-fluorescence":     "an object glowing green under purple UV light, before-after",
    # ── 电磁 ──
    "kp-electric-circuit": "a simple closed circuit with battery, wire, and lightbulb glowing",
    "kp-electromagnetism": "a coil of wire with magnetic field lines emerging from it",
    "kp-motor":            "a simplified electric motor with rotating coil and magnets",
    "kp-semiconductor":    "a stylized PN junction with positive and negative regions",
    "kp-led":              "a tiny LED lightbulb with bright light glow",
    "kp-wifi":             "a router emitting radial wave-like signal rings",
    "kp-em-wave":          "a sinusoidal wave traveling through empty space with E and M fields",
    "kp-x-ray":            "an X-ray showing a stylized hand skeleton silhouette",
    "kp-defibrillator":    "a heart symbol with electric shock pulse arrows",
    # ── 声学 ──
    "kp-sound-wave":       "concentric circular waves radiating from a speaker",
    "kp-resonance":        "a tuning fork vibrating with sound waves making another object resonate",
    "kp-doppler":          "an ambulance moving with sound waves compressed in front and stretched behind",
    "kp-ultrasound":       "a bat emitting high-frequency wave lines",
    # ── 化学 ──
    "kp-acid-base":        "two test tubes one red one blue showing pH scale color gradient",
    "kp-oxidation":        "a rusty iron piece with reddish brown oxide layer",
    "kp-combustion":       "a flame with three labels representing fuel, oxygen, and heat triangle",
    "kp-dissolution":      "sugar crystals dissolving into water with tiny molecules dispersing",
    "kp-fermentation":     "a jar of bubbles with yeast and grape vine, bubble production",
    "kp-osmosis":          "a semi-permeable membrane with water molecules moving from low to high concentration",
    "kp-emulsification":   "oil and water mixed with soap forming small droplets, micelle structure",
    "kp-co2-soda":         "a soda bottle with bubbles rising upward releasing CO2",
    "kp-catalyst":         "two molecules reacting faster with a catalyst molecule (lock-and-key)",
    "kp-polymer":          "long chain of repeating molecular units like beads on a string",
    "kp-pigment":          "a paint palette with vibrant color drops",
    "kp-dye":              "a fabric being dyed in a vat of vibrant colored liquid",
    "kp-soap":             "soap molecules with hydrophilic heads and hydrophobic tails surrounding oil droplet",
    # ── 生物 ──
    "kp-photosynthesis":   "a green leaf with sunlight, CO2, water arrows in and O2 arrow out",
    "kp-respiration":      "a cell taking in oxygen and glucose, releasing CO2 and energy",
    "kp-pollination":      "a bee transferring pollen from one flower to another",
    "kp-ecosystem":        "a food chain pyramid with grass, rabbit, fox illustrated simply",
    "kp-circulation":      "a stylized heart pumping blood through arteries and veins",
    "kp-immune":           "white blood cells defending against a virus particle",
    "kp-pharma":           "a pill dissolving in the body with receptors highlighted",
    "kp-sterilization":    "a sterilization machine zapping germs",
    "kp-bacteria":         "stylized bacteria cells of various shapes under a magnifying glass",
    "kp-yeast":            "yeast cells with bubbles rising in dough",
    # ── 地理/能源 ──
    "kp-water-cycle":      "evaporation from ocean, clouds, rain, river flowing back, full cycle",
    "kp-weather":          "different weather symbols: sun, clouds, rain, wind arrows",
    "kp-soil":             "a cross-section of soil layers with plant roots growing in it",
    "kp-solar-energy":     "a sun rays hitting a solar panel, photons converting to electricity",
    "kp-wind-flow":        "wind arrows flowing from high pressure to low pressure regions",
}


kps = json.load(open("/tmp/oisee-gen/kps-list.json", "r", encoding="utf-8"))
to_process = []
for kp in kps:
    out = os.path.join(OUT_DIR, f"{kp['slug']}.png")
    if os.path.exists(out): continue
    to_process.append(kp)
print(f"总 KP {len(kps)}，需生成 {len(to_process)} 张\n", flush=True)


def submit(prompt):
    body = json.dumps({
        "model": MODEL,
        "input": {"prompt": prompt, "negative_prompt": NEGATIVE},
        "parameters": {"size": "1664*928", "n": 1, "watermark": False, "prompt_extend": True},
    }, ensure_ascii=False).encode("utf-8")
    for attempt in range(6):
        req = urllib.request.Request(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
            data=body,
            headers={"Content-Type": "application/json",
                     "Authorization": f"Bearer {API_KEY}",
                     "X-DashScope-Async": "enable"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)["output"]["task_id"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(15 + attempt * 15); continue
            print(f"  err {e.code}: {e.read().decode('utf-8','ignore')[:120]}", flush=True)
            return None
        except Exception as e:
            print(f"  exc: {e}", flush=True); time.sleep(10)
    return None


def poll(tid, label):
    url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{tid}"
    for _ in range(160):
        time.sleep(5)
        try:
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {API_KEY}"})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.load(r)
            st = d["output"]["task_status"]
            if st == "SUCCEEDED":
                r = d["output"].get("results") or []
                if r: return r[0].get("url")
                return None
            if st in ("FAILED", "CANCELED", "UNKNOWN"):
                print(f"  [{label}] {st}: {d['output'].get('message','')[:80]}", flush=True)
                return None
        except Exception as e:
            print(f"  [{label}] poll err: {e}", flush=True)
    return None


def process(kp):
    slug = kp["slug"]
    name = kp["name"]
    subject = kp["subject"]
    bg = SUBJECT_BG.get(subject, "soft cream pastel")
    visual = KP_VISUALS.get(slug, f"a simple illustration representing the concept of {name}")
    prompt = visual + ". " + STYLE.format(bg=bg)

    tid = submit(prompt)
    if not tid: return slug, False
    img_url = poll(tid, slug)
    if not img_url: return slug, False
    try:
        raw = urllib.request.urlopen(img_url, timeout=180).read()
        with open(os.path.join(OUT_DIR, f"{slug}.png"), "wb") as f: f.write(raw)
        print(f"  ✓ {slug} ({len(raw)//1024}KB)", flush=True)
        return slug, True
    except Exception as e:
        print(f"  ✗ {slug} dl: {e}", flush=True); return slug, False


done = fail = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
    futs = {ex.submit(process, kp): kp["slug"] for kp in to_process}
    for f in concurrent.futures.as_completed(futs):
        _, ok = f.result()
        if ok: done += 1
        else: fail += 1
print(f"\n完成：{done}/{len(to_process)}  失败：{fail}", flush=True)
