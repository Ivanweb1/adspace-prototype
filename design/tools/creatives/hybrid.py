import numpy as np, json, sys, cv2
sys.path.insert(0,'.')
from refine import inter
V1=json.load(open('refined_prev.json')); V2=json.load(open('refined.json')); out={}
def side_line(p,i):
    a,b=p[i],p[(i+1)%4]; u=(b-a)/np.linalg.norm(b-a); return u,a
for f in V1:
    p1=np.array(V1[f]['pts'],np.float32); p2=np.array(V2[f]['pts'],np.float32); c=p2.mean(0)
    span=min(np.linalg.norm(p2[1]-p2[0]),np.linalg.norm(p2[3]-p2[0])); tol=max(8,0.015*span)
    lines=[]; pick=[]
    for i in range(4):
        u1,a1=side_line(p1,i); u2,a2=side_line(p2,i)
        n=np.array([-u2[1],u2[0]]);  n=-n if np.dot(c-a2,n)>0 else n
        mid1=(p1[i]+p1[(i+1)%4])/2; d=float(np.dot(mid1-a2,n))   # >0: v1 снаружи v2
        if d>tol:
            # край красной полосы снаружи этой стороны
            im=cv2.imread('orig/'+f); hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
            red=((((hsv[...,0]<12)|(hsv[...,0]>165))&(hsv[...,1]>60)&(hsv[...,2]>50))).astype(np.uint8)
            mm=np.zeros(red.shape,np.uint8); cv2.fillPoly(mm,[p2.astype(np.int32)],1)
            near=cv2.dilate(mm,np.ones((29,29),np.uint8))
            nl,lb=cv2.connectedComponents(red&near)
            core=np.unique(lb[(mm>0)&(red>0)]); core=core[core>0]
            # только компоненты, у которых основная часть внутри постера (сама полоса)
            keep=[k for k in core if ((lb==k)&(mm>0)).sum()>0.6*(lb==k).sum()]
            red=np.isin(lb,keep)&(mm==0)
            ys,xs=np.nonzero(red); P=np.stack([xs,ys],1).astype(np.float32)+0.5
            L=np.linalg.norm(p2[(i+1)%4]-p2[i]); rel=P-a2; t=rel@u2/L; off=rel@n
            sel=(t>-0.02)&(t<1.02)&(off>0)&(off<14)
            sh=float(np.percentile(off[sel],99)) if sel.sum()>5 else 0.0
            a3=a2+n*sh; lines.append((u2[0],u2[1],a3[0],a3[1])); pick.append(f'v2({d:.0f})+{sh:.1f}')
        else: lines.append((u1[0],u1[1],a1[0],a1[1])); pick.append('v1')
    q=np.array([inter(lines[(i-1)%4],lines[i]) for i in range(4)],np.float32)
    out[f]={'pts':q.round(2).tolist()}
    if any(s!='v1' for s in pick): print(f'{f:24s} {pick}')
json.dump(out,open('hybrid.json','w'))
