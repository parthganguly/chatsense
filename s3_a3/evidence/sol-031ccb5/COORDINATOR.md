# A3 disposition on 031ccb5

Sol independently passed the offline safety behavior on commit `031ccb5ed70a9b54cf41eb4a2e909253228d5d8d`. The original after-reservation and pre-receiver 3,600/3,601-second counterexamples stop safely, and the held unsent reservation remains distinguishable from a crash with unknown billing. The 54-test dispatcher suite and five handoff-observer tests passed. The independent report states what it verified and the limits of the interpreter-level handoff boundary.

Astra holds final A3 acceptance for a reproducible availability defect. The receiver refuses a timeout argument longer than its remaining campaign window. When a real clock advances during setup and the 300-second timeout exceeds the remaining campaign time, the previously computed timeout always exceeds the new remainder. This closes the final five minutes of a normal 60-minute campaign to new handoffs, even with ample time for a prompt fake reply.

From a checkout of the reviewed commit, run `python3 -B /path/to/normal-final-window.py`. The test scales the 60-minute window to one second and the maximum call timeout to 0.95 seconds. A valid first fake reply takes 0.08 seconds. The second fake should receive a smaller timeout and return a scripted HTTP 429. Instead, the caller makes one handoff, retains the second reservation and records NOT_SENT_HANDOFF_LATE. The assertion exits 1. Sol's separate scaled test and actual trace are in new.py and new.log.

The last native session reached its subscription limit after implementing the mask/stale-timeout protections and adding the corresponding tests. The next source change must preserve the receiver-entry guard and allow a legitimate final-window request. Successful reproduction of both properties on the same revision and a fresh independent review will close the engineering gate.

On the reviewed SHA the mutation checker reported 33 of 34 detected faults. Its “no receiver-entry recheck” mutation removed one of two equivalent checks, leaving the second check active. Opus updated only that diagnostic to remove both checks. It then emitted KILLED in the focused replay. The two raw mutation receipts are kept separate.
