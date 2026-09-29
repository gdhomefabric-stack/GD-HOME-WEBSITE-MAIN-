"""
Light baking and export for one room.

Per room:
  static  joined architecture + furniture with a lightmap UV (TEXCOORD_1)
  props   joined small decor, lit per vertex (COLOR_0..2 = day, sunset, night)
  glass   window panes, bath water, glassware (drawn transparent at runtime)

Per daylight preset two lightmaps are baked: `amb` (sky + all indirect light) and
`sun` (direct sun only) so the runtime can let the curtains cut the sun patch as they
close. Night bakes lamps + moonlight into `amb`. Lightmaps hold diffuse irradiance / pi
(Cycles' diffuse pass without colour) and are written gamma-encoded with a scale.

Also rendered: an HDR light probe from the room centre per preset (reflections and
lighting for curtains/pillows) and the garden panorama seen through the windows.
"""
from __future__ import annotations

import json
import math
import os
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from PIL import Image

import bl
import scene

OUT_PUBLIC = os.path.join(bl.ROOT, "public", "rooms")
CACHE = os.path.join(bl.ROOT, "scripts", ".cache", "bake")


def log(*a):
    print("[bake]", *a, flush=True)


# ---------------------------------------------------------------- geometry


def prepare(coll: bpy.types.Collection):
    groups: dict[str, list] = {"static": [], "prop": [], "glass": []}
    for ob in coll.all_objects:
        if ob.type != "MESH":
            continue
        tag = ob.get("tag", "static")
        groups.get(tag, groups["static"]).append(ob)
    out = {}
    for tag, objs in groups.items():
        if objs:
            out[tag] = bl.join(objs, f"{coll.name}_{tag}")
    return out


def cull_outside(ob: bpy.types.Object, box, height: float, reach=0.195):
    """Delete faces that can only be seen from outside the room (outer wall faces, the
    top of the ceiling slab, the underside of the floor) so they take no lightmap space.
    box: inner (x0, z0, x1, z1) in three axes; vertices are world-space Blender axes."""
    x0, z0, x1, z1 = box
    me = ob.data
    n = len(me.polygons)
    centres = np.zeros(n * 3, dtype=np.float64)
    me.polygons.foreach_get("center", centres)
    c = centres.reshape(n, 3)
    x, z, y = c[:, 0], -c[:, 1], c[:, 2]
    out = np.maximum.reduce([x0 - x, x - x1, z0 - z, z - z1])
    dead = (out > reach) | (y < -0.03) | (y > height + 0.03)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="FACE")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    me.polygons.foreach_set("select", dead)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.mode_set(mode="OBJECT")
    log(f"  culled {int(dead.sum())} outside faces")


def lightmap_uv(ob: bpy.types.Object, margin=0.0035):
    me = ob.data
    base = me.uv_layers.get("UVMap") or me.uv_layers[0]
    base.active_render = True
    lm = me.uv_layers.get("LM") or me.uv_layers.new(name="LM")
    me.uv_layers.active = lm
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=margin, area_weight=0.0,
                             correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")
    # leaving edit mode reallocates the layers: never touch the old Python references
    # (writing through them corrupts memory and later crashes Cycles)
    me = ob.data
    me.uv_layers["UVMap"].active_render = True
    me.uv_layers.active = me.uv_layers["LM"]


# ---------------------------------------------------------------- baking


def _bake_target(ob: bpy.types.Object, img: bpy.types.Image):
    for slot in ob.material_slots:
        m = slot.material
        nt = m.node_tree
        node = nt.nodes.get("BAKE")
        if node is None:
            node = nt.nodes.new("ShaderNodeTexImage")
            node.name = "BAKE"
        node.image = img
        for n in nt.nodes:
            n.select = False
        node.select = True
        nt.nodes.active = node


def _clear_targets(ob):
    for slot in ob.material_slots:
        nt = slot.material.node_tree
        node = nt.nodes.get("BAKE")
        if node:
            nt.nodes.remove(node)


def bake_lightmap(ob: bpy.types.Object, size: int, passes: set[str], samples: int) -> np.ndarray:
    img = bpy.data.images.new("lm", size, size, float_buffer=True, alpha=False)
    img.colorspace_settings.name = "Linear Rec.709"
    _bake_target(ob, img)
    sc = bpy.context.scene
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.cycles.use_adaptive_sampling = False
    sc.render.bake.use_selected_to_active = False
    sc.render.bake.margin = 12
    sc.render.bake.margin_type = "ADJACENT_FACES"
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter=passes, use_clear=True, target="IMAGE_TEXTURES", margin=12)
    log(f"  lightmap {sorted(passes)} {size}px {samples}spp in {time.time() - t:.0f}s")
    arr = np.array(img.pixels[:], dtype=np.float32).reshape(size, size, 4)[::-1, :, :3].copy()
    bpy.data.images.remove(img)
    return arr


def bake_vcol(ob: bpy.types.Object, attr: str, passes: set[str], samples: int) -> np.ndarray:
    me = ob.data
    ca = me.color_attributes.get(attr) or me.color_attributes.new(attr, "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = ca
    sc = bpy.context.scene
    sc.cycles.samples = samples
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE", pass_filter=passes, use_clear=True, target="VERTEX_COLORS")
    log(f"  props {attr} {samples}spp in {time.time() - t:.0f}s")
    n = len(me.loops)
    buf = np.zeros(n * 4, dtype=np.float32)
    ca.data.foreach_get("color", buf)
    return buf.reshape(n, 4)[:, :3]


def denoise(arr: np.ndarray, iters=1) -> np.ndarray:
    """OpenImageDenoise via Blender's compositor on a float image."""
    h, w, _ = arr.shape
    img = bpy.data.images.new("dn_in", w, h, float_buffer=True, alpha=False)
    img.colorspace_settings.name = "Linear Rec.709"
    rgba = np.concatenate([arr[::-1], np.ones((h, w, 1), np.float32)], -1)
    img.pixels.foreach_set(rgba.ravel())
    main = bpy.context.scene
    sc = bpy.data.scenes.get("denoise") or bpy.data.scenes.new("denoise")
    sc.render.engine = "CYCLES"
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.exposure = 0
    sc.use_nodes = True
    sc.render.use_compositing = True
    sc.render.use_sequencer = False
    nt = sc.node_tree
    nt.nodes.clear()
    src = nt.nodes.new("CompositorNodeImage")
    src.image = img
    dn = nt.nodes.new("CompositorNodeDenoise")
    dn.use_hdr = True
    dn.prefilter = "ACCURATE"
    comp = nt.nodes.new("CompositorNodeComposite")
    viewer = nt.nodes.new("CompositorNodeViewer")
    nt.links.new(src.outputs["Image"], dn.inputs["Image"])
    nt.links.new(dn.outputs["Image"], comp.inputs["Image"])
    nt.links.new(dn.outputs["Image"], viewer.inputs["Image"])
    path = os.path.join(CACHE, "_denoise.exr")
    sc.render.filepath = path
    sc.render.image_settings.file_format = "OPEN_EXR"
    sc.render.image_settings.color_depth = "32"
    bpy.ops.render.render(write_still=True, scene=sc.name)
    out = bpy.data.images.load(path)
    res = np.array(out.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3].copy()
    bpy.data.images.remove(out)
    bpy.data.images.remove(img)
    return res


# ---------------------------------------------------------------- probes & panoramas


def render_pano(center, w: int, h: int, samples: int, path: str, hide: list[bpy.types.Collection] = (),
                fmt="HDR", exposure=0.0, view="Standard"):
    sc = bpy.context.scene
    cam = scene.camera((center[0], center[1], center[2]), (center[0], center[1], center[2] - 1), name="PANO")
    cam.data.type = "PANO"
    cam.data.panorama_type = "EQUIRECTANGULAR"
    # three.js maps +x to the centre of an equirect image (u = atan2(z, x) / 2pi + 0.5):
    # face Blender +X at the centre so the panorama needs no rotation at runtime
    cam.rotation_euler = (math.radians(90), 0, math.radians(-90))
    sc.camera = cam
    hidden = []
    for c in hide:
        if not c.hide_render:
            c.hide_render = True
            hidden.append(c)
    old = (sc.render.resolution_x, sc.render.resolution_y, sc.cycles.samples, sc.view_settings.view_transform,
           sc.view_settings.exposure, sc.view_settings.look)
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = view
    if view == "AgX":
        sc.view_settings.look = "AgX - Base Contrast"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = fmt
    if fmt == "JPEG":
        sc.render.image_settings.quality = 88
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    log(f"  pano {os.path.basename(path)} in {time.time() - t:.0f}s")
    (sc.render.resolution_x, sc.render.resolution_y, sc.cycles.samples, sc.view_settings.view_transform,
     sc.view_settings.exposure, sc.view_settings.look) = old
    for c in hidden:
        c.hide_render = False
    bpy.data.objects.remove(cam)


# ---------------------------------------------------------------- encoding


def encode_lightmap(arr: np.ndarray, path: str, size: int, quality=90) -> float:
    """Gamma-encode (sRGB curve) with a per-map scale; returns the scale."""
    a = np.clip(arr, 0, None)
    scale = float(np.percentile(a.max(axis=2), 99.9)) or 1e-6
    scale = max(scale, 1e-6)
    v = np.clip(a / scale, 0, 1)
    enc = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
    img = Image.fromarray((enc * 255 + 0.5).astype(np.uint8), "RGB")
    if img.size[0] != size:
        img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "WEBP", quality=quality, method=6)
    return scale


def encode_sky(hdr_path: str, path: str, quality=88) -> float:
    """A linear panorama (scene radiance, as the lightmaps) as an sRGB-curve JPEG with a scale,
    so the runtime shows the view out at the same exposure as the room. Returns the scale."""
    img = bpy.data.images.load(hdr_path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    a = np.clip(px.reshape(h, w, 4)[::-1, :, :3], 0, None)  # Blender rows run bottom-up
    scale = max(float(np.percentile(a.max(axis=2), 99.5)), 1e-6)
    v = np.clip(a / scale, 0, 1)
    enc = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
    Image.fromarray((enc * 255 + 0.5).astype(np.uint8), "RGB").save(path, "JPEG", quality=quality, optimize=True)
    return scale


def encode_vcols(ob: bpy.types.Object, cols: dict[str, np.ndarray]) -> dict[str, float]:
    """Store per-preset vertex lighting as COLOR attributes normalised into 0..1."""
    me = ob.data
    scales = {}
    for name, c in cols.items():
        s = float(np.percentile(c.max(axis=1), 99.5)) or 1e-6
        v = np.clip(c / s, 0, 1)
        ca = me.color_attributes.get(name) or me.color_attributes.new(name, "FLOAT_COLOR", "CORNER")
        rgba = np.concatenate([v, np.ones((len(v), 1), np.float32)], 1).astype(np.float32)
        ca.data.foreach_set("color", rgba.ravel())
        scales[name] = s
    return scales


# ---------------------------------------------------------------- export


def export_glb(objs: list[bpy.types.Object], path: str):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="NONE",
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=True,
        export_active_vertex_color_when_no_material=True,
        export_extras=True,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
    )
