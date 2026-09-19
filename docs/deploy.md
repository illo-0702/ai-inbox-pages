# 배포 가이드 — Vercel + Turso (대회 제출용 서비스 링크)

코드는 비공개 저장소 `illo-0702/ai-inbox`에 올라가 있다. 아래 1~4는 계정 로그인·약관 동의·키 입력이 필요해
**본인이 직접** 한다. 5는 배포 후 점검이다.

## 1. Vercel에 저장소 가져오기

1. https://vercel.com 에 GitHub 계정(illo-0702)으로 로그인한다.
2. **Add New… → Project** → GitHub 목록에서 `ai-inbox` 옆 **Import**.
   목록에 없으면 "Adjust GitHub App Permissions"에서 이 저장소 접근을 허용한다.
3. Framework Preset은 **Next.js**로 자동 인식된다. 빌드 명령·출력 폴더는 기본값 그대로 둔다.
4. 아직 **Deploy를 누르지 말고** 아래 2·3을 먼저 설정한다. (먼저 눌러도 동작은 하지만 데이터가 가끔 초기화될 수 있다.)

## 2. 데이터 저장소(Turso) 연결

1. 프로젝트 화면 → **Storage** 탭 → **Create Database** → Marketplace의 **Turso** 선택.
2. 지역은 **Tokyo(도쿄)** 등 한국과 가까운 곳, 요금제는 무료(Free/Starter).
3. 이 프로젝트에 연결(Connect)하면 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 환경 변수가 자동으로 들어간다.
   앱이 이 이름을 그대로 읽으므로 따로 바꿀 필요 없다. 표(테이블)는 첫 접속 때 앱이 자동으로 만든다.

> Storage 탭에 Turso가 없으면 https://turso.tech 에서 데이터베이스를 만든 뒤 주소와 토큰을
> Settings → Environment Variables에 `DATABASE_URL`, `DATABASE_AUTH_TOKEN` 이름으로 넣는다.

## 3. AI 연결 (권장 — 심사위원이 실제 AI 분석을 보게 됨)

Settings → **Environment Variables**에 추가한다 (Production·Preview 모두 체크):

| 이름 | 값 |
|---|---|
| `AI_PROVIDER_ORDER` | `openrouter,gemini` |
| `OPENROUTER_API_KEY` | OpenRouter 키 (https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | `google/gemini-3.5-flash-lite` |
| `AI_DAILY_LIMIT` | `300` (하루 외부 AI 호출 상한 — 넘으면 그날은 규칙 엔진으로 처리) |

- 위 모델은 2026-09-19 OpenRouter 모델 목록에서 확인했다(입력 100만 토큰당 약 $0.30, 이미지 인식 가능).
  분석 1회는 약 2천 토큰이라 300회를 다 써도 하루 1달러 안쪽이다.
- Gemini를 직접 쓰려면 `GEMINI_API_KEY`, `GEMINI_MODEL`을 넣는다.
- 키를 하나도 넣지 않아도 사이트는 동작한다. 이때 분석 화면에 "데모 분석(규칙 기반)"이 표시된다.
- 로컬 OmniRoute는 배포 서버에서 접근할 수 없으므로 넣지 않는다.

## 4. 배포

**Deployments → Redeploy**(또는 처음이면 **Deploy**). 1~2분 뒤 `https://ai-inbox-….vercel.app` 주소가 나온다.
환경 변수를 바꾼 뒤에는 반드시 다시 배포해야 반영된다.

제출 링크는 프로젝트의 **Domains**에 표시되는 기본 주소(`프로젝트이름.vercel.app`)를 쓴다.
배포마다 바뀌는 긴 미리보기 주소는 쓰지 않는다.

## 5. 배포 후 점검 (기획서 15장 운영 항목)

1. 입력 화면 예시 ①②③으로 핵심 흐름: 새 업무 → 마감 09.20 → 09.22 → 잠정 변경은 현재 마감 유지.
2. 분석 결과의 엔진 배지가 제공자 이름(OpenRouter 등)으로 나오는지 — "데모 분석"이면 키·모델·재배포를 확인.
3. 서로 다른 브라우저 두 개로 접속 → 한쪽 데이터가 다른 쪽에 보이지 않는다 (T16).
4. 푸터 [데모 데이터 삭제] → 대시보드가 비고, 이전 관계 주소는 404 (T18).
5. Vercel → Logs에 원문이 없다. 제공자 오류는 `{"provider","errorCode","ms"}` 형태만 남는다 (T17).
6. 휴대폰 브라우저에서 입력 → 변경 비교 → 반영 → 완료가 잘림 없이 된다 (T20).

## 데이터 보관

- 방문자별 데모 데이터는 `SESSION_TTL_SECONDS`(기본 24시간) 뒤 다음 요청 때 삭제된다.
- Turso의 백업·시점 복구 설정에 따라 삭제된 데이터가 백업에 일정 기간 남을 수 있다. 이 경우 "즉시 완전 삭제"라고
  안내하지 말고 백업 보존 기간을 함께 안내한다 (기획서 13.2).
- 외부 AI 공급자의 보존·학습 이용 정책은 공급자 설정·약관을 확인한 뒤 안내한다.
