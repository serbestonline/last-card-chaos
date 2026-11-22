const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { newGame, act, view, settle, timeout, stat } = require('./game');
const L = require('./lang');

const PORT = process.env.PORT || 3333;
const HTML = path.join(__dirname, 'public', 'index.html');
const SAVE = path.join(__dirname, 'masa.json');
let lobby = []; // {id, name}: masadaki herkes
let game = null;
try { // önceki masayı geri yükle; oyuncu nesneleri lobide ve oyunda aynı nesne olmalı
  ({ lobby, game } = JSON.parse(fs.readFileSync(SAVE, 'utf8')));
  if (game) game.players = game.players.map(p => Object.assign(lobby.find(q => q.id === p.id), p));
  if (game && game.pending4) { game.stack = 4; delete game.pending4; } // eski kayıt biçimi
  if (game && !game.winner) game.turnStart = Date.now(); // yeniden başlarken sıradaki tam süre alsın
  if (game && game.ban !== undefined) { game.bans = game.ban ? [game.ban.color] : []; game.double = !!game.double; delete game.ban; } // eski kayıt biçimi
} catch {}
const save = () => fs.writeFile(SAVE, JSON.stringify({ lobby, game }), () => {});

// Fırlatılan tepkiler oyun kaydına girmez; son birkaçı durumla birlikte telefonlara gider, sırayla numaralı.
const REACTS = ['🍅', '😂', '💀', '🔥'];
let reacts = [], reactSeq = 0;
const lastReact = {};

const stateFor = id => game ? { ...view(game, id), reacts }
  : { started: false, lang: L.code, lobby: lobby.map(p => p.name), joined: lobby.some(p => p.id === id) };

// Süre bekçisi: sırası gelen 15 saniyede oynamazsa oyun onun adına çeker ve sırayı geçirir.
// Çark sonucu da çark durunca burada uygulanır.
setInterval(() => { if (!game) return; const a = settle(game), b = timeout(game); if (a || b) save(); }, 300);

function body(req) {
  return new Promise((ok, no) => {
    let s = '';
    req.on('data', d => { s += d; if (s.length > 1e4) { req.destroy(); no(new Error(L.tooBig)); } });
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { no(new Error(L.badRequest)); } });
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(HTML).pipe(res);
    }
    if (req.method === 'GET' && url.pathname === '/logo.svg') { // logo: giriş ekranı ve sekme simgesi
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' });
      return fs.createReadStream(path.join(__dirname, 'public', 'logo.svg')).pipe(res);
    }
    const sesi = req.method === 'GET' && url.pathname.match(/^\/sounds\/([a-z0-9-]+\.mp3)$/); // oyun sesleri ve müzik
    if (sesi) {
      const f = path.join(__dirname, 'public', 'sounds', sesi[1]);
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': fs.statSync(f).size, 'Cache-Control': 'max-age=86400' });
      return fs.createReadStream(f).pipe(res);
    }
    // Telefonlar durumu saniyede bir sorar; canlı akış (SSE) Cloudflare tünelinde tamponlandığı için.
    if (req.method === 'GET' && url.pathname === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(stateFor(url.searchParams.get('id'))));
    }
    if (req.method !== 'POST') { res.writeHead(404); return res.end(); }

    const b = await body(req);
    let out = {};
    if (url.pathname === '/join') {
      const name = String(b.name || '').trim().slice(0, 16);
      if (!name) throw new Error(L.nameRequired);
      // shortcut: aynı isimle giren o oyuncunun yerine geçer (telefon yenilenince el kaybolmasın); arkadaş masası için yeterli
      const old = lobby.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (old) out = { id: old.id };
      else if (game && !game.winner) throw new Error(L.joinAfter);
      else if (lobby.length >= 4) throw new Error(L.full);
      else { out = { id: crypto.randomUUID() }; lobby.push({ id: out.id, name }); }
    } else if (url.pathname === '/start') {
      if (game && !game.winner) throw new Error(L.handRunning);
      if (lobby.length < 2) throw new Error(L.needTwo);
      if (game && game.champion) lobby.forEach(p => { p.score = 0; }); // 500'e ulaşıldı: yeni oyun sıfırdan
      game = newGame(lobby);
    } else if (url.pathname === '/act') {
      if (!game) throw new Error(L.notStarted);
      act(game, b.id, b);
    } else if (url.pathname === '/react') {
      if (!game) throw new Error(L.notStarted);
      const from = game.players.findIndex(p => p.id === b.id), to = b.to;
      if (from < 0 || !Number.isInteger(to) || to < 0 || to >= game.players.length || to === from || !REACTS.includes(b.e)) throw new Error(L.badReaction);
      if (Date.now() - (lastReact[from] || 0) < 600) throw new Error(L.slowDown);
      lastReact[from] = Date.now();
      reacts = [...reacts, { seq: ++reactSeq, from, to, e: b.e }].slice(-8);
      stat(game.players[from], 'react');
    } else if (url.pathname === '/reset') {
      game = null; lobby = [];
    } else { res.writeHead(404); return res.end(); }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(out));
    save();
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(L.started);
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list) if (a.family === 'IPv4' && !a.internal) console.log(`  http://${a.address}:${PORT}`);
});
