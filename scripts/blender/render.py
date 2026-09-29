"""
Photographs for the website: path-traced Cycles renders of the villa's rooms.

  npx tsx scripts/export-shots.ts                 # cameras + the site's curtain & pillow geometry
  npx tsx scripts/build-textures.ts fabric-png    # the curtain fabrics as PNGs
  python3 scripts/blender/render.py [id ...] [--samples 128] [--scale 1]

Each shot opens the room prepared by the bake (scripts/.cache/bake/<room>/room.blend),
hangs the curtains and dresses the bed exactly as the website does, lights it with the
bake's presets and renders it in its own process (Cycles on this CPU occasionally
segfaults; a crash then costs one attempt, not the batch). Results go to
public/renders/<id>.webp, and the hero also to public/renders/og.jpg.
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402  (first: it provides bmesh and mathutils)
import bmesh  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import bl  # noqa: E402
import main  # noqa: E402
import scene  # noqa: E402
from bl import B  # noqa: E402

SHOTS = os.path.join(bl.ROOT, "scripts", ".cache", "shots")
FABRIC = os.path.join(bl.ROOT, "scripts", ".cache", "fabric")
TMP = os.path.join(bl.ROOT, "scripts", ".cache", "renders")
OUT = os.path.join(bl.ROOT, "public", "renders")

# mirrors src/components/villa/scene/fabrics.ts
TILE = {"velvet": 0.22, "blackout": 0.14, "linen": 0.2, "sheer": 0.16, "embroidered": 0.5}
ROUGH = {"velvet": 0.88, "blackout": 0.8, "linen": 0.93, "sheer": 0.9, "embroidered": 0.62}
NORMAL = {"velvet": 0.55, "blackout": 0.45, "linen": 0.95, "sheer": 0.6, "embroidered": 0.9}
SHEEN = {"velvet": (1.0, 0.32), "linen": (0.25, 0.6), "sheer": (0.25, 0.6), "embroidered": (0.35, 0.4)}
COLOUR_LIFT = 1.1


def _turned(name: str) -> str:
    """The texture turned a quarter so its streaks run down the drop (velvet's crushed pile).
    A normal map's vectors turn with it: (x, y) -> (-y, x)."""
    out = name.replace(".png", "-turned.png")
    path = os.path.join(FABRIC, out)
    if not os.path.exists(path):
        from PIL import Image

        im = Image.open(os.path.join(FABRIC, name)).rotate(90)
        if "normal" in name:
            r, g, b, *a = im.split()
            im = Image.merge("RGB", (g.point(lambda v: 255 - v), r, b))
        im.save(path)
    return out


def _img(name: str, colorspace: str, turned=False):
    if turned:
        name = _turned(name)
    img = bpy.data.images.load(os.path.join(FABRIC, name), check_existing=True)
    img.colorspace_settings.name = colorspace
    img.alpha_mode = "CHANNEL_PACKED"
    return img


def _lerp(a, b, t):
    return [x + (y - x) * t for x, y in zip(a, b)]


def fabric_material(c: dict) -> bpy.types.Material:
    """The curtain's face cloth, its lining on the back, and light through both."""
    kind = c["kind"]
    m = bpy.data.materials.new(f"curtain_{c['window']}")
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N["Principled BSDF"]
    out = N["Material Output"]
    coord = N.new("ShaderNodeTexCoord")
    mapping = N.new("ShaderNodeMapping")
    s = 1 / TILE[kind]
    mapping.inputs["Scale"].default_value = (s, s, s)
    L.new(coord.outputs["UV"], mapping.inputs["Vector"])

    detail = N.new("ShaderNodeTexImage")
    turned = kind == "velvet"
    detail.image = _img(f"{kind}-detail.png", "sRGB", turned)
    L.new(mapping.outputs["Vector"], detail.inputs["Vector"])
    colour = [min(1.0, x * COLOUR_LIFT) for x in bl._hex_lin(c["colour"])]
    base = N.new("ShaderNodeMix")
    base.data_type = "RGBA"
    base.blend_type = "MULTIPLY"
    base.inputs["Factor"].default_value = 1.0
    tone = detail.outputs["Color"]
    if kind == "velvet":
        # the sheen carries velvet's light and dark; halve the printed variation
        soft = N.new("ShaderNodeMix")
        soft.data_type = "RGBA"
        soft.inputs["Factor"].default_value = 0.5
        L.new(tone, soft.inputs["A"])
        soft.inputs["B"].default_value = (0.72, 0.72, 0.72, 1)
        tone = soft.outputs["Result"]
    L.new(tone, base.inputs["A"])
    base.inputs["B"].default_value = (*colour, 1)
    face_col = base.outputs["Result"]

    nrm = N.new("ShaderNodeTexImage")
    nrm.image = _img(f"{kind}-normal.png", "Non-Color", turned)
    L.new(mapping.outputs["Vector"], nrm.inputs["Vector"])
    nmap = N.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = NORMAL[kind]
    L.new(nrm.outputs["Color"], nmap.inputs["Color"])
    L.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = ROUGH[kind]

    if kind == "embroidered":
        # gilt thread where the embroidery mask is set: metallic, smoother, satin-shaded
        mask = N.new("ShaderNodeTexImage")
        mask.image = _img("embroidered-mask.png", "Non-Color")
        L.new(mapping.outputs["Vector"], mask.inputs["Vector"])
        sep = N.new("ShaderNodeSeparateColor")
        L.new(mask.outputs["Color"], sep.inputs["Color"])
        emb = N.new("ShaderNodeMapRange")
        emb.inputs["From Min"].default_value = 0.3
        emb.inputs["From Max"].default_value = 0.7
        emb.interpolation_type = "SMOOTHSTEP"
        L.new(sep.outputs["Red"], emb.inputs["Value"])
        shade = N.new("ShaderNodeMath")
        shade.operation = "MULTIPLY_ADD"
        shade.inputs[1].default_value = 0.4
        shade.inputs[2].default_value = 0.7
        L.new(sep.outputs["Green"], shade.inputs[0])
        thread = N.new("ShaderNodeMix")
        thread.data_type = "RGBA"
        thread.blend_type = "MULTIPLY"
        thread.inputs["Factor"].default_value = 1.0
        thread.inputs["A"].default_value = (*bl._hex_lin(c.get("thread") or "#c9a24b"), 1)
        L.new(shade.outputs[0], thread.inputs["B"])
        mixc = N.new("ShaderNodeMix")
        mixc.data_type = "RGBA"
        L.new(emb.outputs["Result"], mixc.inputs["Factor"])
        L.new(face_col, mixc.inputs["A"])
        L.new(thread.outputs["Result"], mixc.inputs["B"])
        face_col = mixc.outputs["Result"]
        for sock, a, b in (("Roughness", ROUGH[kind], 0.34), ("Metallic", 0.0, 0.8)):
            mr = N.new("ShaderNodeMapRange")
            mr.inputs["To Min"].default_value = a
            mr.inputs["To Max"].default_value = b
            L.new(emb.outputs["Result"], mr.inputs["Value"])
            L.new(mr.outputs["Result"], bsdf.inputs[sock])

    L.new(face_col, bsdf.inputs["Base Color"])
    if kind in SHEEN:
        w, r = SHEEN[kind]
        bsdf.inputs["Sheen Weight"].default_value = w
        bsdf.inputs["Sheen Roughness"].default_value = r
        bsdf.inputs["Sheen Tint"].default_value = (*_lerp(colour, [1, 1, 1], 0.5), 1)

    # light through the cloth: thin diffuse transmission, tinted by the fabric
    t = c["transmission"]
    trans = N.new("ShaderNodeBsdfTranslucent")
    L.new(face_col, trans.inputs["Color"])
    L.new(nmap.outputs["Normal"], trans.inputs["Normal"])
    face = N.new("ShaderNodeMixShader")
    face.inputs["Fac"].default_value = min(0.55, 0.12 + t * 0.6) if t > 0.01 else 0.0
    L.new(bsdf.outputs["BSDF"], face.inputs[1])
    L.new(trans.outputs["BSDF"], face.inputs[2])
    shader = face.outputs["Shader"]

    if c["lining"] != "unlined" and kind != "sheer":
        # the room sees the face; the window side is the lining
        lin = N.new("ShaderNodeBsdfPrincipled")
        lin.inputs["Base Color"].default_value = (*bl._hex_lin(c["liningHex"]), 1)
        lin.inputs["Roughness"].default_value = 0.85
        geo = N.new("ShaderNodeNewGeometry")
        back = N.new("ShaderNodeMixShader")
        L.new(geo.outputs["Backfacing"], back.inputs["Fac"])
        L.new(shader, back.inputs[1])
        L.new(lin.outputs["BSDF"], back.inputs[2])
        shader = back.outputs["Shader"]

    if kind == "sheer":
        # an open weave: part of the light passes straight through
        alpha = N.new("ShaderNodeMath")
        alpha.operation = "MULTIPLY"
        alpha.inputs[1].default_value = 0.92
        L.new(detail.outputs["Alpha"], alpha.inputs[0])
        clear = N.new("ShaderNodeBsdfTransparent")
        mixa = N.new("ShaderNodeMixShader")
        L.new(alpha.outputs[0], mixa.inputs["Fac"])
        L.new(clear.outputs["BSDF"], mixa.inputs[1])
        L.new(shader, mixa.inputs[2])
        shader = mixa.outputs["Shader"]
    L.new(shader, out.inputs["Surface"])
    return m


def mesh_object(name: str, positions, indices, uvs, mat, coll, smooth=True):
    """A mesh from flat three-frame arrays (the website's BufferGeometry)."""
    verts = [B(positions[i], positions[i + 1], positions[i + 2]) for i in range(0, len(positions), 3)]
    tris = [tuple(indices[i : i + 3]) for i in range(0, len(indices), 3)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], tris)
    me.validate(clean_customdata=False)
    uvl = me.uv_layers.new(name="UVMap")
    loops = [0] * (len(me.loops) * 2)
    for li, loop in enumerate(me.loops):
        v = loop.vertex_index
        loops[li * 2] = uvs[v * 2]
        loops[li * 2 + 1] = uvs[v * 2 + 1]
    uvl.data.foreach_set("uv", loops)
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def _cyl(coll, mat, a: Vector, b: Vector, r: float, seg=24):
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
    me = bpy.data.meshes.new("rod")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new("rod", me)
    ob.matrix_world = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    coll.objects.link(ob)
    return ob


def _sphere(coll, mat, p: Vector, r: float, sy=1.0):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=r)
    bmesh.ops.scale(bm, vec=Vector((1, 1, sy)), verts=bm.verts)
    me = bpy.data.meshes.new("finial")
    bm.to_mesh(me)
    bm.free()
    for f in me.polygons:
        f.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new("finial", me)
    ob.location = p
    coll.objects.link(ob)


def _ring(coll, mat, p: Vector, axis: Vector, R=0.024, r=0.0045):
    bm = bmesh.new()
    segs, sides = 20, 8
    ring = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        row = []
        for j in range(sides):
            b = 2 * math.pi * j / sides
            rr = R + r * math.cos(b)
            row.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r * math.sin(b))))
        ring.append(row)
    for i in range(segs):
        for j in range(sides):
            bm.faces.new((ring[i][j], ring[(i + 1) % segs][j], ring[(i + 1) % segs][(j + 1) % sides], ring[i][(j + 1) % sides]))
    me = bpy.data.meshes.new("ring")
    bm.to_mesh(me)
    bm.free()
    for f in me.polygons:
        f.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new("ring", me)
    ob.matrix_world = Matrix.Translation(p) @ axis.to_track_quat("Z", "Y").to_matrix().to_4x4()
    coll.objects.link(ob)


def hang(c: dict, coll):
    """One window's curtains: both panels, the pole (or ceiling track), rings and brackets."""
    face = fabric_material(c)
    for i, p in enumerate(c["panels"]):
        mesh_object(f"curtain_{c['window']}_{i}", p["positions"], p["indices"], p["uvs"], face, coll)
    brass = bl.material("brass")
    if c["rod"]:
        a, b = B(*c["rod"]["a"]), B(*c["rod"]["b"])
        _cyl(coll, brass, a, b, 0.014)
        axis = (b - a).normalized()
        for end, sgn in ((a, -1), (b, 1)):
            _sphere(coll, brass, end + axis * sgn * 0.03, 0.03, 1.0)
        for p in c["panels"]:
            for r in p["rings"]:
                _ring(coll, brass, B(*r), axis)
    elif c["track"]:
        a, b = B(*c["track"]["a"]), B(*c["track"]["b"])
        _cyl(coll, bl.material("black_metal"), a + Vector((0, 0, 0.02)), b + Vector((0, 0, 0.02)), 0.009, 12)
    for w, r in c.get("brackets", []):
        if c["rod"]:
            _cyl(coll, brass, B(*w), B(*r), 0.008, 12)
            _cyl(coll, brass, B(*w), B(*w) + (B(*r) - B(*w)).normalized() * 0.012, 0.03)


def dress_bed(pillows: list[dict], coll):
    for i, p in enumerate(pillows):
        name = f"pillow_{p['coverHex']}"
        if name not in bl._mat_defs:
            bl.register_materials({name: {"tex": "percale", "color": p["coverHex"], "rough": 0.9, "tile": 0.25,
                                          "normal": 0.6, "roughMean": bl._mat_defs["percale_white"].get("roughMean", 0.85)}})
        mesh_object(f"pillow_{i}", p["positions"], p["indices"], p["uvs"], bl.material(name), coll)


def level_camera(pos, target, fov):
    """Verticals stay vertical, as with a shift lens: level the camera and shift the frame."""
    dx, dy, dz = (t - p for t, p in zip(target, pos))
    flat = math.hypot(dx, dz)
    pitch = math.atan2(dy, flat)
    if abs(pitch) > math.radians(22):
        return scene.camera(pos, target, fov_deg=fov)
    shift = math.tan(pitch) / (2 * math.tan(math.radians(fov) / 2))  # VERTICAL fit: units of the image height
    return scene.camera(pos, [target[0], pos[1], target[2]], fov_deg=fov, shift_y=shift)


def render_one(sid: str, samples: int, scale: float):
    with open(os.path.join(SHOTS, f"{sid}.json")) as f:
        s = json.load(f)
    rid = s["room"]
    coll, _ = main.open_prepared(rid)
    dress = bl.collection("dressing")
    for c in s["curtains"]:
        hang(c, dress)
    dress_bed(s["pillows"], dress)
    main.light(rid, coll, s["preset"])
    w, h = (round(v * scale) for v in s["size"])
    scene.render_settings(s.get("samples") or samples, w, h, denoise=True, exposure=2.0)
    sc = bpy.context.scene
    sc.cycles.adaptive_threshold = 0.012
    sc.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    sc.cycles.denoising_prefilter = "ACCURATE"
    sc.render.film_transparent = False
    level_camera(s["position"], s["target"], s["fov"])
    os.makedirs(TMP, exist_ok=True)
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    sc.render.filepath = os.path.join(TMP, f"{sid}.png")
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[render] {sid} {w}x{h} in {time.time() - t:.0f}s", flush=True)


def publish(sid: str):
    from PIL import Image, ImageEnhance

    src = os.path.join(TMP, f"{sid}.png")
    im = Image.open(src).convert("RGB")
    # a photographer's finishing touch: a little clarity, nothing more
    im = ImageEnhance.Contrast(im).enhance(1.03)
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, f"{sid}.webp"), "WEBP", quality=84, method=6)
    if sid == "hero":
        w, h = im.size
        ch = round(w * 630 / 1200)
        og = im.crop((0, (h - ch) // 2, w, (h - ch) // 2 + ch)).resize((1200, 630), Image.LANCZOS)
        og.save(os.path.join(OUT, "og.jpg"), "JPEG", quality=86, optimize=True, progressive=True)
    print(f"[render] published {sid}", flush=True)


def main_cli():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--one", default=None, help=argparse.SUPPRESS)
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--scale", type=float, default=1.0)
    a = ap.parse_args()
    if a.one:
        render_one(a.one, a.samples, a.scale)
        return
    ids = a.ids or sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(SHOTS, "*.json")))
    for sid in ids:
        for attempt in range(1, 5):
            r = subprocess.run([sys.executable, "-X", "faulthandler", __file__, "--one", sid, "--samples",
                                str(a.samples), "--scale", str(a.scale)],
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for ln in r.stdout.splitlines():
                if ln.startswith("[render]"):
                    print(ln, flush=True)
            if r.returncode == 0:
                publish(sid)
                break
            print(f"[render] {sid} failed (exit {r.returncode}), attempt {attempt}/4", flush=True)
            if attempt == 4:
                print("\n".join(r.stdout.splitlines()[-20:]), flush=True)


if __name__ == "__main__":
    main_cli()
