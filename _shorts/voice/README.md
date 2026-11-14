# 음성 모델 넣는 곳 (_shorts/voice/)

이 폴더에 **오프라인 한국어 TTS 모델**을 넣으면, 숏폼 생성 시 자동으로 음성(내레이션)이 입혀진다.
비어 있으면 음성 없이 자막만으로 생성된다(안전 동작). 외부 인터넷 TTS 서버는 쓰지 않는다.

## 넣어야 하는 파일 (sherpa-onnx 형식)
- `model.onnx`   : 한국어 TTS 모델 (MMS/VITS 계열, espeak 불필요)
- `tokens.txt`   : 토큰 매핑
- (kokoro 계열이면 `voices.bin`, `dict/`, `lexicon*.txt` 추가)

## 권장 모델
- Facebook MMS 한국어 (mms-tts-kor) 를 sherpa-onnx onnx 로 변환한 번들.
  character 기반이라 espeak 없이 동작하며 이 파이프라인과 호환됨.
- 파일을 이 폴더(`_shorts/voice/`)에 그대로 올리면 끝. 이후 매주 자동으로 음성이 입혀진다.

## 동작
- `make_short.py` 가 각 카드의 `narration`(없으면 title+sub에서 생성)을 읽어 문장별로 합성하고,
  카드 전환 타이밍에 맞춰 트랙을 만들어 영상에 입힌다(내레이션이 길면 그 카드 길이를 자동으로 늘림).
- 합성 실패 시에도 영상은 자막만으로 정상 생성된다.
