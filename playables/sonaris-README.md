# SONARIS – spielbare Anzeige

Live (nach dem Hochladen): https://patrickuhl1988.github.io/Werbung/playables/sonaris.html

Eine eigenständige HTML-Datei (542 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt wird das Minispiel **Ring-Jagd** der 3D-Fassung in einer echten 3D-Szene (WebGL, eigener kleiner Renderer): Kai schwimmt mit Lumen durch die Arena, acht Ringe tauchen nacheinander auf, jeder schenkt 2 s. Unterwegs liegen Muscheln, Dash und Echo funktionieren wie im Spiel. Nach dem achten Ring oder wenn die Zeit um ist, kommt die Ergebniskarte mit Store-Knopf und „Nochmal schwimmen“. Ablauf etwa 20–30 s.

Wer nur zuschaut, sieht trotzdem alles: Nach 4,5 s ohne Eingabe schwimmt Kai selbst los, später nach 4 s Leerlauf wieder. Jede Berührung übernimmt sofort.

## Was aus dem Spiel stammt

- **Kai und Lumen** sind die Modelle des Spiels (`godot-3d/models/kai.glb`, `lumen.glb`) mit ihren Farben, als quantisierte Dreiecksnetze eingebettet. Flossen und Schwanz bewegen sich nach den Formeln aus `scripts/player.gd`.
- **Schwimmen und Kamera** sind aus `scripts/player.gd` übertragen: Beschleunigung, Tempo 9, Dash mit 21 und drei Ladungen, Schräglage in Kurven, Kameraabstand 11, Blickwinkel 61° (70° im Dash).
- **Ringe** aus `scripts/ring_gate.gd` und `scripts/activities.gd`: Bahn, Radius 2,4, die drei Farben, Treffer-Toleranzen, der sanfte Zug zur Ringmitte, Kern-, Schein- und Treffer-Shader, Zeitbonus, Vorschau des übernächsten Rings.
- **Arena** wie `_build_arena` und `world_detail.gd`: 14 Bögen im Kreis, Felsen, große Bögen außen, Korallen, Wasserspiegel in 24 m Höhe. Meeresgrund mit dem Lichtnetz aus `shaders/seabed.gdshader`, Lichtbahnen aus `shaders/light_shafts.gdshader`, Licht und Nebel aus `scripts/world.gd`.
- **Muscheln und Fische** nach `Models.shell_model()` und `Models.fish()`. Das Echo läuft wie in `echo_response.gd` mit 30 m/s und lässt Muscheln in 24 m Umkreis aufglühen.
- **Klänge**: zwölf Aufnahmen des Spiels (Ring, Muschel, Dash, Echo, Erfolg …) und ein 24-s-Ausschnitt der Meridian-Musik als MP3.
- **Oberfläche** wie das Spiel-HUD: Schrift Inter, Luftreserve, Zeit, Wegweiser („↑ geradeaus · 4 m“), Schwimm-Stick links, Tasten rechts.

## Was vereinfacht ist

- Jeder fünfte Ring hängt im Spiel über dem Wasser. Hier bleiben alle acht unter Wasser.
- Die Runde endet nach acht Ringen. Im Spiel läuft sie, bis die Zeit um ist (Medaillen ab 18 Ringen).
- Die Kamera folgt Kai von selbst und die Höhe richtet sich nach dem nächsten Ring, wenn man „Auf“ und „Ab“ nicht drückt. Wischen rechts dreht die Kamera trotzdem wie im Spiel.
- Es gibt nur die Tasten Auf, Ab, Dash und Echo. Frequenzen, Aktion und Rolle fehlen.
- Korallen, Felsen und ferne Ruinen sind einfache Formen ohne Texturen. Die Gebäude der Stadt kommen nicht vor.
- Im Spiel liegen in der Ring-Jagd keine Muscheln. Hier zeigen sie das Sammeln aus der Stadt.

## Bauen und prüfen

Im Werbung-Repo, mit dem Sonaris-Projekt daneben (Python mit Pillow, fontTools und brotli; ffmpeg im Pfad für die Klänge):

```powershell
python playables/src/sonaris/build.py --game "..\Sonaris Die versunkene Stadt"
$env:SONARIS_GAME = "..\Sonaris Die versunkene Stadt"; node --test playables/src/sonaris/test.cjs
python -m http.server 8107 --bind 127.0.0.1
```

Dann `http://localhost:8107/playables/src/sonaris/qa-host.html`: Die Seite bettet die Anzeige wie das Werbemodul ein, schaltet Größen und Sprachen um und zeigt die Nachrichten der Brücke. `lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst die Gerätesprache mit Englisch als Rückfall. `muted=1` startet stumm. `auto=1` lässt Kai sofort selbst schwimmen (nur zum Prüfen). Ton läuft erst nach einer Nutzeraktion.

Ausgehend: `wm:ready` (nach dem ersten Bild, spätestens nach 300 ms), `wm:cleared` (`game: "sonaris"`, `level: 1`, einmal am Ende der Runde, mit `rings`, `shells` und `moves` = Berührungen) und `wm:cta` (Store-Ziel `com.sonaris.drownedcity`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (Objekt oder JSON-Text). Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Ohne Host fällt der Store-Knopf auf `mraid.open`, `FbPlayableAd.onCTAClick` bzw. `dapi.openStoreUrl` zurück. Die Anzeige vergibt selbst keine Belohnung.

Ohne WebGL zeigt die Anzeige nur die Karte mit dem Store-Knopf. Ist das Gerät zu langsam, rechnet sie schrittweise mit weniger Bildpunkten. „Bewegung reduzieren“ hält Lichtnetz, Ringpuls und Kameraschwung an.

Geprüft: 8 Tests (Größe, keine externen Adressen, Modelle, Klänge, sieben Sprachen, Brücke, Werte gegen `player.gd`, `ring_gate.gd`, `activities.gd`, `models.gd`). Im Browser: ganze Runde von selbst und mit Tastatur und Stick, Dash, Echo, Auf, Zeitablauf, Ergebniskarte, „Nochmal schwimmen“, Hochformat 320×568 und 390×780, Querformat 780×360, Brücke im iframe (`wm:ready`, `wm:cleared`, `wm:cta`, Pause, Stumm). Nicht geprüft: echtes Handy und die native Android-WebView, außerdem der Ton nach Gehör.

## Einbinden

Noch in keiner Config eingetragen. Eintrag für `creatives`:

```json
{
  "id": "sonaris-playable",
  "kind": "game",
  "title": { "de": "SONARIS", "en": "SONARIS" },
  "tagline": { "de": "Schwimm mit Kai durch die Ringe – direkt hier.", "en": "Swim through the rings with Kai – right here." },
  "icon": "icons/sonaris.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/sonaris.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/sonaris.html" }
  },
  "target": { "android": "com.sonaris.drownedcity" },
  "accent": "#74f7d2",
  "status": "live",
  "tags": ["playable", "adventure"]
}
```

In SONARIS selbst nicht eintragen (`excludeSelf`).
