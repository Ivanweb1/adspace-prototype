# Фото акции «Осенний тариф» (правка 10.11): креативы cr-6.png (t=6) и cr-5.png (t=5) из creative.html кладутся на красные щиты исходника promo-boards-raw.jpg
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
base = Image.open("../../assets/photos-light/promo-boards-raw.jpg").convert("RGB")
W,H = base.size

def place(cr_path, box, dim=0.9, haze=0.0, blur=0.0):
    x0,y0,x1,y1 = box
    cr = Image.open(cr_path).convert("RGB").resize((x1-x0, y1-y0), Image.LANCZOS)
    a = np.asarray(cr).astype(float)
    # пасмурный свет: темнее и чуть холоднее, снизу тень от козырька фонарей нет — лёгкий вертикальный спад
    grad = np.linspace(1.0, 0.9, a.shape[0])[:,None,None]
    a = a*dim*grad
    a[...,2] *= 1.02
    if haze:
        fog = np.array([178,182,190.])
        a = a*(1-haze) + fog*haze
    a += np.random.default_rng(1).normal(0, 2.2, a.shape)
    cr = Image.fromarray(np.clip(a,0,255).astype("uint8"))
    if blur: cr = cr.filter(ImageFilter.GaussianBlur(blur))
    base.paste(cr, (x0,y0))

place("cr-6.png", (805,160,1735,617), dim=0.9)
place("cr-5.png", (647,689,724,734), dim=0.86, haze=0.22, blur=0.5)
place("cr-5.png", (554,730,586,748), dim=0.84, haze=0.35, blur=0.6)
base.save("../../assets/photos-light/promo-boards.jpg", quality=88, optimize=True)
print("ok")
# остатки красного по краю ближнего щита — цветом бумаги из соседнего ряда креатива
a = np.asarray(base).astype(int).copy()
raw = np.asarray(Image.open("../../assets/photos-light/promo-boards-raw.jpg").convert("RGB")).astype(int)
r,g,b = raw[...,0],raw[...,1],raw[...,2]
red = (r>150)&(g<110)&(b<130)
ys,xs = np.nonzero(red[120:660, 780:1760]); n=0
for y,x in zip(ys+120, xs+780):
    if 160 <= y < 617 and 805 <= x < 1735: continue
    a[y,x] = a[min(max(y,162),614), min(max(x,807),1732)]; n+=1
Image.fromarray(a.astype("uint8")).save("../../assets/photos-light/promo-boards.jpg", quality=88, optimize=True)
print("fixed", n)
