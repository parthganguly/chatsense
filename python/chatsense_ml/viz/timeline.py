from __future__ import annotations

import pandas as pd


def daily_activity_frame(features: pd.DataFrame) -> pd.DataFrame:
    return features.groupby(["date", "sender"]).size().reset_index(name="messages")


def ipyvizzu_daily_activity(features: pd.DataFrame):
    from ipyvizzu import Chart, Data, Config

    data = Data()
    data.add_df(daily_activity_frame(features))
    chart = Chart()
    chart.animate(data)
    chart.animate(Config({"x": "date", "y": "messages", "color": "sender"}))
    return chart
