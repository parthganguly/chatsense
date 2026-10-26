# Repair-1 native runtime and skills receipt (Opus, issue #35)

## Runtime (as exposed to the agent; no auth material recorded)

- Claude Code 2.1.310, entrypoint `sdk-cli`, child session (`CLAUDE_CODE_CHILD_SESSION=1`).
- Model `claude-opus-5-5` (Opus 5.5). Session id `915233dd-1ffc-4584-bbc0-6eec1e216db6`
  (from `CLAUDE_CODE_SESSION_ID`). This session ran: it was not blocked by a 429, so no
  substitute model, service or billing path was used. Earlier 429 receipts in
  `artifacts/stage8a-option-b/` were not touched.
- Existing subscription auth. No API keys, provider batches, paid external APIs, subagents or
  other models.
- macOS 13.7.8 x86_64, Node v22.21.0, npm 10.9.4, @playwright/test 1.61.1, Chromium
  149.0.7827.55 (headless shell). Python deps for `test:forecast-parity` came from the existing
  temporary venv `/tmp/s8a-venv` via `PATH`; no manifest change.
- Existing `node_modules`; no dependency installed or changed.
- Port 4319: Playwright's own `webServer` and the capture script's child `http-server`.
  Port 4329: the temporary layout probe's child `http-server` (logged as
  `logs/layout-probe.cjs.txt`, a `.txt` so it is never linted). All exit with their runs.

## Skills (verified present before relying on them)

| Source | SHA-256 (unchanged since the first Option B run) | Use in repair-1 |
| --- | --- | --- |
| `~/.claude/skills/break-ui/SKILL.md` (native user skill) | `e7eec1d70ac56a04255e9c0dbe98084ea3d544cc04aaad34f32c95d6fa9dff5e` | Worst-case checklist applied in tests: 320px, 200% root font, combined 320px + 200%, a truly unbroken 120-character token. Not re-invoked through the Skill tool; its guidance was applied from the earlier read. |
| `~/.claude/skills/emil-design-eng/SKILL.md` | `ffbe68e6007fb42cb8149f089b400a1ca007d59ba23e8948e2be4476f3175939` | Not applied (motion-focused). |
| `~/.claude/skills/frontend-design/SKILL.md` | `d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3` | Deliberately not applied: redesign guidance, out of scope. |
| `.../vercel/0.54.1/skills/react-best-practices/SKILL.md` (local file, not registered in this Claude session) | `5c1b1512e76413a9706309569c4c88827ed86b00dff9338849bf64caae7d3921` | No new hooks/state/props; class-only change. |
| `.../vercel/0.54.1/skills/verification/SKILL.md` (local file, not registered) | `1dd50aa65a4f8a287f8d8e2fbbaf4e52a3998451a9011659ab0ab38d19539932` | Same story walk: fixture file input → core read → DOM → Range geometry/computed style → screenshots. |

Not used: Figma, Firecrawl, `@axe-core/playwright` (not installed; no dependency added).
