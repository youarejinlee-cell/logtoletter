# Log Planet 프로젝트 인수인계서

최종 확인일: 2026-09-24 (KST)

이 문서는 다른 ChatGPT 계정 또는 새로운 개발자가 Log Planet을 이어서 작업할 때 가장 먼저 읽는 기준 문서다. 대화 기록보다 현재 저장소의 소스 코드를 우선하며, 계정 비밀번호와 비밀키는 이 문서에 기록하지 않는다.

## 1. 한눈에 보기

- 제품명: `Log Planet`
- 한 줄 정의: 순간의 생각, 감정, 에너지를 짧게 남기면 한 달의 기록이 나만의 행성으로 쌓이는 회고 앱
- 핵심 문장: `기록이 쌓이면 나만의 행성이 돼.`
- 플랫폼: iOS, Android
- 기술: Expo SDK 54, React Native 0.81, React 19, TypeScript, Supabase, EAS Build
- 운영 앱 버전 기준: `0.1.5`
- 최신 EAS 빌드: iOS build `22`, Android version code `18`
- GitHub: `https://github.com/youarejinlee-cell/logtoletter.git`
- 운영 식별자: `com.youarejinlee.logplanet`
- EAS 프로젝트 ID: `46937731-6170-43ee-9258-3bc7a75537ee`
- App Store Connect 앱 ID: `6792235981`
- Google Play 앱 ID: `4975439721606975596`
- Google Play 개발자 계정 ID: `7668876657649204614`
- 개인정보 처리방침: `https://youarejinlee-cell.github.io/logtoletter/privacy.html`
- 고객 문의: `you.are.jinlee@gmail.com`

## 2. 제품의 기본 철학

Log Planet은 긴 일기를 잘 쓰는 사람만을 위한 앱이 아니다. 사용자가 순간의 날것 같은 생각과 감정을 짧게 포착하고, 나중에 그 흐름을 부담 없이 돌아보게 만드는 것이 목적이다.

제품 판단의 우선순위는 다음과 같다.

1. 기록을 잘 정리하도록 요구하기보다 기록을 시작하기 쉽게 만든다.
2. 감정을 진단하거나 치료한다고 말하지 않고, 사용자가 자신의 반복과 변화를 관찰하도록 돕는다.
3. 과도한 위로, 감상적인 문장, 단정적인 해석을 피한다.
4. 기록량을 경쟁이나 성취 점수로 만들기보다, 쌓인 흔적이 행성으로 보이는 즐거움을 준다.
5. 사용자의 기록 원문과 기존 데이터는 UI 개편보다 우선해 보존한다.
6. 알림은 압박이 아니라 순간을 포착할 작은 질문이어야 한다.

의료, 심리치료, 상담 또는 정신건강 진단 앱처럼 표현하면 안 된다. 자유 입력란에는 민감한 내용이 들어올 수 있으므로 개인정보와 데이터 삭제 기능을 가볍게 다루지 않는다.

## 3. 브랜드와 분위기

### 시각 언어

- 깊은 네이비 우주 배경, 작은 별, 흰색 텍스트, 하늘색 포인트를 기본으로 한다.
- 행성과 대륙은 3D 클레이 또는 작은 디오라마처럼 포근하고 손으로 만든 질감이다.
- 화면은 어둡지만 무겁거나 공포스럽지 않고, 조용하면서 약간 유쾌해야 한다.
- 운영 도구처럼 빽빽한 화면보다 한 번에 하나의 행동에 집중한다.
- 과도한 그라데이션, 장식용 카드 중첩, 마케팅 랜딩 페이지 같은 구성은 피한다.

### 문체

- 기본 언어는 한국어이며 영어 현지화는 아직 구현하지 않았다.
- 사용자 문구는 친근한 반말형 `~해`, `~봐`, `~할 수 있어`를 주로 쓴다.
- 감정을 대신 판단하지 않고 선택권을 남긴다.
- 예: `지금 이 순간의 생각과 감정을 솔직하게 남겨봐.`
- 이름이 없는 로그인 사용자의 기본 이름은 `이름 없는 여행자`다.
- 프로필 이미지가 없으면 앱 로고를 사용한다.

## 4. 핵심 사용자 흐름

1. 첫 설치에서 전체 화면 가이드가 나타난다.
2. 기록, 모아보기, 행성, 분석 보기, 알림 탭을 순서대로 하이라이트하며 설명한다.
3. 가이드 종료 후 로그인하지 않은 상태가 20초 지속되면 브랜드형 로그인 안내가 나타난다.
4. 사용자는 로그인하지 않고도 기기에 기록할 수 있다.
5. 첫 기록 저장 3초 뒤 알림을 아직 설정하지 않았다면 알림 설정 안내가 나타난다.
6. 로그인하면 게스트 기록을 계정으로 가져올지 선택할 수 있다.
7. 로그인 기록은 Supabase에 동기화되고, 월별 행성·캘린더·분석에 반영된다.

## 5. 주요 화면과 기능

### 기록

- 자유 입력 최대 500자
- 기록 힌트는 기본 3개와 `+` 버튼으로 보이고, 펼치면 나머지가 나타난다.
- 카테고리: 일, 관계, 자아성찰, 돈, 취향/취미, 건강, 기타
- 사용한 에너지를 퍼센트 슬라이더로 기록한다.
- 감정은 긍정, 중간, 부정으로 나뉘고 각 그룹의 대표 태그를 먼저 보여준다.
- 설정에서 그룹별 대표 감정 태그를 최대 3개까지 고른다.
- iOS에서는 감정 단어 앞에 이모지를 표시하고 Android는 텍스트만 표시한다. Android 일부 기기에서 이모지와 한글 조합이 사라지던 문제를 피하기 위한 의도적인 차이다.
- 예전 명사형 감정 ID는 현재 형용사형 태그로 정규화해 기존 기록을 보존한다.

### 모아보기

- 최근 기록 목록, 월별 캘린더, 필터 보기로 기록을 다시 확인한다.
- 필터에는 실제로 사용된 감정 태그만 개수와 함께 나타난다.
- 기록 수정과 삭제가 가능하다.
- 긴 감정명과 날짜가 겹치지 않도록 날짜와 시간을 위아래로 배치한 Android 대응이 포함되어 있다.

### 행성

- 월별 기록을 카테고리와 개수에 따라 대륙과 에셋으로 구성한다.
- 기록이 0개인 카테고리는 대륙을 표시하지 않는다.
- 카테고리 순위, 기록 수, 최근 기록 시점으로 대륙 배치와 레벨을 결정한다.
- 상세 보기에서 카테고리, 레벨, 기록 수, 평균 에너지, 긍정·중간·부정 비율과 기록 목록을 보여준다.
- 확대·이동은 손가락이 잡은 지점을 중심으로 동작하도록 개선했다.
- Android Z Flip 3 등에서 상세 확대 시 기본 대륙 베이스가 사라지던 문제를 수정했다.
- 완성된 월별 행성을 이미지로 저장할 수 있다.
- 에셋 위치와 크기의 기준은 `UNIVERSE_PLANET_ASSET_RULES.md` 및 `src/screens/UniverseScreen.tsx`를 함께 본다.

### 분석 보기

- 월별 기록 수, 평균 에너지, 자주 나타난 카테고리와 감정을 요약한다.
- 카테고리 분석, 감정·에너지 분포, 월별 메모 등의 화면이 있다.
- 감정 표시는 기록 탭과 동일한 현재 태그 체계를 사용해야 한다.

### 알림

- 서버 푸시가 아니라 `expo-notifications` 기반 기기 로컬 알림이다.
- 모드: 간격 반복, 특정 시간, 랜덤 알림
- 간격 반복 문구: `몇 시부터`, `몇 시까지`, `몇 분 간격으로`
- 자정을 넘는 범위, 예를 들어 오후 5시부터 다음날 새벽 4시까지를 지원한다.
- 랜덤 알림은 요일, 시간 범위, 하루 횟수를 입력받아 배치한다.
- 알림 문구는 오전, 오후, 저녁 시간대별로 나뉜다.
- 예약을 바꾸면 기존 로컬 알림을 취소하고 다시 예약한다.
- 문구 원본은 `src/lib/notificationPrompts.ts`, 예약 로직은 `src/lib/notifications.ts`가 기준이다.

### 계정과 로그인

- Apple 네이티브 로그인, Google OAuth, Kakao OAuth를 Supabase Auth로 처리한다.
- Android 운영 빌드는 `https://youarejinlee-cell.github.io/logtoletter/auth/callback` App Link를 사용한다.
- iOS와 개발/프리뷰 변형은 앱 scheme callback을 사용한다.
- warm start는 `Linking.addEventListener`, cold start는 `Linking.getInitialURL`로 처리한다.
- Android에서 브라우저가 `dismiss/cancel`로 먼저 끝나고 deep link가 늦게 도착하는 경우 8초 동안 추가 대기한다.
- 같은 callback URL은 SHA-256 식별자로 중복 처리를 막는다.
- 진단 로그에는 토큰, authorization code, 이메일 또는 개인정보를 출력하지 않는다.
- 오류 코드는 callback timeout/missing/invalid, provider error, code exchange failure, session failure/missing으로 나뉜다.
- 계정 삭제 시 Supabase 데이터와 인증 계정을 삭제하는 Edge Function 흐름이 있다.

### 가이드와 로그인 안내

- 최초 1회 전체 화면 가이드가 표시되고 전체 메뉴에서 다시 열 수 있다.
- 가이드는 상태바 아래에서 하단 탭 위까지 차지하며 배경을 dim 처리한다.
- 로그인 유도 팝업과 가이드는 같은 브랜드 언어를 사용한다.

### 편지 기능

- `Letter` 모델, 편지 화면, Supabase Edge Function과 AI 생성 코드가 저장소에 남아 있다.
- 현재 `App.tsx`의 `LETTER_ARCHIVE_ENABLED = false`로 사용자 탭에서는 비활성화되어 있다.
- 현재 개인정보 처리방침도 외부 AI로 기록을 전송하지 않는다고 명시한다.
- 이 기능을 다시 켜기 전 개인정보 처리방침, 스토어 데이터 공개, OpenAI 서버 비밀키, 사용자 동의와 결과 품질을 다시 검토해야 한다.

## 6. 기술 구조

### 프런트엔드

- Expo SDK `~54.0.37`
- React Native `^0.81.5`
- React `^19.1.0`
- TypeScript `~5.9.2`
- 루트 내비게이션과 전역 상태 조합: `App.tsx`
- 화면: `src/screens/`
- 공용 UI: `src/components/`
- 도메인·저장·인증 로직: `src/lib/`
- 타입: `src/types/`
- 이미지와 오디오: `assets/`

현재 React Navigation 라이브러리를 쓰지 않고 `App.tsx`의 화면 상태와 `BottomTabs`로 화면을 전환한다. 규모가 더 커지면 내비게이션 계층 분리는 후보지만, 동작을 충분히 회귀 테스트하지 않고 한꺼번에 바꾸면 안 된다.

### 데이터 모델

핵심 `Entry` 필드:

- `id`
- `text`
- `mood` (레거시 호환용 상위 감정)
- `moodTag` (현재 세부 감정 태그)
- `energy` (퍼센트)
- `createdAt`
- `category`

그 밖에 `Letter`, `NotificationSettings`, `AppState`, 월별 메모, 테마, 대표 감정 태그 설정이 있다. 타입의 기준은 `src/types/domain.ts`다.

### 저장과 동기화

- 비로그인: AsyncStorage의 `log-to-letter-native-v1:guest`
- 로그인: 사용자별 AsyncStorage 캐시와 Supabase 서버 동기화
- 로그인 시 게스트 데이터를 선택적으로 가져온다.
- 과거 저장 구조와 감정·카테고리 값을 로드 시 정규화한다.
- Supabase 주요 테이블: `profiles`, `entries`, `letters`, `notification_settings`, `app_settings`
- 정리 대상 보조 테이블: `letter_periods`, `push_tokens`
- RLS와 마이그레이션은 `supabase/migrations/` 및 `supabase/fix-profiles-rls.sql`에 있다.

원격 동기화는 충돌 해결 엔진이 아니라 로컬 상태를 push한 뒤 pull하는 구조에 가깝다. 여러 기기에서 동시에 수정하는 시나리오는 별도 QA가 필요하다.

### Supabase와 비밀값

- 클라이언트 공개 URL과 anon key는 `src/lib/supabaseConfig.ts`에서 읽는다.
- 예시는 `src/lib/supabaseConfig.example.ts`에 있다.
- service role key, Apple private key, Google client secret, Kakao client secret, OpenAI API key는 절대로 앱 코드나 Git에 넣지 않는다.
- Edge Function 비밀값은 Supabase Dashboard 또는 CLI secret으로 관리한다.
- 새 계정에서는 기존 대시보드 접근 권한을 넘겨받거나 프로젝트를 정식 이전해야 한다.

## 7. 앱 변형과 딥링크

| 변형 | 앱 이름 | Scheme | Bundle/Package |
|---|---|---|---|
| development | Log Planet Dev | `logplanet-dev` | `com.youarejinlee.logplanet.dev` |
| preview | Log Planet Preview | `logplanet-preview` | `com.youarejinlee.logplanet.preview` |
| production | Log Planet | `logplanet` | `com.youarejinlee.logplanet` |

`APP_VARIANT`와 `EXPO_PUBLIC_APP_VARIANT`를 항상 같은 값으로 설정한다. Production Android만 GitHub Pages의 HTTPS App Link intent filter를 갖는다.

## 8. 실행과 검증

앱 폴더:

```sh
cd /Users/yujinlee/Documents/Codex/2026-06-03/new-chat/outputs/log-to-letter-native
```

의존성 설치와 타입 검사:

```sh
npm install
npx tsc --noEmit
```

개발 서버:

```sh
npm run start
npm run ios
npm run android
```

OAuth, Apple 로그인, 실제 알림, 사진 저장, 인앱결제 같은 네이티브 기능은 Expo Go만으로 최종 검증하지 않는다. 개발 빌드 또는 TestFlight/Google Play 테스트 트랙에서 확인한다.

프로덕션 빌드:

```sh
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```

iOS 제출:

```sh
npx eas-cli submit --profile production --platform ios
```

Android는 현재 EAS에 Google Play service account key가 없어 자동 제출이 준비되지 않았다. AAB를 내려받아 Play Console의 비공개 테스트 트랙에 직접 업로드했다.

## 9. Git과 버전 기준

- 저장소: `https://github.com/youarejinlee-cell/logtoletter.git`
- 현재 브랜치: `codex/pre-env-split-checkpoint-2026-07-13`
- 원격 추적 브랜치: `origin/codex/pre-env-split-checkpoint-2026-07-13`
- 최신 배포 커밋: `d3d2090 Prompt notification setup after first entry`
- 체크포인트 태그: `log-planet-pre-env-split-2026-07-13` (`748acb3`)

최근 주요 커밋:

| 커밋 | 내용 |
|---|---|
| `d3d2090` | 첫 기록 후 알림 설정 안내 |
| `85bd618` | iOS 앱 버전 0.1.4 증가 |
| `3088dd0` | 정적 로딩 화면과 알림 예약 마무리 |
| `eae9ada` | 행성 확대 타겟과 성능 개선 |
| `81fb3ba` | Android 대륙 상세 기본 에셋 렌더링 수정 |
| `82686cb` | iOS/Android 릴리스 경험 정리 |
| `192da1e` | 감정 태그 확장과 Android 라벨 안정화 |
| `4347352` | OAuth callback fallback 페이지 |
| `8d5bf3f` | 소셜 로그인과 공개 개인정보 문서 |

현재 기본 브랜치가 아니라 작업 브랜치에서 출시 이력이 이어져 있다. 새 담당자는 GitHub 기본 브랜치와 보호 규칙을 확인한 뒤, 이 브랜치를 기준으로 main 병합 또는 새 release 브랜치 정책을 정해야 한다.

## 10. 빌드와 배포 이력

EAS에서 2026-09-24 확인한 최신 프로덕션 빌드:

| 플랫폼 | 앱 버전 | 빌드 번호 | EAS Build ID | 커밋 | 완료일 |
|---|---:|---:|---|---|---|
| iOS | 0.1.5 | 22 | `0b198272-d14b-4567-927b-27b02a9d3a69` | `d3d2090` | 2026-09-11 |
| Android | 0.1.5 | 18 | `bf3744a3-0523-495c-a7f7-7307e10e3866` | `d3d2090` | 2026-09-11 |
| iOS | 0.1.4 | 21 | `cb779e61-5a23-4eeb-8130-6a54bddf0e1f` | `85bd618` | 2026-09-09 KST |
| iOS | 0.1.3 | 20 | `c85dba54-7415-4272-aaaa-058a890b64d2` | `3088dd0` | 2026-09-08 |
| Android | 0.1.3 | 17 | `7a5d652f-7d97-4c15-85c8-801cb29a7a65` | `3088dd0` | 2026-09-08 |
| iOS | 0.1.2 | 18 | `96f8f684-a192-4889-a840-878240e71c98` | `eae9ada` | 2026-09-06 KST |
| Android | 0.1.2 | 16 | `d7460f9c-1fd9-40c3-9abd-aacaec92c199` | `eae9ada` | 2026-09-06 KST |
| Android | 0.1.2 | 15 | `135c18ca-cddf-4ba9-b2a7-4a8a554ce195` | `81fb3ba` | 2026-08-25 |
| iOS | 0.1.1 | 16 | `36b4c7f7-1b1d-48b6-a727-230b47c5943d` | `82686cb` | 2026-08-23 KST |
| Android | 0.1.1 | 14 | `b64cdb2a-ccd6-4b9d-b2f4-275898176020` | `82686cb` | 2026-08-23 KST |

마지막으로 확인된 제출 상태:

- iOS `0.1.5 (22)`는 App Store Connect에 업로드되었다. 현재 심사/출시 상태는 App Store Connect에서 다시 확인한다.
- Android `0.1.5 (18)` AAB는 Google Play 비공개 테스트 트랙 `2026-08`의 release 18로 업로드되어 검토 요청되었다.
- Google Play 비공개 테스트 track ID: `4701218025402055349`
- 빌드 완료와 스토어 게시 완료는 다른 상태다. EAS의 `FINISHED`는 바이너리 생성 성공만 뜻한다.

과거 iOS에서 이미 닫힌 pre-release train과 같은 `CFBundleShortVersionString`을 재사용해 `ITMS-90186`, `ITMS-90062`가 반복되었다. 새 업로드 전 `app.config.js`의 마케팅 버전을 이전 승인 버전보다 반드시 높인다. EAS의 원격 build number 자동 증가만으로는 마케팅 버전 오류를 해결하지 못한다.

## 11. 현재 로컬 작업 트리의 매우 중요한 상태

최신 배포 커밋 `d3d2090` 이후 로컬에 구독제 실험 코드와 에셋이 **커밋되지 않은 채** 남아 있다. 이 변경은 출시된 앱의 기능이 아니며, 그대로 production build를 만들면 안 된다.

주요 미커밋 파일:

- 수정: `App.tsx`, `app.config.js`, `package.json`, `package-lock.json`, `src/lib/storage.ts`, `src/screens/AccountScreen.tsx`
- 추가: `.env.example`, `SUBSCRIPTION_SETUP.md`, `scripts/withRevenueCatAndroidLaunchMode.js`
- 추가: `src/components/PremiumPaywall.tsx`, `src/components/PremiumTransitionNoticeModal.tsx`, `src/lib/subscription.ts`
- 추가: `ios/`, `store-assets/`와 일부 이미지

이 초안에는 RevenueCat, 연 8,900원, 2주 무료 체험, 2026-09-13 전환 같은 과거 가정이 들어 있다. 현재 제품 결정과 다르므로 기준으로 사용하지 않는다.

현재 유효한 사업 결정:

- 출시 앱에는 구독과 결제가 없다.
- 사업자등록 업종 변경이 끝나기 전까지 구독제를 반영하지 않는다.
- 향후 방향은 `첫 달 무료 사용 후 8,900원 과금`이지만, 월간/연간 주기, 기존 사용자 처리, 무료 범위, 스토어 상품 ID, 환불·해지 안내는 다시 확정해야 한다.
- `SUBSCRIPTION_SETUP.md`는 과거 실험 문서이며 그대로 실행하거나 배포하면 안 된다.

새 담당자는 먼저 아래 중 하나를 선택한다.

1. 구독 초안을 별도 브랜치에 보존하고 배포 브랜치를 `d3d2090` 기준의 깨끗한 상태로 유지한다.
2. 사업자등록 변경과 상품 정책 확정 후 초안을 전면 검토해 새로 구현한다.

사용자 승인 없이 미커밋 파일을 삭제하거나 되돌리지 않는다.

## 12. 알려진 위험과 미완료 항목

- 영어권 출시를 원하지만 다국어 리소스 구조와 영어 번역은 아직 없다.
- AI 편지는 숨겨져 있으며 개인정보 처리방침상 외부 AI 전송 없음 상태다.
- 서버 원격 푸시는 없고 로컬 알림만 사용한다. 기록 경향에 따라 서버에서 동적으로 보내는 기능은 미구현이다.
- 알림 예약은 OS 정책, 절전 모드, 알림 권한 변경의 영향을 받는다. 업데이트 전 예약을 새 문구로 바꾸려면 앱이 다시 열리고 재예약 로직이 실행되어야 한다.
- 자정부터 오전 6시 사이 알림 문구가 현재 시간대 함수에서 `오후/일반` 그룹으로 분류되는지 소스에서 재확인할 가치가 있다.
- Android OAuth는 여러 기기에서 수정했지만 Samsung Internet, Chrome, cold start, warm start를 릴리스마다 회귀 테스트한다.
- Android AAB의 R8/Proguard 가독화 파일 경고는 난독화를 사용하지 않는 현재 구성에서는 치명 오류가 아니다. 난독화를 켜면 mapping 파일 업로드까지 자동화한다.
- Google Play 광고 ID 선언은 광고 SDK/광고 ID 사용이 없다는 실제 빌드와 일치하게 유지한다.
- Google Play 비공개 테스트 12명 조건은 Google 계정 기준이며, Play Console의 정식 출시 자격 화면을 기준으로 확인한다.
- 행성은 대형 PNG가 많아 저사양 Android에서 메모리와 렌더링 성능을 계속 확인해야 한다.
- 기존 문서 일부는 초기 MVP 시절 정보다. 특히 `README.md`, `RELEASE_PREP.md`, `STORE_LISTING_DRAFT.md`의 버전·편지·알림 설명은 이 문서 및 현재 소스보다 우선하지 않는다.

## 13. 배포 전 최소 QA

1. `git status`에서 빌드에 포함될 변경을 정확히 확인한다.
2. `npx tsc --noEmit`을 통과한다.
3. 첫 설치 가이드, 20초 로그인 팝업, 첫 기록 3초 뒤 알림 팝업을 확인한다.
4. 게스트 기록 생성 후 Apple, Kakao, Google 로그인과 가져오기 선택을 각각 확인한다.
5. iOS 및 Android에서 로그아웃 후 재로그인, cold start OAuth, 앱 실행 중 OAuth를 확인한다.
6. 기록 생성·수정·삭제가 모아보기, 행성, 분석에 즉시 반영되는지 확인한다.
7. 대표 감정 태그 3개 제한과 iOS 이모지, Android 텍스트 표시를 확인한다.
8. 행성 확대 중심점, 대륙 상세 기본 베이스, 전체 메뉴 레이어 순서를 확인한다.
9. 간격·특정 시간·랜덤 알림과 자정 넘김을 실제 기기에서 확인한다.
10. 행성 이미지 저장 권한 허용과 거부를 확인한다.
11. 앱 버전과 iOS build number, Android version code가 이전 업로드보다 높은지 확인한다.
12. 개인정보 라벨과 Google Data Safety가 실제 SDK 및 결제 상태와 맞는지 다시 확인한다.

## 14. 참고 문서 지도

- `docs/handoff/ACCOUNT_TRANSFER_CHECKLIST.md`: 계정과 외부 서비스 이전 순서
- `docs/handoff/NEW_CHATGPT_START_PROMPT.md`: 새 ChatGPT 계정에 처음 붙여 넣을 프롬프트
- `QA_CHECKLIST.md`: 기능 QA 목록, 단 일부 문구는 최신 소스와 대조 필요
- `UNIVERSE_PLANET_ASSET_RULES.md`: 행성 에셋 배치 원칙
- `PRIVACY_POLICY.md`: 현재 공개 개인정보 처리방침의 원문
- `APP_STORE_PRIVACY_LABEL_DRAFT.md`: Apple 개인정보 라벨 초안
- `GOOGLE_PLAY_DATA_SAFETY_DRAFT.md`: Google 데이터 보안 초안
- `AI_LETTER_SETUP.md`: 비활성 AI 편지 기능의 서버 구조
- `RELEASE_PREP.md`: 초기 출시 준비의 역사적 체크리스트
- `STORE_LISTING_DRAFT.md`: 초기 스토어 문구 초안, 현재 기능과 반드시 재대조

## 15. 새 담당자가 가장 먼저 할 일

1. `docs/handoff/ACCOUNT_TRANSFER_CHECKLIST.md`로 서비스 접근권을 확보한다.
2. 저장소를 clone하고 현재 브랜치와 `d3d2090`을 확인한다.
3. 기존 컴퓨터의 미커밋 구독 초안을 별도 패치 또는 브랜치로 보존한다.
4. App Store Connect와 Play Console에서 `0.1.5`의 실제 현재 상태를 확인한다.
5. Supabase RLS와 운영 OAuth provider 설정을 확인한다.
6. 새 작업은 한 기능씩 작게 수정하고 iOS/Android를 모두 회귀 테스트한다.
