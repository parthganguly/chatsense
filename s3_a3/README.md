# S3 offline dispatcher

**A3 final acceptance is blocked on one reproducible scheduling defect.** Fresh Sol 6.1 passed offline safety on [031ccb5](https://github.com/parthganguly/chatsense/commit/031ccb5ed70a9b54cf41eb4a2e909253228d5d8d). That revision suppresses handoffs at and after 3,600 seconds and retains the unsent reservation. A normally advancing clock also causes it to refuse every handoff in the final 300 seconds, even when time remains. [Independent report](evidence/sol-031ccb5/REPORT.md) · [Coordinator disposition and reproducer](evidence/sol-031ccb5/COORDINATOR.md)

The [dispatcher](dispatcher.py) validates the exact 32-row frozen plan, reserves each attempt before fake transport, and uses a distinct one-use marker so loss of the ledger cannot authorize another attempt. Missing responses retain the full local reserve. A caller may inspect an interrupted run read-only. The CLI disables live dispatch. The supported fake uses a Python receiver on the POSIX main thread. Deadlines are enforced at audited receiver entry. Physical scheduling, uninterruptible native code, hardware power loss and provider behavior are outside the tested boundary.

Run the dispatcher regressions, observer checks and original deadline replay from the repository root:

```sh
python3 -B -W error::ResourceWarning -m unittest discover -s s3_a3/tests -v
python3 -B -m unittest discover -s s3_a3/acceptance -v
python3 -B s3_a3/evidence/first-review/astra-deadline.py
python3 -B s3_a3/tests/receiver_gap_check.py
```

[54 dispatcher tests](evidence/sol-031ccb5/final-suite.log) and [five observer tests](evidence/sol-031ccb5/final-acceptance.log) passed on the reviewed revision. To reproduce the open defect, run `python3 -B s3_a3/evidence/sol-031ccb5/normal-final-window.py` and expect exit 1. It must pass alongside the boundary, crash and duplicate tests before Astra closes A3. Earlier [deadline](evidence/first-review/DISPOSITION.md) and [worker race](evidence/sol-6d74855/REPORT.md) failures are retained for comparison. The [native correction receipt](evidence/sol-031ccb5/opus-final-correction.json) records the timed subscription limit.

A2 remains partially cleared. A4 is closed with zero inference requests. The existing authorization is 16 Jev attempts / $0.05 and 16 GLiDE attempts / $0.40. Local reservations do not establish a provider charge bound.
