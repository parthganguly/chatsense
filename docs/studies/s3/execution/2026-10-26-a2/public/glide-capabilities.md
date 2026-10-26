> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# GLiDE Capabilities

> Review GLiDE decision behavior, confidence, context limits, and unsupported request shapes.

GLiDE evaluates caller-defined outcomes instead of generating prose. This page summarizes its technical behavior and boundaries. For a first request, start with [Call GLiDE](https://docs.fastino.ai/inference/systemone.md).

## Decision capabilities

* Evaluate a string, object, or array supplied as shared `state`.
* Ask one or more named questions against that state.
* Use [Noul](https://docs.fastino.ai/concepts/glide-noul.md) for yes/no probabilities.
* Use [Choice](https://docs.fastino.ai/concepts/glide-choice.md) for one unordered option from a caller-defined set.
* Use [Score](https://docs.fastino.ai/concepts/glide-score.md) for one level on an ordered rubric.
* Receive probabilities and confidence for every answer.
* Evaluate decisions that depend on arithmetic, code traces, dates, policies, exceptions, and related facts in the supplied state.

Each question is evaluated independently against the same state.

## Confidence and uncertainty

The answer tells you what GLiDE concluded. `confidence` tells you how clearly the leading outcome separated from the alternatives.

| Question type | Confidence formula | Range |
| - | - | - |
| Noul | Absolute value of `2 × noul − 1` | `0` at maximum uncertainty to `1` at either extreme |
| Choice | `top1 − top2` | `0` for a tie to `1` for a dominant option |
| Score | `top1 − top2` | `0` for a tie to `1` for a dominant level |

A low-confidence answer is not necessarily incorrect. It means probability mass is spread across outcomes. Tune action and fallback thresholds on representative data rather than assuming a universal cutoff.

## Limits

* Each rendered prompt—`state` plus one question—must fit within **65,536 tokens**.
* Choice requires **2 to 255 options**.
* Score accepts up to **255 levels**.
* Every question is single-label. There is no multi-label primitive.
* One request evaluates one shared `state`; multiple questions belong under `questions`.
* `usage.input_tokens` sums internal passes across questions and can exceed 65,536 even when each rendered prompt fits.
* An array `state` accepts up to **4 images** as `image_url` parts.
* Each image must be JPEG, PNG, GIF, or WebP, at most **3.75 MiB** (3,932,160 bytes), and at most **25,000,000 pixels**.
* Image URLs must be HTTPS on a public host, with no redirects. You can also send a base64 data URL.
* GLiDE resizes each image to between 65,536 and 1,048,576 pixels, so each image adds 64 to 1,024 input tokens per question. See [Image input](https://docs.fastino.ai/inference/systemone.md#image-input) for examples and error handling.

## Unsupported request shapes

* `/v1/systemone` does not stream.
* It does not accept a batch of independent states.
* It does not currently accept fine-tuned deployment IDs.
* Extra top-level request fields are rejected.
* Choice cannot contain only one option.

## Evaluation

On Decision Index 0.2.1, GLiDE scored **64.81** compared with Jev's published **57.91**, leading all five evaluation areas and 31 of 38 benchmarks.

> **[Call GLiDE](https://docs.fastino.ai/inference/systemone.md)**
>
> Review the complete request, response, error handling, and migration guidance.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.