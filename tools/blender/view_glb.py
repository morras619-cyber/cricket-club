# Renders a generated .glb (one mesh) in the game's cel shading from four sides:
#   python view_glb.py -- model.glb out_prefix
import bpy, sys, json, struct, math, os
import numpy as np
from mathutils import Vector
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
src, out = sys.argv[-2], sys.argv[-1]
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + jl])
bin_ = d[20 + jl + 8:]
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bin_, dt, a['count'] * n, off).reshape(-1, n) if n > 1 else np.frombuffer(bin_, dt, a['count'], off)
p = j['meshes'][0]['primitives'][0]
V = acc(p['attributes']['POSITION']); I = acc(p['indices']).reshape(-1, 3)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
# glTF is Y-up: (x, y, z) -> Blender (x, -z, y)
verts = [(float(x), float(-y), float(-z)) for x, y, z in V]  # this file stands on -Z
me = bpy.data.meshes.new('m'); me.from_pydata(verts, [], [tuple(map(int, f)) for f in I]); me.validate(); me.update()
for f in me.polygons: f.use_smooth = True
o = bpy.data.objects.new('m', me); sc.collection.objects.link(o)
import gear
mat = gear.cel('clay', '#d9d4cc'); me.materials.append(mat)
mn = Vector(np.min(np.array(verts), 0)); mx = Vector(np.max(np.array(verts), 0)); c = (mn + mx) / 2; h = mx.z - mn.z
print('size', tuple(round(v, 3) for v in (mx - mn)))
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.9, 0.92, 0.96, 1)
r = sc.render; r.engine = 'CYCLES'; sc.cycles.samples = 8; sc.cycles.use_denoising = False
r.resolution_x, r.resolution_y = 700, 1000
r.use_freestyle = True; r.line_thickness_mode = 'ABSOLUTE'; r.line_thickness = 2.2
ls = sc.view_layers[0].freestyle_settings.linesets[0]
ls.select_by_visibility = True; ls.select_by_edge_types = True; ls.select_silhouette = ls.select_border = True; ls.select_crease = False
sc.view_layers[0].freestyle_settings.crease_angle = math.radians(120)
if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('ink')
ls.linestyle.color = (0.01, 0.008, 0.012)
sc.view_settings.view_transform = 'Standard'
bpy.ops.object.camera_add(); cam = bpy.context.active_object; sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = h * 1.15
for name, ang in (('front', 0), ('side', 90), ('back', 180), ('q34', -40)):
    a = math.radians(ang)
    cam.location = c + Vector((math.sin(a) * 6, -math.cos(a) * 6, 0))
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    r.filepath = f'{out}-{name}.png'; bpy.ops.render.render(write_still=True)
