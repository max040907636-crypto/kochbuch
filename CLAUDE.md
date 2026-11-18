# Löffelweise – Regeln für Claude

Max öffnet Löffelweise auf dem Handy als App-Icon über GitHub Pages:
https://max040907636-crypto.github.io/kochbuch/

## Bei JEDER Änderung (ohne dass Max fragen muss)
1. Änderung in `index.html` machen (eine Datei, Code auf Deutsch kommentiert).
2. `APP_VERSION` in `index.html` hochzählen (steht unter „Sync & Daten“).
3. `VERSION` in `sw.js` hochzählen (`loeffelweise-vX`), sonst merken die Handys nichts.
4. Testen: Handy (390 px) und PC, alle Fenster, keine JS-Fehler, Offline-Start.
5. Committen und auf `main` pushen.
6. Selbst prüfen, ob die Seite live die neue Version zeigt (eingebauter Browser auf Max' PC).
7. Wenn es auch die Claude-Version (Artifact 8e73a47c-…) gibt: beide gleich halten.

Max muss danach nichts tun: Die App lädt neue Versionen selbst, sobald sie
geöffnet wird oder wieder in den Vordergrund kommt (Service Worker, `updateViaCache: 'none'`).

## Daten
- Daten liegen im Browser (localStorage, Präfix `loeffelweise:`). Nie umbenennen, sonst sind Max' Daten weg.
- Keine persönlichen Daten ins Repo, es ist öffentlich.
