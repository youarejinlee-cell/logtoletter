# 무슨 생각 Expo MVP

짧은 생각 기록을 모아 일주일마다 편지처럼 되돌려주는 React Native/Expo MVP입니다.

## 실행

```bash
npm install
npx expo start
```

휴대폰에 Expo Go를 설치한 뒤 터미널에 뜨는 QR 코드를 스캔하면 됩니다.
Expo SDK 56 기준으로 만들었습니다. Android에서 원격 푸시는 개발 빌드가 필요하지만, 이 MVP의 로컬 알림은 Expo Go에서도 테스트할 수 있습니다.

## 포함된 기능

- 생각, 감정, 에너지 기록
- 기기 저장소 기반 로컬 저장
- 시작 시간, 알림 간격, 방해금지 시간 설정
- Expo 로컬 알림 예약
- 최근 기록 삭제/초기화
- 일주일 기록 기반 편지 생성
- 반복 키워드와 다음 주 행동 제안

## 다음 단계

- Supabase Auth/Postgres 연결
- OpenAI API 기반 주간 편지 생성
- 실제 원격 푸시를 위한 Expo Push Token 저장
- 개발 빌드/EAS Build 구성
- 위기 표현 감지 및 안전 안내 플로우
