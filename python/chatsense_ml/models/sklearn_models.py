from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


DEFAULT_FEATURE_COLUMNS = [
    "hour",
    "weekday",
    "text_len",
    "word_count",
    "gap_min",
    "sender_message_share_so_far",
    "rolling_20_reply_rate",
    "rolling_20_avg_gap_min",
    "rolling_7d_message_count",
    "rolling_7d_sender_share",
    "sender",
    "message_type",
]


def build_label_classifier(feature_columns: list[str] | None = None) -> Pipeline:
    columns = feature_columns or DEFAULT_FEATURE_COLUMNS
    numeric_columns = [column for column in columns if column not in {"sender", "message_type"}]
    categorical_columns = [column for column in columns if column in {"sender", "message_type"}]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_columns,
            ),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_columns,
            ),
        ]
    )
    return Pipeline(
        [
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )


def fit_label_classifier(
    train: pd.DataFrame,
    label_column: str,
    feature_columns: list[str] | None = None,
) -> Pipeline:
    columns = _available_columns(train, feature_columns or DEFAULT_FEATURE_COLUMNS)
    labeled = train.dropna(subset=[label_column]).copy()
    model = build_label_classifier(columns)
    model.fit(labeled[columns], labeled[label_column])
    return model


def evaluate_label_classifier(
    model: Pipeline,
    test: pd.DataFrame,
    label_column: str,
    feature_columns: list[str] | None = None,
) -> dict:
    columns = _available_columns(test, feature_columns or DEFAULT_FEATURE_COLUMNS)
    labeled = test.dropna(subset=[label_column]).copy()
    if labeled.empty:
        return {"accuracy": None, "support": 0}
    predictions = model.predict(labeled[columns])
    return {"accuracy": float(accuracy_score(labeled[label_column], predictions)), "support": int(len(labeled))}


def _available_columns(df: pd.DataFrame, columns: list[str]) -> list[str]:
    return [column for column in columns if column in df.columns]
