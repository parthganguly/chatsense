from __future__ import annotations

from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.pipeline import build_features_frame
from chatsense_ml.graphs.interaction_graph import build_interaction_graph


def test_features_and_labels_are_created_without_future_leakage():
    text = "\n".join(
        [
            "01/01/2026, 09:00 - Asha: first",
            "01/01/2026, 09:03 - Ravi: fast reply",
            "01/01/2026, 10:00 - Asha: later",
            "02/01/2026, 12:30 - Ravi: next day",
            "02/01/2026, 12:34 - Asha: quick again",
        ]
    )
    conversation = parse_text(text, "sample.txt")

    features = build_features_frame(conversation)

    assert features.loc[1, "reply_delay_min"] == 3
    assert features.loc[0, "next_reply_delay_bucket"] == "<5m"
    assert features.loc[len(features) - 1, "next_reply_delay_bucket"] is None
    assert "rolling_20_reply_rate" in features
    assert "next_window_imbalance_change" in features


def test_next_reply_delay_bucket_uses_next_other_sender():
    text = "\n".join(
        [
            "01/01/2026, 09:00 - Asha: first",
            "01/01/2026, 09:02 - Asha: follow up",
            "01/01/2026, 09:04 - Asha: one more",
            "01/01/2026, 09:40 - Ravi: actual response",
            "01/01/2026, 09:45 - Ravi: same sender follow up",
        ]
    )
    features = build_features_frame(parse_text(text, "sample.txt"))

    assert features.loc[0, "next_reply_delay_bucket"] == "30m-2h"
    assert features.loc[1, "next_reply_delay_bucket"] == "30m-2h"
    assert features.loc[2, "next_reply_delay_bucket"] == "30m-2h"
    assert features.loc[3, "next_reply_delay_bucket"] is None


def test_graph_edges_follow_reply_direction():
    text = "\n".join(
        [
            "01/01/2026, 09:00 - Asha: first",
            "01/01/2026, 09:03 - Ravi: reply",
            "01/01/2026, 09:04 - Asha: reply back",
        ]
    )
    features = build_features_frame(parse_text(text, "sample.txt"))

    graph = build_interaction_graph(features)

    assert graph["Ravi"]["Asha"]["weight"] == 1
    assert graph["Asha"]["Ravi"]["weight"] == 1
