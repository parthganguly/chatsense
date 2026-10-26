# S3 A2 — BLOCKED before inference

Owner authority: issue #38, comment [6422489465](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6422489465), confirmed directly in the active Codex conversation. This is an A2 evidence review, not A3 dispatcher acceptance or an empirical S3 result. The frozen protocol remains `7ed874b7a3963e560d399b7c0046f5625a2e0757`.

**Decision: BLOCKED.** The complete per-attempt charge bound, actual account balances/holds/auto-refill and GLiDE image eligibility are not established. No inference is permitted under the existing conditional authorization until these requirements pass. No new owner permission is being requested to waive a gate.

## What actually ran

On 2026-10-26, Astra used existing macOS Keychain entries scoped to the two known provider services, keeping their values in process memory. The new `catalog_check.py` made exactly two direct HTTPS GETs, without SDKs, redirects or application retries:

1. `https://api.typesafe.ai/v1/models` with Bearer authentication, HTTP 200 at 17:28:39 UTC.
2. `https://api.fastino.ai/v1/base-models?supports_inference=true` with X-API-Key authentication, HTTP 200 at 17:28:40 UTC.

The receipts retain allowlisted contract fields and raw-body hashes. Raw authenticated bodies, credentials, account identifiers, cookies and private inference histories were not persisted. Fastino's catalog explicitly permits anonymous access: a successful credential-bearing catalog GET alone does **not** establish credential validity or account funding. Jev's catalog requires authentication.

Official public documentation, OpenAPI and legal pages were fetched separately without credentials. The available browser surface was Codex's in-app browser; neither provider console had an authenticated session there. TypeSafe opened at `/login`; Fastino at `/auth`. No sign-in form, account setting, purchase, top-up, model prompt or training request was submitted. The published OpenAPI documents expose no identified inference-account balance/holds/auto-refill GET. Training billing/storage endpoints cannot substitute for this evidence. This discovery result does not claim that private dashboard endpoints cannot exist.

## Gate adjudication

| Requirement | Evidence and conclusion | Status |
| --- | --- | --- |
| Exact frozen inputs and instrument | All 80 tracked packet files match the exact frozen commit; all 78 SHA256SUMS entries verify. Five PNG dimensions/sizes meet both documented limits. No stimulus or question changed. | PASS |
| Owner scope | Exact conditional authorization covers this read-only work. It accepts Jev experimental images and unspecified ordinary retention, plus an unpinned GLiDE service with verified store:false. | PASS |
| Jev requested version | Authenticated catalog lists `jev-latest` and `jev-preview`, with September alias dates. Current official models page explicitly maps both to `jev-1.14.0` and says versioned IDs are accepted even when absent from the catalog. Require response `jev-1.14.0` later; catalog dates are not weight versions. | DOCUMENTED; live served version NOT_TESTED |
| Jev screenshot wire contract | Dedicated unchanged image guide explicitly covers 1.13/1.14 and experimental `TypeSafe-Danger-Zone-Images:true`; assets use base64 plus an opaque state reference. Image tokens count inside the request context at the ordinary input rate, without a separate image charge. The generic text-only page remains inconsistent; the specific image contract and owner experimental acceptance justify the proposed method, not a claim of successful hosted ingestion. | DOCUMENTED; first counted pair remains the only future capability check |
| GLiDE identity | Credential-bearing catalog gives canonical base ID `fastino/GLiDE`, description identifying one-pass v2.3, bf16/B200, 65,536 input limit, inference enabled, not deprecated. OpenAPI defines X-Fastino-Served-Model as the canonical base ID for base-model inference. Candidate header allowlist is therefore exactly `fastino/GLiDE`; body model remains `glide`. This is an unpinned service description, not immutable weights. No live launch receipt/allowlist has been approved. | DOCUMENTED; actual served header NOT_TESTED |
| GLiDE screenshots | Current catalog returns `supports_image_input:false`. Its schema describes this as image support on compatibility inference APIs. SystemOne request schema and dedicated guide explicitly allow image_url PNG parts. These might describe different routes; the evidence does not justify declaring either actual SystemOne support or lack of support. Route-specific authoritative reconciliation is missing. | UNRESOLVED / BLOCKING |
| GLiDE store:false | Current request schema says false excludes input/output from history, logs, error reports, traces and training/adaptation; billing metadata remains. Header must be `not-stored` or `zero` on a successful response. The header may be absent on errors, which would terminate dispatch. Catalog `supports_zdr:true` is route capability, not proof this team enabled ZDR. Owner accepted store:false, not an assumption of team ZDR. | DOCUMENTED; actual response behavior NOT_TESTED |
| Jev ordinary retention | Current privacy/DPA/MCA match the earlier source hashes. No fixed ordinary deletion duration or per-request no-store flag is established. Owner explicitly accepted that limitation for these synthetic cards. | ACCEPTED DOCUMENTED LIMITATION |
| Normal GLiDE dollar rate versus token_usage | Catalog gives $0.04/M input and $0/M output; current pricing explicitly separates reported output tokens from charged input. OpenAPI catalog price fields describe upper rates applied by billing. This establishes the advertised normal dollar formula as `input_tokens × 0.04 / 1e6`, not `token_usage × 0.04 / 1e6`. However SystemOneResponse still calls input+output total “billed”; no actual account billing record was available to independently reconcile that wording. Do not claim the complete actual-billing gate passed. | NORMAL RATE CLARIFIED; actual bill/account reconciliation UNVERIFIED |
| Complete charge bound, including failure | Under the successful one-pass/input-only interpretation: Jev ≤65,536 × $0.042/M = $0.002752512; GLiDE ≤8 ×65,536 × $0.04/M = $0.02097152. Neither retrieved contract establishes that these also bound every errored/non-200, unanswered, aborted or timed-out attempt, all holds, or all applicable account fees. Internal reserves $0.003/$0.025 are not provider guarantees. Missing evidence is not proof of overcharging. | UNVERIFIED / BLOCKING for both |
| Existing spendable credits | Neither current account balance nor applicable account-specific billing terms was obtained. Both must cover the full reservation without a purchase. Historical balances are not evidence. | UNVERIFIED / BLOCKING |
| Holds, auto-refill and spend ceilings | No actual current settings obtained. Both providers describe optional automatic replenishment/overage; absence of a visible setting is not proof it is off. Holds and previously outstanding charges are unknown. Nothing was changed. | UNVERIFIED / BLOCKING |

The newer Fastino pricing/catalog text also changes unrelated training and other-model entries. That does not change this frozen GLiDE input/output rate or questions. OpenAPI, pricing and model source changes are recorded, not silently treated as byte-identical. The relevant SystemOne request/response/header contracts remain as described above.

## Exact stop and phase status

- **A2: BLOCKED**, after read-only evidence collection. No inference was used to resolve uncertainty.
- **A3: NOT_STARTED due to A2.** Native Opus 5.5 was not invoked for dispatcher implementation in this operation. No fresh dispatcher exists and no implementation PASS is claimed. An independent Sol A2 evidence review is separate from the future required immutable-dispatcher falsification.
- **A4: NOT_EXECUTED.** Jev 0/16 attempted inference requests; GLiDE 0/16. No capability probe, retry, fallback or changed modality. No S3 inference debit was initiated by this operation; actual overall account balances and external activity remain unknown.
- **A5: INCONCLUSIVE / NOT_RUN.** There are no synthetic outputs to score or independently recompute. This is not a NO-GO finding about ChatSense language, nor a GO finding. All five card results remain NOT_OBSERVED. No model response is presented as human data; human Stage 8A remains NOT_RUN.

Concrete next evidence needed: current read-only account receipts for available credits, holds, account rates and disabled auto-refill/overage; authoritative whole-attempt maximum charge treatment including failure/timeout; and Fastino route-specific reconciliation of its image-support flag with SystemOne PNG support. These are evidence requirements, not a request to increase the budget. No provider support message has been sent. The owner does not need to relay engineering prompts; the operation is stopped because its launch evidence is incomplete.

No empirical copy hypothesis has been promoted. The five preregistered hypotheses remain unchanged, with no new evidence about their priority. P0 v1/v2, all frozen S3 files, app code, production state and Stage 8B are unchanged. No merge or recruitment occurred.

## Evidence index

- `authenticated-catalogs.json`: redacted observed metadata and raw-body hashes.
- `catalog_check.py`: exact fresh GET-only collector; not an inference dispatcher and imports no old Decision Lab code.
- `public-sources.json` and `public/`: timestamped public sources and hashes; the two Fastino legal HTML fetches are app shells, not the rendered legal text.
- `browser-observations.json`: bounded browser observations of sign-in screens and rendered Fastino terms, explicitly recorded as Astra observations rather than raw HTTP evidence.
- `jev-billing-extracts.json`, `glide-billing-extracts.json`: exact schema descriptions with source paths.
- `endpoint-discovery.json`: reviewed published GET inventory.
- `source-comparison.json`: previous/current source hash comparisons.
- `frozen-provenance.json`, `image-eligibility.json`: immutable packet and image checks.

Independent review and final receipt are appended outside this evidence freeze after review. The freeze inventory excludes its own file and the later review files by an explicit file list.
