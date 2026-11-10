"""Baut playables/sonaris.html: eine eigenständige spielbare Anzeige für SONARIS (Ring-Jagd in 3D).

    python playables/src/sonaris/build.py --game "<Pfad zum Sonaris-Projekt>"

Aus dem Godot-Projekt (<Sonaris>/godot-3d) kommen die Modelle von Kai und Lumen (models/kai.glb,
models/lumen.glb, als quantisierte Dreiecksnetze mit den Farben des Spiels), die Klänge
(assets/audio/sfx, mit ffmpeg auf Mono 64 kbit/s verkleinert), ein Ausschnitt der Meridian-Musik,
die Schrift Inter (als Teilmenge, WOFF2) und das App-Symbol. Schwimmphysik, Kamera, Ringe und
Shader sind in template.html aus scripts/player.gd, scripts/ring_gate.gd, scripts/activities.gd,
scripts/models.gd und shaders/*.gdshader übertragen.
"""
import argparse
import base64
import io
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "sonaris.html")
GLYPHS = "U+0020-007E,U+00A0-00FF,U+0131,U+011E,U+011F,U+0130,U+015E,U+015F,U+0141-0144,U+0104-0107,U+0118,U+0119,U+015A,U+015B,U+0179-017C,U+2013,U+2014,U+2018,U+2019,U+201A,U+201C,U+201D,U+201E,U+2026,U+00B7,U+2190-2193,U+2197,U+2198,U+2196,U+2199"
SFX = ["ring_1", "ring_2", "ring_3", "coin_1", "coin_2", "coin_3", "dash", "echo", "success", "step_done", "ui_tap_1", "wall_bump_1"]
MUSIC_START, MUSIC_SECONDS = 8.0, 24.0


def b64(data):
    return base64.b64encode(data).decode("ascii")


# ---------- glTF ----------
def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def mat_trs(node):
    if "matrix" in node:
        m = node["matrix"]
        return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    t = node.get("translation", [0, 0, 0])
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    s = node.get("scale", [1, 1, 1])
    r = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    return [[r[i][0] * s[0], r[i][1] * s[1], r[i][2] * s[2], t[i]] for i in range(3)] + [[0, 0, 0, 1]]


def inv3_transpose(m):
    a, b, c = m[0][:3], m[1][:3], m[2][:3]
    det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])
    inv = [[(b[1] * c[2] - b[2] * c[1]) / det, (a[2] * c[1] - a[1] * c[2]) / det, (a[1] * b[2] - a[2] * b[1]) / det],
           [(b[2] * c[0] - b[0] * c[2]) / det, (a[0] * c[2] - a[2] * c[0]) / det, (a[2] * b[0] - a[0] * b[2]) / det],
           [(b[0] * c[1] - b[1] * c[0]) / det, (a[1] * c[0] - a[0] * c[1]) / det, (a[0] * b[1] - a[1] * b[0]) / det]]
    return [[inv[j][i] for j in range(3)] for i in range(3)]


def srgb(v):
    v = max(0.0, min(1.0, v))
    return 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055


class Glb:
    def __init__(self, path):
        raw = open(path, "rb").read()
        assert raw[:4] == b"glTF", path
        n = struct.unpack("<I", raw[12:16])[0]
        self.json = json.loads(raw[20:20 + n])
        self.bin = raw[28 + n:]

    def accessor(self, index):
        a = self.json["accessors"][index]
        view = self.json["bufferViews"][a["bufferView"]]
        fmt, size = {5126: ("f", 4), 5123: ("H", 2), 5125: ("I", 4), 5121: ("B", 1)}[a["componentType"]]
        comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        stride = view.get("byteStride") or size * comps
        start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        return [struct.unpack_from("<%d%s" % (comps, fmt), self.bin, start + i * stride) for i in range(a["count"])]

    def groups(self, pivots):
        """Dreiecke je Gruppe: Knoten unter einem Pivot liegen relativ zu ihm, der Rest in 'body'."""
        out = {"body": []}
        nodes = self.json["nodes"]

        def walk(index, matrix, group):
            node = nodes[index]
            name = node.get("name", "")
            if name in pivots:
                group, matrix = name, [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
                out.setdefault(name, [])
                pivots[name] = node.get("translation", [0, 0, 0])
            else:
                matrix = mat_mul(matrix, mat_trs(node))
            if "mesh" in node:
                normal_matrix = inv3_transpose(matrix)
                for prim in self.json["meshes"][node["mesh"]]["primitives"]:
                    material = self.json["materials"][prim["material"]] if "material" in prim else {}
                    pbr = material.get("pbrMetallicRoughness", {})
                    base = [srgb(c) for c in pbr.get("baseColorFactor", [1, 1, 1, 1])[:3]]
                    glow = 1.0 if "emissiveFactor" in material else 0.0
                    metal = 1.0 if pbr.get("metallicFactor", 0.0) >= 0.5 or "bronze" in material.get("name", "") else 0.0
                    pos = self.accessor(prim["attributes"]["POSITION"])
                    nrm = self.accessor(prim["attributes"]["NORMAL"])
                    col = self.accessor(prim["attributes"]["COLOR_0"]) if "COLOR_0" in prim["attributes"] else None
                    idx = [i[0] for i in self.accessor(prim["indices"])] if "indices" in prim else list(range(len(pos)))
                    verts = []
                    for i, p in enumerate(pos):
                        w = [sum(matrix[r][c] * (p[c] if c < 3 else 1) for c in range(4)) for r in range(3)]
                        n = [sum(normal_matrix[r][c] * nrm[i][c] for c in range(3)) for r in range(3)]
                        ln = math.sqrt(sum(x * x for x in n)) or 1
                        c = [base[k] * (col[i][k] if col else 1) for k in range(3)]
                        verts.append((tuple(w), tuple(x / ln for x in n), tuple(c), glow * 1.0 + metal * 0.5))
                    out[group].append((verts, idx))
            for child in node.get("children", []):
                walk(child, matrix, group)

        scene = self.json["scenes"][self.json.get("scene", 0)]
        for root in scene["nodes"]:
            walk(root, [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], "body")
        return out


def pack(parts):
    """Quantisiert und verschmilzt gleiche Ecken: Position int16, Normale int8, Farbe uint8 (a = Leuchten/Metall)."""
    lo = [min(v[0][k] for verts, _ in parts for v in verts) for k in range(3)]
    hi = [max(v[0][k] for verts, _ in parts for v in verts) for k in range(3)]
    size = [max(1e-6, hi[k] - lo[k]) for k in range(3)]
    seen, pos, nrm, col, idx = {}, [], [], [], []
    for verts, indices in parts:
        remap = []
        for p, n, c, flag in verts:
            q = tuple(round((p[k] - lo[k]) / size[k] * 65535) for k in range(3))
            qn = tuple(max(-127, min(127, round(x * 127))) for x in n)
            qc = tuple(max(0, min(255, round(x * 255))) for x in c) + (round(min(1.0, flag / 1.5) * 255),)
            key = (q, qn, qc)
            if key not in seen:
                seen[key] = len(pos) // 3
                pos += q
                nrm += qn
                col += qc
            remap.append(seen[key])
        for i in range(0, len(indices) - 2, 3):
            a, b, c = remap[indices[i]], remap[indices[i + 1]], remap[indices[i + 2]]
            if a != b and b != c and a != c:
                idx += [a, b, c]
    count = len(pos) // 3
    assert count < 65536, "zu viele Ecken"
    return {"p": b64(struct.pack("<%dH" % len(pos), *pos)), "n": b64(struct.pack("<%db" % len(nrm), *nrm)),
            "c": b64(struct.pack("<%dB" % len(col), *col)), "i": b64(struct.pack("<%dH" % len(idx), *idx)),
            "min": [round(x, 5) for x in lo], "size": [round(x, 5) for x in size], "verts": count, "tris": len(idx) // 3}


def model(path, pivots=None):
    pivots = dict(pivots or {})
    groups = Glb(path).groups(pivots)
    out = {name: pack(parts) for name, parts in groups.items() if parts}
    for name, at in pivots.items():
        out[name]["pivot"] = [round(x, 5) for x in at]
    return out


# ---------- Ton, Schrift, Symbol ----------
def ffmpeg(args):
    exe = shutil.which("ffmpeg")
    if not exe:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        target = os.path.join(tmp, "out.mp3")
        run = subprocess.run([exe, "-v", "error", "-y"] + args + [target], capture_output=True)
        if run.returncode != 0 or not os.path.exists(target):
            sys.exit("ffmpeg: " + run.stderr.decode("utf-8", "replace"))
        return open(target, "rb").read()


def audio(game, folder, name):
    """Das Projekt hält die MP3-Quellen je nach Stand neben den OGG-Dateien oder im Unterordner src/."""
    base = os.path.join(game, "assets", "audio", folder)
    for candidate in (name + ".mp3", os.path.join("src", name + ".mp3"), name + ".ogg"):
        if os.path.exists(os.path.join(base, candidate)):
            return os.path.join(base, candidate)
    sys.exit("Klang nicht gefunden: %s/%s" % (folder, name))


def sound(game, name):
    src = audio(game, "sfx", name)
    small = ffmpeg(["-i", src, "-ac", "1", "-ar", "44100", "-b:a", "64k", "-map_metadata", "-1"])
    if not small and not src.endswith(".mp3"):
        sys.exit("ffmpeg fehlt: %s lässt sich nicht nach MP3 wandeln" % src)
    return b64(small if small else open(src, "rb").read())


def music(game):
    src = audio(game, "music", "meridian")
    data = ffmpeg(["-ss", str(MUSIC_START), "-t", str(MUSIC_SECONDS), "-i", src, "-ac", "1", "-ar", "32000", "-b:a", "40k", "-map_metadata", "-1"])
    return b64(data) if data else ""


def font(path):
    from fontTools import subset
    with tempfile.TemporaryDirectory() as tmp:
        target = os.path.join(tmp, "f.woff2")
        subset.main([path, "--unicodes=" + GLYPHS, "--flavor=woff2", "--layout-features=kern,tnum", "--no-hinting", "--desubroutinize", "--output-file=" + target])
        return b64(open(target, "rb").read())


def icon(path):
    from PIL import Image
    im = Image.open(path).convert("RGB").resize((144, 144), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=82, method=6)
    return b64(buf.getvalue())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", required=True, help="Pfad zum Sonaris-Projekt (enthält godot-3d/)")
    args = ap.parse_args()
    game = os.path.join(args.game, "godot-3d")
    if not os.path.exists(os.path.join(game, "models", "kai.glb")):
        sys.exit("godot-3d/models/kai.glb nicht gefunden unter " + args.game)
    data = {
        "kai": model(os.path.join(game, "models", "kai.glb"), {"FlipperLeft": 0, "FlipperRight": 0, "Tail": 0}),
        "lumen": model(os.path.join(game, "models", "lumen.glb")),
        "sfx": {name: sound(game, name) for name in SFX},
        "music": music(game),
        "font400": font(os.path.join(game, "assets", "ui-v16", "inter-400.ttf")),
        "font900": font(os.path.join(game, "assets", "ui-v17", "inter-black.ttf")),
        "icon": icon(os.path.join(game, "assets", "branding", "sonaris-kai-lumen.png")),
    }
    template = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    assert template.count("/*__DATA__*/") == 1
    html = template.replace("/*__DATA__*/", json.dumps(data, separators=(",", ":")))
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    sizes = {k: (len(json.dumps(v)) // 1024) for k, v in data.items()}
    print("sonaris.html: %d KB" % (len(html.encode("utf-8")) // 1024), sizes)
    for name, group in list(data["kai"].items()) + [("lumen", data["lumen"]["body"])]:
        print("  %-13s %5d Ecken %5d Dreiecke" % (name, group["verts"], group["tris"]))


if __name__ == "__main__":
    main()
