"""S3 A3 one-shot serial dispatcher. OFFLINE ONLY: no live transport exists.

The only way to dispatch is run(..., transport=<callable>) from a test, with a
pure in-process fake. The CLI cannot supply a transport, URL, state path or
allowlist; `run` there verifies the frozen packet and refuses before any state.

transport(url, headers, body, timeout) -> (status:int, headers:list[(str,str)], body:bytes)

Usage (from the repository root):
  python3 -B s3_a3/dispatcher.py verify    # frozen inventory + 32 requests
  python3 -B s3_a3/dispatcher.py inspect   # read-only ledger check (fixed state root)
  python3 -B s3_a3/dispatcher.py run       # always refuses: LIVE_DISPATCH_DISABLED (exit 4)
"""
import argparse
import base64
import datetime
import errno
import fcntl
import hashlib
import json
import math
import os
import re
import stat
import sys
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACKET = HERE.parent / "docs/studies/s3/2026-10-26-v1"
CLI_STATE_ROOT = HERE / "state"  # fixed authorization namespace; never user-chosen

FREEZE_SHA256 = "957b6c70fc9103987c6423e7e09997109352307753ecc9c9d97dbce3f769f24a"
INVENTORY_SHA256 = "d6af08e2ad3453bbb913a7056afec991b1f08c8a8273bde2ecf7a3bac14c8659"
WIRE_SHA256 = "48bc5e490e93ad398012364ca45c5fd1b002e36b3ca9fd1161687fb5662c9a31"
ORDER_SHA256 = "9e720d83ef71ef222baed19b1cebfe7608e40bd3fe7ffab91762ed87c72c6986"  # 32 x [id, provider, body, stimulus, request]
INVENTORIED_FILES = 78
AUTH_ID = "s3-v1-" + FREEZE_SHA256[:16]

PROVIDER_URLS = {"jev": "https://api.typesafe.ai/v1/systemone",
                 "glide": "https://api.fastino.ai/v1/systemone"}
MODELS = {"jev": "jev-1.14.0", "glide": "fastino/GLiDE"}
REPORTED_MODELS = {"jev": "jev-1.14.0", "glide": "glide"}
RESERVE_MICRO_USD = {"jev": 3000, "glide": 25000}
CAP_MICRO_USD = {"jev": 50000, "glide": 400000, "total": 450000}
INPUT_BOUND = {"jev": 65536, "glide": 524288}
NANO_USD_PER_INPUT_TOKEN = {"jev": 42, "glide": 40}  # provisional only; billing basis unresolved
TIME_LIMIT_S = 3600
MAX_TIMEOUT_S = 300
MAX_RESPONSE_BYTES = 1 << 20
USAGE_MAX = 2 ** 53 - 1
FACTUAL_ITEMS = ("q02", "q03", "q07")
FACTUAL_MIN = 0.80
FACTUAL_CHECKPOINT = 20  # after pair 10: all U and T attempts
QUESTION_IDS = ["q%02d" % n for n in range(1, 9)]
SAFE_VALUE = re.compile(r"[\x20-\x7e]{0,256}\Z")
RATE_TOKEN = re.compile(r"[a-z_]{1,32}\Z")
SAFE_HEADERS = {"content-type": SAFE_VALUE, "x-request-id": SAFE_VALUE, "request-id": SAFE_VALUE,
                "x-fastino-served-model": SAFE_VALUE, "x-fastino-data-retention": SAFE_VALUE,
                "retry-after": re.compile(r"[0-9]{1,6}\Z"),
                "x-ratelimit-scope": RATE_TOKEN, "x-ratelimit-code": RATE_TOKEN}
COST_STATUS = "UNKNOWN_UNRECONCILED"


class Refused(Exception):
    """Nothing was dispatched by this call. Code only; never payload text."""
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class Aborted(Exception):
    """Durability failure after authorization was consumed; ledger may hold unknowns."""
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class Invalid(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _dumps(obj):  # frozen wire serialization, identical to controls/offline_contract.py
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _canon(obj):
    return json.dumps(obj, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def _digest(obj):
    return _sha(_canon(obj))


def _line(rec):
    return _canon(rec) + b"\n"


def _utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="microseconds")


# ---------------------------------------------------------------- frozen inputs

def _read(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise OSError("not a regular file")
        chunks = []
        while True:
            b = os.read(fd, 1 << 20)
            if not b:
                return b"".join(chunks)
            chunks.append(b)
    finally:
        os.close(fd)


def load_frozen(packet=PACKET):
    """Read the exact frozen inventory into memory; nothing in it is executed."""
    packet = Path(packet)
    try:
        freeze = _read(packet / "FREEZE.json")
    except OSError:
        raise Refused("FREEZE_MISMATCH")
    if _sha(freeze) != FREEZE_SHA256:
        raise Refused("FREEZE_MISMATCH")
    try:
        sums = _read(packet / "SHA256SUMS")
        if _sha(sums) != INVENTORY_SHA256 or json.loads(freeze)["inventory_sha256"] != INVENTORY_SHA256:
            raise ValueError
        listed = {}
        for line in sums.decode("ascii").splitlines():
            m = re.fullmatch(r"([0-9a-f]{64})  ([A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*)", line)
            if not m or m[2] in listed or ".." in m[2].split("/"):
                raise ValueError
            listed[m[2]] = m[1]
        if len(listed) != INVENTORIED_FILES:
            raise ValueError
        present = set()
        for root, dirs, names in os.walk(packet):
            for n in names + [x for x in dirs if os.path.islink(os.path.join(root, x))]:
                present.add(os.path.relpath(os.path.join(root, n), packet))
        if present != set(listed) | {"FREEZE.json", "SHA256SUMS"}:
            raise ValueError
        files = {}
        for rel, want in listed.items():
            files[rel] = _read(packet / rel)
            if _sha(files[rel]) != want:
                raise ValueError
    except (OSError, ValueError, KeyError):
        raise Refused("INVENTORY_MISMATCH")
    if _sha(files["controls/wire-manifest.json"]) != WIRE_SHA256:
        raise Refused("INVENTORY_MISMATCH")
    j = lambda rel: json.loads(files[rel])
    return {"files": files, "plan": j("CALL-PLAN.json"), "bank": j("QUESTION-BANK.json")["cards"],
            "key": j("EVALUATOR-KEY.json")["cards"],
            "stim": {r["card"]: r for r in j("stimuli/manifest.json")["cards"]},
            "rows": j("controls/wire-manifest.json")["requests"]}


def _render(fz, pair, provider):
    """Independent re-implementation of the frozen renderer over verified bytes."""
    card, mode = pair["card"], pair["mode"]
    st = fz["stim"][card]
    payload = fz["files"][st[mode + "_path"]]
    c = ord(card) - ord("A")
    questions = {}
    for j, q in enumerate(fz["bank"][card]):
        n = len(q["options"])
        keys = {d: "k%d" % (1 + (int(d[1:]) + c + j) % n) for d in q["options"]}
        ds = list(q["options"])
        off = (c + 2 * j) % n
        ds = ds[off:] + ds[:off]
        if pair["condition"] == "O":
            ds.reverse()
        questions[q["id"]] = {"type": "choice", "instructions": q[pair["instruction_variant"]],
                              "criteria": {keys[d]: q["options"][d] for d in ds}}
    body = {"model": MODELS[provider], "state": None, "questions": questions}
    headers = {"Content-Type": "application/json"}
    b64 = base64.b64encode(payload).decode("ascii")
    if mode == "text":
        body["state"] = [payload.decode("utf-8")]
    elif provider == "jev":
        ref = "s3-" + st["image_sha256"][:32]
        body["state"] = [ref]
        body["assets"] = {ref: {"type": "image", "format": "png", "data_base64": b64}}
        headers["TypeSafe-Danger-Zone-Images"] = "true"
    else:
        body["state"] = [{"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}}]
    if provider == "glide":
        body.update(store=False, thinking=False)
    return _dumps(body), headers


def _request_digest(r):
    return _digest({"id": r["id"], "provider": r["provider"], "url": r["url"], "headers": r["headers"],
                    "body_sha256": r["body_sha256"], "stimulus_sha256": r["stimulus_sha256"],
                    "reserve_micro_usd": r["reserve_micro_usd"], "freeze_sha256": FREEZE_SHA256,
                    "authorization_id": AUTH_ID})


def _order(reqs):
    return [[r["id"], r["provider"], r["body_sha256"], r["stimulus_sha256"], r["request_sha256"]] for r in reqs]


def build_requests(fz):
    reqs = []
    for pair in fz["plan"]["pairs"]:
        for provider in pair["providers_in_dispatch_order"]:
            body, headers = _render(fz, pair, provider)
            r = {"id": "%02d-%s-%s-%s" % (pair["pair"], provider, pair["condition"], pair["card"]),
                 "provider": provider, "pair": pair["pair"], "condition": pair["condition"],
                 "card": pair["card"], "url": PROVIDER_URLS[provider], "headers": headers, "body": body,
                 "body_sha256": _sha(body), "stimulus_sha256": fz["stim"][pair["card"]][pair["mode"] + "_sha256"],
                 "reserve_micro_usd": RESERVE_MICRO_USD[provider]}
            r["request_sha256"] = _request_digest(r)
            reqs.append(r)
    return reqs


def _decoded_stimulus(body, text_mode, provider):
    state = body["state"]
    if type(state) is not list or len(state) != 1:
        raise ValueError
    if text_mode:
        return _sha(state[0].encode("utf-8"))
    if provider == "jev":
        ref = state[0]
        if set(body["assets"]) != {ref} or _dumps(body).count(ref.encode()) != 2:
            raise ValueError
        return _sha(base64.b64decode(body["assets"][ref]["data_base64"], validate=True))
    head, data = state[0]["image_url"]["url"].split(",", 1)
    if head != "data:image/png;base64":
        raise ValueError
    return _sha(base64.b64decode(data, validate=True))


def validate_outbound(r, row):
    """Exact handoff check against the frozen manifest row. Raises OUTBOUND_MISMATCH."""
    try:
        p = row["provider"]
        ok = (r["id"] == row["id"] and r["provider"] == p and r["url"] == PROVIDER_URLS[p]
              and type(r["body"]) is bytes and _sha(r["body"]) == r["body_sha256"] == row["body_sha256"]
              and type(r["headers"]) is dict and r["headers"] == row["nonsecret_headers"]
              and r["stimulus_sha256"] == row["decoded_stimulus_sha256"]
              and r["reserve_micro_usd"] == RESERVE_MICRO_USD[p]
              and r["request_sha256"] == _request_digest(r))
        if ok:
            body = json.loads(r["body"])
            ok = (body["model"] == MODELS[p] and list(body["questions"]) == QUESTION_IDS
                  and {q: list(v["criteria"]) for q, v in body["questions"].items()} == row["serialized_option_keys"]
                  and _decoded_stimulus(body, row["condition"] == "T", p) == row["decoded_stimulus_sha256"])
    except Exception:
        ok = False
    if not ok:
        raise Refused("OUTBOUND_MISMATCH")


def verify_requests(reqs, fz):
    """All 32 ordered attempts, bodies, stimuli and request provenance, or PLAN_MISMATCH."""
    rows = fz["rows"]
    try:
        if len(reqs) != 32 or len(rows) != 32 or len({r["id"] for r in reqs}) != 32:
            raise Refused("PLAN_MISMATCH")
        for r, row in zip(reqs, rows):
            validate_outbound(r, row)
            if (r["pair"], r["condition"], r["card"]) != (row["pair"], row["condition"], row["card"]):
                raise Refused("PLAN_MISMATCH")
        if _digest(_order(reqs)) != ORDER_SHA256:
            raise Refused("PLAN_MISMATCH")
        by = {(r["provider"], r["condition"], r["card"]): r["body"] for r in reqs}
        if [r["provider"] for r in reqs].count("jev") != 16 or any(
                by[(p, "R", c)] != by[(p, "U", c)] for p in MODELS for c in "DE"):
            raise Refused("PLAN_MISMATCH")
    except Exception:
        raise Refused("PLAN_MISMATCH")


# ---------------------------------------------------------------- durability

def paths(state_root):
    root = Path(state_root)
    run_dir = root / "runs" / AUTH_ID
    return {"root": root, "auth_dir": root / "authorizations",
            "marker": root / "authorizations" / (AUTH_ID + ".consumed"),
            "runs": root / "runs", "run_dir": run_dir,
            "ledger": run_dir / "ledger.jsonl", "receipts": run_dir / "receipts"}


def _fsync(fd):
    # macOS fsync does not flush the drive cache; F_FULLFSYNC does. Fall back only where the
    # filesystem cannot do it; a hard error (EIO, ENOSPC, ...) fails closed.
    if hasattr(fcntl, "F_FULLFSYNC"):
        try:
            fcntl.fcntl(fd, fcntl.F_FULLFSYNC)
            return
        except OSError as e:
            if e.errno not in (errno.ENOTSUP, errno.EOPNOTSUPP, errno.ENOTTY):
                raise
    os.fsync(fd)


def _fsync_dir(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        _fsync(fd)
    finally:
        os.close(fd)


def _write_all(fd, data):
    view = memoryview(data)
    while view:
        view = view[os.write(fd, view):]


def _mkdir(path):
    try:
        os.mkdir(path, 0o700)
    except FileExistsError:
        if os.path.islink(path) or not os.path.isdir(path):
            raise OSError("state path is not a directory")
        return
    _fsync_dir(path.parent)


def _create(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        _write_all(fd, data)
        _fsync(fd)
    finally:
        os.close(fd)
    _fsync_dir(path.parent)


def _append(fd, chain, rec):
    rec = {"seq": chain["seq"], "prev": chain["prev"], "utc": _utc(), **rec}
    rec["hash"] = _digest(rec)
    _write_all(fd, _line(rec))
    _fsync(fd)
    chain["seq"] += 1
    chain["prev"] = rec["hash"]


def _write_receipt(p, index, attempt_id, body):
    name = "%02d-%s.json" % (index + 1, attempt_id)
    _create(p["receipts"] / name, body)
    return name


def _consume_authorization(p):
    """One-use: the O_EXCL marker is the only gate and is never removed."""
    try:
        for d in ("root", "auth_dir", "runs"):
            _mkdir(p[d])
    except OSError:
        raise Refused("STATE_DIR_FAILED")
    if os.path.lexists(p["marker"]):
        raise Refused("AUTHORIZATION_CONSUMED")
    if os.path.lexists(p["run_dir"]):
        raise Refused("RUN_EXISTS")
    marker = _canon({"authorization_id": AUTH_ID, "freeze_sha256": FREEZE_SHA256, "order_sha256": ORDER_SHA256,
                     "pid": os.getpid(), "utc": _utc(), "nonce": os.urandom(16).hex()})
    try:
        fd = os.open(p["marker"], os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    except FileExistsError:
        raise Refused("AUTHORIZATION_CONSUMED")
    except OSError:
        raise Refused("STATE_DIR_FAILED")
    # Authorization is consumed from here on, whatever happens next.
    try:
        try:
            _write_all(fd, marker)
            _fsync(fd)
        finally:
            os.close(fd)
        _fsync_dir(p["auth_dir"])
        # State dirs may have been made, unsynced, by a racing process: sync every entry before any send.
        _fsync_dir(p["root"].parent)
        _fsync_dir(p["root"])
        os.mkdir(p["run_dir"], 0o700)
        _fsync_dir(p["runs"])
        os.mkdir(p["receipts"], 0o700)
        lfd = os.open(p["ledger"], os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_APPEND | os.O_NOFOLLOW, 0o600)
        _fsync_dir(p["run_dir"])
    except FileExistsError:
        raise Refused("RUN_EXISTS")
    except OSError:
        raise Aborted("RUN_SETUP_FAILED")
    return lfd, {"seq": 0, "prev": _sha(marker)}


# ---------------------------------------------------------------- responses

def _strict_json(data):
    def pairs(kv):
        out = {}
        for k, v in kv:
            if k in out:
                raise ValueError
            out[k] = v
        return out

    def no_constant(_):
        raise ValueError

    def finite(s):
        v = float(s)
        if not math.isfinite(v):
            raise ValueError
        return v

    def bounded_int(s):  # do not rely on the interpreter's int-digit limit
        if len(s) > 32:
            raise ValueError
        return int(s)
    return json.loads(data.decode("utf-8"), object_pairs_hook=pairs, parse_constant=no_constant,
                      parse_float=finite, parse_int=bounded_int)


def _number(v):
    return type(v) is int or (type(v) is float and math.isfinite(v))


def _check_response(res, row, allow, served_seen, info):
    """Fail closed. Fills info with safe, dispatcher-derived fields only."""
    provider = row["provider"]
    if type(res) is not tuple or len(res) != 3:
        raise Invalid("TRANSPORT_MALFORMED")
    status, headers, body = res
    if type(status) is not int or type(headers) is not list or type(body) is not bytes:
        raise Invalid("TRANSPORT_MALFORMED")
    info.update(http_status=status, response_sha256=_sha(body), response_bytes=len(body))
    safe = {}
    for item in headers:
        if type(item) is not tuple or len(item) != 2 or type(item[0]) is not str or type(item[1]) is not str:
            raise Invalid("HEADER_INVALID")
        name = item[0].lower()
        if name in SAFE_HEADERS:
            if name in safe or not SAFE_HEADERS[name].match(item[1]):
                raise Invalid("HEADER_INVALID")
            safe[name] = item[1]
    info["safe_headers"] = safe
    if status != 200:  # includes redirects, 425, 429, 5xx: terminal, never retried or followed
        raise Invalid("HTTP_STATUS")
    if len(body) > MAX_RESPONSE_BYTES:
        raise Invalid("RESPONSE_TOO_LARGE")
    if safe.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise Invalid("CONTENT_TYPE")
    try:
        obj = _strict_json(body)
    except (ValueError, RecursionError):
        raise Invalid("JSON_INVALID")
    if type(obj) is not dict:
        raise Invalid("ANSWERS_INVALID")
    if obj.get("model") != REPORTED_MODELS[provider]:
        raise Invalid("MODEL_MISMATCH")
    if provider == "glide":
        if safe.get("x-fastino-data-retention") not in ("not-stored", "zero"):
            raise Invalid("RETENTION")
        served = safe.get("x-fastino-served-model")
        if served not in allow or (served_seen is not None and served != served_seen):
            raise Invalid("CANONICAL_IDENTITY")
    answers = obj.get("answers")
    keys = row["serialized_option_keys"]
    if type(answers) is not dict or set(answers) != set(keys):
        raise Invalid("ANSWERS_INVALID")
    for q, opts in keys.items():
        a = answers[q]
        if type(a) is not dict or a.get("type") != "choice":
            raise Invalid("ANSWERS_INVALID")
        p = a.get("probabilities")
        if type(p) is not dict or set(p) != set(opts) or not all(_number(v) and 0 <= v <= 1 for v in p.values()):
            raise Invalid("PROBABILITY_INVALID")
        if abs(math.fsum(p.values()) - 1) > 1e-6:
            raise Invalid("PROBABILITY_INVALID")
        c = a.get("choice")
        if type(c) is not str or c not in p or abs(p[c] - max(p.values())) > 1e-9:
            raise Invalid("CHOICE_INVALID")
    usage = obj.get("usage")
    if type(usage) is not dict:
        raise Invalid("USAGE_INVALID")
    u = {k: usage.get(k) for k in ("input_tokens", "output_tokens")}
    if not all(type(v) is int and 0 <= v <= USAGE_MAX for v in u.values()):
        raise Invalid("USAGE_INVALID")
    if provider == "glide" and (type(obj.get("token_usage")) is not int or obj["token_usage"] != sum(u.values())):
        raise Invalid("USAGE_INVALID")
    if u["input_tokens"] > INPUT_BOUND[provider]:
        raise Invalid("USAGE_BOUND")
    info.update(usage=u, provisional_input_nano_usd=u["input_tokens"] * NANO_USD_PER_INPUT_TOKEN[provider])
    return obj


def _factual_controls_pass(fz, responses):
    for row, resp in zip(fz["rows"][:FACTUAL_CHECKPOINT], responses):
        for q in FACTUAL_ITEMS:
            wire = row["canonical_to_wire"][q][fz["key"][row["card"]][q]["correct"]]
            if not resp["answers"][q]["probabilities"][wire] >= FACTUAL_MIN:
                return False
    return True


# ---------------------------------------------------------------- dispatch

def _expired(remaining):
    return not remaining > 0  # NaN counts as expired


def _handoff(transport, snap, timeout, clock, t0):
    """One handoff on a daemon worker, bounded by `timeout` real seconds.

    The worker sends only if it starts inside that bound and the 60-minute window;
    otherwise it never sends. A hung transport is abandoned, never awaited or
    retried, and anything it returns after the bound is discarded.
    """
    bound = time.monotonic() + timeout
    lock, finished = threading.Lock(), threading.Event()
    box = {"state": "pending"}

    def work():
        with lock:
            if box["state"] != "pending" or time.monotonic() >= bound or _expired(TIME_LIMIT_S - (clock() - t0)):
                box["state"] = "not_sent"
                finished.set()
                return
            box["state"] = "sent"
        try:
            out = ("result", transport(snap["url"], snap["headers"], snap["body"], timeout))
        except BaseException as e:
            out = ("error", e)
        with lock:
            if "late" not in box:  # main has not closed the box
                box[out[0]] = out[1]
        finished.set()
    threading.Thread(target=work, daemon=True).start()
    try:
        finished.wait(max(0.0, bound - time.monotonic()))
    finally:  # also on KeyboardInterrupt: a worker that has not started never sends
        with lock:
            if box["state"] == "pending":
                box["state"] = "not_sent"
            box["late"] = time.monotonic() >= bound
    return box


def run(state_root, transport, *, served_allowlist, clock=time.monotonic, packet=PACKET):
    fz = load_frozen(packet)
    reqs = build_requests(fz)
    verify_requests(reqs, fz)
    if transport is None:
        raise Refused("LIVE_DISPATCH_DISABLED")
    allow = tuple(served_allowlist)
    if not all(type(a) is str and a for a in allow):
        raise Refused("ALLOWLIST_INVALID")
    p = paths(state_root)
    fd, chain = _consume_authorization(p)
    rows = fz["rows"]
    reserved = {"jev": 0, "glide": 0, "total": 0}
    outcomes, responses = [], []
    stop, failure, served_seen, t0, attempted = None, None, None, None, 0

    def append(rec):
        try:
            _append(fd, chain, rec)
        except Exception:
            raise Aborted("LEDGER_WRITE_FAILED")
    try:
        append({"type": "RUN_START", "authorization_id": AUTH_ID, "freeze_sha256": FREEZE_SHA256,
                "inventory_sha256": INVENTORY_SHA256, "wire_manifest_sha256": WIRE_SHA256,
                "order_sha256": ORDER_SHA256, "attempts": _order(reqs), "reserve_micro_usd": RESERVE_MICRO_USD,
                "cap_micro_usd": CAP_MICRO_USD, "time_limit_s": TIME_LIMIT_S, "cost_status": COST_STATUS})
        for i, (r, row) in enumerate(zip(reqs, rows)):
            if i == FACTUAL_CHECKPOINT and not _factual_controls_pass(fz, responses):
                stop = "FACTUAL_CONTROL_STOP"
                break
            if t0 is not None and _expired(TIME_LIMIT_S - (clock() - t0)):
                stop = "TIME_LIMIT"
                break
            snap = {**r, "headers": dict(r["headers"])}
            try:
                load_frozen(packet)  # packet still exact on disk at this instant
                validate_outbound(snap, row)
            except Refused as e:
                stop, failure = "TECHNICAL_FAILURE", e.code
                outcomes.append([r["id"], e.code])
                break
            prov, amount = row["provider"], RESERVE_MICRO_USD[row["provider"]]
            if reserved[prov] + amount > CAP_MICRO_USD[prov] or reserved["total"] + amount > CAP_MICRO_USD["total"]:
                stop, failure = "CAP_THREATENED", "CAP_THREATENED"
                break
            reserved[prov] += amount
            reserved["total"] += amount
            append({"type": "RESERVE", "id": row["id"], "provider": prov, "pair": row["pair"],
                    "condition": row["condition"], "card": row["card"], "body_sha256": snap["body_sha256"],
                    "stimulus_sha256": snap["stimulus_sha256"], "request_sha256": snap["request_sha256"],
                    "reserve_micro_usd": amount, "reserved_micro_usd": dict(reserved),
                    "authorization_id": AUTH_ID, "freeze_sha256": FREEZE_SHA256})
            # Reservation is fsynced. From here a crash is an unknown, potentially billed attempt.
            now = clock()
            if t0 is None:
                t0 = now  # the 60-minute window opens at the first actual handoff
            remaining = TIME_LIMIT_S - (now - t0)
            timeout = min(MAX_TIMEOUT_S, remaining)
            box = {"state": "not_sent"} if _expired(remaining) else _handoff(transport, snap, timeout, clock, t0)
            if box["state"] != "sent":  # provably never handed off; the reserve stays held
                outcome = ("NOT_SENT_TIME_LIMIT" if _expired(TIME_LIMIT_S - (clock() - t0))
                           else "NOT_SENT_HANDOFF_LATE")
                append({"type": "NOT_SENT", "id": row["id"], "outcome": outcome, "reserve_micro_usd": amount,
                        "cost_status": COST_STATUS, "reserve_retained": True})
                outcomes.append([row["id"], outcome])
                stop = "TIME_LIMIT" if outcome == "NOT_SENT_TIME_LIMIT" else "TECHNICAL_FAILURE"
                failure = None if stop == "TIME_LIMIT" else outcome
                break
            attempted += 1
            info = {}
            if "error" in box:
                outcome = "TRANSPORT_TIMEOUT" if isinstance(box["error"], TimeoutError) else "TRANSPORT_ERROR"
            elif "result" not in box:
                outcome = "TRANSPORT_TIMEOUT"  # hung: abandoned, never retried
            elif box["late"] or clock() - now >= timeout:
                outcome = "RESPONSE_LATE"
            else:
                res = box["result"]
                try:
                    obj = _check_response(res, row, allow, served_seen, info)
                    outcome = "VALID"
                except Invalid as e:
                    outcome = e.code
                except Exception:
                    outcome = "RESPONSE_INVALID"
            if outcome == "VALID":
                try:
                    info["receipt"] = _write_receipt(p, i, row["id"], res[2])
                except Exception:
                    outcome = "RECEIPT_PERSIST_FAILED"
            append({"type": "RESULT", "id": row["id"], "outcome": outcome, **info,
                    "reserve_micro_usd": amount, "reserve_retained": True, "cost_status": COST_STATUS})
            outcomes.append([row["id"], outcome])
            if outcome != "VALID":
                stop, failure = "TECHNICAL_FAILURE", outcome
                break
            responses.append(obj)
            if prov == "glide":
                served_seen = info["safe_headers"]["x-fastino-served-model"]
        else:
            stop = "PLAN_COMPLETE"
        not_attempted = [row["id"] for row in rows[attempted:]]
        append({"type": "STOP", "reason": stop, "failure": failure, "attempted": attempted,
                "not_attempted": not_attempted, "reserved_micro_usd": dict(reserved), "cost_status": COST_STATUS})
    finally:
        os.close(fd)
    return {"stop_reason": stop, "failure": failure, "outcomes": outcomes, "not_attempted": not_attempted,
            "handoffs": attempted, "reserved_micro_usd": reserved, "cost_status": COST_STATUS}


# ---------------------------------------------------------------- read-only verification

def inspect(state_root):
    """Read-only. Never creates, repairs, releases or dispatches anything."""
    p = paths(state_root)
    rep = {"authorization_id": AUTH_ID, "authorization_consumed": os.path.lexists(p["marker"]),
           "errors": [], "complete": False, "stop_reason": None, "attempts": [],
           "counts": None, "reserved_micro_usd": {"jev": 0, "glide": 0, "total": 0},
           "orphan_receipts": 0, "cost_status": COST_STATUS, "within_budget_verified": False}
    errors = rep["errors"]
    try:
        marker = _read(p["marker"])
    except OSError:
        marker = None
    try:
        data = _read(p["ledger"])
    except OSError:
        errors.append("LEDGER_MISSING" if rep["authorization_consumed"] else "NO_RUN")
        return rep
    if marker is None:
        errors.append("MARKER_MISSING")
    lines = data.split(b"\n")
    if lines[-1] != b"":
        errors.append("PARTIAL_RECORD")
    prev = _sha(marker) if marker is not None else None
    plan, open_attempt, referenced, held = None, None, set(), False
    attempts = rep["attempts"]
    reserved = rep["reserved_micro_usd"]
    for n, line in enumerate(lines[:-1]):
        try:
            rec = _strict_json(line)
            body = {k: v for k, v in rec.items() if k != "hash"}
            if rec["hash"] != _digest(body) or rec["seq"] != n or (prev is not None and rec["prev"] != prev):
                raise ValueError
        except Exception:
            errors.append("CHAIN_BROKEN")
            break
        prev, t = rec["hash"], rec.get("type")
        if rep["complete"]:
            errors.append("RECORD_AFTER_STOP")
            break
        if n == 0:
            if (t != "RUN_START" or rec.get("authorization_id") != AUTH_ID or rec.get("freeze_sha256") != FREEZE_SHA256
                    or rec.get("order_sha256") != ORDER_SHA256 or _digest(rec.get("attempts")) != ORDER_SHA256):
                errors.append("RUN_START_INVALID")
                break
            plan = rec["attempts"]
        elif t == "RESERVE":
            k = len(attempts)
            want = plan[k] if k < len(plan) else None
            if (open_attempt is not None or held or want is None
                    or [rec.get(x) for x in ("id", "provider", "body_sha256", "stimulus_sha256", "request_sha256")] != want
                    or rec.get("reserve_micro_usd") != RESERVE_MICRO_USD.get(want[1])):
                errors.append("RESERVE_OUT_OF_ORDER")
                break
            reserved[want[1]] += rec["reserve_micro_usd"]
            reserved["total"] += rec["reserve_micro_usd"]
            if rec.get("reserved_micro_usd") != reserved:
                errors.append("RESERVE_TOTAL_MISMATCH")
                break
            open_attempt = {"id": want[0], "provider": want[1], "status": "UNKNOWN_POTENTIALLY_BILLED",
                            "outcome": None, "http_status": None, "reserve_micro_usd": rec["reserve_micro_usd"],
                            "reserve_retained": True}
            attempts.append(open_attempt)
        elif t == "RESULT":
            if open_attempt is None or rec.get("id") != open_attempt["id"] or rec.get("reserve_retained") is not True:
                errors.append("RESULT_WITHOUT_RESERVE")
                break
            outcome = rec.get("outcome")
            open_attempt.update(outcome=outcome, http_status=rec.get("http_status"),
                                status="VALID" if outcome == "VALID" else "INVALID")
            if outcome == "VALID":
                name = rec.get("receipt")
                referenced.add(name)
                try:
                    if type(name) is not str or "/" in name or _sha(_read(p["receipts"] / name)) != rec.get("response_sha256"):
                        errors.append("RECEIPT_HASH_MISMATCH")
                except OSError:
                    errors.append("RECEIPT_MISSING")
            open_attempt = None
        elif t == "NOT_SENT":  # reserved, provably never handed off; the reserve stays held
            if (open_attempt is None or rec.get("id") != open_attempt["id"] or rec.get("reserve_retained") is not True
                    or rec.get("outcome") not in ("NOT_SENT_TIME_LIMIT", "NOT_SENT_HANDOFF_LATE")):
                errors.append("RESULT_WITHOUT_RESERVE")
                break
            open_attempt.update(outcome=rec["outcome"], status="NOT_SENT_RESERVE_HELD")
            open_attempt, held = None, True
        elif t == "STOP":
            sent = len(attempts) - held
            if open_attempt is not None or rec.get("not_attempted") != [a[0] for a in plan[sent:]]:
                errors.append("STOP_INCONSISTENT")
                break
            valid = sum(a["status"] == "VALID" for a in attempts)
            reason = rec.get("reason")
            if ((reason == "PLAN_COMPLETE" and valid != len(plan))
                    or (held and reason not in ("TIME_LIMIT", "TECHNICAL_FAILURE"))
                    or (reason == "FACTUAL_CONTROL_STOP" and (valid != FACTUAL_CHECKPOINT or len(attempts) != valid))
                    or reason not in ("PLAN_COMPLETE", "FACTUAL_CONTROL_STOP", "TIME_LIMIT",
                                      "TECHNICAL_FAILURE", "CAP_THREATENED")):
                errors.append("STOP_INCONSISTENT")
                break
            rep["complete"], rep["stop_reason"] = True, reason
        else:
            errors.append("UNKNOWN_RECORD")
            break
    try:
        on_disk = set(os.listdir(p["receipts"]))
    except OSError:
        on_disk = set()
    rep["orphan_receipts"] = len(on_disk - referenced)
    count = lambda s: sum(a["status"] == s for a in attempts)
    sent = len(attempts) - held
    rep["counts"] = {"attempted": sent, "valid": count("VALID"), "invalid": count("INVALID"),
                     "unknown": count("UNKNOWN_POTENTIALLY_BILLED"), "not_sent": int(held),
                     "not_attempted": (len(plan) if plan else 32) - sent}
    return rep


def main(argv=None):
    ap = argparse.ArgumentParser(prog="dispatcher.py", allow_abbrev=False,
                                 description="S3 A3 offline dispatcher. Live dispatch is disabled.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("verify", "inspect", "run"):
        sub.add_parser(name, allow_abbrev=False)
    cmd = ap.parse_args(argv).cmd
    try:
        if cmd == "verify":
            fz = load_frozen()
            reqs = build_requests(fz)
            verify_requests(reqs, fz)
            print(json.dumps({"freeze_sha256": FREEZE_SHA256, "inventory_sha256": INVENTORY_SHA256,
                              "order_sha256": ORDER_SHA256, "requests": len(reqs),
                              "reserve_micro_usd": RESERVE_MICRO_USD, "live_dispatch": "DISABLED"}))
            return 0
        if cmd == "inspect":
            rep = inspect(CLI_STATE_ROOT)
            print(json.dumps(rep, indent=1))
            return 0 if rep["complete"] and not rep["errors"] else 1
        run(CLI_STATE_ROOT, None, served_allowlist=())
    except (Refused, Aborted) as e:
        print(e.code)
        return 4 if e.code == "LIVE_DISPATCH_DISABLED" else 1
    return 1


if __name__ == "__main__":
    sys.exit(main())
