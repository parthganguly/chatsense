from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

from chatsense_ml.forecasting.evaluation import evaluate_forecasting_research
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.pipeline import build_core_features_frame


def normalized_forecasting_parity_from_text(text: str, source_name: str = "forecasting-fixture.txt") -> dict:
    conversation = parse_text(text, source_name)
    frame = build_core_features_frame(conversation)
    report = evaluate_forecasting_research(frame, dataset_kind="synthetic", dataset_identity=source_name)
    return _normalize(report)


def normalized_forecasting_parity_from_path(path: str | Path) -> dict:
    fixture_path = Path(path)
    return normalized_forecasting_parity_from_text(fixture_path.read_text(encoding="utf-8"), fixture_path.name)


def _normalize(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    if isinstance(value, float):
        return int(value) if value.is_integer() else round(value, 6)
    if isinstance(value, dict):
        return {
            _camel_to_snake(str(key)): _normalize(value[key])
            for key in sorted(value, key=lambda item: _camel_to_snake(str(item)))
        }
    return value


def _camel_to_snake(value: str) -> str:
    return re.sub(r"(?<!^)([A-Z])", r"_\1", value).lower()


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    if len(args) != 1:
        raise SystemExit("Usage: python -m chatsense_ml.forecasting.parity <fixture.txt>")
    print(json.dumps(normalized_forecasting_parity_from_path(args[0]), sort_keys=True))


if __name__ == "__main__":
    main()
