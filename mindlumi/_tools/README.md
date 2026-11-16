# MindLumi 인포그래픽 생성 규칙

`infographic_template.py` 는 2026-11-14 젠슨 황 글에 쓴 실제 스크립트다.
매 글마다 내용은 다르니 이 파일을 복사해 섹션만 바꿔 쓴다. 아래는 고정이다.

## 고정 사양
- 크기 2000 x 2560 (섹션 3개 기준). 섹션이 늘면 높이를 늘린다 - 겹치면 안 된다.
- 폰트 Noto Sans CJK, **index=1** (index 0 은 일본어라 한글이 깨진다)
  - Bold `/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc`
  - Regular `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`
  - Medium `/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc`
- 팔레트: NAVY #0F172A / BLUE #2563EB / BLUE_L #DBEAFE / GRAY #64748B / GRAY_L #F1F5F9 / RED #BE185D (화기 강조 전용)
- 좌우 여백 110px
- 외부 이미지 금지. 전부 도형과 글자로 그린다 (저작권 안전 + 재생성 가능)
- 머리글은 `MindLumi · 자미두수 해석`
- 푸터에 명반 기준(생년·시진·국·명궁)과 면책 한 줄을 반드시 넣는다

## 금지
- 실명 인물 글: 제3자(배우자·상대방) 이름 금지, 단정 표현 금지
- 흉격 이름 노출 금지, 「깎인다」 계열 표현 금지
- 투자 조언으로 읽힐 표현 금지

## capture_chart.mjs - 인물 글용 실제 명반 캡처 (2026-11-16)

관리자 로그인도 운영자 PC 도 필요 없다. Star-Chart 를 이 컨테이너에서 개발 서버로 띄워 사이트와 같은 화면을 찍는다.
원반·제2명반·중첩 3장이 나온다. 외부 요청은 전부 막고, 고객 기록은 불러오지 않는다.

```
git clone https://github.com/thebigone9414/Star-Chart.git && (cd Star-Chart && npm install --no-audit --no-fund)
node mindlumi/_tools/capture_chart.mjs ./Star-Chart mindlumi jensen 1963-02-17 solar male 묘 "젠슨 황"
```

⛔ 공개 인물과 표본 명반에만 쓴다. 실고객 생년월일시를 넣지 않는다.
