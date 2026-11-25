#!/usr/bin/env python3
"""Pack an Atlas RGB + linear-depth EXR pair into web assets: <id>.jpg + <id>.depth.png (16-bit inverse depth in R,G) + camera meta.
Usage: pack_world.py <src.png|jpg> <depth.exr> <meta.json> <outdir> <id> [maxw]"""
import sys,json,numpy as np,OpenEXR,Imath
from PIL import Image
src,exr,meta,out,wid=sys.argv[1:6];maxw=int(sys.argv[6]) if len(sys.argv)>6 else 1600
f=OpenEXR.InputFile(exr);h=f.header();dw=h['dataWindow'];W=dw.max.x-dw.min.x+1;H=dw.max.y-dw.min.y+1
ch=list(h['channels'].keys());c=[k for k in ch if k in('Z','Y','R','depth','V')] or ch
z=np.frombuffer(f.channel(c[0],Imath.PixelType(Imath.PixelType.FLOAT)),dtype=np.float32).reshape(H,W).copy()
ok=np.isfinite(z)&(z>0);near=float(np.percentile(z[ok],.5));far=float(min(np.percentile(z[ok],99.5),near*400))
z[~ok]=far;z=np.clip(z,near,far)
inv=(1/z-1/far)/(1/near-1/far)
DW=384 if W>=H else 216;DH=round(DW*H/W)
im=Image.fromarray(inv.astype(np.float32),mode='F').resize((DW,DH),Image.BILINEAR)
v=np.clip(np.asarray(im)*65535,0,65535).astype(np.uint16)
rgb=np.zeros((DH,DW,3),np.uint8);rgb[...,0]=v>>8;rgb[...,1]=v&255
Image.fromarray(rgb).save(f'{out}/{wid}.depth.png',optimize=True)
img=Image.open(src).convert('RGB');iw,ih=img.size
if iw>maxw: img=img.resize((maxw,round(maxw*ih/iw)),Image.LANCZOS)
img.save(f'{out}/{wid}.jpg',quality=84,optimize=True,progressive=True)
m=json.load(open(meta));K=m['camera']['intrinsics']
print(json.dumps({'id':wid,'near':round(near,4),'far':round(far,3),'fovY':round(float(2*np.degrees(np.arctan(K['height']/2/K['fy']))),3),'aspect':round(K['width']/K['height'],5),'depthSize':[DW,DH],'exr':[W,H],'channels':ch}))
