// Last Card Chaos: renk ya da sembol eşleyerek elini ilk bitiren kazanır.
// Last Card Chaos: match the color or the symbol; first to empty their hand wins.
// Klasik 108 kartlık renk eşleme oyununun kuralları. Ev kuralları: 7 yerine 12 kart,
// aynı türden kartlar birlikte atılır, çektikten sonra elden herhangi bir uygun kart atılabilir,
// +2 ve +4 birbirinin üstüne atılır ve ceza birikir.
// Heyecan için: her tur 15 saniye (dolunca oyun o oyuncu adına çeker), her 10 hamlede bir kaos turu.
const COLORS = ['mercan', 'deniz', 'cimen', 'gunes'];
const HAND = 12;
const TARGET = 500;
const TURN_MS = 15000;
const CHAOS_EVERY = 10;
// İç adlar (mercan, deniz...) kayıtlarda ve kodda kalır; oyuncu Kırmızı, Mavi, Yeşil, Sarı görür.
const L = require('./lang'); // oyuncuya giden yazılar, GAME_LANG ile Türkçe ya da İngilizce
const NAMES = L.colors;
const LABEL = L.labels;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDeck() {
  const d = [];
  const add = (c, v) => d.push({ id: d.length, c, v });
  for (const c of COLORS) {
    add(c, '0');
    for (let k = 0; k < 2; k++) {
      for (let n = 1; n <= 9; n++) add(c, String(n));
      add(c, 'skip'); add(c, 'rev'); add(c, '+2');
    }
  }
  for (let k = 0; k < 4; k++) { add(null, 'wild'); add(null, '+4'); }
  return shuffle(d); // 108 kart
}

const top = g => g.discard[g.discard.length - 1];
const pick = a => a[Math.floor(Math.random() * a.length)];
const banned = (g, c) => !!g.bans && g.bans.includes(c.c); // kaos: bir sonraki çarka kadar yasak renkler
// Joker ve +4 ile seçilebilecek renkler: kaosta yasaklananlar seçilemez, yoksa yasak jokerle delinir.
const free = g => COLORS.filter(c => !(g.bans || []).includes(c));
function checkColor(g, color) {
  if (!COLORS.includes(color)) throw new Error(L.pickColor);
  if ((g.bans || []).includes(color)) throw new Error(L.bannedPick(NAMES[color]));
}
const playable = (g, c) => !banned(g, c) && (c.c === null || c.c === g.color || c.v === top(g).v);
// Gece ödülleri için oyuncu sayaçları; oyuncu nesnesinde durur, eller ve yeniden başlatmalar boyunca birikir.
function stat(p, k, n = 1) { p.stats = p.stats || {}; p.stats[k] = (p.stats[k] || 0) + n; }
const label = c => (c.c ? NAMES[c.c] + ' ' : '') + (LABEL[c.v] || c.v);
const points = c => /^\d$/.test(c.v) ? +c.v : c.c ? 20 : 50;

// n kart ver; deste biterse atılanlar (üstteki hariç) karılıp deste olur. Verilen sayıyı döner.
function take(g, p, n) {
  let got = 0;
  for (; got < n; got++) {
    if (!g.draw.length) {
      const t = g.discard.pop();
      g.draw = shuffle(g.discard);
      g.discard = [t];
      if (!g.draw.length) break;
      // Deste bitti ve yeniden karıldı: arayüz karıştırma gösterisini oynatsın diye numaralanır.
      g.round = (g.round || 1) + 1;
      g.reshuffle = { seq: ((g.reshuffle && g.reshuffle.seq) || 0) + 1, round: g.round };
    }
    p.hand.push(g.draw.pop());
  }
  if (got) p.said = false; // eli büyüyen yeniden "Tek!" demek zorunda
  return got;
}

// Ceza çektir (2 ve üstü): arayüz çekenle dalga geçen gösteriyi oynatsın diye olayı sırayla numaralar.
function penalize(g, p, n) {
  const got = take(g, p, n);
  stat(p, 'pen', got);
  if (got >= 2) g.penalty = { name: p.name, n: got, seq: ((g.penalty && g.penalty.seq) || 0) + 1 };
  return got;
}

function advance(g, steps = 1) {
  const n = g.players.length;
  g.turn = (((g.turn + g.dir * steps) % n) + n) % n;
  g.drawn = null;
  g.turnStart = Date.now();
  g.moves = (g.moves || 0) + 1;
}

// Kaos turu bir çarkıfelek ve her çevirmede yeniden kurulur: her oyuncu için "4-10 kart çek" dilimi,
// bir "eller değişir", bir "ceza iki katı", kalan dilimler rastgele renklerin yasağı (toplam 8, sırası karışık).
function buildWheel(g) {
  const segs = g.players.map((p, i) => ({ kind: 'draw', who: i, n: 4 + Math.floor(Math.random() * 7) }));
  segs.push({ kind: 'swap' }, { kind: 'double' });
  for (const color of shuffle([...COLORS]).slice(0, Math.max(0, 8 - segs.length))) segs.push({ kind: 'ban', color });
  return shuffle(segs);
}
// force yalnız testlerde verilir: { kind, color, who, n } ile sonucu sabitler.
// spins: bu kaos turunda kaçıncı çevirme; çarklar dönerken sıradakinin süresi işlemesin diye ek süre.
function chaos(g, force, spins = 1) {
  const wheel = buildWheel(g);
  let slot = force ? wheel.findIndex(w => w.kind === force.kind && (!force.color || w.color === force.color) && (force.who === undefined || w.who === force.who))
    : Math.floor(Math.random() * wheel.length);
  if (slot < 0) { wheel[0] = { ...force }; slot = 0; }
  if (force && force.n) wheel[slot].n = force.n;
  const w = wheel[slot];
  g.chaos = { ...w, slot, wheel, seq: ((g.chaos && g.chaos.seq) || 0) + 1 };
  g.chaosLog = [...(g.chaosLog || []), g.chaos].slice(-8); // arayüz art arda gelen çevirmeleri sırayla oynatır
  g.turnStart = Date.now() + 6500 * spins;
  // Sonuç çark durunca uygulanır (çark 4 sn döner, ikinci çevirme 6 sn sonra başlar); o zamana kadar hamle yapılmaz.
  g.chaosPending = [...(g.chaosPending || []), { w, at: Date.now() + 4300 + (spins - 1) * 6000, clear: spins === 1 }];
}

// Vakti gelen çark sonuçlarını uygular; bir şey uyguladıysa true döner. Testler now = Infinity verir.
function settle(g, now = Date.now()) {
  let done = false;
  while (g.chaosPending && g.chaosPending.length && g.chaosPending[0].at <= now) {
    const { w, clear } = g.chaosPending.shift();
    if (clear) { g.bans = []; g.double = false; } // önceki çarkın kalıcı etkileri yeni çarkla biter
    applyChaos(g, w);
    done = true;
  }
  return done;
}

function applyChaos(g, w) {
  const n = g.players.length;
  if (w.kind === 'swap') { // herkesin eli oyun yönünde bir sonrakine geçer
    const hands = g.players.map(p => p.hand);
    g.players.forEach((p, i) => { p.hand = hands[(((i - g.dir) % n) + n) % n]; p.said = false; });
    g.catchable = null;
    g.chaos.text = L.swapped;
  } else if (w.kind === 'ban') { // yasak ve çift ceza bir sonraki çarka kadar sürer
    const bans = g.bans || [];
    if (!bans.includes(w.color) && bans.length >= COLORS.length - 1) { // en az bir renk serbest kalmalı, yoksa oyun kilitlenir
      g.chaos.text = L.banBlocked(NAMES[w.color]);
    } else {
      g.bans = [...new Set([...bans, w.color])];
      g.chaos.text = L.banned(NAMES[w.color]);
    }
  } else if (w.kind === 'double') {
    g.double = true;
    g.chaos.text = L.doubled;
  } else { // çark birini seçti: o oyuncu dilimdeki kadar kart çeker
    const p = g.players[w.who];
    penalize(g, p, w.n);
    if (g.catchable === w.who) g.catchable = null;
    g.chaos.text = L.drewN(p.name, w.n);
  }
  g.log += ` · ${L.chaos}: ${g.chaos.text}`;
}
// Hamle bitince: 10 hamlede bir kaos turu (el bitmediyse).
function afterMove(g, before) {
  if (g.winner || Math.floor((g.moves || 0) / CHAOS_EVERY) <= Math.floor((before || 0) / CHAOS_EVERY)) return;
  chaos(g); // çark her kaos turunda bir kez döner
}

// Süre dolduysa oyun sıradaki adına oynar: renk seçilmemişse rastgele seçer, zincir varsa cezayı,
// yoksa bir kart çeker ve sırayı geçirir. Bir şey yaptıysa true döner.
function timeout(g, now = Date.now()) {
  if (g.winner || !g.turnStart || now - g.turnStart < TURN_MS || (g.chaosPending && g.chaosPending.length)) return false;
  const p = g.players[g.turn], before = g.moves;
  stat(p, 'slow');
  if (g.color === null) g.color = pick(free(g));
  let msg = L.timeout(p.name);
  if (g.stack) { msg += L.timeoutDrew(penalize(g, p, g.stack)); g.stack = 0; }
  else if (g.drawn === null) { take(g, p, 1); msg += L.timeoutDrew(1); }
  g.catchable = null;
  g.log = msg;
  g.timeouts = (g.timeouts || 0) + 1;
  advance(g);
  afterMove(g, before);
  return true;
}

// players: masadaki oyuncu nesneleri; el ve puan bunların üstünde tutulur, puan eller arasında birikir.
function newGame(players) {
  const n = players.length;
  const dealer = Math.floor(Math.random() * n);
  const g = { players, draw: makeDeck(), discard: [], color: null, dir: 1, drawn: null, turn: (dealer + 1) % n,
    winner: null, champion: null, gained: 0, stack: 0, last: null, catchable: null, log: L.dealt(players[dealer].name),
    turnStart: Date.now(), moves: 0, bans: [], double: false, chaos: null, round: 1, reshuffle: null };
  for (const p of players) { p.hand = []; p.said = false; p.score = p.score || 0; take(g, p, HAND); }

  let first;
  while ((first = g.draw.pop()).v === '+4') { g.draw.push(first); shuffle(g.draw); } // +4 açılırsa desteye döner
  g.discard.push(first);
  g.color = first.c; // joker açılırsa ilk oyuncu rengi seçer (color null kalır)
  if (first.v === 'skip') { g.log += ` · ${L.skipped(players[g.turn].name)}`; advance(g); }
  if (first.v === 'rev') { g.dir = -1; g.turn = dealer; g.log += ` · ${L.dealerStarts}`; }
  if (first.v === '+2') { g.log += ` · ${L.drewN(players[g.turn].name, 2)}`; penalize(g, players[g.turn], 2); advance(g); }
  return g;
}

function endHand(g, p) {
  g.winner = p.name;
  g.gained = g.players.reduce((s, q) => s + q.hand.reduce((t, c) => t + points(c), 0), 0);
  p.score += g.gained;
  if (p.score >= TARGET) g.champion = p.name;
  g.log = L.handWon(p.name, g.gained);
}

function act(g, pid, a) {
  const before = g.moves;
  play(g, pid, a);
  afterMove(g, before);
}

function play(g, pid, a) {
  if (g.winner) throw new Error(L.handOver);
  const me = g.players.findIndex(p => p.id === pid);
  if (me < 0) throw new Error(L.notSeated);
  const p = g.players[me];

  // Sıra beklemeyen iki hamle: "Tek!" demek ve demeyeni yakalamak.
  if (a.type === 'say') {
    if (p.hand.length > 2) throw new Error(L.tooEarly);
    p.said = true;
    if (g.catchable === me) g.catchable = null;
    g.log = L.saidOne(p.name);
    return;
  }
  if (a.type === 'catch') {
    const t = g.catchable;
    if (t === null || t === me) throw new Error(L.nobodyToCatch);
    const v = g.players[t];
    penalize(g, v, 2);
    g.catchable = null;
    g.log = L.caught(p.name, v.name);
    return;
  }

  if (g.chaosPending && g.chaosPending.length) throw new Error(L.wheelSpinning);
  if (me !== g.turn) throw new Error(L.notYourTurn);

  if (g.color === null) { // açılış kartı joker
    if (a.type !== 'color') throw new Error(L.pickColorFirst);
    checkColor(g, a.color);
    g.color = a.color;
    g.log = L.choseColor(p.name, NAMES[a.color]);
    g.turnStart = Date.now();
    return;
  }

  // Ev kuralı, ceza zinciri: +2 ya da +4 üstüne +2 ya da +4 atılır, ceza birikir. Sıradaki ya zinciri
  // sürdürür ya da biriken cezayı çekip sırasını kaybeder. Meydan okuma yok.
  if (g.stack) {
    if (a.type === 'draw') {
      g.catchable = null;
      g.log = L.drewN(p.name, penalize(g, p, g.stack));
      g.stack = 0;
      advance(g);
      return;
    }
    if (a.type !== 'play') throw new Error(L.stackOrDraw(g.stack));
  }

  if (a.type === 'draw') {
    if (g.drawn !== null) throw new Error(L.alreadyDrew);
    g.catchable = null;
    // Ev kuralı: çektikten sonra elde oynanabilir hangi kart varsa atılabilir; hiç yoksa sıra geçer.
    if (take(g, p, 1) && p.hand.some(c => playable(g, c))) {
      g.drawn = p.hand[p.hand.length - 1].id;
      g.log = L.drew(p.name);
      g.turnStart = Date.now(); // çektikten sonra karar için yeni süre
    } else {
      g.log = L.drewPass(p.name);
      advance(g);
    }
    return;
  }
  if (a.type === 'pass') {
    if (g.drawn === null) throw new Error(L.drawFirst);
    g.catchable = null;
    g.log = L.passed(p.name);
    advance(g);
    return;
  }
  if (a.type !== 'play') throw new Error(L.invalid);

  // Ev kuralı: aynı türden kartlar (aynı sayı, Atla, Yön, +2, +4, Joker) tek hamlede birlikte atılır;
  // ilki yere uymalı, renk sonuncudan gelir, etkiler kart sayısı kadar katlanır.
  const ids = Array.isArray(a.cards) ? a.cards : [a.card];
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error(L.invalid);
  const cards = ids.map(id => p.hand.find(x => x.id === id));
  if (cards.some(x => !x)) throw new Error(L.notInHand);
  const c = cards[0], last = cards[cards.length - 1], k = cards.length;
  if (!cards.every(x => x.v === c.v)) throw new Error(L.sameKind);
  const yasak = cards.find(x => banned(g, x));
  if (yasak) throw new Error(L.bannedNow(NAMES[yasak.c]));
  if (g.stack) { if (c.v !== '+2' && c.v !== '+4') throw new Error(L.stackOnly); }
  else if (!playable(g, c)) throw new Error(L.cantPlay);
  if (c.c === null) checkColor(g, a.color);

  g.catchable = null;
  for (const x of cards) p.hand.splice(p.hand.indexOf(x), 1);
  g.discard.push(...cards);
  g.last = { by: me, cards }; // arayüz kartı atanın kutusundan uçursun diye
  g.color = last.c || a.color;
  g.log = `${p.name}: ${cards.map(label).join(' + ')}` + (c.c ? '' : ` → ${NAMES[g.color]}`);
  if (c.v === '+2' || c.v === '+4') { g.stack += (c.v === '+2' ? 2 : 4) * k * (g.double ? 2 : 1); stat(p, 'chain', k); }
  if (k > 1) stat(p, 'combo');

  const n = g.players.length;
  if (!p.hand.length) { // son kart +2/+4 ise sıradaki biriken cezayı yine çeker, puana sayılır
    if (g.stack) { advance(g); penalize(g, g.players[g.turn], g.stack); }
    g.stack = 0;
    return endHand(g, p);
  }
  if (p.hand.length === 1 && !p.said) g.catchable = me;

  if (c.v === 'rev') { if (k % 2) g.dir *= -1; advance(g, n === 2 && k % 2 ? 2 : 1); }
  else if (c.v === 'skip') advance(g, 1 + k);
  else if (g.stack) { advance(g); g.log += ` · ${L.nextStack(g.players[g.turn].name, g.stack)}`; }
  else advance(g);
}

const AWARDS = [['pen', '🤡'], ['chain', '⛓️'], ['slow', '🐌'], ['react', '🍅'], ['combo', '🎯']].map(([k, e]) => [k, e, ...L.awards[k]]);
// Gece ödülleri: her sayacın en yükseği (sıfırsa ödül yok).
const awards = players => AWARDS.map(([k, e, title, unit]) => {
  const v = p => (p.stats && p.stats[k]) || 0;
  const best = players.reduce((b, p) => v(p) > v(b) ? p : b, players[0]);
  return v(best) ? { e, title, name: best.name, n: v(best), unit } : null;
}).filter(Boolean);

// Oyuncuya yalnız kendi elini göster.
function view(g, pid) {
  const me = g.players.findIndex(p => p.id === pid);
  const mine = me >= 0 ? g.players[me] : null;
  return {
    started: true, lang: L.code, me, hand: mine ? mine.hand : [], said: mine ? mine.said : false,
    players: g.players.map(p => ({ name: p.name, count: p.hand.length, score: p.score })),
    top: top(g), under: g.discard.slice(-6, -1), color: g.color, turn: g.turn, dir: g.dir, pile: g.draw.length,
    drawn: me === g.turn ? g.drawn : null, stack: g.stack, penalty: g.penalty || null, last: g.last, catchable: g.catchable,
    winner: g.winner, champion: g.champion, gained: g.gained, target: TARGET, log: g.log,
    turnStart: g.turnStart, turnMs: TURN_MS, now: Date.now(), bans: g.bans || [], double: !!g.double,
    chaos: g.chaos || null, chaosLog: g.chaosLog || [], chaosIn: CHAOS_EVERY - ((g.moves || 0) % CHAOS_EVERY), reshuffle: g.reshuffle || null, timeouts: g.timeouts || 0, awards: awards(g.players),
  };
}

module.exports = { COLORS, HAND, TURN_MS, newGame, act, view, playable, chaos, settle, timeout, stat };
