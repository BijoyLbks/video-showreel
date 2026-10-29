#!/usr/bin/env python3
"""
VHS/MONO Font Generator
Reconstructs the authentic TrueType and WOFF font files from the specimen image.
"""

from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
import os

IMG_PATH = '/Users/bijoy/.gemini/antigravity/brain/7a28f41a-41b6-4eec-a47f-613692ab74a2/.user_uploaded/media_1793216634045_2e36dad6.png'
TARGET_TTF = 'fonts/VHS-Mono.ttf'
TARGET_WOFF = 'fonts/VHS-Mono.woff'

print(f"Loading specimen image: {IMG_PATH}")
img = Image.open(IMG_PATH).convert('RGB')
w, h = img.size

# --- 1. Extraction Helpers ---
def get_xbands(y1, y2, x_min=340, x_max=820, min_w=10):
    col_sums = [sum(1 for y in range(y1, y2+1) if img.getpixel((x, y))[0] > 180) for x in range(x_min, x_max)]
    bands = []
    in_b = False
    start = 0
    for i, s in enumerate(col_sums):
        x = x_min + i
        if s > 3 and not in_b:
            in_b = True
            start = x
        elif s <= 3 and in_b:
            in_b = False
            if (x - start) >= min_w:
                bands.append((start, x))
    if in_b and (x_max - start) >= min_w:
        bands.append((start, x_max))
    return bands

def get_num_bands(y1, y2, x_min=30, x_max=320, min_w=20):
    col_sums = [sum(1 for y in range(y1, y2+1) if img.getpixel((x, y))[0] > 180) for x in range(x_min, x_max)]
    bands = []
    in_b = False
    start = 0
    for i, s in enumerate(col_sums):
        x = x_min + i
        if s > 3 and not in_b:
            in_b = True
            start = x
        elif s <= 3 and in_b:
            in_b = False
            if (x - start) >= min_w:
                bands.append((start, x))
    if in_b and (x_max - start) >= min_w:
        bands.append((start, x_max))
    return bands

# --- 2. Extract Character Crops ---
glyphs_bitmap = {}

# A-M: baseline y=544
b_AM = get_xbands(505, 545)
for i, ch in enumerate("ABCDEFGHIJKLM"):
    x1, x2 = b_AM[i]
    crop = img.crop((x1, 505, x2, 545))
    glyphs_bitmap[ch] = (crop, 544 - 505) # baseline_offset from top of crop

# N-Z: baseline y=607
b_NZ = get_xbands(567, 608)
for i, ch in enumerate("NOPQRSTUVWXYZ"):
    x1, x2 = b_NZ[i]
    crop = img.crop((x1, 567, x2, 608))
    glyphs_bitmap[ch] = (crop, 607 - 567)

# a-m: baseline y=669
b_am = get_xbands(630, 685)
for i, ch in enumerate("abcdefghijklm"):
    x1, x2 = b_am[i]
    crop = img.crop((x1, 630, x2, 685))
    glyphs_bitmap[ch] = (crop, 669 - 630)

# n-z: baseline y=732
b_nz = get_xbands(690, 745)
for i, ch in enumerate("nopqrstuvwxyz"):
    x1, x2 = b_nz[i]
    crop = img.crop((x1, 690, x2, 745))
    glyphs_bitmap[ch] = (crop, 732 - 690)

# Numbers 0-9: scaled to match 40px cap height
num_rows = [
    (505, 605, ["0", "1", "2"]),
    (630, 730, ["3", "4", "5"]),
    (756, 856, ["6", "7", "8"]),
    (881, 980, ["9"])
]

for y1, y2, chars in num_rows:
    bands = get_num_bands(y1, y2)
    for i, ch in enumerate(chars):
        x1, x2 = bands[i]
        crop = img.crop((x1, y1, x2, y2))
        orig_w, orig_h = crop.size
        # target height is 40
        scale = 39.0 / orig_h
        target_w = max(12, int(round(orig_w * scale)))
        resized = crop.resize((target_w, 39), Image.Resampling.LANCZOS)
        glyphs_bitmap[ch] = (resized, 39)

# Symbols from sym1 and sym2
# sym1: [ ← ↑ → ↓
b_sym1 = get_xbands(756, 795, min_w=6)
# band 0 is '['
glyphs_bitmap['['] = (img.crop((b_sym1[0][0], 756, b_sym1[0][1], 795)), 794 - 756)
glyphs_bitmap['←'] = (img.crop((b_sym1[1][0], 756, b_sym1[1][1], 795)), 794 - 756)
glyphs_bitmap['↑'] = (img.crop((b_sym1[2][0], 756, b_sym1[2][1], 795)), 794 - 756)
glyphs_bitmap['→'] = (img.crop((b_sym1[3][0], 756, b_sym1[3][1], 795)), 794 - 756)
glyphs_bitmap['↓'] = (img.crop((b_sym1[4][0], 756, b_sym1[4][1], 795)), 794 - 756)

# sym2: ↖ ↗ ↘ ↙ ▲ ▼ ]
b_sym2 = get_xbands(819, 858, min_w=6)
glyphs_bitmap['↖'] = (img.crop((b_sym2[8][0], 819, b_sym2[8][1], 858)), 857 - 819)
glyphs_bitmap['↗'] = (img.crop((b_sym2[9][0], 819, b_sym2[9][1], 858)), 857 - 819)
glyphs_bitmap['▲'] = (img.crop((b_sym2[10][0], 819, b_sym2[10][1], 858)), 857 - 819)
glyphs_bitmap['▼'] = (img.crop((b_sym2[11][0], 819, b_sym2[11][1], 858)), 857 - 819)
glyphs_bitmap[']'] = (img.crop((b_sym2[12][0], 819, b_sym2[12][1], 858)), 857 - 819)

# Slash '/' from VHS/MONO title: x=348..419, y=118..219
crop_slash = img.crop((348, 118, 419, 219))
scale_slash = 39.0 / crop_slash.size[1]
resized_slash = crop_slash.resize((max(12, int(round(crop_slash.size[0] * scale_slash))), 39), Image.Resampling.LANCZOS)
glyphs_bitmap['/'] = (resized_slash, 39)

print(f"Extracted {len(glyphs_bitmap)} glyphs from specimen image.")

# --- 3. Build TrueType Outlines ---
UNITS_PER_EM = 1000
ADVANCE_WIDTH = 700
PIXEL_SCALE = 18.0  # units per bitmap pixel
ASCENDER = 820
DESCENDER = -180

def create_glyph_contours(bitmap_img, baseline_y, threshold=140):
    pen = TTGlyphPen(None)
    bw, bh = bitmap_img.size
    
    # Center horizontally in advance width
    glyph_pixel_w = bw
    origin_x = int(round((ADVANCE_WIDTH - (glyph_pixel_w * PIXEL_SCALE)) / 2.0))
    
    # Extract binary mask
    mask = []
    for y in range(bh):
        row = []
        for x in range(bw):
            r, g, b = bitmap_img.getpixel((x, y))
            row.append(1 if (r > threshold and g > threshold and b > threshold) or (r > threshold and b > threshold) else 0)
        mask.append(row)
        
    has_contour = False
    
    # Merge horizontal runs into single rectangles for clean, fast TrueType outlines
    for y in range(bh):
        # In TrueType, positive Y is UP. baseline_y in image is 0 in font coordinates.
        y_bottom = int(round((baseline_y - (y + 1)) * PIXEL_SCALE))
        y_top = int(round((baseline_y - y) * PIXEL_SCALE))
        
        in_run = False
        run_start = 0
        for x in range(bw):
            if mask[y][x] and not in_run:
                in_run = True
                run_start = x
            elif not mask[y][x] and in_run:
                in_run = False
                x_left = origin_x + int(round(run_start * PIXEL_SCALE))
                x_right = origin_x + int(round(x * PIXEL_SCALE))
                pen.moveTo((x_left, y_bottom))
                pen.lineTo((x_right, y_bottom))
                pen.lineTo((x_right, y_top))
                pen.lineTo((x_left, y_top))
                pen.closePath()
                has_contour = True
        if in_run:
            x_left = origin_x + int(round(run_start * PIXEL_SCALE))
            x_right = origin_x + int(round(bw * PIXEL_SCALE))
            pen.moveTo((x_left, y_bottom))
            pen.lineTo((x_right, y_bottom))
            pen.lineTo((x_right, y_top))
            pen.lineTo((x_left, y_top))
            pen.closePath()
            has_contour = True
            
    return pen.glyph()

# Manual geometric fallbacks for essential punctuation
def create_rect_glyph(rects):
    pen = TTGlyphPen(None)
    for x1, y1, x2, y2 in rects:
        pen.moveTo((x1, y1))
        pen.lineTo((x2, y1))
        pen.lineTo((x2, y2))
        pen.lineTo((x1, y2))
        pen.closePath()
    return pen.glyph()

dot_size = int(5 * PIXEL_SCALE)
mid_x = ADVANCE_WIDTH // 2
half_dot = dot_size // 2

punctuation_glyphs = {
    '.': create_rect_glyph([(mid_x - half_dot, 0, mid_x + half_dot, dot_size)]),
    ':': create_rect_glyph([
        (mid_x - half_dot, int(5 * PIXEL_SCALE), mid_x + half_dot, int(10 * PIXEL_SCALE)),
        (mid_x - half_dot, int(20 * PIXEL_SCALE), mid_x + half_dot, int(25 * PIXEL_SCALE))
    ]),
    '-': create_rect_glyph([(mid_x - int(10 * PIXEL_SCALE), int(15 * PIXEL_SCALE), mid_x + int(10 * PIXEL_SCALE), int(20 * PIXEL_SCALE))]),
    '_': create_rect_glyph([(mid_x - int(12 * PIXEL_SCALE), -int(5 * PIXEL_SCALE), mid_x + int(12 * PIXEL_SCALE), 0)]),
    ',': create_rect_glyph([
        (mid_x - half_dot, 0, mid_x + half_dot, dot_size),
        (mid_x - half_dot, -int(4 * PIXEL_SCALE), mid_x, 0)
    ]),
    '!': create_rect_glyph([
        (mid_x - half_dot, int(12 * PIXEL_SCALE), mid_x + half_dot, int(38 * PIXEL_SCALE)),
        (mid_x - half_dot, 0, mid_x + half_dot, dot_size)
    ]),
    '?': create_rect_glyph([
        (mid_x - int(8 * PIXEL_SCALE), int(33 * PIXEL_SCALE), mid_x + int(8 * PIXEL_SCALE), int(38 * PIXEL_SCALE)),
        (mid_x + int(3 * PIXEL_SCALE), int(22 * PIXEL_SCALE), mid_x + int(8 * PIXEL_SCALE), int(33 * PIXEL_SCALE)),
        (mid_x - half_dot, int(12 * PIXEL_SCALE), mid_x + half_dot, int(22 * PIXEL_SCALE)),
        (mid_x - half_dot, 0, mid_x + half_dot, dot_size)
    ]),
    '|': create_rect_glyph([(mid_x - int(2.5 * PIXEL_SCALE), -int(6 * PIXEL_SCALE), mid_x + int(2.5 * PIXEL_SCALE), int(38 * PIXEL_SCALE))]),
    '(': create_rect_glyph([
        (mid_x - int(2 * PIXEL_SCALE), int(6 * PIXEL_SCALE), mid_x + int(3 * PIXEL_SCALE), int(34 * PIXEL_SCALE)),
        (mid_x + int(3 * PIXEL_SCALE), int(34 * PIXEL_SCALE), mid_x + int(8 * PIXEL_SCALE), int(39 * PIXEL_SCALE)),
        (mid_x + int(3 * PIXEL_SCALE), int(1 * PIXEL_SCALE), mid_x + int(8 * PIXEL_SCALE), int(6 * PIXEL_SCALE))
    ]),
    ')': create_rect_glyph([
        (mid_x - int(3 * PIXEL_SCALE), int(6 * PIXEL_SCALE), mid_x + int(2 * PIXEL_SCALE), int(34 * PIXEL_SCALE)),
        (mid_x - int(8 * PIXEL_SCALE), int(34 * PIXEL_SCALE), mid_x - int(3 * PIXEL_SCALE), int(39 * PIXEL_SCALE)),
        (mid_x - int(8 * PIXEL_SCALE), int(1 * PIXEL_SCALE), mid_x - int(3 * PIXEL_SCALE), int(6 * PIXEL_SCALE))
    ]),
    '+': create_rect_glyph([
        (mid_x - int(9 * PIXEL_SCALE), int(16 * PIXEL_SCALE), mid_x + int(9 * PIXEL_SCALE), int(21 * PIXEL_SCALE)),
        (mid_x - int(2.5 * PIXEL_SCALE), int(10 * PIXEL_SCALE), mid_x + int(2.5 * PIXEL_SCALE), int(27 * PIXEL_SCALE))
    ]),
    '=': create_rect_glyph([
        (mid_x - int(9 * PIXEL_SCALE), int(12 * PIXEL_SCALE), mid_x + int(9 * PIXEL_SCALE), int(16 * PIXEL_SCALE)),
        (mid_x - int(9 * PIXEL_SCALE), int(21 * PIXEL_SCALE), mid_x + int(9 * PIXEL_SCALE), int(25 * PIXEL_SCALE))
    ]),
    '>': create_rect_glyph([
        (mid_x - int(6 * PIXEL_SCALE), int(26 * PIXEL_SCALE), mid_x + int(6 * PIXEL_SCALE), int(30 * PIXEL_SCALE)),
        (mid_x - int(6 * PIXEL_SCALE), int(8 * PIXEL_SCALE), mid_x + int(6 * PIXEL_SCALE), int(12 * PIXEL_SCALE)),
        (mid_x + int(4 * PIXEL_SCALE), int(12 * PIXEL_SCALE), mid_x + int(8 * PIXEL_SCALE), int(26 * PIXEL_SCALE))
    ]),
    '<': create_rect_glyph([
        (mid_x - int(6 * PIXEL_SCALE), int(26 * PIXEL_SCALE), mid_x + int(6 * PIXEL_SCALE), int(30 * PIXEL_SCALE)),
        (mid_x - int(6 * PIXEL_SCALE), int(8 * PIXEL_SCALE), mid_x + int(6 * PIXEL_SCALE), int(12 * PIXEL_SCALE)),
        (mid_x - int(8 * PIXEL_SCALE), int(12 * PIXEL_SCALE), mid_x - int(4 * PIXEL_SCALE), int(26 * PIXEL_SCALE))
    ]),
    '*': create_rect_glyph([
        (mid_x - int(6 * PIXEL_SCALE), int(22 * PIXEL_SCALE), mid_x + int(6 * PIXEL_SCALE), int(26 * PIXEL_SCALE)),
        (mid_x - int(2 * PIXEL_SCALE), int(18 * PIXEL_SCALE), mid_x + int(2 * PIXEL_SCALE), int(30 * PIXEL_SCALE))
    ])
}

# --- 4. Assemble Glyphs ---
glyph_order = ['.notdef', 'space']
cmap = {ord(' '): 'space'}
glyphs = {}
h_metrics = {}

# Space & .notdef
pen_space = TTGlyphPen(None)
glyphs['space'] = pen_space.glyph()
h_metrics['space'] = (ADVANCE_WIDTH, 0)

pen_notdef = TTGlyphPen(None)
pen_notdef.moveTo((100, 0))
pen_notdef.lineTo((ADVANCE_WIDTH - 100, 0))
pen_notdef.lineTo((ADVANCE_WIDTH - 100, 700))
pen_notdef.lineTo((100, 700))
pen_notdef.closePath()
pen_notdef.moveTo((150, 50))
pen_notdef.lineTo((150, 650))
pen_notdef.lineTo((ADVANCE_WIDTH - 150, 650))
pen_notdef.lineTo((ADVANCE_WIDTH - 150, 50))
pen_notdef.closePath()
glyphs['.notdef'] = pen_notdef.glyph()
h_metrics['.notdef'] = (ADVANCE_WIDTH, 100)

# Add extracted glyphs
for ch, (b_img, base_y) in glyphs_bitmap.items():
    name = f"uni{ord(ch):04X}"
    glyph_order.append(name)
    cmap[ord(ch)] = name
    glyphs[name] = create_glyph_contours(b_img, base_y)
    h_metrics[name] = (ADVANCE_WIDTH, 50)

# Add punctuation
for ch, g in punctuation_glyphs.items():
    name = f"uni{ord(ch):04X}"
    glyph_order.append(name)
    cmap[ord(ch)] = name
    glyphs[name] = g
    h_metrics[name] = (ADVANCE_WIDTH, 50)

# --- 5. Generate Font via FontBuilder ---
print("Building TrueType Font table structures...")
fb = FontBuilder(unitsPerEm=UNITS_PER_EM, isTTF=True)
fb.setupGlyphOrder(glyph_order)
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(h_metrics)
fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
fb.setupNameTable({
    "familyName": "VHS Mono",
    "styleName": "Regular",
    "uniqueFontIdentifier": "VHS Mono: 1.0.0",
    "fullName": "VHS Mono",
    "psName": "VHSMono-Regular"
})
fb.setupOS2(
    sTypoAscender=ASCENDER,
    sTypoDescender=DESCENDER,
    usWeightClass=400,
    usWidthClass=5
)
fb.setupPost()
fb.save(TARGET_TTF)
print(f"✓ Saved {TARGET_TTF} ({os.path.getsize(TARGET_TTF)} bytes)")

# Convert to WOFF
font_woff = TTFont(TARGET_TTF)
font_woff.flavor = 'woff'
font_woff.save(TARGET_WOFF)
print(f"✓ Saved {TARGET_WOFF} ({os.path.getsize(TARGET_WOFF)} bytes)")

print("\nDone! Full VHS/MONO font generated successfully.")
