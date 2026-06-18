from __future__ import annotations

from datetime import date, datetime, timedelta
from statistics import median
from typing import Callable

import pandas as pd

from chatsense_ml.contract import (
    ADAPTIVE_WINDOW_RULES,
    EARLY_LATE_MIN_ELIGIBLE_WINDOWS,
    EARLY_LATE_WINDOW_COUNT,
    FOLLOW_UP_MIN,
    MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
    MIN_RECONNECTIONS_PER_PERIOD,
    MIN_REPLY_LATENCY_PER_PARTICIPANT,
    MIN_THREAD_STARTS_PER_PERIOD,
    MIN_WINDOW_ACTIVE_DAYS,
    MIN_WINDOW_MESSAGES,
    NOTABLE_FOLLOW_UP_RATE_ABS_PCT,
    NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
    NOTABLE_RECONNECTION_SHARE_ABS_PCT,
    NOTABLE_REPLY_LATENCY_RELATIVE_PCT,
    NOTABLE_THREAD_START_SHARE_ABS_PCT,
    NOTABLE_TURN_SHARE_ABS_PCT,
    RECONNECTION_GAP_MIN,
    RECENT_PRIOR_WINDOW_COUNT,
    THREAD_GAP_MIN,
)
from chatsense_ml.rounding import js_round


def relationship_dynamics(df: pd.DataFrame) -> dict:
    if df.empty:
        return _default_dynamics()

    records = _records(df)
    participants = _participants(records)
    turns = _turns(records)
    threads = _threads(turns)
    turn_by_message = _turn_by_message(turns)
    replies = _reply_events(records)
    reconnections = _reconnections(records, turns, threads, turn_by_message)
    followups = _followups(records, turn_by_message)
    windows = _adaptive_windows(records, turns, replies, reconnections, followups, participants)
    full = _summarize_scope(
        "Full export",
        [w["index"] for w in windows],
        records,
        turns,
        replies,
        reconnections,
        followups,
        participants,
        lambda _: True,
    )
    early_late = _early_late(windows, records, turns, replies, reconnections, followups, participants)
    recent_prior = _recent_prior(windows, records, turns, replies, reconnections, followups, participants)
    notable = [c for c in early_late["changes"] + recent_prior["changes"] if c["notable"]]

    return {
        "window_size_days": _choose_window_size(_span_days(records[0]["timestamp"], records[-1]["timestamp"])),
        "turns": turns,
        "adaptive_windows": windows,
        "participant_summaries": full["participants"],
        "pause_summary": _pause_summary(records, reconnections),
        "early_late": early_late,
        "recent_prior": recent_prior,
        "notable_changes": notable,
        "change_insights": _change_insights(notable, early_late, recent_prior),
    }


def _records(df: pd.DataFrame) -> list[dict]:
    result = []
    for row in df.sort_values("timestamp", kind="stable").to_dict("records"):
        timestamp = pd.Timestamp(row["timestamp"]).to_pydatetime()
        result.append(
            {
                "message_index": int(row["message_index"]),
                "timestamp": timestamp,
                "sender": str(row["sender"]),
                "text": str(row.get("text", "")),
                "word_count": int(row.get("word_count", 0)),
            }
        )
    return result


def _participants(records: list[dict]) -> list[str]:
    seen: set[str] = set()
    result = []
    for record in records:
        if record["sender"] not in seen:
            seen.add(record["sender"])
            result.append(record["sender"])
    return result


def _turns(records: list[dict]) -> list[dict]:
    turns: list[dict] = []
    current: dict | None = None
    previous: dict | None = None
    for index, record in enumerate(records):
        gap = _gap(previous["timestamp"], record["timestamp"]) if previous else None
        starts_thread = index == 0 or (gap is not None and gap >= THREAD_GAP_MIN)
        starts_new_turn = current is None or starts_thread or (previous is not None and previous["sender"] != record["sender"])
        if starts_new_turn:
            if current is not None:
                turns.append(_finalize_turn(current, False))
            current = {
                "id": len(turns),
                "sender": record["sender"],
                "start_dt": record["timestamp"],
                "end_dt": record["timestamp"],
                "start_message_index": index,
                "end_message_index": index,
                "message_count": 0,
                "word_count": 0,
                "starts_thread": starts_thread,
            }
        current["message_count"] += 1
        current["word_count"] += record["word_count"]
        current["end_dt"] = record["timestamp"]
        current["end_message_index"] = index
        previous = record
    if current is not None:
        turns.append(_finalize_turn(current, True))
    return turns


def _finalize_turn(turn: dict, open_at_export_end: bool) -> dict:
    return {
        "id": turn["id"],
        "sender": turn["sender"],
        "start": turn["start_dt"].isoformat(),
        "end": turn["end_dt"].isoformat(),
        "start_message_index": turn["start_message_index"],
        "end_message_index": turn["end_message_index"],
        "message_count": turn["message_count"],
        "word_count": turn["word_count"],
        "duration_minutes": _round(_gap(turn["start_dt"], turn["end_dt"])),
        "starts_thread": turn["starts_thread"],
        "open_at_export_end": open_at_export_end,
    }


def _threads(turns: list[dict]) -> list[dict]:
    starts = [i for i, turn in enumerate(turns) if turn["starts_thread"]]
    threads = []
    for thread_id, start_index in enumerate(starts):
        end_index = (starts[thread_id + 1] if thread_id + 1 < len(starts) else len(turns)) - 1
        start_turn = turns[start_index]
        end_turn = turns[end_index]
        start = datetime.fromisoformat(start_turn["start"])
        end = datetime.fromisoformat(end_turn["end"])
        threads.append(
            {
                "id": thread_id,
                "start_turn_index": start_index,
                "end_turn_index": end_index,
                "start_message_index": start_turn["start_message_index"],
                "end_message_index": end_turn["end_message_index"],
                "duration_minutes": _round(_gap(start, end)),
                "turn_count": end_index - start_index + 1,
            }
        )
    return threads


def _turn_by_message(turns: list[dict]) -> dict[int, dict]:
    result = {}
    for turn in turns:
        for index in range(turn["start_message_index"], turn["end_message_index"] + 1):
            result[index] = turn
    return result


def _reply_events(records: list[dict]) -> list[dict]:
    events = []
    for index in range(1, len(records)):
        previous = records[index - 1]
        current = records[index]
        if previous["sender"] != current["sender"]:
            events.append(
                {
                    "message_index": index,
                    "sender": current["sender"],
                    "previous_sender": previous["sender"],
                    "delay_minutes": _gap(previous["timestamp"], current["timestamp"]),
                }
            )
    return events


def _reconnections(records: list[dict], turns: list[dict], threads: list[dict], turn_by_message: dict[int, dict]) -> list[dict]:
    thread_by_turn_id = {}
    for thread in threads:
        for turn_index in range(thread["start_turn_index"], thread["end_turn_index"] + 1):
            thread_by_turn_id[turns[turn_index]["id"]] = thread

    events = []
    for index in range(1, len(records)):
        gap = _gap(records[index - 1]["timestamp"], records[index]["timestamp"])
        if gap >= RECONNECTION_GAP_MIN:
            turn = turn_by_message.get(index)
            thread = thread_by_turn_id.get(turn["id"]) if turn else None
            events.append(
                {
                    "message_index": index,
                    "sender": records[index]["sender"],
                    "timestamp": records[index]["timestamp"],
                    "gap_minutes": gap,
                    "subsequent_thread_duration_minutes": thread["duration_minutes"] if thread else 0,
                    "subsequent_thread_turn_count": thread["turn_count"] if thread else 1,
                }
            )
    return events


def _followups(records: list[dict], turn_by_message: dict[int, dict]) -> list[dict]:
    events = []
    for index in range(1, len(records)):
        previous = records[index - 1]
        current = records[index]
        gap = _gap(previous["timestamp"], current["timestamp"])
        if previous["sender"] == current["sender"] and FOLLOW_UP_MIN <= gap < THREAD_GAP_MIN:
            turn = turn_by_message.get(index)
            if turn:
                events.append(
                    {
                        "message_index": index,
                        "turn_id": turn["id"],
                        "sender": current["sender"],
                        "timestamp": current["timestamp"],
                        "delay_minutes": gap,
                    }
                )
    return events


def _adaptive_windows(records, turns, replies, reconnections, followups, participants) -> list[dict]:
    first = records[0]["timestamp"].date()
    last = records[-1]["timestamp"].date()
    window_days = _choose_window_size(_span_days(records[0]["timestamp"], records[-1]["timestamp"]))
    windows = []
    cursor = first
    index = 0
    while cursor <= last:
        start = cursor
        end_exclusive = start + timedelta(days=window_days)
        end_inclusive = end_exclusive - timedelta(days=1)
        partial = last < end_inclusive
        scope = _summarize_scope(
            f"Window {index + 1}",
            [index],
            records,
            turns,
            replies,
            reconnections,
            followups,
            participants,
            lambda ts, s=start, e=end_exclusive: s <= ts.date() < e,
        )
        period = scope["period"]
        windows.append(
            {
                "index": index,
                "start": start.isoformat(),
                "end": (last if partial else end_inclusive).isoformat(),
                "partial": partial,
                "eligible": period["message_count"] >= MIN_WINDOW_MESSAGES and period["active_days"] >= MIN_WINDOW_ACTIVE_DAYS,
                "message_count": period["message_count"],
                "active_days": period["active_days"],
                "turn_count": period["turn_count"],
                "thread_count": period["thread_count"],
                "reconnection_count": period["reconnection_count"],
                "participants": scope["participants"],
            }
        )
        cursor = end_exclusive
        index += 1
    return windows


def _summarize_scope(
    label: str,
    window_indices: list[int],
    records: list[dict],
    turns: list[dict],
    replies: list[dict],
    reconnections: list[dict],
    followups: list[dict],
    participants: list[str],
    includes: Callable[[datetime], bool],
) -> dict:
    scoped_records = [r for r in records if includes(r["timestamp"])]
    scoped_turns = [t for t in turns if includes(datetime.fromisoformat(t["start"]))]
    scoped_replies = [r for r in replies if includes(records[r["message_index"]]["timestamp"])]
    scoped_reconnections = [r for r in reconnections if includes(r["timestamp"])]
    scoped_followups = [f for f in followups if includes(f["timestamp"])]
    active_days = len({r["timestamp"].date().isoformat() for r in scoped_records})
    thread_starts = [t for t in scoped_turns if t["starts_thread"]]
    total_turns = len(scoped_turns)
    total_thread_starts = len(thread_starts)
    total_reconnections = len(scoped_reconnections)

    summaries = []
    for sender in participants:
        sender_records = [r for r in scoped_records if r["sender"] == sender]
        sender_turns = [t for t in scoped_turns if t["sender"] == sender]
        sender_replies = [r for r in scoped_replies if r["sender"] == sender]
        sender_thread_starts = [t for t in thread_starts if t["sender"] == sender]
        sender_reconnections = [r for r in scoped_reconnections if r["sender"] == sender]
        sender_followups = [f for f in scoped_followups if f["sender"] == sender]
        followup_turn_ids = {f["turn_id"] for f in sender_followups}
        relevant_turns = [t for t in sender_turns if _relevant_followup_turn(t, turns)]
        summaries.append(
            {
                "sender": sender,
                "message_count": len(sender_records),
                "turn_count": len(sender_turns),
                "turn_share": _percentage(len(sender_turns), total_turns),
                "messages_per_turn": _round(len(sender_records) / len(sender_turns), 1) if sender_turns else None,
                "words_per_turn": _round(sum(t["word_count"] for t in sender_turns) / len(sender_turns), 1)
                if sender_turns
                else None,
                "median_turn_message_count": _median([t["message_count"] for t in sender_turns]),
                "median_reply_minutes": _median([r["delay_minutes"] for r in sender_replies]),
                "reply_sample_count": len(sender_replies),
                "thread_starts": len(sender_thread_starts),
                "thread_start_share": _percentage(len(sender_thread_starts), total_thread_starts),
                "reconnection_count": len(sender_reconnections),
                "reconnection_share": _percentage(len(sender_reconnections), total_reconnections),
                "median_subsequent_thread_duration_minutes": _median(
                    [r["subsequent_thread_duration_minutes"] for r in sender_reconnections]
                ),
                "median_subsequent_thread_turn_count": _median(
                    [r["subsequent_thread_turn_count"] for r in sender_reconnections]
                ),
                "follow_up_count": len(sender_followups),
                "follow_up_relevant_turn_count": len(relevant_turns),
                "follow_up_rate": _percentage(len(followup_turn_ids), len(relevant_turns)) if relevant_turns else None,
                "median_follow_up_delay_minutes": _median([f["delay_minutes"] for f in sender_followups]),
            }
        )

    return {
        "period": {
            "label": label,
            "start": scoped_records[0]["timestamp"].date().isoformat() if scoped_records else None,
            "end": scoped_records[-1]["timestamp"].date().isoformat() if scoped_records else None,
            "window_indices": window_indices,
            "message_count": len(scoped_records),
            "active_days": active_days,
            "turn_count": total_turns,
            "thread_count": total_thread_starts,
            "reconnection_count": total_reconnections,
        },
        "participants": summaries,
    }


def _relevant_followup_turn(turn: dict, turns: list[dict]) -> bool:
    if turn["message_count"] > 1:
        return True
    if turn["open_at_export_end"]:
        return False
    next_index = turn["id"] + 1
    return next_index < len(turns) and not turns[next_index]["starts_thread"] and turns[next_index]["sender"] != turn["sender"]


def _early_late(windows, records, turns, replies, reconnections, followups, participants):
    eligible = [w for w in windows if w["eligible"]]
    if len(eligible) < EARLY_LATE_MIN_ELIGIBLE_WINDOWS:
        return _unavailable("early_late", "Early versus late", f"Requires {EARLY_LATE_MIN_ELIGIBLE_WINDOWS} eligible windows; found {len(eligible)}.")
    return _comparison(
        "early_late",
        "Early versus late",
        "Early eligible windows",
        "Late eligible windows",
        eligible[:EARLY_LATE_WINDOW_COUNT],
        eligible[-EARLY_LATE_WINDOW_COUNT:],
        records,
        turns,
        replies,
        reconnections,
        followups,
        participants,
    )


def _recent_prior(windows, records, turns, replies, reconnections, followups, participants):
    eligible = [w for w in windows if w["eligible"]]
    if len(eligible) < 2:
        return _unavailable("recent_prior", "Recent versus prior", f"Requires 2 eligible windows; found {len(eligible)}.")
    prior = eligible[-(RECENT_PRIOR_WINDOW_COUNT + 1): -RECENT_PRIOR_WINDOW_COUNT]
    recent = eligible[-RECENT_PRIOR_WINDOW_COUNT:]
    return _comparison(
        "recent_prior",
        "Recent versus prior",
        "Prior eligible window",
        "Recent eligible window",
        prior,
        recent,
        records,
        turns,
        replies,
        reconnections,
        followups,
        participants,
    )


def _comparison(kind, label, earlier_label, later_label, earlier_windows, later_windows, records, turns, replies, reconnections, followups, participants):
    earlier = _window_group(earlier_label, earlier_windows, records, turns, replies, reconnections, followups, participants)
    later = _window_group(later_label, later_windows, records, turns, replies, reconnections, followups, participants)
    return {
        "kind": kind,
        "label": label,
        "available": True,
        "unavailable_reason": None,
        "earlier_period": earlier["period"],
        "later_period": later["period"],
        "changes": _changes(earlier, later, participants),
    }


def _window_group(label, windows, records, turns, replies, reconnections, followups, participants):
    ranges = [(_parse_date(w["start"]), _parse_date(w["end"]) + timedelta(days=1)) for w in windows]
    summary = _summarize_scope(
        label,
        [w["index"] for w in windows],
        records,
        turns,
        replies,
        reconnections,
        followups,
        participants,
        lambda ts: any(start <= ts.date() < end for start, end in ranges),
    )
    summary["period"]["start"] = windows[0]["start"] if windows else None
    summary["period"]["end"] = windows[-1]["end"] if windows else None
    return summary


def _changes(earlier, later, participants):
    changes = [
        _numeric_change(
            "messages_per_active_day",
            "Messages per active day",
            None,
            earlier,
            later,
            _rate(earlier["period"]["message_count"], earlier["period"]["active_days"]),
            _rate(later["period"]["message_count"], later["period"]["active_days"]),
            earlier["period"]["message_count"],
            later["period"]["message_count"],
            NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
            "relative",
            "Message count divided by active calendar days in each compared period.",
        )
    ]
    for sender in participants:
        left = next((p for p in earlier["participants"] if p["sender"] == sender), None)
        right = next((p for p in later["participants"] if p["sender"] == sender), None)
        if left is None or right is None:
            continue
        changes.extend(
            [
                _numeric_change("turn_share", "Turn share", sender, earlier, later, left["turn_share"], right["turn_share"], earlier["period"]["turn_count"], later["period"]["turn_count"], NOTABLE_TURN_SHARE_ABS_PCT, "absolute", "Participant turns divided by all turns in each compared period."),
                _numeric_change("median_reply_minutes", "Median reply timing", sender, earlier, later, left["median_reply_minutes"], right["median_reply_minutes"], left["reply_sample_count"], right["reply_sample_count"], NOTABLE_REPLY_LATENCY_RELATIVE_PCT, "relative", "Median delay for sender-switch replies by this participant.", MIN_REPLY_LATENCY_PER_PARTICIPANT, True),
                _numeric_change("thread_start_share", "Thread-start share", sender, earlier, later, left["thread_start_share"], right["thread_start_share"], earlier["period"]["thread_count"], later["period"]["thread_count"], NOTABLE_THREAD_START_SHARE_ABS_PCT, "absolute", "Participant thread starts divided by total thread starts in each period.", MIN_THREAD_STARTS_PER_PERIOD),
                _numeric_change("reconnection_share", "Reconnection share", sender, earlier, later, left["reconnection_share"], right["reconnection_share"], earlier["period"]["reconnection_count"], later["period"]["reconnection_count"], NOTABLE_RECONNECTION_SHARE_ABS_PCT, "absolute", "Participant reconnections divided by total reconnections after 24-hour pauses.", MIN_RECONNECTIONS_PER_PERIOD),
                _numeric_change("follow_up_rate", "Follow-ups before reply", sender, earlier, later, left["follow_up_rate"], right["follow_up_rate"], left["follow_up_relevant_turn_count"], right["follow_up_relevant_turn_count"], NOTABLE_FOLLOW_UP_RATE_ABS_PCT, "absolute", "Relevant turns with at least one same-sender follow-up before another participant responds.", MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT),
            ]
        )
    return changes


def _numeric_change(metric, label, sender, earlier, later, earlier_value, later_value, earlier_sample, later_sample, threshold, threshold_type, explanation, sample_minimum=None, faster_is_decrease=False):
    has_values = earlier_value is not None and later_value is not None
    sufficient = has_values and (sample_minimum is None or (earlier_sample >= sample_minimum and later_sample >= sample_minimum))
    absolute = _round(later_value - earlier_value, 1) if has_values else None
    relative = _round(((later_value - earlier_value) / abs(earlier_value)) * 100) if has_values and earlier_value != 0 else None
    notable = bool(
        sufficient
        and (
            abs(absolute or 0) >= threshold
            if threshold_type == "absolute"
            else abs(relative or 0) >= threshold
        )
    )
    return {
        "metric": metric,
        "label": label,
        "sender": sender,
        "earlier_value": earlier_value,
        "later_value": later_value,
        "absolute_difference": absolute,
        "relative_difference_pct": relative,
        "earlier_period": _period_label(earlier["period"]),
        "later_period": _period_label(later["period"]),
        "earlier_sample_size": earlier_sample,
        "later_sample_size": later_sample,
        "direction": _direction(absolute, faster_is_decrease) if sufficient and absolute is not None else "unavailable",
        "evidence_state": "sufficient" if sufficient else "insufficient",
        "notable": notable,
        "explanation": explanation,
        "guardrail": "This is an observable export pattern, not proof of motive or relationship status.",
    }


def _direction(delta, faster_is_decrease=False):
    if abs(delta) < 0.0001:
        return "stable"
    if faster_is_decrease:
        return "faster" if delta < 0 else "slower"
    return "increased" if delta > 0 else "decreased"


def _unavailable(kind, label, reason):
    empty = {
        "label": "Unavailable",
        "start": None,
        "end": None,
        "window_indices": [],
        "message_count": 0,
        "active_days": 0,
        "turn_count": 0,
        "thread_count": 0,
        "reconnection_count": 0,
    }
    return {
        "kind": kind,
        "label": label,
        "available": False,
        "unavailable_reason": reason,
        "earlier_period": empty,
        "later_period": empty,
        "changes": [],
    }


def _pause_summary(records, reconnections):
    gaps = [_gap(records[i - 1]["timestamp"], records[i]["timestamp"]) for i in range(1, len(records))]
    latest = gaps[-1] if gaps else None
    counts: dict[str, int] = {}
    for event in reconnections:
        counts[event["sender"]] = counts.get(event["sender"], 0) + 1
    participants = [
        {"sender": sender, "count": count, "share": _percentage(count, len(reconnections))}
        for sender, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    ]
    return {
        "long_pause_count": len(reconnections),
        "latest_gap_minutes": _round(latest) if latest is not None else None,
        "latest_gap_percentile": _percentage(len([gap for gap in gaps if latest is not None and gap <= latest]), len(gaps))
        if latest is not None
        else None,
        "reconnecting_participants": participants,
    }


def _change_insights(notable, early_late, recent_prior):
    if not notable:
        unavailable = next((c for c in [early_late, recent_prior] if not c["available"]), None)
        return [
            {
                "tone": "context",
                "title": "More eligible windows are needed" if unavailable else "No notable change crossed the threshold",
                "detail": unavailable["unavailable_reason"] if unavailable else "The compared periods did not cross the contract's notable-change thresholds.",
            }
        ]
    return [
        {
            "tone": "pattern",
            "title": f"{change['sender'] + ': ' if change['sender'] else ''}{change['label']}",
            "detail": f"{change['explanation']} {change['guardrail']}",
        }
        for change in notable[:4]
    ]


def _default_dynamics():
    return {
        "window_size_days": 7,
        "turns": [],
        "adaptive_windows": [],
        "participant_summaries": [],
        "pause_summary": {
            "long_pause_count": 0,
            "latest_gap_minutes": None,
            "latest_gap_percentile": None,
            "reconnecting_participants": [],
        },
        "early_late": _unavailable("early_late", "Early versus late", "No valid messages were found."),
        "recent_prior": _unavailable("recent_prior", "Recent versus prior", "No valid messages were found."),
        "notable_changes": [],
        "change_insights": [],
    }


def _choose_window_size(span_days: int) -> int:
    for rule in ADAPTIVE_WINDOW_RULES:
        max_span = rule["max_span_days"]
        if max_span is None or span_days <= max_span:
            return int(rule["window_days"])
    return 30


def _span_days(start: datetime, end: datetime) -> int:
    return (end.date() - start.date()).days + 1


def _gap(start: datetime, end: datetime) -> float:
    return max(0.0, (end - start).total_seconds() / 60)


def _median(values):
    clean = [value for value in values if value is not None]
    return _round(float(median(clean))) if clean else None


def _percentage(count: int, total: int) -> int:
    return 0 if total == 0 else int(_round(count / total * 100))


def _rate(count: int, denominator: int):
    return None if denominator == 0 else _round(count / denominator, 1)


def _round(value: float, digits: int = 0):
    result = js_round(float(value), digits)
    return int(result) if digits == 0 else float(result)


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _period_label(period: dict) -> dict:
    return {"label": period["label"], "start": period["start"], "end": period["end"]}
