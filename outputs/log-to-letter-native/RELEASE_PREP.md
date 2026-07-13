# Log Planet Release Prep

이 문서는 `Log Planet` 네이티브 MVP를 App Store 배포 가능한 상태로 만들기 위한 준비 목록이다.

## 1. 현재 배포 기준

- 앱 이름: `Log Planet`
- Bundle ID: `com.logtoletter.app`
- 앱 버전: `0.1.0`
- iOS build number: `1`
- Android version code: `1`
- 초기 타깃: iPhone 전용
- 로그인: Google OAuth via Supabase
- 데이터 저장: 기기 로컬 저장 + 로그인 시 Supabase 동기화
- 편지 생성: 현재는 앱 내부 규칙 기반
- AI 편지 생성: 출시 후 서버 기능으로 별도 연결 예정
- 푸시: 현재는 로컬 알림 중심, 서버 푸시는 후속 단계

## 2. 출시 전 필수 결정

- [ ] 앱스토어 공개 이름을 `Log Planet`으로 확정한다.
- [ ] 한국어 부제목을 확정한다.
- [ ] 앱 설명 문구를 확정한다.
- [ ] 개인정보 처리방침 URL을 만든다.
- [ ] 고객지원 URL을 만든다.
- [ ] 심사용 테스트 계정 또는 테스트 방법을 준비한다.
- [ ] Google OAuth redirect URL이 배포 빌드에서도 정상 동작하는지 확인한다.
- [ ] Supabase RLS 정책이 실제 사용자별 데이터 분리에 맞게 동작하는지 확인한다.
- [ ] 운영 빌드에서 테스트 콘솔이 숨겨지는지 확인한다.

## 3. App Store Connect 메타데이터 초안

### 앱 이름

`Log Planet`

### 부제목 후보

`기록이 편지가 되는 회고 앱`

### 프로모션 문구 후보

`순간의 생각을 남기면, 지난 나를 돌아보는 편지로 정리해줘.`

### 짧은 설명 후보

`Log Planet은 하루 중 문득 떠오른 생각과 감정을 기록하고, 시간이 지난 뒤 나의 흐름을 편지처럼 돌아볼 수 있게 돕는 앱입니다.`

### 긴 설명 후보

`Log Planet은 거창한 일기를 쓰기 어려운 사람을 위한 짧은 기록 앱입니다.`

`알림이 온 순간의 생각과 감정을 솔직하게 남겨두면, 캘린더에서 그날의 에너지와 감정 흐름을 확인할 수 있습니다. 시간이 지나면 기록들이 편지처럼 정리되어, 지난 나를 조금 떨어져서 바라볼 수 있게 도와줍니다.`

`기록은 사용자의 기기에 저장되며, 로그인한 경우 계정에 동기화할 수 있습니다.`

### 키워드 후보

`일기,감정기록,회고,생각정리,편지,마음기록,루틴,알림,캘린더`

## 4. 스크린샷 준비

초기에는 iPhone 세로 화면 기준으로 준비한다.

- [ ] 기록 탭: 생각 입력, 감정, 에너지 선택이 보이는 화면
- [ ] 캘린더 탭: 월간 캘린더와 이달 요약이 함께 보이는 화면
- [ ] 기간별 기록: 기록 카드와 요약이 보이는 화면
- [ ] 편지보관함: 월별 편지 목록이 보이는 화면
- [ ] 편지 상세: 편지지 디자인이 적용된 편지 화면
- [ ] 알림 설정: 알림 요약 또는 설정 화면
- [ ] 설정: 컬러 테마와 편지지 디자인 화면

## 5. 개인정보 처리방침에 포함할 내용

- [ ] 사용자가 입력한 생각 기록
- [ ] 선택한 감정과 에너지 값
- [ ] 편지 내용과 추신
- [ ] 알림 설정값
- [ ] Google 로그인 계정 정보
- [ ] 서버 동기화 사용 시 Supabase에 저장되는 데이터
- [ ] 이미지 저장 시 사진 보관함 권한 사용 목적
- [ ] 마이크/음성 인식 권한 사용 목적
- [ ] AI 기능 도입 시 기록이 AI 처리에 사용될 수 있는 범위
- [ ] 계정 삭제 및 데이터 삭제 방법

## 6. 권한 설명 점검

현재 `app.json`에 들어간 권한 설명:

- 알림: 순간의 생각을 기록할 수 있도록 알림을 보내기 위해 사용
- 마이크: 음성으로 생각을 기록할 때 받아쓰기를 위해 사용
- 음성 인식: 말한 내용을 기록 문장으로 바꾸기 위해 사용
- 사진 보관함 추가: 편지를 이미지로 저장하기 위해 사용

출시 전 확인:

- [ ] 현재 실제 기능과 권한 설명이 일치한다.
- [ ] 사용하지 않는 권한은 제거한다.
- [ ] 권한 요청 전 앱 내부 안내 문구가 자연스럽다.

## 7. 빌드 준비 명령

```bash
cd /Users/yujinlee/Documents/Codex/2026-06-03/new-chat/outputs/log-planet-native
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx tsc --noEmit
```

Preview 빌드:

```bash
cd /Users/yujinlee/Documents/Codex/2026-06-03/new-chat/outputs/log-planet-native
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx eas build --profile preview --platform ios
```

Production 빌드:

```bash
cd /Users/yujinlee/Documents/Codex/2026-06-03/new-chat/outputs/log-planet-native
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx eas build --profile production --platform ios
```

App Store 제출:

```bash
cd /Users/yujinlee/Documents/Codex/2026-06-03/new-chat/outputs/log-planet-native
PATH=/opt/homebrew/opt/node@22/bin:$PATH npx eas submit --platform ios
```

## 8. TestFlight QA 순서

- [ ] Production 또는 internal build를 만든다.
- [ ] TestFlight에 업로드한다.
- [ ] 본인 계정으로 설치한다.
- [ ] `QA_CHECKLIST.md`를 처음부터 끝까지 수행한다.
- [ ] 로그인/비로그인 상태를 각각 테스트한다.
- [ ] 앱을 삭제 후 재설치했을 때 동작을 확인한다.
- [ ] 네트워크가 불안정할 때 저장/동기화 문구를 확인한다.
- [ ] 사진 저장 권한 거부/허용을 각각 확인한다.
- [ ] 알림 권한 거부/허용을 각각 확인한다.

## 9. 심사 제출 전 위험 요소

- [ ] 테스트 콘솔이 운영 빌드에서 노출되면 안 된다.
- [ ] AI가 아직 연결되지 않았다면 앱 설명에 AI 편지 자동 생성을 과장하지 않는다.
- [ ] 민감한 감정 기록을 다루므로 개인정보 처리방침을 명확히 한다.
- [ ] 계정 삭제와 데이터 삭제가 실제로 동작해야 한다.
- [ ] 앱 내 권한 요청 목적이 실제 기능과 일치해야 한다.
- [ ] 구독/결제/광고가 없다면 앱 설명에 무료 범위를 명확히 한다.

## 10. 다음 실행 순서

1. `QA_CHECKLIST.md`로 시뮬레이터 QA를 한 번 수행한다.
2. 개인정보 처리방침 초안을 만든다.
3. App Store Connect 앱 레코드를 생성한다.
4. TestFlight용 production build를 만든다.
5. TestFlight QA를 수행한다.
6. 스크린샷과 앱 설명을 확정한다.
7. App Review에 제출한다.
