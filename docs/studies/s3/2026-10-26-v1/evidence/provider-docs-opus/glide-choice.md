> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fastino.ai/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use https://docs.fastino.ai/llms.txt to discover and navigate pages. Use https://docs.fastino.ai/llms-full.txt when you need the complete documentation corpus. Use https://docs.fastino.ai/openapi.json as the source of truth for customer-facing routes. For GLiDE decision inference, call POST https://api.fastino.ai/v1/systemone with model fastino/GLiDE. Create managed config jobs with POST /v1/training/jobs using base_model. For custom training loops, native JSON clients use the public operations under /v1/training/jobs and /v1/training/usage. Existing Tinker clients use tinker==0.32.0 with TINKER_BASE_URL=https://api.fastino.ai/v1/training/compat/tinker and TINKER_CREDENTIAL_CMD. Compatibility child routes are private and absent from OpenAPI. Auto Train is private access and has no public route; direct interested users to sales@fastino.ai. Do not infer undocumented routes. Read API keys from FASTINO_API_KEY and never embed credentials in code, logs, or reports.

# Choice

> Ask GLiDE to select one caller-defined option and return the full probability distribution.

A **Choice** question asks GLiDE to pick one option from a fixed, caller-defined set of 2 to 255 named options. The response includes the selected option, a confidence value, and a full probability distribution over every option you defined.

Use a Choice when the answer is one of several unordered categories: which team should handle a ticket, which category a product belongs to, which language a snippet is written in.

## Request

**type** `string` *required*

Always `"choice"`.

**instructions** `string | object` *required*

The question to evaluate, as a non-empty string or non-empty JSON object. An object is serialized to compact JSON text.

**criteria** `object` *required*

An object mapping 2 to 255 option keys to description strings, e.g. `{"billing": "Payment or charge disputes", "returns": "Refund or return requests"}`. A single option is invalid because it cannot represent a decision or meaningful confidence margin. Both the option names and their descriptions are sent to the model, so write descriptions that separate similar-sounding options from each other.

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
      }
    }
  }'
```

## Answer object

The matching entry inside `answers` is:

```json theme={null}
{
  "department": {
    "type": "choice",
    "choice": "returns",
    "confidence": 0.9992611288391886,
    "probabilities": {
      "billing": 0.00031500429476013744,
      "returns": 0.9995761331339488,
      "shipping": 0.00010886257129113499
    }
  }
}
```

* `choice` - the option with the highest probability.
* `probabilities` - the full distribution across every option you defined; keys match your `criteria` keys and sum to \~1.
* `confidence` - `top1 − top2`, the probability margin between the best and second-best option, from `0` (two options tied) to `1` (one option has \~all the probability mass). See [confidence and uncertainty](https://docs.fastino.ai/concepts/glide-capabilities.md#confidence-and-uncertainty) for how to act on it.

## Using the result

```python theme={null}
answer = response["answers"]["department"]

queue_map = {"billing": "billing-team", "returns": "returns-desk", "shipping": "logistics"}
target_queue = queue_map[answer["choice"]]

if answer["confidence"] < 0.5:
    notify("routing uncertain - runner-up may also apply")
```

## Ask every question you need in one call

Evaluate several Choice questions against the same `state` in a single request rather than one request per question - they're answered independently, so adding a question costs tokens but barely changes latency. A support-triage call might ask `department`, `urgency`, and `tone` together instead of three round trips; your code can act on `department` and ignore the rest until it needs them. See [Combining multiple questions](https://docs.fastino.ai/inference/systemone.md#combining-multiple-questions) for a worked example.

Give the model the full list of real options rather than a shortlist - a Choice question accepts 2 to 255 options, and each one costs only a few tokens. Add an `other` or `none of the above` option when the input might not cover every case, so GLiDE has somewhere to put the probability mass instead of forcing a bad match onto one of your named options.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.