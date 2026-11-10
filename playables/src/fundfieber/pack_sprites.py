"""Packt Nicos Einzelbilder aus der Spielaufnahme (promo_director.gd, Segment l1_sprites) zu WebP-Atlanten.

    python playables/src/fundfieber/pack_sprites.py --capture <Ordner mit 0000.png … und meta.json>

Ergebnis: sprites/<gruppe>.webp und sprites/sprites.json (Zellen, Fußpunkt, Hand- und Werkzeugpunkte je Bild).
Alle Maße in sprites.json sind Welteinheiten (1 Feld = 1), Bildpunkte = Einheiten × px_per_unit.
"""
import argparse, io, json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sprites")
STRIDE = 44          # Bilder (30/s) für einen Doppelschritt der Geh-Animation
WALK_FRAMES = 10
DIG_STEP, SIEVE_STEP, CHEER_STEP = 3, 4, 4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--capture", required=True)
    ap.add_argument("--scale", type=float, default=0.5)
    ap.add_argument("--quality", type=int, default=80)
    a = ap.parse_args()
    meta = json.load(open(os.path.join(a.capture, "meta.json"), encoding="utf-8"))
    ppu = meta["px_per_unit"]
    frames = meta["frames"]
    tag = lambda t: [f for f in frames if f["tag"] == t]
    groups = {}
    walk, idle = [], []
    for d in range(8):
        w = tag("walk%d" % d)
        walk += [w[round(k * STRIDE / WALK_FRAMES)] for k in range(WALK_FRAMES)]
        idle.append(tag("idle%d" % d)[1])
    groups["walk"] = walk
    groups["idle"] = idle
    dig = tag("draw") + tag("dig")
    groups["dig"] = dig[::DIG_STEP]
    groups["sieve"] = tag("sieve")[::SIEVE_STEP]
    after = tag("after")
    cheer_end = next(i for i, f in enumerate(after) if f["anim"] != "cheer")
    groups["cheer"] = after[:cheer_end:CHEER_STEP] + [after[min(len(after) - 1, cheer_end + 12)]]
    os.makedirs(OUT, exist_ok=True)
    info = {"px_per_unit": ppu * a.scale, "groups": {}}
    total = 0
    for name, sel in groups.items():
        ims = [Image.open(os.path.join(a.capture, f["file"])).convert("RGBA") for f in sel]
        box = None
        for im in ims:
            b = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        box = (max(0, box[0] - 4), max(0, box[1] - 4), min(ims[0].width, box[2] + 4), min(ims[0].height, box[3] + 4))
        cw, ch = round((box[2] - box[0]) * a.scale), round((box[3] - box[1]) * a.scale)
        cols = WALK_FRAMES if name == "walk" else min(len(ims), 8)
        rows = (len(ims) + cols - 1) // cols
        atlas = Image.new("RGBA", (cw * cols, ch * rows), (0, 0, 0, 0))
        for i, im in enumerate(ims):
            atlas.paste(im.crop(box).resize((cw, ch), Image.LANCZOS), ((i % cols) * cw, (i // cols) * ch))
        buf = io.BytesIO()
        atlas.save(buf, "WEBP", quality=a.quality, alpha_quality=90, method=6)
        open(os.path.join(OUT, name + ".webp"), "wb").write(buf.getvalue())
        total += len(buf.getvalue())
        feet = sel[0]["feet"]
        u = lambda p: [round((p[0] - feet[0]) / ppu, 3), round((p[1] - feet[1]) / ppu, 3)] if p else None
        g = {"cols": cols, "count": len(ims), "cell": [cw, ch], "feet": [round((feet[0] - box[0]) * a.scale, 2), round((feet[1] - box[1]) * a.scale, 2)]}
        if name in ("walk", "idle"):
            g["hand"] = [u(f["hand_r"]) for f in sel]
            g["facing"] = [sel[i * (WALK_FRAMES if name == "walk" else 1)]["facing"] for i in range(8)]
        if name == "dig":
            g["fps"] = 30 / DIG_STEP
            g["blade"] = [u(f["blade"]) for f in sel]
            g["hole"], g["heap"] = u(dig[-1]["hole"]), u(dig[-1]["heap"])
            g["facing"] = dig[-1]["facing"]
            g["draw_frames"] = len(tag("draw")) / DIG_STEP
            ev, prev = [], False
            for i, f in enumerate(dig):
                if f["loaded"] != prev:
                    ev.append([round(i / 30, 3), "stab" if f["loaded"] else "throw"])
                    prev = f["loaded"]
            g["events"] = ev
            g["seconds"] = round(len(dig) / 30, 3)
        if name == "sieve":
            g["fps"] = 30 / SIEVE_STEP
            g["center"] = [u(f["sieve"]) for f in sel]
            g["seconds"] = round(len(tag("sieve")) / 30, 3)
        if name == "cheer":
            g["fps"] = 30 / CHEER_STEP
        info["groups"][name] = g
        print(name, len(ims), "Bilder", cw, "x", ch, len(buf.getvalue()) // 1024, "KB")
    info["game"] = {k: meta[k] for k in ("dig_seconds", "sieve_seconds", "early_factor", "walk_speed", "detector_speed", "walk_mult", "cam_right", "cam_up", "cam_back")}
    json.dump(info, open(os.path.join(OUT, "sprites.json"), "w", encoding="utf-8"), indent=1)
    print("gesamt", total // 1024, "KB")


if __name__ == "__main__":
    main()
