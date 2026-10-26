> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Model catalog

> Compare models available for inference and training, including model IDs, specifications, pricing, and training workflows.

## Trainable models

Call `GET /v1/base-models?supports_training=true` with your API key for the
current trainable models and their capabilities. The endpoint is the source of
truth for availability. Without a key it lists only encoders, because decoders
appear only for teams that can train them.

### Encoders

Train these with a managed [`config` job](https://docs.fastino.ai/api-reference/training-jobs/create)
and an uploaded dataset:

| Model | Methods | Training price |
| - | - | - |
| **GLiNER-2.5-Decide** `fastino/GLiNER-2.5-Decide` | `full`, `lora` | \$0.13 / GPU-minute \$7.90 / GPU-hour |
| **GLiGuard LLM Guardrails** `fastino/gliguard-LLMGuardrails-300M` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER2 Base** `fastino/gliner2-base-v1` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER2 Large** `fastino/gliner2-large-v1` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER2 Multilingual Large** `fastino/gliner2-multi-large-v1` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER2 Multilingual** `fastino/gliner2-multi-v1` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER2 Privacy Filter PII** `fastino/gliner2-privacy-filter-PII-multi` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER 2.5 Base** `fastino/gliner2.5-base-v1` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |
| **GLiNER 2.5 Multilingual** `fastino/gliner2.5-multi-v1` | `full`, `lora` | \$0.07 / GPU-minute \$4.20 / GPU-hour |

### Decoders

Train these step by step with an application-controlled
[`interactive` job](https://docs.fastino.ai/api-reference/training-jobs/interactive/create-model):

Interactive-training context limits are operation-specific capabilities. They
can differ from a base model's catalog `context_window` and from an inference
endpoint's request limit.

| Model | Callable ID | Prefill, not cached / 1M | Prefill, cached / 1M | Sample / 1M | Train / 1M |
| - | - | - | - | - | - |
| Nemotron 3.5 Super VL | `nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-NVFP4` | \$0.16 | \$0.032 | \$0.65 | \$0.65 |
| Nemotron 3.5 Lightning | `nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16` | \$0.05 | \$0.01 | \$0.35 | \$0.30 |
| Qwen3.6-35B-A3B | `Qwen/Qwen3.6-35B-A3B` | \$0.08 | \$0.016 | \$0.44 | \$0.44 |

Nemotron 3.5 Super VL is the product display name; use the callable IDs shown
in the table in training requests. Interactive checkpoint storage is \$0.05
per GB-month.

A decoder's sampler checkpoint downloads as a standard Hugging Face PEFT
adapter for the public base model, so you can load it with
`PeftModel.from_pretrained`. See
[Load a decoder adapter](https://docs.fastino.ai/api-reference/training-jobs/download-checkpoint.md#load-a-decoder-adapter).

See the [Training API](https://docs.fastino.ai/training.md) to choose a workflow and start a job.

## Inference models

Call `GET /v1/base-models?supports_inference=true` for current inference
availability and capabilities.

### Nemotron 3.5 Super VL

This model ID supports both inference and interactive training.

| Model ID | Model | Parameters | Context Window | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B-NVFP4` | Nemotron 3.5 Super VL | 120B total / 12B active | 262,144 tokens | \$0.08 | \$0.45 |

### GLiDE

The limit below is the `/v1/systemone` rendered-prompt limit, not a claim about
the underlying model's catalog context window.

| Model ID | Model | Parameters | SystemOne rendered-prompt limit | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `fastino/GLiDE` | GLiDE | 27B | 65,536 tokens | \$0.04 | \$0 |

### GLiNER-2.5-Decide

| Model ID | Model | Parameters | Context Window | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `fastino/GLiNER-2.5-Decide` | GLiNER-2.5-Decide | 340M | 8,192 tokens | \$0.03 | \$0 |

### GLiNER 2.5

| Model ID | Model | Parameters | Context Window | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `fastino/gliner2.5-base-v1` | GLiNER 2.5 Base | 194M | 4,096 tokens | \$0.03 | \$0 |
| `fastino/gliner2.5-multi-v1` | GLiNER 2.5 Multilingual | 287M | 4,096 tokens | \$0.03 | \$0 |

### GLiNER2

| Model ID | Model | Parameters | Context Window | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `fastino/gliner2-base-v1` | GLiNER2 Base | 205M | 2,048 tokens | \$0.03 | \$0 |
| `fastino/gliner2-large-v1` | GLiNER2 Large | 340M | 8,192 tokens | \$0.03 | \$0 |
| `fastino/gliner2-multi-v1` | GLiNER2 Multilingual | \~205M | 8,192 tokens | \$0.03 | \$0 |
| `fastino/gliner2-multi-large-v1` | GLiNER2 Multilingual Large | Not publicly disclosed | 8,192 tokens | \$0.03 | \$0 |

### GLiGuard

| Model ID | Model | Parameters | Context Window | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `fastino/gliguard-LLMGuardrails-300M` | GLiGuard LLM Guardrails | 300M | 8,192 tokens | \$0.15 | \$0.15 |

### PII Models

| Model ID | Model | Parameters | Context Window | Input / 1M tokens | Output / 1M tokens |
| - | - | - | - | - | - |
| `fastino/gliner2-privacy-filter-PII-multi` | GLiNER2 Privacy Filter PII | 300M | 8,192 tokens | \$0.03 | \$0 |
| `fastino/gliguard-PII-multi` | GLiGuard PII Multilingual | 300M | 8,192 tokens | \$0.15 | \$0.15 |

Prices are per 1M tokens. See [Pricing](https://docs.fastino.ai/pricing.md) for training rates and credit
details.

## API model catalogs

> **[Inference models](https://docs.fastino.ai/api-reference/inference/models.md)**

> **[Trainable models](https://docs.fastino.ai/api-reference/training/base-models.md)**


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.