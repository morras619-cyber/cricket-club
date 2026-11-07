#!/usr/bin/env python3
"""Find skin the kit sheets' masks miss (img/kit/<view>-mask.png: its red channel is the skin the game repaints for each player's complexion) and add it.

A forearm or elbow in one pose that the mask leaves out stays the sheet's own light tan on a dark-skinned player (the batter's straight drive was one: a white
arm). A skin-coloured patch (60 px or more) that touches the masked skin and is not the bat (each frame's biggest patch of that colour) is added to the mask.

usage: python3 tools/fix_skin_masks.py <view> [write]     (without 'write' it only reports)
Needs numpy, scipy and Pillow.
"""
import re,json,sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
view=sys.argv[1]; write=len(sys.argv)>2 and sys.argv[2]=='write'
s=open('js/kitsheets.js').read()
i=s.index('"%s":{"frames"'%view); j=s.index('"size"',i)
frames=json.loads(re.search(r'"frames":(\[\[.*?\]\])',s[i:j]).group(1))
img=np.asarray(Image.open(f'img/kit/{view}.webp').convert('RGBA')).astype(float)
mimg=Image.open(f'img/kit/{view}-mask.png').convert('RGBA'); mask=np.asarray(mimg).copy()
R=mask[...,0]>127; a=img[...,3]>200
rgb=img[...,:3]/255; mx=rgb.max(-1); mn=rgb.min(-1); d=mx-mn+1e-6
h=np.where(mx==rgb[...,0],((rgb[...,1]-rgb[...,2])/d)%6,np.where(mx==rgb[...,1],(rgb[...,2]-rgb[...,0])/d+2,(rgb[...,0]-rgb[...,1])/d+4))*60
sat=d/(mx+1e-6); v=mx
sk=R&a; hm=np.median(h[sk])
cand=a&~R&(abs(h-hm)<18)&(sat>0.22)&(sat<0.8)&(v>0.28)
near=ndi.binary_dilation(R,iterations=4)
add=np.zeros_like(R)
tot=0
for n,(x,y,w,hh,*_) in enumerate(frames):
    c=cand[y:y+hh,x:x+w]; lab,k=ndi.label(c)
    if not k: continue
    sizes=ndi.sum(c,lab,range(1,k+1)); big=int(np.argmax(sizes))
    nr=near[y:y+hh,x:x+w]
    for idx in range(k):
        if idx==big or sizes[idx]<60: continue
        comp=lab==idx+1
        # keep a component that touches the existing skin (dilated), and is not the bat (the bat is the biggest)
        if (comp&nr).sum()>=max(6,0.08*sizes[idx]):
            add[y:y+hh,x:x+w]|=comp; tot+=int(sizes[idx]); print(view,n,'add',int(sizes[idx]))
print('total added px',tot)
if write:
    # a little closing so the edge pixels follow
    add=ndi.binary_closing(add,iterations=1)&a
    mask[...,0]=np.where(add,255,mask[...,0])
    Image.fromarray(mask,'RGBA').save(f'img/kit/{view}-mask.png',optimize=True)
