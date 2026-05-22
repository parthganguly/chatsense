# ChatSense ML

This package is the Python analysis layer for ChatSense. It keeps the first production path local-first and dependency-light while leaving room for heavier data science packages in notebooks or a later API service.

## What It Does Now

- Parses WhatsApp `.txt` exports and `.zip` archives containing a chat export.
- Normalizes messages into typed Python records.
- Computes rhythm, balance, reply, gap, sentiment, topic, and moment features.
- Builds a small local retrieval index for the future "Ask Chat" experience.
- Exports a stable `analysis.json` object for the web app.

## Run

From the repository root:

```bash
PYTHONPATH=ml python3 -m chatsense_ml ml/fixtures/sample_chat.txt --pretty
```

Write output to a file:

```bash
PYTHONPATH=ml python3 -m chatsense_ml chat.txt --output analysis.json --pretty
```

Ask a grounded question:

```bash
PYTHONPATH=ml python3 -m chatsense_ml chat.txt --ask "When did the tone change?"
```

## Optional Lab Dependencies

The core package uses the Python standard library so it works in constrained local environments. For notebooks and future model experiments:

```bash
python3 -m pip install -e "ml[lab]"
```

The likely next ML upgrades are embeddings for topics, emotion classifiers, and a stronger retrieval pipeline for Ask Chat.
