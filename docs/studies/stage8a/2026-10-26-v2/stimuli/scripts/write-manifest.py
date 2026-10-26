"""Build a v2 stimulus manifest only from accepted, freshly captured app evidence.
Run from the repository root. Does not render, scale, rewrite or collect responses.
"""
import hashlib
import json
import struct
import subprocess
from pathlib import Path

repo = Path.cwd()
stimuli = Path(__file__).resolve().parent.parent
packet = stimuli.parent
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_text())
plan = read(stimuli / "capture-plan.json")
capture = read(stimuli / "verification/capture-run.json")
expected_cards = read(stimuli / "expected/cards.json")
assert plan["uxDecision"] == "PASS"
assert plan["humanStudyDecision"] == "NOT_RUN"
assert capture["acceptedCodeCommit"] == plan["acceptedCodeCommit"]
assert len(capture["cards"]) == len(expected_cards) == 5
assert not (stimuli / "manifest.json").exists(), "Do not overwrite a prior manifest."
v1_commit = "64efc6d0018106d0644dc620ffca8939ac50c088"
v1_path = "docs/studies/stage8a/2026-10-24-v1/stimuli/manifest.json"
v1_bytes = subprocess.check_output(["git", "show", v1_commit + ":" + v1_path], cwd=repo)
v1 = json.loads(v1_bytes)
old_by_id = {c["id"]: c for c in v1["cards"]}
actual_by_id = {c["id"]: c for c in capture["cards"]}
entries = []
for expected in expected_cards:
    c = actual_by_id[expected["id"]]
    old = old_by_id[expected["sourceV1Id"]]
    for key in ("fixtureSha256", "expectedReadSha256", "frozenNowMs", "frozenNowIso"):
        assert c[key] == expected[key] == old[key], (expected["id"], key)
    read_bytes = (stimuli / expected["expectedRead"]).read_bytes()
    fixture_bytes = (stimuli / expected["fixture"]).read_bytes()
    assert sha(read_bytes) == expected["expectedReadSha256"]
    assert sha(fixture_bytes) == expected["fixtureSha256"]
    read_value = json.loads(read_bytes)
    selected = c["contexts"]["selected"]
    text_bytes = (stimuli / "captures" / (c["id"] + ".innerText.txt")).read_bytes()
    assert sha(text_bytes) == old["renderedInnerTextSha256"] == selected["textSha256"]
    assert text_bytes.decode() == old["renderedInnerText"]
    for mode, context in c["contexts"].items():
        assert context["exactV1Text"] is True and context["pageErrors"] == []
        assert context["textSha256"] == old["renderedInnerTextSha256"]
        for item in context["files"]:
            assert sha((stimuli / item["file"]).read_bytes()) == item["sha256"], item["file"]
        assert all(row["contrastRatio"] >= 4.5 for row in context["measure"]["text"])
        assert all(a["opacity"] >= 0.999999 for a in context["geometry"]["ancestorOpacity"])
    assert selected["geometry"]["fullyInsideMain"] is True
    assert c["contexts"]["desktopAudit"]["geometry"]["limitationFirstFrameClearancePx"] >= 1
    png = stimuli / c["selectedScreenshot"]
    png_bytes = png.read_bytes()
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"
    width, height = struct.unpack(">II", png_bytes[16:24])
    assert width == 344 and {"width": width, "height": height} == c["selectedDimensions"]
    assert height <= 800, "Amend the preregistered display rule before freeze; never scale/crop."
    limitation = next(r for r in selected["measure"]["text"] if r["text"] == read_value["limitation"])
    assert limitation["fontSizePx"] >= 14 and limitation["lineHeightPx"] >= 20
    before_image = next(x for x in old["captures"] if x["file"].endswith(".desktop-1280x1000.card.png"))
    text_delta = []
    for row in selected["measure"]["text"]:
        before = [r for r in old["textContrast"] if row["text"].startswith(r["text"])]
        assert len(before) == 1, "Ambiguous v1 typography mapping: " + row["text"]
        before = before[0]
        text_delta.append({"text": row["text"], "v1FontSizePx": before["fontSizePx"],
                           "v2FontSizePx": row["fontSizePx"], "v1Foreground": before["color"],
                           "v2Foreground": row["color"], "v1ContrastRounded": before["contrastRatio"],
                           "v2Contrast": row["contrastRatio"], "v2LineHeightPx": row["lineHeightPx"]})
    entries.append({**expected, "renderedInnerText": text_bytes.decode(),
                    "renderedInnerTextSha256": sha(text_bytes), "verbatimV1Text": True,
                    "selected": {"file": c["selectedScreenshot"], "sha256": sha(png_bytes),
                                 "width": width, "height": height, "deviceScaleFactor": 1,
                                 "fullyInsideActualMainBeforeScreenshot": True},
                    "v1Selected": {**before_image, "width": old["desktopCardBox"]["width"],
                                   "height": old["desktopCardBox"]["height"]},
                    "v1ComputedBorder": old["computedBorder"],
                    "v2ComputedBorderColors": selected["measure"]["borders"],
                    "typographyDelta": text_delta, "limitation": limitation,
                    "contexts": c["contexts"]})

manifest = {
    "study": "ChatSense Stage 8A P0 v2", "version": "2026-10-26-v2",
    "status": "CAPTURED_FROM_UX_ACCEPTED_CODE",
    "producedBy": "Astra; actual rendered app through synthetic file input",
    "humanObservations": 0, "humanStudyDecision": "NOT_RUN",
    "recruitmentAuthorized": False, "stage8bAuthorized": False,
    "acceptedCodeCommit": plan["acceptedCodeCommit"], "capturePlan": plan,
    "captureRunSha256": sha((stimuli / "verification/capture-run.json").read_bytes()),
    "v1Commit": v1_commit, "v1ManifestPath": v1_path, "v1ManifestSha256": sha(v1_bytes),
    "captureTimestamp": capture["capturedAtUtc"], "buildId": capture["nextBuildId"],
    "environment": {k: capture[k] for k in ("browser", "playwright", "node", "platform", "arch", "locale", "timezone", "colorScheme")},
    "importPath": capture["importPath"], "captureContexts": capture["contexts"],
    "presentation": {"selectedOnly": True, "cssImageWidth": 344, "scalePercent": 100,
                     "minimumUsableDisplayWidthCssPx": 384, "minimumUsableDisplayHeightCssPx": 800,
                     "maximumSelectedImageHeight": max(e["selected"]["height"] for e in entries),
                     "instruction": "Show only the selected complete PNG at one image pixel per CSS pixel; no zoom-to-fit, crop, reconstruction, extra caption or highlighting. Timer starts only with the whole card visible. Audit first-screen images are not participant stimuli."},
    "cards": entries,
}
(stimuli / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print("Manifest created for five newly captured real app cards. Independent packet review and freeze remain required.")
