"""
World, sun, night lighting, the garden outside the windows, cameras and render
settings.

Nishita sky convention (measured): the direction towards the sun, in Blender axes, is
(cos(el) sin(rot), cos(el) cos(rot), sin(el)); rot = 0 is +Y (three -z, north).
"""
from __future__ import annotations

import math

import bpy
from mathutils import Vector

import furniture as F
from bl import B, LIGHTS, PI, Kit, Placer, collection, rand

# Sun per facade and preset: (rotation deg, elevation deg, sun strength, sky strength)
# South-facing rooms get morning sun from the south-east and a low south-west sunset;
# north-facing rooms get soft sky light by day and a grazing north-west sunset.
SUN = {
    ("S", "day"): (148, 40, 4.2, 1.0),
    ("S", "sunset"): (232, 7, 3.0, 0.7),
    ("N", "day"): (32, 42, 4.2, 1.0),
    ("N", "sunset"): (318, 7, 3.0, 0.7),
}
WARM = {"day": (1.0, 0.96, 0.9), "sunset": (1.0, 0.62, 0.36)}


def sun_dir(rot_deg: float, el_deg: float) -> Vector:
    r, e = math.radians(rot_deg), math.radians(el_deg)
    return Vector((math.cos(e) * math.sin(r), math.cos(e) * math.cos(r), math.sin(e)))


def render_settings(samples=128, w=1600, h=1000, denoise=True, exposure=2.0):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = denoise
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 8
    sc.cycles.diffuse_bounces = 5
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 6
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.sample_clamp_indirect = 8.0
    sc.cycles.blur_glossy = 1.0
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Base Contrast"
    # expose for the interior, as an interior photographer would
    sc.view_settings.exposure = exposure
    sc.render.threads_mode = "AUTO"


def world(preset: str, facade: str):
    sc = bpy.context.scene
    w = bpy.data.worlds.get("sky") or bpy.data.worlds.new("sky")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        if n.type not in ("OUTPUT_WORLD", "BACKGROUND"):
            nt.nodes.remove(n)
    bg = nt.nodes["Background"]
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_disc = False
    sky.air_density = 1.0
    sky.dust_density = 1.4
    sky.ozone_density = 1.0
    if preset == "night":
        sky.sun_elevation = math.radians(-6)
        sky.sun_rotation = math.radians(250)
        nt.links.new(sky.outputs[0], bg.inputs[0])
        bg.inputs[1].default_value = 0.0
        # deep blue night ambience (the Nishita sky is black below the horizon)
        bg.inputs[0].default_value = (0.006, 0.009, 0.02, 1)
        for l in list(nt.links):
            if l.to_node == bg and l.to_socket == bg.inputs[0]:
                nt.links.remove(l)
        bg.inputs[1].default_value = 1.0
    else:
        rot, el, _, sky_k = SUN[(facade, preset)]
        sky.sun_elevation = math.radians(max(el, 1.5))
        sky.sun_rotation = math.radians(rot)
        nt.links.new(sky.outputs[0], bg.inputs[0])
        bg.inputs[1].default_value = 0.22 * sky_k
    return sky


def sun(preset: str, facade: str):
    for ob in [o for o in bpy.data.objects if o.name.startswith("SUN")]:
        bpy.data.objects.remove(ob)
    if preset == "night":
        # cool moonlight
        d = sun_dir(300 if facade == "N" else 200, 30)
        lamp = bpy.data.lights.new("SUN_moon", "SUN")
        lamp.energy = 0.06
        lamp.color = (0.62, 0.72, 1.0)
        lamp.angle = math.radians(1.0)
    else:
        rot, el, strength, _ = SUN[(facade, preset)]
        d = sun_dir(rot, el)
        lamp = bpy.data.lights.new("SUN_key", "SUN")
        lamp.energy = strength
        lamp.color = WARM[preset]
        lamp.angle = math.radians(1.2 if preset == "day" else 2.0)
    ob = bpy.data.objects.new(lamp.name, lamp)
    bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return ob


def portals(room_coll: bpy.types.Collection, windows, facade_z: float):
    """Area-light portals in each window opening guide sky sampling indoors."""
    for ob in [o for o in bpy.data.objects if o.name.startswith("PORTAL")]:
        bpy.data.objects.remove(ob)
    for w in windows:
        lamp = bpy.data.lights.new(f"PORTAL_{w['id']}", "AREA")
        lamp.shape = "RECTANGLE"
        lamp.size = w["width"]
        lamp.size_y = w["head"] - w["sill"]
        lamp.cycles.is_portal = True
        ob = bpy.data.objects.new(lamp.name, lamp)
        bpy.context.scene.collection.objects.link(ob)
        z_out = facade_z  # outer face of the facade
        ob.location = B(w["x"], (w["sill"] + w["head"]) / 2, z_out)
        inward = Vector((0, 1, 0)) if w["facade"] == "S" else Vector((0, -1, 0))  # blender Y of room side
        # area lights emit along -Z local; point it into the room
        ob.rotation_euler = (-inward).to_track_quat("Z", "Y").to_euler()


def night_lights(coll_name: str, on=True):
    for ob in [o for o in bpy.data.objects if o.name.startswith("LAMP")]:
        bpy.data.objects.remove(ob)
    if not on:
        return
    for i, L in enumerate(l for l in LIGHTS if l["coll"] == coll_name):
        lamp = bpy.data.lights.new(f"LAMP_{i}", L["kind"])
        lamp.energy = L["power"]
        lamp.color = L["color"]
        lamp.shadow_soft_size = L["radius"]
        if L["kind"] == "SPOT":
            lamp.spot_size = L["spot"]
            lamp.spot_blend = 0.6
        ob = bpy.data.objects.new(lamp.name, lamp)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = L["pos"]
        if L["kind"] == "SPOT":
            ob.rotation_euler = (0, 0, 0)  # spots point down (-Z) by default


def set_emission(night: bool):
    for name, strength in (("bulb", 6.0), ("fire", 4.0), ("screen", 1.2)):
        m = bpy.data.materials.get(name)
        if m and m.node_tree:
            b = m.node_tree.nodes.get("Principled BSDF")
            if b:
                b.inputs["Emission Strength"].default_value = strength if night else (0.8 if name == "screen" else 0.0)


# ---------------------------------------------------------------- exterior


def exterior():
    """The garden around the villa: terraces, pool, clipped hedges, olive trees, Italian
    cypresses and umbrella pines, with low hills on the horizon. It gives the rooms
    their bounce light and is what you see through the windows."""
    coll = collection("exterior")
    k = Kit(coll, "exterior")
    P = Placer(k, 0, 0)
    P.box("grass", (0, -0.62, 0), (300, 0.1, 300))
    # south terrace + pool, north terrace + gravel walk
    P.box("terrace", (0, -0.33, 10.9), (33.6, 0.5, 7.5))
    P.box("pool_tile", (-4.5, -0.55, 10.75), (16, 0.06, 3.7))
    P.box("pool_water", (-4.5, -0.17, 10.75), (16, 0.02, 3.7))
    P.box("terrace", (0, -0.33, -8.6), (33.6, 0.5, 2.6))
    P.box("gravel", (0, -0.565, -11.4), (44, 0.04, 3.0))
    # clipped hedges along the terraces and the garden edge
    for x0, x1, z, h, d in ((-16.5, 16.5, -13.6, 1.2, 0.9), (-17.6, -16.8, 11.0, 0.95, 7.2), (16.8, 17.6, 11.0, 0.95, 7.2),
                            (-24, 24, 18.5, 1.5, 1.1), (-30, 30, -22, 1.6, 1.1)):
        hedge(k, x0, x1, z, h, d)
    r = rand(101)
    olives = [(-20.5, 10.5), (20.4, 11.8), (-22.5, -4.0), (22.0, -6.0), (-9.0, -17.0), (9.5, -17.5), (-19.0, -15.5),
              (3.0, 22.5), (-12.0, 23.0), (14.0, 22.0)]
    for i, (x, z) in enumerate(olives):
        olive_tree(Placer(k, x, z, r() * 6.28, -0.58), 1.0 + 0.25 * r(), 200 + i)
    for i, (x, z) in enumerate(((18.2, -2.8), (18.2, 2.8), (-18.2, -2.8), (-18.2, 2.8), (-17.5, -10.5), (17.5, -10.5),
                                (-26, 20), (26, 21), (-6, 26), (7, -27), (-24, -25), (25, -24))):
        cypress(Placer(k, x, z, 0, -0.58), 6.5 + 2.5 * r(), 300 + i)
    # umbrella pines and a belt of cypresses further out
    for i in range(26):
        a = i / 26 * 2 * PI + 0.2 * r()
        R = 38 + 14 * r()
        if i % 3 == 0:
            pine(Placer(k, math.cos(a) * R, math.sin(a) * R, r() * 6.28, -0.58), 1.0 + 0.4 * r(), 400 + i)
        else:
            cypress(Placer(k, math.cos(a) * R, math.sin(a) * R, 0, -0.58), 8 + 4 * r(), 500 + i, mat="cypress_far")
    hills(k)
    return coll


H_ROOF = 3.9


def _noise_displace(bm, scale: float, amount: float, seed: int, along_normal=True):
    from mathutils import noise
    off = Vector((seed * 1.37, seed * 2.11, seed * 0.73))
    bm.normal_update()
    for v in bm.verts:
        n = noise.fractal(v.co * scale + off, 0.6, 2.2, 4)
        v.co += (v.normal if along_normal else Vector((0, 0, 1))) * n * amount


def hedge(k: Kit, x0, x1, z, h, d):
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((x1 - x0, d, h)), verts=bm.verts)
    cuts = max(4, int(max(x1 - x0, d) / 0.12))
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=min(cuts, 160), use_grid_fill=True)
    # soften the clipped box a little, then rough up the leaf surface
    for v in bm.verts:
        v.co.z = max(v.co.z, -h / 2)
    _noise_displace(bm, 5.0, 0.05, int(x0 * 7 + z))
    Placer(k, (x0 + x1) / 2, z, 0, -0.58 + h / 2).mesh("hedge", bm, smooth=True, angle=180)


def cypress(p: Placer, h: float, seed: int, mat="cypress"):
    """Italian cypress: a slim flame of dense foliage, widest a third of the way up."""
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=18, radius=1.0)
    rr = 0.55 + 0.1 * rand(seed)()
    for v in bm.verts:
        t = (v.co.z + 1) / 2  # 0 bottom .. 1 top
        radial = math.hypot(v.co.x, v.co.y)
        prof = math.sin(math.pi * min(1.0, t * 1.05) ** 0.75) * (1.0 - 0.55 * t)
        k = rr * max(prof, 0.02) / radial if radial > 1e-6 else 0.0
        v.co.x *= k
        v.co.y *= k
        v.co.z = t * h
    _noise_displace(bm, 2.2, 0.16, seed)
    p.cyl("bark", (0, 0.25, 0), 0.07, 0.1, 0.5, 8)
    p.mesh(mat, bm, pos=(0, 0.3, 0), smooth=True, angle=180)


def pine(p: Placer, s: float, seed: int):
    """Umbrella (stone) pine: tall bare trunk, a flat wide canopy."""
    import bmesh
    r = rand(seed)
    p.tube("bark", [(0, 0, 0), (0.3 * s, 3.5 * s, 0.1 * s), (0.1 * s, 7.0 * s, -0.2 * s)], 0.22 * s, seg=8)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    for v in bm.verts:
        v.co.x *= 4.2 * s
        v.co.y *= 4.2 * s
        v.co.z *= 1.3 * s if v.co.z > 0 else 0.5 * s
    _noise_displace(bm, 0.6, 0.9 * s, seed)
    p.mesh("cypress_far", bm, pos=(0.1 * s, 7.6 * s + 0.5 * r(), -0.2 * s), smooth=True, angle=180)


def olive_tree(p: Placer, s: float, seed: int):
    """Olive: gnarled trunk splitting into limbs, an airy silver-green canopy of small clumps."""
    r = rand(seed)
    p.tube("bark", [(0, 0, 0), (0.12 * s, 0.7 * s, 0.05 * s), (0.02 * s, 1.3 * s, -0.04 * s)], 0.16 * s, seg=10)
    limbs = []
    for i in range(4):
        a = i / 4 * 2 * PI + r()
        tip = (math.cos(a) * 1.1 * s, (2.2 + 0.6 * r()) * s, math.sin(a) * 1.1 * s)
        p.tube("bark", [(0.02 * s, 1.2 * s, -0.04 * s), (tip[0] * 0.5, tip[1] * 0.75, tip[2] * 0.5), tip], 0.07 * s, seg=7)
        limbs.append(tip)
    for tip in limbs:
        for j in range(60):
            dx, dy, dz = (r() - 0.5) * 1.6 * s, (r() - 0.35) * 0.9 * s, (r() - 0.5) * 1.6 * s
            p.ico("tree_leaf", (tip[0] + dx, tip[1] + dy, tip[2] + dz), (0.14 + 0.1 * r()) * s, seed=seed * 1000 + j,
                  rough=0.35)


def hills(k: Kit):
    """A ring of low wooded hills on the horizon."""
    import bmesh
    bm = bmesh.new()
    rings, segs = 6, 160
    rows = []
    for i in range(rings + 1):
        R = 160 + i * 45
        row = []
        for j in range(segs):
            a = j / segs * 2 * PI
            h = (8 + i * 9) * (0.5 + 0.5 * math.sin(a * 3 + i) * math.sin(a * 7 + 1.3)) + 6 * math.sin(a * 13)
            h = max(0.0, h) if i > 0 else 0.0
            row.append(bm.verts.new((math.cos(a) * R, math.sin(a) * R, h - 0.6)))
        rows.append(row)
    for i in range(rings):
        for j in range(segs):
            a, b = rows[i], rows[i + 1]
            bm.faces.new((a[j], a[(j + 1) % segs], b[(j + 1) % segs], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    Placer(k, 0, 0).mesh("hills", bm, smooth=True, angle=180)


# ---------------------------------------------------------------- cameras


def camera(pos, target, fov_deg=None, lens=None, shift_y=0.0, name="CAM"):
    cam = bpy.data.objects.get(name)
    if cam is None:
        cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
        bpy.context.scene.collection.objects.link(cam)
    p = B(*pos)
    t = B(*target)
    cam.location = p
    d = t - p
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if lens:
        cam.data.lens = lens
    if fov_deg:
        cam.data.sensor_fit = "VERTICAL"
        cam.data.angle = math.radians(fov_deg)
    cam.data.shift_y = shift_y
    cam.data.clip_start = 0.05
    bpy.context.scene.camera = cam
    return cam
