#!/usr/bin/env node
/**
 * Kleiner statischer Server zum Prüfen der Anzeige (auf dieser Maschine gibt es kein Python):
 *   node playables/src/feierabend-rush/serve.cjs [ordner] [port]
 * Standard: Repo-Wurzel, Port 8117. Dann
 *   http://localhost:8117/playables/feierabend-rush.html
 *   http://localhost:8117/playables/src/feierabend-rush/qa-host.html
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', '..'));
const PORT = Number(process.env.PORT || process.argv[3] || 8117);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.cjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css' };
http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^[\\/]+/, '');
  const file = path.join(ROOT, p || 'index.html');
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}/  (${ROOT})`));
