# Poses a rigged character (Mixamo-style skeleton, e.g. a Meshy export) through a right-arm fast
# bowler's action and renders plain grey pose references from behind (the bowling camera) and the
# front (the batting camera), one picture per frame plus a contact sheet.
#   python pose_sheet.py -- model.glb out_dir [frame,frame,...]
# Directions are in the world: the bowler runs toward +Y, his right is +X, up is +Z.
import bpy, sys, math, os
from mathutils import Vector, Matrix

args = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = args[0], args[1]
ONLY = args[2].split(',') if len(args) > 2 else None
os.makedirs(OUT, exist_ok=True)

def v(x, y, z): return Vector((x, y, z)).normalized()

# ---------- the bowling action ----------
# Per frame: limb directions (upper arm, forearm, thigh, shin, foot), the spine's lean, which way
# the hips and chest face (yaw, degrees: 0 = toward the batter, 90 = side-on, chest to +X), the
# head's turn, and how high off the ground he is (m).
RUN_ARMS_A = dict(LeftArm=v(-0.1, 0.75, -0.45), LeftForeArm=v(0.12, 0.35, 0.93), RightArm=v(0.15, -0.85, -0.45), RightForeArm=v(0.02, 0.25, -0.97))
RUN_ARMS_C = dict(RightArm=v(0.1, 0.75, -0.45), RightForeArm=v(-0.12, 0.35, 0.93), LeftArm=v(-0.15, -0.85, -0.45), LeftForeArm=v(-0.02, 0.25, -0.97))
BRACED = dict(LeftUpLeg=v(-0.05, 0.6, -0.8), LeftLeg=v(-0.03, 0.55, -0.84), LeftFoot=v(0, 1, -0.35))
POSES = {
    'start': dict(spine=v(0, 0.06, 1), yaw=0, chest=0, head=0,
        LeftArm=v(-0.12, 0.3, -0.95), LeftForeArm=v(0.55, 0.75, 0.35), RightArm=v(0.12, 0.3, -0.95), RightForeArm=v(-0.55, 0.75, 0.35),
        LeftUpLeg=v(-0.07, 0, -1), LeftLeg=v(-0.04, -0.02, -1), RightUpLeg=v(0.07, 0, -1), RightLeg=v(0.04, -0.02, -1)),
    # run-up: pushing off the left foot, right knee driving high, arms pumping, leaning into it
    'run1': dict(spine=v(0, 0.5, 1), yaw=0, chest=0, head=0, **RUN_ARMS_A,
        LeftUpLeg=v(-0.04, 0.25, -1), LeftLeg=v(-0.02, -0.5, -0.87), RightUpLeg=v(0.06, 1, -0.12), RightLeg=v(0.02, -0.3, -0.95)),
    # in flight, legs split, back heel kicked up
    'run2': dict(spine=v(0, 0.5, 1), yaw=0, chest=0, head=0, lift=0.12, **RUN_ARMS_A,
        RightUpLeg=v(0.05, 0.85, -0.5), RightLeg=v(0.02, -0.2, -0.98), LeftUpLeg=v(-0.05, -0.6, -0.8), LeftLeg=v(-0.02, -0.85, 0.5)),
    # the other stride: right foot down, left knee driving
    'run3': dict(spine=v(0, 0.5, 1), yaw=0, chest=0, head=0, **RUN_ARMS_C,
        RightUpLeg=v(0.04, 0.25, -1), RightLeg=v(0.02, -0.5, -0.87), LeftUpLeg=v(-0.06, 1, -0.12), LeftLeg=v(-0.02, -0.3, -0.95)),
    # the bound: a big leap off the left foot, left knee above the hip, hands up by the chin
    'gather': dict(spine=v(0, 0.08, 1), yaw=30, chest=40, head=-35, lift=0.55,
        LeftUpLeg=v(-0.05, 0.92, 0.12), LeftLeg=v(0, 0.3, -1), RightUpLeg=v(0.08, -0.3, -0.95), RightLeg=v(0.02, -0.7, -0.7),
        LeftArm=v(-0.5, 0.35, -0.35), LeftForeArm=v(0.55, 0.4, 0.73), RightArm=v(0.5, 0.3, -0.4), RightForeArm=v(-0.55, 0.4, 0.73)),
    # back-foot landing: side-on, leaning away, front arm reaching up at the batter, front knee
    # high, the bowling arm stretched back down behind
    'coil': dict(spine=v(0, -0.45, 1), yaw=85, chest=95, head=-85,
        RightUpLeg=v(0.12, -0.2, -1), RightLeg=v(0.02, 0.15, -1), RightFoot=v(1, 0.15, -0.25),
        LeftUpLeg=v(-0.1, 0.9, -0.1), LeftLeg=v(-0.05, 0.5, -0.86),
        LeftArm=v(0, 0.35, 0.94), LeftForeArm=v(0, 0.3, 0.95), RightArm=v(0.15, -0.85, -0.5), RightForeArm=v(0.05, -0.8, -0.6)),
    # front foot down and braced; front arm yanked down, bowling arm whirling up behind
    'frontarm': dict(spine=v(0, 0.15, 1), yaw=60, chest=65, head=-60, **BRACED,
        RightUpLeg=v(0.1, -0.55, -0.83), RightLeg=v(0.05, -0.95, -0.3),
        LeftArm=v(-0.3, 0.6, 0.05), LeftForeArm=v(-0.15, 0.25, -0.95), RightArm=v(0.25, -0.9, 0.3), RightForeArm=v(0.1, -0.8, 0.55)),
    # release: tall over the braced front leg, the arm straight up and over, front arm tucked in
    'release': dict(spine=v(0, 0.35, 1), yaw=25, chest=15, head=-15, **BRACED,
        RightUpLeg=v(0.1, -0.5, -0.86), RightLeg=v(0.05, -0.95, -0.3),
        RightArm=v(0.08, 0.15, 1), RightForeArm=v(0.02, 0.35, 0.94), LeftArm=v(-0.4, 0.4, -0.82), LeftForeArm=v(0.6, 0.5, 0.6)),
    # follow-through: bent right over, the arm sweeping down past the left knee, back leg coming through
    'follow1': dict(spine=v(0, 1, 0.35), yaw=-20, chest=-40, head=35,
        LeftUpLeg=v(0, 0.55, -0.83), LeftLeg=v(0, -0.15, -1), RightUpLeg=v(0.1, 0.5, -0.85), RightLeg=v(0, -0.6, -0.8),
        RightArm=v(-0.55, 0.55, -0.63), RightForeArm=v(-0.5, 0.4, -0.77), LeftArm=v(-0.35, -0.8, -0.15), LeftForeArm=v(-0.05, -0.6, -0.8)),
    'follow2': dict(spine=v(0, 0.8, 0.6), yaw=-30, chest=-35, head=30,
        RightUpLeg=v(0.06, 0.6, -0.8), RightLeg=v(0.02, -0.05, -1), LeftUpLeg=v(-0.05, -0.5, -0.86), LeftLeg=v(0, -0.8, 0.4),
        RightArm=v(-0.35, 0.45, -0.82), RightForeArm=v(-0.3, 0.3, -0.9), LeftArm=v(-0.2, -0.6, -0.75), LeftForeArm=v(0, -0.3, -0.95)),
    # easing up, veering off the pitch
    'follow3': dict(spine=v(0, 0.3, 1), yaw=-35, chest=-30, head=30,
        LeftArm=v(-0.15, 0.4, -0.9), LeftForeArm=v(0.05, 0.5, -0.5), RightArm=v(0.15, -0.4, -0.9), RightForeArm=v(0, 0.2, -1),
        LeftUpLeg=v(-0.04, 0.15, -1), LeftLeg=v(-0.02, -0.35, -0.94), RightUpLeg=v(0.06, 0.6, -0.8), RightLeg=v(0.02, -0.4, -0.92)),
    'finish': dict(spine=v(0, 0.08, 1), yaw=-15, chest=-10, head=20,
        LeftArm=v(-0.18, 0.05, -0.98), LeftForeArm=v(-0.05, 0.2, -0.98), RightArm=v(0.18, 0.05, -0.98), RightForeArm=v(0.05, 0.2, -0.98),
        LeftUpLeg=v(-0.08, 0.05, -1), LeftLeg=v(-0.05, -0.02, -1), RightUpLeg=v(0.08, -0.05, -1), RightLeg=v(0.05, -0.05, -1)),
    'field': dict(spine=v(0, 0.75, 0.66), yaw=0, chest=0, head=45,
        LeftUpLeg=v(-0.35, 0.65, -0.68), LeftLeg=v(-0.12, -0.35, -0.93), RightUpLeg=v(0.35, 0.65, -0.68), RightLeg=v(0.12, -0.35, -0.93),
        LeftArm=v(-0.15, 0.55, -0.82), LeftForeArm=v(0.1, 0.6, -0.79), RightArm=v(0.15, 0.55, -0.82), RightForeArm=v(-0.1, 0.6, -0.79)),
    'react': dict(spine=v(0, -0.05, 1), yaw=0, chest=0, head=-15,
        LeftArm=v(-0.85, 0.2, 0.48), LeftForeArm=v(0.55, 0.25, 0.8), RightArm=v(0.85, 0.2, 0.48), RightForeArm=v(-0.55, 0.25, 0.8),
        LeftUpLeg=v(-0.08, 0, -1), LeftLeg=v(-0.05, -0.02, -1), RightUpLeg=v(0.1, 0, -1), RightLeg=v(0.06, -0.02, -1)),
    # wicket! a roar, fists pumped in front of the chest, knees bent
    'celebrate1': dict(spine=v(0, 0.25, 1), yaw=0, chest=0, head=-30,
        LeftUpLeg=v(-0.4, 0.25, -0.88), LeftLeg=v(-0.15, -0.3, -0.94), RightUpLeg=v(0.4, 0.25, -0.88), RightLeg=v(0.15, -0.3, -0.94),
        LeftArm=v(-0.45, 0.25, -0.86), LeftForeArm=v(0.3, 0.5, 0.81), RightArm=v(0.45, 0.25, -0.86), RightForeArm=v(-0.3, 0.5, 0.81)),
    'celebrate2': dict(spine=v(0, -0.12, 1), yaw=0, chest=0, head=-35, lift=0.05,
        LeftArm=v(-0.75, 0.15, 0.65), LeftForeArm=v(-0.45, 0.1, 0.89), RightArm=v(0.75, 0.15, 0.65), RightForeArm=v(0.45, 0.1, 0.89),
        LeftUpLeg=v(-0.2, 0.05, -1), LeftLeg=v(-0.12, -0.05, -1), RightUpLeg=v(0.2, 0.05, -1), RightLeg=v(0.12, -0.05, -1)),
}
ORDER = ['start', 'run1', 'run2', 'run3', 'gather', 'coil', 'frontarm', 'release', 'follow1', 'follow2', 'follow3', 'finish', 'field', 'react', 'celebrate1', 'celebrate2']

# ---------- the model ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == 'MESH' and not o.data.materials: bpy.data.objects.remove(o)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
body = next(o for o in sc.objects if o.type == 'MESH')
if arm.animation_data: arm.animation_data.action = None
# the model faces −Y: turn him to run toward +Y
root = arm
while root.parent: root = root.parent
root.rotation_mode = 'XYZ'; root.rotation_euler.z += math.pi
P = lambda n: arm.pose.bones['mixamorig:' + n]

def upd(): bpy.context.view_layer.update()
def world(pb): return arm.matrix_world @ pb.matrix
def set_world(pb, M): pb.matrix = arm.matrix_world.inverted() @ M; upd()
def rot_about(pb, R3, pivot=None):
    M = world(pb); h = pivot if pivot is not None else M.translation
    set_world(pb, Matrix.Translation(h) @ R3.to_4x4() @ Matrix.Translation(-h) @ M)
def aim(pb, d):
    M = world(pb); y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    rot_about(pb, y.rotation_difference(d).to_matrix())
def twist(pb, deg):
    M = world(pb); y = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    rot_about(pb, Matrix.Rotation(math.radians(deg), 3, y))
def yaw(pb, deg): rot_about(pb, Matrix.Rotation(math.radians(-deg), 3, 'Z'))

def reset():
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    upd()

def pose(p):
    reset()
    hips = P('Hips')
    yaw(hips, p.get('yaw', 0))
    # lean the whole upper body: spine bones share the direction
    sp = p['spine']
    for n in ('Spine', 'Spine1', 'Spine2'): aim(P(n), sp)
    # chest turns further than the hips (hip-shoulder separation)
    twist(P('Spine2'), -(p.get('chest', 0) - p.get('yaw', 0)) * 0.9)
    aim(P('Neck'), (sp + Vector((0, 0, 1))).normalized())
    aim(P('Head'), (sp * 0.3 + Vector((0, 0.15, 1))).normalized())
    twist(P('Neck'), p.get('head', 0) * 0.5); twist(P('Head'), p.get('head', 0) * 0.5)
    for side in ('Left', 'Right'):
        for b in ('Arm', 'ForeArm', 'UpLeg', 'Leg', 'Foot'):
            d = p.get(side + b)
            if b == 'Foot' and d is None:
                d = (world(P(side + 'Leg')).to_3x3() @ Vector((0, 1, 0))).normalized()
                face = Matrix.Rotation(math.radians(-p.get('yaw', 0) * 0.6), 3, 'Z') @ Vector((0, 1, 0))
                d = (face * 1.0 + Vector((0, 0, -0.35))).normalized()
            if d is not None: aim(P(side + b), d)
    # stand on the ground (or leap off it)
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); me = ev.to_mesh()
    zmin = min((ev.matrix_world @ vv.co).z for vv in me.vertices); ev.to_mesh_clear()
    root.location.z += -zmin + p.get('lift', 0.0)
    upd()

# ---------- look: plain grey clay, cel bands, ink outline ----------
L_DIR = Vector((-0.45, -0.6, 0.66)).normalized()
def clay(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o_ = nt.nodes.new('ShaderNodeOutputMaterial'); geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = L_DIR
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -1; nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].color = (*[c * 0.55 for c in rgb], 1); cr.elements[1].position = 0.5; cr.elements[1].color = (*rgb, 1)
    hi = cr.elements.new(0.86); hi.color = (*[min(1, c * 1.15) for c in rgb], 1)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(ramp.outputs['Color'], e.inputs['Color']); nt.links.new(e.outputs[0], o_.inputs[0])
    return m
grey = clay('clay', (0.62, 0.62, 0.64))
body.data.materials.clear(); body.data.materials.append(grey)
ink = bpy.data.materials.new('ink'); ink.use_nodes = True; nt = ink.node_tree; nt.nodes.clear()
o_ = nt.nodes.new('ShaderNodeOutputMaterial'); geo = nt.nodes.new('ShaderNodeNewGeometry'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.008, 0.006, 0.01, 1); mx = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(geo.outputs['Backfacing'], mx.inputs[0]); nt.links.new(e.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], o_.inputs[0])
body.data.materials.append(ink)
sol = body.modifiers.new('outline', 'SOLIDIFY'); sol.thickness = 0.011; sol.offset = 1; sol.use_flip_normals = True; sol.use_rim = False; sol.material_offset = 1
# the ball, in the bowling hand
red = clay('ball', (0.75, 0.05, 0.05))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, segments=24, ring_count=12); ball = bpy.context.active_object; ball.data.materials.append(red)
for f in ball.data.polygons: f.use_smooth = True

w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
r = sc.render; r.engine = 'CYCLES'; sc.cycles.samples = 8; sc.cycles.use_denoising = False; sc.cycles.transparent_max_bounces = 16
r.resolution_x, r.resolution_y = 520, 760; r.film_transparent = False
sc.view_settings.view_transform = 'Standard'
bpy.ops.object.camera_add(); cam = bpy.context.active_object; sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.75

VIEWS = {'back': (Vector((0.28, -1, 0.14)), 'behind the bowler (bowling camera)'), 'front': (Vector((-0.22, 1, 0.08)), 'facing the bowler (batting camera)')}
names = ONLY or ORDER
for name in names:
    pose(POSES[name])
    h = P('RightHand'); hm = world(h)
    ball.location = hm.translation + (hm.to_3x3() @ Vector((0, 1, 0))) * 0.08 + (hm.to_3x3() @ Vector((0, 0, 1))) * 0.03
    ball.hide_render = name in ('field', 'react', 'celebrate1', 'celebrate2', 'finish')
    hips = world(P('Hips')).translation
    for vn, (d, _) in VIEWS.items():
        cam.location = Vector((hips.x, hips.y, 1.25)) + d.normalized() * 9
        cam.rotation_euler = (Vector((hips.x, hips.y, 1.25)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        r.filepath = os.path.join(OUT, f'{vn}-{name}.png'); bpy.ops.render.render(write_still=True)
    print('posed', name)
