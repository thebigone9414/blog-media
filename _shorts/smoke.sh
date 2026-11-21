#!/usr/bin/env bash
# 숏츠 엔진 연기 시험 - 엔진(remotion/src, make_remotion.py)을 고쳤으면 커밋 전에 반드시 돌린다.
# 2026-11-20 에 줄 주석 하나로 MindLumi 렌더가 전부 깨진 채 푸시된 일이 있었다. 그 뒤로 만든 것.
# 사용: bash _shorts/smoke.sh        (저장소 루트에서. 두 편을 실제로 렌더한다. 3~5분)
set -u
cd "$(dirname "$0")/.."
out="${TMPDIR:-/tmp}/shorts-smoke"; mkdir -p "$out"; fail=0
ml=$(ls _shorts/spec_mindlumi_*-m.json 2>/dev/null | tail -1)
for spec in "$ml" _shorts/templates/sureview_slide.json; do
  [ -f "$spec" ] || { echo "SKIP 없음: $spec"; continue; }
  name=$(basename "$spec" .json)
  if python3 _shorts/make_remotion.py "$spec" "$out/$name.mp4" _shorts/voice >"$out/$name.log" 2>&1; then
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/$name.mp4" 2>/dev/null)
    echo "success $name ${d}s"
  else
    echo "failure $name - $(tail -1 "$out/$name.log" | cut -c1-200)"; fail=1
  fi
done
exit $fail
