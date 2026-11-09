"""Baut playables/tower100.html: eine eigenständige spielbare Anzeige für TOWER 100 (Etage 1–3).

    python playables/src/tower100/build.py --game "<Pfad zum Relic-Tower-Projekt>"

Aus dem Godot-Projekt kommen die gemalten Raumbilder (assets/rooms/floor_01–03.png, zugeschnitten wie
FloorRoom.draw_backdrop und ArtCrops), die Item-Symbole (assets/items/*.svg), die Schrift Nunito
(assets/fonts, OFL, als Teilmenge), das App-Symbol und Titel, Hinweise und Item-Namen aus den Skripten.
Rätsellogik, Zeichnungen und Klänge sind in template.html aus scripts/floors/floor_01–03.gd und
scripts/sfx.gd übertragen.
"""
import argparse
import base64
import io
import json
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "tower100.html")
ROOM_W, ROOM_H = 540, 690
# assets/rooms: 1024×1536 gemalt; ohne Eintrag in scripts/art_crops.gd wird mittig auf 540:690 geschnitten.
CROPS = {3: (0.0, 56.9, 1024.0, 1308.4)}
GLYPHS = "U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201A,U+201C,U+201D,U+201E,U+2026,U+00B7,U+2190,U+2192"
GD_STR = r'"((?:[^"\\]|\\.)*)"'


def gd(s):
    return json.loads('"' + s + '"')


def b64(data):
    return base64.b64encode(data).decode("ascii")


def room_image(game, n):
    im = Image.open(os.path.join(game, "assets", "rooms", "floor_%02d.png" % n)).convert("RGB")
    if n in CROPS:
        x, y, w, h = CROPS[n]
    else:
        cut = im.height - im.width * ROOM_H / ROOM_W
        x, y, w, h = 0, cut / 2, im.width, im.height - cut
    im = im.crop((round(x), round(y), round(x + w), round(y + h))).resize((810, 1035), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=78, method=6)
    return buf.getvalue()


def floor_texts(game, n):
    src = open(os.path.join(game, "scripts", "floors", "floor_%02d.gd" % n), encoding="utf-8").read()
    title = re.search(r"const TITLE := \[" + GD_STR + ", " + GD_STR + r"\]", src)
    block = re.search(r"const HINTS := \[\n(.*?)\n\]", src, re.S).group(1)
    hints = [[gd(a), gd(b)] for a, b in re.findall(r"\[" + GD_STR + ", " + GD_STR + r"\]", block)]
    assert len(hints) == 3, "Etage %d: drei Hinweise erwartet" % n
    return [gd(title.group(1)), gd(title.group(2))], hints


def item_names(game):
    src = open(os.path.join(game, "scripts", "items.gd"), encoding="utf-8").read()
    return {k: [gd(a), gd(b)] for k, a, b in re.findall(r'"(\w+)": \[' + GD_STR + ", " + GD_STR + r"\]", src)}


def font(game):
    out = os.path.join(tempfile.mkdtemp(), "nunito.woff2")
    subprocess.run([sys.executable, "-m", "fontTools.subset", os.path.join(game, "assets", "fonts", "Nunito-Variable.ttf"),
                    "--unicodes=" + GLYPHS, "--layout-features=*", "--flavor=woff2", "--output-file=" + out], check=True)
    return open(out, "rb").read()


def app_icon(game):
    im = Image.open(os.path.join(game, "Play Store", "graphics", "app-icon-512.png")).convert("RGBA").resize((112, 112), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=88)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", default=os.path.join(HERE, "..", "..", "..", "..", "Relic Tower"))
    game = ap.parse_args().game
    titles, hints = zip(*[floor_texts(game, n) for n in (1, 2, 3)])
    items = {k: open(os.path.join(game, "assets", "items", k + ".svg"), encoding="utf-8").read().strip() for k in ("phone", "key_small", "uv_lamp", "keycard")}
    data = {
        "rooms": [b64(room_image(game, n)) for n in (1, 2, 3)],
        "icon": b64(app_icon(game)),
        "items": items,
        "itemNames": item_names(game),
        "titles": list(titles),
        "hints": list(hints),
    }
    html = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    html = html.replace("/*__FONT__*/", b64(font(game)), 1)
    html = html.replace("/*__DATA__*/", json.dumps(data, ensure_ascii=False), 1)
    open(OUT, "w", encoding="utf-8", newline="\n").write(html)
    print("geschrieben: %s %d KB · Räume %s KB" % (os.path.relpath(OUT), len(html.encode()) // 1024,
                                                   "/".join(str(len(r) * 3 // 4 // 1024) for r in data["rooms"])))


if __name__ == "__main__":
    main()
