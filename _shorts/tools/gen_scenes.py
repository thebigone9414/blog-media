#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""장면 그림 생성 (GitHub Actions 에서만 돈다). mindlumi/scenes/<이름>.json -> _shorts/assets/mindlumi/scene/<이름>/<id>.jpg
키는 저장소 비밀값(GEMINI_API_KEY)에서만 읽는다. ⛔ 키를 출력 · 기록하지 않는다. ⛔ 이 스크립트를 Claude 세션에서 키와 함께 돌리지 않는다.
이미 있는 그림은 건너뛴다(다시 만들려면 그림 파일을 지우고 json 을 고쳐 푸시). 결과는 <이름>.status.txt 에 남긴다.
"""
import base64, io, json, os, sys, time, urllib.request, urllib.error

MODEL = os.environ.get("SCENE_MODEL", "gemini-3.1-flash-image")
URL = f"https://generativelanguage.googleapis.com/v1/models/{MODEL}:generateContent"
KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
MAX_SCENES = 12  # 한 파일에 12장까지. 비용 상한(1K 한 장 약 0.067달러).

def gen(prompt):
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"],
                                 "responseFormat": {"image": {"aspectRatio": "1:1", "imageSize": "1K"}}}}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), method="POST",
                                 headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.load(r)
    img = None
    for c in d.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            if p.get("thought"): continue
            data = (p.get("inlineData") or p.get("inline_data") or {}).get("data")
            if data: img = data
    if not img: raise RuntimeError("no image in response: " + json.dumps(d)[:300])
    return base64.b64decode(img)

def main():
    from PIL import Image
    rc = 0
    for path in sys.argv[1:]:
        if not path.endswith(".json") or not os.path.exists(path): continue
        spec = json.load(open(path, encoding="utf-8")); name = os.path.basename(path)[:-5]
        out = os.path.join("_shorts/assets/mindlumi/scene", name); os.makedirs(out, exist_ok=True)
        style = spec.get("style", ""); lines = [f"model={MODEL}"]
        for sc in spec.get("scenes", [])[:MAX_SCENES]:
            dst = os.path.join(out, sc["id"] + ".jpg")
            if os.path.exists(dst): lines.append(f"skip {sc['id']} (있음)"); continue
            if not KEY: lines.append(f"failure {sc['id']} no_key - 저장소 비밀값 GEMINI_API_KEY 가 없다"); rc = 1; continue
            err = ""
            for attempt in range(3):
                try:
                    raw = gen((style + " " + sc["prompt"]).strip())
                    im = Image.open(io.BytesIO(raw)).convert("RGB"); w, h = im.size
                    # 화면 위쪽 절반(1080x960)에 들어간다. 정사각으로 받아 1080x1080 으로 두고, 영상에서 위아래를 조금 잘라 쓴다.
                    m = min(w, h); im = im.crop(((w - m) // 2, (h - m) // 2, (w - m) // 2 + m, (h - m) // 2 + m))
                    im.resize((1080, 1080), Image.LANCZOS).save(dst, quality=90)
                    lines.append(f"success {sc['id']} {w}x{h}"); err = ""; break
                except urllib.error.HTTPError as e:
                    err = f"HTTP {e.code} " + e.read().decode("utf-8", "replace")[:240].replace("\n", " ")
                    if e.code in (400, 401, 403, 404): break
                except Exception as e:
                    err = type(e).__name__ + " " + str(e)[:240]
                time.sleep(8 * (attempt + 1))
            if err: lines.append(f"failure {sc['id']} {err.replace(KEY, '***') if KEY else err}"); rc = 1
        open(path[:-5] + ".status.txt", "w", encoding="utf-8").write(time.strftime("%Y-%m-%d %H:%M UTC\n", time.gmtime()) + "\n".join(lines) + "\n")
    sys.exit(0)  # 실패해도 status 를 커밋해야 하므로 0 으로 끝낸다

if __name__ == "__main__": main()
