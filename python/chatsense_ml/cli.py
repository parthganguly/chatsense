from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console

from chatsense_ml.pipeline import analyze_file

app = typer.Typer(help="ChatSense local WhatsApp analytics.")
console = Console()


@app.callback()
def main() -> None:
    """Local-first ChatSense ML tools."""


@app.command()
def analyze(
    input_path: Annotated[Path, typer.Argument(exists=True, dir_okay=False, help="WhatsApp .zip or .txt export.")],
    out: Annotated[Path, typer.Option("--out", help="Path to write report.json.")],
    features: Annotated[Path | None, typer.Option("--features", help="Optional path to write features.parquet.")] = None,
) -> None:
    """Analyze a WhatsApp export into JSON metrics and optional Parquet features."""
    report = analyze_file(input_path, out, features)
    console.print(f"[green]Wrote report:[/green] {out}")
    if features:
        console.print(f"[green]Wrote features:[/green] {features}")
    console.print(
        f"Messages: {report['conversation']['message_count']} | "
        f"Participants: {report['conversation']['participant_count']}"
    )
