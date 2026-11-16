#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remotion director: spec.json -> dynamic vertical short (word-synced karaoke + motion + male voice).
Usage: python3 make_remotion.py <spec.json> <out.mp4> [voice_dir]
Reuses TTS from make_short.py. Renders via Remotion (src/SureViewShort.tsx) with preinstalled chromium.
"""
import json, sys, os, re, subprocess, wave, glob
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from make_short import ensure_voice, load_tts, narration_for, DEFAULT_MALE_SID

REMO = os.path.join(HERE, "remotion")
FPS = 30; LEAD = 0.45; TAIL = 0.65

def chrome_path():
    for p in sorted(glob.glob("/opt/pw-browsers/chromium*/chrome-linux*/chrome"), reverse=True):
        return p
    return os.environ.get("REMOTION_CHROME", "")

def syl(w): return max(1, len(re.sub(r"[\s\.\,\?\!·'\"\-()]", "", w)))

def main():
    spec = json.load(open(sys.argv[1])); out = os.path.abspath(sys.argv[2])
    voice_dir = sys.argv[3] if len(sys.argv) > 3 else os.path.join(REMO, "..", "_shorts", "voice")
    sid = int(spec.get("voice_sid", DEFAULT_MALE_SID)); speed = float(spec.get("voice_speed", 1.1))

    mdir = ensure_voice(voice_dir)
    if not mdir: raise SystemExit("no voice model")
    tts = load_tts(mdir)

    cards = []; segs = []; sr = 24000; cursor = 0
    for i, c in enumerate(spec["cards"]):
        narr = narration_for(c)
        a = tts.generate(narr, sid=sid, speed=speed)
        clip = np.array(a.samples, "float32"); sr = a.sample_rate
        Dsp = len(clip) / sr
        dur = max(float(c.get("dur", 6.0)), LEAD + Dsp + TAIL)  # never cut speech
        nF = int(round(dur * FPS))
        seg = np.zeros(int(dur * sr), "float32"); st = int(LEAD * sr); n = min(len(clip), len(seg) - st)
        if n > 0: seg[st:st + n] = clip[:n]
        segs.append(seg)
        words = narr.split(); wts = [syl(w) for w in words]; tot = sum(wts) or 1; acc = 0; wl = []
        for w, wt in zip(words, wts):
            s = LEAD + (acc / tot) * Dsp; acc += wt; e = LEAD + (acc / tot) * Dsp
            wl.append({"w": w, "s": round(s, 3), "e": round(e, 3)})
        card = {k: v for k, v in c.items() if k not in ("dur", "narration")}
        card.update({"idx": i, "startFrame": cursor, "durFrames": nF, "words": wl})
        cards.append(card); cursor += nF

    track = np.clip(np.concatenate(segs), -1, 1)
    os.makedirs(os.path.join(REMO, "public"), exist_ok=True)
    wav = os.path.join(REMO, "public", "voice.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((track * 32767).astype("<i2").tobytes())
    bgm = spec.get("bgm") or "bgm.mp3"  # spec 에 "bgm": "bgm_light.mp3" 처럼 주면 그 파일을 쓴다 (없으면 기본 bgm.mp3)
    bgm = bgm if os.path.exists(os.path.join(REMO, "public", bgm)) else None

    data = {"fps": FPS, "series": spec["series"], "accent": spec["accent"], "accent2": spec["accent2"],
            "footerBrand": spec.get("footer_brand", "SureView"), "cta": spec["cta"],
            "audio": "voice.wav", "bgm": bgm, "totalFrames": cursor, "cards": cards}
    props = os.path.join(REMO, "props.json")
    json.dump({"data": data}, open(props, "w"), ensure_ascii=False)

    ch = chrome_path()
    cmd = [os.path.join(REMO, "node_modules/.bin/remotion"), "render", "src/index.ts", "Short", out,
           "--props=" + props, "--concurrency=2", "--log=error"]
    if ch: cmd.append("--browser-executable=" + ch)
    r = subprocess.run(cmd, cwd=REMO)
    print(f"render rc={r.returncode} frames={cursor} dur={round(cursor/FPS,1)}s voice=sid{sid}@{speed} -> {out}")

if __name__ == "__main__": main()
