#!/usr/bin/env python3
"""Where the buildings stand on the club map (SITES in js/clubmap.js): each is fitted to its plot in img/map/base.webp (the plot found by its bare ground),
its base's middle on the plot's middle and its base as wide as the plot (times K).

usage: python3 tools/fit_map_sites.py [K [preview.png]]      (K 1.2 by default; prints SITES, saves a preview of the buildings on the map)
(the stadium is fitted to the round plot in the middle, which has no bare ground: its place is given by hand below, and SITES's stadium was then made a little smaller)
"""
import os
from PIL import Image
import numpy as np, json, sys
from scipy import ndimage as ndi
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')+os.sep
K=float(sys.argv[1]) if len(sys.argv)>1 else 1.2
base=Image.open(R+'img/map/base.webp').convert('RGB'); W,H=base.size
a=np.array(base).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
dirt=(r>g*0.95)&(r>90)&(r-b>35)&(g>60)&(r<230)
dirt=ndi.binary_opening(dirt,iterations=3)
lab,n=ndi.label(ndi.binary_closing(dirt,iterations=6))
plots=[]
for i,sl in enumerate(ndi.find_objects(lab),1):
    if (lab[sl]==i).sum()>25000:
        ys,xs=np.where(lab==i); plots.append(dict(cx=xs.mean(),cy=ys.mean(),x0=xs.min(),x1=xs.max()))
ATLAS={"stadium":[0,681],"training":[681,714],"office":[1395,704],"apartment":[2099,732],"medical":[2831,660],"academy":[3491,743],"clubhouse":[4234,702],"shop":[4936,709]}
atlas=Image.open(R+'img/map/buildings.webp').convert('RGBA'); al=np.array(atlas)[...,3]
plots.append(dict(cx=0.505*W,cy=0.465*H,x0=0.33*W,x1=0.68*W))
def pick(fx,fy): return min(plots,key=lambda p:(p['cx']/W-fx)**2+(p['cy']/H-fy)**2)
assign={'stadium':(.505,.465),'training':(.32,.20),'apartment':(.72,.24),'office':(.23,.34),'academy':(.79,.37),'medical':(.21,.58),'clubhouse':(.80,.60),'shop':(.24,.74)}
out={}; canvas=base.convert('RGBA')
for n,(fx,fy) in assign.items():
    p=pick(fx,fy); row,h=ATLAS[n]; m=al[row:row+h]>60
    ys,xs=np.where(m); sy0,sy1=ys.min(),ys.max()
    lo=m.copy(); lo[:int(sy1-0.45*(sy1-sy0))]=False
    lys,lxs=np.where(lo); lw=lxs.max()-lxs.min(); pcx,pcy=lxs.mean(),lys.mean()
    s=(p['x1']-p['x0'])*K/lw
    left=p['cx']-pcx*s; top=p['cy']-pcy*s
    out[n]=dict(x=round((left+550*s)/W,3),y=round((top+h*s/2)/H,3),w=round(1100*s/W,3))
    spr=atlas.crop((0,row,1100,row+h)).resize((round(1100*s),round(h*s)),Image.LANCZOS)
    canvas.alpha_composite(spr,(round(left),round(top)))
print(json.dumps(out))
canvas.convert('RGB').resize((768,1152)).save(sys.argv[2] if len(sys.argv) > 2 else 'place.png')
