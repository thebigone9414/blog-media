# MindLumi 자동화 일일 점검 기록

최신 회차가 맨 위. 예약 작업의 success 표시가 아니라 결과물로 확인한 것만 적는다.

## 2026-11-16 12:20
나갔어야 할 것  2건 / 실제로 나간 것  1건
                일 20:20 사이트 점검 - success (site-log 맨 위 11-15, Deploy #522 success, mindlumi.ai 열림)
                월 07:40 주간 제작 - failure (작업은 07:40~08:05 에 돌고 success 로 표시됐지만 결과물 0건)
                  uplika 예약(scheduled) 0건 / 기대 6건(글 3 + 영상 3) · 11-15 이후 발행 0건
                  blog-media 오늘 커밋 0건 · index.json 과 playbook 3절에 이번 주 기록 0건
연결            네이버 확장 online(대기 0건, 확장 0.7.50) · 유튜브 ok · 티스토리 로그인 유지
                티스토리 공개 글 1편(11-14 화탐격) = index.json tistoryUrl 1건과 일치, 비공개 대기 0건
                MindLumi 예약 작업 6개 모두 enabled, 다음 실행 시각 잡혀 있음
고친 것         없음. 주간 제작 재실행(fire_trigger)을 1회 시도했으나 권한 거부로 failure. 재시도하지 않음
미해결          ① 운영자가 「MindLumi 자미두수 주간 콘텐츠 자동 발행」을 수동으로 한 번 실행해야 한다(화 07:30 글이 예약돼 있지 않다)
                   07:40 세션 기록에서 어디서 멈췄는지 확인 필요
                ② 이 점검 작업은 예약 작업 재실행 권한이 없다. 표의 「fire_trigger 로 다시 돌린다」 는 지금 설정으로는 동작하지 않는다
                ③ 다른 예약 작업 4개(SureView 숏폼 · 감리사 연재 · 주간 시황 · AI 위클리) 지시문에 GitHub 토큰이 평문으로 들어 있다. 폐기 후 재발급 권장
메모            WebFetch 가 mindlumi.ai 와 mindlumi.tistory.com 에 대해 승인 대기로 막혀, 두 곳 모두 Chrome 새 탭으로 열어 확인했다(탭은 닫음)
                티스토리 글의 로그아웃 상태 열람은 이번에 확인하지 못했다
