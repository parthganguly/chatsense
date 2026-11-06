# Proposed GLiDE response-model amendment

**Owner approval pending.** The live default accepts body model `glide`. The draft code supports testing the proposed finite set `glide`, `glide_v2` and stops if the body label changes during a run. Enabling `glide_v2` would amend the provider-validation rule in the frozen S3 contract. A future paid campaign requires its own authorization.

| Identity field | Evidence and proposed requirement |
|---|---|
| Request model | Continue requesting exactly `fastino/GLiDE`. |
| Response-body model | Permit exactly `glide` or `glide_v2`, case-sensitive, with the first accepted GLiDE label fixed for that campaign. |
| Canonical served header | Continue requiring `X-Fastino-Served-Model: fastino/GLiDE` and stable canonical identity. |
| Retention header | Continue requiring `not-stored` or `zero`. |
| Underlying weights | These service labels do not identify immutable weights. The current public catalog describes the canonical service as GLiDE v2.3, NVFP4 on B200. |

Fastino's hosted reference documents `glide`. Its hosted support-ticket cookbook requests `fastino/GLiDE` and shows a measured `glide_v2` response from `api.fastino.ai`. Together they support the finite set above. The cookbook example omits `token_usage`, which the OpenAPI schema requires. This proposal changes only body-label compatibility; all eight typed answers, probability/choice checks, usage checks, retention checks, model request, stimuli, mappings and call order continue to apply. [Hosted reference](https://docs.fastino.ai/inference/systemone) · [Measured hosted example](https://docs.fastino.ai/cookbooks/glide-support-ticket-triage) · [OpenAPI](https://docs.fastino.ai/openapi.json)

Neither source establishes `fastino/GLiDE` as a body label. The local/open-weight example `glide-v1.2` and other spellings are excluded. The public family announcement and catalog describe releases or service configuration, without binding the November 6 response to immutable weights. [Family announcement](https://fastino.ai/blog/glide-decision-model-family) · [Current catalog](https://api.fastino.ai/v1/base-models)

**Historical disposition.** The November 6 response body was discarded after its model check failed. The existing request-time history query returned zero records, consistent with the documented `store:false` behavior. Its exact body label and answer vectors remain unknown. This amendment cannot retroactively validate that response. Both consumed campaigns remain separate and inconclusive.

The new bounded diagnostic retains only the public labels `glide` or `glide_v2`, or a fixed `other_or_missing` category. Arbitrary response strings and rejected bodies are excluded from this diagnostic. The prepared validator also refuses a transition between the two permitted labels within one campaign. [Evidence projection](evidence/model-contract-20261106.json)

After approval, post-run raw-response validation must apply the same approved finite-label rule before the unchanged frozen canonical scoring. Preserve actual provider labels; do not rewrite responses to satisfy the original literal-label validator.
