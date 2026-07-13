# Google Play Data Safety Draft

이 문서는 Google Play Console의 `Data safety` 섹션 입력을 준비하기 위한 초안이다. 실제 제출 전 Google Play Console의 최신 질문 화면과 앱의 실제 동작을 기준으로 다시 확인한다.

참고 기준:

- Google Play Console의 App content 페이지에서 Data safety form을 작성해야 한다.
- Google Play의 User Data 정책에 따라 개인정보 처리방침 URL을 Play Console 지정 필드에 입력해야 하며, 앱 또는 웹에서도 접근 가능해야 한다.
- Data safety 답변은 개인정보 처리방침, 앱 권한, 실제 SDK 동작과 일치해야 한다.

## 1. 현재 앱 기준 요약

- 앱 이름: `Log Planet`
- 광고: 없음
- 결제: 없음
- 사용자 추적: 없음
- AI API 연결: 현재 없음
- 분석/크래시 리포팅 SDK: 현재 없음
- 위치 권한: 없음
- 연락처 권한: 없음
- 사진 읽기: 없음
- 사진 저장: 편지 이미지를 사용자의 앨범에 저장할 때만 사용
- 로그인: Google OAuth via Supabase
- 데이터 저장:
  - 비로그인: 기기 로컬 저장
  - 로그인: Supabase 서버 동기화

## 2. Data Collection 여부

Google Play 기준에서 앱이 데이터를 기기 밖 서버로 전송하거나 개발자가 접근 가능한 방식으로 처리하면 수집으로 볼 수 있다.

현재 앱은 로그인 사용자의 데이터를 Supabase에 동기화하므로:

- [x] 앱이 사용자 데이터를 수집함

비로그인 상태에서 기기 안에만 저장되는 기록은 서버 수집이 아니지만, 앱 전체 기준으로는 로그인 동기화 기능이 있으므로 Data safety form에는 수집 항목을 신고한다.

## 3. Data Sharing 여부

Google Play에서 `sharing`은 수집한 사용자 데이터를 제3자에게 전송하는 경우를 의미한다. 서비스 제공업체가 개발자를 대신해 데이터를 처리하는 경우 등 예외가 있을 수 있으나, 실제 콘솔 입력 전 Supabase/Google 사용 범위를 확인해야 한다.

현재 초안 판단:

- [ ] 사용자 데이터를 광고 목적 또는 독립적 제3자 목적을 위해 공유하지 않음
- [x] Supabase는 앱 기능 제공을 위한 서비스 제공업체로 사용
- [x] Google 로그인은 사용자가 선택한 인증 제공자로 사용

주의:

- Google Play Console에서 `sharing` 질문은 예외 조건을 확인한 뒤 입력한다.
- 향후 광고, 외부 분석 SDK, AI API를 추가하면 sharing 여부를 다시 검토한다.

## 4. 수집 데이터 유형

### Personal info

#### Email address

- [x] 수집함
- 수집 시점: Google 로그인 시
- 연결 여부: 사용자 계정과 연결됨
- 목적:
  - App functionality
  - Account management
- 필수 여부:
  - 로그인/동기화 기능 사용 시 필요
  - 비로그인 기본 기록 기능에는 필수 아님

#### Name

- [x] 수집할 수 있음
- 수집 시점: Google 로그인 시 Google 프로필 이름이 제공되는 경우
- 연결 여부: 사용자 계정과 연결됨
- 목적:
  - App functionality
  - Account management
- 필수 여부:
  - 로그인/동기화 기능 사용 시 제공될 수 있음

### User IDs

#### User IDs

- [x] 수집함
- 포함:
  - Supabase 인증 사용자 ID
  - Google OAuth 제공자 ID
- 연결 여부: 사용자 계정과 연결됨
- 목적:
  - App functionality
  - Account management
- 필수 여부:
  - 로그인/동기화 기능 사용 시 필요

### User content

#### Other user-generated content

- [x] 수집함
- 포함:
  - 생각 기록
  - 선택한 감정
  - 선택한 에너지 수준
  - 편지 내용
  - 추신
- 연결 여부: 로그인 사용자의 계정과 연결될 수 있음
- 목적:
  - App functionality
  - Personalization
- 필수 여부:
  - 앱의 핵심 기능 사용에 필요

### App activity

#### App interactions

현재 별도 분석 SDK를 통해 앱 상호작용을 수집하지 않는다.

- [ ] 수집하지 않음

주의:

- 향후 Firebase Analytics, Amplitude, Mixpanel, Sentry 등 분석/진단 SDK를 추가하면 다시 검토한다.

### App info and performance

#### Crash logs / Diagnostics

현재 별도 크래시 리포팅 SDK를 통해 진단 데이터를 수집하지 않는다.

- [ ] 수집하지 않음

주의:

- Expo/EAS 또는 운영 과정에서 크래시/진단 SDK를 추가하면 신고해야 할 수 있다.

### Photos and videos

현재 앱은 편지 이미지를 사진 보관함에 저장하기 위해 권한을 사용할 수 있지만, 사용자의 사진이나 영상을 읽거나 서버로 업로드하지 않는다.

초안 판단:

- [ ] 사진/영상 데이터를 수집하지 않음

주의:

- 향후 사진 선택, 프로필 이미지 업로드, 갤러리 읽기 기능을 추가하면 다시 검토한다.

### Audio files / Voice or sound recordings

앱은 음성 기록 기능을 위해 마이크/음성 인식 권한을 요청할 수 있다.

현재 초안 판단:

- [ ] 음성 파일을 서버에 저장하지 않음
- [ ] 음성 녹음 파일을 수집하지 않음

주의:

- 기기 내 음성 인식만 사용하는지, 외부 음성 인식 서비스로 음성이 전송되는지 최종 확인해야 한다.
- 음성 데이터를 서버로 전송하거나 저장하면 이 항목을 수집으로 신고해야 한다.

### Location

현재 위치 권한을 사용하지 않는다.

- [ ] 수집하지 않음

### Contacts

현재 연락처 권한을 사용하지 않는다.

- [ ] 수집하지 않음

### Financial info

현재 결제 기능이 없다.

- [ ] 수집하지 않음

### Health and fitness

현재 Health Connect, Google Fit, 건강 데이터를 사용하지 않는다.

- [ ] 수집하지 않음

### Device or other IDs

현재 광고 ID 또는 별도 기기 ID를 수집하도록 설계되어 있지 않다.

초안 판단:

- [ ] 수집하지 않음

주의:

- Google/Firebase/분석/광고 SDK 추가 시 자동 수집 여부를 반드시 확인한다.

## 5. 데이터 사용 목적 요약

현재 신고 대상 데이터의 사용 목적:

- App functionality
  - 기록 저장
  - 캘린더 표시
  - 편지 생성 및 보관
  - 알림 설정 저장
  - 이미지 저장 기능 제공
- Personalization
  - 사용자의 기록 기반 편지와 요약 제공
  - 사용자 설정 유지
- Account management
  - Google 로그인
  - 계정별 데이터 동기화
  - 계정 삭제 및 데이터 삭제

현재 사용하지 않는 목적:

- [ ] Advertising or marketing
- [ ] Analytics
- [ ] Developer communications
- [ ] Fraud prevention, security, and compliance

주의:

- 보안 로그나 abuse 방지 기능을 추가하면 `Fraud prevention, security, and compliance`를 검토한다.
- 이메일 공지 기능을 추가하면 `Developer communications`를 검토한다.

## 6. 데이터 보호와 삭제

Google Play Data safety에서 물어볼 수 있는 항목:

### Data encrypted in transit

초안 답변:

- [x] 전송 중 암호화됨

근거:

- Supabase 및 Google OAuth는 HTTPS 기반 통신을 사용한다.

### Users can request deletion

초안 답변:

- [x] 사용자가 데이터 삭제를 요청할 수 있음

앱 내 기능:

- 내 기록과 편지 완전 삭제
- 내 계정 삭제

출시 전 확인:

- [ ] 앱 내 계정 삭제가 실제 Supabase 데이터 삭제와 연결되어 있다.
- [ ] Google Play의 데이터 삭제 URL 요구사항이 있으면 공개 URL을 준비한다.
- [ ] 개인정보 처리방침에도 데이터 삭제 방법을 명시한다.

## 7. Android 권한 점검

현재 앱 기능 기준 확인할 권한:

- [ ] 알림 권한
- [ ] 사진 보관함 저장 관련 권한
- [ ] 마이크 권한
- [ ] 음성 인식 관련 권한

출시 전 확인:

- [ ] AndroidManifest에 불필요한 권한이 들어가지 않았는지 확인한다.
- [ ] 사용하지 않는 권한은 제거한다.
- [ ] 권한 요청 전 사용자에게 기능 목적이 명확히 설명된다.

## 8. Google Play Console 입력 전 체크

- [ ] 개인정보 처리방침 URL이 공개되어 있다.
- [ ] 앱 내부 또는 설정 화면에서 개인정보 처리방침에 접근할 수 있다.
- [ ] Data safety 답변이 `PRIVACY_POLICY.md`와 일치한다.
- [ ] Supabase에 실제 저장되는 테이블과 필드를 확인했다.
- [ ] Google 로그인에서 받아오는 프로필 정보 범위를 확인했다.
- [ ] 운영 빌드에 테스트 콘솔이 노출되지 않는다.
- [ ] 음성 입력 기능의 실제 데이터 흐름을 확인했다.
- [ ] 사진 저장 기능이 사용자의 사진을 읽거나 업로드하지 않는지 확인했다.
- [ ] 광고/분석 SDK가 포함되어 있지 않은지 확인했다.

## 9. Google Play 등록 정보 준비

### 앱 이름

`Log Planet`

### 짧은 설명 후보

`순간의 기록이 지난 나를 돌아보는 편지가 되는 앱`

### 긴 설명 후보

`Log Planet은 생각과 감정을 짧게 남기고, 시간이 지난 뒤 편지처럼 돌아볼 수 있게 돕는 기록 앱입니다.`

`기록 탭에서 지금의 생각과 감정을 남기고, 캘린더에서 날짜별 에너지와 감정 흐름을 확인할 수 있습니다. 편지보관함에서는 지난 기록을 바탕으로 정리된 편지를 다시 읽을 수 있습니다.`

`기록은 기기에 저장되며, Google 계정으로 로그인하면 서버에 동기화할 수 있습니다.`

## 10. 최종 판단 메모

현재 Android 배포 기준에서 가장 중요한 확인 포인트는 아래 3개다.

1. Google Play Data safety와 개인정보 처리방침이 서로 모순되지 않을 것
2. 계정 삭제/데이터 삭제가 실제로 동작할 것
3. 마이크/음성 인식 권한이 실제 출시 기능과 일치할 것

