# 배포 가이드 — Vercel + Turso

> 이 저장소는 배포를 수행하지 않았다. 아래는 배포 담당자가 따라 할 절차다.
> 결제·외부 계정 생성·키 발급은 배포 담당자가 직접 한다.

## 1. 왜 Turso인가

Vercel 함수는 매 요청마다 파일시스템이 초기화될 수 있어 로컬 SQLite 파일(`file:data/ai-inbox.db`)이 유지되지 않는다.
앱은 `@libsql/client`를 쓰므로 **코드 수정 없이** `DATABASE_URL`만 Turso 주소로 바꾸면 된다.
스키마는 첫 요청 때 `CREATE TABLE IF NOT EXISTS`로 자동 생성된다.

## 2. Turso 데이터베이스 만들기

```bash
turso auth login
turso db create ai-inbox --location icn        # 서울 리전(가능한 경우)
turso db show ai-inbox --url                   # → libsql://ai-inbox-<org>.turso.io
turso db tokens create ai-inbox                # → DATABASE_AUTH_TOKEN
```

## 3. Vercel 환경 변수

| 변수 | 값 |
|---|---|
| `DATABASE_URL` | `libsql://ai-inbox-<org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | 위에서 만든 토큰 |
| `AI_PROVIDER_ORDER` | `gemini,openrouter` (배포 서버는 로컬 OmniRoute에 접근할 수 없음) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini 사용 시 |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | OpenRouter 사용 시 |
| `AI_DEMO_FALLBACK` | `true` 권장 (AI 장애 시에도 시연 가능, 화면에 "데모 분석" 표시) |
| `SESSION_TTL_SECONDS` | `86400` |

OmniRoute를 배포에서도 쓰려면 OmniRoute를 공개 주소가 있는 서버에 따로 띄우고 `OMNIROUTE_BASE_URL`·`OMNIROUTE_API_KEY`를 그 주소로 설정한다.

## 4. 배포

```bash
npm install -g vercel
vercel link
vercel env pull .env.local     # 선택: 로컬에서 같은 설정으로 확인
vercel --prod
```

빌드 명령은 기본값(`next build`), 출력 디렉터리도 기본값을 쓴다. Node 20.9 이상.

## 5. 배포 후 확인 (기획서 15장 중 운영 항목)

1. 서로 다른 브라우저 두 개로 접속 → 한쪽 데이터가 다른 쪽에 보이지 않는다 (T16).
2. 푸터의 [데모 데이터 삭제] → 대시보드가 비고, 이전 관계 주소로 접근하면 404 (T18).
3. Vercel 로그(Functions → Logs)에 원문이 없다. 제공자 오류는 `{"provider","errorCode","ms"}` 형태만 남는다 (T17).
4. 모바일 브라우저에서 입력 → 변경 비교 → 반영 → 완료가 잘림 없이 된다 (T20).

## 6. 데이터 보관

- 세션(작업공간)은 `SESSION_TTL_SECONDS` 후 만료되고, 이후 요청 시 만료된 작업공간이 관계·담당자·업무·제안·이력과 함께 삭제된다.
- Turso의 백업·시점 복구(PITR) 설정에 따라 삭제된 데이터가 백업에 일정 기간 남을 수 있다. 이 경우 "즉시 완전 삭제"라고 안내하지 말고 백업 보존 기간을 함께 안내한다 (기획서 13.2).
- 외부 AI 공급자의 보존·학습 이용 정책은 각 공급자 설정·약관을 확인한 뒤 안내한다.
