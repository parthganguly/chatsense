"""Subprocess driver for SIGKILL / competing-process tests (fake transport only).

usage: child.py STATE_ROOT MODE READY_FILE HANDOFF_LOG
MODE: hang_transport_N | hang_before_reserve | hang_before_receipt
Exit 3 = refused by dispatcher, 0 = run returned.
"""
import sys
import time
from pathlib import Path

from fakes import SERVED, FakeProvider
import dispatcher as d

state, mode, ready, log = sys.argv[1:5]
hang_at = None
if mode.startswith("hang_transport_"):
    hang_at = int(mode.rsplit("_", 1)[1])


def block():
    Path(ready).write_text("ready")
    time.sleep(600)


if mode == "hang_before_reserve":
    orig = d._append

    def _append(fd, chain, rec):
        if rec["type"] == "RESERVE":
            block()
        return orig(fd, chain, rec)
    d._append = _append
elif mode == "hang_before_receipt":
    d._write_receipt = lambda *a, **k: block()

try:
    d.run(state, FakeProvider(state, hang_at=hang_at, ready=ready, log=log), served_allowlist=(SERVED,))
except d.Refused as e:
    print(e.code)
    sys.exit(3)
