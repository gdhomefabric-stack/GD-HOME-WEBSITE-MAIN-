"""
Material library shared by the Blender scenes and the website runtime.

Each entry: tex (texture set in scripts/.cache/tex), color (sRGB tint, multiplies the
albedo map), rough (mean roughness), tile (metres per texture repeat), normal
(strength), metal, sheen {color, rough}, emissive (runtime-driven lamps), glass.
`python3 scripts/blender/mats.py` writes src/data/roomMaterials.json for the runtime.
"""
from __future__ import annotations

import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TEX = os.path.join(ROOT, "scripts", ".cache", "tex")


def plaster(color: str, rough=0.9):
    return {"tex": "plaster", "color": color, "rough": rough, "tile": 2.0, "normal": 0.15}


def linen(color: str, tile=0.16, rough=0.9):
    return {"tex": "linen", "color": color, "rough": rough, "tile": tile, "normal": 0.6}


def velvet(color: str, sheen: str):
    return {"tex": "velvet", "color": color, "rough": 0.75, "tile": 0.35, "normal": 0.4,
            "sheen": {"color": sheen, "rough": 0.35}}


def rug(color: str, tile=0.5):
    return {"tex": "carpet", "color": color, "rough": 1.0, "tile": tile, "normal": 0.7}


def paint(color: str, rough=0.42):
    return {"color": color, "rough": rough}


MATS: dict[str, dict] = {
    # --- architecture
    "wall_warm": plaster("#eee6da"),
    "wall_mist": plaster("#dfe6e3"),
    "wall_blush": plaster("#f0ddd3"),
    "wall_greige": plaster("#dcd3c6"),
    "wall_taupe": plaster("#cbbba7"),
    "wall_green": plaster("#4d5a45"),
    "wall_dark": plaster("#3a302a"),
    "ceiling": {"color": "#f4f0e9", "rough": 0.95},
    "trim": paint("#f2ede4"),
    "trim_green": paint("#445040"),
    "trim_dark": paint("#2c2621"),
    "floor_oak": {"tex": "oak_planks", "rough": 0.42, "tile": 2.4, "normal": 0.8},
    "floor_walnut": {"tex": "walnut_planks", "rough": 0.36, "tile": 2.4, "normal": 0.8},
    "floor_smoked": {"tex": "smoked_planks", "rough": 0.4, "tile": 2.4, "normal": 0.8},
    "floor_travertine": {"tex": "travertine_tiles", "rough": 0.42, "tile": 2.4, "normal": 0.6},
    "carpet_theatre": rug("#4a3630", 0.7),
    "window_frame": {"tex": "brushed", "color": "#2e2b28", "rough": 0.42, "metal": 0.65, "tile": 0.5, "normal": 0.2},
    "glass": {"color": "#eef3f2", "rough": 0.02, "glass": True},
    "sill": {"tex": "travertine", "rough": 0.45, "tile": 1.4, "normal": 0.5},
    # --- woods & metals
    "walnut": {"tex": "walnut", "rough": 0.4, "tile": 1.2, "normal": 0.5},
    "oak": {"tex": "oak", "rough": 0.45, "tile": 1.2, "normal": 0.5},
    "white_wood": paint("#f0ebe2", 0.5),
    "brass": {"tex": "brushed", "color": "#caa46c", "rough": 0.28, "metal": 1.0, "tile": 0.4, "normal": 0.25},
    "bronze": {"tex": "brushed", "color": "#6f5339", "rough": 0.36, "metal": 1.0, "tile": 0.4, "normal": 0.25},
    "black_metal": {"tex": "brushed", "color": "#262422", "rough": 0.4, "metal": 0.7, "tile": 0.4, "normal": 0.2},
    "chrome": {"color": "#e6e6e6", "rough": 0.08, "metal": 1.0},
    "mirror": {"color": "#f0efec", "rough": 0.02, "metal": 1.0},
    # --- stone & ceramics
    "marble": {"tex": "marble", "rough": 0.14, "tile": 1.2, "normal": 0.3},
    "travertine": {"tex": "travertine", "rough": 0.48, "tile": 1.4, "normal": 0.5},
    "stone_pot": {"tex": "travertine", "color": "#ece5d9", "rough": 0.7, "tile": 0.7, "normal": 0.6},
    "ceramic_white": {"tex": "ceramic", "color": "#f1ece3", "rough": 0.3, "tile": 0.3},
    "ceramic_sage": {"tex": "ceramic", "color": "#9fa98f", "rough": 0.35, "tile": 0.3},
    "ceramic_dark": {"tex": "ceramic", "color": "#3a3530", "rough": 0.32, "tile": 0.3},
    "ceramic_blush": {"tex": "ceramic", "color": "#e3c4b6", "rough": 0.35, "tile": 0.3},
    "terracotta": {"tex": "terracotta", "rough": 0.85, "tile": 0.5},
    "soot": paint("#1b1816", 0.95),
    # --- upholstery
    "boucle": {"tex": "boucle", "color": "#efe8dc", "rough": 0.96, "tile": 0.22, "normal": 0.8},
    "linen_sand": linen("#cbb99e"),
    "linen_stone": linen("#b5a791"),
    "linen_oat": linen("#e3d8c6"),
    "linen_sea": linen("#a8bbc1"),
    "linen_white": linen("#f2eee6"),
    "linen_charcoal": linen("#4a4541"),
    "velvet_taupe": velvet("#8a7a68", "#dccbb6"),
    "velvet_emerald": velvet("#1d4635", "#7db596"),
    "velvet_oxblood": velvet("#4a1b22", "#bb6d75"),
    "velvet_cognac": velvet("#8a5433", "#efb88d"),
    "velvet_moss": velvet("#4e583d", "#b6c197"),
    "velvet_navy": velvet("#1f2940", "#7c8db6"),
    "velvet_blush": velvet("#caa093", "#f3d6cb"),
    "leather_cognac": {"tex": "leather", "color": "#7b4a2a", "rough": 0.5, "tile": 0.3, "normal": 0.6},
    "leather_black": {"tex": "leather", "color": "#2a2522", "rough": 0.45, "tile": 0.3, "normal": 0.6},
    "rattan": {"tex": "rattan", "rough": 0.6, "tile": 0.14, "normal": 0.8},
    "cane_frame": {"tex": "oak", "color": "#d6b07c", "rough": 0.5, "tile": 0.8, "normal": 0.4},
    # --- bedding & soft goods
    "percale_white": {"tex": "percale", "color": "#f6f3ee", "rough": 0.9, "tile": 0.1, "normal": 0.5},
    "throw_taupe": linen("#9a8670", 0.2),
    "throw_sea": linen("#9fb3ba", 0.2),
    "throw_oat": linen("#d9ccb6", 0.2),
    "throw_blush": linen("#e2c3b8", 0.2),
    "rug_ivory": rug("#e2d7c4"),
    "rug_sand": rug("#cbb79a"),
    "rug_pastel": rug("#e8d5c9"),
    "rug_study": rug("#6d5a45"),
    "rug_suite": rug("#c6b59f"),
    "rug_jute": {"tex": "jute", "rough": 1.0, "tile": 0.5, "normal": 0.9},
    # --- lighting (emissive strength is driven at runtime / per bake preset)
    "shade": {"tex": "linen", "color": "#f2e7d4", "rough": 0.9, "tile": 0.15, "normal": 0.4,
              "emissive": "#ffcf96", "translucent": 0.45},
    "bulb": {"color": "#fff6e8", "rough": 0.3, "emissive": "#ffdcae"},
    "fire": {"color": "#ff8a3a", "rough": 1.0, "emissive": "#ff7a2a"},
    "screen": {"tex": "screen", "rough": 0.9, "uv01": True, "emissive": "#ffffff"},
    # --- decor
    "book_1": paint("#6b3b2e", 0.7),
    "book_2": paint("#2f4a3f", 0.7),
    "book_3": paint("#cdbb9d", 0.7),
    "book_4": paint("#2d3547", 0.7),
    "book_5": paint("#8c6d4a", 0.7),
    "book_6": paint("#e9e2d4", 0.7),
    "paper": paint("#f1ece2", 0.8),
    "leaf": {"tex": "leaf", "rough": 0.5, "tile": 0.25, "normal": 0.3, "double": True},
    "olive_leaf": {"tex": "leaf", "color": "#b9c29a", "rough": 0.7, "tile": 0.25, "double": True},
    "bark": paint("#5d4d3d", 0.9),
    "soil": paint("#3a2e25", 1.0),
    "water": {"color": "#c9d9d6", "rough": 0.03, "glass": True},
    "toy_1": paint("#e3b7a5", 0.6),
    "toy_2": paint("#b8c7cf", 0.6),
    "toy_3": paint("#e9d7a8", 0.6),
    "toy_4": paint("#b5c3a2", 0.6),
    "speaker": {"tex": "linen", "color": "#26231f", "rough": 1.0, "tile": 0.1, "normal": 0.5},
    "art_1": {"tex": "art_1", "rough": 0.9, "uv01": True},
    "art_2": {"tex": "art_2", "rough": 0.9, "uv01": True},
    "art_3": {"tex": "art_3", "rough": 0.9, "uv01": True},
    "art_4": {"tex": "art_4", "rough": 0.9, "uv01": True},
    # --- exterior (Blender panoramas only)
    "grass": {"tex": "grass", "rough": 1.0, "tile": 3.0, "normal": 0.6},
    "gravel": {"tex": "gravel", "rough": 1.0, "tile": 2.0, "normal": 0.8},
    "hedge": {"tex": "leaf", "color": "#5f7048", "rough": 0.9, "tile": 0.4, "normal": 1.0},
    "facade": plaster("#f2ebe0", 0.85),
    "terrace": {"tex": "travertine_tiles", "rough": 0.6, "tile": 2.4, "normal": 0.6},
    "pool_tile": paint("#9fd0cb", 0.3),
    "pool_water": {"color": "#8fc7c8", "rough": 0.02, "glass": True},
    "tree_leaf": {"tex": "leaf", "color": "#b3bb98", "rough": 0.8, "tile": 0.5, "normal": 1.0},
    "cypress": {"tex": "leaf", "color": "#55624a", "rough": 0.9, "tile": 0.35, "normal": 1.0},
    "cypress_far": {"tex": "leaf", "color": "#6d7a66", "rough": 0.95, "tile": 0.8, "normal": 0.8, "haze": 60},
    "hills": {"tex": "grass", "color": "#9aa38a", "rough": 1.0, "tile": 20.0, "normal": 0.3, "haze": 140},
}


def rough_mean(tex: str) -> float:
    p = os.path.join(TEX, f"{tex}_rough.png")
    if not os.path.exists(p):
        return 1.0
    return float(np.asarray(Image.open(p), dtype=np.float32).mean() / 255.0)


def resolved() -> dict[str, dict]:
    """Material defs with each texture's measured mean roughness filled in."""
    cache: dict[str, float] = {}
    out = {}
    for name, d in MATS.items():
        d = dict(d)
        t = d.get("tex")
        if t and not d.get("uv01"):
            if t not in cache:
                cache[t] = rough_mean(t)
            d["roughMean"] = round(cache[t], 4)
        if d.get("uv01"):
            d["roughMap"] = False
            d["tile"] = 1.0
        out[name] = d
    return out


if __name__ == "__main__":
    out = os.path.join(ROOT, "src", "data", "roomMaterials.json")
    with open(out, "w") as f:
        json.dump(resolved(), f, indent=1)
        f.write("\n")
    print("[mats] wrote", os.path.relpath(out, ROOT))
