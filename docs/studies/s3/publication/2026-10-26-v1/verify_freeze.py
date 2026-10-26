"""Read-only repository freeze verification; writes receipt beside this script."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess

REPO = Path('/Users/parth/.codex/worktrees/s3-synthetic-protocol/whatsapp-analytics-ui')
PACKET = 'docs/studies/s3/2026-10-26-v1/'
ACCEPTED = '7b6cb033100126e1b9a0874b22e1f683a315211b'
FINAL = '7ed874b7a3963e560d399b7c0046f5625a2e0757'
EXPECTED_INVENTORY = 'd6af08e2ad3453bbb913a7056afec991b1f08c8a8273bde2ecf7a3bac14c8659'
EXPECTED_FREEZE = '957b6c70fc9103987c6423e7e09997109352307753ecc9c9d97dbce3f769f24a'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)

def tree(commit):
    return git('ls-tree','-r','--name-only',commit,PACKET).decode().splitlines()

def blob(commit,path):
    return git('show',f'{commit}:{path}')

def sha(b):
    return hashlib.sha256(b).hexdigest()

checks = []
def check(name,ok):
    assert ok,name
    checks.append(name)

old,new = tree(ACCEPTED),tree(FINAL)
check('HEAD is publication commit',git('rev-parse','HEAD').decode().strip()==FINAL)
check('working tree clean',git('status','--porcelain')==b'')
check('all66 accepted files unchanged',len(old)==66 and all(p in new and blob(ACCEPTED,p)==blob(FINAL,p) for p in old))
added=sorted(set(new)-set(old))
check('exactly14 additions with no removals',len(added)==14 and len(new)==80)
delta=git('diff','--name-status',ACCEPTED,FINAL).decode().splitlines()
check('entire repository delta is those additions',len(delta)==14 and set(delta)=={'A\t'+p for p in added})
check('all working copies equal publication Git objects',all((REPO/p).read_bytes()==blob(FINAL,p) for p in new))
actual={p.relative_to(REPO).as_posix() for p in (REPO/PACKET).rglob('*') if p.is_file()}
check('no unexpected filesystem files or missing files',actual==set(new))
inventory=blob(FINAL,PACKET+'SHA256SUMS')
freeze_bytes=blob(FINAL,PACKET+'FREEZE.json')
check('inventory expected hash',sha(inventory)==EXPECTED_INVENTORY)
check('freeze expected hash',sha(freeze_bytes)==EXPECTED_FREEZE)
entries={}
for line in inventory.decode().splitlines():
    match=re.fullmatch(r'([0-9a-f]{64})  (.+)',line)
    check('well-formed inventory entry '+str(len(entries)+1),match is not None)
    digest,path=match.groups()
    check('unique safe inventory path '+path,path not in entries and not Path(path).is_absolute() and '..' not in Path(path).parts)
    entries[path]=digest
expected={p[len(PACKET):] for p in new}-{'FREEZE.json','SHA256SUMS'}
check('exact78 inventory paths no omissions/extras',len(entries)==78 and set(entries)==expected)
check('every78 inventoried hash matches immutable file',all(sha(blob(FINAL,PACKET+p))==digest for p,digest in entries.items()))
freeze=json.loads(freeze_bytes)
check('freeze links accepted scientific commit and inventory',freeze['reviewed_substantive_commit']==ACCEPTED and freeze['inventory_sha256']==EXPECTED_INVENTORY and freeze['inventoried_files']==78 and set(freeze['excluded_from_inventory'])=={'FREEZE.json','SHA256SUMS'})
check('freeze records approval pending launch blocked',freeze['status']=='SCIENTIFIC_PROTOCOL_PASS_OWNER_AUTHORIZATION_PENDING_PAID_LAUNCH_BLOCKED' and freeze['inference_status']=='NOT_EXECUTED' and freeze['actual_study_provider_calls']==0 and freeze['credential_access_performed'] is False and freeze['dispatcher_implemented'] is False)
receipt={
    'verification':'PASS',
    'scientific_protocol':'PASS_AT_ACCEPTED_SUBSTANTIVE_COMMIT',
    'paid_launch':'BLOCKED',
    'verified_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'selected_model':'gpt-6.1-sol',
    'model_receipt_limit':'parent routing designation; no independent backend attestation',
    'task_id':'/root/sol_s3_falsification',
    'accepted_substantive_commit':ACCEPTED,
    'publication_freeze_commit':FINAL,
    'accepted_files_unchanged':66,
    'added_files':added,
    'tracked_and_filesystem_packet_files':80,
    'inventoried_files':78,
    'inventory_sha256':EXPECTED_INVENTORY,
    'freeze_sha256':EXPECTED_FREEZE,
    'checks_passed':len(checks),
    'document_review':{
        'files':['ASTRA-S3-PRELAUNCH.md','OWNER-AUTHORIZATION.md'],
        'result':'PASS',
        'scope':'consistent with accepted protocol and earlier independent review; no broadened or granted permission',
        'authorization':'explicitly NOT_GRANTED; caps32 requests and USD0.45 conditional; all account/contract/new-dispatcher gates retained',
        'limits':'synthetic frozen inputs only; no private exports, product changes, merges, release, fallback, replacements or unsafe resume'
    },
    'scientific_tests_rerun':False,
    'provider_calls':0,
    'network_requests':0,
    'credentials_accessed':False,
    'frozen_packet_modified':False,
    'external_publication_performed':False,
}
out=Path(__file__).parent/'receipt.json'
out.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'verdict':'PASS','checks_passed':len(checks),'receipt':str(out),'receipt_sha256':sha(out.read_bytes()),'scientific_protocol':'PASS','paid_launch':'BLOCKED'}))
