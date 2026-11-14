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
