> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Fastino API authentication: generate and use API keys

> Authenticate Fastino API requests with the X-API-Key header or a Bearer token, then create, rotate, and revoke API keys in the Fastino dashboard settings.

Most Fastino API operations require your API key. Explicitly public catalog routes such as
`GET /v1/models` can be called without one. Authenticated operations use a simple header-based
scheme-no OAuth flow or token exchange is required. Your key identifies you and determines
which resources and rate limits apply to your requests.

## Getting an API key

1. Log in at [Fastino](https://agent.fastino.ai).
2. Go to **Settings** → **API Keys**.
3. Click **Create key**, give it a name, and copy the value shown.

Store your key in an environment variable (for example `FASTINO_API_KEY`) rather than hard-coding it in source files.

New Fastino keys start with `fast_sk_`. Legacy `pio_sk_` keys are retired; create a
replacement in the dashboard before calling the Fastino API.

## Passing your API key

Include your key in the `X-API-Key` header on native Fastino requests:

```bash cURL theme={null}
curl https://api.fastino.ai/v1/models \
  -H "X-API-Key: $FASTINO_API_KEY"
```

OpenAI- and Anthropic-compatible SDKs conventionally send the same key as a Bearer token. Set their `api_key` option to `$FASTINO_API_KEY`; the SDK adds `Authorization: Bearer ...` for you.

## Managing keys

Create, rotate, and revoke keys from **Settings → API Keys** in the Fastino dashboard. The public API does not expose API-key management operations.

### Rotation checklist

1. Create the replacement key and copy it immediately.
2. Update each service through its secret manager or `FASTINO_API_KEY` environment variable.
3. Verify requests succeed with the replacement.
4. Revoke the old key in the dashboard. Revocation is immediate and irreversible.

## Error responses

| Status | Meaning |
| - | - |
| `401 Unauthorized` | The key is missing, malformed, expired, or revoked. |
| `402 Payment Required` | The account has insufficient credits. Visit **Settings → Billing**. |

> [!WARNING]
>
> Treat API keys as secrets. Never place them in source code, client-side applications, URLs, logs, documentation examples, or support messages.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.