> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Call GLiDE

> Authenticate, send a GLiDE decision request, and handle probabilities and confidence.

```text theme={null}
POST https://api.fastino.ai/v1/systemone
```

This is the inference endpoint for **GLiDE**. Send a `state` and one or more named, typed
`questions`; read structured decisions from `answers`. `state` may be empty when the
question contains all the context. GLiDE does not use
`/v1/chat/completions`, `messages`, or a GLiNER `schema`.

GLiDE costs **\$0.04 per 1 million input tokens**. Output tokens are **free (\$0)**.
See [Pricing](https://docs.fastino.ai/pricing.md) for the current inference rates.

> **[View the API contract](https://docs.fastino.ai/api-reference/inference/systemone.md)**
>
> Inspect the exhaustive request and response schema for POST /v1/systemone.

> **[GLiDE cookbooks](https://docs.fastino.ai/cookbooks/overview.md)**
>
> Tested end-to-end requests for ticket triage, agent action gates, and prompt injection screening.

## Set up your API key

1. **Create a [Fastino](https://agent.fastino.ai/) account**
2. **Get your API key** from [Settings](https://agent.fastino.ai/api-keys)

Set your key as an environment variable so the examples below work as-is:

```bash macOS/Linux theme={null}
export FASTINO_API_KEY="your_api_key_here"
```

```powershell Windows theme={null}
setx FASTINO_API_KEY "your_api_key_here"
```

## Choose a question type

Every question is single-label and returns probabilities. Choose the primitive from the
answer shape your code needs:

| Primitive | Use when | `criteria` shape | Primary result |
| - | - | - | - |
| [Noul](https://docs.fastino.ai/concepts/glide-noul.md) | The answer is yes or no | Optional `{"true": "...", "false": "..."}`; defaults to Yes/No | `noul`, the probability of true |
| [Choice](https://docs.fastino.ai/concepts/glide-choice.md) | Exactly one unordered option should win | Object mapping option keys to descriptions | `choice` plus `probabilities` |
| [Score](https://docs.fastino.ai/concepts/glide-score.md) | The answer belongs on an ordered scale | Ordered array of level descriptions | `score`, `expected_level`, and `probabilities` |

There is no multi-label primitive. Ask multiple independently named questions in one request
when you need several judgments about the same state.

## Request

**model** `string` *required*

Use `fastino/GLiDE`. Omitting it returns `422 'model' must be provided`. The response echoes
the engine name as `glide`.

**state** `string | object | array` *required*

The situation to evaluate. Use a string for one passage, an object for labeled fields, or
an array for an ordered sequence of messages or records. An empty string, object, or array
is allowed when the question contains all the context.

**questions** `object` *required*

A non-empty object keyed by names you choose. Each value must contain `type` and
`instructions`; Choice and Score also require `criteria`. The same keys appear under
`answers` in the response. See [Noul](https://docs.fastino.ai/concepts/glide-noul.md), [Choice](https://docs.fastino.ai/concepts/glide-choice.md),
and [Score](https://docs.fastino.ai/concepts/glide-score.md) for each type's full request and response shape.

**store** `boolean` (default: true)

Whether Fastino keeps this request's input and output. Set `false` to keep neither. See
[Keep a request out of storage](#keep-a-request-out-of-storage).

### State shapes

`state` is the material every question is evaluated against - think of it as what you'd hand a panel of experts before asking them to make a judgment.

| Shape | Useful for | Example |
| - | - | - |
| String | A single message, article, or passage | `"My card was charged twice."` |
| Object | Named fields, related records, or app state | `{"message": "My card was charged twice.", "order_id": "A-104"}` |
| Array | A sequence of messages or records | `["Hi", "My order number is A-104.", "My card was charged twice."]` |

Use an object when the decision depends on comparing several named parts (a ticket plus the policy it's evaluated against, for example) - it keeps each part labeled and its relationships clear. A plain string is enough when the case is a single self-contained passage. All questions in a request see the same `state` and are evaluated independently against it.

### Image input

An array can mix strings or text parts with up to four `image_url` parts. Each
image URL can be an HTTPS URL or a base64 data URL:

```json theme={null}
{
  "state": [
    {"type": "text", "text": "Does this receipt match order A-104?"},
    {
      "type": "image_url",
      "image_url": {"url": "https://example.com/receipt.png"}
    }
  ]
}
```

A data URL carries the image in the request itself, in the form
`data:<media type>;base64,<data>`:

```json theme={null}
{
  "state": [
    {"type": "text", "text": "Does this receipt match order A-104?"},
    {
      "type": "image_url",
      "image_url": {"url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."}
    }
  ]
}
```

To build that request from a local file, encode the file and write the body to disk.
Send it with `-d @body.json`, because a multi-megabyte image can be too long for a
command-line argument:

```bash theme={null}
jq -n --rawfile image <(base64 < receipt.jpg | tr -d '\n') '{
  model: "fastino/GLiDE",
  state: [
    {type: "text", text: "Does this receipt match order A-104?"},
    {type: "image_url", image_url: {url: ("data:image/jpeg;base64," + $image)}}
  ],
  questions: {
    matches: {type: "noul", instructions: "Does the receipt match the order?"}
  }
}' > body.json

curl --max-time 300 -s https://api.fastino.ai/v1/systemone \
  -H "X-API-Key: $FASTINO_API_KEY" \
  -H "Content-Type: application/json" \
  -d @body.json
```

Each image must stay within these limits:

| Limit | Value |
| - | - |
| Images per request | 4 |
| Formats | JPEG, PNG, GIF, and WebP (`image/jpeg`, `image/png`, `image/gif`, `image/webp`) |
| File size | 3,932,160 bytes (3.75 MiB) per image, which is 5 MiB of base64 in a data URL |
| Pixels | Width × height of at most 25,000,000 per image |
| Image URLs | HTTPS only, on a public host, with no redirects. The download has the same 3.75 MiB limit |
| Load time | 30 seconds to download and check every image in the request |

* The size limit counts the base64 after the comma, not the `data:` prefix.
* The size limit applies to bytes, not pixels. Embedded metadata and padding count, so
  an 800×600 image padded to 5 MiB is refused.
* Fastino reads each image's bytes and checks them against the declared media type. A
  PNG sent as `data:image/jpeg` is refused.
* Fastino downloads URL images itself. The host must answer `200` without a redirect,
  and some hosts refuse automated downloads. If a URL fails, send the image as a data
  URL.

GLiDE resizes every image to between 65,536 and 1,048,576 pixels (about 1 megapixel) before
it reads the image. Each image therefore adds between 64 and 1,024 input tokens. Image
tokens count once per question, because GLiDE evaluates each question separately against
the whole `state`. For example, the same 2048×1280 photo used 1,087 input tokens with one
question and 4,302 with four. Image tokens also count toward each question's
65,536-token prompt limit.

> [!TIP]
>
> Resize images to about 1 megapixel, such as 1280×800, before you send them. Larger
> images cost the same tokens and take longer to upload. In Fastino's tests, a 5388×3368
> photo and its 1280×800 copy used the same tokens and returned the same answers.

See [GLiDE image errors](https://docs.fastino.ai/troubleshooting/errors.md#glide-image-errors) for each image error
message and how to fix it.

### Complete request

```bash theme={null}
curl --max-time 300 -s https://api.fastino.ai/v1/systemone \
  -H "X-API-Key: $FASTINO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fastino/GLiDE",
    "state": "Refund request: the receipt is attached, the purchase was 10 days ago, and refunds are allowed within 30 days.",
    "questions": {
      "refund_allowed": {
        "type": "noul",
        "instructions": "Does this request qualify for a refund?",
        "criteria": { "true": "Qualifies", "false": "Does not qualify" }
      }
    }
  }'
```

## Response

```json theme={null}
{
  "model": "glide",
  "answers": {
    "refund_allowed": {
      "type": "noul",
      "noul": 0.99767683794902,
      "confidence": 0.9953536758980399
    }
  },
  "usage": { "input_tokens": 89, "output_tokens": 1 },
  "token_usage": 90
}
```

`answers` uses the question keys from your request. For this Noul:

* `noul` is the probability that the `true` criterion holds. It is not a boolean.
* `confidence` is certainty about either outcome: `|2 × noul − 1|`.
* Tune action thresholds on representative data. Do not assume `0.5` is the right business
  threshold.

Choice and Score return different fields. See their primitive pages for exact response shapes
and integration examples.

## Keep a request out of storage

Add `"store": false` to the request body. Fastino then keeps neither the `state` and
`questions` you sent nor the `answers` it returned:

* No entry in your inference history.
* The payload stays out of Fastino's logs, error reports, and traces.
* The request is never used for platform training or for continuous adaptation of your task
  models, whatever your training opt-out says.

Fastino still records usage metadata for billing: model, token counts, latency, status, and
cost. The `X-Fastino-Data-Retention` response header reports what was applied:

| Value | Meaning |
| - | - |
| `stored` | The request is kept in your inference history (the default) |
| `not-stored` | You sent `store: false` |
| `zero` | Your team has Zero Data Retention enabled, which treats every request as `store: false` |

```bash theme={null}
curl --max-time 300 -s -D - https://api.fastino.ai/v1/systemone \
  -H "X-API-Key: $FASTINO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fastino/GLiDE",
    "state": "Refund request: the receipt is attached, the purchase was 10 days ago, and refunds are allowed within 30 days.",
    "questions": {
      "refund_allowed": {
        "type": "noul",
        "instructions": "Does this request qualify for a refund?",
        "criteria": { "true": "Qualifies", "false": "Does not qualify" }
      }
    },
    "store": false
  }'
```

## Combining multiple questions

Ask multiple questions of different types against the same `state` in a single call. All questions are evaluated together in one round trip.

```bash cURL theme={null}
curl -s https://api.fastino.ai/v1/systemone \
  -H "X-API-Key: $FASTINO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fastino/GLiDE",
    "state": "Refund request: the receipt is attached, the purchase was 10 days ago, and refunds are allowed within 30 days.",
    "questions": {
      "department": {
        "type": "choice",
        "instructions": "Which team should handle this request?",
        "criteria": {
          "billing": "Payment or charge disputes",
          "returns": "Refund or return requests",
          "shipping": "Delivery or shipping issues"
        }
      },
      "urgency": {
        "type": "score",
        "instructions": "How urgent is this request?",
        "criteria": [
          "low urgency, can wait",
          "medium urgency, handle soon",
          "high urgency, handle immediately"
        ]
      }
    }
  }'
```

Response:

```json theme={null}
{
  "model": "glide",
  "answers": {
    "department": {
      "type": "choice",
      "choice": "returns",
      "confidence": 0.9992611288391886,
      "probabilities": {
        "billing": 0.00031500429476013744,
        "returns": 0.9995761331339488,
        "shipping": 0.00010886257129113499
      }
    },
    "urgency": {
      "type": "score",
      "score": 0,
      "expected_level": 0.27621539375795195,
      "confidence": 0.4999999998141525,
      "probabilities": {
        "0": 0.7412615353520668,
        "1": 0.24126153553791435,
        "2": 0.017476929110018805
      },
      "legend": {
        "0": "low urgency, can wait",
        "1": "medium urgency, handle soon",
        "2": "high urgency, handle immediately"
      }
    }
  },
  "usage": { "input_tokens": 743, "output_tokens": 252 },
  "token_usage": 995
}
```

## Limits and unsupported shapes

* Each rendered question prompt (`state` plus that question) must fit within **65,536
  tokens**.
* Choice requires **2 to 255 options**; one option cannot represent a decision or meaningful
  confidence margin. Score accepts at most **255 levels**.
* `usage.input_tokens` sums the internal passes for all questions, so it can exceed 65,536
  even though every individual rendered prompt fits.
* `state` accepts up to **4 images** of at most **3.75 MiB** and **25,000,000 pixels** each,
  in JPEG, PNG, GIF, or WebP. See [Image input](#image-input).
* One request evaluates one shared `state`; put multiple questions under `questions`.
* `/v1/systemone` does not stream and does not accept a batch of independent states.
* GLiDE does not currently support fine-tuned deployment IDs.

See [confidence and uncertainty](https://docs.fastino.ai/concepts/glide-capabilities.md#confidence-and-uncertainty) for the confidence formulas and confidence-gated routing.

## Migrating from TypeSafe

TypeSafe's Jev and Fastino's GLiDE use the same System One structure of `state`, named
`questions`, and matching `answers`. Most requests transfer cleanly, but the integration is
not a drop-in replacement. Use this checklist to migrate safely:

| TypeSafe or Jev | Fastino GLiDE |
| - | - |
| `https://api.typesafe.ai/v1/systemone` | `https://api.fastino.ai/v1/systemone` |
| `TYPESAFE_API_KEY` | `FASTINO_API_KEY` |
| `Authorization: Bearer $TYPESAFE_API_KEY` | `X-API-Key: $FASTINO_API_KEY` |
| Request model `jev-latest` | Request model `fastino/GLiDE` |
| Jev model ID in the response | Response model `glide` |
| TypeSafe SDK client | Your HTTP client calling `/v1/systemone` |
| Retry `429` and `529` | Retry `425`, `429`, and `503` with bounded backoff |

**1. Keep the System One request structure**

Preserve `state`, question keys, and primitive types. `state` may be empty when the
question contains all the context. Each `instructions` value may be a non-empty string
or a non-empty JSON object; GLiDE serializes objects to compact JSON text. Convert
omitted, null, or array instructions into a string or object. Keep Choice criteria as an
object. Noul criteria are optional, but their `true` and `false` values must be strings.
Prefer an ordered array for Score criteria. Send only the documented request fields your
integration needs.
Unsupported top-level fields return `422`, so do not copy arbitrary TypeSafe client
options into the JSON body.

**2. Change the endpoint, credential, and model**

Point the request at Fastino, read `FASTINO_API_KEY`, send it with `X-API-Key`, and set
`model` to `fastino/GLiDE`. Fastino also accepts the Bearer header if retaining that
style makes a direct HTTP migration simpler. Expect `model: "glide"` in the response.

**3. Update Score response handling**

TypeSafe's `score` is a probability-weighted float. Its GLiDE equivalent is
`expected_level`. GLiDE's `score` is instead the integer index of the most probable level.
GLiDE returns Score legend descriptions as strings, so update consumers that expect
structured legend values. GLiDE also accepts criteria objects with numeric string keys,
such as `{"1": "low", "3": "medium", "5": "high"}`. The keys are sorted and discarded,
and the response is reindexed from `0` through `N-1`. Use an ordered array when the
original numeric values must not be mistaken for returned level indexes.

**4. Check level keys and retry behavior**

GLiDE returns Score `probabilities` and `legend` with string keys such as `"0"` and `"1"`.
TypeSafe's raw HTTP response does the same, but its Python SDK may expose integer keys.
Convert keys only if the application requires integer-keyed maps. Replace TypeSafe's
`529` retry handling with Fastino's `425` and `503` handling, and keep bounded backoff for
`429`. Honor `Retry-After` when present and apply the same retry budget to transport
failures.

**5. Revalidate decision thresholds**

Keep existing business actions intact during the port, then test GLiDE on representative
cases before deployment. Do not assume thresholds calibrated for Jev transfer unchanged
to a different model.

> [!WARNING]
>
> Do not map TypeSafe's floating-point `score` to GLiDE's `score`. Read
> `answers.&lt;key&gt;.expected_level` when existing code expects a weighted score. Read
> `answers.&lt;key&gt;.score` only when the code needs the single winning level index.

### Replace TypeSafe SDK usage

If the project uses a TypeSafe SDK:

1. Find `typesafe-sdk`, `@typesafe-ai/sdk`, `TypeSafeClient`, `AsyncTypeSafeClient`, and
   TypeSafe question constructors in manifests, imports, application code, and tests.
2. Replace SDK constructors and typed response access with the project's HTTP client and
   decoded JSON.
3. Remove TypeSafe packages and imports only after no references remain.

The endpoint, validation, retry, and Score rules above still apply.

## Errors

A first request to a cold model may return `425 model_warming` while it warms up; retry
after about 60 seconds.

| Status | Likely cause | Action |
| - | - | - |
| `400` | Prompt exceeds the context window, an image breaks an [image limit](#image-input), or another inference input is invalid | Shorten the state, fix the image as described in [GLiDE image errors](https://docs.fastino.ai/troubleshooting/errors.md#glide-image-errors), or correct the question |
| `401` | Missing, malformed, or invalid API key | Export a valid `fast_sk_...` key |
| `402` | Insufficient credits, funding required, or an owner-set daily/monthly spend limit | Add credits or adjust the spend limit |
| `403` | Payment method, card verification, credit ceiling, or account policy denial | Resolve the billing or account requirement |
| `404` | Unknown model or a model that only supports chat completions | Use `fastino/GLiDE` |
| `422` | A required field is missing, a value has the wrong shape, or an extra field was sent | Read and correct the field-level validation details |
| `425` | Deployment is warming | Retry after the indicated delay |
| `429` | Rate or capacity limit | Respect `Retry-After` and retry with backoff |
| `503` | Temporary provider or serving failure | Retry before treating it as terminal |

Use a read timeout of at least 300 seconds and bounded backoff for `425`, `429`, and `503`.
Do not retry `401`, `402`, `403`, `404`, or `422` without correcting the underlying problem.

## Continue learning

> **[GLiDE overview](https://docs.fastino.ai/concepts/glide.md)**
>
> Understand GLiDE, choose a primitive, and review model-specific guidance.

> **[Noul](https://docs.fastino.ai/concepts/glide-noul.md)**
>
> Integrate a yes/no probability.

> **[Choice](https://docs.fastino.ai/concepts/glide-choice.md)**
>
> Route to one named option.

> **[Score](https://docs.fastino.ai/concepts/glide-score.md)**
>
> Evaluate an ordered rubric.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.