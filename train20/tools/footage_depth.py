#!/usr/bin/env python3
"""Video -> world: pull a frame from an el-desierto final clip and ask Atlas images2PosedRGBD for its camera + depth."""
import json,sys,subprocess,os,base64,time,concurrent.futures as cf
API='https://api.atlas.worldlabs.ai/api/v2';out=sys.argv[2]
FIN=json.load(open(os.environ.get('FINALS','../el-desierto/finals_urls.json')))   # clip id -> release URL
def post(path,body,t=300):
    r=subprocess.run(['curl','-s','-m',str(t),'-X','POST',API+path,'-H','Authorization: Bearer '+os.environ.get('ATLAS_API_KEY','proxy'),'-H','Content-Type: application/json','-d','@-'],input=json.dumps(body),capture_output=True,text=True);return json.loads(r.stdout)
def run(j):
    wid=j['id'];meta=f'{out}/{wid}.json'
    if os.path.exists(meta): return wid,'cached'
    mp4=f'{out}/{j["clip"]}.mp4'
    if not os.path.exists(mp4): subprocess.run(['curl','-sL','-m','240','-o',mp4,FIN[j['clip']]])
    png=f'{out}/{wid}.png'
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(j['t']),'-i',mp4,'-frames:v','1',png])
    from PIL import Image
    w,h=Image.open(png).size
    body={'frames':[{'imageAsset':{'base64':base64.b64encode(open(png,'rb').read()).decode()}}],'canonicalizeToFirstFrame':True,'targetResolution':[720,1280] if h>w else [1280,720]}
    op=post('/tasks:images2PosedRGBD',body)
    if 'id' not in op: return wid,'submit failed '+json.dumps(op)[:400]
    for _ in range(60):
        if op.get('done'): break
        time.sleep(3)
        try: op=post('/operations/%s:wait'%op['id'],{'timeoutSecs':60},90)
        except Exception: pass
    if not op.get('done') or op.get('error'): return wid,'failed '+json.dumps(op.get('error'))[:400]
    f=op['response']['frames'][0]
    subprocess.run(['curl','-s','-m','180','-o',f'{out}/{wid}.depth.exr',f['depth']['depthAsset']['url']])
    json.dump({'id':wid,'clip':j['clip'],'t':j['t'],'operation':op['id'],'camera':f['camera']},open(meta,'w'),indent=1)
    return wid,'ok'
jobs=json.load(open(sys.argv[1]))
with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(run,jobs): print(*r,flush=True)
