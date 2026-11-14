# MindLumi 숏폼 제작 규칙

공용 엔진(`make_remotion.py` + `remotion/src/SureViewShort.tsx`)은 SureView 와 같이 쓴다.
여기에는 MindLumi(자미두수) 쪽에만 해당하는 것만 적는다.

## 1. 브랜드 값

```
series        "MindLumi"
footer_brand  "MindLumi"        배지 글자는 머리글자(M)가 자동으로 찍힌다
accent        "#a855f7"         accent2  "#f5c542"
voice_sid     8                 voice_speed 1.1
cta           { naver, tistory, site: "mindlumi.ai",
                siteLabel: "내 원반과 제2명반 무료로 보기" }
```

⭐ CTA 는 `site` 가 주인공이다. 블로그는 그 아래 한 줄로 내린다.
   결국 파는 것은 mindlumi.ai 이지 블로그가 아니다 (운영자 지정 2026-11-14).

## 2. ★인물 숏폼은 이름이 전면에 나온다 (운영자 지정 2026-11-15)

```
⛔ 「원반만 보면 결별의 자리였다」처럼 인물 없이 개념만 띄우면 밋밋해서 안 눌린다
⭐ 1번 카드 title 에 인물 이름을 크게      <b>젠슨 황</b>의 부처궁
⭐ 1번 카드 narration 첫 단어도 이름부터   "젠슨 황의 부처궁입니다. ..."
⭐ 유튜브 제목도 이름으로 시작             "젠슨 황의 부처궁 - 원반엔 없던 화탐격이 ..."
⭐ 태그·설명에도 인물명을 넣는다
⛔ 단, 글과 같은 금지선을 지킨다 - 보도된 사실만, 단정 금지, 제3자 실명 금지, 정치인 금지
```

## 3. ★실제 명반을 증거로 한 장 넣는다

```
전체 명반(1064x689)을 그대로 넣으면 글자가 작아 못 읽는다.
⭐ 해당 궁 한 칸만 크롭해서 확대한 컷을 쓴다.

  from PIL import Image
  im = Image.open('mindlumi/jensen-chart-overlay.png')
  im.crop((796,176,1062,284)).resize((266*4,108*4), Image.LANCZOS).save(out)

⭐ 그 카드에 반드시 "fit": "contain" 을 준다
  ⛔ 안 주면 objectFit:cover 가 좌우를 잘라 별 이름이 반쯤 날아간다 (2026-11-15 실제로 그랬다)
⭐ caption 으로 무엇인지 한 줄 달아 준다   "실제 중첩 명반 - 한 칸에 화성과 탐랑(化忌)"
```

## 4. 캐릭터 그림

```
위치   _shorts/assets/mindlumi/raw/01..22.png  ·  star/<별이름>.png  ·  mapping.json
사용   card.image (1장) 또는 card.images (2장)
       캐릭터는 fit 을 주지 않는다 (cover 로 꽉 채우는 게 낫다)
없는 별 타라 · 천괴 · 천월
```

## 5. 길이

```
⛔ 60초를 넘기면 쇼츠가 아니다
엔진은 말이 잘리지 않게 카드를 늘리므로, 길면 카드 수가 아니라 narration 글자 수를 줄인다
8카드 기준 narration 합계 370~400자면 57~58초가 나온다
```

## 6. 교체 절차 (이미 올린 영상을 바꿀 때)

```
유튜브는 영상 파일 교체가 안 된다. 새로 올리고 옛 영상을 비공개로 내린다.
1. 새 mp4 를 blog-media 에 커밋·푸시 → media_from_url → publish (privacyStatus public)
2. 옛 post 를 update_post 로 title 앞에 [교체됨], privacyStatus "private"
⭐ 올릴 때마다 options.youtube 에 madeForKids: false 를 넣는다 (채널은 2026-11-15 「아동용 아님」으로 설정됨)
   빠뜨리면 경고가 뜨고 Studio 편집이 막힌다
```

## 7. 자가검증과 개선 (무승인 자동 - 운영자 지정 2026-11-15)

```
올리기 전  8카드 전부 프레임을 떠서 직접 본다. 잘림·겹침·빈 카드·자막 띠 침범이 있으면 올리지 않는다
만들기 전  mindlumi/playbook.md §2 개선 절차를 돈다
개선 반영  이 문서와 플레이북의 수정은 운영자에게 묻지 않고 바로 반영한다. 사후에 무엇을 바꿨는지만 보고
```
