# Publication verification receipt

Sol independently verified the immutable S3 freeze at `7ed874b7a3963e560d399b7c0046f5625a2e0757` after scientific acceptance of `7b6cb033100126e1b9a0874b22e1f683a315211b`. All 169 freeze/inventory assertions passed. The 66 reviewed files were unchanged; the 80-file packet and 78-entry inventory were complete. Paid launch remains BLOCKED.

These byte-identical receipt and verifier copies are published outside the frozen packet to avoid a circular audit. Receipt SHA-256: `3a79d5c5c7989426fb0259704137cc18b14885379e2e3f6bd00651f1092ccd23`. No scientific content is changed by this publication.

The verifier is a preserved historical script: it asserts the original absolute worktree is clean at the freeze commit and writes a receipt beside itself. It is not a live dispatcher or a portable launcher. Do not run it against a later publication HEAD and expect that exact-commit assertion to pass. The packet SHA256SUMS is independently checkable from the packet directory using `shasum -a 256 -c SHA256SUMS`.
