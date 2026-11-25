#!/usr/bin/env python3
"""Generate keyframes (+metric depth) with the Atlas text-to-image task. Usage: atlas_gen.py jobs.json outdir"""
import json,sys,subprocess,os,time,concurrent.futures as cf
API='https://api.atlas.worldlabs.ai/api/v2'
def curl(args,timeout=300):
    r=subprocess.run(['curl','-s','-m',str(timeout)]+args,capture_output=True,text=True);return r.stdout
def post(path,body,timeout=300):
    return json.loads(curl(['-X','POST',API+path,'-H','Authorization: Bearer '+os.environ.get('ATLAS_API_KEY','proxy'),'-H','Content-Type: application/json','-d',json.dumps(body)],timeout))
def run(job,out):
    meta=os.path.join(out,job['id']+'.json')
    if os.path.exists(meta): return job['id'],'cached'
    body={'prompt':STYLE+' '+job['prompt'],'aspectRatio':job.get('aspect','16:9'),'numSamples':1,'returnDepth':True}
    if 'seed' in job: body['seed']=job['seed']
    op=post('/tasks:atlasTextToImage',body)
    if 'id' not in op: return job['id'],'submit failed '+json.dumps(op)[:300]
    for _ in range(40):
        if op.get('done'): break
        time.sleep(3)
        try: op=post('/operations/%s:wait'%op['id'],{'timeoutSecs':60},90)
        except Exception as e: pass
    if not op.get('done') or op.get('error'): return job['id'],'failed '+json.dumps(op.get('error'))[:300]
    f=op['response']['frames'][0]
    for name,u in (('.png',f['imageAsset']['url']),('.depth.exr',f['depth']['depthAsset']['url'])):
        subprocess.run(['curl','-s','-m','180','-o',os.path.join(out,job['id']+name),u])
    json.dump({'id':job['id'],'operation':op['id'],'prompt':body['prompt'],'promptUsed':op['response'].get('promptUsed'),'camera':f['camera'],'assets':{'image':f['imageAsset']['assetId'],'depth':f['depth']['depthAsset']['assetId']}},open(meta,'w'),indent=1)
    return job['id'],'ok'
spec=json.load(open(sys.argv[1]));STYLE=spec['style'];out=sys.argv[2];os.makedirs(out,exist_ok=True)
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(lambda j:run(j,out),spec['jobs']): print(*r,flush=True)
