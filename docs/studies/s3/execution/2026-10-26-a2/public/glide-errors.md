> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Fastino API error codes and response body shapes

> Every 4xx and 5xx status code the Fastino API returns, the JSON body shape for each family, and steps to resolve billing, rate-limit, and validation errors.

The Fastino API uses standard HTTP status codes to communicate the outcome of every request. Codes in the `2xx` range indicate success. Codes in the `4xx` range indicate a problem with your request that you can fix. Codes in the `5xx` range indicate a server-side issue.

## Error response format

Most synchronous API errors use a shared nested `error` envelope:

```json theme={null}
{
  "error": {
    "message": "...",
    "type": "invalid_request_error",
    "param": null,
    "code": "..."
  }
}
```

Validation failures use the same envelope and add an `errors` array inside `error`. Each item identifies the invalid field with `location` and `raw_location` and explains the failure in `message`.

Some endpoint families intentionally use different shapes:

* **Billing denials** (`402`, some `403`s) return `{"code", "message", "resolution_url"}` instead of the nested envelope - see [402](#402-payment-required) and [403](#403-forbidden) below.
* **Warm-up responses** (`425`) include a `Retry-After` header. OpenAI-shaped bodies also carry `code: "model_warming"` - see [425](#425-too-early) below.
* **Rate-limit responses** (`429`) add top-level `code` and `scope` fields alongside `detail`, plus `X-RateLimit-Scope` and `X-RateLimit-Code` headers - see [429](#429-too-many-requests) below.
* **Unhandled server errors** (`500`) return `{"error", "message"}` rather than the nested envelope.
* Requests to `/v1/messages` that carry an `anthropic-version` header receive an Anthropic-shaped `{"type": "error", "error": {"type", "message"}}` envelope.

### Interactive future failures

An HTTP `4xx` means that the server rejected an interactive call before
queueing it. A successful queueing response returns a `future_id`. Poll
that future until `completed`, `failed`, or `cancelled`. A queued future
with `status: "failed"` can include `error.message`; treat `error.category` as
an opaque string rather than a retry rule.

## Status codes

### 400 - Bad Request

The request itself is malformed - invalid JSON, or a query/path parameter of the wrong type. Inference endpoints also return `400` when an input passes schema validation but cannot be served, such as a GLiDE prompt longer than the context window or an image outside the [GLiDE image limits](https://docs.fastino.ai/inference/systemone.md#image-input).

**How to fix:** Confirm your request body is valid JSON and that query/path parameters match the types documented in the endpoint reference. For an inference input, read `error.message` and correct the input it names.

#### GLiDE image errors

`POST /v1/systemone` returns these `400` responses for an image in `state`. Each one uses the nested envelope with `"type": "invalid_request_error"` and `"code": null`, so match on `error.message`:

```json theme={null}
{
  "error": {
    "message": "Image data URL exceeds maximum encoded size.",
    "type": "invalid_request_error",
    "param": null,
    "code": null
  }
}
```

| `error.message` | Cause | How to fix |
| - | - | - |
| `too many images (5 > 4)` | `state` holds more than four `image_url` parts | Send at most four images per request |
| `Image data URL exceeds maximum encoded size.` | The base64 in a data URL is longer than 5 MiB, so the file is over 3,932,160 bytes (3.75 MiB) | Resize or recompress the image. About 1 megapixel, such as 1280×800, is enough |
| `Unsupported image media type 'image/bmp'. Allowed: image/gif, image/jpeg, image/png, image/webp.` | The data URL declares a media type other than JPEG, PNG, GIF, or WebP | Convert the image to one of the four formats |
| `Image data URL declares 'image/jpeg' but content looks like 'image/png'.` | The declared media type does not match the image bytes | Declare the media type that matches the file |
| `invalid image` | The bytes are not a readable JPEG, PNG, GIF, or WebP image, or width × height exceeds 25,000,000 pixels | Send a valid image of at most 25,000,000 pixels |
| `Invalid base64 in image data URL.` | The data after `base64,` is not valid base64 | Encode the file with standard base64 and remove spaces |
| `Invalid data URL for image content.` | The URL starts with `data:` but is not `data:image/<type>;base64,<data>` | Use the `data:<media type>;base64,<data>` form |
| `Image URL is not allowed (HTTPS required).` | The image URL is not HTTPS, or its host resolves to a private or internal address | Use a public HTTPS URL, or send a data URL |
| `Image URL redirects are not allowed; provide the final HTTPS URL.` | The image host answered with a redirect | Send the final URL after redirects |
| `Image URL GET request failed with status 403.` | The image host refused Fastino's download with a `4xx` status, shown in the message | Make the image publicly downloadable, or send a data URL |
| `could not fetch image URL` | The image host returned a `5xx` status, could not be reached, or did not finish within 30 seconds | Retry later, or send a data URL |
| `Image URL Content-Length exceeds maximum allowed size.` or `Downloaded image exceeds maximum allowed size.` | The downloaded image is larger than 3,932,160 bytes | Host a smaller copy, or send a resized data URL |
| `Could not determine image type from URL response.` | The downloaded bytes are not a JPEG, PNG, GIF, or WebP image, and the response has no supported image `Content-Type` | Link directly to the image file, not to a page that shows it |
| `Image Content-Type 'image/png' does not match detected 'image/jpeg'.` | The host's `Content-Type` header names a different format from the downloaded bytes | Fix the host's `Content-Type`, or send a data URL |
| `unsupported image part` | A `state` item has `type` `image` or `input_image` | Send images as `{"type": "image_url", "image_url": {"url": "..."}}` |

An `image_url` part without `image_url.url` fails schema validation instead, and returns [`422`](#422-unprocessable-entity) with `image_url parts require an image_url.url.`

***

### 401 - Unauthorized

Your request did not include a valid API key, the key has been revoked, or your account has been blocked for billing or fraud review.

**How to fix:** Verify that the `X-API-Key` header is present and contains your current key. If you recently revoked the key, generate a new one at **Settings** → **API Keys**. If your account is blocked, contact [support@fastino.ai](mailto:support@fastino.ai). See [Authentication](https://docs.fastino.ai/authentication.md) for setup instructions.

***

### 402 - Payment Required

> [!WARNING]
>
> A `402` response means your account is out of spendable credits or a billing action is required before inference can run. All API calls will fail until you add credits or upgrade your plan. Visit **Settings** → **Billing** or see [Plans & Pricing](https://docs.fastino.ai/pricing.md) to resolve this.

Your account does not have sufficient credits to complete the request. The response body's `code` field tells you which case applies - most commonly `out_of_credits` (your included credits are exhausted and there's no spendable paid balance) or `funding_required` (your account has never been funded). `spend_limit_reached` means a daily or monthly spend limit on your team or project was reached, and `billing_required` means a billing action is needed before inference can run.

**How to fix:** Log in to [Fastino](https://agent.fastino.ai), go to **Settings** → **Billing**, and top up your balance or upgrade your plan. For `spend_limit_reached`, raise the limit in billing settings or wait for the window to reset. See [Plans & Pricing](https://docs.fastino.ai/pricing.md) for plan and credit details.

***

### 403 - Forbidden

Your team has reached its plan's maximum monthly overage spend (`code: "credit_ceiling_reached"`), or your account needs a verified payment method before running inference (`code: "card_required"`).

**How to fix:** For a spend-ceiling denial, upgrade your plan at **Settings** → **Billing** to raise the ceiling. For a card-verification denial, add a valid payment method. Both responses include a `resolution_url` pointing directly at the page to resolve them.

***

### 404 - Not Found

The resource you requested does not exist. This can happen when a dataset name, training job ID, evaluation ID, project ID, or model ID is misspelled or has been deleted.

**How to fix:** Double-check the ID or name in the request path or body. Use the corresponding `GET` list endpoint (for example `GET /v1/training/jobs`, `GET /v1/base-models`) to confirm the resource exists.

***

### 409 - Conflict

The model exists in the catalog but isn't currently servable - for example, a training-only base model requested for direct inference, or an on-demand deployment that hasn't finished provisioning after a training job completed.

**How to fix:** Check `supports_inference` and `supports_on_demand_inference` for the model via `GET /v1/base-models`, or retry after the deployment finishes provisioning.

***

### 413 - Payload Too Large

The request body - typically a file upload for an evaluation or dataset - exceeds the endpoint's size limit.

**How to fix:** Check the endpoint reference for its upload size limit and split or compress the payload before retrying.

***

### 422 - Unprocessable Entity

The request body failed validation. A required field is missing, a field has the wrong type, or a value is outside the accepted range.

**How to fix:** Review `error.message` and the entries in `error.errors` for the specific field that failed. Common causes include:

* Omitting `model` or `type` from `POST /v1/training/jobs`
* Sending fewer than 1 or more than 1,000 strings in the `inputs` array for label-existing endpoints

```json theme={null}
{
  "error": {
    "message": "For 'models', 'query.limit' is invalid: Input should be greater than or equal to 1.",
    "type": "invalid_request_error",
    "param": null,
    "code": null,
    "errors": [
      {
        "type": "greater_than_equal",
        "location": "query.limit",
        "raw_location": ["query", "limit"],
        "message": "'query.limit' is invalid: Input should be greater than or equal to 1"
      }
    ]
  }
}
```

***

### 425 - Too Early

The model is temporarily warming up and isn't ready to serve inference yet. This is expected on the first request after a period without traffic or against a freshly provisioned on-demand deployment, and it does not mean your request is wrong. Warm-up time depends on the model, so a request can return `425` more than once before it succeeds.

Most endpoints return an OpenAI-shaped body with `code: "model_warming"`:

```json theme={null}
{
  "error": {
    "message": "...",
    "type": "invalid_request_error",
    "param": null,
    "code": "model_warming"
  }
}
```

Requests to `/v1/messages` that carry an `anthropic-version` header receive an Anthropic-shaped body instead, without a `code` field:

```json theme={null}
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "..."
  }
}
```

| Header | Value |
| - | - |
| `Retry-After` | Seconds to wait before the next attempt. It is a retry delay, not a promise that the model will be ready. |
| `x-should-retry` | `true` on OpenAI-shaped responses, so the OpenAI SDKs retry automatically. `false` on Anthropic-shaped responses, so the Anthropic SDKs do not retry; handle these yourself. |

**How to fix:** Wait `Retry-After` seconds (30 if the header is missing) and send the same request again, with a bounded number of retries. Each example retries at most 5 times, sets a 300-second client timeout, and stops on any other non-2xx response. The same loop works for `/v1/systemone`; change the URL and request body.

```bash cURL theme={null}
for attempt in 0 1 2 3 4 5; do
  http_code=$(curl -sS --max-time 300 -o response.json -D headers.txt -w "%{http_code}" \
    https://api.fastino.ai/v1/chat/completions \
    -H "Authorization: Bearer $FASTINO_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "fastino/gliner2.5-multi-v1",
      "messages": [{ "role": "user", "content": "Apple announced the MacBook Pro at WWDC in Cupertino." }],
      "schema": { "entities": ["organization", "product"] }
    }')
  [ "$http_code" = "425" ] && [ "$attempt" -lt 5 ] || break
  delay=$(awk 'tolower($1) == "retry-after:" && $2 + 0 > 0 { print $2 + 0 }' headers.txt)
  sleep "${delay:-30}"
done

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
  cat response.json
else
  echo "Request failed with HTTP $http_code: $(cat response.json)" >&2
fi
```

```python Python theme={null}
import os
import time
import requests

MAX_RETRIES = 5

for attempt in range(MAX_RETRIES + 1):
    response = requests.post(
        "https://api.fastino.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {os.environ['FASTINO_API_KEY']}"},
        json={
            "model": "fastino/gliner2.5-multi-v1",
            "messages": [
                {"role": "user", "content": "Apple announced the MacBook Pro at WWDC in Cupertino."}
            ],
            "schema": {"entities": ["organization", "product"]},
        },
        timeout=300,
    )
    if response.status_code != 425 or attempt == MAX_RETRIES:
        break
    retry_after = response.headers.get("Retry-After", "")
    time.sleep(int(retry_after) if retry_after.isdigit() else 30)

if not 200 <= response.status_code < 300:
    raise RuntimeError(f"Request failed: {response.status_code} {response.text}")
print(response.json()["choices"][0]["message"]["content"])
```

```javascript JavaScript theme={null}
const MAX_RETRIES = 5;
let response;

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  response = await fetch("https://api.fastino.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FASTINO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "fastino/gliner2.5-multi-v1",
      messages: [{ role: "user", content: "Apple announced the MacBook Pro at WWDC in Cupertino." }],
      schema: { entities: ["organization", "product"] },
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (response.status !== 425 || attempt === MAX_RETRIES) break;
  const retryAfter = Number(response.headers.get("Retry-After"));
  await new Promise((resolve) => setTimeout(resolve, (retryAfter || 30) * 1000));
}

if (!response.ok) {
  throw new Error(`Request failed: ${response.status} ${await response.text()}`);
}
const completion = await response.json();
console.log(completion.choices[0].message.content);
```

With an SDK, see [Retries and model warm-up](https://docs.fastino.ai/troubleshooting/retries.md) for which responses to retry and how to back off.

***

### 429 - Too Many Requests

You have exceeded a request-rate limit for this endpoint. The response includes a `Retry-After` header, plus `X-RateLimit-Scope` and `X-RateLimit-Code` headers identifying which limit you hit - the JSON body carries matching `code` and `scope` fields alongside `detail`.

**How to fix:** Respect the `Retry-After` value and back off before retrying. See [Retries and model warm-up](https://docs.fastino.ai/troubleshooting/retries.md) for a retry pattern. Note that credit and overage denials return `402`/`403`, not `429`.

***

### 451 - Unavailable for Legal Reasons

The requested model isn't available to your account due to export-control or sanctions restrictions in your region.

**How to fix:** If you believe your access was incorrectly restricted, contact support.

***

### 500 - Internal Server Error

An unexpected error occurred on Fastino's servers. This is not caused by your request. The body uses `error` and `message` fields rather than `detail`:

```json theme={null}
{
  "error": "Internal server error",
  "message": "..."
}
```

**How to fix:** Wait a moment and retry. If the error persists, check [status.fastino.ai](https://status.fastino.ai) for live service status or contact support.

***

### 503 - Service Unavailable

A dependency the request needed - billing verification, or a provider's status/metrics endpoint - is temporarily unavailable.

**How to fix:** Wait a moment and retry. If the error persists, check [status.fastino.ai](https://status.fastino.ai) for live service status or contact support.

***

### 529 - Overloaded (Anthropic-compatible endpoint only)

`POST /v1/messages` mirrors Anthropic's own `overloaded_error` response when upstream Claude capacity is temporarily saturated.

**How to fix:** Retry with backoff, the same as you would for a `429` or `503`.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.