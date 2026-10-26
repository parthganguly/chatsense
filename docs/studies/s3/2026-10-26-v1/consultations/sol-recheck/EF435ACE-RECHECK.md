# Historical recheck: ef435ace

Candidate `ef435ace5ed7275b51027a46f09e430b7973f943` resolved all four initial findings. `independent_recheck.py`, `independent-results.json`, `receipt.json` and `delta-checks.json` preserve that immutable review's evidence. The script explicitly supplies technical_ok=True when testing otherwise valid canonical rows; the revised default false is intentional.

146 independent checks/probes and 54 asserted delta/decision checks verified the original repairs, thresholds, 32 body hashes and unchanged inputs/source evidence. Exactly 20 D/E request body hashes/sizes changed for the agreed motive wording; the other 12 wires and all label mappings/stimulus hashes stayed fixed. All four initial sol-review artifacts were hash-verified unchanged.

One additional boundary blocked an unconditional scorer acceptance: setting a canonical probability to the integer `10**1000` raised `OverflowError: int too large to convert to float` inside number()->math.isfinite, rather than returning INCONCLUSIVE. This was not a false GO. The minimal correction was to recognize integers as finite without converting them to float and let existing [0,1] checks reject them. The final repaired candidate and decision are recorded separately in REPORT.md and final-* artifacts. No historical evidence was overwritten.
