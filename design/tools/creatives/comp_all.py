import cv2, numpy as np, json, subprocess, sys, os
O='orig/'; DST='final_out/'; os.makedirs(DST,exist_ok=True); os.makedirs('cr/r',exist_ok=True)
R=json.load(open('refined.json'))
ASSIGN={'outdoor.jpg':1,'dooh.jpg':2,'tv.jpg':3,'auto-dealer.jpg':5,'case-1.jpg':4,'case-2.jpg':1,'case-4.jpg':2,
 'indoor.jpg':5,'promo-hotels.jpg':3,'promo-hotels-v.jpg':3,'promo-lifts.jpg':1,'promo-launch.jpg':4,'promo-transit.jpg':5,
 'promo-boards.jpg':2,'promo-federal.jpg':4,'production.jpg':1,'seg-auto.jpg':2,'seg-chain.jpg':5,'seg-cinema.jpg':3,
 'seg-developer.jpg':4,'seg-enterprise.jpg':1,'seg-fmcg.jpg':3,'seg-local.jpg':2,
 'day-1-highway.jpg':1,'day-2-mall.jpg':3,'day-3-dealer.jpg':5,'day-4-cafe.jpg':2,'day-5-office.jpg':4,'day-6-residential.jpg':2}
EXP=float(os.environ.get('EXP','2.0'))  # запас наружу, px
only=sys.argv[1:] or list(ASSIGN)
def grow(p,px):
    # сдвигаем каждую сторону наружу на px и пересекаем
    q=[]
    for i in range(4):
        a,b=p[i-1],p[i]; c,d=p[i],p[(i+1)%4]
        def off(s,e):
            u=(e-s)/np.linalg.norm(e-s); n=np.array([u[1],-u[0]])
            cen=p.mean(0)
            if np.dot(cen-s,n)>0: n=-n
            return s+n*px,u
        s1,u1=off(a,b); s2,u2=off(c,d)
        t=np.linalg.solve(np.array([u1,-u2]).T,s2-s1); q.append(s1+u1*t[0])
    return np.array(q,np.float32)
jobs=[];meta={}
for f in only:
    p=np.array(R[f]['pts'],np.float32); p=grow(p,EXP)
    tl,tr,br,bl=p
    W=(np.linalg.norm(tr-tl)+np.linalg.norm(br-bl))/2; H=(np.linalg.norm(bl-tl)+np.linalg.norm(br-tr))/2
    if W>=H: rw,rh=1500,int(round(1500*H/W))
    else: rh,rw=1500,int(round(1500*W/H))
    out=f'cr/r/{f[:-4]}.png'; jobs.append(f'{ASSIGN[f]}:{rw}:{rh}:{out}'); meta[f]=(out,p)
subprocess.run(['node','render.js',*jobs],check=True)
for f,(cpath,p) in meta.items():
    im=cv2.imread(O+f).astype(np.float32)/255; h,w=im.shape[:2]
    cr=cv2.imread(cpath).astype(np.float32)/255; ch,cw=cr.shape[:2]
    M=cv2.getPerspectiveTransform(np.float32([[0,0],[cw,0],[cw,ch],[0,ch]]),p)
    warped=cv2.warpPerspective(cr,M,(w,h),flags=cv2.INTER_AREA,borderMode=cv2.BORDER_REPLICATE)
    S=4; mbig=np.zeros((h*S,w*S),np.uint8); cv2.fillPoly(mbig,[(p*S).astype(np.int32)],255,lineType=cv2.LINE_AA)
    mask=cv2.resize(mbig,(w,h),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    L=cv2.cvtColor((im*255).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    ph=max(8,int(min(np.linalg.norm(p[3]-p[0]),np.linalg.norm(p[1]-p[0]))/6))
    Lc=cv2.GaussianBlur(cv2.dilate(L,np.ones((ph,ph),np.uint8)),(0,0),ph/2)
    inside=mask>0.9; ref=np.percentile(Lc[inside],90)
    shade=np.clip(Lc/ref,0.5,1.06)
    tint=np.array([np.median(im[...,c][inside&(L>np.percentile(L[inside],60))]) for c in range(3)]); tint=tint/tint.max(); tint=0.6*tint+0.4
    comp=cv2.GaussianBlur(warped*shade[...,None]*tint[None,None,:],(0,0),0.45)
    o=im*(1-mask[...,None])+comp*mask[...,None]
    cv2.imwrite(DST+f,(np.clip(o,0,1)*255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,86])
json.dump({f:meta[f][1].tolist() for f in meta},open('used_quads.json','w'))
print('done',len(meta))
