"""
Villa pipeline driver.

  python3 scripts/blender/main.py bake <room> [--samples 128] [--lm 2048] [--jobs lm,sun,vcol,env,sky,export]
  python3 scripts/blender/main.py render <room> [preset] [--samples N] [--size WxH] [--cam x,y,z:tx,ty,tz:fov]

`bake` prepares the room once (build, join, cull, lightmap UVs -> <room>.blend), then
runs every bake/render as its own process from that file and retries any that crash:
Cycles on this CPU occasionally segfaults, and a crash then costs one job, not the run.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
import numpy as np  # noqa: E402

import bake  # noqa: E402
import bl  # noqa: E402
import mats  # noqa: E402
import rooms  # noqa: E402
import scene  # noqa: E402

FACADE = {r["id"]: r["row"] for r in bl.LAYOUT["rooms"]}
PRESETS = ("day", "sunset", "night")
ROOM = {r["id"]: r for r in bl.LAYOUT["rooms"]}


def cache(rid: str, name: str) -> str:
    d = os.path.join(bake.CACHE, rid)
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, name)


def out_dir(rid: str) -> str:
    d = os.path.join(bake.OUT_PUBLIC, rid)
    os.makedirs(d, exist_ok=True)
    return d


def centre(rid: str):
    ix0, iz0, ix1, iz1 = rooms.inner(ROOM[rid])
    return ((ix0 + ix1) / 2, 1.5, (iz0 + iz1) / 2)


# ---------------------------------------------------------------- build


def build(rid: str):
    bl.reset()
    bl.LIGHTS.clear()
    bl.register_materials(mats.resolved())
    t = time.time()
    coll = rooms.build_room(rid)
    scene.exterior()
    ext = list(bpy.data.collections["exterior"].all_objects)
    objs = list(coll.all_objects) + ext
    bl.apply_modifiers(objs)
    bl.box_uv(objs)
    # one object for the whole garden keeps Cycles' scene sync small
    bl.join(ext, "exterior")
    print(f"[build] {rid}: {len(coll.all_objects)} objects in {time.time() - t:.1f}s", flush=True)
    return coll


def light(rid: str, coll, preset: str):
    facade = FACADE[rid]
    scene.world(preset, facade)
    scene.sun(preset, facade)
    wins = [w for w in bl.LAYOUT["windows"] if w["roomId"] == rid]
    scene.portals(coll, wins, 7.15 if facade == "S" else -7.15)
    scene.night_lights(coll.name, preset == "night")
    scene.set_emission(preset == "night")
    for ob in coll.all_objects:
        if ob.get("tag") == "glass" or ob.name.endswith("_glass"):
            ob.visible_shadow = False


def world_strength(k: float):
    bg = bpy.context.scene.world.node_tree.nodes["Background"]
    old = bg.inputs[1].default_value
    bg.inputs[1].default_value = k
    return old


def prepare(rid: str):
    coll = build(rid)
    parts = bake.prepare(coll)
    bake.cull_outside(parts["static"], rooms.inner(ROOM[rid]), bl.H)
    bake.lightmap_uv(parts["static"])
    # lamp positions are known only while building: keep them with the file
    bpy.context.scene["lights"] = json.dumps(
        [{**L, "pos": list(L["pos"]), "color": list(L["color"]), "dir": list(L["dir"]) if L["dir"] else None}
         for L in bl.LIGHTS])
    bpy.ops.wm.save_as_mainfile(filepath=cache(rid, "room.blend"), compress=False)
    print("[prepare] saved", cache(rid, "room.blend"), flush=True)


def open_prepared(rid: str):
    bpy.ops.wm.open_mainfile(filepath=cache(rid, "room.blend"))
    bl.register_materials(mats.resolved())
    bl.LIGHTS.clear()
    from mathutils import Vector
    for L in json.loads(bpy.context.scene.get("lights", "[]")):
        L["pos"] = Vector(L["pos"])
        L["color"] = tuple(L["color"])
        bl.LIGHTS.append(L)
    coll = bpy.data.collections[f"room_{rid}"]
    parts = {k: bpy.data.objects.get(f"room_{rid}_{k}") for k in ("static", "prop", "glass")}
    return coll, {k: v for k, v in parts.items() if v is not None}


# ---------------------------------------------------------------- jobs (one per process)


def job(rid: str, name: str, a):
    kind, _, preset = name.partition(":")
    coll, parts = open_prepared(rid)
    scene.render_settings(a.samples, 64, 64, denoise=False, exposure=2.0)
    if preset:
        light(rid, coll, preset)
    if kind == "lm":
        full = bake.bake_lightmap(parts["static"], a.lm // 2, {"DIRECT", "INDIRECT"}, a.samples)
        np.save(cache(rid, f"full_{preset}.npy"), full)
    elif kind == "sun":
        world_strength(0.0)
        sun = bake.bake_lightmap(parts["static"], a.lm, {"DIRECT"}, max(24, a.samples // 4))
        np.save(cache(rid, f"sun_{preset}.npy"), sun)
    elif kind == "vcol":
        if "prop" in parts:
            c = bake.bake_vcol(parts["prop"], f"lm_{preset}", {"DIRECT", "INDIRECT"}, max(64, a.samples // 2))
            np.save(cache(rid, f"vcol_{preset}.npy"), c)
    elif kind == "env":
        bake.render_pano(centre(rid), 256, 128, 96, os.path.join(out_dir(rid), f"env_{preset}.hdr"))
    elif kind == "sky":
        # the view out, in the lightmaps' linear units (the runtime tone-maps it with the room)
        hdr = cache(rid, f"sky_{preset}.hdr")
        bake.render_pano(centre(rid), 2048, 1024, 32, hdr, hide=[coll])
        scale = bake.encode_sky(hdr, os.path.join(out_dir(rid), f"sky_{preset}.jpg"))
        with open(cache(rid, f"sky_{preset}.json"), "w") as f:
            json.dump({preset: scale}, f)
    elif kind == "encode":
        # denoise + encode the lightmaps of one preset (uses Blender's OIDN)
        res = {}
        full = np.load(cache(rid, f"full_{preset}.npy"))
        if preset != "night":
            sun = np.load(cache(rid, f"sun_{preset}.npy"))
            h = sun.shape[0] // 2
            amb = np.clip(full - sun.reshape(h, 2, h, 2, 3).mean(axis=(1, 3)), 0, None)
            sun = bake.denoise(sun)
            res[f"{preset}_sun"] = bake.encode_lightmap(sun, os.path.join(out_dir(rid), f"lm_{preset}_sun.webp"), a.lm)
        else:
            amb = full
        amb = bake.denoise(amb)
        res[f"{preset}_amb"] = bake.encode_lightmap(amb, os.path.join(out_dir(rid), f"lm_{preset}_amb.webp"), a.lm // 2)
        with open(cache(rid, f"scales_{preset}.json"), "w") as f:
            json.dump(res, f)
    elif kind == "export":
        cols = {}
        for p in PRESETS:
            path = cache(rid, f"vcol_{p}.npy")
            if os.path.exists(path):
                cols[f"lm_{p}"] = np.load(path)
        props = {}
        if cols and "prop" in parts:
            props = bake.encode_vcols(parts["prop"], cols)
        objs = [parts[k] for k in ("static", "prop", "glass") if k in parts]
        for ob in objs:
            bake._clear_targets(ob)
        bake.export_glb(objs, os.path.join(bake.CACHE, f"{rid}.glb"))
        with open(cache(rid, "props.json"), "w") as f:
            json.dump({"props": props, "propOrder": list(cols)}, f)
    else:
        raise SystemExit(f"unknown job {name}")


# ---------------------------------------------------------------- orchestration


def run(args: list[str], label: str, tries=4) -> None:
    for attempt in range(1, tries + 1):
        t = time.time()
        r = subprocess.run([sys.executable, "-X", "faulthandler", os.path.join(HERE, "main.py"), *args],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        lines = [ln for ln in r.stdout.splitlines() if ln.startswith("[")]
        for ln in lines[-4:]:
            print("   ", ln, flush=True)
        if r.returncode == 0:
            print(f"[bake] {label} ok in {time.time() - t:.0f}s", flush=True)
            return
        print(f"[bake] {label} failed (exit {r.returncode}), attempt {attempt}/{tries}", flush=True)
        if attempt == tries:
            tail = "\n".join(r.stdout.splitlines()[-25:])
            raise SystemExit(f"{label} failed repeatedly:\n{tail}")


def cmd_bake(a):
    rid = a.room
    T = time.time()
    jobs = set(a.jobs.split(","))
    common = ["--samples", str(a.samples), "--lm", str(a.lm)]
    if not os.path.exists(cache(rid, "room.blend")) or "prepare" in jobs or a.fresh:
        run(["prepare", rid], f"{rid} prepare")
    for p in PRESETS:
        if "lm" in jobs:
            run(["job", rid, f"lm:{p}", *common], f"{rid} lightmap {p}")
            if p != "night":
                run(["job", rid, f"sun:{p}", *common], f"{rid} sun {p}")
            run(["job", rid, f"encode:{p}", *common], f"{rid} encode {p}")
        if "vcol" in jobs:
            run(["job", rid, f"vcol:{p}", *common], f"{rid} props {p}")
        if "env" in jobs:
            run(["job", rid, f"env:{p}", *common], f"{rid} probe {p}")
        if "sky" in jobs:
            run(["job", rid, f"sky:{p}", *common], f"{rid} garden view {p}")
    if "export" in jobs:
        run(["job", rid, "export", *common], f"{rid} export")
    # meta.json: merge what this run produced with earlier runs
    meta_path = os.path.join(out_dir(rid), "meta.json")
    meta = {"room": rid, "facade": FACADE[rid], "centre": centre(rid), "lightmaps": {}, "props": {}, "sun": {},
            "sky": {}}
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            old = json.load(f)
        for k in ("lightmaps", "props", "propOrder", "sky"):
            if k in old:
                meta[k] = old[k]
    for p in PRESETS:
        kp = cache(rid, f"sky_{p}.json")
        if os.path.exists(kp):
            with open(kp) as f:
                meta["sky"].update(json.load(f))
        sp = cache(rid, f"scales_{p}.json")
        if os.path.exists(sp):
            with open(sp) as f:
                meta["lightmaps"].update(json.load(f))
        if p != "night":
            rot, el, _, _ = scene.SUN[(FACADE[rid], p)]
            d = scene.sun_dir(rot, el)
            meta["sun"][p] = [d.x, d.z, -d.y]  # three axes
    pp = cache(rid, "props.json")
    if os.path.exists(pp):
        with open(pp) as f:
            meta.update(json.load(f))
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=1)
    print(f"[bake] {rid} done in {(time.time() - T) / 60:.1f} min", flush=True)


def cmd_render(a):
    coll = build(a.room)
    light(a.room, coll, a.preset)
    w, h = (int(v) for v in a.size.split("x"))
    scene.render_settings(a.samples, w, h)
    if a.cam:
        p, t, fov = a.cam.split(":")
        scene.camera([float(v) for v in p.split(",")], [float(v) for v in t.split(",")], fov_deg=float(fov))
    else:
        v = ROOM[a.room]["view"]
        scene.camera(v["position"], v["target"], fov_deg=50)
    out = a.out or os.path.join(bl.ROOT, "scripts", ".cache", f"render_{a.room}_{a.preset}.png")
    bpy.context.scene.render.filepath = out
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[render] {out} in {time.time() - t:.0f}s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["bake", "prepare", "job", "render"])
    ap.add_argument("room")
    ap.add_argument("arg", nargs="?", default=None, help="job name, or preset for render")
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--lm", type=int, default=2048)
    ap.add_argument("--size", default="1200x750")
    ap.add_argument("--out", default=None)
    ap.add_argument("--cam", default=None)
    ap.add_argument("--jobs", default="lm,vcol,env,sky,export")
    ap.add_argument("--fresh", action="store_true", help="rebuild the room before baking")
    a = ap.parse_args()
    if a.cmd == "bake":
        cmd_bake(a)
    elif a.cmd == "prepare":
        prepare(a.room)
    elif a.cmd == "job":
        job(a.room, a.arg, a)
    else:
        a.preset = a.arg or "day"
        cmd_render(a)


if __name__ == "__main__":
    main()
