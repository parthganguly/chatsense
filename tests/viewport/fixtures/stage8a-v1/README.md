# Stage 8A P0 v1 synthetic card inputs (test copy)

Byte-for-byte copies from the frozen P0 v1 packet at commit
`64efc6d0018106d0644dc620ffca8939ac50c088`,
`docs/studies/stage8a/2026-10-24-v1/stimuli/`:

| Here | v1 source |
| --- | --- |
| `cards.json` | `expected/cards.json` (ids, frozen clocks; its `fixture`/`expectedRead` paths are relative to v1 `stimuli/`) |
| `<id>.txt` | `fixtures/<id>.txt` (synthetic WhatsApp exports) |
| `<id>.relationship-read.json` | `expected/<id>.relationship-read.json` |
| `<id>.card.innerText.txt` | `captures/<id>.card.innerText.txt` (rendered card text) |

The SHA-256 of every copied fixture and expected read matches `cards.json` and
`docs/verification/stage8a-option-b/BEFORE-MANIFEST.json`. The innerText SHA-256
of each card matches that manifest's `renderedInnerTextSha256`. Used by
`tests/viewport/relationship-read-card.spec.ts`. Don't edit these files: they
are the scientific reference the card text has to keep matching.
