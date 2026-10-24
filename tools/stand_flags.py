#!/usr/bin/env python3
"""The painted flags of the stands in open sky (js/standlife.js FLAGS): by colour (pink, purple, yellow, green) where the ring around the shape is sky.
Writes flags.json and a preview per view; run from the repo root."""
import json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
R='/home/user/cricket-club/'
s=open(R+'js/groundart.js').read(); J=json.loads(s[s.index('= ')+2:s.rindex(';')])
# flag colour rules (hue range deg, min sat, min val)
RULES={'royals':('pink',(310,350),0.45,0.55),'storm':('purple',(268,300),0.45,0.35),'eagles':('yellow',(45,58),0.7,0.8),'cyclones':('green',(100,150),0.55,0.35)}
out={}
for club,(name,(h0,h1),smin,vmin) in RULES.items():
    out[club]={}
    for view in ('bat','bowl'):
        v=J[club]['views'][view]; im=Image.open(R+f'img/ground/{club}/view-{view}.webp').convert('RGB')
        hsv=np.array(im.convert('HSV')).astype(float); H=hsv[...,0]*360/255; S=hsv[...,1]/255; V=hsv[...,2]/255
        m=(H>=h0)&(H<=h1)&(S>=smin)&(V>=vmin)
        m[v['above']+60:]=False             # only above the pitch line (+ a little of the stand)
        m=ndi.binary_closing(m,iterations=2)
        lab,n=ndi.label(m); objs=ndi.find_objects(lab); fl=[]
        for i,o in enumerate(objs):
            area=(lab[o]==i+1).sum(); h=o[0].stop-o[0].start; w=o[1].stop-o[1].start
            if not (150<area<9000 and 0.5<w/h<4.5 and h<140): continue
            y0,y1,x0,x1=o[0].start,o[0].stop,o[1].start,o[1].stop
            pad=max(10,int(w*0.4))
            ring=np.zeros(m.shape,bool); ring[max(0,y0-pad):y1+pad, max(0,x0-pad):x1+pad]=True; ring[y0:y1,x0:x1]=False
            r=ring&~m
            sky=((H>=185)&(H<=235)&(S>=0.12)&(V>=0.55))|((S<0.2)&(V>0.85))
            frac=(sky&r).sum()/max(1,r.sum())
            if frac>0.55 and y0<v['above']-10: fl.append([x0,y0,w,h,int(area),round(float(frac),2)])
        out[club][view]=fl; print(club,view,len(fl))
        d=ImageDraw.Draw(im)
        for x,y,w,h,a,_f in fl: d.rectangle([x,y,x+w,y+h],outline=(255,255,255),width=3)
        im.crop((0,0,2400,v['above']+80)).resize((1200,(v['above']+80)//2)).save(f'fl-{club}-{view}.png')
json.dump(out,open('flags.json','w'))
