"""Artificial algebra/label controls. No invented human respondents or empirical results."""
import copy
import json
import unittest
from gate import evaluate, expected_order

def base(n=10):
    # Repeated minimal code vectors, explicitly FAKE; not a response simulation.
    rows=[]
    for slot in range(1,n+1):
        cards={}
        for cid in "ABCDE":
            c={"motive":"CLEAR_LIMIT", "prediction":"CLEAR_LIMIT", "direct":"CLEAR_LIMIT",
               "raw_complete":True, "usefulness":4, "creepiness":2, "want":"yes",
               "evidence":{k:"FAKE algebra control; no human quotation" for k in ("motive","prediction","direct","history")}}
            if cid=="D": c["history"]="NO_PROMISE"
            cards[cid]=c
        rows.append({"slot":slot, "disposition":"usable", "order":expected_order(slot),
                     "adult":True, "consented":True, "uncertain_context":slot<=3,
                     "nonromantic_context":slot<=2, "integrity":True, "cards":cards,
                     "review":{"reviewer_ids":["FAKE_R1","FAKE_R2"],"independent":True,"locked":True,"adjudicated":True}})
    return {"kind":"FAKE_INSTRUMENT_TEST","rows":rows}

class GateTests(unittest.TestCase):
    def test_positive_instrument_never_human_pass(self):
        r=evaluate(base())
        self.assertEqual(r["instrument_decision"],"PASS")
        self.assertEqual(r["human_study_decision"],"NOT_RUN")
        self.assertFalse(r["stage8b_authorized"])

    def test_one_future_promise_overrides_high_usefulness(self):
        d=base(); d["rows"][0]["cards"]["D"]["history"]="PROMISE"
        d["rows"][0]["cards"]["D"]["prediction"]="ERROR"
        for row in d["rows"]:
            for c in row["cards"].values(): c["usefulness"]=5
        r=evaluate(d); self.assertEqual(r["instrument_decision"],"FAIL")
        self.assertEqual(r["promise_count"],1)

    def test_hedged_or_negative_promise_also_fails(self):
        # Semantic mapping comes from rubric, no keyword classifier.
        for control in ["likely_restart","will_not_reply","disclaimer_contradiction"]:
            d=base(); d["rows"][0]["cards"]["D"]["history"]="PROMISE"
            d["rows"][0]["cards"]["D"]["evidence"]["history"]="FAKE:"+control
            self.assertEqual(evaluate(d)["instrument_decision"],"FAIL")

    def test_ambiguity_never_correct(self):
        d=base()
        for row in d["rows"][:3]: row["cards"]["A"]["motive"]="AMBIGUOUS"
        r=evaluate(d); self.assertEqual(r["comprehension_correct"],7)
        self.assertEqual(r["instrument_decision"],"FAIL")

    def test_one_ambiguous_person_may_be_within_eight_of_ten(self):
        d=base(); d["rows"][0]["cards"]["A"]["motive"]="AMBIGUOUS"
        r=evaluate(d); self.assertEqual(r["comprehension_correct"],9)
        self.assertEqual(r["instrument_decision"],"PASS")

    def test_ambiguous_history_prevents_zero_promise_pass(self):
        d=base(); d["rows"][0]["cards"]["D"]["history"]="AMBIGUOUS"
        r=evaluate(d); self.assertEqual(r["promise_count"],0)
        self.assertEqual(r["instrument_decision"],"INCONCLUSIVE")

    def test_missing_rating_not_zero_or_case_deletion(self):
        for key in ["usefulness","creepiness","want"]:
            d=base(); d["rows"][0]["cards"]["B"][key]=None
            r=evaluate(d); self.assertEqual(r["instrument_decision"],"INCONCLUSIVE")
            self.assertEqual(r["N_usable"],10)

    def test_high_usefulness_false_confidence(self):
        d=base()
        for row in d["rows"][:3]:
            row["cards"]["C"]["motive"]="ERROR"
            row["cards"]["C"]["usefulness"]=5
        self.assertEqual(evaluate(d)["instrument_decision"],"FAIL")

    def test_nonromantic_case_no_penalty(self):
        d=base()
        for row in d["rows"]: row["nonromantic_context"]=True
        self.assertEqual(evaluate(d)["instrument_decision"],"PASS")

    def test_eight_nine_no_reduced_denominator_pass(self):
        for n in [8,9]:
            r=evaluate(base(n)); self.assertEqual(r["instrument_decision"],"INCONCLUSIVE")
            self.assertEqual(r["N_target"],10); self.assertEqual(r["N_started"],n)

    def test_fifty_card_rows_rejected(self):
        d=base(); d["rows"]*=5
        with self.assertRaises(ValueError): evaluate(d)

    def test_duplicate_slot_rejected(self):
        d=base(); d["rows"][1]=copy.deepcopy(d["rows"][0])
        with self.assertRaises(ValueError): evaluate(d)

    def test_eight_pass_seven_fail(self):
        for errors, expected in [(2,"PASS"),(3,"FAIL")]:
            d=base()
            for row in d["rows"][:errors]: row["cards"]["A"]["motive"]="ERROR"
            self.assertEqual(evaluate(d)["instrument_decision"],expected)

    def test_prompted_check_cannot_rescue_missing_spontaneous_limit(self):
        d=base()
        for row in d["rows"]:
            for card in row["cards"].values(): card["prediction"]="NOT_MENTIONED"
        self.assertEqual(evaluate(d)["comprehension_correct"],0)
        self.assertEqual(evaluate(d)["instrument_decision"],"FAIL")

    def test_single_spontaneous_domain_per_person_suffices(self):
        d=base()
        for row in d["rows"]:
            for card in row["cards"].values():
                card["motive"]="NOT_MENTIONED"; card["prediction"]="NOT_MENTIONED"
            row["cards"]["A"]["motive"]="CLEAR_LIMIT"
            row["cards"]["B"]["prediction"]="CLEAR_LIMIT"
        self.assertEqual(evaluate(d)["instrument_decision"],"PASS")

    def test_unsure_interest_does_not_count_as_yes(self):
        d=base()
        for row in d["rows"][4:]:
            for c in row["cards"].values(): c["want"]="unsure"
        r=evaluate(d); self.assertEqual(r["own_chat_yes_people"],4)
        self.assertEqual(r["instrument_decision"],"FAIL")

    def test_each_yes_person_counts_once(self):
        d=base()
        for row in d["rows"][1:]:
            for c in row["cards"].values(): c["want"]="no"
        r=evaluate(d); self.assertEqual(r["own_chat_yes_people"],1)
        self.assertEqual(r["instrument_decision"],"FAIL")

    def test_two_stage_creepiness_not_pooled(self):
        d=base()
        # 6 participants [1,1,1,5,5], 4 [5,5,5,5,5]:
        # median participant medians =1; pooled median=5.
        for i,row in enumerate(d["rows"]):
            for j,c in enumerate(row["cards"].values()):
                c["creepiness"]=1 if i<6 and j<3 else 5
        r=evaluate(d); self.assertEqual(r["creepiness_median"],1)
        self.assertEqual(r["gates"]["creepiness"],"PASS")

    def test_median_half_step_not_rounded(self):
        d=base()
        for i,row in enumerate(d["rows"]):
            for c in row["cards"].values(): c["usefulness"]=3 if i<5 else 4
        r=evaluate(d); self.assertEqual(r["usefulness_medians"]["A"],3.5)
        self.assertEqual(r["gates"]["usefulness"],"FAIL")

    def test_unreviewed_cannot_pass(self):
        for flag in ["independent","locked","adjudicated"]:
            d=base(); d["rows"][0]["review"][flag]=False
            self.assertEqual(evaluate(d)["instrument_decision"],"INCONCLUSIVE")

    def test_missing_raw_answers_cannot_pass(self):
        d=base(); d["rows"][0]["cards"]["A"]["raw_complete"]=False
        self.assertEqual(evaluate(d)["instrument_decision"],"INCONCLUSIVE")

    def test_withdrawal_preserves_unavailable_slot(self):
        d=base(); d["rows"][0]={"slot":1,"disposition":"withdrawn","cards":{}}
        r=evaluate(d); self.assertEqual(r["N_started"],10); self.assertEqual(r["N_usable"],9)
        self.assertEqual(r["instrument_decision"],"INCONCLUSIVE")

    def test_quota_failure_inconclusive(self):
        d=base()
        for row in d["rows"]: row["nonromantic_context"]=False
        self.assertEqual(evaluate(d)["instrument_decision"],"INCONCLUSIVE")

    def test_wrong_order_rejected(self):
        d=base(); d["rows"][0]["order"]=list("EDCBA")
        with self.assertRaises(ValueError): evaluate(d)

    def test_invalid_ratings_rejected(self):
        for value in [0,6,3.5,True,"4"]:
            d=base(); d["rows"][0]["cards"]["A"]["usefulness"]=value
            with self.assertRaises(ValueError): evaluate(d)

    def test_missing_citation_rejected(self):
        d=base(); d["rows"][0]["cards"]["A"]["evidence"]["motive"]=""
        with self.assertRaises(ValueError): evaluate(d)

    def test_same_reviewer_twice_rejected(self):
        d=base(); d["rows"][0]["review"]["reviewer_ids"]=["R1","R1"]
        with self.assertRaises(ValueError): evaluate(d)

    def test_real_data_refused(self):
        d=base(); d["kind"]="REAL_PARTICIPANT"
        with self.assertRaises(ValueError): evaluate(d)

    def test_contradictory_history_codes_rejected(self):
        for label in ["ERROR", "AMBIGUOUS", "MISSING"]:
            d=base(); d["rows"][0]["cards"]["D"]["direct"]=label
            with self.assertRaises(ValueError): evaluate(d)

    def test_empty_not_run(self):
        self.assertEqual(evaluate(base(0))["instrument_decision"],"NOT_RUN")

if __name__=="__main__":
    unittest.main()
