# TOWER 100 – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/tower100.html

Eine eigenständige HTML-Datei (327 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt werden die ersten drei Etagen des Escape-Room-Turms, jeweils komplett:

1. **Gesperrt.** Fremdes Handy: Nachricht lang drücken, Hintergrundfoto mit Kalender, nach oben wischen, PIN nach dem Datumsformat des Handys (Deutsch 0306, Englisch 0603). Bei vertauschtem Tag und Monat kommt „Fast!“. Die Taschenlampe zeigt den Goldschlüssel.
2. **Kurzschluss.** Vier Schalter, vier Lampen, halb abgerissener Schaltplan. A+B (oder C+D) machen Licht, die Tür geht auf, die Kreide-Eule erscheint. Wildes Schalten lässt die Sicherung fliegen.
3. **Hausmeisterzimmer.** Topf zur Seite ziehen, kleinen Schlüssel aus dem Inventar auf die Schublade ziehen (oder antippen, dann Ziel antippen), UV-Lampe über die Tiere, Foto für die Reihenfolge, Foto abnehmen (Goldschlüssel), Tresor 7-4-2, Schlüsselkarte.

Die gemalten Raumbilder, Item-Symbole, die Schrift Nunito (OFL, als Teilmenge) und das App-Symbol kommen aus dem Godot-Projekt. Titel, Hinweise und Item-Namen liest das Build-Skript aus den Spielskripten. Rätsellogik, Zeichnungen, Positionen und Texte sind aus `scripts/floors/floor_01–03.gd`, `scripts/floor_room.gd` und `scripts/ui/hot.gd` übertragen. Die Klänge erzeugt die Anzeige wie das Spiel mit den Formeln aus `scripts/sfx.gd`, deshalb sind keine Audiodateien eingebettet.

Oben rechts gibt es die drei Hinweise des Spiels je Etage, kostenlos und der Reihe nach. Das Handy im Inventar öffnet das Logbuch der Etage. Wer 15 s nichts tut, sieht die antippbaren Dinge kurz aufleuchten. Nach jeder Etage erscheint die Ergebnis-Karte des Spiels. Nach der dritten pulsiert der Store-Knopf.

## Bauen und prüfen

Im Werbung-Repo, mit dem Relic-Tower-Projekt (Python mit Pillow und fontTools):

```powershell
python playables/src/tower100/build.py --game "..\Mobile Games\Relic Tower"
$env:TOWER_GAME = "..\Mobile Games\Relic Tower"; node --test playables/src/tower100/test.cjs
python -m http.server 8106 --bind 127.0.0.1
```

Dann `http://localhost:8106/playables/tower100.html`. Sprachen sind Deutsch und Englisch wie im Spiel: `lang=de|en`, sonst die Gerätesprache (Deutsch bei `de`, sonst Englisch). `muted=1` startet stumm. `floor=2|3` öffnet eine spätere Etage, nur zum Prüfen. Ton läuft erst nach einer Nutzeraktion. Stummschalten, Seitenwechsel und Pause stoppen laufende Klänge.

Ausgehend: `wm:ready`, `wm:cleared` (`game: "tower100"`, `level` 1–3, einmal je Etage, `moves` = Berührungen) und `wm:cta` (Store-Ziel `org.relictower.awakening`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume`. Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. `wm:ready` geht raus, sobald Bilder und Schrift geladen sind und das erste Bild steht, spätestens 300 ms danach.

Geprüft: Tests für Lösungen gegen die Etagen-Skripte, die Schalter-Kombinationen von Etage 2, Klänge gegen `sfx.gd`, Brücke und Selbstständigkeit der Datei. Im Browser alle drei Etagen durchgespielt, mit falscher PIN, falschem Tresorcode, Ziehen aus dem Inventar, UV-Lampe und Goldschlüsseln. Außerdem Hoch- und Querformat, 320×560 und die Brücke im iframe. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden. Kippen (Fettspuren auf 0, 3, 6) funktioniert nur, wo die WebView `deviceorientation` liefert. Die Etage ist auch ohne Kippen lösbar.

## Einbinden

Aktiv (`tower100-playable`, zufällig gleichverteilt mit den anderen Demos) in `calm-arrow-puzzle-playables`, `dame-playables`, `drop-match-playables`, `muehle-playables`, `zip-werbe` und `kettro-werbe` (dort auch bei den Belohnungsanzeigen, erst ab dem Kettro-Build mit Ordner-Freigabe). Nicht in Arrow Puzzle, das seine Auswahl im Code sperrt, und nicht in Claw Machine Heroes, das auf Arrow Puzzle, Sort Rush und Königinnen festgelegt ist. Das Symbol liegt unter `images/icons/tower100.png`, weil die Apps es nicht mitliefern. Eintrag für weitere Configs:

```json
{
  "id": "tower100-playable",
  "kind": "game",
  "title": { "de": "TOWER 100", "en": "TOWER 100" },
  "tagline": { "de": "Drei echte Escape-Rooms – direkt hier lösen.", "en": "Three real escape rooms – solve them right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/tower100.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/tower100.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/tower100.html" }
  },
  "target": { "android": "org.relictower.awakening" },
  "accent": "#FFB547",
  "status": "live",
  "tags": ["playable", "puzzle"]
}
```

In TOWER 100 selbst nicht eintragen (`excludeSelf`).
