"""Offline FAKE instrument test calculator. No participant data accepted.
Labels are supplied by reviewers, never inferred from language by this file.
Synthetic aggregate outcomes are not human study decisions.
"""
from statistics import median

CARDS = tuple("ABCDE")
OPEN = {"CLEAR_LIMIT", "ERROR", "AMBIGUOUS", "NOT_MENTIONED", "MISSING"}
DIRECT = OPEN - {"NOT_MENTIONED"}
HISTORY = {"NO_PROMISE", "PROMISE", "AMBIGUOUS", "MISSING"}
WANTS = {"yes", "no", "unsure", None}
KINDS = {"FAKE_INSTRUMENT_TEST"}

def med(values):
    return median(values) if values else None

def expected_order(slot):
    shift = (slot - 1) % 5
    return list(CARDS[shift:] + CARDS[:shift])

def _rating(value):
    return value is None or type(value) is int and 1 <= value <= 5

def validate(data):
    if not isinstance(data, dict) or data.get("kind") not in KINDS:
        raise ValueError("This P0 executable accepts FAKE_INSTRUMENT_TEST only.")
    rows = data.get("rows")
    if not isinstance(rows, list) or len(rows) > 10:
        raise ValueError("Expected 0..10 distinct started slots.")
    ids = []
    for row in rows:
        slot = row.get("slot")
        if type(slot) is not int or not 1 <= slot <= 10:
            raise ValueError("Slot must be an integer 1..10.")
        ids.append(slot)
        if row.get("disposition") not in {"usable", "withdrawn", "excluded"}:
            raise ValueError("Invalid disposition.")
        if row["disposition"] != "usable":
            if row.get("cards") or row.get("review"):
                raise ValueError("Unavailable slot must not carry answers/codes.")
            continue
        if row.get("order") != expected_order(slot):
            raise ValueError("Unregistered card order.")
        if not isinstance(row.get("integrity"), bool):
            raise ValueError("Integrity flag required.")
        for key in ("adult", "consented", "uncertain_context", "nonromantic_context"):
            if type(row.get(key)) is not bool:
                raise ValueError("Eligibility/consent/quota flags must be explicit booleans.")
        cards = row.get("cards")
        if not isinstance(cards, dict) or set(cards) != set(CARDS):
            raise ValueError("Exactly five distinct cards required.")
        review = row.get("review", {})
        if not isinstance(review, dict):
            raise ValueError("Review object required.")
        for key in ("independent", "locked", "adjudicated"):
            if type(review.get(key)) is not bool:
                raise ValueError("Review flags required.")
        reviewers = review.get("reviewer_ids")
        if not isinstance(reviewers, list) or len(reviewers) != 2 or len(set(reviewers)) != 2 or not all(isinstance(x,str) and x.strip() for x in reviewers):
            raise ValueError("Two distinct reviewer IDs required.")
        for card_id, card in cards.items():
            for key in ("motive", "prediction"):
                if card.get(key) not in OPEN:
                    raise ValueError("Invalid open code.")
            if card.get("direct") not in DIRECT:
                raise ValueError("Invalid direct code.")
            if not _rating(card.get("usefulness")) or not _rating(card.get("creepiness")):
                raise ValueError("Ratings are integer 1..5 or null; booleans forbidden.")
            if card.get("want") not in WANTS:
                raise ValueError("Invalid want response.")
            if type(card.get("raw_complete")) is not bool:
                raise ValueError("Raw response completeness flag required.")
            # Provenance citations may be empty only for not-mentioned or missing.
            evidence = card.get("evidence")
            if not isinstance(evidence, dict):
                raise ValueError("Evidence citations required.")
            for key in ("motive", "prediction", "direct"):
                if card[key] not in {"NOT_MENTIONED", "MISSING"} and not (isinstance(evidence.get(key), str) and evidence[key].strip()):
                    raise ValueError("Every substantive code needs a field/quote citation.")
            if card_id == "D":
                if card.get("history") not in HISTORY:
                    raise ValueError("D history code required.")
                if card["history"] != "MISSING" and not (isinstance(evidence.get("history"),str) and evidence["history"].strip()):
                    raise ValueError("History code needs a field/quote citation.")
                if any(card[k] == "ERROR" for k in ("prediction", "direct")) and card["history"] != "PROMISE":
                    raise ValueError("D app-attributed reply ERROR contradicts a non-PROMISE history code.")
                if card["history"] == "NO_PROMISE" and any(card[k] in {"AMBIGUOUS", "MISSING"} for k in ("prediction", "direct")):
                    raise ValueError("D unresolved prediction/response cannot be NO_PROMISE.")
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate participant/slot: never count repeated cards as people.")
    return rows

def evaluate(data):
    rows = validate(data)
    if not rows:
        return {"instrument_decision":"NOT_RUN", "human_study_decision":"NOT_RUN",
                "stage8b_authorized":False, "N_target":10, "N_started":0}
    usable = [r for r in rows if r["disposition"] == "usable" and r["adult"] and r["consented"]]
    # Do not treat unaudited labels as established successes OR failures.
    reviewed = [r for r in usable if r["integrity"] and all(r["review"][k] for k in ("independent","locked","adjudicated"))]
    assessable = []
    correct = []
    promises = []
    no_promises = []
    history_ambiguous = []
    for r in reviewed:
        cards = list(r["cards"].values())
        d = r["cards"]["D"]
        if d["history"] == "PROMISE":
            promises.append(r["slot"])
        elif d["history"] == "NO_PROMISE" and d["raw_complete"]:
            no_promises.append(r["slot"])
        elif d["history"] == "AMBIGUOUS":
            history_ambiguous.append(r["slot"])
        complete = all(c["raw_complete"] and all(c[k] != "MISSING" for k in ("motive","prediction","direct")) for c in cards) and d["history"] != "MISSING"
        if not complete:
            continue
        assessable.append(r)
        positive = all(any(c[k] == "CLEAR_LIMIT" for c in cards) for k in ("motive","prediction"))
        no_errors = all(c[k] not in {"ERROR","AMBIGUOUS"} for c in cards for k in ("motive","prediction"))
        all_direct = all(c["direct"] == "CLEAR_LIMIT" for c in cards)
        if positive and no_errors and all_direct and d["history"] == "NO_PROMISE":
            correct.append(r["slot"])
    gates = {}
    if len(correct) + (10-len(assessable)) < 8:
        gates["comprehension"] = "FAIL"
    elif len(assessable) == 10:
        gates["comprehension"] = "PASS" if len(correct)>=8 else "FAIL"
    else:
        gates["comprehension"] = "INCONCLUSIVE"
    gates["history"] = "FAIL" if promises else ("PASS" if len(no_promises)==10 else "INCONCLUSIVE")
    usefulness = {cid:[r["cards"][cid]["usefulness"] for r in reviewed if r["cards"][cid]["usefulness"] is not None] for cid in CARDS}
    creepiness = {cid:[r["cards"][cid]["creepiness"] for r in reviewed if r["cards"][cid]["creepiness"] is not None] for cid in CARDS}
    usefulness_medians = {cid:med(v) for cid,v in usefulness.items()}
    qualified = [cid for cid,v in usefulness_medians.items() if len(usefulness[cid])==10 and v>=4]
    all_u = all(len(v)==10 for v in usefulness.values())
    gates["usefulness"] = ("PASS" if len(qualified)>=2 else "FAIL") if all_u else "INCONCLUSIVE"
    participant_creep = {str(r["slot"]):med([r["cards"][cid]["creepiness"] for cid in CARDS]) for r in reviewed if all(r["cards"][cid]["creepiness"] is not None for cid in CARDS)}
    overall_creep = med(list(participant_creep.values()))
    gates["creepiness"] = ("PASS" if overall_creep<=2 else "FAIL") if len(participant_creep)==10 else "INCONCLUSIVE"
    yes_people = [r["slot"] for r in reviewed if any(r["cards"][cid]["want"]=="yes" for cid in CARDS)]
    wants_complete = len(reviewed)==10 and all(r["cards"][cid]["want"] is not None for r in reviewed for cid in CARDS)
    gates["own_chat"] = ("PASS" if len(yes_people)>=5 else "FAIL") if wants_complete else "INCONCLUSIVE"
    quotas = {"uncertain":sum(r["uncertain_context"] for r in usable), "nonromantic":sum(r["nonromantic_context"] for r in usable)}
    integrity = len(rows)==len(usable)==len(reviewed)==10 and quotas["uncertain"]>=3 and quotas["nonromantic"]>=2
    all_raw = all(r["cards"][cid]["raw_complete"] for r in reviewed for cid in CARDS)
    decision = "FAIL" if "FAIL" in gates.values() else ("PASS" if integrity and all_raw and all(g=="PASS" for g in gates.values()) else "INCONCLUSIVE")
    return {
        "kind":"FAKE_INSTRUMENT_TEST", "instrument_decision":decision,
        "human_study_decision":"NOT_RUN", "stage8b_authorized":False,
        "N_target":10, "N_started":len(rows), "N_usable":len(usable), "N_reviewed":len(reviewed),
        "N_comprehension_assessable":len(assessable), "comprehension_correct":len(correct),
        "comprehension_correct_slots":correct, "promise_count":len(promises),
        "promise_assessable":len(promises)+len(no_promises), "no_promise_count":len(no_promises),
        "history_ambiguous_count":len(history_ambiguous),
        "gates":gates, "quotas":quotas, "integrity_complete":integrity,
        "usefulness_medians":usefulness_medians,
        "usefulness_denominators":{cid:len(v) for cid,v in usefulness.items()},
        "useful_cards":qualified, "creepiness_card_medians":{cid:med(v) for cid,v in creepiness.items()},
        "creepiness_denominators":{cid:len(v) for cid,v in creepiness.items()},
        "participant_creepiness_medians":participant_creep, "creepiness_median":overall_creep,
        "own_chat_yes_people":len(yes_people), "own_chat_complete":wants_complete,
        "own_chat_card_yes":{cid:sum(r["cards"][cid]["want"]=="yes" for r in reviewed) for cid in CARDS}
    }
