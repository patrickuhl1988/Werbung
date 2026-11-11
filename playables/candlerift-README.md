# CANDLERIFT – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/candlerift.html

Eine eigenständige HTML-Datei (ca. 400 KB), ohne externe Bibliotheken, Nachladen, Audiodateien oder Tracking. Gespielt wird eine verdichtete erste Tiefenschicht (Blätterkrone) mit Wächterkampf, etwa 45–70 Sekunden:

1. **Start.** Prolog-Bild aus dem Spiel (`public/story/intro.webp`), Tippen startet den Fall.
2. **Tutorial mit Zeitlupe.** Ziehen lenkt Lumi (relativ, ein Finger). Vor dem ersten Gegner läuft die Zeit langsam, bis man zur Seite wischt (Dash mit Zielhilfe wie im Spiel). Vor dem ersten durchgehenden Ast dasselbe mit Wisch nach unten (Sturzschlag, bricht den Ast, Schockring).
3. **Abstieg.** Äste mit Lücken, Dornbrut, Gepanzerte (nur Sturzschlag), Sporenknollen, Dornenranken, Krabbler auf Ästen, Lumen, Pollen. Tippen öffnet und schließt den Fallschirm. Wer lange frei fällt, erreicht Überschall (zerschmettert Gegner, Aufprall auf Ast kostet ein Blatt). Wer trödelt, wird von der Finsternis eingeholt.
4. **Dornmutter der Krone.** Banner mit `public/story/waechter-1.webp`. Lumi springt auf Prallkappen; drei Sturzschläge auf das Auge. Dornensalven, ab Treffer 1 Wurzelstacheln.
5. **Ergebnis.** Sieg: Lumen, Gegner, Zeit, Ausblick auf 25 Ebenen und 5 Wächter, CTA pulsiert. Niederlage: Neustart am letzten Abschnitt (Abstieg oder Wächterin).

Leben sind wie im Spiel Blütenblätter (5) und an Lumi selbst sichtbar. Farben aus `src/config/Palette.ts`, Namen und Prolog-Zitat aus `src/systems/I18n.ts`. Klänge werden mit WebAudio erzeugt.

## Bauen und prüfen

Im Werbung-Repo, mit dem Candlerift-Projekt (dessen Playwright verkleinert Keyart und Symbol):

```powershell
node playables/src/candlerift/build.cjs --game "D:\Claude\Down\lumenfall"
```

Schreibt `playables/candlerift.html` und `images/icons/candlerift.png`. Prüfen: `playables/src/candlerift/qa-host.html` öffnen (bettet die Anzeige im iframe ein, zeigt die Nachrichten, Knöpfe für mute/pause/resume). `lang=de|en` wählt die Sprache, sonst Gerätesprache (Deutsch bei `de`, sonst Englisch). `muted=1` startet stumm. `step=free|boss` springt nur zum Prüfen in den Abstieg oder zur Wächterin. Tastatur am Rechner: Pfeile lenken, ↓ Sturzschlag, Leertaste Dash, ↑ Fallschirm.

Ausgehend: `wm:ready` (`game: "candlerift"`), `wm:cleared` (`level: 1`, einmal nach dem Wächtersieg, `moves` = Gesten) und `wm:cta` (Store-Ziel `de.lumenfall.app`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume`. Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Ton läuft erst nach einer Nutzeraktion, Vibration nur nach Nutzeraktivierung.

Geprüft im Browser (Chromium, iframe): Start, Tutorial-Dash und Sturzschlag per Mauswisch, Abstieg, Wächterin mit drei Treffern, Siegkarte, Niederlage und „Nochmal“, CTA-Nachricht, Stummschalten über die Brücke, Hoch- und Querformat, keine Konsolenfehler. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Aktiv seit 11.11.2026 (`candlerift-playable`, zufällig gleichverteilt mit den anderen Demos) in allen Configs, die nur spielbare Demos zeigen: `arrow-puzzle-werbe`, `bellmoor-playables`, `calm-arrow-puzzle-playables`, `claw-machine-heroes-playables`, `dame-playables`, `drop-match-playables`, `feierabend-rush-playables`, `fundfieber-playables`, `kettro-werbe` (auch bei den Belohnungsanzeigen; ältere Kettro-Builds ohne Ordner-Freigabe übergehen sie), `koeniginnen-playables`, `muehle-playables`, `neon-ricochet-playables`, `pocket-planet-playables`, `pop-order-playables`, `quiznova-playables`, `relic-tower-playables`, `sonaris-playables`, `wuerfel-dungeon-werbe` und `zip-werbe`. Nicht in `lumenfall-werbe` (eigene App) und nicht in `claw-machine-heroes-werbe` (Werbemodul 1.0.0 ohne Demo-Darstellung, feste Auswahl). Configs mit Bild- und Videoanzeigen bleiben unverändert, weil ältere Module Nicht-Bilder als Video abspielen. Eintrag für weitere Configs:

```json
{
  "id": "candlerift-playable",
  "kind": "game",
  "title": { "de": "Candlerift", "en": "Candlerift" },
  "tagline": { "de": "Fallen, dashen, die Dornmutter stürzen – direkt hier.", "en": "Fall, dash and topple the Thornmother – right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/candlerift.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/candlerift.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/candlerift.html" }
  },
  "target": { "android": "de.lumenfall.app" },
  "accent": "#FFC64A",
  "status": "live",
  "tags": ["playable", "action"]
}
```
