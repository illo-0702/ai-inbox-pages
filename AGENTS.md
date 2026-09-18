# AI Championship 협업 규칙

## 자율주행 분업

- 사용자는 Claude Code의 구현 비중을 높이고 Codex가 설계·검수·통합을 맡는 분업을 요청했다.
- Claude Code에 보내는 최초 개발 지시와 후속 수정 지시는 반드시 `자율주행`으로 시작한다.
- Claude 원본 스킬: `C:/Users/user/.claude/skills/autodrive/SKILL.md`.
- Codex에서는 `C:/Users/user/.codex/skills/autodrive/SKILL.md`를 읽고 적용한다.
- 기존 기획서와 대화에서 결정된 사항은 반복해서 묻지 않는다. 사용자가 승인하지 않은 사항을 승인된 것으로 전달하지 않는다.
- 작업을 작고 검수 가능한 단위로 나누고, 같은 Claude 세션을 이어 사용한다. 실제 변경과 테스트 결과를 Codex가 확인한다.
- 동시에 같은 파일을 수정하지 않는다. 병렬 변경은 별도 worktree로 격리한다.
- 기준 기획서: `AI_Championship_2026_서비스_기획서.md`. 핵심은 관계 연결·변경 추적·현재 유효 상태이며 장기 기능을 MVP에 임의 추가하지 않는다.
- 자율주행은 사용량 한도 증가나 자동 예약을 뜻하지 않는다. 사용자 요청 없는 결제·크레딧 소비·외부 전송은 하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
