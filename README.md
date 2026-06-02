# AI 에이전트 매칭 플랫폼

도서 **《설계 지능》(이지스퍼블리싱)**의 **실전 프로젝트 II** 예제 소스입니다.
자연어 요청을 받아, AI 에이전트가 후보를 검색·점수화하고 '추천 이유'까지 설명하는 매칭 서비스입니다.

## 핵심 개념
- **에이전트 + 도구**: `searchCandidates`(검색) · `checkAvailability`(일정) · `scoreMatch`(점수) 도구를 조합
- **우리만의 가중치**(서비스의 정체성): 전문분야 40% · 일정 25% · 만족도 20% · 소통궁합 15%
- **개인정보 보호**: 매칭 확정 전 실명·연락처는 'OOO 전문가'로 가림
- AI(Gemini)가 ① 자연어 요청의 의도를 추출하고 ② 점수 근거 기반의 추천 이유를 생성

## 기술 스택
| 영역 | 도구 |
|------|------|
| 백엔드 | NestJS + Prisma |
| 데이터베이스 | SQLite(로컬, 추가 설치 0) / PostgreSQL(배포 시) |
| AI | Google Gemini API |
| 프론트엔드 | 정적 HTML + Tailwind (참고용 화면) |

## 실행 방법
```
# 백엔드
cd backend
npm install
cp .env.example .env        # GEMINI_API_KEY 채우기
npm run prisma:push         # SQLite dev.db 생성
npm run seed                # 후보 프로필 시드
npm start                   # http://localhost:3002

# 프론트엔드 (다른 터미널)
cd frontend
python -m http.server 3000  # http://localhost:3000
```

## 동작
프론트에서 "주말에 가능한 Nest.js 멘토 찾아줘" 같은 자연어를 입력하면, 에이전트가 후보를 찾아 **점수·항목별 분해·추천 이유**와 함께 상위 3명을 반환합니다.

> ⚠️ `.env`와 `*.db`는 절대 커밋 금지(`.gitignore`로 제외됨).
