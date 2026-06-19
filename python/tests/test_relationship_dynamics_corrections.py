from __future__ import annotations

from datetime import datetime, timedelta

from chatsense_ml.features.relationship_dynamics import relationship_dynamics
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.pipeline import build_core_features_frame


def test_reply_latency_notable_threshold_requires_ratio_and_absolute_change():
    two_to_four = _dynamics(_reply_latency_fixture(2, 4))
    two_to_four_change = _change(two_to_four, "early_late", "median_reply_minutes", "Ravi")
    assert two_to_four_change["evidence_state"] == "sufficient"
    assert two_to_four_change["earlier_value"] == 2
    assert two_to_four_change["later_value"] == 4
    assert two_to_four_change["notable"] is False

    ten_to_twenty_five = _dynamics(_reply_latency_fixture(10, 25))
    ten_to_twenty_five_change = _change(ten_to_twenty_five, "early_late", "median_reply_minutes", "Ravi")
    assert ten_to_twenty_five_change["evidence_state"] == "sufficient"
    assert ten_to_twenty_five_change["earlier_value"] == 10
    assert ten_to_twenty_five_change["later_value"] == 25
    assert ten_to_twenty_five_change["notable"] is True

    exact_boundary = _dynamics(_reply_latency_fixture(10, 20))
    assert _change(exact_boundary, "early_late", "median_reply_minutes", "Ravi")["notable"] is True

    below_ratio_boundary = _dynamics(_reply_latency_fixture(10, 19))
    assert _change(below_ratio_boundary, "early_late", "median_reply_minutes", "Ravi")["notable"] is False


def test_latest_gap_percentile_uses_only_earlier_gaps():
    dynamics = _dynamics(
        "\n".join(
            [
                "01/01/2026, 09:00 - Asha: one",
                "01/01/2026, 09:10 - Ravi: two",
                "01/01/2026, 09:30 - Asha: three",
                "01/01/2026, 09:45 - Ravi: four",
            ]
        )
    )

    assert dynamics["pause_summary"]["latest_gap_minutes"] == 15
    assert dynamics["pause_summary"]["latest_gap_percentile"] == 50
    assert dynamics["pause_summary"]["median_inter_message_gap_minutes"] == 15
    assert [
        (pause["duration_minutes"], pause["reconnecting_sender"])
        for pause in dynamics["pause_summary"]["longest_pauses"]
    ] == [(20, "Asha"), (15, "Ravi"), (10, "Ravi")]

    single_gap = _dynamics("\n".join(["01/01/2026, 09:00 - Asha: one", "01/01/2026, 09:10 - Ravi: two"]))
    assert single_gap["pause_summary"]["latest_gap_minutes"] == 10
    assert single_gap["pause_summary"]["latest_gap_percentile"] is None


def _dynamics(text: str) -> dict:
    return relationship_dynamics(build_core_features_frame(parse_text(text, "correction-fixture.txt")))


def _change(dynamics: dict, comparison: str, metric: str, sender: str | None) -> dict:
    result = next(
        (
            change
            for change in dynamics[comparison]["changes"]
            if change["metric"] == metric and change["sender"] == sender
        ),
        None,
    )
    assert result is not None
    return result


def _reply_latency_fixture(early_delay_minutes: int, late_delay_minutes: int) -> str:
    lines: list[str] = []
    delays = [early_delay_minutes, early_delay_minutes, late_delay_minutes, late_delay_minutes]
    for window_index, delay in enumerate(delays):
        first_day_of_window = 1 + window_index * 7
        for day_offset in range(2):
            for pair in range(5):
                sent = datetime(2026, 1, first_day_of_window + day_offset, 9 + pair * 2, 0)
                lines.append(_line(sent, "Asha", f"prompt {window_index}-{day_offset}-{pair}"))
                lines.append(_line(sent + timedelta(minutes=delay), "Ravi", f"reply {window_index}-{day_offset}-{pair}"))
    return "\n".join(lines)


def _line(timestamp: datetime, sender: str, text: str) -> str:
    return f"{timestamp:%d/%m/%Y, %H:%M} - {sender}: {text}"
