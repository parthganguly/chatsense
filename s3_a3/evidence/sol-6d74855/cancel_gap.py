import sys,pathlib,importlib.util,threading,time,json,inspect
root=pathlib.Path(sys.argv[1]).resolve();spec=importlib.util.spec_from_file_location('reviewed',root/'s3_a3/dispatcher.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
line=inspect.getsourcelines(d._handoff)[1]+next(i for i,s in enumerate(inspect.getsourcelines(d._handoff)[0]) if 'out = ("result", transport(' in s)
sent=[]; start=time.monotonic()
def trace(f,e,a):
 if e=='line' and f.f_code.co_filename==d.__file__ and f.f_lineno==line:time.sleep(.12)
 return trace
def fake(*a):sent.append(time.monotonic()-start);return (200,[],b'{}')
threading.settrace(trace)
box=d._handoff(fake,{'url':'FAKE','headers':{},'body':b'{}'},.03,lambda:0.,0.)
returned=time.monotonic()-start; before=len(sent);time.sleep(.16);threading.settrace(None)
print(json.dumps({'import':d.__file__,'timeout':.03,'returned_s':returned,'sends_at_return':before,'send_observed_s':sent,'box':{k:v for k,v in box.items() if k!='result'}}))
assert before==0 and len(sent)==1
