# SureView 숏폼 자동 생성기 (_shorts)

주간 콘텐츠(감리/AI/시황)를 **유튜브 쇼츠용 세로 영상**(자막 카드형)으로 자동 생성한다.
음성 없는 자막 카드형이며, 트리거(무인 실행)에서 그대로 호출한다.

## 사용법
```
python3 _shorts/make_short.py <spec.json> <out.mp4>
```
- 출력: 1080x1920, 30fps, 카드 수에 따라 약 50~55초, H.264 mp4 (음성 트랙 없음).
- 의존: ffmpeg, python3-playwright(chromium), Noto Sans CJK KR. (트리거 컨테이너에 기본 설치됨)

## spec.json 스키마
```json
{
  "series":"감리사로 가는 길",       // 하단/칩에 쓰는 시리즈명
  "accent":"#2dd4bf", "accent2":"#fbbf24",
  "footer_brand":"SureView",
  "cta":{"naver":"blog.naver.com/sureview26","tistory":"sureview.tistory.com"},
  "cards":[ /* 8장 권장: 훅 1 + 내용 6 + CTA 1 */
    {"tag":"칩 라벨","dur":5.0,"title":"제목(<b>강조</b>/<em>포인트</em>/<br>줄바꿈 가능)","sub":"부제 한 줄",
      // 아래 중 하나만:
      "big":"강조 한 줄",                                   // 핵심 문구 박스
      "flow":["지적","개선 조치","확인"],                    // 세로 플로우(화살표)
      "grid":["효과성\nEffectiveness","효율성\nEfficiency"], // 2열 그리드(윗줄\n아랫줄)
      "stat":{"value":"+4.56%","label":"코스피 주간","tone":"up"}, // 큰 숫자(up=초록/down=빨강/none=앰버)
      "cta":true                                            // 마지막 카드: 네이버/티스토리 유도
    }
  ]
}
```
- `dur` 합이 영상 길이. 훅 5초, 내용 6.5~7초, CTA 7초 권장(총 약 52초).
- 마지막 카드는 반드시 `"cta":true`.

## 시리즈별 색상 프리셋
- 감리사로 가는 길: accent `#2dd4bf`, accent2 `#fbbf24`
- 주간 AI 브리핑: accent `#a78bfa`, accent2 `#22d3ee`
- 주간 시황 브리핑: accent `#34d399`, accent2 `#fbbf24` (상승 초록·하락 빨강 자동)

## ★작성 규칙 (SureView 전 콘텐츠 공통)
- 대시는 하이픈 `-` 하나만. em 대시(—)·en 대시(–) 금지.
- 「컴퓨트」 금지 → 연산/컴퓨팅.
- 카드 문구는 짧게(제목 2줄 이내, 한 줄 20자 안팎). 그 주 글의 핵심만 6장으로 압축.
- 숫자가 핵심인 카드는 `stat`, 대비/절차는 `flow`, 나열은 `grid`로.
- 자막만으로 이해되게(음성 없음). 과장·허위 금지, 원문(그 주 발행 글) 사실만.

## 트리거 연동(요지)
1. 그 주 글을 발행한 뒤, 글 핵심을 요약해 spec.json 작성(위 규칙).
2. `python3 _shorts/make_short.py spec.json out.mp4` 실행 → 렌더된 프레임 1~2장 Read로 확인.
3. mp4를 `shorts/<series>/<id>.mp4`로 커밋·푸시 → raw URL 확보.
4. 유튜브 채널이 uplika에 연결돼 있으면 media_from_url(mp4) → publish(options.youtube, privacyStatus public).
   연결 안 돼 있으면 mp4를 SendUserFile로 전달하고 그 사실을 1줄 보고.
