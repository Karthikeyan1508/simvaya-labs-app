"""Build the Pelton turbine rig as a GLB for the web lab.

Run from the project root:
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup ^
      --python tools/pelton/build_model.py -- frontend/public/models/pelton-turbine.glb

Coordinates below are glTF (Y up, metres). to_b() maps them to Blender (Z up).
Each rig part is an empty named after its component id; its meshes are children.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]

bpy.ops.wm.read_factory_settings(use_empty=True)


def to_b(v):
    return Vector((v[0], -v[2], v[1]))


def rel(q, piv):
    return to_b((q[0] - piv[0], q[1] - piv[1], q[2] - piv[2]))


def norm(v):
    n = math.sqrt(sum(c * c for c in v))
    return tuple(c / n for c in v)


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def scale(v, s):
    return tuple(c * s for c in v)


MATS = {}


def material(key, color, metal=0.0, rough=0.5, coat=0.0, transmission=0.0, ior=1.45):
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["IOR"].default_value = ior
    MATS[key] = m


class Part:
    """Collects geometry per material. Coordinates are glTF, relative to pivot."""

    def __init__(self, name, pivot=(0.0, 0.0, 0.0)):
        self.name = name
        self.piv = pivot
        self.bms = {}
        self.key = None

    def use(self, key):
        self.key = key
        if key not in self.bms:
            self.bms[key] = bmesh.new()
        return self

    @property
    def bm(self):
        return self.bms[self.key]

    def p(self, q):
        return rel(q, self.piv)

    def lathe(self, p0, p1, prof, seg=32, caps=True):
        """Revolve profile [(radius, distance along p0->p1)] around the p0->p1 axis."""
        bm = self.bm
        a = self.p(p0)
        d = to_b(tuple(p1[i] - p0[i] for i in range(3))).normalized()
        u = d.orthogonal().normalized()
        v = d.cross(u).normalized()
        rings = []
        for r, s in prof:
            c = a + d * s
            if r < 1e-9:
                rings.append([bm.verts.new(c)])
                continue
            rings.append(
                [
                    bm.verts.new(c + (u * math.cos(2 * math.pi * i / seg) + v * math.sin(2 * math.pi * i / seg)) * r)
                    for i in range(seg)
                ]
            )
        for A, B in zip(rings, rings[1:]):
            if len(A) == 1 and len(B) == 1:
                continue
            if len(A) == 1:
                for j in range(seg):
                    bm.faces.new((A[0], B[j], B[(j + 1) % seg]))
            elif len(B) == 1:
                for j in range(seg):
                    bm.faces.new((A[j], A[(j + 1) % seg], B[0]))
            else:
                for j in range(seg):
                    k = (j + 1) % seg
                    bm.faces.new((A[j], A[k], B[k], B[j]))
        if caps:
            for ring in (rings[0], rings[-1]):
                if len(ring) > 1:
                    bm.faces.new(ring)

    def cyl(self, p0, p1, r, seg=32, caps=True):
        return self.lathe(p0, p1, [(r, 0.0), (r, math.dist(p0, p1))], seg, caps)

    def sphere(self, c, r, seg=24, nphi=10):
        bot = (c[0], c[1] - r, c[2])
        top = (c[0], c[1] + r, c[2])
        prof = [(r * math.sin(math.pi * i / nphi), r - r * math.cos(math.pi * i / nphi)) for i in range(nphi + 1)]
        self.lathe(bot, top, prof, seg, False)

    def dome(self, c, axis, R, t, seg=24, nphi=8):
        """Hollow hemisphere shell (thickness t), dome pointing along axis."""
        ax = norm(axis)
        outer = [(R * math.sin(math.pi / 2 * i / nphi), R * math.cos(math.pi / 2 * i / nphi)) for i in range(nphi + 1)]
        inner = [
            ((R - t) * math.sin(math.pi / 2 * i / nphi), (R - t) * math.cos(math.pi / 2 * i / nphi))
            for i in reversed(range(nphi + 1))
        ]
        self.lathe(c, add(c, ax), outer + inner, seg, False)

    def box(self, c, size, bev=0.004):
        bm = self.bm
        cx, cy, cz = self.p(c)
        hx, hy, hz = size[0] / 2, size[2] / 2, size[1] / 2  # glTF y/z swap into Blender z/y
        v = [
            bm.verts.new((cx + sx * hx, cy + sy * hy, cz + sz * hz))
            for sx in (-1, 1)
            for sy in (-1, 1)
            for sz in (-1, 1)
        ]
        faces = [
            bm.faces.new([v[i] for i in q])
            for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))
        ]
        if bev > 0:
            edges = list({e for f in faces for e in f.edges})
            bmesh.ops.bevel(bm, geom=edges, offset=bev, segments=2, affect="EDGES")

    def torus(self, c, n, R, r, nu=40, nv=10, arc=2 * math.pi):
        bm = self.bm
        cen = self.p(c)
        nn = to_b(n).normalized()
        e1 = nn.orthogonal().normalized()
        e2 = nn.cross(e1).normalized()
        closed = abs(arc - 2 * math.pi) < 1e-6
        count = nu if closed else nu + 1
        rings = []
        for i in range(count):
            th = arc * i / nu
            radial = e1 * math.cos(th) + e2 * math.sin(th)
            rings.append(
                [
                    bm.verts.new(cen + radial * (R + r * math.cos(2 * math.pi * j / nv)) + nn * (r * math.sin(2 * math.pi * j / nv)))
                    for j in range(nv)
                ]
            )
        for i in range(nu):
            A, B = rings[i], rings[(i + 1) % count]
            for j in range(nv):
                k = (j + 1) % nv
                bm.faces.new((A[j], A[k], B[k], B[j]))

    def finish(self):
        root = bpy.data.objects.new(self.name, None)
        root.empty_display_size = 0.05
        root.location = to_b(self.piv)
        bpy.context.collection.objects.link(root)
        for key, bm in self.bms.items():
            if not bm.faces:
                bm.free()
                continue
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
            me = bpy.data.meshes.new(f"{self.name}.{key}")
            bm.to_mesh(me)
            bm.free()
            me.materials.append(MATS[key])
            for poly in me.polygons:
                poly.use_smooth = True
            ob = bpy.data.objects.new(me.name, me)
            ob.parent = root
            bpy.context.collection.objects.link(ob)
        return root


def tmp_mesh(name, build):
    p = Part(name).use("plate")
    build(p)
    me = bpy.data.meshes.new(name)
    p.bm.to_mesh(me)
    p.bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def boolean(a, b, op):
    mod = a.modifiers.new("bool", "BOOLEAN")
    mod.operation = op
    mod.object = b
    mod.solver = "EXACT"
    for o in bpy.context.selected_objects:
        o.select_set(False)
    a.select_set(True)
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(b, do_unlink=True)
    return a


def adopt(ob, key, root):
    ob.name = f"{root.name}.{key}"
    ob.data.materials.clear()
    ob.data.materials.append(MATS[key])
    for poly in ob.data.polygons:
        poly.use_smooth = True
    ob.parent = root


def gauge(tag, x, y):
    g = Part("gauge_" + tag)
    g.use("chrome").lathe((x, y, 0.006), (x, y, 0.026), [(0.046, 0.0), (0.046, 0.02)], 48, True)
    g.use("face").lathe((x, y, 0.024), (x, y, 0.027), [(0.04, 0.0), (0.04, 0.003)], 48, True)
    g.use("black")
    for k in range(8):
        a = math.radians(225 - k * 270 / 7)
        dx, dy = math.cos(a), math.sin(a)
        g.cyl((x + dx * 0.030, y + dy * 0.030, 0.027), (x + dx * 0.037, y + dy * 0.037, 0.027), 0.0016, 6)
    groot = g.finish()
    n = Part("needle_" + tag, (x, y, 0.027))
    n.use("red").cyl((x, y, 0.027), (x, y + 0.033, 0.027), 0.0022, 12)
    nroot = n.finish()
    nroot.parent = groot
    return groot


def build():
    yC = 0.36
    C = (0.0, yC, 0.0)  # runner centre, shaft along z
    ZB = -0.25  # back plane: drum, frame, ropes, spring balance

    material("plate", (0.9, 0.9, 0.88), rough=0.55)
    material("paint", (0.18, 0.23, 0.29), rough=0.38, coat=0.35)
    material("acrylic", (0.92, 0.96, 1.0), rough=0.03, transmission=1.0, ior=1.49)
    material("glass", (0.9, 0.95, 1.0), rough=0.04, transmission=1.0, ior=1.5)
    material("chrome", (0.9, 0.9, 0.92), metal=1.0, rough=0.14)
    material("brass", (0.8, 0.6, 0.3), metal=1.0, rough=0.28)
    material("hose", (0.82, 0.9, 1.0), rough=0.04, transmission=1.0, ior=1.45)
    material("orange", (0.95, 0.42, 0.1), rough=0.32, coat=0.6)
    material("black", (0.02, 0.02, 0.025), rough=0.4)
    material("iron", (0.07, 0.07, 0.075), metal=0.3, rough=0.5)
    material("rope", (0.92, 0.92, 0.88), rough=0.9)
    material("red", (0.85, 0.05, 0.03), rough=0.4)
    material("face", (0.96, 0.96, 0.94), rough=0.25)
    material("grey", (0.5, 0.52, 0.56), metal=0.7, rough=0.35)
    material("pump", (0.15, 0.32, 0.7), rough=0.4, coat=0.3)

    # Base plate and feet
    p = Part("base")
    p.use("plate").box((-0.15, 0.015, -0.1), (1.9, 0.03, 1.0), 0.008)
    p.use("iron")
    for x in (-1.0, 0.7):
        for z in (-0.5, 0.3):
            p.cyl((x, -0.012, z), (x, 0.0, z), 0.03, 24)
    p.finish()

    # Centrifugal pump on a pedestal
    p = Part("pump")
    p.use("paint").box((-0.8, 0.055, 0.0), (0.22, 0.05, 0.2), 0.006)
    p.use("pump").cyl((-0.88, 0.13, 0.0), (-0.70, 0.13, 0.0), 0.085, 40)
    p.use("pump").cyl((-1.06, 0.13, 0.0), (-0.90, 0.13, 0.0), 0.06, 32)
    p.finish()

    # Penstock pipes from pump to the nozzle feed
    p = Part("penstock")
    p.use("hose")
    p.cyl((-0.70, 0.13, 0.0), (-0.66, 0.13, 0.0), 0.03)
    p.cyl((-0.54, 0.13, 0.0), (-0.40, 0.13, 0.0), 0.03)
    p.cyl((-0.40, 0.13, 0.0), (-0.40, 0.52, 0.0), 0.03)
    p.sphere((-0.40, 0.13, 0.0), 0.03)
    p.finish()

    # Venturimeter with manometer tubes
    p = Part("venturi")
    p.use("hose").lathe(
        (-0.66, 0.13, 0.0),
        (-0.54, 0.13, 0.0),
        [(0.034, 0.0), (0.03, 0.01), (0.02, 0.04), (0.014, 0.06), (0.014, 0.08), (0.02, 0.1), (0.03, 0.11), (0.034, 0.12)],
        32,
        False,
    )
    p.use("paint")
    p.box((-0.6, 0.19, 0.0), (0.1, 0.02, 0.08), 0.004)
    p.box((-0.6, 0.515, 0.0), (0.1, 0.02, 0.08), 0.004)
    p.cyl((-0.6, 0.14, 0.0), (-0.6, 0.18, 0.0), 0.01, 16)
    p.use("glass")
    p.cyl((-0.6, 0.2, -0.03), (-0.6, 0.5, -0.03), 0.007, 20)
    p.cyl((-0.6, 0.2, 0.03), (-0.6, 0.5, 0.03), 0.007, 20)
    p.finish()

    # Nozzle body with inlet flange
    p = Part("nozzle")
    p.use("brass").lathe(
        (-0.52, 0.56, 0.0),
        (-0.17, 0.56, 0.0),
        [(0.045, 0.0), (0.04, 0.05), (0.022, 0.22), (0.013, 0.31), (0.012, 0.35)],
        40,
        False,
    )
    p.cyl((-0.56, 0.56, 0.0), (-0.52, 0.56, 0.0), 0.05, 40)
    p.finish()

    # Spear (needle valve) with handwheel. Pivot at the spear tip; runtime moves it along x.
    S = (-0.17, 0.56, 0.0)
    p = Part("spear", S)
    p.use("chrome").lathe(S, (-0.20, 0.56, 0.0), [(0.0, 0.0), (0.006, 0.03)], 20, False)
    p.cyl((-0.20, 0.56, 0.0), (-0.62, 0.56, 0.0), 0.006, 16)
    p.use("black")
    p.torus((-0.64, 0.56, 0.0), (1, 0, 0), 0.05, 0.008, nu=40, nv=10)
    p.cyl((-0.66, 0.56, 0.0), (-0.62, 0.56, 0.0), 0.02, 20)
    for deg in (90, 210, 330):
        t = math.radians(deg)
        p.cyl((-0.64, 0.56, 0.0), (-0.64, 0.56 + 0.05 * math.cos(t), 0.05 * math.sin(t)), 0.005, 12)
    p.finish()

    # Runner: disc, hub and 36 double-cup buckets
    p = Part("runner", C)
    p.use("orange").cyl((0.0, yC, -0.012), (0.0, yC, 0.012), 0.195, 64)
    p.use("chrome").cyl((0.0, yC, -0.04), (0.0, yC, 0.04), 0.035, 40)
    N, R = 18, 0.2
    for i in range(N):
        th = 2 * math.pi * i / N
        rad = (math.cos(th), math.sin(th), 0.0)
        tan = (-math.sin(th), math.cos(th), 0.0)
        axis = norm(add(tan, scale(rad, 0.6)))
        for z in (-0.022, 0.022):
            c = (R * math.cos(th), yC + R * math.sin(th), z)
            p.use("orange").dome(c, axis, 0.03, 0.0035)
    p.finish()

    # Shaft and brake drum (rotate with runner)
    p = Part("shaft", C)
    p.use("chrome").cyl((0.0, yC, -0.36), (0.0, yC, 0.05), 0.011, 24)
    p.finish()

    p = Part("brake_drum", C)
    p.use("grey").lathe(
        (0.0, yC, -0.27),
        (0.0, yC, -0.23),
        [(0.2, 0.0), (0.2, 0.008), (0.18, 0.008), (0.18, 0.032), (0.2, 0.032), (0.2, 0.04)],
        64,
        True,
    )
    p.finish()

    # Housing: arched shell with cavity open to the front, acrylic window, bolts
    def arch(R, z0, z1, ybot):
        c = tmp_mesh("arch_c", lambda q: q.cyl((0.0, yC, z0), (0.0, yC, z1), R, 72))
        b = tmp_mesh(
            "arch_b",
            lambda q: q.box((0.0, (ybot + yC) / 2, (z0 + z1) / 2), (2 * R, yC - ybot, z1 - z0), 0.0),
        )
        return boolean(c, b, "UNION")

    shell = boolean(arch(0.3, -0.1, 0.1, 0.03), arch(0.27, -0.085, 0.14, 0.06), "DIFFERENCE")
    window = arch(0.27, 0.1, 0.108, 0.06)
    cas = Part("casing")
    cas.use("paint").cyl((0.0, yC, -0.1), (0.0, yC, -0.17), 0.035, 32)
    cas.use("chrome")
    for deg in (30, 60, 90, 120, 150):
        t = math.radians(deg)
        x, y = 0.285 * math.cos(t), yC + 0.285 * math.sin(t)
        cas.cyl((x, y, 0.1), (x, y, 0.112), 0.009, 16)
        cas.cyl((x, y, -0.1), (x, y, -0.112), 0.009, 16)
    croot = cas.finish()
    adopt(shell, "paint", croot)
    adopt(window, "acrylic", croot)

    # Support frame: chrome rods, bars, gauge board and its post
    p = Part("frame")
    for x in (-0.44, 0.44):
        p.use("chrome").cyl((x, 0.03, ZB), (x, 1.12, ZB), 0.009, 20)
        p.use("iron").cyl((x, 0.0, ZB), (x, 0.03, ZB), 0.02, 20)
    p.use("paint")
    p.box((0.0, 1.1, ZB), (0.94, 0.03, 0.05), 0.005)
    p.box((0.0, 0.7, ZB), (0.94, 0.02, 0.04), 0.004)
    p.box((-0.425, 0.865, 0.0), (0.15, 0.42, 0.012), 0.004)
    p.use("chrome").cyl((-0.46, 0.03, 0.0), (-0.46, 0.655, 0.0), 0.012, 16)
    p.finish()

    # Gauges (P1 venturi throat, P2 venturi inlet, P3 penstock) with needle pivots
    gauge("p1", -0.42, 0.86)
    gauge("p2", -0.42, 1.0)
    gauge("p3", -0.42, 0.72)

    # Spring balance (T2) with dial and pointer
    p = Part("spring")
    p.use("black").cyl((0.173, 0.8, ZB), (0.173, 1.06, ZB), 0.02, 28)
    p.use("face").lathe((0.173, 0.92, ZB + 0.019), (0.173, 0.92, ZB + 0.0215), [(0.016, 0.0), (0.016, 0.0025)], 28, True)
    p.use("chrome")
    p.torus((0.173, 1.095, ZB), (0, 0, 1), 0.012, 0.003, nu=20, nv=8)
    p.torus((0.173, 0.79, ZB), (0, 0, 1), 0.012, 0.003, nu=20, nv=8)
    sroot = p.finish()
    n = Part("needle_spring", (0.173, 0.92, ZB + 0.0215))
    n.use("red").cyl((0.173, 0.92, ZB + 0.0215), (0.173, 0.933, ZB + 0.0215), 0.0012, 8)
    nroot = n.finish()
    nroot.parent = sroot

    # Dead weights: hanger plate plus ten 1 kg discs (weight_0..9, toggled at runtime)
    p = Part("deadweights")
    p.use("chrome").box((-0.173, 0.24, ZB), (0.1, 0.02, 0.1), 0.004)
    p.torus((-0.173, 0.265, ZB), (0, 0, 1), 0.012, 0.003, nu=20, nv=8)
    dwroot = p.finish()
    for i in range(10):
        w = Part(f"weight_{i}")
        y0 = 0.03 + 0.02 * i
        w.use("iron").lathe(
            (-0.173, y0, ZB),
            (-0.173, y0 + 0.02, ZB),
            [(0.0, 0.0), (0.045, 0.0), (0.047, 0.003), (0.047, 0.017), (0.045, 0.02), (0.0, 0.02)],
            40,
            False,
        )
        w.finish().parent = dwroot

    # Rope from drum to spring balance
    p = Part("rope")
    p.use("rope").cyl((0.173, 0.46, ZB), (0.173, 0.79, ZB), 0.0045, 8)
    p.finish()

    # Tachometer on a stand, probe arm to the shaft end
    p = Part("tacho")
    p.use("black").box((0.0, 0.36, -0.5), (0.09, 0.07, 0.05), 0.006)
    p.use("face").box((0.0, 0.37, -0.476), (0.05, 0.025, 0.002), 0.0)
    p.use("black").cyl((0.0, 0.36, -0.36), (0.0, 0.36, -0.475), 0.008, 12)
    p.use("chrome").cyl((0.0, 0.03, -0.5), (0.0, 0.325, -0.5), 0.012, 16)
    p.finish()


build()
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=False, export_yup=True)
print("EXPORTED", OUT, "objects:", len(bpy.data.objects))
