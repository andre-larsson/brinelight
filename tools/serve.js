#!/usr/bin/env node
/* Tiny static file server for local play and the UI tests.
   Usage: node tools/serve.js [port=8873] [root=repo folder] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.mp3': 'audio/mpeg',
};

function serve(port, root) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) {
        if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); res.end(); return; }
        file = path.join(file, 'index.html');
      }
      fs.readFile(file, (err2, data) => {
        if (err2) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
        const head = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
        // a byte range, as a browser asks for when it seeks in a song
        const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (m && (m[1] || m[2])) {
          const last = data.length - 1;
          const start = m[1] ? +m[1] : Math.max(0, data.length - +m[2]); // "bytes=-N" is the last N bytes
          const end = m[1] && m[2] ? Math.min(+m[2], last) : last;
          if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); res.end(); return; }
          res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${data.length}` });
          res.end(data.subarray(start, end + 1));
          return;
        }
        res.writeHead(200, head);
        res.end(data);
      });
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

module.exports = { serve };

if (require.main === module) {
  const port = +(process.argv[2] || process.env.PORT || 8873);
  const root = process.argv[3] || path.join(__dirname, '..');
  serve(port, root).then(() => console.log(`Serving ${path.resolve(root)} at http://127.0.0.1:${port}/`));
}
