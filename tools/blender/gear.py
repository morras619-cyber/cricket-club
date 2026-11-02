# Batting gear, modelled in Blender: helmet, pads, gloves and bat, cel-shaded with ink outlines.
#   python gear.py -- <out_dir>          (Blender's bpy module; renders one picture per piece)
# Units are metres; Z is up and the front of each piece faces −Y (toward the camera).
import bpy, bmesh, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
OUT = None

# Thunder Strikers: royal blue, navy and yellow
KIT = dict(main='#1c5ad6', dark='#0b2a6e', trim='#ffd23f')
INK = '#141018'

def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
def scale_rgb(c, k): return tuple(min(1, v * k) for v in c)

# ---------- the cel shader ----------
# Lit by a fixed key light worked out in the shader (normal · light): three hard bands, a cool
# shadow, a rim of light round the edge, an optional glossy spot. Emission only, so what renders
# is exactly the colours chosen (the same look on every piece and every player).
L_DIR = Vector((-0.45, -0.6, 0.66)).normalized()
_mats = {}
def cel(name, hexc, gloss=False, groove=False, rim=0.18):
    key = (name, hexc, gloss, groove)
    if key in _mats: return _mats[key]
    base = srgb(hexc)
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = L_DIR
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -1; mr.inputs['From Max'].default_value = 1
    nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
    shadow = (base[0] * 0.52, base[1] * 0.55, min(1, base[2] * 0.68 + 0.012))
    cr.elements[0].position = 0.0; cr.elements[0].color = (*shadow, 1)
    cr.elements[1].position = 0.52; cr.elements[1].color = (*base, 1)
    hi = cr.elements.new(0.86); hi.color = (*scale_rgb(base, 1.18), 1)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    col = ramp.outputs['Color']
    if groove:  # the pads' rolls: a darker line down each groove (vertex colour 'groove')
        at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'groove'
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'
        nt.links.new(at.outputs['Color'], mul.inputs[0]); nt.links.new(col, mul.inputs[6])
        mul.inputs[7].default_value = (0.62, 0.62, 0.7, 1)
        col = mul.outputs[2]
    # rim light
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.72
    nt.links.new(lw.outputs['Facing'], gt.inputs[0])
    rk = nt.nodes.new('ShaderNodeMath'); rk.operation = 'MULTIPLY'; rk.inputs[1].default_value = rim
    nt.links.new(gt.outputs[0], rk.inputs[0])
    add = nt.nodes.new('ShaderNodeMix'); add.data_type = 'RGBA'; add.blend_type = 'SCREEN'
    nt.links.new(rk.outputs[0], add.inputs[0]); nt.links.new(col, add.inputs[6]); add.inputs[7].default_value = (0.75, 0.85, 1, 1)
    col = add.outputs[2]
    if gloss:  # a hard glossy spot, like a painted highlight on a hard shell
        refl = nt.nodes.new('ShaderNodeVectorMath'); refl.operation = 'REFLECT'
        inc = nt.nodes.new('ShaderNodeVectorMath'); inc.operation = 'SCALE'; inc.inputs['Scale'].default_value = -1
        nt.links.new(geo.outputs['Incoming'], inc.inputs[0]); nt.links.new(inc.outputs[0], refl.inputs[0]); nt.links.new(geo.outputs['Normal'], refl.inputs[1])
        d2 = nt.nodes.new('ShaderNodeVectorMath'); d2.operation = 'DOT_PRODUCT'; d2.inputs[1].default_value = L_DIR
        nt.links.new(refl.outputs[0], d2.inputs[0])
        g2 = nt.nodes.new('ShaderNodeMath'); g2.operation = 'GREATER_THAN'; g2.inputs[1].default_value = 0.985
        nt.links.new(d2.outputs['Value'], g2.inputs[0])
        g3 = nt.nodes.new('ShaderNodeMath'); g3.operation = 'MULTIPLY'; g3.inputs[1].default_value = 0.75
        nt.links.new(g2.outputs[0], g3.inputs[0])
        sp = nt.nodes.new('ShaderNodeMix'); sp.data_type = 'RGBA'
        nt.links.new(g3.outputs[0], sp.inputs[0]); nt.links.new(col, sp.inputs[6]); sp.inputs[7].default_value = (1, 1, 1, 1)
        col = sp.outputs[2]
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(col, e.inputs['Color'])
    nt.links.new(e.outputs[0], out.inputs[0])
    _mats[key] = m
    return m

NOLINE = []  # objects the ink outline skips (printed stickers)
def decal(name, path):
    """a printed sticker: the picture where it has alpha, see-through elsewhere"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); out = nt.nodes.new('ShaderNodeOutputMaterial')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(path); t.extension = 'CLIP'
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(t.outputs['Color'], e.inputs['Color'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(t.outputs['Alpha'], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    return m

# ---------- mesh helpers ----------
def new_obj(name, verts, faces, mats=(), smooth=True, col=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.validate(); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    for m in mats: me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    return o

def grid_surface(name, P, nu, nv, mats=(), closed_u=False):
    """a surface from P(i, j) -> (x, y, z) over an nu × nv grid"""
    verts = [P(i, j) for i in range(nu) for j in range(nv)]
    faces = []
    for i in range(nu - (0 if closed_u else 1)):
        for j in range(nv - 1):
            a = i * nv + j; b = ((i + 1) % nu) * nv + j
            faces.append((a, b, b + 1, a + 1))
    return new_obj(name, verts, faces, mats)

def mod(o, kind, **kw):
    m = o.modifiers.new(kind.lower(), kind)
    for k, v in kw.items(): setattr(m, k, v)
    return m

def tube(name, pts, r, mat, res=4, caps=True):
    """a round bar along points (the helmet's grille, straps)"""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = caps
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (*q, 1)
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
    cu.materials.append(mat)
    return o

def prim(kind, loc, scale, mat, rot=(0, 0, 0), **kw):
    getattr(bpy.ops.mesh, 'primitive_' + kind + '_add')(location=loc, rotation=rot, **kw)
    o = bpy.context.active_object; o.scale = scale; o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def group(objs, loc):
    """parent pieces under an empty so each item can be placed as one"""
    e = bpy.data.objects.new('item', None); bpy.context.scene.collection.objects.link(e)
    for o in objs: o.parent = e
    e.location = loc
    return e

# ---------- the helmet ----------
def helmet():
    shell_m = cel('shell', KIT['main'], gloss=True); inner_m = cel('liner', KIT['dark'])
    metal = cel('grille', '#b9bfcc', gloss=True); trim = cel('trim', KIT['trim'])
    RX, RY, RZ = 0.118, 0.132, 0.122
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=40, radius=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * RX, v.co.y * RY, v.co.z * RZ))
    kill = []
    for v in bm.verts:
        x, y, z = v.co.x / RX, v.co.y / RY, v.co.z / RZ
        face = y < -0.15 and z < 0.05                        # the face opening (front, below the brow)
        ear = abs(x) > 0.55 and -0.55 < y < 0.45             # the ear pieces come lower
        back = y > 0.45
        floor = -0.62 if ear else (-0.70 if back else -0.48)
        if face or z < floor: kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    me = bpy.data.meshes.new('shell'); bm.to_mesh(me); bm.free()
    shell = bpy.data.objects.new('shell', me); bpy.context.scene.collection.objects.link(shell)
    me.materials.append(shell_m); me.materials.append(inner_m)
    for p in me.polygons: p.use_smooth = True
    mod(shell, 'SOLIDIFY', thickness=0.008, offset=-1, material_offset=1, use_rim=True)
    mod(shell, 'SUBSURF', levels=2, render_levels=2)
    parts = [shell]
    # the peak: a curved brim over the eyes, tilted a little down
    def peak(i, j):
        th = math.radians(-70 + 140 * i / 40); t = j / 6
        rx, ry = RX * 1.0 + 0.052 * t * math.cos(th) ** 0.6, RY * 0.99 + 0.058 * t * math.cos(th) ** 0.6
        return (math.sin(th) * rx, -math.cos(th) * ry, 0.006 * RZ / RZ - 0.016 * t * t)
    pk = grid_surface('peak', peak, 41, 7, mats=[shell_m])
    mod(pk, 'SOLIDIFY', thickness=0.006, offset=0); mod(pk, 'SUBSURF', levels=1, render_levels=2)
    parts.append(pk)
    # a raised ridge down the middle and two vents either side of it
    ridge = [(0, -math.cos(a) * RY * 1.02, math.sin(a) * RZ * 1.02) for a in [math.radians(d) for d in range(20, 160, 6)]]
    parts.append(tube('ridge', ridge, 0.006, shell_m, res=3))
    vent = cel('vent', '#0a0f24')
    for sx in (-1, 1):
        for k, (yy, zz) in enumerate(((-0.06, 0.112), (0.0, 0.122), (0.06, 0.11))):
            n = Vector((sx * 0.035 / RX, yy / RY, zz / RZ)).normalized()
            p = Vector((n.x * RX, n.y * RY, n.z * RZ)) * 0.995
            v = prim('uv_sphere', tuple(p), (0.0075, 0.017, 0.0035), vent, segments=16, ring_count=8)
            v.rotation_euler = Vector((0, 0, 1)).rotation_difference(n).to_euler()
            parts.append(v)
    # the grille: steel bars round the face
    for k, z in enumerate((-0.012, -0.045, -0.082)):
        span = 78 - k * 6
        pts = []
        for d in range(-span, span + 1, 4):
            th = math.radians(d)
            bulge = 0.155 - k * 0.004
            pts.append((math.sin(th) * 0.123, -math.cos(th) * bulge, z - 0.006 * (1 - math.cos(th))))
        parts.append(tube('bar', pts, 0.0034, metal))
    for d in (-24, 0, 24):  # the uprights
        th = math.radians(d)
        pts = [(math.sin(th) * 0.123, -math.cos(th) * (0.151 - 0.002 * abs(z * 50)), z) for z in [0.002 - k * 0.0095 for k in range(10)]]
        parts.append(tube('up', pts, 0.0032, metal))
    for sx in (-1, 1):  # side brackets holding the grille
        b_ = prim('cube', (sx * 0.119, -0.075, -0.04), (0.004, 0.016, 0.03), trim); mod(b_, 'BEVEL', width=0.003, segments=2); parts.append(b_)
    # neck guard at the back
    def neck(i, j):
        th = math.radians(135 + 90 * i / 20); z = -0.074 - 0.03 * j / 4
        r = 0.088 + 0.007 * j / 4
        return (math.sin(th) * r, -math.cos(th) * r * 1.05, z)
    ng = grid_surface('neck', neck, 21, 5, mats=[inner_m]); mod(ng, 'SOLIDIFY', thickness=0.012); mod(ng, 'SUBSURF', levels=1, render_levels=2)
    parts.append(ng)
    # yellow trim round the shell's edge
    edge = []
    for d in range(0, 361, 4):
        th = math.radians(d); s, c = math.sin(th), -math.cos(th)
        if abs(c) > 0.55 and c < 0:  # front: along the brow, under the peak
            continue
    # the club badge on the front
    b = bpy.data.meshes.new('badge'); s = 0.05
    b.from_pydata([(-s / 2, 0, -s / 2), (s / 2, 0, -s / 2), (s / 2, 0, s / 2), (-s / 2, 0, s / 2)], [], [(0, 1, 2, 3)])
    uv = b.uv_layers.new(); [setattr(uv.data[i], 'uv', q) for i, q in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)])]
    bo = bpy.data.objects.new('badge', b); bpy.context.scene.collection.objects.link(bo)
    b.materials.append(decal('badge', os.path.join(ROOT, 'img/logo-thunder.webp'))); NOLINE.append(bo)
    zb = 0.062; el = math.asin(zb / RZ)
    bo.location = (0, -(RY * math.cos(el) + 0.004), zb); bo.rotation_euler = (-el, 0, 0)
    parts.append(bo)
    # chin strap
    strap = cel('strap', '#1a1a22')
    for sx in (-1, 1):
        parts.append(tube('chin', [(sx * 0.108, -0.03, -0.07), (sx * 0.075, -0.07, -0.112), (0, -0.085, -0.125)], 0.0035, strap))
    return parts

# ---------- a pad ----------
def legguard(side=1):
    white = cel('pad', '#f4f1ea', groove=True); strap_m = cel('padstrap', KIT['dark']); buckle = cel('buckle', KIT['trim'], gloss=True)
    trim = cel('padtrim', KIT['main'])
    NU, NV, H = 64, 72, 0.72
    rolls = 7
    def P(i, j):
        th = math.radians(-112 + 224 * i / (NU - 1)); z = H * j / (NV - 1)
        rx, ry = 0.088, 0.074
        knee = 0.47 < z < 0.61
        bump = 0.0
        if abs(th) < math.radians(80) and not knee and z > 0.07:
            t = (th + math.radians(80)) / math.radians(160) * rolls
            bump = 0.013 * abs(math.sin(math.pi * t)) ** 0.55
        if knee:
            t = (z - 0.47) / 0.14 * 2
            bump = 0.02 * abs(math.sin(math.pi * t)) ** 0.5 + 0.006
        r = 1 + 0  # taper the top and round it off
        top = max(0, (z - 0.62) / 0.10)
        shrink = 1 - 0.25 * top ** 2
        wing = 1 + 0.15 * max(0, abs(th) - math.radians(80)) / math.radians(32)
        x = math.sin(th) * (rx * wing * shrink + bump)
        y = -math.cos(th) * (ry * shrink + bump)
        if z < 0.09:  # the instep flap leans out over the shoe
            y -= (0.09 - z) * 0.55 * max(0, math.cos(th))
        return (x * side if False else x, y, z)
    o = grid_surface('pad', P, NU, NV, mats=[white])
    # grooves between rolls darken (vertex colour)
    me = o.data; ca = me.color_attributes.new('groove', 'FLOAT_COLOR', 'POINT')
    for idx in range(len(me.vertices)):
        i, j = divmod(idx, NV)
        th = math.radians(-112 + 224 * i / (NU - 1)); z = H * j / (NV - 1)
        g = 0.0
        if abs(th) < math.radians(80) and z > 0.07 and not (0.47 < z < 0.61):
            t = (th + math.radians(80)) / math.radians(160) * rolls
            g = max(0, 1 - abs(math.sin(math.pi * t)) * 6)
        if 0.465 < z < 0.475 or 0.605 < z < 0.615 or abs(z - 0.54) < 0.004: g = 1
        ca.data[idx].color = (g, g, g, 1)
    mod(o, 'SOLIDIFY', thickness=0.012, offset=1); mod(o, 'SUBSURF', levels=1, render_levels=2)
    parts = [o]
    # straps round the back, with a yellow buckle at the side
    for z in (0.14, 0.34, 0.64):
        pts = [(math.sin(math.radians(d)) * (0.082 if abs(d) > 100 else 0.07), -math.cos(math.radians(d)) * 0.068, z) for d in range(105, 256, 6)]
        parts.append(tube('strap', pts, 0.007, strap_m, res=2))
        parts.append(prim('cube', (0.095 * side, 0.03, z), (0.006, 0.014, 0.012), buckle))
    # a blue binding down each side wing
    for sgn in (-1, 1):
        th = math.radians(112 * sgn)
        pts = [(math.sin(th) * 0.088 * 1.15 * (1 - 0.25 * max(0, (z - 0.62) / 0.1) ** 2), -math.cos(th) * 0.074, z) for z in [k * 0.72 / 30 for k in range(31)]]
        parts.append(tube('bind', pts, 0.006, trim, res=2))
    return parts

# ---------- a glove ----------
def glove():
    white = cel('glove', '#f4f1ea'); blue = cel('gblue', KIT['main']); yellow = cel('gyel', KIT['trim']); palm = cel('palm', '#d9cdb4')
    parts = []
    # back of the hand: a padded block with three sausage rolls across it
    hb = prim('cube', (0, 0, 0), (0.042, 0.022, 0.048), white)
    mod(hb, 'BEVEL', width=0.016, segments=5); parts.append(hb)
    for k in range(3):
        parts.append(prim('cylinder', (0, -0.022, -0.025 + k * 0.024), (0.009, 0.009, 0.04), blue if k == 1 else white, rot=(0, math.pi / 2, 0), vertices=20))
    # fingers: long padded sausages with two seams each, curling a little forward
    seam = cel('seam', '#9aa0ad')
    for f, (x, L) in enumerate(((-0.031, 0.88), (-0.0105, 1.0), (0.0105, 0.96), (0.031, 0.8))):
        ln = 0.082 * L
        base = Vector((x, -0.004, 0.044))
        tilt = math.radians(-14)
        d = Vector((0, math.sin(tilt), math.cos(tilt)))
        c = base + d * (ln / 2)
        fo = prim('cylinder', tuple(c), (0.0108, 0.0124, ln / 2 + 0.004), white, rot=(tilt, 0, 0), vertices=24)
        bpy.ops.object.select_all(action='DESELECT'); fo.select_set(True); bpy.context.view_layer.objects.active = fo
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # round the tips at true size
        mod(fo, 'BEVEL', width=0.0095, segments=6, limit_method='ANGLE'); mod(fo, 'SUBSURF', levels=1, render_levels=2)
        parts.append(fo)
        for k in (1, 2):
            q = base + d * (ln * k / 3)
            parts.append(prim('torus', tuple(q), (1, 1.12, 1), seam, rot=(tilt, 0, 0), major_radius=0.0106, minor_radius=0.0009, major_segments=24, minor_segments=6))
    # the thumb: a padded roll along the side, with a blue guard over its tip
    tb = Vector((0.04, -0.016, -0.02)); td = Vector((0.22, -0.3, 0.93)).normalized()
    rot = Vector((0, 0, 1)).rotation_difference(td).to_euler()
    parts.append(prim('uv_sphere', tuple(tb + td * 0.03), (0.0125, 0.013, 0.038), white, rot=tuple(rot), segments=24, ring_count=16))
    parts.append(prim('uv_sphere', tuple(tb + td * 0.06), (0.0138, 0.0143, 0.016), blue, rot=tuple(rot), segments=20, ring_count=12))
    # the cuff, with a yellow band
    parts.append(prim('cylinder', (0, 0, -0.07), (0.046, 0.028, 0.026), blue, vertices=32))
    parts.append(prim('cylinder', (0, 0, -0.058), (0.0475, 0.0295, 0.006), yellow, vertices=32))
    return parts

# ---------- the bat ----------
def bat():
    willow = cel('willow', '#ecd3a0'); grip_m = cel('grip', KIT['main']); ring_m = cel('ring', KIT['trim'])
    cane = cel('cane', '#c49a5c'); splice = cel('splice', '#8a5a2b')
    L, W = 0.56, 0.108
    NS, NU = 70, 28
    def width(s):
        if s > L - 0.075:  # shoulders curve in to the handle
            t = (s - (L - 0.075)) / 0.075
            return W - (W - 0.036) * (1 - math.cos(t * math.pi / 2)) ** 0.8
        return W
    def spine(s):  # the thickness of the back down the blade: thickest low down (the sweet spot)
        mid = 0.17
        return 0.038 + 0.026 * math.exp(-((s - mid) / 0.16) ** 2) + 0.004 * (s / L)
    sections = []
    for i in range(NS + 1):
        s = L * i / NS
        w = width(s) / 2
        toe = min(1, s / 0.012) ** 0.5
        ring = []
        # face (flat, a touch of camber) from left to right, then the back from right to left
        for k in range(NU):
            u = -1 + 2 * k / (NU - 1)
            ring.append((u * w, -0.0015 * (1 - u * u), s))
        for k in range(NU - 1, -1, -1):
            u = -1 + 2 * k / (NU - 1)
            edge = 0.026
            d = edge + (spine(s) - edge) * max(0, 1 - u * u) ** 1.1
            d *= 0.55 + 0.45 * toe
            if s > L - 0.075: d = min(d, 0.026 + (spine(s) - 0.026) * (1 - (s - (L - 0.075)) / 0.075))
            ring.append((u * w * 0.97, d, s))
        sections.append(ring)
    M = len(sections[0])
    verts = [p for r in sections for p in r]
    faces = []
    for i in range(NS):
        for k in range(M):
            a = i * M + k; b = i * M + (k + 1) % M
            faces.append((a, b, b + M, a + M))
    faces.append(tuple(range(M - 1, -1, -1)))
    faces.append(tuple(NS * M + k for k in range(M)))
    blade = new_obj('blade', verts, faces, mats=[willow])
    mod(blade, 'SUBSURF', levels=1, render_levels=2)
    parts = [blade]
    # the handle: cane, then the rubber grip with yellow rings, and a knob on the end
    parts.append(prim('cylinder', (0, 0.018, L + 0.02), (0.016, 0.0145, 0.03), cane, vertices=24))
    g = prim('cylinder', (0, 0.018, L + 0.18), (0.0185, 0.0165, 0.13), grip_m, vertices=32); parts.append(g)
    for k in range(9):
        parts.append(prim('torus', (0, 0.018, L + 0.07 + k * 0.028), (1, 1.0 / 1.12, 1), ring_m, major_radius=0.0186, minor_radius=0.0028, major_segments=32, minor_segments=8))
    parts.append(prim('uv_sphere', (0, 0.018, L + 0.315), (0.02, 0.018, 0.012), grip_m, segments=24, ring_count=12))
    # the splice: a dark V on the face at the shoulders
    sv = bpy.data.meshes.new('splice')
    sv.from_pydata([(-0.012, -0.0025, L - 0.11), (0.012, -0.0025, L - 0.11), (0.006, -0.0025, L + 0.004), (-0.006, -0.0025, L + 0.004)], [], [(0, 1, 2, 3)])
    so = bpy.data.objects.new('splice', sv); bpy.context.scene.collection.objects.link(so); sv.materials.append(splice)
    parts.append(so)
    # stickers: the game's logo on the face, the club's on the back
    def sticker(path, w, h, y, z, flip=False):
        me = bpy.data.meshes.new('st')
        me.from_pydata([(-w / 2, y, z - h / 2), (w / 2, y, z - h / 2), (w / 2, y, z + h / 2), (-w / 2, y, z + h / 2)], [], [(0, 1, 2, 3)])
        uv = me.uv_layers.new(); q = [(1, 0), (0, 0), (0, 1), (1, 1)] if flip else [(0, 0), (1, 0), (1, 1), (0, 1)]
        for i, c in enumerate(q): uv.data[i].uv = c
        o = bpy.data.objects.new('st', me); bpy.context.scene.collection.objects.link(o); me.materials.append(decal('st', path)); NOLINE.append(o)
        return o
    # the game's logo on the face, turned to read up the blade as on a real bat
    me = bpy.data.meshes.new('long'); y = -0.0034; z0, z1, hw = 0.08, 0.35, 0.045
    me.from_pydata([(-hw, y, z0), (hw, y, z0), (hw, y, z1), (-hw, y, z1)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new()
    for i, c in enumerate([(0, 0), (0, 1), (1, 1), (1, 0)]): uv.data[i].uv = c
    lo = bpy.data.objects.new('long', me); bpy.context.scene.collection.objects.link(lo)
    me.materials.append(decal('long', os.path.join(ROOT, 'img/logo-sixcharge.webp'))); parts.append(lo); NOLINE.append(lo)
    back = sticker(os.path.join(ROOT, 'img/logo-thunder.webp'), 0.05, 0.05, spine(0.32) + 0.0035, 0.32, flip=True)
    parts.append(back)
    return parts

# ---------- scene and renders ----------
def render(name, objs_fn, cam_loc, cam_target, ortho, size=(1000, 1000)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()
    sc = bpy.context.scene
    NOLINE.clear()
    objs = objs_fn()
    nl = bpy.data.collections.new('noline'); sc.collection.children.link(nl)
    for o in NOLINE:
        for c in o.users_collection: c.objects.unlink(o)
        nl.objects.link(o)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*srgb('#e9eef7'), 1)
    bpy.ops.object.camera_add(location=cam_loc)
    cam = bpy.context.active_object; sc.camera = cam
    cam.rotation_euler = (Vector(cam_target) - Vector(cam_loc)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    r = sc.render
    r.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16; sc.cycles.use_denoising = False
    sc.cycles.filter_width = 1.2
    r.resolution_x, r.resolution_y = size; r.film_transparent = True
    r.use_freestyle = True; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = 2.4
    vl = sc.view_layers[0]; ls = vl.freestyle_settings.linesets[0]
    ls.select_by_visibility = True; ls.select_by_edge_types = True
    ls.select_silhouette = ls.select_border = True; ls.select_crease = True
    ls.select_by_collection = True; ls.collection = nl; ls.collection_negation = 'EXCLUSIVE'
    vl.freestyle_settings.crease_angle = math.radians(128)
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = srgb(INK)
    sc.view_settings.view_transform = 'Standard'
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    r.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    print('WROTE', r.filepath)

def pads_pair():
    a = legguard(); group(a, (-0.11, 0, 0))
    b = legguard(); group(b, (0.11, 0, 0))
    return a + b
def gloves_pair():
    a = glove(); e = group(a, (-0.07, 0, 0)); e.scale = (-1, 1, 1)
    b = glove(); group(b, (0.07, 0, 0))
    return a + b
def bat_both():
    a = bat(); e = group(a, (-0.09, 0, 0))
    b = bat(); e2 = group(b, (0.09, 0, 0)); e2.rotation_euler = (0, 0, math.pi)
    return a + b

if __name__ == '__main__':
    OUT = sys.argv[sys.argv.index('--') + 1]; os.makedirs(OUT, exist_ok=True)
    render('helmet', helmet, (-0.42, -0.62, 0.16), (0, 0, -0.01), 0.42)
    render('helmet-back', helmet, (0.25, 0.7, 0.2), (0, 0, -0.01), 0.42)
    render('pads', pads_pair, (-0.35, -1.6, 0.6), (0, 0, 0.36), 0.9)
    render('gloves', gloves_pair, (-0.15, -0.8, 0.25), (0, 0, 0.0), 0.3)
    render('bat', bat_both, (-0.12, -2.0, 0.45), (0, 0, 0.45), 1.0, size=(800, 1000))
