# Makes the website's logo files from tools/logo-original.png (a logo on a white background):
#   images/logo-fhsp.png         transparent, 1100 px wide (the opening screen, the end of the film)
#   images/logo-fhsp-header.png  transparent, 400 px wide (header, footer)
#   apple-touch-icon.png         the logo on white, for saving the site to a phone's home screen
# To change the logo: replace tools/logo-original.png, run  python3 tools/make-logo.py , then update the width/height
# in index.html, thanks.html and 404.html if the shape changed (it prints the new sizes). Needs Pillow and numpy (free).
import numpy as np
from PIL import Image

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'logo-original.png')    # the logo as you made it, on a white background
OUT = os.path.join(ROOT, 'images') + os.sep
a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64)

# Take the white background away: work out how much of each pixel is ink (alpha) and what colour that ink is.
ink = (255.0 - a)                                   # how far each channel is from white
alpha = ink.max(axis=2) / 255.0
alpha = np.clip((alpha - 0.025) / 0.975, 0, 1)       # the background is 254, not 255: treat that haze as nothing
safe = np.maximum(alpha, 1e-3)[..., None]
rgb = 255.0 - ink / safe
rgb = np.clip(rgb, 0, 255)
rgb[alpha < 0.004] = 0
rgba = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
im = Image.fromarray(rgba, 'RGBA')

# crop to the artwork with a little air around it
ys, xs = np.where(alpha > 0.02)
m = 28
box = (max(0, xs.min() - m), max(0, ys.min() - m), min(im.width, xs.max() + m + 1), min(im.height, ys.max() + m + 1))
im = im.crop(box)
print('crop box', box, 'size', im.size)


def resized(img, w):
    h = round(img.height * w / img.width)
    return img.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')


def small(img):
    # 256 colours with a soft edge keeps it looking the same at a third of the file size (faster page)
    return img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)


big = resized(im, 1100)
small(big).save(OUT + 'logo-fhsp.png', optimize=True)
head = resized(im, 400)
small(head).save(OUT + 'logo-fhsp-header.png', optimize=True)
print('logo-fhsp.png', big.size, 'logo-fhsp-header.png', head.size)

# where the roof's open space is (for the opening zoom), as a share of the cropped picture
ox = (815 - box[0]) / (box[2] - box[0])
oy = (215 - box[1]) / (box[3] - box[1])
print('zoom origin %.0f%% %.0f%%' % (ox * 100, oy * 100))

# touch icon: the logo centred on white
icon = Image.new('RGB', (180, 180), 'white')
lg = resized(im, 160)
icon.paste(lg, (10, (180 - lg.height) // 2), lg)
icon.save(os.path.join(ROOT, 'apple-touch-icon.png'), optimize=True)
