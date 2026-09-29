"""
Core Blender helpers for the villa pipeline.

Everything is authored in the runtime's (three.js) frame: +x east, +y up, +z south,
metres. `B()` converts to Blender's Z-up frame (x, -z, y); the glTF exporter
converts back, so exported GLBs line up with src/data/villa.ts.

Furniture is built in a local frame (+x along the piece, +y up, +z = the side it
faces) and placed with a Placer (position + rotation about the vertical axis).
"""
from __future__ import annotations

import json
import math
import os
from typing import Iterable, Sequence

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TEX = os.path.join(ROOT, "scripts", ".cache", "tex")
PI = math.pi

with open(os.path.join(HERE, "layout.json")) as f:
    LAYOUT = json.load(f)
H = LAYOUT["wallHeight"]


def B(x: float, y: float, z: float) -> Vector:
    return Vector((x, -z, y))


def three_rot_matrix(rx: float, ry: float, rz: float) -> Matrix:
    """A three.js Euler (XYZ order) as a Blender matrix. Axis mapping: three x = X,
    three y = Z, three z = -Y, so Rx(a) = RotX(a), Ry(a) = RotZ(a), Rz(a) = RotY(-a)."""
    return Matrix.Rotation(rx, 4, "X") @ Matrix.Rotation(ry, 4, "Z") @ Matrix.Rotation(-rz, 4, "Y")


# ---------------------------------------------------------------- scene


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(c)
    return c


# ---------------------------------------------------------------- materials

_mat_defs: dict[str, dict] = {}


def register_materials(defs: dict[str, dict]):
    _mat_defs.update(defs)


def _hex_lin(h: str):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def _image(name: str, colorspace: str):
    key = f"{name}|{colorspace}"
    img = bpy.data.images.get(key)
    if img is None:
        path = os.path.join(TEX, name)
        img = bpy.data.images.load(path, check_existing=False)
        img.name = key
        img.colorspace_settings.name = colorspace
    return img


def material(name: str) -> bpy.types.Material:
    m = bpy.data.materials.get(name)
    if m is not None:
        return m
    d = _mat_defs.get(name)
    if d is None:
        raise KeyError(f"unknown material {name}")
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = nodes["Principled BSDF"]
    if d.get("glass"):
        # thin glass: fresnel mix of a clear pass-through and a mirror reflection
        out = nodes["Material Output"]
        nodes.remove(bsdf)
        tr = nodes.new("ShaderNodeBsdfTransparent")
        tr.inputs["Color"].default_value = (*_hex_lin(d.get("color", "#ffffff")), 1)
        gl = nodes.new("ShaderNodeBsdfGlossy")
        gl.inputs["Roughness"].default_value = d.get("rough", 0.02)
        fr = nodes.new("ShaderNodeFresnel")
        fr.inputs["IOR"].default_value = 1.5
        mix = nodes.new("ShaderNodeMixShader")
        links.new(fr.outputs["Fac"], mix.inputs["Fac"])
        links.new(tr.outputs["BSDF"], mix.inputs[1])
        links.new(gl.outputs["BSDF"], mix.inputs[2])
        links.new(mix.outputs["Shader"], out.inputs["Surface"])
        m.diffuse_color = (*_hex_lin(d.get("color", "#ffffff")), 0.2)
        return m
    color = _hex_lin(d.get("color", "#ffffff"))
    tex = d.get("tex")
    tile = d.get("tile", 1.0)
    rough = d.get("rough", 0.8)
    if tex:
        coord = nodes.new("ShaderNodeTexCoord")
        mapping = nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = (1 / tile, 1 / tile, 1 / tile)
        links.new(coord.outputs["UV"], mapping.inputs["Vector"])
        alb = nodes.new("ShaderNodeTexImage")
        alb.image = _image(f"{tex}_albedo.png", "sRGB")
        links.new(mapping.outputs["Vector"], alb.inputs["Vector"])
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        links.new(alb.outputs["Color"], mix.inputs["A"])
        mix.inputs["B"].default_value = (*color, 1)
        links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        if d.get("uv01"):
            bsdf.inputs["Roughness"].default_value = rough
            bsdf.inputs["Metallic"].default_value = d.get("metal", 0.0)
            if "emissive" in d:
                links.new(alb.outputs["Color"], bsdf.inputs["Emission Color"])
                bsdf.inputs["Emission Strength"].default_value = d.get("emissiveStrength", 0.0)
            m.diffuse_color = (*color, 1)
            return m
        nrm = nodes.new("ShaderNodeTexImage")
        nrm.image = _image(f"{tex}_normal.png", "Non-Color")
        links.new(mapping.outputs["Vector"], nrm.inputs["Vector"])
        nmap = nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = d.get("normal", 1.0)
        links.new(nrm.outputs["Color"], nmap.inputs["Color"])
        links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
        if d.get("roughMap", True):
            rt = nodes.new("ShaderNodeTexImage")
            rt.image = _image(f"{tex}_rough.png", "Non-Color")
            links.new(mapping.outputs["Vector"], rt.inputs["Vector"])
            mul = nodes.new("ShaderNodeMath")
            mul.operation = "MULTIPLY"
            links.new(rt.outputs["Color"], mul.inputs[0])
            # rough maps average ~0.5-0.9; scale so the material's roughness is the mean
            mul.inputs[1].default_value = rough / d.get("roughMean", 0.85)
            links.new(mul.outputs[0], bsdf.inputs["Roughness"])
        else:
            bsdf.inputs["Roughness"].default_value = rough
    else:
        bsdf.inputs["Base Color"].default_value = (*color, 1)
        bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = d.get("metal", 0.0)
    if d.get("haze"):
        # fade towards the hazy sky with distance (aerial perspective)
        cam = nodes.new("ShaderNodeCameraData")
        k = nodes.new("ShaderNodeMath")
        k.operation = "DIVIDE"
        k.inputs[1].default_value = d["haze"]
        links.new(cam.outputs["View Distance"], k.inputs[0])
        e = nodes.new("ShaderNodeMath")
        e.operation = "EXPONENT"
        neg = nodes.new("ShaderNodeMath")
        neg.operation = "MULTIPLY"
        neg.inputs[1].default_value = -1.0
        links.new(k.outputs[0], neg.inputs[0])
        links.new(neg.outputs[0], e.inputs[0])
        inv = nodes.new("ShaderNodeMath")
        inv.operation = "SUBTRACT"
        inv.inputs[0].default_value = 1.0
        links.new(e.outputs[0], inv.inputs[1])
        hz = nodes.new("ShaderNodeMix")
        hz.data_type = "RGBA"
        src = bsdf.inputs["Base Color"].links[0].from_socket if bsdf.inputs["Base Color"].links else None
        if src is not None:
            links.new(src, hz.inputs["A"])
        else:
            hz.inputs["A"].default_value = bsdf.inputs["Base Color"].default_value
        hz.inputs["B"].default_value = (*_hex_lin("#c9d3dc"), 1)
        links.new(inv.outputs[0], hz.inputs["Factor"])
        links.new(hz.outputs["Result"], bsdf.inputs["Base Color"])
    if "sheen" in d:
        bsdf.inputs["Sheen Weight"].default_value = d["sheen"].get("weight", 1.0)
        bsdf.inputs["Sheen Tint"].default_value = (*_hex_lin(d["sheen"]["color"]), 1)
        bsdf.inputs["Sheen Roughness"].default_value = d["sheen"].get("rough", 0.4)
    if "emissive" in d:
        bsdf.inputs["Emission Color"].default_value = (*_hex_lin(d["emissive"]), 1)
        bsdf.inputs["Emission Strength"].default_value = d.get("emissiveStrength", 0.0)
    if d.get("transmission"):
        bsdf.inputs["Transmission Weight"].default_value = d["transmission"]
        bsdf.inputs["IOR"].default_value = d.get("ior", 1.45)
    if d.get("translucent"):
        # thin diffuse transmission for lamp shades and sheers
        tr = nodes.new("ShaderNodeBsdfTranslucent")
        tr.inputs["Color"].default_value = (*_hex_lin(d.get("color", "#ffffff")), 1)
        mixs = nodes.new("ShaderNodeMixShader")
        mixs.inputs["Fac"].default_value = d["translucent"]
        out = nodes["Material Output"]
        links.new(bsdf.outputs["BSDF"], mixs.inputs[1])
        links.new(tr.outputs["BSDF"], mixs.inputs[2])
        links.new(mixs.outputs["Shader"], out.inputs["Surface"])
    if d.get("alpha") is not None:
        bsdf.inputs["Alpha"].default_value = d["alpha"]
    m.diffuse_color = (*color, 1)
    return m


# ---------------------------------------------------------------- mesh building

_uid = [0]


def _new_object(name: str, bm: bmesh.types.BMesh, mat: str, coll: bpy.types.Collection) -> bpy.types.Object:
    _uid[0] += 1
    me = bpy.data.meshes.new(f"{name}.{_uid[0]}")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(me.name, me)
    coll.objects.link(ob)
    me.materials.append(material(mat))
    return ob


class Kit:
    """Accumulates objects into a collection. Objects are created in world space."""

    def __init__(self, coll: bpy.types.Collection, tag: str = "static"):
        self.coll = coll
        self.tag = tag

    def child(self, coll: bpy.types.Collection, tag: str | None = None) -> "Kit":
        return Kit(coll, tag or self.tag)


# Night-time light sources registered by the furniture kit (lamps, pendants, ...):
# dicts with kind, world position (Blender axes), power, radius, colour, room.
LIGHTS: list[dict] = []


class Placer:
    """A local frame: position (x, z) at height y, rotated by ry about the vertical."""

    def __init__(self, kit: Kit, x: float, z: float, ry: float = 0.0, y: float = 0.0, tag: str | None = None):
        self.kit = kit
        self.origin = (x, y, z)
        self.ry = ry
        self.tag = tag or kit.tag
        self.m = Matrix.Translation(B(x, y, z)) @ Matrix.Rotation(ry, 4, "Z")

    def sub(self, dx: float, dz: float, ry: float = 0.0, dy: float = 0.0) -> "Placer":
        """A nested frame relative to this one."""
        c, s = math.cos(self.ry), math.sin(self.ry)
        x = self.origin[0] + dx * c + dz * s
        z = self.origin[2] - dx * s + dz * c
        return Placer(self.kit, x, z, self.ry + ry, self.origin[1] + dy, self.tag)

    def world(self, pos) -> Vector:
        """Local (three-frame) point -> world position in Blender axes."""
        return self.m @ B(*pos)

    def light(self, pos, power: float, radius=0.03, kind="POINT", color=(1.0, 0.78, 0.55), spot=None,
              direction=None):
        """Register a lamp's light source (used by the night preset)."""
        LIGHTS.append({"kind": kind, "pos": self.world(pos), "power": power, "radius": radius, "color": color,
                       "spot": spot, "dir": direction, "coll": self.kit.coll.name})

    # -- placement

    def _finish(self, ob: bpy.types.Object, pos, rot=(0, 0, 0), bevel: float = 0.0, segs: int = 3,
                smooth: bool = True, angle: float = 40.0, tag: str | None = None, weighted=True):
        local = Matrix.Translation(B(*pos)) @ three_rot_matrix(*rot).to_4x4()
        ob.matrix_world = self.m @ local
        if bevel > 0:
            # rounded edges with hardened normals keep big faces flat-shaded
            md = ob.modifiers.new("bevel", "BEVEL")
            md.width = bevel
            md.segments = segs
            md.limit_method = "ANGLE"
            md.angle_limit = math.radians(30)
            md.harden_normals = True
            md.miter_outer = "MITER_ARC"
            for p in ob.data.polygons:
                p.use_smooth = True
        elif smooth:
            _smooth_by_angle(ob, angle)
        ob["tag"] = tag or self.tag
        return ob

    def box(self, mat: str, pos, size, bevel: float = 0.0, rot=(0, 0, 0), segs: int = 3, tag=None, subdiv: int = 0):
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        sx, sy, sz = size
        bmesh.ops.scale(bm, vec=Vector((sx, sz, sy)), verts=bm.verts)
        if subdiv:
            bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=subdiv, use_grid_fill=True)
        ob = _new_object("box", bm, mat, self.kit.coll)
        return self._finish(ob, pos, rot, bevel, segs, smooth=bevel > 0, tag=tag)

    def cyl(self, mat: str, pos, r_top: float, r_bot: float, h: float, seg: int = 32, rot=(0, 0, 0),
            bevel: float = 0.0, open_ends=False, tag=None):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=not open_ends, cap_tris=False, segments=seg, radius1=r_bot,
                              radius2=r_top, depth=h)
        ob = _new_object("cyl", bm, mat, self.kit.coll)
        return self._finish(ob, pos, rot, bevel, 2, smooth=True, angle=50, tag=tag)

    def sphere(self, mat: str, pos, r: float, scale=(1, 1, 1), seg: int = 24, rot=(0, 0, 0), tag=None):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(8, seg // 2), radius=r)
        sx, sy, sz = scale
        bmesh.ops.scale(bm, vec=Vector((sx, sz, sy)), verts=bm.verts)
        ob = _new_object("sphere", bm, mat, self.kit.coll)
        return self._finish(ob, pos, rot, 0, smooth=True, angle=80, tag=tag)

    def ico(self, mat: str, pos, r: float, seed: int = 0, rough: float = 0.28, tag=None):
        """An irregular, lumpy icosphere (foliage clumps, stones)."""
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
        rr = _Rand(seed)
        ph = [rr() * 6.28 for _ in range(6)]
        for v in bm.verts:
            n = v.co.normalized()
            k = 1 + rough * (math.sin(n.x * 5 + ph[0]) * math.sin(n.y * 4 + ph[1]) + 0.6 * math.sin(n.z * 7 + ph[2])
                             + 0.4 * math.sin((n.x + n.y) * 11 + ph[3]))
            v.co = n * r * k
        bm.verts.ensure_lookup_table()
        ob = _new_object("ico", bm, mat, self.kit.coll)
        return self._finish(ob, pos, (0, 0, 0), 0, smooth=True, angle=80, tag=tag)

    def lathe(self, mat: str, pos, profile: Sequence[tuple[float, float]], seg: int = 40, scale=(1, 1, 1),
              rot=(0, 0, 0), tag=None, angle=45.0):
        """profile: (radius, height) points from bottom centre around to top centre."""
        bm = bmesh.new()
        verts = [bm.verts.new((r, 0, y)) for r, y in profile]
        edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
        bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * PI, steps=seg,
                       use_merge=True)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        sx, sy, sz = scale
        bmesh.ops.scale(bm, vec=Vector((sx, sz, sy)), verts=bm.verts)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = _new_object("lathe", bm, mat, self.kit.coll)
        return self._finish(ob, pos, rot, 0, smooth=True, angle=angle, tag=tag)

    def torus(self, mat: str, pos, R: float, r: float, rot=(0, 0, 0), arc: float = 2 * PI, seg: int = 48,
              ring: int = 12, tag=None):
        bm = bmesh.new()
        n = seg
        closed = arc >= 2 * PI - 1e-6
        rows = []
        for i in range(n + (0 if closed else 1)):
            a = arc * i / n
            ca, sa = math.cos(a), math.sin(a)
            row = []
            for j in range(ring):
                b = 2 * PI * j / ring
                rr = R + r * math.cos(b)
                row.append(bm.verts.new((rr * ca, r * math.sin(b), rr * sa)))
            rows.append(row)
        for i in range(len(rows) - (0 if closed else 1)):
            a, b_ = rows[i], rows[(i + 1) % len(rows)]
            for j in range(ring):
                bm.faces.new((a[j], a[(j + 1) % ring], b_[(j + 1) % ring], b_[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = _new_object("torus", bm, mat, self.kit.coll)
        return self._finish(ob, pos, rot, 0, smooth=True, angle=80, tag=tag)

    def plane(self, mat: str, pos, w: float, h: float, rot=(0, 0, 0), uv01=True, tag=None):
        """Vertical plane facing +z (local), w along x, h along y."""
        bm = bmesh.new()
        vs = [bm.verts.new(v) for v in ((-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2))]
        f = bm.faces.new(vs)
        # face +z in three == -Y in blender
        f.normal_update()
        if f.normal.y > 0:
            f.normal_flip()
        if uv01:
            uvl = bm.loops.layers.uv.new("UVMap")
            for loop, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
                loop[uvl].uv = uv
        ob = _new_object("plane", bm, mat, self.kit.coll)
        if uv01:
            ob["uv_fixed"] = True
        return self._finish(ob, pos, rot, 0, smooth=False, tag=tag)

    def cushion(self, mat: str, pos, size, rot=(0, 0, 0), puff: float = 0.25, round_: float = 0.35,
                wrinkle: float = 0.004, seed: int = 0, tag=None, res: int = 10):
        """A soft, filled cushion/pillow/mattress: a subdivided box whose faces bulge
        and whose edges pinch in like a sewn seam."""
        sx, sy, sz = size  # width (x), height (y), depth (z)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=res, use_grid_fill=True)
        rnd = _Rand(seed)
        ph = [rnd() * 6.28 for _ in range(6)]
        for v in bm.verts:
            x, y, z = v.co  # blender: y = -three z (depth), z = up
            ax, ay, az = abs(x) * 2, abs(y) * 2, abs(z) * 2  # 0..1 to the faces
            # round the box towards a superellipsoid
            k = round_
            v.co.x = x * (1 - k * 0.5 * (ay ** 4 + az ** 4) * ax ** 2)
            v.co.y = y * (1 - k * 0.5 * (ax ** 4 + az ** 4) * ay ** 2)
            v.co.z = z * (1 - k * 0.8 * (ax ** 4 + ay ** 4) * az ** 2)
            # bulge the big faces (top/bottom = blender z)
            bulge = (1 - ax ** 2.5) * (1 - ay ** 2.5)
            v.co.z += math.copysign(1, z) * puff * 0.5 * bulge * (az ** 3)
            # wrinkles
            w = math.sin(x * 9 + ph[0]) * math.sin(y * 7 + ph[1]) + 0.5 * math.sin(x * 23 + y * 17 + ph[2])
            v.co.z += w * wrinkle / max(sy, 1e-3) * az
        bmesh.ops.scale(bm, vec=Vector((sx, sz, sy)), verts=bm.verts)
        ob = _new_object("cushion", bm, mat, self.kit.coll)
        md = ob.modifiers.new("subsurf", "SUBSURF")
        md.levels = 1
        md.render_levels = 1
        return self._finish(ob, pos, rot, 0, smooth=True, angle=180, tag=tag)

    def tube(self, mat: str, points: Sequence[tuple[float, float, float]], r: float, seg: int = 10, tag=None):
        """A round rod through local points (three frame)."""
        bm = bmesh.new()
        rings = []
        pts = [Vector(B(*p)) for p in points]
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            u = t.cross(up).normalized()
            v = t.cross(u).normalized()
            rings.append([bm.verts.new(p + (u * math.cos(2 * PI * j / seg) + v * math.sin(2 * PI * j / seg)) * r)
                          for j in range(seg)])
        for a, b_ in zip(rings, rings[1:]):
            for j in range(seg):
                bm.faces.new((a[j], a[(j + 1) % seg], b_[(j + 1) % seg], b_[j]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = _new_object("tube", bm, mat, self.kit.coll)
        return self._finish(ob, (0, 0, 0), (0, 0, 0), 0, smooth=True, angle=60, tag=tag)

    def mesh(self, mat: str, bm: bmesh.types.BMesh, pos=(0, 0, 0), rot=(0, 0, 0), smooth=True, angle=40.0,
             bevel=0.0, tag=None):
        """Place a caller-built bmesh (in Blender axes, local)."""
        ob = _new_object("mesh", bm, mat, self.kit.coll)
        return self._finish(ob, pos, rot, bevel, 2, smooth=smooth, angle=angle, tag=tag)


class _Rand:
    def __init__(self, seed: int):
        self.s = (seed * 9301 + 49297) % 233280 or 1

    def __call__(self) -> float:
        self.s = (self.s * 9301 + 49297) % 233280
        return self.s / 233280.0


def rand(seed: int) -> _Rand:
    return _Rand(seed)


def _smooth_by_angle(ob: bpy.types.Object, angle_deg: float):
    """Mark edges sharper than angle as sharp (Blender 4.1+ smooth-by-angle)."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    lim = math.radians(angle_deg)
    for e in bm.edges:
        if len(e.link_faces) == 2:
            e.smooth = e.calc_face_angle(0) < lim
        else:
            e.smooth = False
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(me)
    bm.free()


# ---------------------------------------------------------------- finishing


def apply_modifiers(objs: Iterable[bpy.types.Object]):
    """Apply modifiers and bake transforms into the meshes (world-space vertices)."""
    objs = [o for o in objs if o.type == "MESH"]
    if not objs:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if any(o.modifiers for o in objs):
        bpy.ops.object.convert(target="MESH")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def box_uv(objs: Iterable[bpy.types.Object], layer="UVMap"):
    """World-space box projection in metres for tiling textures (UV0)."""
    for ob in objs:
        if ob.get("uv_fixed"):
            continue
        me = ob.data
        mw = ob.matrix_world
        rot = mw.to_3x3()
        uvl = me.uv_layers.get(layer) or me.uv_layers.new(name=layer)
        verts = me.vertices
        for p in me.polygons:
            n = rot @ p.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            for li in p.loop_indices:
                co = mw @ verts[me.loops[li].vertex_index].co
                # blender (X, Y, Z) = three (x, -z, y)
                if ax == 2:  # horizontal face: planks run along three x
                    u, v = co.x, -co.y
                elif ax == 0:  # faces east/west: along three z
                    u, v = -co.y, co.z
                else:  # faces north/south: along three x
                    u, v = co.x, co.z
                uvl.data[li].uv = (u, v)


def join(objs: list[bpy.types.Object], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob
