"""Pilot: a posable cel-shaded cricketer built in Blender (skin-modifier body, a shirt and trousers over it, outline by
inverted hull), rendered from behind with a transparent background.  usage: python body.py <out.png> [pose]
Run with the bpy package (pip install bpy); Z is up, the figure faces +Y, the camera stands at -Y (the bowler seen from behind)."""
import sys, math
import bpy
from mathutils import Vector

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/body.png'
SIZE = 1024

# joints (metres), stance seen from behind
J = {
    'pelvis': (0, 0, 0.98), 'spine': (0, 0, 1.22), 'chest': (0, 0, 1.44), 'neck': (0, 0.0, 1.62), 'head': (0, 0.0, 1.76),
    'shL': (-0.24, 0, 1.50), 'shR': (0.24, 0, 1.50),
    'elL': (-0.36, 0, 1.22), 'elR': (0.36, 0, 1.22), 'wrL': (-0.40, 0.0, 0.97), 'wrR': (0.40, 0.0, 0.97),
    'haL': (-0.41, 0.0, 0.88), 'haR': (0.41, 0.0, 0.88),
    'hipL': (-0.12, 0, 0.95), 'hipR': (0.12, 0, 0.95), 'knL': (-0.15, 0, 0.52), 'knR': (0.15, 0, 0.52),
    'anL': (-0.17, 0, 0.09), 'anR': (0.17, 0, 0.09),
}


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def skin_mesh(name, nodes, edges, radii, mat, root, sub=2):
    """nodes: {key: xyz}; radii: {key: (rx, ry)}; edges: pairs of keys"""
    keys = list(nodes)
    me = bpy.data.meshes.new(name)
    me.from_pydata([nodes[k] for k in keys], [(keys.index(a), keys.index(b)) for a, b in edges], [])
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.modifiers.new('skin', 'SKIN')
    sv = me.skin_vertices[0].data
    for i, k in enumerate(keys):
        sv[i].radius = radii[k]
        sv[i].use_root = (k == root)
    sm = ob.modifiers.new('sub', 'SUBSURF'); sm.levels = sub; sm.render_levels = sub
    for p in me.polygons: p.use_smooth = True
    ob.data.materials.append(mat)
    return ob


def toon(name, light, dark, rim=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); d = nt.nodes.new('ShaderNodeBsdfDiffuse')
    s = nt.nodes.new('ShaderNodeShaderToRGB'); r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.interpolation = 'CONSTANT'
    r.color_ramp.elements[0].position = 0.0; r.color_ramp.elements[0].color = dark
    r.color_ramp.elements[1].position = 0.55; r.color_ramp.elements[1].color = light
    nt.links.new(d.outputs[0], s.inputs[0]); nt.links.new(s.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], out.inputs[0])
    return m


def outline_mat():
    """the hull's far side only: a dark ring round the figure (the near side is transparent)"""
    m = bpy.data.materials.new('line'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = (0.02, 0.02, 0.05, 1)
    t = nt.nodes.new('ShaderNodeBsdfTransparent'); g = nt.nodes.new('ShaderNodeNewGeometry'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(g.outputs['Backfacing'], mx.inputs[0]); nt.links.new(t.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    m.surface_render_method = 'BLENDED'
    return m


def outline(ob, width, mat):
    cp = ob.copy(); cp.data = ob.data.copy(); cp.name = ob.name + '_line'
    bpy.context.collection.objects.link(cp)
    cp.data.materials.clear(); cp.data.materials.append(mat)
    sm = cp.modifiers.new('hull', 'SOLIDIFY'); sm.thickness = width; sm.offset = 1; sm.use_flip_normals = False
    return cp


def build(P):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    skin = toon('skin', (0.99, 0.70, 0.48, 1), (0.80, 0.50, 0.32, 1))
    blue = toon('shirt', (0.10, 0.28, 0.82, 1), (0.05, 0.14, 0.52, 1))
    line = outline_mat()
    # body (what shows: head, neck, forearms, hands)
    body_nodes = {k: P[k] for k in ('chest', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'haL', 'haR')}
    body_edges = [('chest', 'neck'), ('neck', 'head'), ('chest', 'shL'), ('chest', 'shR'), ('shL', 'elL'), ('shR', 'elR'),
                  ('elL', 'wrL'), ('elR', 'wrR'), ('wrL', 'haL'), ('wrR', 'haR')]
    body_r = {'chest': (0.15, 0.10), 'neck': (0.075, 0.075), 'head': (0.15, 0.17), 'shL': (0.05, 0.05), 'shR': (0.05, 0.05),
              'elL': (0.045, 0.045), 'elR': (0.045, 0.045), 'wrL': (0.04, 0.035), 'wrR': (0.04, 0.035), 'haL': (0.05, 0.04), 'haR': (0.05, 0.04)}
    b = skin_mesh('body', body_nodes, body_edges, body_r, skin, 'chest')
    # shirt: torso and short sleeves
    sl = {s: lerp(P['sh' + s], P['el' + s], 0.55) for s in 'LR'}
    sh_nodes = {'pelvis': P['pelvis'], 'spine': P['spine'], 'chest': P['chest'], 'neckb': lerp(P['chest'], P['neck'], 0.7),
                'shL': P['shL'], 'shR': P['shR'], 'slL': sl['L'], 'slR': sl['R']}
    sh_edges = [('pelvis', 'spine'), ('spine', 'chest'), ('chest', 'neckb'), ('chest', 'shL'), ('chest', 'shR'), ('shL', 'slL'), ('shR', 'slR')]
    sh_r = {'pelvis': (0.17, 0.12), 'spine': (0.18, 0.12), 'chest': (0.21, 0.13), 'neckb': (0.08, 0.07), 'shL': (0.075, 0.075), 'shR': (0.075, 0.075),
            'slL': (0.072, 0.072), 'slR': (0.072, 0.072)}
    sh = skin_mesh('shirt', sh_nodes, sh_edges, sh_r, blue, 'pelvis')
    # trousers
    tr_nodes = {'pelvis': P['pelvis'], 'hipL': P['hipL'], 'hipR': P['hipR'], 'knL': P['knL'], 'knR': P['knR'], 'anL': P['anL'], 'anR': P['anR']}
    tr_edges = [('pelvis', 'hipL'), ('pelvis', 'hipR'), ('hipL', 'knL'), ('hipR', 'knR'), ('knL', 'anL'), ('knR', 'anR')]
    tr_r = {'pelvis': (0.16, 0.12), 'hipL': (0.105, 0.105), 'hipR': (0.105, 0.105), 'knL': (0.078, 0.078), 'knR': (0.078, 0.078), 'anL': (0.06, 0.06), 'anR': (0.06, 0.06)}
    tr = skin_mesh('trousers', tr_nodes, tr_edges, tr_r, blue, 'pelvis')
    # the drawn line: Freestyle (silhouettes, borders and creases; where one part passes over another too)
    sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 3.0
    vl = bpy.context.view_layer; vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets.new('ink') if not vl.freestyle_settings.linesets else vl.freestyle_settings.linesets[0]
    ls.select_silhouette = ls.select_border = ls.select_crease = ls.select_contour = True
    ls.select_external_contour = True
    vl.freestyle_settings.crease_angle = math.radians(100)
    ls.linestyle = bpy.data.linestyles.new('ink')
    ls.linestyle.color = (0.02, 0.02, 0.05); ls.linestyle.thickness = 3.0
    # light and camera
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), 0, math.radians(-35)))
    bpy.context.object.data.energy = 3; bpy.context.object.data.use_shadow = False
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.1
    co = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(co)
    co.location = (0, -6, 0.95); co.rotation_euler = (math.pi / 2, 0, 0); sc.camera = co


if __name__ == '__main__':
    build(J)
    bpy.context.scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
