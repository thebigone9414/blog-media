# MindLumi 주간 제작 절차서

예약 작업 「MindLumi 주간 제작」(월 07:40)과 「MindLumi 자동화 점검」(보수할 때)이 이 문서를 읽고 그대로 수행한다.
한 번에 그 주 글 3편(화·목·토)과 숏츠 3~4편(이틀에 1편)을 만들어 예약한다.

★완전 자동이다. 운영자가 모든 단계를 사전 승인했다. 질문하지 않는다. 승인 창이 뜨는 도구는 쓰지 않는다.
★승인 대신 자가검증([5] 글, [8] 영상)을 통과해야 나간다. 통과 못 한 것은 고쳐서 다시 본다.
★막히면 멈추지 않는다. [막혔을 때] 표대로 우회하고, 끝까지 간다. 「못 했다」로 끝내는 것은 마지막 수단이다.
★목표는 mindlumi.ai 유입과 결제다.

역할: 기획·명반 해석·글·최종 판단은 직접. 반복 작업(수치 세기·그림 생성·렌더링·프레임 추출)은 Agent 도구 model "sonnet" 하위 작업자에게 맡겨도 된다. 사실·명반 교차 검증은 sonnet 이상.

## [0] 준비 - 2026-11-16 에 실제로 막혔던 곳부터 확인한다

```
1. TZ=Asia/Seoul date
2. 이 저장소에 푸시가 되는지 먼저 확인한다 (지난번에 여기서 전부 멈췄다)
   echo "$(TZ=Asia/Seoul date +%F\ %T) weekly" >> mindlumi/.heartbeat && git add -A && git commit -qm heartbeat && git push origin main
   안 되면 add_repo(owner thebigone9414, repo blog-media, access push) 를 부른다. 그래도 안 되면 [막혔을 때] ①
3. Projects 도구로 JAMI 문서: claude/naver-style.md(글 규칙·검증) · claude/content-ops.md(캐던스·런웨이·금지선)
4. 저장소: mindlumi/playbook.md(개선 절차·공식) · mindlumi/index.json · _shorts/mindlumi_rules.md · mindlumi/shorts-benchmark.md
5. 인계 문서가 남아 있으면(JAMI 문서 claude/weekly-*-handoff.md 중 「발행 0건」) 새로 쓰지 말고 그 원고로 [4]의 이미지부터 이어서 한다
6. uplika 가 안 보이면 RefreshMcpTools
```

## [1] 개선 절차 - `mindlumi/playbook.md` §2 그대로 (성과 회수 → 잘 되는 숏츠 뜯기 → 1~2가지만 변경)

데이터를 못 읽으면 「데이터 부족」이라 적고 넘어간다. 여기서 멈추지 않는다.

## [2] 소재 3건

```
화  뉴스 인물형 - 외국인 · 생시 확인 · 정치인 금지
    ★명반 캡처는 관리자 로그인도 운영자 PC 도 필요 없다 (2026-11-16 부터). 이 컨테이너에서 바로 찍는다
      Star-Chart 를 clone 하고 npm install 한 뒤
      node mindlumi/_tools/capture_chart.mjs <Star-Chart 경로> mindlumi <slug> <YYYY-MM-DD> <solar|lunar> <male|female> <시진 한 글자> "<표시 이름>"
      → mindlumi/<slug>-chart-wonban.png · -secondary.png · -overlay.png (사이트와 같은 코드·같은 엔진의 화면)
      찍은 뒤 Read 로 열어 [3]의 계산 결과와 궁·별이 같은지 대조한다
    쓸 만한 인물·사건이 없는 주에만 상시 검색형으로 대체한다 (캡처 때문에 대체하는 일은 이제 없다)
목  상시 검색형 - 「자미두수로 ○○운 보는 법」 형태 우선
토  시점형 - content-ops.md 런웨이 표에서 지금 런웨이 중인 시즌
index.json 에 있는 주제는 다시 쓰지 않는다
```

## [3] 명반 근거는 실제 계산으로

Star-Chart 저장소(add_repo read 또는 공개 clone)의 `src/components/PublicChartView.tsx` `buildPublicChart(...)` 를 vitest/tsx 로 불러 원반·제2명반을 덤프한다. 소한·대한은 `src/engine/ChronologyEngine.ts`, 사화표는 `src/engine/unhan/UnhanTypes.ts` 의 SIHUA_MAP.
⛔ 원반만 보고 제2명반을 단정하지 않는다. ⛔ 관리자 게이트는 읽기만. ⛔ 표본 명반만 쓴다(실고객 금지).

## [4] 글과 이미지

```
글      claude/naver-style.md 그대로. 평어체, 번호 소제목, 구분선, 형광펜 1~2, 2,000~3,000자, 기존 글 링크
그림    python3 mindlumi/_tools/mkimg_cards.py <imgs.json> <outdir>   (카드형 인포그래픽. 섹션당 1장)
        Read 로 한 장 이상 직접 열어 글자 겹침을 본다
올리기  mindlumi/w<주차>/ 에 커밋·푸시 → raw URL → uplika media_from_url → ![alt](media:<id>) {.center}
        ⛔ aiGenerated 를 붙이지 않는다 (네이버가 「AI 활용」 딱지를 단다)
        CTA 그림은 mindlumi/jensen-4-cta.png 를 media_from_url 로 다시 올려 쓴다 {.center .link=https://mindlumi.ai/?ref=blog}
```

## [5] 글 자가검증 - claude/naver-style.md §3

스크립트로 세어 수치를 남긴다. 0 이어야 하는 것: 존댓말·U+200B·`**`·em/en 대시·「컴퓨트」·`##`·마크다운 표·면책 문구·금지어.
기준: 이미지 3장 이상 / 문단 평균 80~100자 / 최장 200자 / 단독 문단 3개 이하 / 인물 글이면 명반 캡처 2장.
명반 서술이 [3] 계산과 일치하는지, 링크한 글이 실재하는지 확인. 하위 작업자 교차 점검.
네이버 확장이 offline 이라 open_post 가 안 되면 uplika 보관본(list_posts)과 비교하고 넘어간다. 여기서 멈추지 않는다.

## [6] 네이버 예약

```
publish  accountIds ["conn_1454e4b39c72db9a"]  workspaceId "ws_f7979700dc84fc70"
         scheduledAt  화 07:30 · 목 07:30 · 토 21:00 (+09:00)   ⛔ 심야 금지
         options.naver_blog { title, categoryId(명반 해석 21 · 자미두수 기본 20 · 전서 12 · 서비스 22),
                              layout "as-is", openType "public", tags 10~15, seoKeywords }
확장이 offline 이어도 예약은 그대로 건다. 글은 확장이 돌아오면 나간다(최대 7일)
응답의 status 가 scheduled 인지 확인한다
```

## [7] 숏폼 - 이틀에 1편 (주 3~4편) · `_shorts/mindlumi_rules.md` §1-1 · §1-2 그대로

```
★전부 찾아보기형 pop 판, 10~12초 1장. 눈에 확 띄게 만든다 (운영자 지정 2026-11-16)
  기준 spec  별 표 _shorts/spec_mindlumi_20261121-lookup-hwarok.json · 띠 표 _20261117-lookup-hongran.json
             궁 표 _20261123-palace-yeomjeong-hwagi.json
★주기  index.json 의 마지막 숏츠 예약일에서 이틀씩 건너 다음 주 월요일(포함)까지 채운다. 보통 화·목·토·월 4편
       글이 나가는 날(화·목·토)의 숏츠는 그날 글 주제에서 뽑는다. 글이 없는 날은 아래 시리즈에서 고른다
★소재 시리즈 (운영자 제안 2026-11-16. 한 번 쓴 것은 index.json 으로 중복을 피한다)
  A 올해·내년 사화 × 12궁   「올해 유독 힘들었다면 염정이 여기 있습니다」(병오년 염정 화기)
                            2027 정미년: 태음 화록(어디로 복이 들어오나) · 천동 화권 · 천기 화과 · 거문 화기(구설을 조심할 자리)
                            한 별 × 12궁 = 1편. 맨 아래는 「내 ○○ 자리, 무료 명반에서 확인」 → 사이트로 보낸다
  B 출생연도 × 생년 사화    복의 별(화록) · 주도권(화권) · 인정(화과)
  C 띠 × 별                 인연의 해(홍란) 등 생년 지지로 정해지는 별
  D 궁별 한 장              블로그의 12궁 글 내용을 「○○궁에 이 별이 있으면」 표로 (명궁 주성 14개, 부처궁 주성 14개 ...)
  표의 별·사화는 엔진 표(SIHUA_MAP · ZiWeiEngine)에서만. 궁별 한마디는 자미두수 일반 해석 범위에서 짧게
  ⛔ 자녀·질병·수명 단정, 「깎인다」 계열, 흉격 이름 금지. 힘든 내용은 「마음 쓰이는 곳」 수준으로 쓴다
인물 글이 나가는 주에는 그 한 편만 설명형(8카드, 인물 이름으로 시작)으로 만들어도 된다
설치    python3 -c "import sherpa_onnx" 2>/dev/null || pip install sherpa-onnx --break-system-packages -q
        cd _shorts/remotion && npm install --no-audit --no-fund
렌더    python3 _shorts/make_remotion.py <spec.json> <out.mp4>
```

★원고와 spec 은 전부 저장소에 남긴다: 글 원고 mindlumi/w<주차>/a1~a3.md, 영상 spec _shorts/spec_mindlumi_<날짜>-<slug>.json, mp4 mindlumi/shorts/
  (점검 작업이 미디어를 다시 올리거나 실패한 글을 새로 발행할 때 여기서 가져간다)

## [8] 영상 자가검증 - 통과 못 하면 올리지 않는다

```
① 60초 미만, 오디오 스트림 있음
② 프레임을 떠서 Read 로 직접 본다 (찾아보기형은 9초 지점 1장, 설명형은 8카드 전부)
   글자 잘림·겹침 없음 / 줄이 오른쪽 끝을 넘지 않음 / 이모지·캐릭터 얼굴이 전부 뜸 / 맨 아래 버튼이 y 1650 위
③ 표의 모든 줄이 [3] 계산과 일치하는가 (한 줄씩 대조)
④ 금지선 위반 없음
```

## [9] 유튜브 예약

```
mp4 → mindlumi/shorts/<YYYYMMDD>-<slug>.mp4 커밋·푸시 → raw URL → media_from_url
publish  accountIds ["conn_40c47188dd302b4b"]  workspaceId "ws_f7979700dc84fc70"
         scheduledAt  글이 나가는 날은 글 30분 뒤(화·목 08:00 · 토 21:30), 글이 없는 날은 08:00
         content  2~3줄 + 「내 ○○는? 댓글로」 + "내 원반과 제2명반 무료로 보기" + https://mindlumi.ai/?ref=shorts + 해시태그(끝에 #Shorts)
         options.youtube { title(훅 질문 + 이모지. 예: 「내가 타고난 복의 별은? 🧧 내 출생연도 찾기 #신년운세 #자미두수」), tags 10,
                           categoryId "22", privacyStatus "public", defaultLanguage "ko",
                           madeForKids false, containsSyntheticMedia true }
```

## [10] 기록 - 커밋·푸시

- `mindlumi/index.json` 에 건별 { date, type, title, naverPostId, youtubePostId, status:"scheduled", hookType } 추가 (발행 뒤 점검 작업이 url 을 채운다)
- `mindlumi/playbook.md` §3 에 「날짜 · 관찰 · 이번에 바꾼 것」, `mindlumi/shorts-benchmark.md` 에 이번 주 벤치마크 표
- 인계 문서를 썼던 주라면 그 문서 맨 위에 「처리 완료 <날짜>」 한 줄을 넣어 다시 처리되지 않게 한다

## [11] 보고 (간결)

건별 「제목 - 예약 시각」 6줄 이내 + 이번 주 바꾼 것 1줄 + 검증 수치 1줄 + 우회한 것 1줄.

## [막혔을 때] 멈추지 말고 이렇게 한다

```
① 저장소 푸시 불가          add_repo 재시도 → 그래도 안 되면 원고·그림 스펙·영상 스펙을
                            JAMI 문서 claude/weekly-<날짜>-handoff.md 로 남긴다(Projects 는 항상 된다)
                            점검 작업이 08:25 · 10:25 · 15:25 · 22:25 에 돌며 인계 문서를 발견하면 이어서 발행한다
② media_presign 업로드 403  쓰지 않는다. 항상 깃헙 raw URL → media_from_url 경로만 쓴다
③ 네이버 확장 offline        예약은 그대로 건다. 조회·open_post 가 필요한 단계는 보관본으로 대체하고 넘어간다
④ 명반 캡처 실패             Star-Chart 에서 npm install 을 다시 하고 capture_chart.mjs 를 한 번 더. 그래도 안 되면 그 주만 상시 검색형으로
⑤ Star-Chart clone 불가      공개 저장소이므로 https clone 을 다시 시도. 안 되면 지난주 표본 명반 근거(인계 문서·index)를 재사용
⑥ 영상 렌더 실패             npm install 재시도 1회 → 안 되면 글만 예약하고 영상은 점검 작업에 넘긴다(인계 문서에 spec 을 적는다)
⑦ 승인 창이 뜨는 도구        쓰지 않는다. 브라우저가 꼭 필요한 일(티스토리)은 Claude in Chrome 에서 이미 허용된 사이트만
```

## 금지선

실명 인물은 보도된 사실만·단정 금지·제3자 실명 금지·정치인 금지·생시 모르는 인물 금지 / 상장사 인물 글에 주가 전망 금지 /
자녀 금지어(요절·단명·질병·장애·불효·공부 못함·자녀 수 단정) / 「깎인다」 계열 / 흉격 이름 본문 노출 /
실고객 이름·이메일·생년월일시 금지 / 프로덕션 DB 쓰기 금지 / 비밀번호·관리자 비밀번호·API 키·토큰을 다루지 않는다 /
em·en 대시, 「컴퓨트」, `**` 금지.
