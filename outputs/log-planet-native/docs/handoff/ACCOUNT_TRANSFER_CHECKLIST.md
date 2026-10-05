# Log Planet 계정 및 서비스 이전 체크리스트

최종 확인일: 2026-09-24 (KST)

ChatGPT 계정을 바꾸는 것만으로 GitHub, Expo, Supabase, Apple, Google, Kakao의 소유권이나 로그인 세션이 이전되지는 않는다. 새 ChatGPT 계정에는 프로젝트 파일과 이 문서를 제공하고, 각 외부 서비스는 별도로 멤버 초대 또는 소유권 이전을 해야 한다.

## 1. 이전 원칙

- 비밀번호, 복구 코드, private key, service role key를 Git이나 ChatGPT 대화에 붙이지 않는다.
- 가능하면 계정 자체를 공유하지 말고 새 이메일을 멤버로 초대한다.
- 개인 계정 소유 서비스는 팀/조직으로 옮길 수 있는지 먼저 확인한다.
- 기존 계정의 접근권은 새 계정에서 빌드·로그인·배포가 실제로 된 뒤 제거한다.
- 인증 앱, 복구 이메일, 전화번호와 2단계 인증 복구 코드는 비밀번호 관리자에 별도로 보관한다.

## 2. GitHub

현재 정보:

- 앱 저장소: `https://github.com/youarejinlee-cell/logtoletter`
- Pages 소유자: `youarejinlee-cell`
- Pages URL: `https://youarejinlee-cell.github.io/logtoletter/`

체크리스트:

- [ ] 새 GitHub 계정을 저장소 collaborator 또는 조직 멤버로 초대
- [ ] 새 계정에서 clone, fetch, push 권한 확인
- [ ] 기본 브랜치와 현재 작업 브랜치의 차이 확인
- [ ] branch protection, Actions secrets, deploy key 확인
- [ ] GitHub Pages 저장소/배포 권한 이전
- [ ] Android App Links의 `assetlinks.json`과 OAuth callback 페이지가 계속 공개되는지 확인
- [ ] 저장소 소유권을 완전히 넘길 경우 Pages URL과 App Link 도메인이 바뀌지 않도록 계획

도메인이 바뀌면 Android intent filter, Supabase redirect URL, Kakao/Google OAuth 설정, 공개 개인정보 URL을 모두 같이 바꿔야 한다.

## 3. Expo / EAS

현재 정보:

- Expo 사용자: `you.are.jinlee`
- 프로젝트 slug: `log-to-letter`
- 프로젝트 ID: `46937731-6170-43ee-9258-3bc7a75537ee`
- 앱 소유 계정: `you.are.jinlee`
- `eas.json`은 remote app version과 production auto increment를 사용

체크리스트:

- [ ] 새 Expo 계정을 생성하고 기존 계정/조직에 초대
- [ ] 프로젝트를 조직으로 이전할지, 기존 owner 아래 공동 관리할지 결정
- [ ] 새 계정에서 `npx eas-cli whoami` 확인
- [ ] 새 계정에서 프로젝트 빌드 목록 열람 확인
- [ ] iOS distribution certificate와 provisioning profile 접근 확인
- [ ] App Store Connect API key의 EAS 연동 상태 확인
- [ ] EAS environment variables와 secrets 목록 확인, 값은 보안 채널로 이전
- [ ] Google Play service account key를 새로 구성할지 결정

현재 Android 자동 제출용 Google service account key가 EAS에 없어 Play Console에 AAB를 수동 업로드했다.

## 4. Apple Developer / App Store Connect

현재 정보:

- Bundle ID: `com.youarejinlee.logplanet`
- App Store Connect 앱 ID: `6792235981`
- 최신 확인 빌드: `0.1.5 (22)`
- Sign in with Apple 사용

체크리스트:

- [ ] 새 Apple ID를 App Store Connect 사용자로 초대
- [ ] 역할에 앱 관리, TestFlight, 인증서 권한이 충분한지 확인
- [ ] Apple Developer team의 Certificates, Identifiers & Profiles 접근 확인
- [ ] Bundle ID와 Sign in with Apple capability 확인
- [ ] App Store Connect API key 관리 주체 확인
- [ ] 계약, 세금 및 금융 정보 상태 확인
- [ ] 앱 소유권 자체를 다른 법인/개발자 계정으로 이전할지 별도 결정
- [ ] TestFlight 내부/외부 테스터 그룹과 심사 메모 인계
- [ ] 개인정보 라벨, 연령 등급, 지원 URL, 마케팅 URL 확인

주의:

- 앱 이전은 단순 멤버 초대보다 범위가 크다. Sign in with Apple 사용자 이전, Bundle ID, 인증서, 계약 요건을 Apple의 당시 정책으로 다시 확인한다.
- 과거 승인된 마케팅 버전과 같은 버전을 다시 올리면 `ITMS-90186`, `ITMS-90062`가 발생했다. `CFBundleShortVersionString`을 항상 올린다.

## 5. Google Play Console

현재 정보:

- Package: `com.youarejinlee.logplanet`
- Play 앱 ID: `4975439721606975596`
- 개발자 계정 ID: `7668876657649204614`
- 비공개 테스트 track ID: `4701218025402055349`
- 최신 확인 AAB: `0.1.5`, version code `18`

체크리스트:

- [ ] 새 Google 계정을 Play Console 사용자로 초대
- [ ] 앱 보기, 릴리스 관리, 테스트 관리 권한 확인
- [ ] 비공개 테스트 테스터 목록/Google Group 인계
- [ ] 정식 출시 자격의 12명/14일 진행 상황을 콘솔에서 확인
- [ ] App signing key와 upload key 관리 방식 확인
- [ ] Data Safety, 광고 ID 선언, 앱 액세스, 콘텐츠 등급 상태 확인
- [ ] 계정 삭제 URL과 개인정보 처리방침 URL 확인
- [ ] Google Cloud service account를 만들 경우 최소 권한 부여
- [ ] EAS Submit을 쓸 경우 service account JSON을 EAS credential로 등록

내부 테스트와 비공개 테스트는 별도 트랙이다. 정식 출시 자격 조건은 비공개 테스트 기준으로 콘솔 표시를 따른다.

## 6. Supabase

현재 역할:

- Apple, Kakao, Google 인증
- 로그인 사용자 데이터 저장과 동기화
- 계정 삭제 Edge Function
- 비활성 상태의 AI 편지 Edge Function

체크리스트:

- [ ] 새 이메일을 Supabase organization/project 멤버로 초대
- [ ] Project URL과 anon key를 새 개발 환경에 안전하게 설정
- [ ] service role key는 서버/Edge Function에서만 사용
- [ ] Auth providers의 client ID와 secret 소유권 확인
- [ ] Redirect URL allowlist 확인
- [ ] RLS 정책이 모든 사용자 데이터 테이블에 적용되는지 확인
- [ ] Database migrations와 현재 운영 schema 차이 확인
- [ ] Edge Function secrets와 deploy 권한 확인
- [ ] 백업, PITR 또는 정기 export 정책 결정
- [ ] 계정 삭제가 Auth user와 모든 관련 테이블을 지우는지 테스트

클라이언트 설정 파일은 `src/lib/supabaseConfig.ts`이고 예시는 `src/lib/supabaseConfig.example.ts`다. 비밀값을 새 문서에 옮기지 않는다.

## 7. OAuth 제공자

### Kakao Developers

- [ ] 새 담당자를 앱 owner/editor로 추가
- [ ] Redirect URI와 개인정보 동의 항목 확인
- [ ] 닉네임 미동의 시 `이름 없는 여행자` fallback 확인
- [ ] Android package/key hash 설정 확인
- [ ] client secret을 보안 채널로 인계

### Google Cloud / Google Auth Platform

- [ ] OAuth consent screen 관리자 권한 이전
- [ ] iOS/Android/Web OAuth client 목록 확인
- [ ] 승인된 redirect URI와 도메인 확인
- [ ] 공개 개인정보 처리방침과 지원 이메일 확인
- [ ] client secret을 Git에 넣지 않기

### Sign in with Apple

- [ ] Apple Developer team, Service ID/Bundle ID, key 관리 권한 확인
- [ ] Supabase Apple provider 설정과 key 만료/회전 계획 확인
- [ ] 앱을 다른 Apple team으로 이전할 경우 사용자 transfer 절차 별도 수행

## 8. GitHub Pages와 공개 문서

- [ ] 개인정보 처리방침 페이지 접근 확인
- [ ] 계정 삭제 요청 절차와 삭제 데이터/보관 기간 명시 확인
- [ ] Android App Link callback 페이지 접근 확인
- [ ] `/.well-known/assetlinks.json`의 package와 certificate fingerprint 확인
- [ ] 지원 이메일을 계속 사용할지 결정
- [ ] 사업자 정보 또는 결제 정책이 바뀌면 개인정보 처리방침과 이용약관 업데이트

## 9. 구독과 결제: 현재 보류

- [ ] 사업자등록 업종 변경 완료 전 앱에 결제 기능을 넣지 않기
- [ ] 출시 앱에는 RevenueCat 또는 paywall이 포함되지 않았음을 확인
- [ ] 로컬 미커밋 구독 초안을 별도 브랜치에 격리
- [ ] `첫 달 무료 후 8,900원`의 결제 주기와 자동 갱신 조건 재확정
- [ ] Apple/Google 인앱구매 상품과 RevenueCat 사용 여부 결정
- [ ] 이용약관, 환불/해지, 개인정보처리방침, 스토어 데이터 공개 업데이트
- [ ] Sandbox와 Play Billing test account로 구매·복원·취소·만료 QA

## 10. 새 컴퓨터/새 ChatGPT 계정의 첫 검증

```sh
git clone https://github.com/youarejinlee-cell/logtoletter.git
cd logtoletter
git fetch --all --tags
git switch codex/pre-env-split-checkpoint-2026-07-13
git log -5 --oneline
```

앱이 저장소 하위 폴더 구조 그대로라면 실제 앱 폴더로 이동한다. 이후:

```sh
npm install
npx tsc --noEmit
npx eas-cli whoami
npx eas-cli build:list --platform all --limit 5
```

다음 항목을 실제로 성공한 뒤 기존 계정 접근을 제거한다.

- [ ] Git push
- [ ] EAS preview build
- [ ] Supabase 로그인과 데이터 조회
- [ ] TestFlight 접근
- [ ] Play 비공개 테스트 릴리스 접근
- [ ] 개인정보/콜백 공개 URL 관리

## 11. 별도로 안전하게 보관할 비밀 목록

값 자체는 이 문서에 쓰지 않는다.

- GitHub 복구 코드 또는 PAT
- Expo/EAS 로그인과 복구 수단
- Apple Developer/App Store Connect 인증 및 API key 파일
- iOS certificate/provisioning 관련 백업
- Google Play upload key/keystore와 비밀번호
- Google service account JSON
- Supabase service role key 및 database password
- Google OAuth client secret
- Kakao client secret
- Sign in with Apple private key
- OpenAI API key(편지 기능을 다시 켤 경우)
- 향후 RevenueCat secret key
