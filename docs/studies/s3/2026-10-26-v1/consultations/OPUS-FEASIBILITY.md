# S3 synthetic reading study — Opus feasibility consultation (offline only)

| Receipt field | Value |
| - | - |
| Consultant | Native Claude Code session, model `claude-opus-5-5` (Opus 5.5) as reported by the runtime |
| CLI | `claude --version` → `2.1.310 (Claude Code)` |
| Worktree / HEAD | `codex/s3-synthetic-protocol` @ `113bfb06666dbd2e4988319a48144127f1258278` |
| Date | 2026-10-26 (doc fetches 13:37:28Z–13:37:43Z) |
| Network activity | Unauthenticated public `GET` of documentation pages only (listed in `evidence/provider-docs-opus/SOURCES.json`). **No** request to `api.typesafe.ai` or `api.fastino.ai`, no credentials, no Keychain, no env-secret reads, no SDK installs, no old-harness execution. |
| Provider outputs in this report | **None.** Every JSON body below is a hand-written placeholder; no provider response was obtained or simulated. |
| Embedded instructions in fetched docs | Fastino pages contain an "Agent Instructions" block. It was treated as data. Nothing in it was executed or followed. |

## 1. Recommendation

**CONDITIONAL GO for protocol preparation only. Inference stays BLOCKED until the owner separately authorizes it and every gate in §9 passes.**

| Cell | Verdict | Reason |
| - | - | - |
| GLiDE × innerText | Conditional GO | Wire contract and billing bound are both documented. Unknown: whether errors are billed, and the server's internal pass count (§6). |
| GLiDE × PNG | Conditional GO | Data-URL PNG is documented, and our files fit all limits. GLiDE resizes images internally, so the processed pixels are unknown. |
| Jev × innerText | Conditional GO | Text is Jev's documented primary input. Pin `jev-1.14.0`. |
| Jev × PNG | **BLOCK (doc conflict)** | `images.md` says "Jev 1.13 and Jev 1.14 both accept images", but `models.md` lists Input for both as "Text", and `concepts/system-one.md` says "Jev currently accepts text input only… Images… are not supported (yet)". Images are also labelled "Dreamer-ready… can change between releases". Unblock only through written provider confirmation, or an owner-authorized, separately ledgered capability probe that is excluded from results. |
| "Actual model versions" | **NO** | Docs alone cannot establish the deployed weights. Jev's response `model` is a provider-asserted label. GLiDE publishes no versioned ID at all: the request is `fastino/GLiDE`, the response is `glide`, and `X-Fastino-Served-Model` is "the base model id". |

## 2. Evidence table

Local paths are relative to `docs/studies/s3/2026-10-26-v1/evidence/`. `provider-docs/` holds the coordinator snapshots (SHA in its `SOURCES.json`). `provider-docs-opus/` holds my fetches (SHA in its `SOURCES.json`).

| # | Fact | Source (archived) |
| - | - | - |
| J1 | Endpoint `POST https://api.typesafe.ai/v1/systemone`, Bearer auth; required body fields: `model`, `state`, `questions`; optional: `assets` | [jev-call.md](https://docs.typesafe.ai/api/system-one.md) → `provider-docs/jev-call.md` |
| J2 | Versioned IDs are `jev-1.14.0` and `jev-1.13.0`. `jev-latest` and `jev-preview` are aliases that both currently point to `jev-1.14.0`. Aliases "move when a new release ships". Jev 1.14 has been available since 2026-10-14. | [models.md](https://docs.typesafe.ai/models.md) → `provider-docs/jev-models.md` |
| J3 | Response `model` is the "Name of the model that answered… May differ from the alias", i.e. the versioned ID that served the call | `provider-docs/jev-call.md`, `jev-models.md` §Aliases |
| J4 | `GET /v1/models` "currently lists the aliases". Versioned IDs are accepted whether or not they are listed. | `provider-docs/jev-models.md`, `jev-list-models.md` |
| J5 | Price: $0.042 per Mtok of input. Output is free. Context is 64k per request and 32k per question. The `TypeSafe-Danger-Zone-Long-Context: true` header raises both limits to 262k. | `provider-docs/jev-models.md` |
| J6 | Jev "ingests the `state` once". Extra questions "cost only the tokens for the extra questions". | `provider-docs/jev-models.md`; [primitives.md](https://docs.typesafe.ai/primitives.md) → `provider-docs-opus/jev-primitives.md` L133 |
| J7 | Images need the `TypeSafe-Danger-Zone-Images: true` header. Assets go in a top-level `assets` map keyed by an opaque reference, as base64 JSON or multipart. Accepted formats are PNG and JPEG. Each side must be 280–1568 px, total pixels 78,400–2,458,624, and each file ≤16 MiB. The API "removes all metadata" and "re-encodes each image". Image tokens are billed as input. Token-estimate guidance is "soon". | [images.md](https://docs.typesafe.ai/images.md) → `provider-docs/jev-images.md` |
| J8 | **Conflict:** Jev is "text input only… Images… not supported (yet)". `models.md` also lists Input as "Text". | [system-one concept](https://docs.typesafe.ai/concepts/system-one.md) → `provider-docs-opus/jev-system-one-concept.md`; `provider-docs/jev-models.md` |
| J9 | Questions are "evaluated independently". "One question's answer is not hidden context for another." | `provider-docs-opus/jev-primitives.md` L17, L81, L204 |
| J10 | Choice: "The model never sees the question id. The option names and their descriptions are both sent to the model." Up to 255 options are allowed (OpenAPI min 1). | [choice.md](https://docs.typesafe.ai/primitives/choice.md) → `provider-docs-opus/jev-choice.md`; `jev-call.md` |
| J11 | jev-1.13 "leans toward the option that comes first". jev-1.14 has no published equivalent note. Dates "read as text". | [jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md) → `provider-docs-opus/jev-1.13-jaggedness.md` |
| J12 | Python SDK `RetryPolicy` defaults: `max_retries=2`; retries HTTP 408, 429 and 500–599, connection errors and **timeouts**. Default per-operation timeout is 10 s. | [retries](https://docs.typesafe.ai/sdk/python/api/retries.md), [constants](https://docs.typesafe.ai/sdk/python/api/constants.md) → `provider-docs-opus/` |
| J13 | Retention and training: Jev "is not trained on customer requests or responses". MCA §4.1 has no training on Customer Data "without Customer's prior consent", but grants a **perpetual** licence for Telemetry, fraud/abuse monitoring and legal compliance. DPA §8: retained "as long as necessary". Privacy Policy: "will not train or fine tune". ZDR is enterprise only. **No published duration.** No per-request no-store flag is documented. | `provider-docs/jev-legal.md`; [DPA (updated Apr 24 2026)](https://typesafe.ai/legal/data-processing), [Privacy (Nov 19 2025)](https://typesafe.ai/legal/privacy-policy), [MCA (Sep 23 2026)](https://typesafe.ai/legal/mca) → `provider-docs-opus/typesafe-*.html` |
| G1 | Endpoint `POST https://api.fastino.ai/v1/systemone`, request `model: "fastino/GLiDE"`, response `model: "glide"`. Auth via `X-API-Key` (Bearer also accepted). | [Call GLiDE](https://docs.fastino.ai/inference/systemone.md) → `provider-docs/glide-call.md` |
| G2 | OpenAPI 2.0.0: `additionalProperties: false`. Fields: `model`, `state`, `questions`, `store` (default **true**), `thinking` ("Absent and false are one pass. True is rejected"), plus `provider`, `user`, `session_id` and `trace`, which are "accepted and never forwarded". | [openapi.json](https://docs.fastino.ai/openapi.json) → `provider-docs/glide-openapi.json` |
| G3 | Response must contain `model`, `answers`, `usage{input_tokens,output_tokens}` and `token_usage` ("Total tokens billed… input plus output"). Headers `X-Fastino-Data-Retention` ∈ {zero, not-stored, stored} and `X-Fastino-Served-Model` are present on 200 only. | `provider-docs/glide-openapi.json` |
| G4 | Price: $0.04 per M input tokens; output $0 ("only input tokens are billed"). The model catalog repeats $0.04/$0 and adds 27B parameters and a 65,536-token rendered-prompt limit. | [pricing](https://docs.fastino.ai/pricing.md) → `provider-docs/glide-pricing.md`; [models](https://docs.fastino.ai/concepts/models.md) → `provider-docs-opus/glide-models.md` |
| G5 | Each rendered prompt (state + one question) must be ≤ 65,536 tokens. `usage.input_tokens` "sums the internal passes for all questions". Image tokens "count once per question" (example: 1,087 tokens for 1 question vs 4,302 for 4). | `provider-docs/glide-call.md`, `glide-capabilities.md` |
| G6 | Images: `state` must be an array with ≤4 `image_url` parts (HTTPS or data URL). Formats JPEG/PNG/GIF/WebP, ≤3,932,160 bytes, ≤25 MP. The declared media type is checked against the bytes. GLiDE "resizes every image to between 65,536 and 1,048,576 pixels", which is 64–1,024 tokens per image per question. | `provider-docs/glide-call.md` |
| G7 | Choice: 2–255 options. "Both the option names and their descriptions are sent to the model". Questions are "evaluated independently". | [glide-choice](https://docs.fastino.ai/concepts/glide-choice.md) → `provider-docs-opus/glide-choice.md`; `glide-capabilities.md` |
| G8 | `store:false` means no history and no logs/traces, and the request is "never used for platform training… whatever your training opt-out says". Billing metadata (model, tokens, latency, status, cost) is still recorded. **Default:** "retained indefinitely". Platform training is "Sometimes, by default" (opt-out is Enterprise only). "We do not offer a DPA." Listed subprocessors include AWS, Anthropic, OpenAI, Modal and Azure ("AI/ML services"). | [trust-safety](https://docs.fastino.ai/trust-safety.md) → `provider-docs-opus/glide-trust-safety.md`; `provider-docs/glide-call.md` |
| G9 | Docs recommend retrying 425 (warm-up, "can return 425 more than once"), 429, 502 and 503, with example loops of up to 5 retries. Idempotency keys exist only for training mutations, not `/v1/systemone`. | [retries](https://docs.fastino.ai/troubleshooting/retries.md), [errors](https://docs.fastino.ai/troubleshooting/errors.md) → `provider-docs-opus/`; `glide-openapi.json` |

## 3. Stimuli verification (offline, done)

- All 10 files are byte-identical (`cmp`) to the canonical `docs/studies/stage8a/2026-10-26-v2/stimuli/captures/*`. All SHA-256 values match `stimuli/manifest.json`.
- The PNGs are 8-bit RGB (colour type 2) with only `IHDR`, `IDAT` and `IEND` chunks: no metadata and no `acTL` (not animated). Sizes are 344×546, 344×500, 344×520, 344×656 and 344×508, between 53,669 and 78,339 bytes.
  - Jev limits: 280 ≤ side ≤ 1568 and 78,400 ≤ px ≤ 2,458,624. All five pass.
  - GLiDE limits: ≤3.75 MiB and ≤25 MP. All five pass. Pixel counts of 172,000–225,664 already fall inside GLiDE's resize band, but whether GLiDE re-samples anyway is undocumented.
- The innerText files are UTF-8, with no BOM, no CR and no trailing newline (692–1,069 chars). The only non-ASCII code point is U+2014 `—`.
- Visible differences between the PNG and the innerText (they are not the same stimulus):
  - The PNG shows the confidence pill right-aligned beside the eyebrow. In innerText it comes on its own line before the headline.
  - The PNG has bullet glyphs and a quote bar; innerText has neither.
  - The PNG breaks lines and hyphenates, e.g. "re-↵export". innerText does not.
  - The PNG carries emphasis through typography; innerText is plain text.

## 4. Wire contracts (placeholders only; not launch-capable)

**Common rules:**
- One card, one modality, one provider and one option order per request.
- The question set is identical across all four cells.
- No system prompt exists on either API and none is synthesised.
- `state` contains only the card. No summary, no preamble, no participant persona.
- Question IDs and option keys are opaque, fixed and recorded, e.g. `q_7c1e`, `k_3f9a`. Both providers send option keys to the model, so keys must carry no meaning. Jev hides question IDs; GLiDE does not document whether it does, which is why question IDs are opaque too.
- Descriptions carry all of the semantics. No `other`/`none` option unless the question bank deliberately includes one in every cell.

**Text arm (identical decoded body on both providers).** `state` is a one-element array containing the exact innerText string. The decoded string must equal the file bytes. A JSON escaping choice such as `ensure_ascii` changes wire bytes but not content, so the decoded value is what gets checked.

```json
{
  "model": "<jev-1.14.0 | fastino/GLiDE>",
  "state": ["<EXACT innerText of card X, decoded == file bytes sha256 …>"],
  "questions": {
    "q_7c1e": {
      "type": "choice",
      "instructions": "<fixed question text, string>",
      "criteria": { "k_3f9a": "<option text>", "k_b20d": "<option text>", "k_e81c": "<option text>" }
    }
    /* … up to 8 choice questions, same order in all cells of an order-arm … */
  }
  /* GLiDE only: , "store": false        — omit thinking/provider/user/session_id/trace */
}
```

**Image arm, Jev (BLOCKED, see §1).** Header `TypeSafe-Danger-Zone-Images: true`. Do **not** send `TypeSafe-Danger-Zone-Long-Context`.

```json
{
  "model": "jev-1.14.0",
  "state": ["<fresh-uuid-ref>"],
  "assets": { "<fresh-uuid-ref>": { "type": "image", "format": "png", "data_base64": "<std base64 of PNG, no newlines, no data: prefix>" } },
  "questions": { "...": "identical to text arm" }
}
```

**Image arm, GLiDE:**

```json
{
  "model": "fastino/GLiDE",
  "state": [ { "type": "image_url", "image_url": { "url": "data:image/png;base64,<SAME base64 string as Jev arm>" } } ],
  "questions": { "...": "identical to text arm" },
  "store": false
}
```

Byte identity is enforced offline. Both image bodies carry the same base64 string. The pre-send check is that `sha256(base64decode(payload)) == manifest.image_sha256`. I recommend base64 for both providers, not Jev multipart, so that one string is verified once.

**Provider differences that cannot be removed:**

| Difference | Jev | GLiDE |
| - | - | - |
| Image envelope | Reference in `state` plus `assets` | `image_url` part inside `state` |
| Image server processing | Strips metadata and re-encodes | Resizes |
| Extra header for images | Required (`TypeSafe-Danger-Zone-Images: true`) | None |
| `store:false` | No such flag | Required |
| Auth header | Bearer | `X-API-Key` |
| Choice option count | 1–255 | 2–255, so use ≥2 everywhere |
| `instructions` | Accepts object | String in OpenAPI, so send strings |
| Response `confidence` | Unspecified "confidence" | `top1 − top2` |
| Response identity | Versioned ID | `"glide"` plus header |

**Primitive schema used:** `choice` only.
- Analyse `probabilities`, a map keyed by option key. Both providers say the values "sum to ~1"; validate this and record the actual sum.
- `choice` is just the argmax.
- Do not compare `confidence` across providers: GLiDE's is `top1 − top2` and Jev's is undefined.

## 5. Question-bank limitations

- **Independence is a provider claim (J9, G7), not a verified property.** Bundling 7–8 questions assumes that adding or removing a question leaves the others unchanged. Testing this costs extra inference: e.g. one card × one provider × singleton requests. That test is out of scope now; list it as an optional, separately authorized audit.
- **Order effects.** JSON key order is serialized into the prompt. jev-1.13 has a documented first-option bias, and 1.14 and GLiDE are undocumented on this.
  - Minimum: two order arms, *forward* and *reversed* option order (and reversed question order), with the same seeded permutation in every cell.
  - Report order sensitivity, e.g. total-variation distance between the two arms, before any modality comparison.
- **Probabilities are model-internal semantic distributions.** They are not response frequencies, not "% of readers" and not calibrated to humans. With n = 5 cards, results are descriptive only: per-cell distributions, argmax agreement, and TV/JS distance between image and text. No significance tests.
- Avoid questions that need date arithmetic or interval comparison (J11, and card A is full of ISO dates). Ask about the *stated* reading, not about computing it.
- Reading questions must be answerable from the card alone. Neither model can be asked "why" or give free text.

## 6. Budget: conservative ceilings (not account caps)

**Assumptions are listed explicitly. If any of them fails, it is a STOP condition (§9).**

**GLiDE, per call, ≤ 8 questions:**
- A1: thinking omitted means one pass (G2).
- A2: billed tokens per question ≤ rendered prompt ≤ 65,536 (G5; image tokens included).
- A3: output is billed at $0 (G4).
- Bound: 8 × 65,536 = **524,288** input tokens.
  - At $0.04/M → **$0.020972**.
  - At the old $0.15/M rate (a price-regression buffer) → **$0.078643**.
- **Proposed reservation: $0.16 per GLiDE call.** This is the $0.15/M bound × 2, a margin for the undocumented "internal passes" wording.

**The `token_usage` vs `usage` question:**
- `token_usage` is described as "Total tokens billed (input plus output)".
- The pricing pages say output costs $0 and "only input tokens are billed".
- Reading: cost = `usage.input_tokens × price`. `token_usage` is a metered count, not a dollar basis.
- This is a documented inconsistency. If an account statement ever bills output tokens, A3 fails. Output has **no documented upper bound**, so that would be an immediate STOP.

**Jev, per call, ≤ 8 questions:**
- J5/J6 indicate state is billed once and the per-request context is 64k. Read "64k" as 65,536, taking the larger reading. Bound: 65,536 × $0.042/M = **$0.002753**.
- If state were instead billed per question: 8 × 32,768 = 262,144 → **$0.011010**.
- With the Long-Context header the bound becomes 8 × 262,144 → $0.088080. That header is forbidden for this study.
- **Proposed reservation: $0.03 per Jev call.** This is the per-question reading × 2, rounded up.

**Study totals:**

| Design | Calls | Documented ceiling | Reservation |
| - | - | - | - |
| 5 cards × 2 modalities × 2 providers × 1 order | 20 | ≈ $0.32 (GLiDE 10 × 0.02097 + Jev 10 × 0.01101) | **$1.90** |
| Same, with forward + reversed order | 40 | ≈ $0.64 | **$3.80** |
| Jev image arm removed while BLOCKED | (GLiDE 20 + Jev 10, 2 orders) | — | $3.50 |

These are study-internal reservations derived from published limits, without a token estimator. They are **not** an account hard cap. Neither provider exposes a per-request spend cap. Fastino has owner-set daily/monthly spend limits (402 `spend_limit_reached`); TypeSafe uses credits with optional auto-refill (MCA §8.2).

## 7. Retention and data handling

| | TypeSafe / Jev | Fastino / GLiDE |
| - | - | - |
| Default retention | Undated: "as long as necessary" (DPA §8). The MCA gives a perpetual licence for Telemetry/abuse/legal. ZDR is enterprise only. | "Retained indefinitely", tiered to cold storage, unless `store:false` or team ZDR |
| Per-request opt-out | **None documented** | `store:false` → header `X-Fastino-Data-Retention: not-stored` (or `zero`) |
| Training | No training without consent (MCA §4.1; Privacy Policy) | Default "Sometimes" trains. `store:false` is "never used for platform training" |
| DPA | Yes (updated 2026-04-24) | "We do not offer a DPA" |
| Billing metadata kept | Assumed | Yes, even with `store:false` |

**Unresolved and needing the account (not verifiable now):**
- Whether ZDR or an enterprise plan is active on either account.
- Fastino's team training opt-out state.
- Balances, auto-refill state and spend limits.
- Whether errored or aborted requests are billed.
- Whether any idempotency exists for `/v1/systemone` (none documented on either side).

**The stimuli are synthetic fixture cards ("Ravi"/"Asha"), not private exports.** That lowers the stakes, but it does not waive `store:false`.

**Read-only account verification (only after explicit owner authorization; stored separately from scientific results; key supplied by the owner at run time, never logged):**
1. TypeSafe: `GET /v1/models`. Record names and `release_date` only. Expect aliases, not proof of `jev-1.14.0`.
2. Fastino: `GET /v1/base-models?supports_inference=true`. Record the GLiDE entry.
3. The owner reads the console balance, spend limit, auto-refill, ZDR and training opt-out manually, then records them in a separate account-verification receipt.

None of these steps is an inference call, and none of them proves which weights served a given call.

## 8. Scientific feasibility

**Feasible:** closed-form semantic interpretation probes, i.e. "which of these fixed readings does the card support". These are typed choice distributions over caller-defined options.

**Not feasible:** free-form interviews, comprehension narratives, persona or participant simulation, human frequency claims, or anything framed as "users would…".

**What image-vs-innerText differences would mean:**
- A difference shows only that *this provider's pipeline* produced different option distributions for *these PNG bytes* than for *this string*.
- The PNG and text differ in layout, glyphs and line-breaking (§3), and each provider's internal image processing (re-encode or resize, plus whatever recognition happens) is unknown.
- So a difference **cannot** be attributed to layout, visual hierarchy, typography or accessibility. No causal layout or accessibility claim is supported.
- Identical distributions do not show "the same content was read" either.

**SDK and auto-retry hazards:**
- The TypeSafe SDK retries timeouts and 5xx by default (J12), and the default timeout is 10 s. One logical attempt could therefore become up to 3 billed requests.
- Fastino docs actively recommend retry loops (G9). 425 warm-up can repeat.
- Generic HTTP stacks (urllib3/requests adapters, `curl --retry`, proxy retries) can resend silently.
- The study must use a plain HTTP client with retries disabled at every layer, and must not use either SDK.

**"Actual model versions":** NO. See §1. At most the study can report:
- the requested ID;
- the response `model`;
- `X-Fastino-Served-Model`;
- timestamps.

All of these are provider-asserted labels.

## 9. STOP conditions and preflight gates

**Gates (all must pass, in order, before the first inference):**
- **P0** Separate written owner authorization naming providers, cells, call count and reservation total. Issue38 does not cover this.
- **P1** Re-fetch every doc in both `SOURCES.json`. If any SHA changed, re-review it. Fields to re-check: price, limits, `thinking`, `store`, response schema, Jev image support. Any change that moves a bound is a STOP.
- **P2** The Jev image conflict (J7 vs J8) is resolved in writing by the provider. Otherwise the Jev image arm stays excluded.
- **P3** Read-only account verification receipt (§7) exists and is filed separately.
- **P4** The account balance and spend limit cover the full reservation total. The owner sets a provider-side spend limit at or near that total where available.
- **P5** Offline body check per cell:
  - The decoded image/text SHA matches the manifest.
  - The JSON validates against the archived OpenAPI request schema.
  - There are no extra top-level fields.
  - GLiDE has `store:false` and no `thinking`.
  - Jev has no Long-Context header.
  - The model string is exactly `jev-1.14.0` or `fastino/GLiDE`.
  - There are ≤ 8 questions, each with 2–255 options.
- **P6** Client retries are 0 at every layer. A single client timeout is set (≥300 s, per Fastino). No SDK is used.
- **P7** The ledger reservation is written and fsynced **before** the socket opens.

**STOP before the next call if:**
- any doc disagrees with the assumptions in §6 (A1–A3, J5/J6), or no finite bill bound remains;
- any non-200 response, or a 200 with `model` ≠ expected (Jev: ≠ `jev-1.14.0`; GLiDE: ≠ `glide`);
- GLiDE `X-Fastino-Data-Retention` is absent or `stored` on a 200 (a retention breach: record it and halt everything);
- `usage.input_tokens` exceeds the per-call bound (GLiDE > 65,536 × questions; Jev > 65,536);
- the probabilities fail schema validation (wrong keys, or sum outside a pre-registered tolerance);
- the observed price per token is inconsistent with the docs at reconciliation;
- a transport error or timeout leaves the outcome unknown.

**Attempt ledger (append-only JSONL, one line per state transition; described only, not implemented):**

```
PLANNED → RESERVED(reservation_usd, body_sha256, stimulus_sha256, cell, order_arm)
       → SENT(utc)
       → one of:
         OK_200(response_sha256, model, served_model_hdr, retention_hdr, input_tokens)  → provisional cost = input_tokens×price; reservation held until account reconciliation
         HTTP_ERR(status, body_sha256)                                                  → full reservation stays held (error billing unknown)
         UNKNOWN(transport error/timeout)                                               → full reservation stays held; cell is DEAD for this run
```

Ledger rules:
- No automatic retry and no resume.
- A crashed run never continues by itself.
- Any re-attempt of a cell needs a new `attempt_id`, a new reservation and a new owner authorization.
- An attempt never assumes the earlier attempt was not billed.

## 10. Unresolved items

1. Jev image support for `jev-1.14.0`: the docs contradict each other (J7 vs J8).
2. Jev image token cost ("guidance soon") and GLiDE's actual token use for these 344-px-wide PNGs. Only the GLiDE range (64–1,024 per question) is published.
3. Whether "64k" means 64,000 or 65,536 (the larger value is used above).
4. Whether Jev bills `state` once or once per question for images in `state`. The docs imply once.
5. What GLiDE's "internal passes" means beyond "one pass" with `thinking` omitted.
6. The `token_usage` "billed" wording vs output $0.
7. Whether 4xx/5xx/425 responses incur charges on either provider.
8. The account state on both sides: plan, ZDR, training opt-out, balance, auto-refill, spend limits.
9. No immutable GLiDE version exists. Jev versioned-ID immutability is implied, not contractually stated.
10. How JSON key order and array state are serialized into each model's prompt.
11. Whether each provider honours question independence and option-order invariance for these cards.

## 11. Skills inspected

| Path | Relevant? |
| - | - |
| `~/.claude/skills/{break-ui,emil-design-eng,frontend-design}/` | No (UI design) |
| `~/.claude/skills/synced/6f480a71-…/` | Not used |
| `~/.claude/plugins/cache/ponytail/ponytail/4.9.0/skills/*` (active via session hook) | Applied only as a scope limiter: no code, two files written |
| `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/*/skills/*` | Not installed/active, not relevant |
| Built-in `claude-api` | Anthropic-only, not applicable to Jev/GLiDE |

- No TypeSafe, Fastino or GLiDE skill is installed locally. `~/.codex/skills/` has none; `~/.agents/skills/` has only `computer-use-macos`.
- Fastino advertises a hosted GLiDE agent skill. It was **not** installed.
- No other harness's skills were assumed or accessed.

## Files written by this consultation

- `consultations/OPUS-FEASIBILITY.md` (this report)
- `evidence/provider-docs-opus/` (20 archived public docs + `SOURCES.json` with URL, final URL, HTTP status, retrieval UTC, SHA-256 and bytes)
