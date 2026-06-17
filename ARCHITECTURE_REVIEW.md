# ChatSense — Architecture Review

**Type:** Read-only architecture review. No implementation code was changed.
**Date:** 2026-06-14
**Scope:** System boundaries vs. product goals (privacy-first, local-only, non-LLM behavioral analytics for WhatsApp exports on Android).

---

## 1. Executive summary

ChatSense currently contains **two independent analytics engines** that share a problem domain but share **no code, no contract enforcement, and no runtime link**:

- A **TypeScript engine** (`lib/chat-parser.ts` + `lib/chat-analyzer.ts`) that runs entirely client-side in a Capacitor WebView and **is the only thing the shipped app actually uses**.
- A **Python package** (`python/chatsense_ml/`) that parses the same exports, computes a richer superset of metrics, and writes `report.json` / `features.parquet` — **none of which the app ever reads** (verified: no `fetch`, no `.parquet`, no `report.json` reference anywhere in `app/`, `lib/`, or the Android Java).

The Python package is, in practice, already a research/reference implementation — it is just not labelled as one, and it carries forward-looking ML scaffolding (sklearn classifiers, backtesting, calibration, label leakage guards) that the Phase-1 descriptive product does not ship. The `docs/data_contract.md` describes **Python's** output shape, but the TypeScript runtime does not conform to it and nothing tests that it does.

**The core finding:** the system boundary is sound in one direction (Python *should* be reference, TS *should* be runtime) but is undocumented, unenforced, and partially duplicated. The risk is silent divergence of behavioral logic between the two, plus a few concrete privacy/memory issues in the live Android path.

**Recommendation:** adopt **Architecture A** — *TypeScript mobile runtime + Python research/reference package* — and make the existing implicit split explicit with a shared fixture + contract test, without bundling Python onto the device.

---

## 2. Current-state architecture

```
                          WhatsApp export (.zip / .txt)
                                     │
        ┌────────────────────────────┴───────────────────────────────┐
        │                                                              │
   ANDROID DEVICE (shipped runtime)                       DEVELOPER MACHINE (offline)
        │                                                              │
  ┌─────▼───────────────────────────────┐               ┌─────────────▼───────────────────┐
  │ MainActivity.java                    │               │ chatsense-ml (Python pkg)        │
  │  - ACTION_SEND / VIEW intent         │               │  CLI: chatsense-ml analyze       │
  │  - readAllBytes() → Base64 (NO_WRAP) │               │                                  │
  │  - injects whole file as JS string   │               │  importers/whatsapp.py  ─┐       │
  │    via evaluateJavascript()          │               │  cleaning.py             │       │
  └─────┬───────────────────────────────┘               │  features/* labels/*     │ build │
        │ CustomEvent("chatsense-shared-file")           │  graphs/interaction      │ feats │
  ┌─────▼───────────────────────────────┐               │  reports/json_report.py ─┘       │
  │ Next.js static export (webDir: out)  │               │        │            │            │
  │ app/page.tsx (client component)      │               │        ▼            ▼            │
  │  - JSZip unzip in-memory             │               │   report.json   features.parquet│
  │  - parseWhatsAppChat()  ◄──┐         │               │        │            │            │
  │  - analyzeChat()           │ DUP     │   no link      │        ▼            ▼            │
  │  - React/Tailwind UI       │ logic   │  ◄────╳────►   │  research/eval (NOT in pipeline):│
  │    Overview / Rhythm /     │         │               │  anomaly/* survival/* models/*   │
  │    People screens          │         │               │  evaluation/* (backtest,         │
  └────────────────────────────┘         │               │  calibration, splits, metrics)   │
        │                                 │               │  viz/* (pyvis, ipyvizzu, netgraph)│
   all in WebView JS heap;                │               │  synthetic/generate_chat.py      │
   nothing persisted, nothing uploaded    │               └──────────────────────────────────┘
        │                                 │
        └── duplicated business logic ────┘
            (parsing, dmy/mdy inference, reply dynamics,
             MAD silence threshold, sender balance,
             6h thread/initiation gap, interaction graph)
```

**Two key structural facts:**

1. The **only data path that reaches a user** is `MainActivity → CustomEvent → app/page.tsx → lib/*.ts`. The Python package is never invoked on-device and its outputs are never consumed.
2. `report.json` / `features.parquet` are a **contract with no consumer**. They are valuable as a *reference specification*, but today they are a dangling artifact.

---

## 3. Duplicated behavioral logic (Q1, Q2)

Both engines independently implement the same domain primitives. The logic overlaps but is **not identical**, which is exactly the divergence hazard:

| Concept | TypeScript (`lib/`) | Python (`chatsense_ml/`) | Divergence today |
| --- | --- | --- | --- |
| Export parsing (2 regex formats) | `chat-parser.ts` | `importers/whatsapp.py` | Nearly identical regexes; **Python also has a system-line parser + media/deleted classification + stable hash IDs**, TS does not. |
| Date order inference | `inferDateOrder` (scans all lines) | per-row heuristic in `_parse_datetime` | **Different algorithms** — TS infers one order for the whole file; Python decides per row. Can disagree on ambiguous dates. |
| Quick / late reply | `<5min`, `≤24h` buckets | `<5min`, `>1440min` | Aligned constants. |
| Reply = sender switch | `getReplyEvents` | `is_reply` in `cleaning.py` | Aligned. |
| Silence anomaly | `median + 3.5·1.4826·MAD`, floored at 6h | `anomaly/silence_anomaly.py` uses MAD z-score (0.6745) — **different formula**, and not even wired into `json_report` | **Diverged + not in report.** |
| Thread / initiation gap | `THREAD_GAP_MINUTES = 6h` | `silence_threshold_hours = 6.0` | Aligned constant, separately defined. |
| Sender balance | implicit via `messageShare` | `1 − (max_share − min_share)` | TS reports raw share; **Python reports a balance score TS never computes**. |
| Activity (peak hour/day, trend) | `analyzeActivity` (rising/falling ±20%) | `labels/activity.py` (peak hour/weekday, active-day ratio) | **Different metric sets** for the same screen concept. |
| Interaction graph | `buildReplyEdges` (flat edge list) | `graphs/interaction_graph.py` (networkx DiGraph) | Same idea, different output shape. |
| Forward-looking labels | *(none)* | `labels/reply_delay`, `labels/imbalance`, `temporal` | **Python-only**, unused by product. |

**Source of truth — recommendation:** For the **shipped behavioral metrics**, the **TypeScript engine is and should remain the runtime source of truth**, because it is the only code that runs where users are. The **Python package + `data_contract.md` should be the source of truth for *definitions*** — the canonical, documented, test-covered specification of what each metric *means* and what thresholds apply. TS implements the spec; Python *is* the spec. This is the only split that is enforceable on a mobile device without shipping a Python runtime.

---

## 4. Can a local Python engine integrate with Capacitor? (Q3, Q4)

**On-device: effectively no, not within product constraints.**

- A Capacitor app is an Android WebView plus native plugins. There is **no Python interpreter** in that runtime.
- Embedding CPython on Android (Chaquopy, BeeWare/Briefcase, or a custom build) is technically possible, but the dependency set here — `pandas`, `numpy`, `pyarrow`, `scikit-learn`, `networkx`, and similar native/data packages — means shipping **large native ABI wheels** for every supported architecture. Expect tens of MB of APK bloat, multi-second cold starts, and a maintenance burden (per-ABI builds, native crashes) that is wildly disproportionate to the descriptive statistics being computed.
- The metrics in this product (counts, medians, MAD thresholds, group-bys over a single conversation) are **trivially expressible in TypeScript** and already are. There is no analytical capability in the Python core that justifies an embedded interpreter.

**Conclusion (Q4):** Yes — **Python should remain a research/reference implementation; TypeScript should power the mobile runtime.** The Python engine's legitimate jobs are: (a) define and document the contract, (b) prototype future metrics on real exports with pandas/sklearn before they are promoted to TS, (c) generate shared test fixtures, and (d) validate TS output offline in CI. None of these require Python on the phone.

---

## 5. Preventing TS/Python divergence (Q5)

There is currently **no shared fixture, no JSON-Schema file, and no cross-language parity test.** `test_cli_contract.py` only checks `schema_version == "1.0"` and a few top-level keys. The Python `synthetic/generate_chat.py` produces good scenario data but is not shared with the TS side.

Minimal, non-enterprise mechanism to lock the boundary:

1. **One shared fixture directory** (e.g. `fixtures/`) containing a handful of synthetic exports generated by `synthetic/generate_chat.py` (normal, long-silence, repair, drift, group). Commit the `.txt` exports so both languages read the same bytes.
2. **A committed `report.schema.json`** (JSON Schema) derived from `data_contract.md`. Validate Python's `report.json` against it in `pytest`, and validate TS output against the same file in a small Node/Vitest test. One schema, two validators.
3. **A golden-metric parity test**: for each fixture, assert that the *overlapping* metrics (message count, participant shares, median reply delay, quick/late-reply rate, longest silence, peak hour/day, reply-edge counts) match between `chatsense-ml analyze` output and a tiny Node harness that calls `analyzeChat()`. Pick explicit tolerances and document the **known intentional differences** (e.g. per-row vs whole-file date inference) so the test encodes the contract rather than papering over it.

This is three artifacts, not a framework. It converts the implicit "Python is the spec" understanding into something CI fails on when violated.

---

## 6. Data flow: import → UI (Q6)

**Shipped path (TypeScript):**

1. **Import** — Android `ACTION_SEND`/`ACTION_VIEW` → `MainActivity.readAllBytes()` reads the whole file into a `byte[]`, Base64-encodes it, and injects it as a **JS string literal** via `evaluateJavascript()`. Or the user picks a file via the hidden `<input>`.
2. **Decode/unzip** — `app/page.tsx` `base64ToBuffer` → `JSZip.loadAsync` finds `*_chat.txt` (in-memory).
3. **Parse** — `parseWhatsAppChat` → `ChatMessage[]` (timestamp, sender, content).
4. **Features/metrics** — `analyzeChat` computes overview, participants, reply dynamics, silence summary, activity, reply edges, threads, insights — all in one synchronous pass set.
5. **Labels** — none on the runtime side (forward-looking labels exist only in Python).
6. **Persistence** — **none.** State lives in React `useState`; closing the app discards everything. (This is a privacy positive but means re-import on every launch.)
7. **UI** — Overview / Rhythm / People screens render the in-memory `ChatAnalysis`.

**Reference path (Python):** `parse_export → conversation_to_dataframe → add_base_columns → sender_balance → initiation → rolling_windows → next_reply_delay/activity/imbalance labels → build_report` → writes `report.json` (+ optional `features.parquet`). Self-contained, file-in/file-out, no network.

---

## 7. Privacy boundaries & temp-file handling (Q7)

**Strong, with a few concrete gaps:**

- ✅ All analysis is on-device; no network calls in the analysis path; nothing persisted to disk by the app.
- ✅ `report.json` always embeds the three safety `warnings` (no diagnosis / not proof of intent / partial context). The UI echoes the same framing.
- ⚠️ A telemetry SDK dependency was declared in `package.json`. It was **not imported** in any component (verified), so it was dormant — but for a product whose pitch is "No upload. No account," a telemetry SDK sitting in the dependency tree is a latent contradiction and should be removed or explicitly justified.
- ⚠️ **`INTERNET` permission is declared** in `AndroidManifest.xml`. The WebView likely needs it for nothing in the local flow; review whether it can be dropped to make "local-only" verifiable by inspection.
- ⚠️ **`file_paths.xml` is the broad Capacitor default**. It exposes broad external + cache roots through the FileProvider. Tighten to the specific subdirectory actually shared.
- ⚠️ **Python persistence is plaintext and uncleaned.** `analyze_file` writes `report.json`/`features.parquet` to caller-specified paths and never deletes them; `features.parquet` contains **full cleaned message text**. This is fine for a developer reference tool but must **never** be promoted to a device path without an explicit retention/cleanup policy. There is no temp-file handling because there are no temp files today — flag this before any future on-device file output is added.

---

## 8. Performance & memory with large exports (Q8)

The Android import path is the real risk, not the math:

1. **Whole-file Base64 over the JS bridge.** `MainActivity` reads the entire export into a `byte[]`, Base64-encodes it (~+33%), and embeds it in a JavaScript string passed to `evaluateJavascript()`. For a large media-heavy `.zip` (tens/hundreds of MB) this multiplies memory (native byte[] + Base64 string + JS string + decoded ArrayBuffer + unzipped text simultaneously) and can hit WebView script-size limits or OOM. **Prefer streaming the file via a Capacitor filesystem/URI plugin instead of string injection.**
2. **JSZip in-memory** decompresses the whole archive in the JS heap.
3. **`analyzeChat` allocation.** `analyzeParticipants` does `messages.filter(...)` **once per sender** (O(messages × senders)), plus multiple full-array passes and sorts. Fine for typical 1-1 chats (tens of thousands of messages); for large group exports (100k+ messages) the repeated filtering and the all-in-WebView heap pressure are the ceiling. A single grouped pass would remove the multiplicative cost cheaply when needed.
4. Python (pandas) scales far better but runs off-device, so it does not help the runtime.

None of this is urgent for 1-1 chats, but the **Base64 bridge is the first thing to fix** before targeting large or group exports.

---

## 9. Packaging & deployment complexity (Q9)

- **Today (Architecture A in practice):** `next build` (static export, `output: "export"`) → `cap sync android` → Gradle APK. The Python package is a separate `pip install -e .[dev]` for developers. **Low complexity, two independent toolchains that never have to meet on-device.** ⚠️ Note `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so type regressions in the runtime engine ship silently — worth turning off for `lib/` at least.
- **Embedding Python (Architecture B):** adds per-ABI native builds, large APK, Chaquopy/Briefcase integration, native crash surface. **High complexity, poor fit.**
- **Native rewrite (Architecture C):** removes Python-on-device but discards the working React/Tailwind UI and TS engine; introduces a Kotlin codebase and a third place for the same logic to drift. **High migration cost.**

---

## 10. Module-by-module value (Q10)

**Genuinely useful now (keep):**
- `importers/whatsapp.py`, `cleaning.py` — canonical parsing + base feature spec.
- `features/reply_dynamics.py`, `features/sender_balance.py`, `features/initiation.py`, `features/temporal.py`(activity), `graphs/interaction_graph.py`, `reports/json_report.py`, `schemas.py` — these define the contract the UI metrics map to.
- `synthetic/generate_chat.py` — high-value as the **shared fixture generator** (see §5).
- TS `lib/chat-parser.ts`, `lib/chat-analyzer.ts` — the runtime.

**Premature complexity (defer / quarantine as research, do not wire into product):**
- `models/sklearn_models.py`, `models/baselines.py`, `evaluation/backtest.py`, `evaluation/calibration.py`, `evaluation/splits.py`, `evaluation/metrics.py`, `evaluation/baselines.py` — full predictive-ML + calibration + backtesting scaffolding for classifiers the **descriptive, non-LLM product does not ship**. Legitimate research, but currently unused by the pipeline and untethered to any product surface.
- `labels/reply_delay.py`, `labels/imbalance.py`, `features/rolling_windows.py`, `temporal.add_next_window_activity_level` — forward-looking *label* columns (with careful no-leakage design) that only exist to train the above models. Keep in the research package; do not port to TS.
- `survival/reply_time.py`, `anomaly/*` — research-grade; note `anomaly/silence_anomaly.py` uses a **different** silence formula than both the TS runtime and the report, so it is a latent inconsistency.
- `viz/*` (`pyvis`, `ipyvizzu`, `netgraph`) — notebook/demo visualizations; heavy deps for a package whose product output is JSON.

**Dead / unjustified dependencies (remove or justify):**
- The local SQL engine dependency — declared in `pyproject.toml`, **imported nowhere** (verified). Remove.
- `ipyvizzu`, `netgraph`, `pyvis` — only the `viz/` notebooks use them; move to an optional `[viz]` extra so the core install stays lean.
- The telemetry SDK dependency (JS) — see §7; remove from the runtime dependency tree.

---

## 11. Architecture comparison

### Option A — TypeScript mobile runtime + Python research/reference package *(current de-facto state, made explicit)*

| Dimension | Assessment |
| --- | --- |
| Mobile feasibility | **Excellent** — already shipping; pure JS in WebView. |
| Local-only / privacy | **Excellent** — no Python on device; fix Base64 bridge, INTERNET perm, vercel/analytics, file_paths to make it airtight. |
| Maintainability | **Good** — two clear roles; risk is the unenforced contract (fixable via §5). |
| Duplication risk | **Medium** — real overlap exists, but bounded by shared fixtures + parity test. |
| Packaging | **Low** — Next static export + Capacitor; Python is dev-only. |
| Performance | **Good** for 1-1 / typical; address Base64 bridge + per-sender filtering for large/group exports. |
| Testability | **Good** once shared fixture + schema + parity test exist; both sides independently testable. |
| Migration cost | **Lowest** — formalizes what already exists. |

### Option B — TypeScript UI + local Python analytics process

| Dimension | Assessment |
| --- | --- |
| Mobile feasibility | **Poor** — no on-device Python process; embedding CPython + pandas/sklearn/pyarrow is heavyweight and fragile. |
| Local-only / privacy | Neutral — still local, but larger native attack/crash surface. |
| Maintainability | **Poor** — native ABI builds, interpreter lifecycle, IPC between WebView and Python. |
| Duplication risk | **Low** (one engine) — but only if the TS engine is deleted, which sacrifices the working runtime. |
| Packaging | **High** — per-ABI wheels, tens of MB APK, Chaquopy/Briefcase. |
| Performance | Better raw compute, but cold-start and memory cost dominate for small per-conversation workloads. |
| Testability | One engine to test, but on-device integration testing becomes hard. |
| Migration cost | **High** — rebuild the bridge, ship native runtime; disproportionate to the descriptive stats involved. |

### Option C — Native Android/Kotlin runtime + Python research package

| Dimension | Assessment |
| --- | --- |
| Mobile feasibility | **Good** — native is the most capable runtime. |
| Local-only / privacy | **Excellent** — fully native, easy to audit. |
| Maintainability | **Medium** — single mobile language, but a **third** implementation of the same logic (Kotlin) to keep in sync with the Python spec. |
| Duplication risk | **Medium** — Kotlin vs Python spec still needs the same parity discipline as A. |
| Packaging | **Medium** — standard Android, no Python on device. |
| Performance | **Best** — native, no WebView/JS heap ceiling. |
| Testability | **Good** — JVM testing is mature. |
| Migration cost | **Highest** — discards the existing React/Tailwind UI and TS engine entirely; full rebuild. |

---

## 12. Recommendation for the next six months

**Adopt Architecture A**: keep the **TypeScript engine as the on-device runtime and source of truth for shipped metrics**, and keep the **Python package as the documented research/reference implementation and contract owner**. Do not bundle Python onto the device. Do not start a native rewrite.

Rationale: the product is descriptive, non-LLM, single-conversation statistics. TypeScript already computes them where users are, with zero deployment complexity and strong privacy. The whole value of Python here is *specification, prototyping, and offline validation* — none of which need the interpreter on the phone. Architecture A is the simplest design that satisfies local-only Android operation, which is the stated priority. Revisit C only if/when the runtime hits a wall TS genuinely cannot clear (e.g. very large group exports) — and even then, only after the Base64 bridge and per-sender filtering are fixed.

---

## 13. Five most important architectural risks

1. **Silent TS/Python divergence of behavioral logic.** Two engines, overlapping definitions, already inconsistent (date-order inference; silence formula in `anomaly/` vs runtime), with **no parity test and no schema validation**. As either side evolves, the documented contract and the shipped behavior drift apart unnoticed.
2. **Whole-file Base64 injection over the JS bridge** (`MainActivity.evaluateJavascript`). Memory multiplication and script-size limits make large/media-heavy exports a crash risk on the only path users actually hit.
3. **Latent privacy contradictions in the "no upload" runtime:** dormant telemetry dependency, declared `INTERNET` permission, and the broad default `file_paths.xml`. Individually minor, collectively they make the local-only claim unverifiable by inspection.
4. **`report.json` / `features.parquet` is a contract with no consumer**, while `data_contract.md` describes a shape the runtime does not implement. The contract reads as authoritative but governs nothing shipped.
5. **Premature ML scaffolding masquerading as product scope.** sklearn classifiers, backtesting, calibration, forward-looking labels, an unused SQL dependency, and heavy viz deps (`pyvis`/`ipyvizzu`/`netgraph`) inflate the dependency surface and the apparent system, obscuring that the product is a few client-side descriptive metrics.

---

## 14. Target architecture (recommended)

```
   WhatsApp export (.zip/.txt)
            │
   ┌────────▼─────────────────────────────────────────────┐
   │ ANDROID DEVICE — runtime (TypeScript, authoritative)  │
   │  MainActivity: STREAM file via FS plugin (no Base64   │
   │                whole-file string injection)           │
   │  app/page.tsx → chat-parser.ts → chat-analyzer.ts     │
   │  → React UI. No persistence, no network, no telemetry.│
   └───────────────────────┬───────────────────────────────┘
                            │ implements ▼ (validated in CI)
   ┌────────────────────────────────────────────────────────┐
   │ CONTRACT (committed, single source of definitions)      │
   │  report.schema.json  ◄── derived from data_contract.md  │
   │  fixtures/*.txt       ◄── from synthetic/generate_chat  │
   └───────────────────────┬─────────────────────┬───────────┘
                            │                     │
        Node parity/schema test            pytest parity/schema test
                            │                     │
   ┌────────────────────────▼─────────────────────▼───────────┐
   │ DEVELOPER MACHINE — chatsense-ml (research/reference)     │
   │  core pipeline (parse/clean/features/report) = the spec   │
   │  research/  (sklearn, backtest, calibration, survival,    │
   │   anomaly, labels, viz)  — quarantined, optional extras,  │
   │   NEVER shipped to device                                 │
   └────────────────────────────────────────────────────────────┘
```

The only new artifacts are a committed JSON Schema, a shared fixtures folder, and two thin parity tests. No new frameworks, no on-device Python, no enterprise abstractions.

---

## 15. Staged migration plan

**Stage 0 — Make the boundary explicit (docs only, ~0.5 day)**
- Add a top-of-repo statement: *TS = runtime & source of truth for shipped metrics; Python = reference/contract.*
- Mark `models/`, `evaluation/`, `survival/`, `anomaly/`, `labels/`, `viz/` as research-only in `chatsense_ml/__init__` docstrings and `data_contract.md`.

**Stage 1 — Lock the contract (CI, ~2–3 days)**
- Generate `report.schema.json` from `data_contract.md`; validate Python output against it in pytest.
- Commit a small `fixtures/` set from `synthetic/generate_chat.py`.
- Add the Node parity harness calling `analyzeChat()` over the same fixtures; assert overlapping metrics within documented tolerances; encode known intentional differences explicitly.

**Stage 2 — Close runtime privacy gaps (~1–2 days)**
- Remove the telemetry dependency; re-evaluate/remove the `INTERNET` permission; tighten `file_paths.xml` to the specific shared subdirectory.
- Turn off `typescript.ignoreBuildErrors` for the `lib/` runtime engine (or gate CI on `tsc` for those files).

**Stage 3 — Fix the import bridge (~3–5 days)**
- Replace whole-file Base64 `evaluateJavascript` injection with a streaming filesystem/URI read via a Capacitor plugin; keep the existing `CustomEvent` contract for the web layer but pass a file handle/path, not the bytes.

**Stage 4 — Trim the reference package (~1 day)**
- Remove the unused SQL dependency; move `pyvis`/`ipyvizzu`/`netgraph` to an optional `[viz]` extra; keep `dev`/core installs lean.

**Stage 5 — (Conditional) large-export performance**
- Only if group exports become a target: replace per-sender `messages.filter` in `analyzeParticipants` with a single grouped pass; consider chunked parsing. Defer until there is a real workload.

---

## 16. Modules: keep / change / deprecate / remove

| Action | Modules |
| --- | --- |
| **Keep (runtime)** | `lib/chat-parser.ts`, `lib/chat-analyzer.ts`, `app/page.tsx`, Capacitor shell. |
| **Keep (reference core)** | `importers/whatsapp.py`, `cleaning.py`, `features/reply_dynamics.py`, `features/sender_balance.py`, `features/initiation.py`, `features/temporal.py` (activity), `graphs/interaction_graph.py`, `reports/json_report.py`, `schemas.py`, `pipeline.py`, `cli.py`. |
| **Keep & elevate** | `synthetic/generate_chat.py` → promote to shared-fixture generator. |
| **Change** | `MainActivity.java` (stream instead of Base64); `next.config.mjs` (`ignoreBuildErrors`); `file_paths.xml` (narrow); `data_contract.md` (add the TS↔contract mapping + known differences); reconcile `anomaly/silence_anomaly.py` formula with the runtime/report or clearly label it as an alternative. |
| **Deprecate (quarantine as research, do not ship/port)** | `models/*`, `evaluation/*`, `survival/*`, `anomaly/*`, `labels/reply_delay.py`, `labels/imbalance.py`, `features/rolling_windows.py`, forward-looking `temporal` label. |
| **Remove / downgrade deps** | unused SQL dependency from `pyproject.toml`; telemetry dependency from `package.json`; move `pyvis`/`ipyvizzu`/`netgraph` to optional `[viz]` extra. |

---

## 17. Unresolved decisions requiring product-owner input

1. **Is on-device persistence ever wanted?** Today nothing is saved (privacy win, but re-import every launch). If users expect saved history, that introduces the first real temp-file/retention/encryption decision — currently out of scope by default.
2. **Are predictive features on the roadmap at all?** The entire `models/` + `evaluation/` + forward-looking `labels/` investment only pays off if ChatSense will eventually *predict* (reply-delay bucket, activity level). If the product stays purely descriptive, this code should be archived, not maintained.
3. **What are the supported export scales?** 1-1 chats vs large group exports drive whether Stage 5 (performance) and even Architecture C ever matter. Need a target message-count ceiling.
4. **Is any telemetry acceptable?** The previous telemetry dependency suggests someone considered it. A crisp yes/no determines whether "No upload. No account." is an absolute guarantee or a default.
5. **Group-chat semantics.** "Reply = previous sender differs" is a 1-1 heuristic; for group chats the reply graph and initiation logic need an explicit definition before group exports are marketed as supported.
6. **Localization of date/number formats.** TS uses `en-US` `Intl` formatting and a heuristic dmy/mdy inference; Python differs per-row. The product owner should confirm the target locales so the contract can fix one canonical behavior.
```
