> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# GLiDE decision inference

> Call GLiDE with state and typed questions and receive calibrated decision answers.

`POST /v1/systemone`

Call GLiDE with state and typed questions and receive calibrated decision answers.

> **[Follow the happy-path guide](https://docs.fastino.ai/inference/systemone.md)**
>
> Choose a primitive, make a complete GLiDE call, and interpret its probability.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.