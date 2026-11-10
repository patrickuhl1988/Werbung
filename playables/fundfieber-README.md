# FUNDFIEBER – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/fundfieber.html

Eine eigenständige HTML-Datei (1,2 MB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt wird **Spiel 1 „Sandfieber“** so, wie es ein neuer Spielstand zeigt: Nico läuft mit dem Metalldetektor über den Strand, die Spule markiert vergrabene Funde mit einem goldenen Ring, „Graben“ lässt ihn hingehen, graben und sieben, der Fund steigt aus dem Sieb. Drei Funde – Kronkorken, 50 Grano, Silberring – füllen das erste Ziel „Schnelle Hände · noch 5,00 Perla“. Danach kommt die Karte mit dem Hinweis, dass Sandfieber nur Spiel 1 von 5 ist, dem Store-Knopf und „Weitergraben“. Ablauf etwa 25 s.

Wer nur zuschaut, sieht trotzdem alles: Nach 4,5 s ohne Eingabe läuft Nico selbst zum nächsten Fund, später nach 4 s Leerlauf wieder. Jede Berührung übernimmt sofort.

## Was aus dem Spiel stammt

- **Nico** ist das 3D-Modell des Spiels (`models/nico_hero.glb`) mit seinen Animationen, im Spiel selbst freigestellt aufgenommen: Gehen in acht Richtungen, Stehen, Schaufel ziehen und graben, sieben, jubeln – samt der 3D-Schaufel und dem 3D-Sieb aus `field_fx.gd`. Die Aufnahme macht `scripts/promo/promo_director.gd` (Segment `l1_sprites`) mit derselben Kamera und demselben Licht wie im Spiel.
- **Kamera** wie `FactoryWorld`: orthografisch aus (10, 24, 16), Bildbreite 12 Felder, beim Graben 9,4 (`FieldDig.FOCUS_ZOOM`), Vorlauf `CAMERA_LEAD`.
- **Strandboden** ist `shaders/beach.gdshader`, Zeile für Zeile als WebGL-Shader: Sandkörnung, nasser Saum, Wellen, Schaum, Lichtnetz im Wasser, Fußspuren auf gescannten Feldern, Mulde auf ausgegrabenen. Die Helligkeit ist am Bildschirmfoto des Spiels ausgemessen.
- **Hütte, Palmen, Fackeln, Felsen** sind die Bilder aus `assets/gpt/world` an den Stellen und in den Größen aus `factory_world.gd`, mit denselben weichen Schatten. Nicos Schatten fällt wie unter der Sonne des Spiels (−52°, −32°).
- **Detektor**: Stange, Kästchen mit Blinklämpchen, Spule und türkiser Suchkreis nach `_tick_detector`; der Schwenk (±70 px, 85 px vor Nico) und das Scannen alle 0,12 s nach `player.gd` und `beach.gd`.
- **Graben und Sieben** nach `field_dig.gd` und `field_fx.gd`: Nico gräbt vom kamerafernen Nachbarfeld aus, Loch und Aushub wachsen mit dem Fortschritt, Sandklumpen fliegen beim Wurf vom Schaufelblatt auf den Haufen, Staub pufft, unter dem Sieb rieselt der Sandvorhang. Dauer wie im Spiel mit „Anfängertempo ×2“: rund 2 s Schaufel ziehen und graben, 2,5 s sieben.
- **Fund-Moment** wie `pop_find`: Lichtblitz, Sandring, Glanzstern, Funkeln, das Fundstück steigt auf; beim wertvollen Fund Goldfunken und Jubel.
- **HUD** in Farben, Maßen und Symbolen des Spiels (`hud_design.gd`, `assets/ui/hud_v2/*.svg`): Level und XP, Perla-Zähler, Zielzeile, „Signal · flach“, „Anfängertempo ×2 · noch n Funde“, Scanner- und Graben-Knopf, Joystick, Fortschritt „Graben … %“, Fundkarten („Strand gereinigt · +3 XP“, „NEU IM FUNDALBUM“) und die untere Leiste.
- **Fundnamen, Werte und Bilder** aus `data/finds.json`, `i18n/translations.csv` und `assets/gpt/icons`.
- **Klänge**: zwölf Aufnahmen des Spiels (Scanner, Spaten, Schaufelwurf, Sieb, Funde, Strand) mit den Pegeln aus dem Code und 20 s des ersten Strandradio-Senders als MP3.

## Was vereinfacht ist

- Es liegen acht Funde an festen Stellen; die ersten drei, die man ausgräbt, sind immer Kronkorken, 50 Grano und Silberring. Im Spiel ist der Strand 320 × 180 Felder groß und zufällig bestückt.
- Alle Ringe sind golden (flach). Tiefere Funde in Orange und Violett, zu tiefe Felder und der Timing-Ring beim Graben fehlen.
- Nico dreht sich in acht Richtungen statt stufenlos. Die Bildfolgen laufen mit 7,5 bis 10 Bildern je Sekunde.
- Shop, Bauen, Fabrik und Ziele öffnen nichts; ein Tipp darauf zeigt einen Hinweis auf die App. Radio, Tag und Nacht, Ebbe, Kisten, Aufträge und Serien kommen nicht vor.
- Der Sand in den Händen und „Sand: voll“ werden nicht gezeigt, das Ziel „Schnelle Hände“ lässt sich nicht kaufen.
- Der Ehering wird nicht gefunden; die Abschlusskarte sagt nur, dass er noch im Sand liegt.

## Bauen und prüfen

Im Werbung-Repo, mit dem Godot-Projekt daneben (Python mit Pillow, ffmpeg im Pfad):

```powershell
# 1. Nur wenn sich Nico oder seine Animationen geändert haben: im Spiel neu aufnehmen und packen
& $Godot --path <Projekt> --fixed-fps 30 -- --en --promo=l1_sprites --out=<Aufnahmeordner>
python playables/src/fundfieber/pack_sprites.py --capture <Aufnahmeordner> --quality 76
# 2. Anzeige bauen
python playables/src/fundfieber/build.py --game <Projekt>
python -m http.server 8107 --bind 127.0.0.1
```

Dann `http://localhost:8107/playables/src/fundfieber/qa-host.html`: Die Seite bettet die Anzeige wie das Werbemodul ein, schaltet Größen und Sprachen um und zeigt die Nachrichten der Brücke. `lang=de|en` wählt die Sprache, sonst die Gerätesprache mit Englisch als Rückfall. `muted=1` startet stumm. Nur zum Prüfen: `auto=1` lässt Nico sofort selbst laufen, `warp=<Sekunden>` spult den Selbstlauf vor, `end=1` zeigt die Abschlusskarte. Ton läuft erst nach einer Nutzeraktion.

Ausgehend: `wm:ready` (nach dem ersten Bild, spätestens nach 300 ms), `wm:cleared` (`game: "fundfieber"`, `level: 1`, einmal nach dem dritten Fund, mit `finds`, `perla` und `moves` = Berührungen) und `wm:cta` (Store-Ziel `com.novaknock.gravitydemolition`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (Objekt oder JSON-Text). Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Ohne Host fällt der Store-Knopf auf `mraid.open`, `FbPlayableAd.onCTAClick` bzw. `dapi.openStoreUrl` zurück. Die Anzeige vergibt selbst keine Belohnung.

Ohne WebGL bleibt der Boden einfarbig sandfarben, der Rest läuft unverändert. „Bewegung reduzieren“ schaltet Staub, Sandwürfe, Sandvorhang und Funken ab.

Geprüft im Browser (Edge, auch ohne Fenster): ganzer Selbstlauf bis zur Abschlusskarte in 24 s, Graben-Knopf ohne Signal (Hinweis), Fundkarten, Zielzeile, Deutsch und Englisch, Hochformat 520 × 1100 und 500 × 750, Querformat 900 × 420, Brücke im iframe (`wm:ready`, `wm:cta`), Klänge werden geladen. Nicht geprüft: echtes Handy, die native Android-WebView, Joystick und Tippen mit dem Finger, der Ton nach Gehör.

## Einbinden

Seit dem 10.11.2026 aktiv (`fundfieber-playable`, zufällig gleichverteilt mit den anderen Demos) in `arrow-puzzle-werbe`, `calm-arrow-puzzle-playables`, `claw-machine-heroes-playables`, `dame-playables`, `drop-match-playables`, `kettro-werbe` (dort auch bei den Belohnungsanzeigen), `koeniginnen-playables`, `muehle-playables`, `quiznova-playables`, `relic-tower-playables`, `sonaris-playables`, `wuerfel-dungeon-werbe` und `zip-werbe`. Sie erscheint nur in Builds, die jede Demo aus `/Werbung/playables/` zulassen (Werbemodul 1.2.0 bzw. Ordner-Freigabe); ältere Builds zeigen weiter ihre bisherige Auswahl. Nicht eingetragen in `claw-machine-heroes-werbe` (alte Builds mit fester Liste) und `fundfieber-playables` (eigenes Spiel). Das Symbol liegt unter `images/icons/fundfieber.png`. Eintrag für weitere Configs:

```json
{
  "id": "fundfieber-playable",
  "kind": "game",
  "title": { "de": "FUNDFIEBER", "en": "FUNDFIEBER" },
  "tagline": { "de": "Such mit dem Metalldetektor den Strand ab – direkt hier.", "en": "Sweep the beach with your metal detector – right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/fundfieber.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/fundfieber.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/fundfieber.html" }
  },
  "target": { "android": "com.novaknock.gravitydemolition" },
  "accent": "#009F93",
  "status": "live",
  "tags": ["playable", "simulation"]
}
```

In FUNDFIEBER selbst nicht eintragen (`excludeSelf`).
