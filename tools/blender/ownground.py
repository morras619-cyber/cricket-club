# Your own club's ground (create-your-club), at one of its three levels, built in game units like
# thunderdome.py (Blender X = game x, Y = game z along the pitch, Z = height):
#   1 Community ground: an evening match, low terraces and grass banks, a small covered stand at each
#     end, trees, a scoreboard, four slim floodlights
#   2 Club stadium: a night ground, one tier all round under a roof, big screens, floodlights
#   3 Arena: two tiers, a band of crests, a steel truss with crest medallions, the club's sign over
#     each big screen, beams of light in the trim colour
# The game paints it in the club's colours (js/ownground.js), so it is rendered three ways:
#   MODE=base  the picture, every club-coloured surface a plain grey (GREY: the game multiplies by colour/GREY)
#   MODE=tint  where the colours go: R main colour, G trim (emission only, raw values)
#   MODE=uv    the crest pictures: R, G their own u, v; B the picture's id * 40 (one sample: exact)
#   LEVEL=<1|2|3> MODE=<base|tint|uv> python ownground.py -- <bat|bowl|keeper|top> <out.png> [samples] [pct]
import bpy, math, sys, os
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
VIEW, OUT = args[0], args[1]
SAMPLES = int(args[2]) if len(args) > 2 else 32
LEVEL = int(os.environ.get('LEVEL', '2'))
MODE = os.environ.get('MODE', 'base')
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex', 'own') + '/'  # made by prep_own.py
CY, ROPE = 10.0, 62.0
GREY = 0.7
# the crest pictures (js/ownground.js paints them): id -> (name, width m, height m)
PICS = {1: ('board', 7.0, 0.95), 2: ('facade', 6.0, 1.8), 3: ('medal', 4.6, 4.6), 4: ('screen', 13.0, 6.5), 5: ('sign', 27.0, 27 * 210 / 494), 6: ('score', 9.0, 4.4)}
NIGHT = True   # (all three are night games under the lights)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
ink = bpy.data.collections.new('ink'); sc.collection.children.link(ink)

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
def lin(v): return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def link(o, inked=False):
    (ink if inked else sc.collection).objects.link(o); return o

def mesh(name, verts, faces, uvs=None, mat=None, inked=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if uvs is not None:
        uv = me.uv_layers.new(name='UVMap')
        for f, poly in zip(faces, me.polygons):
            for li, vi in zip(poly.loop_indices, f):
                uv.data[li].uv = uvs[vi]
    o = bpy.data.objects.new(name, me)
    if mat: me.materials.append(mat)
    return link(o, inked)

def own(o, mat, inked=True):
    """a primitive just added: give it the material, into the ink collection"""
    o.data.materials.append(mat)
    if inked: sc.collection.objects.unlink(o); ink.objects.link(o)
    return o

# ---------- materials, each tagged with what it is in the tint and uv passes ----------
TAG = {}   # material name -> ('tint', s, t) | ('pic', id) | ('crowd',) | ('logo',) | None (black in the passes)
def nodes(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')

def img(path): return bpy.data.images.load(TEX + path)

def shaded(name, col_fn, emit=0.35):
    m, nt, out = nodes(name)
    col = col_fn(nt)
    d = nt.nodes.new('ShaderNodeBsdfDiffuse'); nt.links.new(col, d.inputs['Color'])
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(col, e.inputs['Color']); e.inputs['Strength'].default_value = emit
    a = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(d.outputs[0], a.inputs[0]); nt.links.new(e.outputs[0], a.inputs[1])
    nt.links.new(a.outputs[0], out.inputs[0])
    return m

def rgb_node(nt, c):
    n = nt.nodes.new('ShaderNodeRGB'); n.outputs[0].default_value = (*c, 1); return n.outputs[0]

def flat(name, hexc, emit=0.35):
    m = shaded(name, lambda nt: rgb_node(nt, srgb(hexc)), emit); TAG[m.name] = None; return m

def club(name, which, shade=1.0, emit=0.35):
    """a surface in the club's main colour (which='s') or trim ('t'): grey here, painted by the game"""
    g = lin(GREY * shade)
    m = shaded(name, lambda nt: rgb_node(nt, (g, g, g)), emit)
    TAG[m.name] = ('tint', 1, 0) if which == 's' else ('tint', 0, 1)
    return m

def glow(name, rgb, s=1.0):
    m, nt, out = nodes(name)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*rgb, 1); e.inputs['Strength'].default_value = s
    nt.links.new(e.outputs[0], out.inputs[0]); TAG[m.name] = None; return m

def picture(name, path, strength=1.0):
    m, nt, out = nodes(name)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(path)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = strength
    nt.links.new(t.outputs['Color'], e.inputs['Color']); nt.links.new(e.outputs[0], out.inputs[0])
    TAG[m.name] = None; return m

def pic(pid):
    """a crest picture's surface: a dark plate here, the game lays the picture on it"""
    m = glow(PICS[pid][0], srgb('#141b33'), 1.0); TAG[m.name] = ('pic', pid); return m

# ---------- the field ----------
def grass_color(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (2.5 / 20, 0, 0); mp.inputs['Scale'].default_value = (1 / 20, 1 / 20, 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img('grass.png'); nt.links.new(mp.outputs[0], t.inputs['Vector'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    dy = nt.nodes.new('ShaderNodeMath'); dy.operation = 'SUBTRACT'; dy.inputs[1].default_value = CY; nt.links.new(sep.outputs['Y'], dy.inputs[0])
    cmb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(sep.outputs['X'], cmb.inputs[0]); nt.links.new(dy.outputs[0], cmb.inputs[1])
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nt.links.new(cmb.outputs[0], ln.inputs[0])
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = ROPE + 0.2; nt.links.new(ln.outputs['Value'], gt.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs[7].default_value = (0.72, 0.78, 0.72, 1)
    nt.links.new(gt.outputs[0], mix.inputs[0]); nt.links.new(t.outputs['Color'], mix.inputs[6])
    return mix.outputs[2]
grass = shaded('grass', grass_color, emit=0.62 if NIGHT else 0.5); TAG[grass.name] = None
bpy.ops.mesh.primitive_circle_add(vertices=256, radius=80, fill_type='TRIFAN', location=(0, 0, 0))
g = bpy.context.active_object
for v in g.data.vertices: v.co.y += CY
g.data.materials.append(grass)

PX, PZ0, PZ1 = 1.52, -2.0, 22.0
pm = shaded('pitch', lambda nt: (lambda t: (setattr(t, 'image', img('pitch.png')), setattr(t, 'extension', 'EXTEND'), t.outputs['Color'])[2])(nt.nodes.new('ShaderNodeTexImage')), emit=0.62 if NIGHT else 0.5)
TAG[pm.name] = None
_nt = pm.node_tree; _t = [n for n in _nt.nodes if n.type == 'TEX_IMAGE'][0]; _o = _nt.nodes['Material Output']
_add = _o.inputs[0].links[0].from_node
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_t.outputs['Alpha'], _mx.inputs[0]); _nt.links.new(_tr.outputs[0], _mx.inputs[1]); _nt.links.new(_add.outputs[0], _mx.inputs[2])
_nt.links.new(_mx.outputs[0], _o.inputs[0])
mesh('pitch', [(-PX, PZ0, 0.006), (PX, PZ0, 0.006), (PX, PZ1, 0.006), (-PX, PZ1, 0.006)], [(0, 1, 2, 3)], uvs=[(0.04, 0), (0.96, 0), (0.96, 1), (0.04, 1)], mat=pm)

cr = glow('crease', srgb('#fffdf0'), 1.0)
def strip(x0, z0, x1, z1, w=0.05, h=0.012, mat=cr):
    d = Vector((x1 - x0, z1 - z0)); n = Vector((-d.y, d.x)).normalized() * w / 2
    return mesh('line', [(x0 + n.x, z0 + n.y, h), (x1 + n.x, z1 + n.y, h), (x1 - n.x, z1 - n.y, h), (x0 - n.x, z0 - n.y, h)], [(0, 1, 2, 3)], mat=mat)
PE = PX - 0.06
for z, d in ((0, 1), (20, -1)):
    strip(-PE, z + 1.22 * d, PE, z + 1.22 * d); strip(-1.32, z, 1.32, z)
    for x in (-1.32, 1.32): strip(x, z + 1.22 * d, x, z - 1.22 * d)
dash = bpy.data.materials.new('dash'); dash.use_nodes = True; TAG[dash.name] = None
nt = dash.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1, 1, 1, 1)
tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = 0.5
nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], o_.inputs[0])
for i in range(100):
    a0 = i / 100 * 2 * math.pi; a1 = a0 + 2 * math.pi / 100 * 0.55
    strip(27 * math.cos(a0), CY + 27 * math.sin(a0), 27 * math.cos(a1), CY + 27 * math.sin(a1), w=0.14, mat=dash)
rope = club('rope', 't', 1.0, 0.5)
bpy.ops.mesh.primitive_torus_add(location=(0, CY, 0.08), major_radius=ROPE, minor_radius=0.08, major_segments=256, minor_segments=8)
r_ = bpy.context.active_object; r_.data.materials.append(rope)
for p in r_.data.polygons: p.use_smooth = True

# ---------- helpers ----------
def ring_surface(name, profile, mat, a0=0, a1=2 * math.pi, seg=256, u_len=None, v_rep=1, inked=False, u_off=0.0):
    verts, faces = [], []
    n = max(2, int(seg * (a1 - a0) / (2 * math.pi)))
    P = len(profile)
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        for rr, hh in profile: verts.append((rr * math.cos(a), CY + rr * math.sin(a), hh))
    for i in range(n):
        for j in range(P - 1): faces.append((i * P + j, (i + 1) * P + j, (i + 1) * P + j + 1, i * P + j + 1))
    rm = sum(p[0] for p in profile) / P
    def uvof(vi):
        i, j = divmod(vi, P); a = a0 + (a1 - a0) * i / n
        return ((a - a0 - u_off) * rm / (u_len or 1), v_rep * j / (P - 1))
    return mesh(name, verts, faces, uvs=[uvof(i) for i in range(len(verts))], mat=mat, inked=inked)

def arc_quads(name, r, h0, h1, w, mat, a_skip=None, inked=True, a_from=0, a_to=2 * math.pi):
    """panels w metres wide round a ring at radius r, from h0 to h1, facing the middle, uv 0..1 each"""
    n = int((a_to - a_from) * r / w)
    for i in range(n):
        a0 = a_from + (a_to - a_from) * i / n; a1 = a_from + (a_to - a_from) * (i + 1) / n
        if a_skip and a_skip((a0 + a1) / 2): continue
        pts = [(r * math.cos(a0 + (a1 - a0) * k / 4), CY + r * math.sin(a0 + (a1 - a0) * k / 4)) for k in range(5)]
        verts = [(x, y, h0) for x, y in pts] + [(x, y, h1) for x, y in pts]
        uv = {k: (1 - k / 4, 0) for k in range(5)}; uv.update({5 + k: (1 - k / 4, 1) for k in range(5)})
        mesh(name, verts, [(k, k + 1, 6 + k, 5 + k) for k in range(4)], uvs=uv, mat=mat(i) if callable(mat) else mat, inked=inked)

def facing_quad(name, a, r, w, h0, h1, mat, inked=False):
    c, s_ = math.cos(a), math.sin(a)
    t = Vector((-s_, c, 0)); base = Vector((r * c, CY + r * s_, 0))
    q = [base - t * w / 2 + Vector((0, 0, h0)), base + t * w / 2 + Vector((0, 0, h0)), base + t * w / 2 + Vector((0, 0, h1)), base - t * w / 2 + Vector((0, 0, h1))]
    return mesh(name, [tuple(p) for p in q], [(0, 1, 2, 3)], uvs=[(1, 0), (0, 0), (0, 1), (1, 1)], mat=mat, inked=inked)

def at_end(a, half):  # within half radians of either end (behind the bowler or the batter)
    return min(abs((a - math.pi / 2 + math.pi) % (2 * math.pi) - math.pi), abs((a + math.pi / 2 + math.pi) % (2 * math.pi) - math.pi)) < half

# ---------- the boards: the game's logo, and the club crest ----------
def logo_board():
    """the game's logo on a board in the club's colour (darkened)"""
    m, nt, out = nodes('bLogo')
    BW = 7.0; lw = 2.85 / BW
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
    mp.inputs['Scale'].default_value = (1 / lw, 1, 1); mp.inputs['Location'].default_value = (-(1 - lw) / 2 / lw, 0, 0)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img('logo-sixcharge.png'); t.extension = 'CLIP'
    nt.links.new(mp.outputs[0], t.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; g_ = lin(GREY * 0.42); mix.inputs[6].default_value = (g_, g_, g_, 1)
    nt.links.new(t.outputs['Alpha'], mix.inputs[0]); nt.links.new(t.outputs['Color'], mix.inputs[7])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.0
    nt.links.new(mix.outputs[2], e.inputs['Color']); nt.links.new(e.outputs[0], out.inputs[0])
    TAG[m.name] = ('logo', t); return m
BR, BH = 63.8, 0.95
bl, bc = logo_board(), pic(1)
arc_quads('board', BR, 0, BH, 7.0, lambda i: (bl, bc)[i % 2])

# ---------- the stands ----------
wall = club('wall', 's', 0.55, 0.45)
darkc = club('darkc', 's', 0.22, 0.4)
fascia = club('fascia', 't', 1.0, 0.5)
canopy = club('canopy', 's', 0.75, 0.45)
steel = flat('steel', '#aeb8c4', 0.5)

def crowd_mat():
    m, nt, out = nodes('crowd')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img('crowd.png')
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.0 if NIGHT else 0.95
    nt.links.new(t.outputs['Color'], e.inputs['Color']); nt.links.new(e.outputs[0], out.inputs[0])
    TAG[m.name] = ('crowd',); return m
crowd = crowd_mat()
cw, ch = crowd.node_tree.nodes['Image Texture'].image.size
def crowd_ring(name, prof, a0=0, a1=2 * math.pi, turn=0.0):
    slope = math.hypot(prof[1][0] - prof[0][0], prof[1][1] - prof[0][1])
    return ring_surface(name, prof, crowd, a0=a0, a1=a1, u_len=slope * cw / ch, v_rep=1, u_off=turn)

track = club('track', 's', 0.3, 0.45)
ring_surface('track', [(76, 0.01), (79, 0.01)], track)

def roof(RF, RB, RH0, RH1, RC, a0=0, a1=2 * math.pi):
    ring_surface('fascia', [(RF, RH0), (RF, RH1)], fascia, a0=a0, a1=a1, inked=True)
    under = bpy.data.materials.new('under'); under.use_nodes = True; TAG[under.name] = None
    nt = under.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord'); vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 0.6
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.09; nt.links.new(vor.outputs['Distance'], lt.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[6].default_value = (*srgb('#0a0f24'), 1); mix.inputs[7].default_value = (1, 0.8, 0.45, 1)
    nt.links.new(lt.outputs[0], mix.inputs[0])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.2
    nt.links.new(mix.outputs[2], e.inputs['Color']); nt.links.new(e.outputs[0], o_.inputs[0])
    ring_surface('under', [(RF, RH0), (RB, RH0 + 0.4)], under, a0=a0, a1=a1)
    ring_surface('canopy', [(RF, RH1), (RC, RH1 + 1.2)], canopy, a0=a0, a1=a1, inked=True)

def screen(a, pid, r=83.5, w=13, h0=3.6, h1=10.1):
    """a big screen (or scoreboard) on steel legs, facing the middle"""
    c, s = math.cos(a), math.sin(a)
    t = Vector((-s, c, 0)); base = Vector((r * c, CY + r * s, 0))
    facing_quad('screen', a, r, w, h0, h1, pic(pid), inked=True)
    out = Vector((c, s, 0)) * 0.6
    for side in (-1, 1):
        p = base + t * side * (w / 2 + 0.5)
        bpy.ops.mesh.primitive_cube_add(location=(p.x + out.x, p.y + out.y, h1 / 2 + 0.5), scale=(0.45, 0.45, h1 / 2 + 0.5))
        o = bpy.context.active_object; o.rotation_euler = (0, 0, a); own(o, steel)
    bpy.ops.mesh.primitive_cube_add(location=(base.x + out.x, base.y + out.y, h1 + 0.4), scale=(0.5, w / 2 + 0.9, 0.4))
    o = bpy.context.active_object; o.rotation_euler = (0, 0, a); own(o, wall)

END = 0.34  # the covered stands' half-width at each end (level 1), radians
if LEVEL == 1:
    ring_surface('wall', [(79, 0), (79, 1.0)], wall, inked=True)
    ring_surface('walltop', [(79, 1.0), (79.6, 1.0)], fascia)
    # the sides: a low terrace of fans, then a grass bank up to the trees
    bank = shaded('bank', lambda nt: rgb_node(nt, srgb('#2f7a2c')), 0.45); TAG[bank.name] = None
    for a0, a1 in ((-math.pi / 2 + END, math.pi / 2 - END), (math.pi / 2 + END, 3 * math.pi / 2 - END)):
        crowd_ring('crowd', [(79.6, 1.0), (85.5, 3.9)], a0, a1)
        ring_surface('bank', [(85.5, 3.9), (93, 6.2)], bank, a0=a0, a1=a1)
    # a covered stand at each end, its sign board along the roof
    for e_ in (math.pi / 2, -math.pi / 2):
        a0, a1 = e_ - END, e_ + END
        crowd_ring('crowd', [(79.6, 1.0), (89, 6.4)], a0, a1)
        ring_surface('back', [(89, 6.4), (89, 9.6)], darkc, a0=a0, a1=a1, inked=True)
        roof(86.5, 89.3, 8.6, 9.6, 92, a0, a1)
        for side in (-1, 1):  # the end walls
            a = e_ + side * END
            mesh('endwall', [(79.6 * math.cos(a), CY + 79.6 * math.sin(a), 1.0), (89 * math.cos(a), CY + 89 * math.sin(a), 1.0),
                             (89 * math.cos(a), CY + 89 * math.sin(a), 10.0), (86.5 * math.cos(a), CY + 86.5 * math.sin(a), 9.6), (79.6 * math.cos(a), CY + 79.6 * math.sin(a), 2.4)],
                 [(0, 1, 2, 3, 4)], mat=wall, inked=True)
        # bunting under the roof's edge, in the club's two colours
        flagS, flagT = club('flagS', 's', 1.0, 0.5), club('flagT', 't', 1.0, 0.5)
        nfl = int(2 * END * 86.2 / 1.1)
        for i in range(nfl):
            a = a0 + (a1 - a0) * (i + 0.5) / nfl; da = 0.42 / 86.2
            p = [(86.2 * math.cos(a - da), CY + 86.2 * math.sin(a - da), 8.55), (86.2 * math.cos(a + da), CY + 86.2 * math.sin(a + da), 8.55), (86.2 * math.cos(a), CY + 86.2 * math.sin(a), 7.75)]
            mesh('flag', p, [(0, 1, 2)], mat=(flagS, flagT)[i % 2], inked=True)
        # the scoreboard up on the roof
        screen(e_, 6, r=90.5, w=9.0, h0=10.6, h1=15.0)
    # trees round the back
    leaf = flat('leaf', '#1f5a2a', 0.4); trunk = flat('trunk', '#4a3424', 0.4)
    k = 0
    for i in range(70):
        a = 2 * math.pi * (i + 0.5) / 70
        rr = 97 + 6 * ((i * 37) % 7) / 7; hh = 7 + 4 * ((i * 53) % 5) / 5
        if at_end(a, END + 0.05): rr += 4; hh += 3
        x, y = rr * math.cos(a), CY + rr * math.sin(a)
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.5, depth=hh * 0.5, location=(x, y, hh * 0.25 + 4.5)); own(bpy.context.active_object, trunk)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=hh * 0.38, location=(x, y, 4.5 + hh * 0.62))
        o = own(bpy.context.active_object, leaf); o.scale = (1, 1, 1.15)
        for p in o.data.polygons: p.use_smooth = True
    ROOF = (86.5, 9.6)
elif LEVEL == 2:
    ring_surface('wall', [(79, 0), (79, 1.4)], wall, inked=True)
    ring_surface('walltop', [(79, 1.4), (79.6, 1.4)], fascia)
    crowd_ring('crowd', [(79.6, 1.4), (99, 12.0)])
    ring_surface('back', [(99, 12.0), (99, 13.6)], darkc)
    roof(94, 99, 13.2, 14.4, 104)
    screen(math.pi / 2, 4); screen(-math.pi / 2, 4)
    ROOF = (94, 14.4)
else:
    ring_surface('wall', [(79, 0), (79, 1.4)], wall, inked=True)
    ring_surface('walltop', [(79, 1.4), (79.6, 1.4)], fascia)
    crowd_ring('crowd', [(79.6, 1.4), (88.5, 6.2)])
    crowd_ring('crowd2', [(88.5, 8.0), (99, 13.6)], turn=0.37)
    ring_surface('tierlip', [(88.5, 6.2), (88.6, 6.2)], wall)
    arc_quads('facade', 88.5, 6.2, 8.0, 6.0, pic(2))
    ring_surface('back', [(99, 13.6), (99, 14.2)], darkc)
    roof(94, 99, 13.2, 14.4, 104)
    screen(math.pi / 2, 4); screen(-math.pi / 2, 4)
    # the truss along the roof, the crest medallions on it, the club's sign over each screen
    RT, TB, TT = 95.5, 15.6, 18.6
    ring_surface('rail1', [(RT, TB), (RT, TB + 0.35)], fascia, inked=True)
    ring_surface('rail2', [(RT, TT - 0.35), (RT, TT)], fascia, inked=True)
    nseg = int(2 * math.pi * RT / 5)
    for i in range(nseg):
        a = 2 * math.pi * i / nseg; a2 = 2 * math.pi * (i + 1) / nseg
        p0 = Vector((RT * math.cos(a), CY + RT * math.sin(a), TB)); p1 = Vector((RT * math.cos(a2), CY + RT * math.sin(a2), TT))
        for A, B in ((p0, p0 + Vector((0, 0, TT - TB))), (p0, p1)):
            d = B - A; mid = (A + B) / 2
            bpy.ops.mesh.primitive_cube_add(location=mid, scale=(0.14, 0.14, d.length / 2))
            o = bpy.context.active_object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); own(o, steel)
    med = pic(3)
    for k in range(18):
        a = 2 * math.pi * (k + 0.5) / 18
        if at_end(a, 0.25): continue
        facing_quad('medal', a, RT - 0.4, 4.6, TB - 0.6, TB + 4.0, med)
    sg = pic(5)
    for a in (math.pi / 2, -math.pi / 2):
        facing_quad('sign', a, RT - 0.8, PICS[5][1], TT - 3.0, TT - 3.0 + PICS[5][2], sg)
    ROOF = (94, 14.4)

# ---------- floodlights ----------
lamp = glow('lamp', (1, 0.97, 0.86), 8)
tower = flat('tower', '#c8cdd8', 0.5)
head_m = flat('head', '#2a2f3d', 0.45)
def halo(p, rad, strength):
    m = bpy.data.materials.new('halo'); m.use_nodes = True; TAG[m.name] = None
    nt = m.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 3.0
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs['Facing'], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1, 0.9, 0.6, 1); e.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(pw.outputs[0], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], o_.inputs[0])
    bpy.ops.mesh.primitive_uv_sphere_add(location=p, radius=rad, segments=32, ring_count=16)
    o = bpy.context.active_object; o.data.materials.append(m)
    for f in o.data.polygons: f.use_smooth = True
    o.visible_shadow = False
LR, HT, HS = ((104, 17.0, 0.6) if LEVEL == 1 else (108, 24.0, 1.0))
HEADS = []
for side in (-1, 1):
    for end in (-1, 1):
        a = math.pi / 2 * end + side * math.radians(13 if LEVEL > 1 else 27)
        x, y = LR * math.cos(a), CY + LR * math.sin(a)
        legs = (-1, 1) if LEVEL > 1 else (0,)
        for dx in legs:
            bpy.ops.mesh.primitive_cube_add(location=(x + dx * 0.9 * math.sin(a), y - dx * 0.9 * math.cos(a), HT / 2), scale=(0.35 if LEVEL > 1 else 0.3, 0.35 if LEVEL > 1 else 0.3, HT / 2))
            own(bpy.context.active_object, tower)
        face = math.atan2(CY - y, -x)
        bpy.ops.mesh.primitive_cube_add(location=(x, y, HT + 2.2 * HS), scale=(0.4, 4.6 * HS, 2.6 * HS))
        head = bpy.context.active_object; head.rotation_euler = (0, math.radians(-18), face); own(head, head_m)
        fwd = Vector((math.cos(face), math.sin(face), 0))
        for i in range(4):
            for j in range(3):
                off = Vector((0, (i - 1.5) * 2.2 * HS, (j - 1) * 1.65 * HS)); off.rotate(head.rotation_euler)
                bpy.ops.mesh.primitive_uv_sphere_add(location=head.location + off + fwd * 0.45, radius=0.78 * HS, segments=16, ring_count=8)
                l = bpy.context.active_object; l.data.materials.append(lamp); l.visible_shadow = False
        halo(head.location + fwd * 2.5, 6.5 * HS, 0.9 if NIGHT else 0.5)
        HEADS.append(head.location.copy())
        bpy.ops.object.light_add(type='SPOT', location=head.location + fwd * 2)
        L = bpy.context.active_object; L.data.energy = 2.2e5 * (0.75 if LEVEL == 1 else 1.0); L.data.spot_size = math.radians(70); L.data.spot_blend = 0.6
        L.data.shadow_soft_size = 3; L.data.color = (1, 0.96, 0.88)
        L.rotation_euler = (Vector((0, CY, 0)) - L.location).to_track_quat('-Z', 'Y').to_euler()

if LEVEL == 3:
    # the beams: long soft cones of the trim colour reaching up over the ground
    bm = bpy.data.materials.new('beam'); bm.use_nodes = True; TAG[bm.name] = ('beam',)
    nt = bm.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.6
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; nt.links.new(lw.outputs['Facing'], inv.inputs[1])
    near = nt.nodes.new('ShaderNodeMath'); near.operation = 'SUBTRACT'; near.inputs[0].default_value = 1.0; nt.links.new(sep.outputs['Z'], near.inputs[1])
    along = nt.nodes.new('ShaderNodeMath'); along.operation = 'MULTIPLY'; nt.links.new(near.outputs[0], along.inputs[0]); along.inputs[1].default_value = 0.55
    f = nt.nodes.new('ShaderNodeMath'); f.operation = 'MULTIPLY'; nt.links.new(inv.outputs[0], f.inputs[0]); nt.links.new(along.outputs[0], f.inputs[1])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (lin(GREY), lin(GREY), lin(GREY), 1); e.inputs['Strength'].default_value = 1.4
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(f.outputs[0], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], o_.inputs[0])
    for hp in HEADS:
        tgt = Vector((-hp.x * 0.35, CY + (hp.y - CY) * 0.25, 58))
        d = tgt - hp; L_ = d.length
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=1.5, radius2=16, depth=L_, location=hp + d / 2, end_fill_type='NOTHING')
        o = bpy.context.active_object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.name = 'beam'
        o.data.materials.append(bm); o.visible_shadow = False
        for pl in o.data.polygons: pl.use_smooth = True

# the city behind
sky_pic = picture('skyline', 'skyline.png', 1.0 if NIGHT else 0.8)
R2 = 430
h0, h1, copies = (48, 140, 1)
ring_surface('skyline', [(R2, h0), (R2, h1)], sky_pic, u_len=2 * math.pi * R2 / copies, v_rep=1, u_off=math.radians(45))
ring_surface('cityfoot', [(R2, -5), (R2, h0 + 0.2)], glow('cityfoot', srgb('#0b1640' if NIGHT else '#2a2346'), 1.0))

# ---------- world ----------
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
wn = w.node_tree; bg = wn.nodes['Background']; bg.inputs['Strength'].default_value = 1.0
tcw = wn.nodes.new('ShaderNodeTexCoord'); sw = wn.nodes.new('ShaderNodeSeparateXYZ'); wn.links.new(tcw.outputs['Generated'], sw.inputs[0])
rw = wn.nodes.new('ShaderNodeValToRGB'); cr_ = rw.color_ramp
WORLD = [(0.0, '#1a3384'), (0.6, '#03061f')] if NIGHT else [(0.0, '#f0a46a'), (0.3, '#7a5a9a'), (0.62, '#1d1b4a')]
for k, (pos, col) in enumerate(WORLD):
    el = cr_.elements[k] if k < len(cr_.elements) else cr_.elements.new(pos)
    el.position = pos; el.color = (*srgb(col), 1)
wn.links.new(sw.outputs['Z'], rw.inputs[0]); wn.links.new(rw.outputs[0], bg.inputs['Color'])
bpy.ops.object.light_add(type='SUN'); s = bpy.context.active_object
s.data.energy = 0.25 if NIGHT else 1.6
s.rotation_euler = (Vector((0.2, 1, -1)) if NIGHT else Vector((0.5, -0.3, -0.45))).to_track_quat('-Z', 'Y').to_euler()
s.data.color = (0.6, 0.7, 1.0) if NIGHT else (1.0, 0.82, 0.62); s.data.angle = math.radians(0.526)

# ---------- the passes: the same scene, coloured by what each surface is ----------
def emit_mat(name, fn):
    m, nt, out = nodes(name)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.0
    nt.links.new(fn(nt), e.inputs['Color']); nt.links.new(e.outputs[0], out.inputs[0]); return m
def const(c): return lambda nt: rgb_node(nt, c)
if MODE != 'base':
    black = emit_mat('k', const((0, 0, 0)))
    clear, cnt, cout = nodes('clear'); cnt.links.new(cnt.nodes.new('ShaderNodeBsdfTransparent').outputs[0], cout.inputs[0])
    swap = {}
    for m in list(bpy.data.materials):
        tag = TAG.get(m.name, None) if m.name in TAG else None
        if MODE == 'tint':
            if tag and tag[0] == 'tint': swap[m.name] = emit_mat('t' + m.name, const((tag[1], tag[2], 0)))
            elif tag and tag[0] == 'crowd':
                def cm(nt):
                    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img('crowd-mask.png'); t.image.colorspace_settings.name = 'Non-Color'; return t.outputs['Color']
                swap[m.name] = emit_mat('tcrowd', cm)
            elif tag and tag[0] == 'logo':
                src = tag[1]
                def lm(nt, src=src, m=m):
                    # (the board's own background, not its logo)
                    t = nt.nodes.new('ShaderNodeTexImage'); t.image = src.image; t.extension = 'CLIP'
                    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
                    om = m.node_tree.nodes['Mapping']
                    mp.inputs['Scale'].default_value = om.inputs['Scale'].default_value; mp.inputs['Location'].default_value = om.inputs['Location'].default_value
                    nt.links.new(mp.outputs[0], t.inputs['Vector'])
                    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[6].default_value = (1, 0, 0, 1); mix.inputs[7].default_value = (0, 0, 0, 1)
                    nt.links.new(t.outputs['Alpha'], mix.inputs[0]); return mix.outputs[2]
                swap[m.name] = emit_mat('tlogo', lm)
            elif tag and tag[0] == 'beam':
                # (the beam's own see-through falloff, as the trim colour)
                bm2 = m.copy(); bm2.node_tree.nodes['Emission'].inputs['Color'].default_value = (0, 1, 0, 1); bm2.node_tree.nodes['Emission'].inputs['Strength'].default_value = 1.0
                swap[m.name] = bm2
            elif m.name.startswith(('halo', 'dash')) or m.name == 'pitch':
                swap[m.name] = clear   # (see-through: nothing to paint)
            else: swap[m.name] = black
        else:
            if tag and tag[0] == 'pic':
                pid = tag[1]
                def um(nt, pid=pid):
                    tc = nt.nodes.new('ShaderNodeTexCoord'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['UV'], sp.inputs[0])
                    cb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(sp.outputs[0], cb.inputs[0]); nt.links.new(sp.outputs[1], cb.inputs[1])
                    cb.inputs[2].default_value = pid * 40 / 255
                    return cb.outputs[0]
                swap[m.name] = emit_mat('u' + m.name, um)
            elif m.name.startswith(('halo', 'dash', 'beam')) or m.name == 'pitch': swap[m.name] = clear
            else: swap[m.name] = black
    for o in sc.objects:
        if o.type != 'MESH': continue
        for i, m in enumerate(o.data.materials):
            if m and m.name in swap: o.data.materials[i] = swap[m.name]
    for o in sc.objects:
        if o.type == 'LIGHT': o.hide_render = True
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
# (the medallions and signs: drawn by the game with their own see-through edges; the base and tint
# passes show what is behind them)
if MODE != 'uv':
    for o in sc.objects:
        if o.name.startswith(('medal', 'sign')): o.hide_render = True

# ---------- the camera: the game's own (Cam3D in js/scene.js) ----------
VIEWS = {
    'bat':    dict(pos=(0.25, -9.5, 4.2), dir=1, f=1600, ax=0.75, above=0.30, below=0.66),
    'bowl':   dict(pos=(0.20, 34.0, 2.6), dir=-1, f=2400, ax=0.50, above=0.24, below=0.40),
    'keeper': dict(pos=(0.55, -9.0, 4.6), dir=1, f=1200, ax=1.05, above=0.40, below=1.02),
}
if VIEW == 'top':
    TOP_PX, HALF = 14, 112
    th = math.acos(0.78)
    Wi = int(2 * HALF * TOP_PX); Hi = int((2 * HALF * 0.78 + 34) * TOP_PX)
    for o in list(sc.objects):
        if o.name.startswith(('skyline', 'cityfoot', 'canopy', 'under', 'beam')) or (o.location - Vector((0, CY, 0))).length > 200 or (o.type == 'MESH' and o.name.startswith('Torus') and abs(o.location.z - 0.08) < 1e-3):
            o.hide_render = True
        if o.name.startswith(('sign', 'screen')) and o.data.vertices[0].co.y < CY:   # (their backs)
            o.hide_render = True
    bg.inputs['Color'].default_value = (*srgb('#1b1838'), 1)
    for l in list(wn.links):
        if l.to_node == bg: wn.links.remove(l)
    dirv = Vector((0, math.sin(th), -math.cos(th)))
    bpy.ops.object.camera_add(location=Vector((0, CY, 0)) - dirv * 600)
    cam = bpy.context.active_object; sc.camera = cam
    cam.rotation_euler = (th, 0, 0)
    cd = cam.data; cd.type = 'ORTHO'; cd.ortho_scale = Wi / TOP_PX; cd.sensor_fit = 'HORIZONTAL'; cd.clip_end = 3000
else:
    V = VIEWS[VIEW]
    Wi = int(2 * V['ax'] * V['f']); Hi = int((V['above'] + V['below']) * V['f'])
    bpy.ops.object.camera_add(location=V['pos'])
    cam = bpy.context.active_object; sc.camera = cam
    cam.rotation_euler = (math.pi / 2, 0, 0 if V['dir'] > 0 else math.pi)
    cd = cam.data; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36
    cd.lens = V['f'] * 36 / Wi
    cd.shift_y = -(Hi / 2 - V['above'] * V['f']) / max(Wi, Hi)
    cd.clip_end = 3000

r = sc.render
r.engine = 'CYCLES'; sc.cycles.device = 'CPU'
r.resolution_x, r.resolution_y, r.resolution_percentage = Wi, Hi, int(args[3]) if len(args) > 3 else 100
r.use_freestyle = True; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = 1.6
ls = sc.view_layers[0].freestyle_settings.linesets[0]
ls.select_by_visibility = True; ls.select_by_edge_types = True; ls.select_by_collection = True; ls.collection = ink
ls.select_silhouette = ls.select_border = True; ls.select_crease = False
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
ls.linestyle.color = srgb('#141018')
if MODE == 'base':
    sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'Standard'
else:
    # raw numbers out: no colour transform, no dither, no denoising
    sc.view_settings.view_transform = 'Raw'
    sc.cycles.use_denoising = False; r.dither_intensity = 0
    sc.cycles.use_adaptive_sampling = False
    sc.cycles.max_bounces = 0
    if MODE == 'uv': sc.cycles.samples = 1; sc.cycles.filter_width = 0.01; ls.linestyle.color = (0, 0, 0)
    else: sc.cycles.samples = 16; ls.linestyle.color = (0, 0, 0)
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGB'
r.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT, Wi, Hi, 'roof', ROOF)
