import cv2, numpy as np, json
O='orig/'
A=json.load(open('final.json')); B=json.load(open('quads_day.json'))
def order(p):
    # по кругу (по часовой в координатах экрана), начиная с верхнего левого
    p=np.array(p,np.float32); c=p.mean(0)
    ang=np.arctan2(p[:,1]-c[1],p[:,0]-c[0]); p=p[np.argsort(ang)]
    k=int(np.argmin(p[:,0]+p[:,1])); return np.roll(p,-k,axis=0)
def inter(l1,l2):
    (vx1,vy1,x1,y1),(vx2,vy2,x2,y2)=l1,l2
    M=np.array([[vx1,-vx2],[vy1,-vy2]]); t=np.linalg.solve(M,[x2-x1,y2-y1])
    return np.array([x1+vx1*t[0],y1+vy1*t[0]])
def panel_mask(im,p):
    h,w=im.shape[:2]; hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    inner=np.zeros((h,w),np.uint8); c=p.mean(0)
    cv2.fillPoly(inner,[(c+(p-c)*0.8).astype(np.int32)],255)
    V=hsv[...,2][inner>0]; S=hsv[...,1][inner>0]
    vt=np.percentile(V,60)-30; st=max(35,np.percentile(S,60)+20)
    white=(hsv[...,2]>vt)&(hsv[...,1]<st)
    red=(((hsv[...,0]<10)|(hsv[...,0]>168))&(hsv[...,1]>100)&(hsv[...,2]>80))
    region=np.zeros((h,w),np.uint8); cv2.fillPoly(region,[(c+(p-c)*1.06).astype(np.int32)],255)
    m=((white|red)&(region>0)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cmax=max(cs,key=cv2.contourArea)
    full=np.zeros((h,w),np.uint8); cv2.drawContours(full,[cmax],-1,255,-1)
    return full,cmax.reshape(-1,2).astype(np.float32)
def fit_quad(im,p,tol_k):
    full,cnt=panel_mask(im,p); lines=[]
    for i in range(4):
        a,b=p[i],p[(i+1)%4]; d=b-a; L=np.linalg.norm(d); u=d/L; n=np.array([-u[1],u[0]])
        span=min(np.linalg.norm(p[(i+2)%4]-p[(i+1)%4]),np.linalg.norm(p[(i+3)%4]-p[i]))
        rel=cnt-a; t=rel@u/L; dist=np.abs(rel@n)
        sel=(t>0.12)&(t<0.88)&(dist<max(6,tol_k*span)); pts=cnt[sel]
        base=(u[0],u[1],a[0],a[1])
        if len(pts)<20: lines.append(base); continue
        vx,vy,x0,y0=cv2.fitLine(pts,cv2.DIST_HUBER,0,0.01,0.01).ravel()
        ang=np.degrees(np.arccos(min(1,abs(vx*u[0]+vy*u[1]))))
        mid=(a+b)/2; off=abs((mid-np.array([x0,y0]))@np.array([-vy,vx]))
        if ang>3 or off>0.10*span: lines.append(base)   # подозрительно — оставляем прежнюю сторону
        else: lines.append((vx,vy,x0,y0))
    return np.array([inter(lines[(i-1)%4],lines[i]) for i in range(4)],np.float32)
def support(im,q):
    # каждую сторону сдвигаем наружу до самой дальней точки старого постера (не больше 2.5% размера)
    full,cnt=panel_mask(im,q); c=q.mean(0); lines=[]
    for i in range(4):
        a,b=q[i],q[(i+1)%4]; d=b-a; L=np.linalg.norm(d); u=d/L; n=np.array([-u[1],u[0]])
        if np.dot(c-a,n)>0: n=-n
        span=min(np.linalg.norm(q[(i+2)%4]-q[(i+1)%4]),np.linalg.norm(q[(i+3)%4]-q[i]))
        rel=cnt-a; t=rel@u/L; off=rel@n
        sel=(t>-0.02)&(t<1.02)&(off>-0.05*span)&(off<0.025*span+3)
        mx=np.percentile(off[sel],99.5) if sel.sum()>10 else 0
        mx=max(0,min(mx,0.025*span+3))
        a2=a+n*mx; lines.append((u[0],u[1],a2[0],a2[1]))
    return np.array([inter(lines[(i-1)%4],lines[i]) for i in range(4)],np.float32)
def main():
    out={}
    for f,src in [(k,A) for k in A]+[(k,B) for k in B]:
        im=cv2.imread(O+f); p0=order(src[f][0]['pts'])
        q=fit_quad(im,p0,0.10); q=fit_quad(im,q,0.06)
        diag=np.linalg.norm(p0[2]-p0[0])
        if np.abs(q-p0).max()>0.08*diag: q=p0
        q=support(im,q)
        out[f]={'pts':q.round(2).tolist()}
        print(f'{f:24s} shift={np.abs(q-p0).max():5.1f}px')
    json.dump(out,open('refined.json','w'))
if __name__=="__main__":
    main()
