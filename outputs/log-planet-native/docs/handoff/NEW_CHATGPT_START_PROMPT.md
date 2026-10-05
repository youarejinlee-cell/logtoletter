# 새 ChatGPT 계정 시작 프롬프트

아래 내용을 새 ChatGPT/Codex 계정의 첫 대화에 붙여 넣고, 이 저장소의 `docs/handoff/README.md`와 `docs/handoff/ACCOUNT_TRANSFER_CHECKLIST.md`를 먼저 읽게 한다.

```text
Log Planet 프로젝트를 이어서 개발하려고 해.

작업을 시작하기 전에 저장소의 아래 문서를 순서대로 읽어줘.
1. docs/handoff/README.md
2. docs/handoff/ACCOUNT_TRANSFER_CHECKLIST.md
3. UNIVERSE_PLANET_ASSET_RULES.md
4. PRIVACY_POLICY.md
5. QA_CHECKLIST.md

중요한 기준:
- Log Planet은 순간의 생각, 감정, 사용한 에너지를 짧게 기록하면 월별 개인 행성으로 쌓이는 Expo/React Native 앱이야.
- 긴 일기를 강요하거나 감정을 진단하지 않고, 사용자가 자신의 반복과 흐름을 차분히 관찰하게 하는 것이 핵심 철학이야.
- 기존 기록과 사용자 데이터 보존이 UI 개편보다 우선이야.
- 현재 배포 기준은 앱 버전 0.1.5, 커밋 d3d2090이야.
- 현재 브랜치는 codex/pre-env-split-checkpoint-2026-07-13이야.
- 최신 EAS 빌드는 iOS 0.1.5 (22), Android 0.1.5 (18)이야.
- Apple, Kakao, Google 로그인과 Supabase 동기화를 사용해.
- Android 운영 OAuth는 GitHub Pages HTTPS App Link를 사용해.
- 로컬 알림은 expo-notifications로 예약하며 서버 푸시는 아직 없어.
- AI 편지 코드는 있지만 사용자 화면에서는 비활성화되어 있고 개인정보 처리방침도 외부 AI 전송 없음 상태야.
- 구독제는 아직 출시하거나 반영하지 않았어. 사업자등록 업종 변경 전이라 보류 상태야.
- 로컬 작업 트리에 RevenueCat/paywall 구독 초안이 미커밋 상태로 남아 있을 수 있어. 출시 기능으로 간주하거나 production build에 포함하지 마.
- 과거 구독 초안의 연 8,900원/2주 무료 조건은 폐기된 가정이야. 향후 방향은 첫 달 무료 후 8,900원이지만 세부 상품 정책은 다시 확정해야 해.
- 비밀키, 토큰, authorization code, 이메일과 사용자 기록을 로그나 문서에 노출하지 마.
- 관련 없는 파일이나 사용자가 만든 미커밋 변경을 되돌리지 마.

먼저 아래를 실행하거나 확인하고 결과를 요약해줘.
1. git status, 현재 브랜치, origin, 최근 10개 커밋
2. app.config.js, eas.json, package.json의 실제 현재값
3. 미커밋 구독 초안이 배포 코드와 섞여 있는지
4. npx tsc --noEmit 결과
5. App Store Connect와 Google Play의 최신 실제 배포 상태는 접근 가능할 때만 확인하고, 추측하지 말 것

그 다음 내가 요청하는 변경을 최소 범위로 구현하고 iOS와 Android 회귀 영향을 함께 설명해줘.
```

## 새 대화에서 함께 전달할 것

- 저장소 또는 로컬 프로젝트 폴더
- 이 문서가 포함된 커밋/브랜치
- 외부 서비스의 초대가 완료됐다는 확인
- 현재 우선순위 한 문장
- 필요한 경우 재현 영상과 실제 기기 정보

비밀번호나 API secret은 프롬프트에 붙이지 않는다.
