"""Baut playables/fundfieber.html: eine eigenständige spielbare Anzeige für FUNDFIEBER (Spiel 1, Sandfieber).

    python playables/src/fundfieber/build.py --game "<Pfad zum Godot-Projekt NovaKnock-NeuesSpiel>"

Aus dem Godot-Projekt kommen: Palme, Hütte, Fackeln und Felsen (assets/gpt/world), die Grab-, Sieb- und
Fund-Effekte (assets/gpt/fx), Fundbilder (assets/gpt/icons), HUD-Symbole (assets/ui/hud_v2/*.svg), die
Perla-Münze, das App-Symbol, die Vorschaubilder der fünf Spiele, Klänge (assets/audio/sfx) und ein Ausschnitt
des ersten Strandradio-Senders (media/music). Fundnamen und -werte stehen in data/finds.json und i18n.

Nico selbst ist das 3D-Modell des Spiels, vorab im Spiel freigestellt aufgenommen (sprites/, siehe
pack_sprites.py). Boden-Shader, Kamera, Abläufe und Zeiten sind in template.html aus shaders/beach.gdshader,
scripts/systems/factory_world.gd, field_fx.gd, field_dig.gd und scenes/beach/ übertragen.
Braucht Pillow und ffmpeg im Pfad.
"""
import argparse
import base64
import csv
import io
import json
import os
import subprocess
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "fundfieber.html")
# Beleuchtung des Spiels (Sonne 0,24 + Umgebungslicht 0,2, linearer Tonemapper), am Bildschirmfoto gemessen.
LIGHT = (0.915, 0.924, 0.945)
FINDS = ["kronkorken", "grano_50", "silberring"]
SOUNDS = {
    # Name: (Datei, Sekunden oder None = ganz, kbit/s)
    "power": ("det_power_on", None, 48), "spade": ("dig_spade", None, 48), "shovel": ("dig_shovel", None, 48),
    "hand": ("dig_hand", None, 48), "sieve": ("dig_sieve", 2.6, 48), "junk": ("find_junk", None, 48),
    "coin": ("find_coin_big", None, 48), "valuable": ("find_valuable", None, 56), "tap": ("ui_tap", None, 40),
    "locked": ("ui_locked", None, 40), "levelup": ("level_up", None, 48), "amb": ("amb_beach_day", 9.0, 40),
}


def b64(data):
    return base64.b64encode(data).decode("ascii")


def webp(im, quality=82, alpha_quality=90):
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=quality, alpha_quality=alpha_quality, method=6)
    return b64(buf.getvalue())


def lit(im):
    """Sprite so abdunkeln, wie das Spiel beleuchtete Bildkarten zeigt."""
    r, g, b, a = im.convert("RGBA").split()
    r, g, b = (ch.point(lambda v, k=k: round(v * k)) for ch, k in zip((r, g, b), LIGHT))
    return Image.merge("RGBA", (r, g, b, a))


def foot_pad(im):
    """Leerer Rand unter dem Motiv als Anteil der Bildhöhe (wie FactoryWorld._foot_pad)."""
    alpha = im.getchannel("A")
    w, h = im.size
    step = max(1, w // 96)
    px = alpha.load()
    y = h - 1
    while y >= 0:
        if sum(1 for x in range(0, w, step) if px[x, y] > 153) >= 3:
            return min(0.3, (h - 1 - y) / h)
        y -= step
    return 0.0


def prop(game, name, height_px):
    im = Image.open(os.path.join(game, "assets", "gpt", "world", name + ".png")).convert("RGBA")
    pad = foot_pad(im)
    w = round(im.width * height_px / im.height)
    return {"img": webp(lit(im.resize((w, height_px), Image.LANCZOS)), 80), "aspect": im.width / im.height, "pad": round(pad, 4)}


def fx(game, name, size, quality=78):
    im = Image.open(os.path.join(game, "assets", "gpt", "fx", name + ".png")).convert("RGBA")
    return webp(im.resize((size, size), Image.LANCZOS), quality)


def sound(game, name, seconds, kbps, folder="assets/audio/sfx", start=0.0, fade=0.0):
    src = os.path.join(game, *folder.split("/"), name + ".ogg")
    out = os.path.join(tempfile.mkdtemp(), "s.mp3")
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-i", src]
    if seconds:
        cmd += ["-t", str(seconds)]
    if fade and seconds:
        cmd += ["-af", "afade=t=in:d=%s,afade=t=out:st=%s:d=%s" % (fade, seconds - fade, fade)]
    cmd += ["-ac", "1", "-ar", "32000", "-b:a", "%dk" % kbps, out]
    subprocess.run(cmd, check=True)
    return b64(open(out, "rb").read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", required=True)
    ap.add_argument("--no-music", action="store_true")
    a = ap.parse_args()
    game = a.game
    sprites = json.load(open(os.path.join(HERE, "sprites", "sprites.json"), encoding="utf-8"))
    data = {"sprites": sprites, "atlas": {}}
    for name in sprites["groups"]:
        data["atlas"][name] = b64(open(os.path.join(HERE, "sprites", name + ".webp"), "rb").read())

    data["props"] = {"palm": prop(game, "world_palm", 400), "hut": prop(game, "world_hut", 360), "torch": prop(game, "world_torch_off", 200),
                     "rock": prop(game, "world_rock", 100), "rocks": prop(game, "world_rocks", 100)}
    data["fx"] = {"hole_shallow": fx(game, "fx_hole_shallow", 160), "hole_deep": fx(game, "fx_hole_deep", 160), "hole_filled": fx(game, "fx_hole_filled", 160),
                  "heap": fx(game, "fx_dig_heap", 128), "rain": fx(game, "fx_sieve_rain", 128), "light": fx(game, "fx_light_pop", 128),
                  "ring": fx(game, "fx_burst_ring", 160), "glint": fx(game, "fx_glint", 128), "sparkle": fx(game, "fx_sparkle", 160),
                  "sand": [fx(game, "fx_sand_%02d" % i, 48, 72) for i in range(1, 17)]}

    raw = json.load(open(os.path.join(game, "data", "finds.json"), encoding="utf-8"))
    finds = {f["id"]: f for f in (raw["finds"] if isinstance(raw, dict) else raw)}
    tr = {r[0]: r for r in csv.reader(open(os.path.join(game, "i18n", "translations.csv"), encoding="utf-8")) if r}
    data["finds"] = []
    for fid in FINDS:
        f = finds[fid]
        icon = Image.open(os.path.join(game, "assets", "gpt", "icons", f["icon"] + ".png")).convert("RGBA").resize((144, 144), Image.LANCZOS)
        name = tr["FIND_%s_NAME" % fid.upper()]
        data["finds"].append({"id": fid, "category": f["category"], "value": f["value"], "name": {"de": name[1], "en": name[2]}, "icon": webp(icon, 84)})

    svg = {}
    for key in ["scanner", "dig", "shop", "build", "factory", "goals", "sand"]:
        svg[key] = open(os.path.join(game, "assets", "ui", "hud_v2", key + ".svg"), encoding="utf-8").read().strip().replace('stroke="white"', 'stroke="currentColor"')
    data["svg"] = svg
    ui = lambda rel, size, q=84: webp(Image.open(os.path.join(game, *rel.split("/"))).convert("RGBA").resize((size, size), Image.LANCZOS), q)
    data["coin"] = ui("assets/gpt/ui/currency_icon_perla.png", 96)
    data["chip"] = ui("assets/gpt/hud/hud_icon_timing.png", 72)
    data["icon"] = ui("assets/gpt/branding/app_icon.png", 160, 86)
    previews = ["assets/gpt/key_art/level_preview_01_strand.png", "assets/gpt/key_art/level_preview_02_fundbuero.png", "assets/gpt/key_art/level_preview_03_recyclinghof.png",
                "assets/gpt/key_art/level_preview_04_sammelkarten.png", "assets/gpt/lv5/backgrounds/level_preview_05_streufeld.png"]
    data["previews"] = []
    for rel in previews:
        im = Image.open(os.path.join(game, *rel.split("/"))).convert("RGB")
        side = min(im.size)
        im = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width + side) // 2, (im.height + side) // 2)).resize((132, 132), Image.LANCZOS)
        data["previews"].append(webp(im, 72))

    data["snd"] = {k: sound(game, f, sec, kbps, fade=0.5 if k == "amb" else 0.0) for k, (f, sec, kbps) in SOUNDS.items()}
    if not a.no_music:
        data["snd"]["music"] = sound(game, "station1_loop", 20.0, 48, folder="media/music", start=8.0, fade=0.8)

    html = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    assert "/*DATA*/" in html
    html = html.replace("/*DATA*/", "var DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";")
    open(OUT, "w", encoding="utf-8", newline="\n").write(html)
    sizes = {k: len(json.dumps(v)) // 1024 for k, v in data.items()}
    print("fundfieber.html:", len(html.encode("utf-8")) // 1024, "KB", sizes)


if __name__ == "__main__":
    main()
