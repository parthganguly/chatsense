> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# GLiDE: a decision model for typed questions

> Learn what GLiDE is, when to use it, and where to start with typed decision questions.

GLiDE (Generalized Lightweight Decision Engine) is a [decision model](https://docs.fastino.ai/concepts/decision-models.md). It evaluates the application state you provide against one or more typed questions and returns structured answers, probabilities, and confidence across outcomes you define.

GLiDE costs **\$0.04 per 1 million input tokens**. Output tokens are **free (\$0)**.
See [Pricing](https://docs.fastino.ai/pricing.md) for the current inference rates.

## Why GLiDE

The same interface works for both routine classification and decisions involving arithmetic, code tracing, temporal logic, policy interpretation, or several related facts.

Unlike a generative model, GLiDE does not write an answer in free-form text. Your application defines the permitted outcomes and can act directly on the returned probability distribution and confidence.

## When to use GLiDE

| Use case | Example decision |
| - | - |
| Agent and tool routing | Select the next action while considering permissions and previous results |
| High-risk action control | Execute, sandbox, request approval, or block an operation |
| Incident response | Monitor, restart, roll back, isolate, or escalate |
| Contracts and policies | Apply cross-references, dates, thresholds, and exceptions |
| Model-output verification | Accept, reject, or request revision |
| Everyday classification | Route tickets, moderate content, or score urgency |

Use a generative model instead for open-ended writing, conversation, summarization, or code generation.

## Start building

> **[Call GLiDE](https://docs.fastino.ai/inference/systemone.md)**
>
> Authenticate and send a complete `POST /v1/systemone` request.

> **[Choose a primitive](https://docs.fastino.ai/concepts/glide-noul.md)**
>
> Start with Noul, Choice, or Score based on the answer shape your code needs.

> **[Capabilities and limits](https://docs.fastino.ai/concepts/glide-capabilities.md)**
>
> Review decision behavior, confidence, context limits, and unsupported shapes.

> **[GLiDE guides](https://docs.fastino.ai/guides/glide-routing.md)**
>
> Apply GLiDE to classification, routing, scoring, policy gates, and reranking.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.