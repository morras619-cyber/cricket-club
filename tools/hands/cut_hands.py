#!/usr/bin/env python3
"""Cuts the tutorial's hands (four on a white ground per picture) out of their backgrounds, finds each fingertip and packs the frames into one sheet
(img/ui/hands.webp; the table goes into js/handhint.js FRAMES). Only the swipe-up picture is in use so far.
usage: edit SRC to the pictures' paths, then python3 tools/hands/cut_hands.py"""
import numpy as np, json
from PIL import Image
from scipy import ndimage as ndi
U='/root/.claude/uploads/54ad0d67-eae6-5a96-ba09-24e3e4b2e539/'
SRC=[('up','859adbee-image.jpg'),('diag','6e7c60f1-image.jpg'),('side','8acf27b1-image.jpg')]
MAXH=300
frames=[]
for name,f in SRC:
    im=Image.open(U+f).convert('RGB'); a=np.array(im).astype(int); H,W=a.shape[:2]
    near=(a.min(-1)>228)
    lab,n=ndi.label(near)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))
    fg=~bg
    # soft alpha: how far from white, only near the background
    dist=255-a.min(-1)
    near_bg=ndi.binary_dilation(bg,iterations=2)
    alpha=np.where(fg,255,0).astype(float)
    soft=np.clip((dist-4)/36,0,1)*255
    alpha=np.where(near_bg&fg,soft,alpha)
    alpha=np.where(bg,0,alpha)
    # split the 4 hands at empty column gaps
    occ=(alpha>40).sum(0)>0
    cols=[];start=None
    for x in range(W):
        if occ[x] and start is None: start=x
        if not occ[x] and start is not None:
            cols.append([start,x]); start=None
    if start is not None: cols.append([start,W])
    merged=[]
    for c in cols:
        if merged and c[0]-merged[-1][1]<24: merged[-1][1]=c[1]
        else: merged.append(c)
    merged=[c for c in merged if c[1]-c[0]>90]
    print(name,len(merged),merged)
    for i,(x0,x1) in enumerate(merged):
        ys=np.nonzero((alpha[:,x0:x1]>40).any(1))[0]; y0,y1=ys.min(),ys.max()+1
        rgb=a[y0:y1,x0:x1]; al=alpha[y0:y1,x0:x1]
        # colour of soft edge pixels: pull away from white
        al1=np.maximum(al/255,0.05)[...,None]
        col=np.clip((rgb-255*(1-al1))/al1,0,255)
        col=np.where((al>=250)[...,None],rgb,col)
        # skin mask for the fingertip: topmost skin-coloured pixel row
        r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
        skin=(r>170)&(r-b>60)&(g>90)&(g<190)&(al>200)
        sy,sx=np.nonzero(skin)
        tip=None
        if len(sy):
            # the pointing finger: the highest/farthest skin pixel in the direction of the finger: up: min y; side: max x; diag: max (x-y)
            if name=='up': k=np.argmin(sy)
            elif name=='side': k=np.argmax(sx)
            else: k=np.argmax(sx-sy)
            tip=(int(sx[k]),int(sy[k]))
        out=Image.fromarray(np.dstack([col,al]).astype(np.uint8),'RGBA')
        frames.append((name,i,out,tip))
# scale so the tallest hand is MAXH, same scale for all
sc=MAXH/max(f[2].height for f in frames)
print('scale',round(sc,3))
rows=[];x=0;meta=[]
atlas=Image.new('RGBA',(sum(int(f[2].width*sc)+4 for f in frames),MAXH+4),(0,0,0,0))
for name,i,im,tip in frames:
    w,h=int(im.width*sc),int(im.height*sc); r=im.resize((w,h),Image.LANCZOS); atlas.alpha_composite(r,(x,0))
    meta.append({'set':name,'i':i,'x':x,'y':0,'w':w,'h':h,'tip':[round(tip[0]*sc),round(tip[1]*sc)] if tip else None})
    x+=w+4
atlas=atlas.crop((0,0,x,MAXH+4)); atlas.save('hands.webp','WEBP',quality=88,method=6); atlas.save('hands.png')
json.dump(meta,open('hands.json','w'),indent=0); print(atlas.size, len(meta))
for m in meta: print(m)
