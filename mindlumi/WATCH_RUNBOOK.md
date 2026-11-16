# MindLumi 자동화 점검 절차서

예약 작업 「MindLumi 자동화 점검」이 매일 08:25 · 10:25 · 15:25 · 22:25 에 이 문서를 읽고 수행한다.
다른 예약 작업이 돈 지 약 1시간 뒤에 결과를 보고, 안 나간 것은 이 작업이 직접 마저 한다.

★완전 자동. 질문하지 않는다. 승인 창이 뜨는 도구는 쓰지 않는다.
★예약 작업의 「성공」 표시를 믿지 않는다. 결과물(예약·발행된 글과 영상, 기록 파일)로 확인한다.
★발견한 문제는 「보고」가 아니라 「조치」가 먼저다. 다른 작업을 다시 돌리려 하지 말고(권한이 없다) 그 일을 직접 한다.
★조치할 게 없고 지난 점검과 달라진 것도 없으면 2분 안에 끝낸다. 매번 전부 다시 조사하지 않는다.

## 일정표 (KST)

```
월 07:40        주간 제작 → 화·목·토 글 3편 + 영상 3편이 「예약」으로 걸려야 한다
화·목 07:30 네이버 / 08:00 유튜브
토 21:00 네이버 / 21:30 유튜브
일 10:10        티스토리 주간 일괄 (그 주 네이버 글 3편을 한 번에)
수·금 13:47     속보 점검 (발행 없음이 정상)
일 20:20        사이트 점검·개선
이 점검  매일 08:25 · 10:25 · 15:25 · 22:25
```

## [0] 준비

`TZ=Asia/Seoul date` → 저장소 `mindlumi/watch-log.md` 맨 위(지난 점검)와 `mindlumi/index.json` 을 읽는다.
지난 점검 시각부터 지금까지 일정표에서 지나간 칸만 본다. 지나간 칸이 없고 미해결도 없으면 한 줄 기록하고 끝낸다.

## [1] 결과물 확인

```
예약·발행   uplika list_posts (workspaceId "ws_f7979700dc84fc70", limit 은 작게. 본문이 통째로 와서 길다)
            status 가 scheduled / published / failed / publishing 중 무엇인지, scheduledAt 이 맞는지
            월요일 제작 뒤: 이번 주 화·목·토 글 3 + 영상 3 = 6건이 scheduled 인가
인계 문서   Projects 로 JAMI 문서 목록을 보고 claude/weekly-*-handoff.md 중 「처리 완료」 표시가 없는 것이 있는가
티스토리    WebFetch https://mindlumi.tistory.com/ (막히면 Claude in Chrome 새 탭) - 공개 글 목록이 index.json 의 tistoryUrl 과 맞는가
연결        uplika bridge_status · list_accounts
티스토리 로그인  토 22:25 와 일요일 점검 때만 본다. Claude in Chrome 새 탭으로 https://mindlumi.tistory.com/manage/posts/ - 로그인 화면으로 넘어가는지만. 탭은 닫는다
            토요일 밤에 풀려 있으면 그때 미해결로 올려 운영자가 일요일 아침 전에 로그인할 수 있게 한다
사이트(월 08:25)  mindlumi/site-log.md 맨 위가 어제인가 · Star-Chart Deploy 가 success 인가
```

## [2] 조치 - 직접 한다

```
이번 주 예약이 6건 미만 (월 10:25 이후)
    → mindlumi/WEEKLY_RUNBOOK.md 를 읽고 빠진 것만 직접 만든다. 인계 문서가 있으면 그 원고로 이미지부터 이어서 한다
      이미 예약된 건과 겹치지 않게 제목으로 대조한다
발행 실패(failed)
    → get_help 로 원인 확인 후 retry_post 1회. 또 실패하면 같은 내용을 새 publish 로 한 번. 그래도 안 되면 미해결로 적는다
네이버 글이 예약 시각을 1시간 넘겼는데 안 나감 (확장 offline)
    → 글은 확장이 돌아오면 나간다. 기다린다. 6시간 넘으면 미해결(운영자가 Chrome 을 봐야 함)
티스토리 글 누락 (일 15:25 이후에 보는데 그 주 네이버 글이 티스토리에 없음. 평일에는 없는 것이 정상)
    → 로그인이 살아 있으면 mindlumi/tistory/RUNBOOK.md 대로 빠진 것을 올린다(최대 3편). tistoryDraft 원고가 있으면 그것으로
티스토리 비공개 대기(tistoryPending)
    → 로그인이 살아 있으면 완료 → 공개 → 공개 발행 (본문은 건드리지 않는다)
발행된 글·영상의 주소가 index.json 에 없음
    → url / youtubeUrl 을 채우고 status 를 published 로
사이트가 안 열리거나 Deploy failure
    → 최근 머지를 revert 커밋으로 되돌린다 (JAMI 문서 claude/site-improve.md [6]). 강제 푸시·reset --hard 금지
```

⛔ 하지 않는 것: 비밀번호·로그인, 결제·환불, 관리자 게이트, 프로덕션 DB, 예약 작업 삭제·재실행 시도.
⛔ 같은 조치를 하루 두 번 넘게 반복하지 않는다(watch-log 로 센다).

## [3] 기록과 보고

`mindlumi/watch-log.md` 맨 위에 추가하고 커밋·푸시.

```
## YYYY-MM-DD HH:MM
확인    지나간 칸 N개 - 나간 것 N / 안 나간 것 N
연결    네이버 확장 online|offline · 유튜브 ok · 티스토리 로그인 유지|풀림
조치    직접 한 것 (없으면 「없음」)
미해결  운영자가 해야 하는 것 (없으면 「없음」)
```

보고는 문제가 있을 때만 길게 쓴다. 정상이면 한 줄: 「MM-DD HH:MM 점검 - N건 확인, 조치 없음」.
미해결이 생겼거나 풀렸을 때는 운영자가 해야 할 일을 맨 앞에 한 줄로 쓴다.
success/failure 로 쓴다. 이름·이메일·생년월일시 금지. 대시는 하이픈만.
