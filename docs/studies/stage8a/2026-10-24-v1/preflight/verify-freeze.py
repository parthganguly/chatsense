"""Verify the immutable packet inventory; never touches participant data."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
freeze = json.loads((root / 'FREEZE.json').read_text())
entries = freeze['files']
assert len({e['path'] for e in entries}) == len(entries), 'duplicate inventory path'
for entry in entries:
    file = root / entry['path']
    assert file.is_file(), f'Missing: {entry["path"]}'
    assert file.stat().st_size == entry['bytes'], f'Size changed: {entry["path"]}'
    assert hashlib.sha256(file.read_bytes()).hexdigest() == entry['sha256'], f'Changed: {entry["path"]}'
inventory = ''.join(f'{e["sha256"]}  {e["path"]}\n' for e in entries)
assert hashlib.sha256(inventory.encode()).hexdigest() == freeze['inventory_sha256']
actual = {str(f.relative_to(root)) for f in root.rglob('*') if f.is_file()
          and '__pycache__' not in f.parts and f.name not in {'FREEZE.json', '.DS_Store'}
          and f.suffix not in {'.pyc', '.pyo'}}
assert actual == {e['path'] for e in entries}, 'Unlisted or missing artifact'
print(f'Freeze verified: {len(entries)} files; inventory SHA-256 {freeze["inventory_sha256"]}')
print('FREEZE.json SHA-256 ' + hashlib.sha256((root/'FREEZE.json').read_bytes()).hexdigest())
print('Human study NOT_RUN; recruitment not authorized; Stage 8B blocked.')
