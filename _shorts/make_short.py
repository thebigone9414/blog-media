#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SureView vertical-shorts generator (caption-card style), optional offline AI voice.
Usage:
  python3 make_short.py <spec.json> <out.mp4> [voice_dir]
- voice_dir: a sherpa-onnx offline TTS model folder (model.onnx + tokens.txt [+ voices.bin]).
  If given and usable, narration is synthesized offline (no internet TTS) and muxed in.
  If absent or synthesis fails, a silent caption-only video is produced (safe fallback).
Rules: no em-dash/en-dash (hyphen/middot only); no '컴퓨트' (use 연산/컴퓨팅).
Spec card may add  "narration":"TTS로 읽을 문장"  (if omitted, derived from title+sub).
"""
import json, os, sys, re, asyncio, subprocess, wave
from playwright.async_api import async_playwright
W,H=1080,1920; FADE=0.35

# ---------- card HTML (unchanged visual design) ----------
def css(ac,ac2):
    return f"""
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
:root{{--ac:{ac};--ac2:{ac2};}}
html,body{{width:1080px;height:1920px;overflow:hidden;}}
body{{font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif;color:#eef4f8;position:relative;
 background:radial-gradient(1200px 900px at 78% -8%, color-mix(in srgb, var(--ac) 18%, transparent), transparent 60%),
  radial-gradient(1100px 1000px at 10% 108%, rgba(56,98,180,0.22), transparent 58%),
  linear-gradient(160deg,#0b1220 0%,#0e1a2d 52%,#0a1526 100%);}}
.wrap{{position:absolute;inset:0;display:flex;flex-direction:column;padding:150px 92px 150px;}}
.dots{{position:absolute;top:84px;left:92px;right:92px;display:flex;gap:10px;}}
.dot{{height:7px;flex:1;border-radius:99px;background:rgba(255,255,255,0.14);}}
.dot.on{{background:linear-gradient(90deg,var(--ac),#ffffff44);}}
.chip{{display:inline-flex;align-items:center;gap:14px;align-self:flex-start;padding:16px 28px;
 border:1px solid color-mix(in srgb,var(--ac) 55%,transparent);border-radius:99px;font-size:30px;font-weight:700;
 color:color-mix(in srgb,var(--ac) 80%,white);background:color-mix(in srgb,var(--ac) 9%,transparent);}}
.chip .no{{color:#0b1220;background:var(--ac);border-radius:8px;padding:2px 12px;font-size:28px;}}
.title{{margin-top:54px;font-size:88px;line-height:1.26;font-weight:800;letter-spacing:-1px;color:#f4f9fb;}}
.title b{{color:color-mix(in srgb,var(--ac) 75%,white);}}
.title em{{font-style:normal;color:var(--ac2);}}
.sub{{margin-top:40px;font-size:40px;line-height:1.5;font-weight:500;color:#9fb4c6;}}
.stage{{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:40px;}}
.big{{font-size:60px;font-weight:800;color:var(--ac2);line-height:1.34;letter-spacing:-.5px;padding:40px;border-radius:26px;
 background:color-mix(in srgb,var(--ac2) 8%,transparent);border:1px solid color-mix(in srgb,var(--ac2) 32%,transparent);}}
.big em{{font-style:normal;color:#ff7a7a;font-size:76px;vertical-align:-6px;padding:0 10px;}}
.flow{{display:flex;flex-direction:column;gap:24px;}}
.fbox{{padding:38px 32px;border-radius:24px;font-size:54px;font-weight:800;text-align:center;
 background:color-mix(in srgb,var(--ac) 11%,transparent);border:1px solid color-mix(in srgb,var(--ac) 45%,transparent);color:#eafffb;}}
.farrow{{font-size:48px;color:var(--ac);text-align:center;}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:26px;}}
.gcell{{padding:46px 28px;border-radius:26px;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.12);text-align:center;}}
.gcell .k{{font-size:52px;font-weight:800;color:color-mix(in srgb,var(--ac) 75%,white);line-height:1.2;}}
.gcell .e{{display:block;margin-top:12px;font-size:28px;font-weight:600;color:#8fa6ba;}}
.stat{{display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:50px 44px;border-radius:28px;
 background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.12);}}
.stat .v{{font-size:120px;font-weight:900;letter-spacing:-2px;line-height:1;}}
.stat .v.up{{color:#34d399;}} .stat .v.down{{color:#ff6b6b;}} .stat .v.none{{color:var(--ac2);}}
.stat .l{{font-size:40px;font-weight:600;color:#c3d2df;}}
.cta{{display:flex;flex-direction:column;gap:26px;}}
.cbtn{{display:flex;align-items:center;gap:22px;padding:40px 44px;border-radius:24px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);}}
.cbtn .ic{{width:70px;height:70px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:900;flex:0 0 auto;}}
.cbtn .na{{background:#03c75a;color:#fff;}} .cbtn .ti{{background:#ff5a2e;color:#fff;}}
.cbtn .tx{{display:flex;flex-direction:column;}}
.cbtn .tx .l{{font-size:34px;font-weight:800;color:#f4f9fb;}}
.cbtn .tx .u{{font-size:30px;font-weight:600;color:#9fb4c6;margin-top:4px;}}
.foot{{position:absolute;left:92px;right:92px;bottom:78px;display:flex;align-items:center;justify-content:space-between;
 border-top:1px solid rgba(255,255,255,0.1);padding-top:34px;}}
.brand{{display:flex;align-items:center;gap:18px;font-size:36px;font-weight:800;color:#dbe7f0;}}
.brand .mk{{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--ac),#3862b4);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;color:#06131f;}}
.ep{{font-size:32px;font-weight:700;color:#7f97ab;}}
.wm{{position:absolute;right:70px;top:150px;font-size:300px;font-weight:900;color:rgba(255,255,255,0.035);line-height:1;}}
</style>"""

def card_html(c,i,total,spec):
    ac,ac2=spec["accent"],spec["accent2"]; idx=i+1
    P=[f'<div class="wm">{idx:02d}</div>',
       '<div class="dots">'+''.join(f'<div class="dot{" on" if j<=i else ""}"></div>' for j in range(total))+'</div>',
       '<div class="wrap">',
       f'<div class="chip"><span class="no">{idx:02d}</span>{c["tag"]}</div>',
       f'<div class="title">{c["title"]}</div>']
    if c.get("sub"): P.append(f'<div class="sub">{c["sub"]}</div>')
    P.append('<div class="stage">')
    if "flow" in c:
        h='<div class="flow">'
        for k,st in enumerate(c["flow"]):
            h+=f'<div class="fbox">{st}</div>'+('<div class="farrow">↓</div>' if k<len(c["flow"])-1 else '')
        P.append(h+'</div>')
    elif "grid" in c:
        h='<div class="grid">'
        for cell in c["grid"]:
            if "\n" in cell:
                k,e=cell.split("\n",1); h+=f'<div class="gcell"><div class="k">{k}</div><span class="e">{e}</span></div>'
            else: h+=f'<div class="gcell"><div class="k">{cell}</div></div>'
        P.append(h+'</div>')
    elif "stat" in c:
        s=c["stat"]; P.append(f'<div class="stat"><div class="v {s.get("tone","none")}">{s["value"]}</div><div class="l">{s["label"]}</div></div>')
    elif c.get("cta"):
        cta=spec["cta"]
        P.append('<div class="cta">'
          f'<div class="cbtn"><div class="ic na">N</div><div class="tx"><span class="l">네이버 블로그</span><span class="u">{cta["naver"]}</span></div></div>'
          f'<div class="cbtn"><div class="ic ti">T</div><div class="tx"><span class="l">티스토리</span><span class="u">{cta["tistory"]}</span></div></div>'
          '</div>')
    elif "big" in c: P.append(f'<div class="big">{c["big"]}</div>')
    P.append('</div></div>')
    P.append(f'<div class="foot"><div class="brand"><div class="mk">S</div>{spec["footer_brand"]}</div><div class="ep">{spec["series"]} #{idx:02d}</div></div>')
    return "<!doctype html><html><head><meta charset='utf-8'>"+css(ac,ac2)+"</head><body>"+''.join(P)+"</body></html>"

# ---------- narration ----------
def strip_tags(s): return re.sub(r'<[^>]+>','',s.replace('<br>',' ')).strip()
def narration_for(c):
    if c.get("narration"): return c["narration"]
    parts=[strip_tags(c.get("title",""))]
    if c.get("sub"): parts.append(strip_tags(c["sub"]))
    if "big" in c: parts.append(strip_tags(c["big"]))
    elif "stat" in c: parts.append(f'{c["stat"]["label"]} {c["stat"]["value"]}')
    elif "flow" in c: parts.append(", ".join(c["flow"]))
    elif "grid" in c: parts.append(", ".join(x.replace(chr(10)," ") for x in c["grid"]))
    return ". ".join(p for p in parts if p)

# ---------- offline TTS ----------
# Default voice: Supertonic 3 (Korean, multi-speaker, no espeak). Auto-downloaded from GitHub
# release if no model present. sid 9 = deep male (중후한 남성); male voices are sid 6,7,8,9.
SUPERTONIC_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2"
SUPERTONIC_DIR="sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
DEFAULT_MALE_SID=9
_ST_NEED=["duration_predictor.int8.onnx","text_encoder.int8.onnx","vector_estimator.int8.onnx",
          "vocoder.int8.onnx","tts.json","unicode_indexer.bin","voice.bin"]

def _is_supertonic(d): return d and all(os.path.exists(os.path.join(d,n)) for n in _ST_NEED)

def ensure_voice(voice_dir):
    """Return a usable model dir, downloading Supertonic if needed. None if unavailable."""
    if voice_dir and os.path.isdir(voice_dir):
        if _is_supertonic(voice_dir): return voice_dir
        if _is_supertonic(os.path.join(voice_dir,SUPERTONIC_DIR)): return os.path.join(voice_dir,SUPERTONIC_DIR)
        if os.path.exists(os.path.join(voice_dir,"model.onnx")): return voice_dir  # mms/vits/kokoro
    cache=voice_dir if (voice_dir and os.path.isdir(voice_dir)) else "/tmp/_stvoice"
    os.makedirs(cache,exist_ok=True)
    sub=os.path.join(cache,SUPERTONIC_DIR)
    if _is_supertonic(sub): return sub
    try:
        tb=os.path.join(cache,"st.tar.bz2"); print("[voice] downloading supertonic...")
        if subprocess.run(["curl","-sL","--max-time","300",SUPERTONIC_URL,"-o",tb]).returncode or not os.path.exists(tb):
            raise RuntimeError("download failed")
        subprocess.run(["tar","xjf",tb,"-C",cache],check=True)
        return sub if _is_supertonic(sub) else None
    except Exception as e:
        print("[voice] supertonic fetch failed:",repr(e)); return None

def load_tts(mdir):
    import sherpa_onnx
    f=lambda n: os.path.join(mdir,n)
    mc=sherpa_onnx.OfflineTtsModelConfig(num_threads=4,provider="cpu")
    if _is_supertonic(mdir):
        mc.supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=f("duration_predictor.int8.onnx"),text_encoder=f("text_encoder.int8.onnx"),
            vector_estimator=f("vector_estimator.int8.onnx"),vocoder=f("vocoder.int8.onnx"),
            tts_json=f("tts.json"),unicode_indexer=f("unicode_indexer.bin"),voice_style=f("voice.bin"))
        return sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=mc,max_num_sentences=1))
    model=f("model.onnx"); tokens=f("tokens.txt")
    if not os.path.exists(model):
        on=[x for x in os.listdir(mdir) if x.endswith(".onnx")]
        if not on: raise FileNotFoundError("no model in voice dir")
        model=f(on[0])
    dd=f("espeak-ng-data"); dd=dd if os.path.isdir(dd) else ""
    dcd=f("dict"); dcd=dcd if os.path.isdir(dcd) else ""
    voices=f("voices.bin")
    if os.path.exists(voices):
        lex=",".join(f(x) for x in os.listdir(mdir) if x.startswith("lexicon") and x.endswith(".txt"))
        mc.kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=model,voices=voices,tokens=tokens,data_dir=dd,dict_dir=dcd,lexicon=lex)
    else:
        mc.vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=model,tokens=tokens,data_dir=dd,dict_dir=dcd)
    return sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=mc,max_num_sentences=1))

def synth_voice(spec, voice_dir, sid, speed):
    """Return (wav_path, per_card_durations) or (None, None) on failure."""
    import numpy as np
    try:
        mdir=ensure_voice(voice_dir)
        if not mdir: raise RuntimeError("no usable voice model")
        tts=load_tts(mdir)
        lead, tail = 0.45, 0.6
        clips=[]; sr=None
        for c in spec["cards"]:
            a=tts.generate(narration_for(c), sid=sid, speed=speed)
            if not a.samples: raise RuntimeError("empty audio")
            sr=a.sample_rate; clips.append(np.array(a.samples,'float32'))
        durs=[]; segs=[]
        for c,clip in zip(spec["cards"],clips):
            need=lead+len(clip)/sr+tail
            d=max(float(c.get("dur",6.0)), round(need,2)); d=min(d,11.0)
            durs.append(d)
            seg=np.zeros(int(d*sr),'float32'); st=int(lead*sr); n=min(len(clip),len(seg)-st)
            if n>0: seg[st:st+n]=clip[:n]
            segs.append(seg)
        track=np.clip(np.concatenate(segs),-1,1)
        wavp="/tmp/_voice_track_%d.wav"%os.getpid()
        with wave.open(wavp,'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((track*32767).astype('<i2').tobytes())
        return wavp, durs
    except Exception as e:
        print("[voice] disabled (fallback to silent):", repr(e)); return None, None

# ---------- render ----------
async def render_cards(spec,cdir):
    total=len(spec["cards"])
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={"width":W,"height":H},device_scale_factor=1)
        for i,c in enumerate(spec["cards"]):
            await pg.set_content(card_html(c,i,total,spec),wait_until="networkidle")
            await pg.wait_for_timeout(100)
            await pg.screenshot(path=f"{cdir}/c{i:02d}.jpg",type="jpeg",quality=92)
        await b.close()

def render_video(spec,durs,cdir,sdir,voice_wav,out):
    scenes=[]
    for i,c in enumerate(spec["cards"]):
        dur=durs[i]; img=f"{cdir}/c{i:02d}.jpg"; o=f"{sdir}/s{i:02d}.mp4"; tmp=o+".tmp.mp4"
        cx=f"(in_w-1080)*(t/{dur})" if i%2==0 else f"(in_w-1080)*(1-t/{dur})"
        vf=f"scale=1123:1996,crop=1080:1920:x='{cx}':y='(in_h-1920)/2',fade=t=in:st=0:d={FADE},format=yuv420p"
        r=subprocess.run(["ffmpeg","-y","-loop","1","-framerate","30","-t",f"{dur}","-i",img,"-vf",vf,
            "-r","30","-c:v","libx264","-crf","18","-preset","veryfast","-pix_fmt","yuv420p",tmp],capture_output=True,text=True)
        if r.returncode!=0: print(r.stderr[-900:]); raise SystemExit(1)
        os.replace(tmp,o); scenes.append(o)
    lst=f"{sdir}/list.txt"; open(lst,"w").write("".join(f"file '{s}'\n" for s in scenes))
    silent=out if not voice_wav else out+".silent.mp4"
    r=subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",lst,"-c","copy",silent],capture_output=True,text=True)
    if r.returncode!=0: print(r.stderr[-900:]); raise SystemExit(1)
    if voice_wav:
        r=subprocess.run(["ffmpeg","-y","-i",silent,"-i",voice_wav,"-map","0:v","-map","1:a",
            "-c:v","copy","-c:a","aac","-b:a","160k","-shortest",out],capture_output=True,text=True)
        if r.returncode!=0: print(r.stderr[-900:]); raise SystemExit(1)
        os.remove(silent)

def main():
    spec=json.load(open(sys.argv[1])); out=sys.argv[2]
    voice_dir=sys.argv[3] if len(sys.argv)>3 else os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])),"voice")
    base=os.path.dirname(os.path.abspath(out)); name=os.path.splitext(os.path.basename(out))[0]
    cdir=f"{base}/{name}_cards"; sdir=f"{base}/{name}_scenes"; os.makedirs(cdir,exist_ok=True); os.makedirs(sdir,exist_ok=True)
    voice_wav=None; durs=[float(c.get("dur",6.0)) for c in spec["cards"]]
    if os.environ.get("NO_VOICE")!="1":
        sid=int(spec.get("voice_sid",DEFAULT_MALE_SID)); speed=float(spec.get("voice_speed",1.0))
        vw,vd=synth_voice(spec,voice_dir,sid,speed)
        if vw: voice_wav,durs=vw,vd
    asyncio.run(render_cards(spec,cdir))
    render_video(spec,durs,cdir,sdir,voice_wav,out)
    d=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",out],capture_output=True,text=True).stdout.strip()
    print(f"OK {out} {os.path.getsize(out)//1024}KB dur={d}s voice={'YES' if voice_wav else 'no(caption-only)'} cards={len(spec['cards'])}")

if __name__=="__main__": main()
