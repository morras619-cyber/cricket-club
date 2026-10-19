# A club's ground, built in game units (Blender X = game x, Y = game z along the pitch, Z = height):
# the Thunderdome, or another club's ground from its painted pieces (CLUB=cyclones; see CLUBS below).
# Renders the background for one game camera: bat | bowl | keeper | top.
#   CLUB=<club> python thunderdome.py -- <view> <out.png> [samples]
import bpy, math, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
VIEW, OUT = args[0], args[1]
SAMPLES = int(args[2]) if len(args) > 2 else 32
import os
CLUB = os.environ.get('CLUB', 'thunder')
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex', '' if CLUB == 'thunder' else CLUB) + '/'  # made by prep_textures.py
# each ground's look: stand colours, boards, the painted crowd strip (u_len: metres one copy covers),
# the backdrop on the far cylinder (heights, copies round), the sky and the light
CLUBS = {
    'thunder': dict(wall='#0b1f5c', fascia='#9fb0cc', canopy='#0b1f5c', dark='#0a0f24', track='#16264f', rope='#ffd23f',
                    board=('#0b2a6e', '#1c5ad6'), screen='#071447', crowd_len=155, sky=(30, 112, 1), foot='#0b1640',
                    world=[(0.0, '#1a3384'), (0.6, '#03061f')], sun=(0.25, (0.6, 0.7, 1.0), 0.526), flood=1.0, top_bg='#1b1838', turbines=False),
    # Cyclone Park: an overcast afternoon in the hills; a green bowl under a white roof, the floodlights on
    'cyclones': dict(wall='#0d3a1e', fascia='#1e7a32', canopy='#e9edf0', dark='#0a1a10', track='#1d3b26', rope='#ffd21f',
                     board=('#0b3d1b', '#1e7a32'), screen='#0b2414', crowd_len=6 * 2167 / 726 * 5, sky=(18, 268, 2), foot='#3a5a33',
                     world=[(0.0, '#c9d1d6'), (0.35, '#8e9aa6'), (1.0, '#5b6673')], sun=(2.2, (1.0, 0.98, 0.94), 35), flood=0.25,
                     top_bg='#4a6a40', turbines=True),
}
C = CLUBS[CLUB]
CY = 10.0          # pitch centre (game centerY)
ROPE = 62.0        # boundary rope (game boundaryR)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
ink = bpy.data.collections.new('ink'); sc.collection.children.link(ink)

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

def link(o, inked=False):
    (ink if inked else sc.collection).objects.link(o); return o

def mesh(name, verts, faces, uvs=None, mat=None, inked=False, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if uvs is not None:
        uv = me.uv_layers.new(name='UVMap')
        for f, poly in zip(faces, me.polygons):
            for li, vi in zip(poly.loop_indices, f):
                uv.data[li].uv = uvs[vi]
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    if mat: me.materials.append(mat)
    return link(o, inked)

# ---------- materials ----------
def nodes(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')

def img(path, extension='REPEAT', interp='Linear'):
    im = bpy.data.images.load(TEX + path); return im

def shaded(name, color_socket_fn, emit=0.35, rough=1.0):
    """diffuse lit by the floodlights, plus a share of its own colour so nothing goes black"""
    m, nt, out = nodes(name)
    col = color_socket_fn(nt)
    d = nt.nodes.new('ShaderNodeBsdfDiffuse'); nt.links.new(col, d.inputs['Color'])
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(col, e.inputs['Color']); e.inputs['Strength'].default_value = emit
    a = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(d.outputs[0], a.inputs[0]); nt.links.new(e.outputs[0], a.inputs[1])
    nt.links.new(a.outputs[0], out.inputs[0])
    return m

def flat(name, hexc, emit=0.35):
    def c(nt):
        n = nt.nodes.new('ShaderNodeRGB'); n.outputs[0].default_value = (*srgb(hexc), 1); return n.outputs[0]
    return shaded(name, c, emit)

def glow(name, rgb, s=1.0):
    m, nt, out = nodes(name)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*rgb, 1); e.inputs['Strength'].default_value = s
    nt.links.new(e.outputs[0], out.inputs[0]); return m

def picture(name, path, strength=1.0, alpha_over=None, extension='REPEAT'):
    """an emissive picture (painted crowd, skyline, screen): shows exactly as painted"""
    m, nt, out = nodes(name)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(path); t.extension = extension
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = strength
    if alpha_over:
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs[6].default_value = (*srgb(alpha_over), 1)
        nt.links.new(t.outputs['Alpha'], mix.inputs[0]); nt.links.new(t.outputs['Color'], mix.inputs[7])
        nt.links.new(mix.outputs[2], e.inputs['Color'])
    else:
        nt.links.new(t.outputs['Color'], e.inputs['Color'])
    nt.links.new(e.outputs[0], out.inputs[0])
    return m

# ---------- the ground ----------
def grass_color(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (2.5 / 20, 0, 0); mp.inputs['Scale'].default_value = (1 / 20, 1 / 20, 1)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img('grass.png'); nt.links.new(mp.outputs[0], t.inputs['Vector'])
    # a shade darker beyond the rope
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    dy = nt.nodes.new('ShaderNodeMath'); dy.operation = 'SUBTRACT'; dy.inputs[1].default_value = CY; nt.links.new(sep.outputs['Y'], dy.inputs[0])
    cmb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(sep.outputs['X'], cmb.inputs[0]); nt.links.new(dy.outputs[0], cmb.inputs[1])
    ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nt.links.new(cmb.outputs[0], ln.inputs[0])
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = ROPE + 0.2; nt.links.new(ln.outputs['Value'], gt.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs[7].default_value = (0.72, 0.78, 0.72, 1)
    nt.links.new(gt.outputs[0], mix.inputs[0]); nt.links.new(t.outputs['Color'], mix.inputs[6])
    return mix.outputs[2]

grass = shaded('grass', grass_color, emit=0.62)
bpy.ops.mesh.primitive_circle_add(vertices=256, radius=80, fill_type='TRIFAN', location=(0, 0, 0))
g = bpy.context.active_object
for v in g.data.vertices: v.co.y += CY
g.data.materials.append(grass)

# the pitch strip: the painted pitch, its ragged sides trimmed (as the game does)
PX, PZ0, PZ1 = 1.52, -2.0, 22.0
def pitch_color(nt):
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img('pitch.png'); t.extension = 'EXTEND'
    nt.nodes['Image Texture'] if False else None
    return t.outputs['Color']
pm = shaded('pitch', pitch_color, emit=0.62)
# (see-through where the painting is: past its ends and along its grassy edges the outfield shows)
_nt = pm.node_tree; _t = [n for n in _nt.nodes if n.type == 'TEX_IMAGE'][0]; _o = _nt.nodes['Material Output']
_add = _o.inputs[0].links[0].from_node
_tr = _nt.nodes.new('ShaderNodeBsdfTransparent'); _mx = _nt.nodes.new('ShaderNodeMixShader')
_nt.links.new(_t.outputs['Alpha'], _mx.inputs[0]); _nt.links.new(_tr.outputs[0], _mx.inputs[1]); _nt.links.new(_add.outputs[0], _mx.inputs[2])
_nt.links.new(_mx.outputs[0], _o.inputs[0])
mesh('pitch', [(-PX, PZ0, 0.006), (PX, PZ0, 0.006), (PX, PZ1, 0.006), (-PX, PZ1, 0.006)], [(0, 1, 2, 3)],
     uvs=[(0.04, 0), (0.96, 0), (0.96, 1), (0.04, 1)], mat=pm, inked=False)  # (no ink edge: the strip meets the grass)

# creases: 5 cm white lines
cr = glow('crease', srgb('#fffdf0'), 1.0)
def strip(x0, z0, x1, z1, w=0.05, h=0.012, mat=cr, inked=False):
    d = Vector((x1 - x0, z1 - z0)); n = Vector((-d.y, d.x)).normalized() * w / 2
    return mesh('line', [(x0 + n.x, z0 + n.y, h), (x1 + n.x, z1 + n.y, h), (x1 - n.x, z1 - n.y, h), (x0 - n.x, z0 - n.y, h)], [(0, 1, 2, 3)], mat=mat, inked=inked)
PE = PX - 0.06
for z, d in ((0, 1), (20, -1)):
    strip(-PE, z + 1.22 * d, PE, z + 1.22 * d)
    strip(-1.32, z, 1.32, z)
    for x in (-1.32, 1.32): strip(x, z + 1.22 * d, x, z - 1.22 * d)

# the 30-yard circle: soft white dashes
dash = bpy.data.materials.new('dash'); dash.use_nodes = True
nt = dash.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1, 1, 1, 1)
tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = 0.5
nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], o_.inputs[0])
N = 100
for i in range(N):
    a0 = (i / N) * 2 * math.pi; a1 = a0 + 2 * math.pi / N * 0.55
    strip(27 * math.cos(a0), CY + 27 * math.sin(a0), 27 * math.cos(a1), CY + 27 * math.sin(a1), w=0.14, mat=dash)

# the rope
rope = flat('rope', C['rope'], 0.5)
bpy.ops.mesh.primitive_torus_add(location=(0, CY, 0.08), major_radius=ROPE, minor_radius=0.08, major_segments=256, minor_segments=8)
r = bpy.context.active_object; r.data.materials.append(rope)
for p in r.data.polygons: p.use_smooth = True

# ---------- ring helpers ----------
def ring_surface(name, profile, mat, a0=0, a1=2 * math.pi, seg=256, u_len=None, v_rep=1, inked=False, u_off=0.0):
    """a surface of revolution round the ground centre: profile = [(radius, height)], u across the arc"""
    verts, faces, uvs = [], [], []
    n = max(2, int(seg * (a1 - a0) / (2 * math.pi)))
    P = len(profile)
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        for rr, hh in profile:
            verts.append((rr * math.cos(a), CY + rr * math.sin(a), hh))
    for i in range(n):
        for j in range(P - 1):
            q = (i * P + j, (i + 1) * P + j, (i + 1) * P + j + 1, i * P + j + 1)
            faces.append(q)
    # uv: u = arc length at the profile's mean radius / u_len, v = 0..v_rep up the profile
    rm = sum(p[0] for p in profile) / P
    def uvof(vi):
        i, j = divmod(vi, P)
        a = a0 + (a1 - a0) * i / n
        u = (a - a0 - u_off) * rm / (u_len or 1)
        return (u, v_rep * j / (P - 1))
    uv = [uvof(i) for i in range(len(verts))]
    return mesh(name, verts, faces, uvs=uv, mat=mat, inked=inked)

# ---------- the boards: LED boards with the club and the game's logos ----------
def board_mat(name, logo, bg, logo_w):  # logo_w: share of the board's width the logo takes
    m, nt, out = nodes(name)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping'); nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
    mp.inputs['Scale'].default_value = (1 / logo_w, 1, 1); mp.inputs['Location'].default_value = (-(1 - logo_w) / 2 / logo_w, 0, 0)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(logo); t.extension = 'CLIP'
    nt.links.new(mp.outputs[0], t.inputs['Vector'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[6].default_value = (*srgb(bg), 1)
    nt.links.new(t.outputs['Alpha'], mix.inputs[0]); nt.links.new(t.outputs['Color'], mix.inputs[7])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.0
    nt.links.new(mix.outputs[2], e.inputs['Color']); nt.links.new(e.outputs[0], out.inputs[0])
    return m
BR, BH, BW = 63.8, 0.95, 7.0
mats = [board_mat('bA', 'logo-sixcharge.png', C['board'][0], 2.85 / BW), board_mat('bB', f'logo-{CLUB}.png', C['board'][1], 0.95 / BW)]
nb = int(2 * math.pi * BR / BW)
for i in range(nb):
    a0 = 2 * math.pi * i / nb; a1 = 2 * math.pi * (i + 1) / nb
    pts = []
    for k in range(5):
        a = a0 + (a1 - a0) * k / 4
        pts.append((BR * math.cos(a), CY + BR * math.sin(a)))
    verts = [(x, y, 0) for x, y in pts] + [(x, y, BH) for x, y in pts]
    faces = [(k, k + 1, 6 + k, 5 + k) for k in range(4)]
    # the boards face the field: u runs so the logo reads the right way from the middle
    uv = {k: (1 - k / 4, 0) for k in range(5)}; uv.update({5 + k: (1 - k / 4, 1) for k in range(5)})
    mesh('board', verts, faces, uvs=uv, mat=mats[i % 2], inked=True)

# ---------- the stands ----------
navy = flat('navy', C['wall'], 0.45)
fascia = flat('fascia', C['fascia'], 0.5)
dark = flat('dark', C['dark'], 0.4)
canopy = flat('canopy', C['canopy'], 0.45)
crowd = picture('crowd', 'crowd.png', 1.0)
# the stands sit well back from the rope, past a grass apron and a perimeter track, so the night
# sky and the city show above them
track = flat('track', C['track'], 0.45)
ring_surface('track', [(76, 0.01), (79, 0.01)], track)
ring_surface('wall', [(79, 0), (79, 1.4)], navy, inked=True)
ring_surface('walltop', [(79, 1.4), (79.6, 1.4)], navy)
# the crowd, raked back: the painted crowd tiled three rows high (5 m a tile)
ring_surface('crowd', [(79.6, 1.4), (99, 12.0)], crowd, u_len=C['crowd_len'], v_rep=3)
ring_surface('back', [(99, 12.0), (99, 13.6)], dark)
# the roof: a light fascia, a dark underside dotted with lamps, the canopy on top
ring_surface('fascia', [(94, 13.2), (94, 14.4)], fascia, inked=True)
under = bpy.data.materials.new('under'); under.use_nodes = True
nt = under.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
tc = nt.nodes.new('ShaderNodeTexCoord'); vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'
vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 0.6
nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.09; nt.links.new(vor.outputs['Distance'], lt.inputs[0])
mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[6].default_value = (*srgb('#0a0f24'), 1); mix.inputs[7].default_value = (1, 0.8, 0.45, 1)
nt.links.new(lt.outputs[0], mix.inputs[0])
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.2
nt.links.new(mix.outputs[2], e.inputs['Color']); nt.links.new(e.outputs[0], o_.inputs[0])
ring_surface('under', [(94, 13.2), (99, 13.6)], under)
ring_surface('canopy', [(94, 14.4), (104, 15.4)], canopy, inked=True)

# the big screens, one behind each end, showing the game's logo
def screen(a, r=83.5, w=13, h0=3.6, h1=10.1):
    c, s = math.cos(a), math.sin(a)
    t = Vector((-s, c, 0))           # along the stand
    base = Vector((r * c, CY + r * s, 0))
    pic = picture('scr', 'logo-sixcharge.png', 1.0, alpha_over=C['screen'], extension='CLIP')
    # the logo sits in the middle half of the screen
    q = [base - t * w / 2 + Vector((0, 0, h0)), base + t * w / 2 + Vector((0, 0, h0)), base + t * w / 2 + Vector((0, 0, h1)), base - t * w / 2 + Vector((0, 0, h1))]
    lw = 0.8; lh = lw * (w / 3) / (h1 - h0)   # logo is 3:1
    u0, u1 = 0.5 - 0.5 / lw, 0.5 + 0.5 / lw
    v0, v1 = 0.5 - 0.5 / lh, 0.5 + 0.5 / lh
    mesh('screen', [tuple(p) for p in q], [(0, 1, 2, 3)], uvs=[(u1, v0), (u0, v0), (u0, v1), (u1, v1)], mat=pic, inked=True)
    fr = flat('frame', '#2a2f3d', 0.4)
    out = Vector((c, s, 0)) * 0.6
    for side in (-1, 1):  # the steel legs either side
        p = base + t * side * (w / 2 + 0.8)
        bpy.ops.mesh.primitive_cube_add(location=(p.x + out.x, p.y + out.y, h1 / 2 + 1), scale=(0.7, 0.7, h1 / 2 + 1))
        o = bpy.context.active_object; o.rotation_euler = (0, 0, a); o.data.materials.append(fr)
        sc.collection.objects.unlink(o); ink.objects.link(o)
    bpy.ops.mesh.primitive_cube_add(location=(base.x + out.x, base.y + out.y, h1 + 0.6), scale=(0.7, w / 2 + 1.5, 0.6))
    o = bpy.context.active_object; o.rotation_euler = (0, 0, a); o.data.materials.append(fr)
    sc.collection.objects.unlink(o); ink.objects.link(o)
screen(math.pi / 2); screen(-math.pi / 2)

# floodlights: four towers behind the corners, lamp grids and a glow round each
lamp = glow('lamp', (1, 0.97, 0.86), 8)
tower = flat('tower', '#c8cdd8', 0.5)
def halo(p, rad):
    m = bpy.data.materials.new('halo'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    pw = nt.nodes.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 3.0
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs['Facing'], inv.inputs[1]); nt.links.new(inv.outputs[0], pw.inputs[0])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1, 0.9, 0.6, 1); e.inputs['Strength'].default_value = 0.9
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(pw.outputs[0], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], o_.inputs[0])
    bpy.ops.mesh.primitive_uv_sphere_add(location=p, radius=rad, segments=32, ring_count=16)
    o = bpy.context.active_object; o.data.materials.append(m)
    for f in o.data.polygons: f.use_smooth = True
    o.visible_shadow = False
for side in (-1, 1):
    for end in (-1, 1):
        a = math.pi / 2 * end + side * math.radians(13)
        x, y = 108 * math.cos(a), CY + 108 * math.sin(a)
        HT = 24.0
        for dx in (-1, 1):  # a lattice pair of legs
            bpy.ops.mesh.primitive_cube_add(location=(x + dx * 0.9 * math.sin(a), y - dx * 0.9 * math.cos(a), HT / 2), scale=(0.35, 0.35, HT / 2))
            o = bpy.context.active_object; o.data.materials.append(tower); sc.collection.objects.unlink(o); ink.objects.link(o)
        face = math.atan2(CY - y, -x)  # toward the middle
        bpy.ops.mesh.primitive_cube_add(location=(x, y, HT + 2.2), scale=(0.4, 4.6, 2.6))
        head = bpy.context.active_object; head.rotation_euler = (0, math.radians(-18), face); head.data.materials.append(navy)
        sc.collection.objects.unlink(head); ink.objects.link(head)
        fwd = Vector((math.cos(face), math.sin(face), 0))
        for i in range(4):
            for j in range(3):
                off = Vector((0, (i - 1.5) * 2.2, (j - 1) * 1.65)); off.rotate(head.rotation_euler)
                p = head.location + off + fwd * 0.45
                bpy.ops.mesh.primitive_uv_sphere_add(location=p, radius=0.78, segments=16, ring_count=8)
                l = bpy.context.active_object; l.data.materials.append(lamp); l.visible_shadow = False
        if C['flood'] >= 0.5: halo(head.location + fwd * 2.5, 6.5)
        # the light itself, pointed at the pitch
        bpy.ops.object.light_add(type='SPOT', location=head.location + fwd * 2)
        L = bpy.context.active_object; L.data.energy = 2.2e5 * C['flood']; L.data.spot_size = math.radians(70); L.data.spot_blend = 0.6
        L.data.shadow_soft_size = 3; L.data.color = (1, 0.96, 0.88)
        L.rotation_euler = (Vector((0, CY, 0)) - L.location).to_track_quat('-Z', 'Y').to_euler()

# the city behind: the painted skyline on a far cylinder, the gap below filled with its shade
sky_pic = picture('skyline', 'skyline.png', 1.0)
R2 = 430
h0, h1, copies = C['sky']
ring_surface('skyline', [(R2, h0), (R2, h1)], sky_pic, u_len=2 * math.pi * R2 / copies, v_rep=1, u_off=math.radians(45))
ring_surface('cityfoot', [(R2, -5), (R2, h0 + 0.2)], glow('cityfoot', srgb(C['foot']), 1.0))

# Cyclone Park's landmark: wind turbines on the hills just past the stands, behind each end
if C['turbines']:
    white = flat('turbine', '#eef1f2', 0.55)
    def turbine(a, r, hub, blade, spin):
        x, y = r * math.cos(a), CY + r * math.sin(a)
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1.6, radius2=0.8, depth=hub, location=(x, y, hub / 2))
        o = bpy.context.active_object; o.data.materials.append(white); sc.collection.objects.unlink(o); ink.objects.link(o)
        face = math.atan2(CY - y, -x)                     # the rotor faces the ground
        fwd = Vector((math.cos(face), math.sin(face), 0))
        bpy.ops.mesh.primitive_cube_add(location=(x, y, hub), scale=(2.6, 1.3, 1.3))
        o = bpy.context.active_object; o.rotation_euler = (0, 0, face); o.data.materials.append(white); sc.collection.objects.unlink(o); ink.objects.link(o)
        c = Vector((x, y, hub)) + fwd * 2.8
        for k in range(3):
            ang = spin + k * 2 * math.pi / 3
            # a blade: a long thin slab from the hub outwards, in the plane facing the ground
            side = Vector((-fwd.y, fwd.x, 0))
            d = side * math.cos(ang) + Vector((0, 0, 1)) * math.sin(ang)
            mid = c + d * (blade / 2 + 0.8)
            # (tapering from the hub to the tip)
            bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=1.1, radius2=0.18, depth=blade, location=mid)
            o = bpy.context.active_object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
            o.data.materials.append(white); sc.collection.objects.unlink(o); ink.objects.link(o)
        bpy.ops.mesh.primitive_uv_sphere_add(location=c, radius=1.3, segments=16, ring_count=8)
        o = bpy.context.active_object; o.data.materials.append(white); sc.collection.objects.unlink(o); ink.objects.link(o)
    for end, sgn in ((math.pi / 2, 1), (-math.pi / 2, -1)):
        # (placed in the gaps either side of the big screen and the floodlights, clear of the roof)
        for off, r, spin in ((-0.36, 360, 0.3), (0.05, 400, 1.4), (0.42, 340, 0.9)):
            turbine(end + off * sgn, r, 58, 20, spin)

# ---------- world ----------
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
wn = w.node_tree; bg = wn.nodes['Background']; bg.inputs['Strength'].default_value = 1.0
tcw = wn.nodes.new('ShaderNodeTexCoord'); sw = wn.nodes.new('ShaderNodeSeparateXYZ'); wn.links.new(tcw.outputs['Generated'], sw.inputs[0])
rw = wn.nodes.new('ShaderNodeValToRGB'); cr_ = rw.color_ramp
for k, (pos, col) in enumerate(C['world']):
    el = cr_.elements[k] if k < len(cr_.elements) else cr_.elements.new(pos)
    el.position = pos; el.color = (*srgb(col), 1)
wn.links.new(sw.outputs['Z'], rw.inputs[0]); wn.links.new(rw.outputs[0], bg.inputs['Color'])
# ambient fill so shaded sides stay readable at night
bpy.ops.object.light_add(type='SUN'); s = bpy.context.active_object; s.data.energy = C['sun'][0]
s.rotation_euler = Vector((0.2, 1, -1)).to_track_quat('-Z', 'Y').to_euler(); s.data.color = C['sun'][1]
s.data.angle = math.radians(C['sun'][2])  # (an overcast sun: soft-edged shadows)

# ---------- the camera: the game's own (Cam3D in js/scene.js) ----------
# game: screen x = W/2 + dir·(x − cx)·f/d,  y = hy + (cy − y)·f/d. A level pinhole camera, the
# horizon at hy. The render covers [−ax, ax]·f across and [−above, below]·f down from the horizon.
VIEWS = {
    'bat':    dict(pos=(0.25, -9.5, 4.2), dir=1, f=1600, ax=0.75, above=0.30, below=0.66),
    'bowl':   dict(pos=(0.20, 34.0, 2.6), dir=-1, f=2400, ax=0.50, above=0.24, below=0.40),
    'keeper': dict(pos=(0.55, -9.0, 4.6), dir=1, f=1200, ax=1.05, above=0.40, below=1.02),
}
if VIEW == 'top':
    # The outfield view (js/scene.js OutfieldView): looking down on the ground, tilted so the ground's
    # length reads at 0.78 of its width (cos 38.7°): an orthographic camera, TOP_PX pixels a metre,
    # the pitch centre in the middle of the picture. The game draws its own grass, pitch and rope
    # inside the boundary, so only what's outside them shows: the apron, boards, stands, roof, lights.
    TOP_PX, HALF = 14, 112
    th = math.acos(0.78)
    Wi = int(2 * HALF * TOP_PX); Hi = int((2 * HALF * 0.78 + 34) * TOP_PX)
    for o in list(sc.objects):
        # (and the roof: from up here it would hide the near stand's crowd)
        # (the turbines too: they stand far outside the picture)
        if o.name.startswith(('skyline', 'cityfoot', 'canopy', 'under')) or (o.location - Vector((0, CY, 0))).length > 200 or (o.type == 'MESH' and o.name.startswith('Torus') and abs(o.location.z - 0.08) < 1e-3):
            o.hide_render = True
    bg.inputs['Color'].default_value = (*srgb(C['top_bg']), 1)
    for l in list(wn.links):
        if l.to_node == bg: wn.links.remove(l)
    dirv = Vector((0, math.sin(th), -math.cos(th)))
    bpy.ops.object.camera_add(location=Vector((0, CY, 0)) - dirv * 600)
    cam = bpy.context.active_object; sc.camera = cam
    cam.rotation_euler = (th, 0, 0)
    cd = cam.data; cd.type = 'ORTHO'; cd.ortho_scale = Wi / TOP_PX; cd.sensor_fit = 'HORIZONTAL'
    cd.clip_end = 3000
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
r.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
r.resolution_x, r.resolution_y, r.resolution_percentage = Wi, Hi, int(args[3]) if len(args) > 3 else 100
r.use_freestyle = True; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = 1.6
ls = sc.view_layers[0].freestyle_settings.linesets[0]
ls.select_by_visibility = True; ls.select_by_edge_types = True; ls.select_by_collection = True; ls.collection = ink
ls.select_silhouette = ls.select_border = True; ls.select_crease = False
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
ls.linestyle.color = srgb('#141018')
sc.view_settings.view_transform = 'Standard'
r.image_settings.file_format = 'PNG'
r.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT, Wi, Hi)
