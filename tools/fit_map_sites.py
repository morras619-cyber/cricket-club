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
MARGIN=float(sys.argv[3]) if len(sys.argv)>3 else 30
base=Image.open(R+'img/map/base.webp').convert('RGB').resize((1536,2304),Image.LANCZOS); W,H=base.size   # (the original: the pads are found by their bare ground)
a=np.array(base).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
dirt=(g>r*1.25)&(g>b*1.6)&(g>95)&(g<185)
dirt=ndi.binary_opening(dirt,iterations=8)
lab,n=ndi.label(ndi.binary_closing(dirt,iterations=6))
plots=[]
for i,sl in enumerate(ndi.find_objects(lab),1):
    if (lab[sl]==i).sum()>40000:
        ys,xs=np.where(lab==i); plots.append(dict(cx=(xs.min()+xs.max())/2,cy=(ys.min()+ys.max())/2,x0=xs.min(),x1=xs.max(),y1=ys.max()))
ATLAS={"stadium":[0,681],"training":[681,714],"office":[1395,704],"apartment":[2099,732],"medical":[2831,660],"academy":[3491,743],"clubhouse":[4234,702],"shop":[4936,709],"merch":[5645,675]}
atlas=Image.open(R+'img/map/buildings.webp').convert('RGBA'); al=np.array(atlas)[...,3]
def pick(fx,fy): return min(plots,key=lambda p:(p['cx']/W-fx)**2+(p['cy']/H-fy)**2)
assign={'stadium':(.503,.444),'training':(.34,.195),'apartment':(.735,.245),'office':(.224,.334),'academy':(.812,.382),'medical':(.24,.584),'clubhouse':(.766,.594),'shop':(.239,.739),'merch':(.749,.757)}
out={}; canvas=Image.open(R+'img/map/base.webp').convert('RGBA').resize((W,H))
for n,(fx,fy) in assign.items():
    p=pick(fx,fy); row,h=ATLAS[n]; m=al[row:row+h]>60
    ys,xs=np.where(m); sy0,sy1=ys.min(),ys.max()
    lo=m.copy(); lo[:int(sy1-0.45*(sy1-sy0))]=False
    lys,lxs=np.where(lo); lw=lxs.max()-lxs.min()    # the base's width
    cys,cxs=np.where(m); pcx,pcy=cxs.mean(),cys.mean()   # the middle of the whole building's picture (its weight), which is what the eye centres
    s=(p['x1']-p['x0'])*K/lw
    # across: the base's middle on the lawn's middle; down: the lowest corner of the whole building (its stone base) a little inside the lawn's front edge, so nothing hangs over the road
    left=p['cx']-pcx*s; top=p['y1']-MARGIN-sy1*s
    out[n]=dict(x=round((left+550*s)/W,3),y=round((top+h*s/2)/H,3),w=round(1100*s/W,3))
    spr=atlas.crop((0,row,1100,row+h)).resize((round(1100*s),round(h*s)),Image.LANCZOS)
    canvas.alpha_composite(spr,(round(left),round(top)))
print(json.dumps(out))
canvas.convert('RGB').resize((768,1152)).save(sys.argv[2] if len(sys.argv) > 2 else 'place.png')
