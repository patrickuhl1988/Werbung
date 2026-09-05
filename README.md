# Werbung – Medien für das Werbemodul

Inhalt dieses Repos 1:1 hochladen (Ordnerstruktur beibehalten). Die Apps laden die Dateien über jsDelivr:

    mediaBase: https://cdn.jsdelivr.net/gh/patrickuhl1988/Werbung@main/

- `videos/`  In-App-Fassungen der Werbevideos (720p, volle Länge, ~1 MB) – `<id>-hoch.mp4` / `<id>-quer.mp4`
- `images/`  Website-Anzeigen als Standbild (JPG) – `<id>-hoch.jpg` / `<id>-quer.jpg` (Reserve; im Katalog laufen die Websites als Video mit Musik)
- `posters/` Standbilder, die vor dem Videostart gezeigt werden

Dateinamen = Katalog-IDs aus `core/catalog.ts` des Werbemoduls. Neue Medien: Datei mit passendem Namen hier ablegen,
Eintrag im Katalog – kein App-Update nötig (jsDelivr cacht bis zu 7 Tage; Änderung an bestehenden Dateien greift daher verzögert).

## config/ – Werbeeinstellungen pro Spiel

Eine JSON-Datei je App. Die App lädt ihre Datei bei jedem Start (raw.githubusercontent.com, Cache 5 Minuten) und
merkt sich die zuletzt geladene Fassung für Starts ohne Netz. Änderungen hier wirken also ohne neuen Build.

| Datei | App | Adresse in der App |
|---|---|---|
| `config/muehle-werbe-config.json` | Mühle Meister | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/muehle-werbe-config.json` |
| `config/dame-werbe-config.json` | Dame Meister | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/dame-werbe-config.json` |
| `config/lucky-catch-werbe-config.json` | Lucky Catch | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/lucky-catch-werbe-config.json` |
| `config/quiznova-werbe-config.json` | QuizNova | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/quiznova-werbe-config.json` |
| `config/arrow-puzzle-werbe-config.json` | Arrow Puzzle | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/arrow-puzzle-werbe-config.json` |
| `config/sort-rush-werbe-config.json` | Sort Rush | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/sort-rush-werbe-config.json` |
| `config/kiosk-simulator-werbe-config.json` | Kiosk Simulator | `https://raw.githubusercontent.com/patrickuhl1988/Werbung/main/config/kiosk-simulator-werbe-config.json` |
|  | LUMENFALL |  |
|  | Pop Order |  |
|  | Seifen Atelier (Soap Atelier) |  |
|  | SONARIS |  |
|  | NOVA KNOCK |  |
|  | Drop’n Match |  |
|  | NULLWEAVE |  |
|  | Zip |  |
|  | Würfel Dungeon |  |
|  | Königinnen |  |

Was sich einstellen lässt (alle Felder optional, fehlende behalten ihren Wert in der App):

- `enabled` – Hauptschalter (`false` = keine Werbung)
- `selectedIds` – welche Anzeigen, in dieser Reihenfolge (IDs aus dem Katalog: `muehle-meister`, `dame-meister`,
  `lucky-catch`, `tiefsee-tempel`, `quiznova`, `tvfussball`, `tvkinderprogramm`, `gta6guide`, `joker-studios`, …)
- `defaultUnlockSeconds` – Sekunden bis „Weiter“
- `sequenceLength` – Anzeigen pro Block, `rotation` – `sequential` oder `random`
- `trigger.everyGames` – nach jedem N-ten Spiel; `trigger.gameEndBehavior` `onDismiss` (erst nach Verlassen des
  Endbildschirms) oder `immediate`; `trigger.dismissMinSeconds` – Mindestzeit auf dem Endbildschirm
- `frequencyCapMinutes` – Mindestabstand zwischen zwei Blöcken, `graceGames` – werbefreie erste Spiele
- `muted` – Videos stumm starten

Falscher Typ (Text statt Zahl, unbekannter Modus) → das Feld wird ignoriert, der Rest gilt. Zahlen außerhalb des
erlaubten Bereichs werden auf die Grenze gesetzt (z. B. `everyGames: -5` → 1, `dismissMinSeconds: 99999` → 600).
JSON vor dem Speichern prüfen (z. B. jsonlint.com) – ein fehlendes Komma
macht die ganze Datei unlesbar, dann bleibt in der App der bisherige Stand.
