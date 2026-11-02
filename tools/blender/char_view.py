# Renders a rigged, textured character .glb (e.g. from Meshy) in the game's cel style: its own
# colours, in three hard light bands with a rim and ink outlines, from several sides and poses.
#   python char_view.py -- model.glb out_prefix
import bpy, sys, math
from mathutils import Vector
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == 'MESH' and not o.data.materials: bpy.data.objects.remove(o)  # stray helper shapes
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
body = next(o for o in sc.objects if o.type == 'MESH')
L_DIR = Vector((-0.45, -0.6, 0.66)).normalized()

def celify(m):
    nt = m.node_tree
    tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image and 'metal' not in n.image.name and 'normal' not in n.image.name), None)
    nt.nodes.clear()
    out_ = nt.nodes.new('ShaderNodeOutputMaterial')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex.image
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = L_DIR
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -1
    nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].position = 0; cr.elements[0].color = (0.56, 0.58, 0.72, 1)   # cool shadow
    cr.elements[1].position = 0.5; cr.elements[1].color = (1, 1, 1, 1)
    hi = cr.elements.new(0.86); hi.color = (1.14, 1.12, 1.08, 1)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
    nt.links.new(t.outputs['Color'], mul.inputs[6]); nt.links.new(ramp.outputs['Color'], mul.inputs[7])
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.74
    nt.links.new(lw.outputs['Facing'], gt.inputs[0])
    rk = nt.nodes.new('ShaderNodeMath'); rk.operation = 'MULTIPLY'; rk.inputs[1].default_value = 0.16; nt.links.new(gt.outputs[0], rk.inputs[0])
    scr = nt.nodes.new('ShaderNodeMix'); scr.data_type = 'RGBA'; scr.blend_type = 'SCREEN'
    nt.links.new(rk.outputs[0], scr.inputs[0]); nt.links.new(mul.outputs[2], scr.inputs[6]); scr.inputs[7].default_value = (0.75, 0.85, 1, 1)
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(scr.outputs[2], e.inputs['Color'])
    nt.links.new(e.outputs[0], out_.inputs[0])
for m in body.data.materials: celify(m)

# the ink outline: an inside-out shell a few millimetres bigger, black where we see its back faces
ink = bpy.data.materials.new('ink'); ink.use_nodes = True
nt = ink.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputMaterial')
geo = nt.nodes.new('ShaderNodeNewGeometry'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.008, 0.006, 0.01, 1)
mx = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(geo.outputs['Backfacing'], mx.inputs[0]); nt.links.new(e.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], o_.inputs[0])
body.data.materials.append(ink)
sol = body.modifiers.new('outline', 'SOLIDIFY')
sol.thickness = 0.012; sol.offset = 1; sol.use_flip_normals = True; sol.use_rim = False
sol.material_offset = len(body.data.materials) - 1; sol.use_quality_normals = True
sc.cycles.transparent_max_bounces = 16

w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.92, 0.96, 1)
r = sc.render; r.engine = 'CYCLES'; sc.cycles.samples = 12; sc.cycles.use_denoising = False
r.resolution_x, r.resolution_y = 700, 1000
r.use_freestyle = False; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = 2.2
ls = sc.view_layers[0].freestyle_settings.linesets[0]
ls.select_by_visibility = True; ls.select_by_edge_types = True; ls.select_silhouette = ls.select_border = True; ls.select_crease = False
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
ls.linestyle.color = (0.01, 0.008, 0.012)
# only the long, real outlines: drop the crumbs a dense, bent mesh throws up
ls.linestyle.use_length_min = True; ls.linestyle.length_min = 28
ls.linestyle.use_chaining = True; ls.linestyle.chaining = 'PLAIN'
ls.visibility = 'VISIBLE'
sc.view_settings.view_transform = 'Standard'
bpy.ops.object.camera_add(); cam = bpy.context.active_object; sc.camera = cam
cam.data.type = 'ORTHO'

def bounds():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg)
    pts = [ev.matrix_world @ v.co for v in ev.to_mesh().vertices]; ev.to_mesh_clear()
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

def shoot(tag, sides):
    mn, mx = bounds(); c = (mn + mx) / 2; h = mx.z - mn.z
    cam.data.ortho_scale = h * 1.12
    print(tag, 'height', round(h, 3))
    for name, ang in sides:
        a = math.radians(ang)
        cam.location = c + Vector((math.sin(a) * 6, -math.cos(a) * 6, 0))
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
        r.filepath = f'{out}-{tag}-{name}.png'; bpy.ops.render.render(write_still=True)

ad = arm.animation_data
# rest pose first (no action), then a frame from each animation
saved = ad.action if ad else None
if ad: ad.action = None
for pb in arm.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
shoot('rest', (('front', 0), ('q34', -40), ('side', 90), ('back', 180)))
for act in bpy.data.actions:
    ad.action = act
    if hasattr(ad, 'action_slot') and act.slots: ad.action_slot = act.slots[0]
    f0, f1 = act.frame_range
    sc.frame_set(int(f0 + (f1 - f0) * 0.3))
    shoot(act.name.lower(), (('q34', -40), ('side', 90), ('behind', 160)))
