# 트렌드코어 스킬공유자료실 - 정리 & 주간 모니터링

출처: https://www.trendcore.co.kr (스킬공유자료실, 무료). SureView 자동화·마케팅에 반영할 만한 것을 추린다.
WebFetch는 이 사이트를 차단하므로 읽을 때는 내장 브라우저(built-in browser)를 쓴다.

## 최종 확인 가이드 번호: 076  (이 번호보다 큰 새 글이 나오면 모니터링 트리거가 읽고 아래에 추가한다)

## 지금까지 확인한 자료 (2026-11-14 기준)

### #058 촬영0·편집0, 조회수 백만 (제작 공식) - ★핵심, 이미 반영
- 7단계 공식: 레퍼런스 분석 → 대본(훅) → 단어 시각표 → 장면표 → 단어별 모션 → 소리 → 검사.
- 훅 공식, 카라오케 자막(지난 단어 회색·현재 단어 강조), 문장=장면, 배경음 낮게, -14 LUFS, 검사 게이트, "쓸수록 똑똑해지는 폴더".
- SureView 반영: playbook.md 제작 공식·검증 게이트·피드백 루프 = 이 가이드 기반. Remotion 엔진이 카라오케 자막·모션 구현.

### #076 영상 편집 자동화 (도구) - 부분 반영
- 도구: yt-dlp(레퍼런스 다운로드) · Whisper(자막 단어 타이밍) · Remotion(모션 그래픽) · ffmpeg.
- SureView 반영: Remotion·ffmpeg 사용 중. Whisper는 직접 합성이라 불필요(음절 비례로 타이밍 계산). yt-dlp는 원문 기반 제작이라 불필요.

### #070 효과음 3종 (earshot·real-sound·Openverse) - 선택(미반영)
- earshot(코드로 효과음 생성·점수화), real-sound(프레임 단위 배치, -14 LUFS), Openverse API(무료 효과음 500만, CC0/CC BY).
- SureView 판단: 무인 클라우드 트리거는 Openverse·torch 모델 다운로드가 제한적. 현재는 lo-fi 배경음(자체 생성)으로 충분. 전환 효과음이 필요해지면 ffmpeg로 생성해 추가 검토.

### #067 마케팅 스킬 52종 (coreyhaines31/marketingskills) - 로컬 권장
- product-marketing 기준문서 + content-strategy·social·analytics·ab-testing·marketing-loops·cro 등 52개 스킬.
- SureView 판단: 트리거(무인)보다 종모님 PC 로컬 Claude Code에 설치해 기획·분석·카피에 쓰는 게 적합. 설치: `.claude/skills` 에 marketingskills 저장소. (피드백 루프의 analytics·marketing-loops 개념은 이미 playbook에 반영)

## 주간 모니터링 방식 (트리거가 매주 수행)
1. 내장 브라우저로 트렌드코어 자료실을 열어 최신 글 번호를 확인한다.
2. "최종 확인 가이드 번호"보다 큰 새 글을 읽는다.
3. 자동화·마케팅(특히 무인 숏폼 제작·발행·성과)에 도움되는 포인트를 추린다.
4. 바로 반영 가능한 것(playbook 규칙 추가 등)은 반영하고, 큰 변경(엔진·새 도구)은 종모님께 "이런 게 새로 나왔고 이렇게 반영하면 좋겠다" 제안만 한다.
5. 이 문서에 새 글 요약 + 반영/제안을 추가하고 "최종 확인 가이드 번호"를 갱신한다.
