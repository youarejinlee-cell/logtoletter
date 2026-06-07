# App Store Privacy Label Draft

이 문서는 App Store Connect의 앱 개인정보 입력을 준비하기 위한 초안이다. 실제 제출 전 Apple의 최신 질문 화면을 기준으로 다시 확인한다.

## 현재 앱 기준 요약

- 광고 없음
- 사용자 추적 없음
- 결제 없음
- AI API 연결 없음
- 비로그인 사용자는 기기 내 저장 중심
- 로그인 사용자는 Supabase에 기록, 편지, 설정 데이터 동기화

## Data Used to Track You

현재 기준:

- [ ] 사용자를 추적하는 데이터 없음

앱은 현재 광고 네트워크, 크로스앱 추적, 서드파티 광고 식별자를 사용하지 않는다.

## Data Linked to You

로그인 및 서버 동기화를 제공하므로 아래 항목은 사용자와 연결될 수 있다.

### Contact Info

- [x] Email Address

사용 목적:

- App Functionality
- Account Management

### User Content

- [x] Other User Content

포함되는 정보:

- 생각 기록
- 감정 선택
- 에너지 수준
- 편지 내용
- 추신

사용 목적:

- App Functionality
- Personalization

### Identifiers

- [x] User ID

포함되는 정보:

- Supabase 인증 사용자 ID
- Google 로그인 제공자 ID

사용 목적:

- App Functionality
- Account Management

### Photos or Videos

현재 앱은 사진 보관함에 이미지를 저장하기 위한 권한을 사용하지만, 사용자의 사진을 읽거나 서버로 업로드하지 않는다.

초안 판단:

- [ ] Photos or Videos 수집 없음

주의:

- 향후 사용자의 사진을 읽거나 업로드하는 기능을 추가하면 이 항목을 업데이트해야 한다.

## Data Not Linked to You

현재 앱은 별도의 익명 분석 도구를 사용하지 않는다.

- [ ] Diagnostics 수집 없음
- [ ] Usage Data 수집 없음

주의:

- 향후 Analytics, Crashlytics, Sentry 등을 도입하면 이 항목을 다시 검토한다.

## Sensitive Info

앱은 감정과 생각 기록을 다루지만, Apple 개인정보 라벨의 `Sensitive Info`에 해당하는 건강, 금융, 인종, 성적 지향, 종교, 정치적 견해 등을 명시적으로 수집하도록 설계되어 있지는 않다.

초안 판단:

- [ ] Sensitive Info 수집 없음

주의:

- 사용자가 자유 입력란에 민감 정보를 직접 입력할 수 있으므로, 개인정보 처리방침에는 민감한 정보를 입력할 때 주의하라는 문구를 유지한다.
- 향후 앱이 특정 민감 정보 입력을 유도하거나 분석하면 이 항목을 업데이트해야 한다.

## Location

현재 앱은 위치 권한을 사용하지 않는다.

- [ ] Location 수집 없음

## Contacts

현재 앱은 연락처 권한을 사용하지 않는다.

- [ ] Contacts 수집 없음

## Purchases

현재 앱은 결제 기능을 사용하지 않는다.

- [ ] Purchases 수집 없음

## Search History / Browsing History

현재 앱은 검색 기록 또는 브라우징 기록을 수집하지 않는다.

- [ ] Search History 수집 없음
- [ ] Browsing History 수집 없음

## Health and Fitness

현재 앱은 HealthKit 또는 피트니스 데이터를 사용하지 않는다.

- [ ] Health and Fitness 수집 없음

## App Store 입력 전 확인 질문

- [ ] Google 로그인에서 프로필 이미지 URL을 저장하거나 표시하는지 최종 확인한다.
- [ ] Supabase에 저장되는 `profiles` 테이블 필드를 최종 확인한다.
- [ ] 앱이 운영 빌드에서 테스트 콘솔 데이터를 전송하지 않는지 확인한다.
- [ ] 이미지 저장은 사진 보관함에 쓰기만 하는지 확인한다.
- [ ] 마이크/음성 인식 기능이 실제 출시 빌드에서 활성화되어 있는지 확인한다.
- [ ] 계정 삭제 기능이 실제로 서버 데이터를 삭제하는지 확인한다.

