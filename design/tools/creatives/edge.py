import cv2, numpy as np, json, sys
sys.path.insert(0,'.')
from refine import order, inter, fit_quad
A=json.load(open('final.json')); B=json.load(open('quads_day.json'))
def poster_like(im, p):
    lab=cv2.cvtColor(im,cv2.COLOR_BGR2LAB).astype(np.float32); hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    h,w=im.shape[:2]; c=p.mean(0); inner=np.zeros((h,w),np.uint8); cv2.fillPoly(inner,[(c+(p-c)*0.8).astype(np.int32)],255)
    Lin=lab[...,0][inner>0]; Lref=np.percentile(Lin,70)
    a,b=lab[...,1]-128,lab[...,2]-128
    white=(lab[...,0]>0.72*Lref)&(np.hypot(a,b)<22)
    red=(((hsv[...,0]<10)|(hsv[...,0]>168))&(hsv[...,1]>90)&(hsv[...,2]>70))
    return (white|red).astype(np.float32)
def edges(im,p,N=60):
    P=poster_like(im,p); c=p.mean(0); lines=[]; dbg=[]
    for i in range(4):
        a,b=p[i],p[(i+1)%4]; d=b-a; L=np.linalg.norm(d); u=d/L; n=np.array([-u[1],u[0]])
        if np.dot(c-a,n)>0: n=-n
        span=min(np.linalg.norm(p[(i+2)%4]-p[(i+1)%4]),np.linalg.norm(p[(i+3)%4]-p[i]))
        ins=max(6,0.08*span); out=max(8,0.06*span)
        offs=np.arange(-ins,out,0.5)
        pts=[]
        for t in np.linspace(0.01,0.99,N):
            base=a+d*t; xy=base[None,:]+offs[:,None]*n[None,:]
            v=cv2.remap(P,xy[:,0:1].astype(np.float32),xy[:,1:2].astype(np.float32),cv2.INTER_LINEAR).ravel()
            # идём от внутренней точки наружу, пока пиксель «как постер» (допускаем дырки до 1.5px)
            k=0; miss=0; last=0
            for j,vv in enumerate(v):
                if vv>0.5: last=j; miss=0
                else:
                    miss+=1
                    if miss>3 and offs[j]>-ins*0.5: break
            pts.append(base+offs[last]*n)
        pts=np.array(pts,np.float32)
        vx,vy,x0,y0=cv2.fitLine(pts,cv2.DIST_HUBER,0,0.01,0.01).ravel()
        nn=np.array([-vy,vx]);
        if np.dot(c-np.array([x0,y0]),nn)>0: nn=-nn
        res=(pts-np.array([x0,y0]))@nn
        sh=float(np.clip(np.percentile(res,97),0,0.02*span+2))
        lines.append((vx,vy,x0+nn[0]*sh,y0+nn[1]*sh)); dbg.append(pts)
    q=np.array([inter(lines[(i-1)%4],lines[i]) for i in range(4)],np.float32)
    return q,dbg
if __name__=="__main__":
    out={}
    for f,src in [(k,A) for k in A]+[(k,B) for k in B]:
        if f=='promo-federal-v.jpg': continue
        im=cv2.imread('orig/'+f); p0=order(src[f][0]['pts'])
        q=fit_quad(im,p0,0.10); q=fit_quad(im,q,0.06)
        if np.abs(q-p0).max()>0.08*np.linalg.norm(p0[2]-p0[0]): q=p0
        q,_=edges(im,q); q,_=edges(im,q)
        out[f]={'pts':q.round(2).tolist()}
    json.dump(out,open('refined.json','w')); print(len(out))
