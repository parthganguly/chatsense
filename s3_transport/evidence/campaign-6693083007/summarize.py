"""Read-only report of the single live A3 state; never calls either provider."""
from collections import Counter
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
from s3_a3 import dispatcher as d
from s3_transport.postrun import validate_recorded_responses
STATE_ROOT = Path.home() / "Library/Application Support/ChatSense-S3-6693083007"

private = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("frozen", d.PACKET/"controls/offline_contract.py")
frozen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(frozen)
paths = d.paths(STATE_ROOT)
audit = d.inspect(STATE_ROOT)
assert not audit["errors"] and audit["complete"], audit["errors"]
accepted = validate_recorded_responses(STATE_ROOT)
ledger = [json.loads(line) for line in paths["ledger"].read_bytes().splitlines()]
start,stop=ledger[0],ledger[-1]
assert stop["type"]=="STOP"
source = d.load_frozen()
plan = {r["id"]:r for r in source["rows"]}
rows,observed,failed_controls = {},[],[]
results = {r["id"]:r for r in ledger if r["type"]=="RESULT"}
for id,row in plan.items():
    if id not in results: continue
    r=results[id]
    record={k:r[k] for k in ("id","outcome","utc","http_status","response_sha256","safe_headers","usage","provisional_input_nano_usd","body_model_class","response_bytes") if k in r}
    record.update({k:row[k] for k in ("provider","card","condition","body_sha256","decoded_stimulus_sha256")})
    observed.append(record)
    if r["outcome"]!="VALID": continue
    raw=(paths["receipts"]/r["receipt"]).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==r["response_sha256"]
    obj=accepted[id]
    p,c,card=row["provider"],row["condition"],row["card"]
    pair=next(x for x in frozen.PLAN["pairs"] if x["pair"]==row["pair"])
    body,_,mapping=frozen.render(pair,p)
    cap={"X-Fastino-Data-Retention":r["safe_headers"].get("x-fastino-data-retention"),
         "X-Fastino-Served-Model":r["safe_headers"].get("x-fastino-served-model")}
    assert mapping == row["canonical_to_wire"]
    canonical={q:{opt:obj["answers"][q]["probabilities"][wire] for opt,wire in opts.items()} for q,opts in mapping.items()}
    rows[p,c,card]=canonical
    record.update(reported_model=obj["model"],canonical_probabilities=canonical,
                  selected_canonical={q:next(opt for opt,wire in opts.items() if wire==obj["answers"][q]["choice"]) for q,opts in mapping.items()})
    if c in ("U","T"):
        for q in ("q02","q03","q07"):
            correct=canonical[q][frozen.KEY[card][q]["correct"]]
            if correct < .80:failed_controls.append({"id":id,"question":q,"p_correct":correct})
distances=[]
for p,c,card in rows:
    if c!="U":continue
    for other in ("T","R","W","O"):
        if (p,other,card) in rows:
            distances.append({"provider":p,"card":card,"contrast":"U-"+other,
                              "tv":{q:frozen.tv(a,rows[p,other,card][q]) for q,a in rows[p,c,card].items()}})
cross=[]
for p,c,card in rows:
    if p=="jev" and ("glide",c,card) in rows:
        cross.append({"card":card,"condition":c,"tv":{q:frozen.tv(a,rows["glide",c,card][q]) for q,a in rows[p,c,card].items()}})
settled = paths["run_dir"]/"first-pair-settlement.json"
summary={"authorization":"https://github.com/parthganguly/chatsense/issues/38#issuecomment-6693083007",
         "protocol_sha":"7ed874b7a3963e560d399b7c0046f5625a2e0757","a3_sha":"188fff410e35dfaaf9961b6f7cbe12bf6d20fba3",
         "source_sha":"91f7bd485803e9b540076fc2137c6349f086f8cb",
         "model_amendment_sha":"df8ba8f8a806fb6f2cbe02f8f64b63a25de9a8ce",
         "ledger_sha256":hashlib.sha256(paths["ledger"].read_bytes()).hexdigest(),
         "start_utc":start["utc"],"stop_utc":stop["utc"],"stop_reason":stop["reason"],"failure":stop.get("failure"),
         "counts":audit["counts"],
         "provider_counts":{p:{"attempted":sum(x["provider"]==p for x in observed),
                               "valid":sum(x["provider"]==p and x["outcome"]=="VALID" for x in observed)} for p in ("jev","glide")},
         "token_usage_valid_responses":{p:{field:sum(x["usage"][field] for x in observed if x["provider"]==p and x["outcome"]=="VALID") for field in ("input_tokens","output_tokens")} for p in ("jev","glide")},"http_post_writes":dict(Counter(json.loads(x)["provider"] for x in (private/"http-attempts.jsonl").read_text().splitlines())),
         "canonical_frozen_verdict":frozen.classify(rows,technical_ok=stop["reason"]=="PLAN_COMPLETE"),
         "failed_factual_controls_so_far":failed_controls,"estimated_input_nano_usd_valid_responses":{
             p:sum(x["provisional_input_nano_usd"] for x in observed if x["provider"]==p and x["outcome"]=="VALID") for p in ("jev","glide")},
         "verified_settled_debits":json.loads(settled.read_text()) if settled.exists() else {},
         "first_pair_estimates":json.loads((paths["run_dir"]/"first-pair-estimates.json").read_text()) if (paths["run_dir"]/"first-pair-estimates.json").exists() else {},
         "available_aggregate_account_observations":{stage:json.loads((private/("fastino-"+stage+".json")).read_text()) for stage in ("baseline","first-pair","final") if (private/("fastino-"+stage+".json")).exists()},
         "attempts":observed,"not_attempted":stop["not_attempted"],"within_provider_contrasts":distances,
         "between_provider_contrasts":cross}
summary["cost_estimate_usd_all_attempts"] = {
    p: (str(Decimal(summary["estimated_input_nano_usd_valid_responses"][p])/Decimal(10**9))
        if summary["provider_counts"][p]["attempted"]==summary["provider_counts"][p]["valid"] else None)
    for p in ("jev","glide")}
summary["cost_estimate_usd_all_attempts"]["combined"] = None if any(
    v is None for v in summary["cost_estimate_usd_all_attempts"].values()) else str(sum(
    Decimal(v) for v in summary["cost_estimate_usd_all_attempts"].values()))
summary["verified_settled_debit_usd"] = {"jev":None,"glide":None,"combined":None}
summary["first_pair_checkpoint"] = "NOT_REACHED_PAIR_INVALID" if summary["counts"]["valid"]<2 else "SEE_RECEIPTS"
observations = summary["available_aggregate_account_observations"]
if all("balance_usd" in observations.get(stage,{}) for stage in ("baseline","final")):
    summary["fastino_aggregate_wallet_decrease_usd"] = str(
        Decimal(observations["baseline"]["balance_usd"])-Decimal(observations["final"]["balance_usd"]))
summary["aggregate_wallet_decrease_is_attributable_settled_debit"] = False
(private/"results.json").write_text(json.dumps(summary,indent=2,allow_nan=False)+"\n")
print(json.dumps({k:summary[k] for k in ("counts","stop_reason","failure","canonical_frozen_verdict","estimated_input_nano_usd_valid_responses")}))
