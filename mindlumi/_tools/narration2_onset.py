#!/usr/bin/env python3
"""숏츠의 두 번째 음성이 들리기 시작하는 시각을 잰다 (2026-11-22).
배경음이 깔려 있어 무음 검출로는 안 잡힌다. 말소리 대역(300~3400Hz)의 0.1초 단위 크기가
9.5~12.5초 구간 중앙값보다 8dB 넘게 두 칸 연속 올라가는 첫 시각을 낸다.
쓰는 법: python3 narration2_onset.py <mp4> [<mp4> ...]   → 예시 장면 시작(20초 판 12.7초)과 0.5초 안이면 success
"""
import subprocess, sys
import numpy as np

SCENE_AT = 12.7
for f in sys.argv[1:]:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-af', 'highpass=f=300,lowpass=f=3400',
                          '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(float)
    w = 1600
    db = np.array([20 * np.log10(np.sqrt((a[i:i + w] ** 2).mean()) + 1) for i in range(0, len(a) - w, w)])
    base = float(np.median(db[95:125]))
    on = [i for i in range(110, min(175, len(db) - 1)) if db[i] > base + 8 and db[i + 1] > base + 8]
    if not on:
        print(f'{f}: failure - 두 번째 음성을 찾지 못함'); continue
    t = on[0] / 10
    print(f'{f}: 두 번째 음성 {t:.1f}초 (예시 장면 {SCENE_AT}초, 차이 {t - SCENE_AT:+.1f}초) - {"success" if abs(t - SCENE_AT) <= 0.5 else "failure"}')
