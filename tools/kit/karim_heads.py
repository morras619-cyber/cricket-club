import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
H={}
for view in ('front','back'):
    a=np.array(Image.open(f'src/karim-{view}.png').convert('RGB')).astype(int)
    mag=(a[...,0]>180)&(a[...,1]<90)&(a[...,2]>150); fg=~mag
    lab,n=ndi.label(ndi.binary_opening(fg,iterations=2))
    objs=sorted([(o,i+1) for i,o in enumerate(ndi.find_objects(lab)) if (o[0].stop-o[0].start)>150],key=lambda t:(int((t[0][0].start+t[0][0].stop)/2//860),t[0][1].start))
    lum=a@np.array([.299,.587,.114]); dark=(lum<62)&fg
    dark=ndi.binary_opening(dark,iterations=3)
    out=[]
    for o,i in objs:
        m=lab==i; top=o[0].start; h=o[0].stop-top
        d=dark&m&(np.arange(a.shape[0])[:,None]<top+0.45*h)
        L,k=ndi.label(d); best=None
        for q in range(1,k+1):
            ys,xs=np.nonzero(L==q)
            if len(xs)>2500 and (best is None or ys.min()<best[0]): best=(ys.min(),xs.min(),xs.max(),len(xs))
        if best is None: out.append(None); continue
        y,x0,x1,_=best; out.append([round((x0+x1)/2,1),float(y),round((x1-x0)/1.3,1),0.0])
    H[view]=out; print(view,out)
json.dump(H,open('karim-heads.json','w'))
