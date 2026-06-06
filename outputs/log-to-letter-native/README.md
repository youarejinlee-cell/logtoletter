# Log to Letter Native

Expo + React Native로 옮기는 첫 네이티브 MVP입니다.

## 실행

```bash
cd outputs/log-to-letter-native
npm install
npm run start
```

Expo Go 앱으로 QR 코드를 스캔하면 실제 기기에서 확인할 수 있습니다.

## 현재 옮겨둔 것

- 기록 화면: 생각, 힌트, 감정, 에너지 선택 후 저장
- 캘린더 화면: 최근 기록 리스트
- 받은 편지함: 월별 편지 목록 → 편지 상세 → 받은 편지목록으로 돌아가기
- 기록 알림 설정: 네이티브 푸시 설정 UI 초안
- 테스트 콘솔: 운영 전 제거할 개발용 화면 초안
- 로컬 저장: AsyncStorage 기반

## 다음 단계

1. Supabase Google 로그인 연결
2. 로컬 기록을 로그인 계정으로 마이그레이션
3. Expo Notifications 권한 요청 및 push token 저장
4. Supabase Edge Function 또는 서버 스케줄러로 실제 푸시 발송
5. 받은 편지함을 AI API 생성 편지와 연결
