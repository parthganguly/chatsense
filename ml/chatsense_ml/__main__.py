from __future__ import annotations

import argparse
import json
from pathlib import Path

from .pipeline import analyze_chat_file


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze a WhatsApp chat export.")
    parser.add_argument("input", help="Path to a WhatsApp .txt export or .zip archive.")
    parser.add_argument("--output", "-o", help="Path to write analysis JSON.")
    parser.add_argument("--ask", help="Ask a grounded question over the chat archive.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    args = parser.parse_args()

    result = analyze_chat_file(args.input, question=args.ask)
    output = json.dumps(result.to_json(), indent=2 if args.pretty else None, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
    else:
        print(output)


if __name__ == "__main__":
    main()
