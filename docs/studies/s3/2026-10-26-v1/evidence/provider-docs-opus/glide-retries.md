> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Retries and model warm-up

> Handle transient 425, 429, 503, and Anthropic-compatible 529 responses without retrying permanent request failures.

## Retry only transient failures

Use bounded exponential backoff, respect `Retry-After`, and stop after a fixed attempt or time budget.

## Retry conditions

| Status | Meaning | Action |
| - | - | - |
| `425` | The selected model is warming | Retry after the server-provided delay |
| `429` | Rate limit reached | Respect `Retry-After`, then retry |
| `503` | Service temporarily unavailable | Retry with bounded backoff |
| `529` | Anthropic-compatible endpoint overloaded | Retry manually; the Anthropic SDK does not automatically retry this response |

Do not retry authentication, billing, validation, missing-model, or malformed-request errors until the request is corrected.

## Safe retry checklist

* Use an idempotency key for training-job creation and other supported mutations.
* Keep the same request body when replaying an idempotent request.
* Apply jitter and a maximum delay.
* Log the final status and request ID, but never the API key.

See the complete error response shapes and resolution guidance in [Errors](https://docs.fastino.ai/troubleshooting/errors.md).


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.