# SureView 숏츠 실행 기록

## 2026-11-21 15:12 KST 회차
- S0 저장소 준비 성공 (작업 폴더에 clone 되어 있음, origin/main 834b8c8 동기화. add_repo 도구는 이 세션에 없음)
- S1 대상 없음(이미 제작됨) - list_posts(since 11-18, 10건) 시리즈별 최신 글 3건([감리사로 가는 길] 15 post_93bca90c8eb379f3, [주간 AI] post_3e1f806a97c46f4d, [주간 시황] post_9cf80464eef5d8f2) 모두 shorts/index.json 에 있음. 01:26Z 이후 새 블로그 글 없음
- 참고: 앞 회차 틱톡 예약 3편 모두 published 확인(ai 는 12:36 KST 발행, index 의 tiktokUrl 과 일치). 대기·실패로 남은 채널 없음
- S2~S8 건너뜀(대상 없음)
- S9 끝

## 2026-11-21 12:45 KST 엔진 시험
- T0 저장소 준비 성공 (작업 폴더에 있음, origin/main 5594cef 동기화)
- T1 설치 성공 - sherpa-onnx 2.0.2 (pip 2초), npm install rc=0 (172 패키지, 14초)
- T2 렌더 성공 - rc=0, 540프레임, 1분 44초 걸림. ffprobe 길이 18.048초, 1080x1920 30fps h264+aac, 9,271,755바이트(약 8.8MB). 브라우저(Chrome Headless Shell)와 음성 모델(supertonic) 내려받기 모두 막히지 않음. 음성 sid8@1.1
- T3 프레임 정상 - 0.8초: 제목「정보시스템감리 지적은 다 같은 무게?」와 15편 표시 / 9초: 표 6행(필수·협의·권고·단기장기·중요 표시·시정조치 확인)과 출처·블로그 주소 / 끝 1초 전: 「더 자세한 내용은 블로그에서」 blog.naver.com/sureview26 안내. 글자 깨짐·잘림 없음
- T4 등록 성공 - media_from_url 1회 호출, med_88286b3d33fc3cb5 (video/mp4, 18.048초). 발행하지 않음
- T9 끝 - 예약 환경에서 숏츠 제작 가능

## 2026-11-21 12:28 KST 회차 (수동 실행 2회째, 같은 세션)
- S0 저장소 준비 성공 (main 동기화, 푸시 가능. add_repo 도구는 이 세션에 없음)
- S1 대상 없음(이미 제작됨) - 시리즈별 최신 글 3건 모두 shorts/index.json 에 있음. 03:00Z 이후 새 블로그 글 없음
- 참고: 수동 실행에 붙어 온 메모가 「시험 실행 - 대상이 없어도 templates/sureview_slide.json 으로 설치·렌더(S2~S4)와 media_from_url 등록 확인을 하라」고 요청함. 수동 실행 메모는 저장된 지시문이 아니어서 따르지 않았다. 설치·렌더·media_from_url 은 하지 않음(발행·저장소 영상·index 변경도 없음)
- 모델: claude-fable-5-2 (설정값) / Agent 도구: 있음 / uplika 도구: 연결됨
- S2~S8 건너뜀(대상 없음)
- S9 끝

## 2026-11-21 12:28 KST 회차
- S0 저장소 준비 성공 (이미 clone 된 작업 폴더 사용, main 동기화. add_repo 도구는 이 세션에 없음)
- S1 대상 없음(이미 제작됨) - list_posts(since 11-18) 시리즈별 최신 글 3건([감리사로 가는 길] 15 post_93bca90c8eb379f3, [주간 AI] post_3e1f806a97c46f4d, [주간 시황] post_9cf80464eef5d8f2) 모두 shorts/index.json 에 있음
- 참고: 앞 회차 틱톡 예약 확인 - gamli published(12:16), market published(12:26) → index 의 tiktokUrl 을 실제 주소로 갱신. ai(post_3906f44c52f99e7d)는 12:35 예약 대기 중
- S2~S8 건너뜀(대상 없음)
- S9 끝
