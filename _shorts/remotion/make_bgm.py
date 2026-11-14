import numpy as np, wave
sr=44100; bpm=78; beat=60/bpm; bar=4*beat; BARS=4; T=bar*BARS
N=int(T*sr); t=np.arange(N)/sr
def env(start,dur,a=0.005,d=None,sus=0.0,rel=0.08,peak=1.0):
    e=np.zeros(N); s=int(start*sr); L=int(dur*sr)
    if s>=N: return e
    L=min(L,N-s); seg=np.zeros(L); ai=int(a*sr)
    if d is None: d=dur*0.6
    di=int(d*sr); ri=int(rel*sr)
    for i in range(L):
        if i<ai: v=i/max(ai,1)
        elif i<ai+di: v=1-(1-sus)*((i-ai)/max(di,1))
        elif i<L-ri: v=sus
        else: v=sus*(1-(i-(L-ri))/max(ri,1))
        seg[i]=v*peak
    e[s:s+L]=seg; return e
def sine(f,ph=0): return np.sin(2*np.pi*f*t+ph)
mix=np.zeros(N)
# --- drums ---
def kick(start):
    s=int(start*sr); L=int(0.28*sr); i=np.arange(L)
    f=90*np.exp(-i/ (0.03*sr))+48
    ph=np.cumsum(2*np.pi*f/sr); sig=np.sin(ph)*np.exp(-i/(0.14*sr))
    o=np.zeros(N); e=min(s+L,N); o[s:e]=sig[:e-s]*0.9; return o
def hat(start,amp=0.06):
    s=int(start*sr); L=int(0.04*sr); n=np.random.randn(L)*np.exp(-np.arange(L)/(0.012*sr))
    o=np.zeros(N); e=min(s+L,N); o[s:e]=n[:e-s]*amp; return o
def clap(start,amp=0.14):
    s=int(start*sr); L=int(0.12*sr); n=np.random.randn(L)*np.exp(-np.arange(L)/(0.05*sr))
    # bandpass-ish by diff
    n=np.convolve(n,[1,-0.6],'same')
    o=np.zeros(N); e=min(s+L,N); o[s:e]=n[:e-s]*amp; return o
for b in range(BARS):
    bs=b*bar
    for beatpos in [0,2]: mix+=kick(bs+beatpos*beat)
    for beatpos in [1,3]: mix+=clap(bs+beatpos*beat)
    k=0
    while k<4:  # 8th-note hats, swing
        mix+=hat(bs+k*beat, 0.05)
        mix+=hat(bs+(k+0.5)*beat+0.02, 0.03)
        k+=1
# --- chords Cmaj7 Am7 Dm7 G7 ---
chords=[[261.63,329.63,392.00,493.88],[220,261.63,329.63,392],[293.66,349.23,440,523.25],[196,246.94,293.66,349.23]]
roots=[65.41,55.0,73.42,98.0]
for b in range(BARS):
    bs=b*bar
    e=env(bs,bar*0.98,a=0.02,d=bar*0.5,sus=0.5,rel=0.15,peak=1.0)
    pad=np.zeros(N)
    for f in chords[b%4]:
        pad+=sine(f)*0.25+sine(f*1.003)*0.18  # slight detune
    mix+=pad*e*0.16
    # bass
    be=env(bs,beat*1.6,a=0.01,d=beat*0.8,sus=0.3,rel=0.1,peak=1.0)
    be2=env(bs+2*beat,beat*1.6,a=0.01,d=beat*0.8,sus=0.3,rel=0.1,peak=1.0)
    r=roots[b%4]; mix+=sine(r)*(be+be2)*0.5
# master: gentle lowpass (1-pole), soft clip, normalize
def lp(x,cut=3200):
    a=np.exp(-2*np.pi*cut/sr); y=np.zeros_like(x); p=0
    for i in range(len(x)):
        p=a*p+(1-a)*x[i]; y[i]=p
    return y
mix=lp(mix,3400)
mix=np.tanh(mix*1.2)
mix/=np.max(np.abs(mix))+1e-9; mix*=0.72
# write wav then mp3
pcm=(mix*32767).astype('<i2')
with wave.open('/tmp/lofi.wav','wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
print("lofi", round(T,2),"s loop")
