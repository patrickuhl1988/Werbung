# Calm Arrow Puzzle – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/calm-arrow-puzzle.html

Eine eigenständige HTML-Datei (312 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt werden drei echte Level aus Kapitel 1 der App: **Wal** (32 Pfeile), **Ruderboot** (31) und **Drachen** (42). Nach jedem Level erscheint die farbige Illustration des Motivs, wie in der App.

Regel wie im Spiel (`scripts/core/board.gd`, nach JavaScript übertragen): Ein Pfeil fliegt, wenn auf seiner Geraden bis zum Rand kein anderer Pfeil liegt. Farbgruppen, Ketten, Tore und Doppelspitzen sind mit übertragen, die drei Level nutzen sie nicht. Pfeilform (Strichbreite, Spitze, Rundung, Schatten), Tintenfarbe, Papierkarte, Herzen, Federn und Ausfahrt mit Nachziehen des Körpers folgen `scripts/ui/arrow_node.gd` und `board_view.gd`. Hintergrund „Küste“, Symbole und Icon stammen aus dem Spiel. Elf Originalklänge aus `assets/sfx` sind als M4A eingebettet, weil iOS-WebViews kein Vorbis dekodieren.

Ablauf: Hinweisfinger auf einem freien Pfeil → Tippen. Ein blockierter Pfeil kostet ein Herz, der Blocker blitzt rot, der Pfeil schüttelt sich. Ohne Herzen startet das Level neu. Nach 45 % der Pfeile oder 40 Sekunden fliegt der Rest von selbst („Super! Der Rest fliegt von selbst …“), damit ein Bild in rund 20 Sekunden fertig ist. Nach sieben Sekunden ohne Eingabe leuchtet ein freier Pfeil. **Tipp** zeigt sofort einen freien Pfeil, **Neu** startet das Level neu. Nach dem dritten Bild pulsiert der Store-Knopf.

## Bauen und prüfen

Im Werbung-Repo, mit dem Spielprojekt auf der Platte und ffmpeg im PATH:

```powershell
node playables/src/calm-arrow-puzzle/build.cjs "D:/Mobile Games/Neon Drift/game"
node --test playables/src/calm-arrow-puzzle/test.cjs
python -m http.server 8117 --bind 127.0.0.1
```

Dann `http://localhost:8117/playables/calm-arrow-puzzle.html` oder der Testhost `http://localhost:8117/playables/src/calm-arrow-puzzle/qa-host.html?sizes=320x480,480x320,375x667,760x400`. `lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst gilt die Gerätesprache mit Englisch als Fallback. `muted=1` startet stumm. Ton läuft erst nach einer Nutzeraktion. Stummschalten, Seitenwechsel und Pause stoppen laufende Klänge.

Ausgehend: `wm:ready` (`game: "calm-arrow-puzzle"`, nach dem ersten Bild, spätestens nach 600 ms), `wm:cleared` (`level` 1–3, `moves`) und `wm:cta` (Store-Ziel `com.neondrift.nightrun`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (als Objekt oder JSON-Text). Ohne Wirt fällt der Store-Knopf auf `mraid.open` / `FbPlayableAd` / `dapi` / Link zurück. Die Anzeige vergibt keine Belohnung und hat keinen eigenen Schließen-Countdown.

Geprüft am 09.11.2026: alle drei Level lösbar, Regeltest, sieben Sprachen vollständig, Klänge dekodieren; im Browser blockierter Pfeil mit Herzverlust, keine Herzen und Neustart, Selbst-Abräumen, Enthüllung, alle drei Bilder; Brücke im iframe (`wm:ready`, `wm:cleared` ×3, `wm:mute` als Objekt und Text, `wm:cta`); 320×480, 480×320, 375×667 und 760×400 ohne Scrollen, keine Konsolenfehler. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Seit 09.11.2026 als `calm-arrow-puzzle-playable` in `selectedIds` von:

| Config | Wirkt |
|---|---|
| `dame-playables-config.json` | in Dame Meister ab 1.8.0, sofern die App die Auswahl aus der Config liest (im App-Code nicht geprüft) |
| `muehle-playables-config.json` | erst mit einem neuen Mühle-Build: die App sperrt die Auswahl per `lockedConfig` (`lib/ads/adDefaultConfig.ts`) |
| `zip-werbe-config.json` | in Zip neben Arrow Puzzle, sofern die App Playables kennt (im App-Code nicht geprüft) |
| `arrow-puzzle-werbe-config.json` | erst mit einem Build, der die Auswahl aus der Config übernimmt (App sperrt sie per `lockedConfig`) |

Nicht eingetragen: Kettro (`integrations/kettro/promo.gd` lädt nur fest freigegebene Dateien je Paket) und Claw Machine Heroes (Auswahl im Adapter gesperrt). Beide brauchen dafür einen neuen Build. In Calm Arrow Puzzle selbst nie eintragen (`excludeSelf`).

Das Icon liegt als volle Adresse `https://patrickuhl1988.github.io/Werbung/images/icons/calm-arrow-puzzle.png` im Eintrag, weil es in den App-Paketen noch fehlt. Eintrag für weitere Configs:

```json
{
  "id": "calm-arrow-puzzle-playable",
  "kind": "game",
  "title": { "de": "Calm Arrow Puzzle", "en": "Calm Arrow Puzzle" },
  "tagline": { "de": "Pfeile wegtippen, Bild entdecken – direkt hier spielen.", "en": "Tap the arrows away, reveal the picture – play it right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/calm-arrow-puzzle.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/calm-arrow-puzzle.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/calm-arrow-puzzle.html" }
  },
  "target": { "android": "com.neondrift.nightrun" },
  "accent": "#63784F",
  "status": "live",
  "tags": ["playable", "puzzle"]
}
```

Playables nie über jsDelivr oder raw.githubusercontent.com laden (liefern `text/plain`).

## In Calm Arrow Puzzle selbst

Ab dem nächsten App-Build zeigt Calm Arrow Puzzle die Playables der anderen Spiele als freiwillige Belohnungsanzeige (Herz zurück). Auswahl: `config/calm-arrow-puzzle-playables-config.json`. Integration im Spielprojekt unter `game/android/neon_ads/` (Plugin `NeonAds`, Werbemodul 1.2.0-cmh.3 aus Claw Machine Heroes).
