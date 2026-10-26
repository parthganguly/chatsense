# Native runtime and skills (Opus, issue #35)

## Runtime (as exposed to the agent; no auth material recorded)

- Claude Code 2.1.310, entrypoint `sdk-cli`, child session, unattended, effort `high`.
- Model `claude-opus-5-5` (Opus 5.5). Session id `e765d760-fc19-499d-9ec7-a73c7d466b3e`
  (from `CLAUDE_CODE_SESSION_ID`).
- Existing subscription auth. No API keys, provider batches or paid external APIs were used.
- macOS 13.7.8 x86_64, Node v24.14.0, npm 11.9.0, @playwright/test 1.61.1, Chromium 149.0.7827.55
  (headless shell), Python 3.14.3 (temporary venv used only for `test:forecast-parity`).
- Dependencies: `npm ci` from the committed lockfile.
- Port 4319 was used only through Playwright's own `webServer` and the capture script's child
  `http-server`. Both exit with their runs; nothing was left listening.
- The parent's `artifacts/stage8a-option-b/opus-native-result.json` and `.stderr` were not
  touched.

## Skill discovery (paths checked)

- `~/.claude/skills/`: `break-ui`, `emil-design-eng`, `frontend-design`, `synced/` (docs,
  browser and office skills, none relevant).
- `~/.claude/plugins/installed_plugins.json`: `ponytail@ponytail`,
  `swift-lsp@claude-plugins-official`. I listed marketplace plugin manifests and skill file
  names only; I didn't read any auth or config files.
- Project `.claude/`, `AGENTS.md`, `CLAUDE.md`: none exist in this worktree.

## Guidance actually read and used

| Source | How available | SHA-256 | Use |
| --- | --- | --- | --- |
| `/Users/parth/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/react-best-practices/SKILL.md` | Explicit local read, not natively registered in this Claude session | `5c1b1512e76413a9706309569c4c88827ed86b00dff9338849bf64caae7d3921` | TSX review: no new hooks/state, static map hoisted (`detailsLabel`), dead `stateAccent` map removed, no runtime cost |
| `/Users/parth/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/verification/SKILL.md` | Explicit local read, not natively registered | `1dd50aa65a4f8a287f8d8e2fbbaf4e52a3998451a9011659ab0ab38d19539932` | Story walk: fixture file input → core read → rendered DOM → computed styles → screenshots, with evidence at each boundary |
| `~/.claude/skills/break-ui/SKILL.md` | Native user skill | `e7eec1d70ac56a04255e9c0dbe98084ea3d544cc04aaad34f32c95d6fa9dff5e` | Phase 4 checks: 320px, root-font 200%, dark mode, long unbreakable text. Its "change the data, not the component" rule is adapted: the long limitation is injected in test DOM only, because the only data boundary is the frozen core read, which must not change |
| `~/.claude/skills/emil-design-eng/SKILL.md` | Native user skill | `ffbe68e6007fb42cb8149f089b400a1ca007d59ba23e8948e2be4476f3175939` | Read the accessibility section; mostly motion, little bearing |
| `~/.claude/skills/frontend-design/SKILL.md` | Native user skill | `d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3` | Read and deliberately not applied: it is for distinctive redesigns, which issue #35 rules out |

Not used: Figma, Firecrawl, the payments/deploy Vercel skills, and `@axe-core/playwright`
(not installed). Reading these files locally doesn't mean the Codex/Vercel plugins are
registered in this Claude session; they weren't.
