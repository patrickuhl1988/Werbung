# Werbung – Medien für das Werbemodul

Inhalt dieses Repos 1:1 hochladen (Ordnerstruktur beibehalten). Die Apps laden die Dateien über jsDelivr:

    mediaBase: https://cdn.jsdelivr.net/gh/patrickuhl1988/Werbung@main/

- `videos/`  In-App-Fassungen der Werbevideos (720p, volle Länge, ~1 MB) – `<id>-hoch.mp4` / `<id>-quer.mp4`
- `images/`  Website-Anzeigen als Standbild (JPG) – `<id>-hoch.jpg` / `<id>-quer.jpg` (Reserve; im Katalog laufen die Websites als Video mit Musik)
- `posters/` Standbilder, die vor dem Videostart gezeigt werden

Dateinamen = Katalog-IDs aus `core/catalog.ts` des Werbemoduls. Neue Medien: Datei mit passendem Namen hier ablegen,
Eintrag im Katalog – kein App-Update nötig (jsDelivr cacht bis zu 7 Tage; Änderung an bestehenden Dateien greift daher verzögert).
