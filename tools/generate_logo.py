#!/usr/bin/env python3
"""
Generate the NavCube SVG logo.

Pixel-faithful replica of the real NavCubeOverlay widget, scaled up:
  - All 26 faces with perspective-correct affine-mapped labels
  - Exact arrow shapes copied from widget.py (_add_button_shape)
  - Pastel blue / pastel pinkish-red / pastel green / crimson accent palette
  - Near-black borders (matching real widget border_color)

Output: assets/logo.svg
Usage:  python3 tools/generate_logo.py
"""

import math, os

# ── Vector helpers ────────────────────────────────────────────────────────────

def norm(v):
    n = math.sqrt(sum(x*x for x in v))
    return [x/n for x in v] if n > 1e-10 else list(v)

def dot(a, b):   return sum(x*y for x, y in zip(a, b))
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def add(a, b):   return [x+y for x, y in zip(a, b)]
def sub(a, b):   return [x-y for x, y in zip(a, b)]
def scl(v, s):   return [x*s for x in v]

# ── Face geometry — identical to widget.py ────────────────────────────────────

C = 0.12   # chamfer ratio

def build_face(xv, zv, ftype, label=None):
    yv = cross(xv, scl(zv, -1))
    lpts = None
    if ftype == 'corner':
        xc, yc = scl(xv, C), scl(yv, C)
        zc = scl(zv, 1 - 2*C)
        pts = [
            sub(zc, scl(xv, 2*C)),
            sub(sub(zc, xc), yc), sub(add(zc, xc), yc),
            add(zc, scl(xv, 2*C)),
            add(add(zc, xc), yc), add(sub(zc, xc), yc),
        ]
    elif ftype == 'edge':
        x4, ye, ze = scl(xv, 1-C*4), scl(yv, C), scl(zv, 1-C)
        pts = [sub(sub(ze,x4),ye), sub(add(ze,x4),ye),
               add(add(ze,x4),ye), add(sub(ze,x4),ye)]
    else:  # main — octagonal
        x2, y2 = scl(xv, 1-C*2), scl(yv, 1-C*2)
        x4, y4 = scl(xv, 1-C*4), scl(yv, 1-C*4)
        pts = [
            sub(sub(zv,x2),y4), sub(sub(zv,x4),y2),
            sub(add(zv,x4),y2), sub(add(zv,x2),y4),
            add(add(zv,x2),y4), add(add(zv,x4),y2),
            add(sub(zv,x4),y2), add(sub(zv,x2),y4),
        ]
        # label_pts = [BL, BR, TR, TL]
        lpts = [sub(sub(zv,x2),y2), sub(add(zv,x2),y2),
                add(add(zv,x2),y2), add(sub(zv,x2),y2)]
    ctr = scl([sum(p[i] for p in pts) for i in range(3)], 1/len(pts))
    return {'pts': pts, 'normal': norm(ctr), 'ctr': ctr,
            'type': ftype, 'label': label, 'lpts': lpts}

ALL_FACES = [
    ('TOP',          build_face([1,0,0],   [0,0,1],    'main', 'TOP')),
    ('FRONT',        build_face([1,0,0],   [0,-1,0],   'main', 'FRONT')),
    ('RIGHT',        build_face([0,1,0],   [1,0,0],    'main', 'RIGHT')),
    ('LEFT',         build_face([0,-1,0],  [-1,0,0],   'main', 'LEFT')),
    ('BACK',         build_face([-1,0,0],  [0,1,0],    'main', 'BACK')),
    ('BOTTOM',       build_face([1,0,0],   [0,0,-1],   'main', 'BOTTOM')),
    ('FTR',          build_face([-1,-1,0], [1,-1,1],   'corner')),
    ('FTL',          build_face([-1,1,0],  [-1,-1,1],  'corner')),
    ('FBR',          build_face([1,1,0],   [1,-1,-1],  'corner')),
    ('FBL',          build_face([1,-1,0],  [-1,-1,-1], 'corner')),
    ('RTR',          build_face([1,-1,0],  [1,1,1],    'corner')),
    ('RTL',          build_face([1,1,0],   [-1,1,1],   'corner')),
    ('RBR',          build_face([-1,1,0],  [1,1,-1],   'corner')),
    ('RBL',          build_face([-1,-1,0], [-1,1,-1],  'corner')),
    ('FRONT_TOP',    build_face([1,0,0],   [0,-1,1],   'edge')),
    ('FRONT_BOTTOM', build_face([1,0,0],   [0,-1,-1],  'edge')),
    ('REAR_BOTTOM',  build_face([1,0,0],   [0,1,-1],   'edge')),
    ('REAR_TOP',     build_face([1,0,0],   [0,1,1],    'edge')),
    ('REAR_RIGHT',   build_face([0,0,1],   [1,1,0],    'edge')),
    ('FRONT_RIGHT',  build_face([0,0,1],   [1,-1,0],   'edge')),
    ('FRONT_LEFT',   build_face([0,0,1],   [-1,-1,0],  'edge')),
    ('REAR_LEFT',    build_face([0,0,1],   [-1,1,0],   'edge')),
    ('TOP_LEFT',     build_face([0,1,0],   [0,1,1],    'edge')),
    ('TOP_RIGHT',    build_face([0,1,0],   [1,0,1],    'edge')),
    ('BOTTOM_RIGHT', build_face([0,1,0],   [1,0,-1],   'edge')),
    ('BOTTOM_LEFT',  build_face([0,1,0],   [-1,0,-1],  'edge')),
]

# ── Camera — ISO front-right-top (matches widget default) ────────────────────

DIR = norm([-1, 1, -1])
R_  = norm(cross(DIR, [0,0,1]))
U_  = norm(cross(R_, DIR))

# ── Layout constants — scaled up from real widget (size=120, padding=10) ──────

_K      = 512 / 140.0          # scale factor: real widget (120+2*10=140) → 512
SIZE    = round(120 * _K)       # cube area = 439
PAD     = (512 - SIZE) // 2     # padding each side = 36
S3D     = 27.0 * _K             # 3-D projection scale ≈ 98.7
CX      = SIZE / 2 + PAD        # SVG cube centre x = 255.5 ≈ 256
CY      = SIZE / 2 + PAD        # SVG cube centre y

VIS_THR = 0.0   # back-face cull — use same convention as widget (dot < 0)

def proj(pt3):
    """3-D point → SVG (x, y)."""
    return dot(pt3, R_)*S3D + CX, -dot(pt3, U_)*S3D + CY

# ── Pastel + crimson palette ──────────────────────────────────────────────────

LIGHT = norm([0.5, -1.0, 1.6])

# Base RGB colours before shading
BASE = {
    'TOP':          (165, 212, 248),   # pastel sky blue
    'FRONT':        (248, 155, 150),   # pastel pinkish-red
    'RIGHT':        (148, 228, 175),   # pastel mint green
    'FRONT_TOP':    (195,  58,  58),   # crimson red  ← the accent edge
    'TOP_RIGHT':    (152, 218, 212),   # blue-green blend
    'FRONT_RIGHT':  (198, 192, 162),   # pink-green blend
    'FTR':          (228, 175, 175),   # warm pinkish corner
    'FTL':          (200, 168, 195),   # purple-pink corner
    'FBR':          (162, 210, 170),   # green corner
    'RTR':          (155, 200, 225),   # blue corner
    '_edge':        (200, 192, 210),   # default edge
    '_corner':      (205, 198, 212),   # default corner
}

BORDER_MAIN = '#1a1a1e'
BORDER_SEC  = '#2a2a30'
SHADOW_COL  = 'rgba(20,15,40,0.22)'

def face_fill(name, normal, ftype):
    key = name if name in BASE else ('_edge' if ftype == 'edge' else '_corner')
    base = BASE[key]
    # Same shading formula as widget: 0.85 + 0.15 * max(0, n·light)
    shade = 0.85 + 0.15 * max(0.0, dot(normal, LIGHT))
    return '#{:02x}{:02x}{:02x}'.format(
        min(255, int(base[0]*shade)),
        min(255, int(base[1]*shade)),
        min(255, int(base[2]*shade)),
    )

# ── Affine label transform (mirrors widget.py _draw_label logic) ──────────────
#
#  src quad (text canvas 200×200) in order [TL, TR, BR, BL]:
#    TL=(0,0)  TR=(200,0)  BR=(200,200)  BL=(0,200)
#
#  face lpts = [BL, BR, TR, TL]
#  dst = [lpts[3], lpts[2], lpts[1], lpts[0]] = [TL, TR, BR, BL]
#
#  We use 3 points for the affine approx (exact for parallelogram faces).

def label_transform(lpts_3d):
    """Compute SVG matrix(a,b,c,d,e,f) for text→face affine mapping."""
    lp = [proj(p) for p in lpts_3d]               # project all 4
    # dst order: TL=lp[3], TR=lp[2], BL=lp[0]
    d0, d1, d2 = lp[3], lp[2], lp[0]              # TL, TR, BL
    s0, s1, s2 = (0,0), (200,0), (0,200)           # src TL, TR, BL

    sx, sy = s1[0]-s0[0], s2[0]-s0[0]              # = 200, 0
    tx, ty = s1[1]-s0[1], s2[1]-s0[1]              # = 0, 200
    det = sx*ty - sy*tx                             # = 40000
    if abs(det) < 1e-10: return None

    idx, idy = ty/det, -sy/det                      # 0.005, 0
    itx, ity = -tx/det, sx/det                      # 0, 0.005

    dx, dy = d1[0]-d0[0], d2[0]-d0[0]
    ex, ey = d1[1]-d0[1], d2[1]-d0[1]

    a  = dx*idx + dy*itx
    c  = dx*idy + dy*ity
    b  = ex*idx + ey*itx
    dd = ex*idy + ey*ity
    e  = d0[0] - a*s0[0] - c*s0[1]
    f  = d0[1] - b*s0[0] - dd*s0[1]
    return a, b, c, dd, e, f

# ── Button shapes — exact point_data from widget.py _add_button_shape ─────────

_ROLL_DATA = [
    66.6,-66.6, 58.3,-74.0, 49.2,-80.3, 39.4,-85.5,
    29.0,-89.5, 25.3,-78.1, 34.3,-74.3, 42.8,-69.9,
    50.8,-64.4, 58.1,-58.1, 53.8,-53.8, 74.7,-46.8,
    70.7,-70.4,
]
_ARROW_DATA = [100.0, 0.0, 80.0, -18.0, 80.0, 18.0]
_MENU_DATA  = [
     0.0,  0.0,  15.0,  -6.0,   0.0, -12.0, -15.0,  -6.0,  0.0,  0.0,
   -15.0, -6.0, -15.0,  12.0,   0.0,  18.0,   0.0,   0.0,  0.0, 18.0,
    15.0, 12.0,  15.0,  -6.0,
]

def btn_pts(name, point_data, size, pad):
    """Compute SVG global coords for a button polygon (from widget.py logic)."""
    sc  = 0.005
    ox  = 0.84 if name == 'ViewMenu' else 0.5
    oy  = 0.84 if name == 'ViewMenu' else 0.5
    out = []
    for i in range(len(point_data) // 2):
        xv = point_data[i*2]   * sc + ox
        yv = point_data[i*2+1] * sc + oy
        if name in ('ArrowNorth', 'ArrowWest', 'ArrowLeft'):
            xv = 1.0 - xv
        if name in ('ArrowSouth', 'ArrowNorth'):
            out.append((yv*size + pad, xv*size + pad))   # swap x/y
        else:
            out.append((xv*size + pad, yv*size + pad))
    return out

# DotBackside — circle, not polygon
_dot_cx = 0.935 * SIZE + PAD
_dot_cy = 0.065 * SIZE + PAD
_dot_r  = 0.05  * SIZE

# ── Collect visible faces ─────────────────────────────────────────────────────

visible = []
for name, face in ALL_FACES:
    # widget uses: if float(np.dot(f['n'], D)) < self._VIS  → _VIS = 0
    if dot(face['normal'], DIR) < 0:
        pts2d = [proj(p) for p in face['pts']]
        depth = dot(face['ctr'], DIR)
        visible.append((depth, name, face, pts2d))
visible.sort(key=lambda x: -x[0])  # far faces first

# ── SVG helpers ───────────────────────────────────────────────────────────────

BTN_FILL   = '#ede8f5'
BTN_STROKE = BORDER_MAIN
BTN_SW     = max(1.0, 1.4 * _K / 3.657)   # ~1.4 at full scale

def poly_svg(pts, fill, stroke, sw, extra=''):
    ps = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return (f'<polygon points="{ps}" fill="{fill}" stroke="{stroke}" '
            f'stroke-width="{sw:.1f}" stroke-linejoin="round"{extra}/>')

# ── Assemble SVG ──────────────────────────────────────────────────────────────

W = H = 512
lines = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
    f'viewBox="0 0 {W} {H}">',
    '',
    '<!-- ── Controls (arrows, dot, home) ─────────────────────────── -->',
]

for bname, bdata in [
    ('ArrowRight',  _ROLL_DATA),
    ('ArrowLeft',   _ROLL_DATA),
    ('ArrowNorth',  _ARROW_DATA),
    ('ArrowSouth',  _ARROW_DATA),
    ('ArrowEast',   _ARROW_DATA),
    ('ArrowWest',   _ARROW_DATA),
    ('ViewMenu',    _MENU_DATA),
]:
    pts = btn_pts(bname, bdata, SIZE, PAD)
    lines.append(poly_svg(pts, BTN_FILL, BTN_STROKE, BTN_SW))

# DotBackside — circle
lines.append(
    f'<circle cx="{_dot_cx:.1f}" cy="{_dot_cy:.1f}" r="{_dot_r:.1f}" '
    f'fill="{BTN_FILL}" stroke="{BTN_STROKE}" stroke-width="{BTN_SW:.1f}"/>'
)

lines += ['', '<!-- ── Drop shadow ──────────────────────────────────────── -->',
          '<g>']

# Shadow pass — draw face shadows slightly offset (matches widget)
sx_off = 1.8 * _K / 3.657   # ~1.8 at scale
sy_off = 2.3 * _K / 3.657   # ~2.3 at scale
for depth, name, face, pts2d in visible:
    spts = [(x + sx_off, y + sy_off) for x, y in pts2d]
    sp   = ' '.join(f'{x:.1f},{y:.1f}' for x, y in spts)
    lines.append(f'<polygon points="{sp}" fill="{SHADOW_COL}"/>')

lines += ['</g>', '', '<!-- ── Cube faces ────────────────────────────────────── -->']

BW_MAIN = 2.0 * _K / 3.657
BW_SEC  = 1.2 * _K / 3.657

for depth, name, face, pts2d in visible:
    fill   = face_fill(name, face['normal'], face['type'])
    is_main = face['type'] == 'main'
    stroke  = BORDER_MAIN if is_main else BORDER_SEC
    bw      = BW_MAIN if is_main else BW_SEC
    lines.append(poly_svg(pts2d, fill, stroke, bw))

lines += ['', '<!-- ── Face labels (affine-mapped onto face plane) ──────── -->']

LABEL_FONT = 'Arial,Helvetica,sans-serif'
LABEL_FS   = {'TOP': 56, 'FRONT': 48, 'RIGHT': 50}  # in 200×200 source space

for depth, name, face, pts2d in visible:
    if not (face.get('label') and name in LABEL_FS):
        continue
    tf = label_transform(face['lpts'])
    if not tf:
        continue
    a, b, c, d, e, f = tf
    fs = LABEL_FS[name]
    lines.append(
        f'<text x="100" y="106" '
        f'font-family="{LABEL_FONT}" font-weight="bold" font-size="{fs}" '
        f'text-anchor="middle" dominant-baseline="middle" '
        f'fill="#1a1020" opacity="0.85" '
        f'transform="matrix({a:.5f},{b:.5f},{c:.5f},{d:.5f},{e:.2f},{f:.2f})">'
        f'{face["label"]}</text>'
    )

lines += ['', '</svg>']

# ── Write ─────────────────────────────────────────────────────────────────────

out_dir  = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'logo.svg')
with open(out_path, 'w') as f:
    f.write('\n'.join(lines))
print(f'Written: {os.path.realpath(out_path)}')
print(f'SIZE={SIZE}  PAD={PAD}  S3D={S3D:.1f}  CX={CX:.1f}')
