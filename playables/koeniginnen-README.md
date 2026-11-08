# Königinnen – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/koeniginnen.html

Eine eigenständige HTML-Datei, ohne externe Bibliotheken, Audio-Downloads oder Tracking. Drei eindeutig lösbare Rätsel (5×5, 6×6, 6×6), erzeugt mit dem echten App-Generator; Eingaben, Auto-X, Undo und Siegprüfung verwenden die originalen Engine-Dateien. Regionspalette und Kronenpfade stammen ebenfalls aus der App. Zwölf WAV-Effekte sind bytegleich eingebettet, einschließlich der sechs aufsteigenden Platzierungstöne.

## Bauen und prüfen

Im Königinnen-Projekt:

```powershell
node scripts/playable/build.cjs
node --test scripts/playable/test.cjs
python -m http.server 8106 --bind 127.0.0.1 --directory playable
```

`http://localhost:8106/qa-host.html` prüft im iframe die Nachrichtenbrücke. `lang=de|en|es|fr|it|nl|pt` wählt die Sprache; sonst Gerätesprache, mit Englisch als Fallback. `muted=1` startet stumm. Sound startet erst nach einer Nutzeraktion; Stummschalten, Seitenwechsel und Pause stoppen laufende Effekte.

Ausgehend: `wm:ready`, `wm:cleared`, `wm:cta` (Store-Ziel `de.patrickuhl.koeniginnen`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume`. Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Die spielbare Anzeige vergibt selbst keine Kettro-Belohnung und setzt keinen eigenen Schließen-Countdown.

Fehler werden ausschließlich beim Tippen auf **Hinweis** geprüft. Die Markierung verschwindet mit der nächsten Aktion. Das normale Setzen gibt keine Aussage zur Richtigkeit ab.

## Kettro

Die Remote-Konfiguration wählt ausschließlich `arrow-puzzle-playable`, `sort-rush-playable`, `koeniginnen-playable`. Der erweiterte Godot-Adapter ordnet jedem Paket genau seine erlaubte GitHub-Pages-Datei zu und wählt mit jeweils 1/3 Wahrscheinlichkeit. Das ist keine feste Abfolge von drei Anzeigen.

**Benötigt einen neuen Kettro-App-Build (2.1.8 / Versionscode 24).** Ein Remote-Update allein kann die Paket-Allowlist bereits installierter älterer Builds nicht erweitern. Die bisherige Bildanzeige bleibt nur als technischer Fallback bei fehlender WebView oder Ladefehler erhalten.

Geprüft: eindeutige Rätsel, komplette Lösungen, Undo, Auto-X, einmalige Hinweise, Original-Audio-Hashes, Host-Brücke, Hoch-/Querformat; Godot-Verteilung 1000/1000/1000 bei 3000 gleichmäßig verteilten Stichproben; bestehende Kettro-Suite mit 8761 Prüfungen. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.
