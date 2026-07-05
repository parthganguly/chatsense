# Debug APK releases

ChatSense publishes Android debug builds as GitHub pre-releases for testing.
They are not production-ready, are not Play Store signed, and must never be
described as production builds.

Every published APK must have two companion forms of provenance:

- an `app-debug.apk.sha256` release asset computed from the exact uploaded APK;
- a `release-metadata.json` asset recording the commit, source ref, build type,
  workflow URL, byte size, and SHA-256 digest.

APKs and checksum files are release artifacts. Do not commit them to Git.

## Automated workflow

`.github/workflows/release-debug-apk.yml` runs on every push to `main` and can
also be started manually with `workflow_dispatch`. Before publishing, it:

1. installs dependencies with Node 22, Python 3.13, and Java 21;
2. runs lint, type checking, JavaScript and Python tests, parity tests,
   forecasting evaluations, and the production web build;
3. synchronizes Capacitor, runs Gradle tests, and assembles the debug APK;
4. computes the APK byte size and SHA-256 digest;
5. uploads the APK, checksum, and release metadata as a retained Actions
   artifact;
6. creates or safely updates the `debug-apk-<shortsha>` GitHub pre-release.

The update path is idempotent. It overwrites only the three matching assets on
the release for that commit. If the expected tag points at a different commit,
the workflow fails rather than altering an unrelated release.

GitHub-hosted runners do not provide the physical Android device needed by
Maestro. Maestro therefore remains a separate local phone QA gate.

## Artifact location

The generated debug APK is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

List all repo-local APKs from PowerShell:

```powershell
Get-ChildItem -Recurse -Filter *.apk |
  Select-Object FullName, Length, LastWriteTime
```

Do not release APKs from temporary folders, Trash, unrelated repositories, or
unknown build origins. Do not release duplicate APKs with the same SHA-256.
Every APK must be tied to a specific commit.

## Manual local release

Use this only for a commit whose APK was built and verified locally. Start from
a clean worktree on the exact source commit.

```powershell
$apk = Resolve-Path "android/app/build/outputs/apk/debug/app-debug.apk"
$fullSha = git rev-parse HEAD
$shortSha = $fullSha.Substring(0, 7)
$tag = "debug-apk-$shortSha"
$sha = (Get-FileHash $apk -Algorithm SHA256).Hash.ToLower()
$size = (Get-Item $apk).Length
$checksum = Join-Path $env:TEMP "app-debug.apk.sha256"
"$sha  app-debug.apk" | Out-File -Encoding ascii $checksum
```

Confirm that the tag and release do not already exist, then publish a
pre-release. The notes must include the full commit SHA, branch/source, APK
path and filename, byte size, SHA-256, debug build type, known verification,
and testing limitations.

```powershell
git ls-remote --tags origin "refs/tags/$tag"
gh release view $tag --repo parthganguly/chatsense

gh release create $tag `
  $apk `
  $checksum `
  --repo parthganguly/chatsense `
  --title "ChatSense Debug APK $shortSha" `
  --notes "Debug build / not production-ready. Commit: $fullSha. Size: $size bytes. SHA-256: $sha. No Play Store signing; for testing only." `
  --prerelease `
  --target $fullSha
```

Delete the temporary checksum after verifying the uploaded assets. Never use
`--clobber` against an unrelated release or tag.

## Verify a downloaded release

Download both assets into the same directory. On PowerShell:

```powershell
$expected = (Get-Content .\app-debug.apk.sha256).Split()[0].ToLower()
$actual = (Get-FileHash .\app-debug.apk -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $expected) { throw "APK checksum mismatch" }
```

On Linux or macOS:

```bash
sha256sum --check app-debug.apk.sha256
```

## Data and release safety

Release assets may contain only generated application artifacts and their
provenance metadata. Never upload chat exports, participant data, screenshots,
generated reports, packed AI context, environment files, signing keys, or
other personal data.
