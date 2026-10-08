# Optional personal comparison: first implementation packet

Status: architecture accepted by delegated Astra review; frozen candidate acceptance criteria, 2026-10-08. NOT IMPLEMENTED; no user-facing promotion authorized. Extends the scope recorded in [issue #23](https://github.com/parthganguly/chatsense/issues/23); supersedes no scientific, privacy, or human-validation rule. The master plan remains authoritative for the existing relationship reader. This is the one new strategy document for this change.

## Decision

Keep the complete single-conversation experience. Evaluate an optional, in-memory **selected-export evidence table**, using the existing WhatsApp analyser separately for each export. The first bounded code task is an internal, unconnected projection module plus synthetic tests. No new import screen, personal-profile narrative, cross-chat score, or production route in this task. This is preparation for comparing observations, not a validated model of a person.

A later reviewed UI may let a person deliberately select exports, explicitly identify themselves in EACH export, and view rows of existing counted evidence. Its scope statement must say “among the chats you imported.” No name matching, contact resolution, ranking, inferred relationship type, or automatic discovery. The current app remains useful with no profile, no selection, and no changes to its four tabs or Stage 8A hero.

## Exact baseline and ownership

- Base: PR #21 head `9485746431ab6c8b536e281ca369be9994af16c1`, atop main `e56b196f3c064198a5ce1a947d57ad64f8b17e19`. PR #21 is still draft/unmerged; PR #22 is unrelated README work. Neither may be merged.
- Astra owns this packet, diagnosis, review, and the decision to accept it. Opus **5.5** in Claude Code owns implementation. Sol verifies the exact committed candidate independently. Requested model and resolved runtime model must both be recorded. A picker/default named Opus 5 is not Opus 5.5.
- Use an unoccupied worktree and `codex/personal-evidence-slice` branch from the exact base. Carry this reviewed packet into that worktree. Do not mutate the verification worktree or original checkout.
- Stack explicitly on `product/human-relationship-read-stage-8a` if a draft PR is later requested; retarget after #21 merges. The current CI only PR-triggers against main. A stacked PR has CI **pending** until an actual appropriate run is observed; historical #21 CI is not candidate verification.

## Reuse map and scope

| Existing code | Reuse / boundary |
|---|---|
| `features/import/readWhatsAppExport.ts` | Future UI retains existing TXT/ZIP handling; no calls or changes in this internal slice. Existing web size/encoding/locale limitations are not solved here. |
| `packages/chatsense-core/src/chat-parser.ts` | Synthetic harness calls `parseWhatsAppChat` and `getSenders`. Parsing remains per-export, never concatenate exports. |
| `packages/chatsense-core/src/chat-analyzer.ts` | Harness calls `analyzeChat` once per export. Keep `ChatAnalysis` and every existing caller unchanged. |
| `relationship-dynamics.ts` | Project typed `participantSummaries` and `pauseSummary`; no analysis from generated prose. |
| `relationship-read.ts` | Existing `buildRelationshipRead` and single-conversation UI remain unchanged. Never aggregate its confidence labels or narrative text. |
| `contracts/behavioral_contract.json`, `contract.ts` | Existing definitions and minimums only; no threshold changes or new confidence arithmetic. |
| `tests/helpers/narrative-safety.ts` | Reuse scanner for any new explanatory/limitation strings; retain adversarial-content invariance. |
| `tests/import-boundaries.ts`, existing parity suites | Existing architecture and TS/Python semantics must stay green. Python remains research/reference only. |

Allowed implementation files: `packages/chatsense-core/src/personal-evidence.ts` (new, internal), `tests/personal-evidence.ts` (new), root `package.json` only to append the focused test to `test`, and this packet/master-plan status only to describe verified implementation. Existing synthetic fixtures may be read; new cases should be small in-test generators. No public `index.ts` export yet: the sole caller is the explicit test harness. No new dependencies or lockfile edits, app/features/components/native changes, baseline fixture rewrites, or forecasting changes. A need for broader scope returns to Astra.

## Minimal input and output contract

Proposed internal `buildPersonalEvidence(selections)` accepts already computed `ChatAnalysis` values with an explicit import record. No `File`, filesystem, browser, network, or raw message text enters this module. Each record contains:

- session-local unique `exportId` and user-declared `conversationId` (opaque local selection IDs, never inferred from names);
- explicit `selfSender`, matching exactly one participant in that export; no default, name similarity, or carry-over choice;
- provenance: `medium: "whatsapp"`, `format: "txt" | "zip"`, parser revision (the tested commit), and timezone status `"source-offset-unknown; interpreted-in-host-zone"` plus the host IANA zone used at parsing;
- `ChatAnalysis`, whose coverage dates and sample counts remain attached to that export.

Return rows in selection order and per-selection exclusion reasons, not one profile, ranking, composite score, or merged history. Copy only required typed numeric evidence into each row; do not retain the whole analysis object or narratives. Reject unknown medium/format, missing IDs/identity, duplicate export IDs (exclude every conflicting selection), invalid/reversed coverage dates, absent/ambiguous self selection, and non-finite/negative/noninteger/inconsistent counts and inconsistent participant sets across `participants`, `overview.participantCount`, and `participantSummaries`. Preserve valid zero counts and null unavailable measurements distinctly. Empty or one eligible export returns an explicit `insufficient_selection` state, never “no pattern.” Do not throw away eligible rows because another selection is excluded.

Each eligible dyad row carries its own coverage start/end, message count, active days, selected sender, and these observations:

| Observation | Value and denominator | Eligibility |
|---|---|---|
| Conversation starts | self `threadStarts` / sum of all participant `threadStarts` | Existing narrative start minimum |
| Restarts after day-plus pauses | self `reconnectionCount` / `pauseSummary.longPauseCount` | Existing reconnection minimum |
| Follow-ups before reply | Separate self `followUpCount` (events), `followUpRelevantTurnCount` (eligible turns), and stored `followUpRate` (percent of eligible turns containing any follow-up) | Existing relevant-turn minimum |
| Reply timing | self `medianReplyMinutes`, self `replySampleCount` | Existing reply minimum; null stays unavailable |

Reuse stored rates where present. Starts and restarts preserve exact integer numerators/denominators. **Follow-up event count is not the numerator of follow-up rate:** the existing engine counts distinct turns containing follow-ups for that rate, while a single turn may have multiple follow-up events. The exact distinct-turn numerator is not exposed by the existing summary; omit it, label event count separately, and never reconstruct it from a rounded percent. Do not validate `followUpCount <= followUpRelevantTurnCount`.

Measurement state is separate from row eligibility. Import the existing constants (do not duplicate literals): `NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS` = 3; `NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS` = 2; `MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT` = 3; `MIN_REPLY_LATENCY_PER_PARTICIPANT` = 5. Zero opportunities or a null measurement is `unavailable`; positive opportunity counts below the corresponding floor are `insufficient`; a nonnull value at or above the floor is `sufficient`. Preserve observed zero numerators with positive opportunity counts, and never replace unavailable values by zero. Keep structurally valid rows with insufficient measurements. Validate exposed shares/rates within 0–100, start/restart numerators no greater than their denominators, and consistent participant totals; do not impose an invented follow-up event bound. No pooled rate, median-of-medians, pooled reply sample, difference score, “usual self,” or directional cross-export label. Counts and measurement denominators describe observations inside one export, not independent people or relationships. `MetricChange` evidence may be added in a later packet; first slice does not need new metrics to show this evidence table.

## Sampling, duplicates, time, and uncertainty

1. **Selected coverage:** rows describe only deliberately imported exports, with arbitrary selection bias and unknown omitted history. The row set cannot estimate the person's whole communication life. Number of rows is never reported as number of independent relationships.
2. **Repeated conversation:** at most one export for each explicitly declared conversation ID. If a conversation ID is repeated, exclude all conflicting selections with a choose-one reason (no silent winner). This blocks both overlapping and disjoint repeat exports from being double-counted in this slice.
3. **Unknown duplicate identity:** filenames, names, identical aggregate metrics, and similar time ranges cannot reliably identify duplicate chats. Cross-ID duplicates remain unresolved provenance; say so explicitly. Because the slice never pools or counts independent relationships, unresolved duplicates cannot strengthen a combined conclusion. Do not pretend automatic deduplication was implemented. A future user-facing multi-import flow needs explicit duplicate/overlap review before any aggregate output; that is an acceptance gate, not an optional follow-up.
4. **Time:** preserve each export's full observed window independently; never call unequal windows contemporaneous. Parser uses host-local `new Date(...)` and exports have no source offset; recording host zone does not recover historical source timezone or DST ambiguity. No cross-export ordering, daily alignment, time-of-day comparison, or slicing by device time in this slice. Missing source timezone remains unknown, never silently UTC. Existing per-chat calculations remain unchanged.
5. **Missingness:** missing messages, calls, other media and truncated exports are unobserved, not inactivity. An export's end is not the real end of contact. No open final turn becomes a failed reply, and no current silence joins completed history.
6. **Groups:** only exactly two distinct participants are eligible for these dyad rows. Groups/single-participant exports retain their existing single-chat experience and receive a typed unsupported-selection reason here; never infer a dyad from a group or pool group replies with dyad replies.
7. **Dependence and contradiction:** conversations share a person, periods overlap, and behavioral constructs are correlated. Keep rows and conflicting observations visible; neither agreement nor row count increases confidence. No independence claims, standard errors, probability, or psychological confidence. Existing hand-set “Strong/Useful/Light read” labels are not numerical weights.
8. **Content independence:** the projection only reads typed timing/count fields, explicit selection, and provenance. A change to raw content preserving timing/sender/word-count structure must leave projected output identical. Also mutate narrative/hero strings to prove they are not inputs.

## Privacy and promotion gates

The first slice is ephemeral computation only. No persistence, storage adapter, export/report download, embeddings, cloud inference, telemetry, accounts, passive collection, OAuth, notifications, scraping, or background scanning. Derived observations and identifiers remain personal data, not anonymized data. Clear selection state on explicit reset/session end when a future UI is reviewed; no serialization into URL, logs, analytics, crash reports, or local storage.

Persistent personal models require a separately accepted design covering opt-in, storage location, encryption and key creation/storage/rotation/recovery/loss, deletion and residual copies, OS/cloud backups, migration, leakage and shared-device threats. They must reconcile the existing no-persistence promise before implementation. Instagram is a later adapter only after real format specifications are inspected and synthetic capabilities tested; no invented fields or WhatsApp-only “cross-medium validated” claim.

The Stage 8A comprehension gate remains open and is not completed by M0 or this module. Preserve the master plan §12 and audit §29 study requirements, including non-romantic scenarios and zero participants hearing a next-pattern promise. No Stage 8B work disguised as this feature. No user-facing personal-model promotion until the owner/Astra explicitly settle the design, duplicate/overlap flow, privacy, scientific and comprehension acceptance gates. New behavioral analysis, if ever added, must follow contracts, synthetic matrix, TS/Python parity and the two-card consistency invariant. Forecasting remains blocked (`realWorldValidationEligible === false`). No personality, motives, mental health, attachment, ranking, norms or advice.

## Frozen acceptance for the bounded Opus task

Before editing, verify base SHA and clean worktree; read master plan fully and its reading order, issue #23, this packet, runtime/privacy/contracts and actual referenced code. Preserve a failing assertion before fixing logic. One internal module and one focused test are enough.

Tests must cover:

- two synthetic dyads with different self names, explicit self selection and exact hand-counted start/restart denominators, follow-up event and eligible-turn counts plus stored rate; include multiple follow-ups inside one turn proving event count is not the rate numerator;
- absent/wrong/ambiguous self, empty/one selection, duplicate export IDs, repeated conversation IDs (overlap and disjoint), invalid provenance/coverage/counts, all returning explicit reasons;
- group and single-participant exclusion without modifying existing single-chat output;
- zero events versus unavailable, each sample floor just below/at boundary, unequal windows and unknown timezone marked honestly;
- conflicting rows preserved without winner/ranking, and duplicate unresolved across different IDs never producing aggregate evidence;
- input immutability, deterministic results, unchanged results when narratives or equal-structure content change, and full scanner coverage for new strings;
- existing `analyzeChat` and Relationship Read outputs byte-identical before/after the projection for committed fixtures. No production screen imports this module.

Acceptance commands, all on the exact committed candidate with Node 22 and recorded isolated Python interpreter:

```sh
npm ci
npm run check
npx playwright install chromium
# Prelaunch node_modules/.bin/http-server out -a 127.0.0.1 -p 4319 -c-1 --silent
npm run test:viewport
.venv/bin/python -m pytest
.venv/bin/python -m chatsense_ml.forecasting.evaluate
git diff --check
git status --short
```

Android build/device remain separately reported, never inferred from web tests. Before candidate verification, install Python with `python3.13 -m venv .venv` and `.venv/bin/python -m pip install -e '.[dev]'` if available; otherwise record the deliberate supported interpreter variation. New metric semantics would expand parity scope and require a new reviewed packet, not a waiver.

Expected output: one minimal implementation commit, exact SHA, diff summary by allowed file, model evidence, commands/exit codes/log paths, no production wiring, no personal data. Sol checks that immutable SHA in a separate worktree; Astra reviews the diff and evidence. Subsequent source changes invalidate affected verification.

## Handoff status

**Opus 5.5 implementation: NOT RUN.** Claude Code began at 2.1.263 (picker: Opus 5); its built-in updater ran during inventory, producing 2.1.293 (picker: Opus 5.5). The updated installed binary exposes `claude-opus-5-5`. An exact-model, tools-disabled availability probe failed: “OAuth session expired and could not be refreshed.” It returned no model usage/resolved inference metadata, so actual model execution remains unverified. No fallback model was used. Restore Claude authentication manually, then repeat the exact-model probe and record resolved session metadata before any implementation handoff.

Astra review was delegated with explicit `gpt-6-astra`; the launch was accepted, but resolved runtime identity is not exposed. The review found the follow-up count/rate mismatch and requested explicit per-measurement states and canonical-plan alignment; this revision incorporates those corrections. Astra re-reviewed the correction and accepted this bounded internal packet; that records static architecture review, not implementation verification or product promotion.

No deployment, merge, public demo, product promotion, or human-study success is implied by this packet.
