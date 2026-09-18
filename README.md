# AI Inbox — 흩어진 연락을 지금 해야 할 일로

AI Championship 2026 대회 MVP. 여러 곳에서 받은 요청을 **관계(업체)별로 연결**하고, 같은 업무에 대한
**변경을 추적**해 **지금 유효한 할 일**을 보여주는 웹 앱이다.

- 제품 기획: [AI_Championship_2026_서비스_기획서.md](AI_Championship_2026_서비스_기획서.md)
- 구현 계약(타입·판단 규칙·API): [docs/implementation-contract.md](docs/implementation-contract.md)
- 수용 테스트 결과(T01–T20): [docs/acceptance.md](docs/acceptance.md)
- 3분 시연 스크립트: [docs/demo-script.md](docs/demo-script.md)
- 배포 가이드(Vercel + Turso): [docs/deploy.md](docs/deploy.md)

## 핵심 장면

1. "A창호 김과장입니다. 20일까지 300만원 송금 부탁드립니다." → 송금 3,000,000원, 마감 2026.09.20 업무 생성
2. "A창호 이대리입니다. 송금은 22일까지 부탁드립니다." → **같은 업무**를 찾아 마감 09.20 → 09.22 변경안 제시 → [변경 반영]
3. "24일까지 해주셔도 될 것 같긴 한데 확인해볼게요." → **변경 가능성**으로 표시, 현재 마감 09.22 유지

AI는 해석과 연결 후보만 제안한다. 현재 값은 사용자가 결정했을 때만 서버 규칙으로 바뀐다.

## 실행

Node 20.9 이상 (개발 환경: Node 26).

```bash
npm install
npm test                 # Vitest 181개
npm run build            # 프로덕션 빌드(타입 검사 포함)
npm start                # http://localhost:3000
npm run dev              # 개발 서버
```

> Windows PowerShell 프로필 오류로 `npm`/`npx`가 실패하면 `node node_modules/next/dist/bin/next build`,
> `node node_modules/vitest/vitest.mjs run`처럼 직접 실행하면 된다.

환경 변수는 [.env.example](.env.example)을 복사해 `.env.local`로 만든다. **값이 하나도 없어도 동작한다** —
이때 분석은 외부 호출 없는 규칙 엔진으로 처리되고 화면에 "데모 분석(규칙 기반)"으로 표시된다.

## AI 연결

| 순서 | 제공자 | 켜는 조건 |
|---|---|---|
| 1 | OmniRoute (로컬 AI 라우터, OpenAI 호환) | `OMNIROUTE_MODEL` (키를 요구하는 설정이면 `OMNIROUTE_API_KEY`도) |
| 2 | Gemini | `GEMINI_API_KEY` + `GEMINI_MODEL` |
| 3 | OpenRouter | `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` |
| 마지막 | 데모 규칙 엔진 | `AI_DEMO_FALLBACK=true`(기본) |

- 순서는 `AI_PROVIDER_ORDER`로 바꾼다. 실패·시간 초과(기본 20초)·형식 오류(1회 재시도 후)면 다음 제공자로 넘어간다.
- 날짜("20일", "내일", "다음 주 금요일")와 금액("300만원 말고 350만원으로")은 AI 답과 별개로 서버가 결정적으로 다시 해석한다.
- 입력 안의 지시문("이전 규칙을 무시하고…")은 분석 자료로만 취급한다.
- OmniRoute는 이 PC에서만 접근 가능하다. 배포 서버에서는 Gemini·OpenRouter를 쓴다.

### OmniRoute 연결 (로컬)

이 PC의 OmniRoute는 클라이언트 API 키를 요구한다. OmniRoute 대시보드 → Endpoints에서 앱용 키를 만든 뒤:

```bash
omniroute dashboard
```

`.env.local`에 `OMNIROUTE_API_KEY=<발급한 키>`, `OMNIROUTE_MODEL=auto`를 넣고 서버를 다시 시작한다.
분석 결과 화면의 배지가 "데모 분석" 대신 제공자 이름으로 바뀌면 연결된 것이다.

## 입력 방식

| 방식 | 상태 | 제한 |
|---|---|---|
| 텍스트 붙여넣기 | 사용 가능 | 2,000자 |
| PDF | 사용 가능 (서버에서 글자 추출 → 입력창에 채움 → 확인 후 분석) | 4MB, 10페이지, 암호·스캔본 PDF 불가 |
| 이미지 | AI 제공자가 연결됐을 때만 활성 (비전 모델로 글자 인식) | PNG·JPG·WEBP, 4MB |

## 데이터 보관

- 원문은 분석 요청을 처리하는 동안 서버 메모리와 브라우저 화면 상태에만 있다. DB·로그·브라우저 저장소에 쓰지 않는다.
  저장되는 것은 관계·담당자·업무의 구조화 값과 "누가 무엇을 바꿨는지" 이력뿐이다.
- 데모 세션은 쿠키로 구분되고 기본 24시간 뒤 삭제된다. 푸터의 [데모 데이터 삭제]로 즉시 지울 수 있다.
- 외부 AI 공급자 쪽 보존 정책은 공급자 설정·약관을 따른다. 앱에서 지워도 공급자 쪽 무보관을 보장하지 않는다.

## 구조

```
src/lib/types.ts        공유 타입 (API·도메인 계약)
src/lib/ai/             제공자 체인·프롬프트·날짜/금액 해석·데모 규칙 엔진·비전(이미지 글자 인식)
src/lib/server/         DB(libSQL)·세션·판단 규칙(judge)·결정 적용(apply)·조회
src/lib/files/          PDF·이미지 파일 검증과 글자 추출
src/app/api/            API 라우트
src/app/, src/components/  화면 (대시보드·입력/분석·확인 필요·관계·타임라인)
tests/                  Vitest (ai / server / files) + 실제 모델 응답·한국어 PDF 픽스처
```

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zod 4 · libSQL(`@libsql/client`, 로컬 파일 / Turso) · unpdf · Vitest
