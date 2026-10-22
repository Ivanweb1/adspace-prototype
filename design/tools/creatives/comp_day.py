import cv2, numpy as np, json, subprocess, sys, os
src='../../assets/photos-day/'
dst='out_day/'; os.makedirs(dst,exist_ok=True); os.makedirs('cr/r',exist_ok=True)
Q=json.load(open('quads_day.json'))
ASSIGN={'day-1-highway.jpg':1,'day-2-mall.jpg':3,'day-3-dealer.jpg':5,'day-4-cafe.jpg':2,'day-5-office.jpg':4,'day-6-residential.jpg':2}
only=sys.argv[1:] or list(ASSIGN)
jobs=[]; meta={}
for f in only:
    p=np.array(Q[f][0]['pts'],np.float32)
    ys=p[np.argsort(p[:,1])]; top=ys[:2][np.argsort(ys[:2,0])]; bot=ys[2:][np.argsort(ys[2:,0])]
    p=np.array([top[0],top[1],bot[1],bot[0]],np.float32); c0=p.mean(0); p=c0+(p-c0)*1.008; tl,tr,br,bl=p
    W=(np.linalg.norm(tr-tl)+np.linalg.norm(br-bl))/2; H=(np.linalg.norm(bl-tl)+np.linalg.norm(br-tr))/2
    # physical aspect ~ apparent aspect (perspective is mild)
    if W>=H: rw=1500; rh=int(round(1500*H/W))
    else: rh=1500; rw=int(round(1500*W/H))
    out=f'cr/r/{f[:-4]}.png'; jobs.append(f'{ASSIGN[f]}:{rw}:{rh}:{out}'); meta[f]=(out,p)
subprocess.run(['node','render.js',*jobs],check=True)
for f,(cpath,p) in meta.items():
    im=cv2.imread(src+f).astype(np.float32)/255; h,w=im.shape[:2]
    cr=cv2.imread(cpath).astype(np.float32)/255; ch,cw=cr.shape[:2]
    M=cv2.getPerspectiveTransform(np.float32([[0,0],[cw,0],[cw,ch],[0,ch]]),p)
    warped=cv2.warpPerspective(cr,M,(w,h),flags=cv2.INTER_AREA if cw>w else cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
    # маска со сглаженным краем (суперсэмплинг)
    S=4; mbig=np.zeros((h*S,w*S),np.uint8); cv2.fillPoly(mbig,[(p*S).astype(np.int32)],255,lineType=cv2.LINE_AA)
    mask=cv2.resize(mbig,(w,h),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    mask=cv2.erode(mask,np.ones((2,2),np.uint8))
    # освещение исходного постера без надписей
    L=cv2.cvtColor((im*255).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    ph=max(8,int(min(np.linalg.norm(p[3]-p[0]),np.linalg.norm(p[1]-p[0]))/6))
    Lc=cv2.dilate(L,np.ones((ph,ph),np.uint8))
    Lc=cv2.GaussianBlur(Lc,(0,0),ph/2)
    inside=mask>0.9
    ref=np.percentile(Lc[inside],90)
    shade=np.clip(Lc/ref,0.5,1.06)
    # оттенок света (тёплый/холодный) — от среднего цвета белого поля
    tint=np.array([np.median(im[...,c][inside & (L>np.percentile(L[inside],60))]) for c in range(3)])
    tint=tint/tint.max(); tint=0.6*tint+0.4
    comp=warped*shade[...,None]*tint[None,None,:]
    comp=cv2.GaussianBlur(comp,(0,0),0.45)  # мягкость как у фото
    outim=im*(1-mask[...,None])+comp*mask[...,None]
    cv2.imwrite(dst+f,(np.clip(outim,0,1)*255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,86])
    print('ok',f)
