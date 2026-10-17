"""Prepare TropiChop art: cut out white backgrounds, build sliced 'inside' images, resize, save as webp.

Usage: python3 tools/prep_art.py <source_dir> <out_dir>
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

def f(prefix):
    m = list(SRC.glob(f"exec-{prefix}*.png"))
    assert len(m) == 1, prefix
    return m[0]

# name: (whole, cross-section, cut-face placement: scale, dx, dy as fractions of whole bbox)
FRUITS = {
    "lilikoi":    ("abaa635b", "f275820f", 0.94, 0.0, 0.02),
    "pineapple":  ("2fdaaf76", "b53308ed", 0.98, 0.0, 0.20),
    "mango":      ("79773730", "c4807355", 0.92, 0.0, 0.02),
    "dragonfruit":("8652d866", "acbce9b9", 0.90, 0.0, 0.02),
    "starfruit":  ("c70b3890", "51366b81", None, 0, 0),
    "coconut":    ("adfbcdc0", "099c2732", 0.96, 0.0, 0.0),
    "lychee":     ("772ba37e", "2d8ad008", 0.92, 0.0, 0.03),
    "guava":      ("0ded85b4", "843330ed", 0.92, 0.0, -0.02),
}
SINGLES = {"slippah": "8a330e6e", "wana": "325181ce", "hibiscus": "b16711ff", "logo": "47072ef3"}
BGS = {"bg-koa": "a41aa43e", "bg-beach": "20a7392f"}

def cutout(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    mn, mx = a.min(2), a.max(2)
    cand = (mn > 228) & ((mx - mn) < 26)
    lab, _ = ndimage.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # grow background slightly into the soft white halo, then feather
    near = (mn > 205) & ((mx - mn) < 40)
    halo = ndimage.binary_dilation(bg, iterations=3) & near
    bg = bg | halo
    alpha = (~bg).astype(np.float32)
    alpha = ndimage.gaussian_filter(alpha, 1.0)
    alpha = np.minimum(alpha, (~bg).astype(np.float32) * 1.0 + 0.0)
    alpha = np.clip(ndimage.gaussian_filter((~bg).astype(np.float32), 0.8), 0, 1) * (~ndimage.binary_erosion(bg, iterations=1))
    rgba = np.dstack([a.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, "RGBA")
    return img.crop(img.getbbox())

def fit(img, maxside):
    w, h = img.size
    s = maxside / max(w, h)
    return img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS) if s < 1 else img

def make_inside(whole, cross, scale, dx, dy):
    W, H = whole.size
    cw, ch = cross.size
    s = min(W / cw, H / ch) * scale
    c = cross.resize((round(cw * s), round(ch * s)), Image.LANCZOS)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(c, (round((W - c.width) / 2 + dx * W), round((H - c.height) / 2 + dy * H)), c)
    # keep the cut face inside the whole fruit silhouette
    la = np.asarray(layer).copy()
    wa = np.asarray(whole)[:, :, 3].astype(np.float32) / 255
    la[:, :, 3] = (la[:, :, 3].astype(np.float32) * wa).astype(np.uint8)
    out = whole.copy()
    out.alpha_composite(Image.fromarray(la, "RGBA"))
    return out

def starfruit_inside(whole):
    W, H = whole.size
    wa = np.asarray(whole)[:, :, 3] > 128
    inner = ndimage.binary_erosion(wa, iterations=max(4, W // 40))
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = W / 2, H / 2
    d = np.sqrt(((xx - cx) / (W / 2)) ** 2 + ((yy - cy) / (H / 2)) ** 2)
    base = np.array([255, 226, 110], np.float32)
    light = np.array([255, 246, 196], np.float32)
    t = np.clip(1 - d, 0, 1)[..., None]
    rgb = base * (1 - t) + light * t
    rng = np.random.default_rng(3)
    noise = ndimage.gaussian_filter(rng.normal(0, 1, (H, W)), 2)[..., None] * 9
    # faint juicy vertical fibers
    fib = (np.sin(xx / W * 60) * 4)[..., None]
    rgb = np.clip(rgb + noise + fib, 0, 255)
    soft = ndimage.gaussian_filter(inner.astype(np.float32), 1.5)
    arr = np.asarray(whole).astype(np.float32).copy()
    arr[:, :, :3] = arr[:, :, :3] * (1 - soft[..., None]) + rgb * soft[..., None]
    return Image.fromarray(arr.astype(np.uint8), "RGBA")

def save(img, name, q=86):
    img.save(OUT / f"{name}.webp", "WEBP", quality=q, method=6)

meta = {}
for name, (w, c, sc, dx, dy) in FRUITS.items():
    whole = fit(cutout(f(w)), 420)
    cross = cutout(f(c))
    if name == "starfruit":
        inside = starfruit_inside(whole)
        save(fit(cross, 160), "starslice")
    else:
        inside = make_inside(whole, cross, sc, dx, dy)
    save(whole, name)
    save(inside, name + "-in")
    # sample juice colour from the cross-section's middle ring
    ca = np.asarray(fit(cross, 200)).astype(np.float32)
    m = ca[:, :, 3] > 200
    meta[name] = {"w": whole.width, "h": whole.height}
for name, k in SINGLES.items():
    img = cutout(f(k))
    img = fit(img, 1000 if name == "logo" else (256 if name == "hibiscus" else 420))
    save(img, name)
    meta[name] = {"w": img.width, "h": img.height}
for name, k in BGS.items():
    img = Image.open(f(k)).convert("RGB")
    img = fit(img, 1672)
    img.save(OUT / f"{name}.webp", "WEBP", quality=80, method=6)
    meta[name] = {"w": img.width, "h": img.height}
print(json.dumps(meta))
