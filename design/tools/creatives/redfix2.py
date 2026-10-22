import cv2, numpy as np, json
Q=json.load(open('used_quads.json'))
for f,p in Q.items():
    im=cv2.imread('orig/'+f); o=cv2.imread('final_out/'+f); p=np.array(p,np.float32); h,w=im.shape[:2]
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    red=((((hsv[...,0]<12)|(hsv[...,0]>165))&(hsv[...,1]>70)&(hsv[...,2]>60))).astype(np.uint8)
    m=np.zeros((h,w),np.uint8); cv2.fillPoly(m,[p.astype(np.int32)],1)
    span=min(np.linalg.norm(p[1]-p[0]),np.linalg.norm(p[3]-p[0])); r=int(max(6,0.035*span))
    ring=cv2.dilate(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))); ring[m>0]=0
    left=(red&ring); left=cv2.dilate(left,np.ones((3,3),np.uint8)); left[m>0]=0
    n=int(left.sum())
    if n:
        band=m-cv2.erode(m,np.ones((25,25),np.uint8))
        M=((left>0)|(band>0)).astype(np.uint8)*255
        x,y,ww,hh=cv2.boundingRect(p.astype(np.int32)); pad=r+20
        x0,y0,x1,y1=max(0,x-pad),max(0,y-pad),min(w,x+ww+pad),min(h,y+hh+pad)
        fix=cv2.inpaint(im[y0:y1,x0:x1],M[y0:y1,x0:x1],4,cv2.INPAINT_TELEA)
        sub=o[y0:y1,x0:x1]; L=left[y0:y1,x0:x1]>0; sub[L]=fix[L]
        cv2.imwrite('final_out/'+f,o,[cv2.IMWRITE_JPEG_QUALITY,86])
    print(f'{f:24s} {n}')
