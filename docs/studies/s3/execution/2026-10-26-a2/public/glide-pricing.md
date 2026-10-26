> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Pricing

> Pricing for Fastino inference, config-job training, and model-specific interactive Training API usage.

## Training

Config jobs are billed by GPU time. Interactive jobs are billed by token.

### Config jobs

The rate depends on the GPU used by the selected model:

| Workload | GPU | Price |
| - | - | - |
| Most GLiNER encoders | A100 40GB | \$0.07 / GPU-minute (\$4.20 / GPU-hour) |
| GLiNER-2.5-Decide | H100 | \$0.13 / GPU-minute (\$7.90 / GPU-hour) |

### Interactive jobs

Token prices are USD per 1M tokens.

| Model | Prefill (not cached) | Prefill (cached) | Sample | Train |
| - | - | - | - | - |
| Nemotron 3.5 Super VL | \$0.16 | \$0.032 | \$0.65 | \$0.65 |
| Nemotron 3.5 Lightning | \$0.05 | \$0.01 | \$0.35 | \$0.30 |
| Qwen3.6-35B-A3B | \$0.08 | \$0.016 | \$0.44 | \$0.44 |

Train covers forward and forward/backward tokens. Sampling bills uncached
prefill, cache-read, and generated output tokens separately. Interactive
checkpoint storage is \$0.05 per GB-month and is metered daily.

## Inference

| Model | Price per 1M input tokens | Price per 1M output tokens |
| - | - | - |
| Nemotron 3.5 Super VL | \$0.08 | \$0.45 |
| GLiDE | \$0.04 | \$0 |
| GLiNER-2.5-Decide | \$0.03 | \$0 |
| GLiNER 2.5 | \$0.03 | \$0 |
| GLiNER2 | \$0.03 | \$0 |
| GLiGuard LLM Guardrails | \$0.15 | \$0.15 |
| GLiNER2 Privacy Filter PII | \$0.03 | \$0 |
| GLiGuard PII Multi | \$0.15 | \$0.15 |

GLiDE responses report `usage.output_tokens` for their structured answers, but those output
tokens are priced at \$0; only input tokens are billed at the listed rate.

See the [Model Catalog](https://docs.fastino.ai/concepts/models.md) for pricing alongside each model ID.

Credit top-ups are available as you continue using Fastino, so you can keep your inference and training workflows running.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.