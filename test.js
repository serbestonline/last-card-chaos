// Rastgele oyunlar oynatır ve resmi kuralların belli durumlarını tek tek dener.
process.env.GAME_LANG = 'tr'; // testlerdeki hata eşleşmeleri Türkçe metne göre
const assert = require('assert');
const { COLORS, HAND, TURN_MS, newGame, act, playable, chaos: spin, settle, timeout } = require('./game');
const chaos = (g, force) => { spin(g, force); settle(g, Infinity); }; // testte çarkın durmasını beklemeden uygula
const total = g => g.draw.length + g.discard.length + g.players.reduce((s, p) => s + p.hand.length, 0);
const pick = a => a[Math.floor(Math.random() * a.length)];
const table = (n = 3) => [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }, { id: 'd', name: 'D' }].slice(0, n);

// 1) Rastgele eller: kart sayısı korunuyor, her el bitiyor.
for (let run = 0; run < 3000; run++) {
  const g = newGame(table(2 + (run % 3))); // 2, 3 ve 4 kişilik masalar sırayla
  assert(g.players.every(p => p.hand.length >= HAND));
  assert.notStrictEqual(g.discard[0].v, '+4');
  let moves = 0;
  while (!g.winner) {
    assert(++moves < 5000, 'el bitmedi');
    settle(g, Infinity); // çark sonucu hemen uygulansın
    const p = g.players[g.turn];
    if (Math.random() < 0.1 && g.catchable !== null) act(g, g.players[(g.catchable + 1) % g.players.length].id, { type: 'catch' });
    if (p.hand.length <= 2 && Math.random() < 0.5) act(g, p.id, { type: 'say' });
    if (g.stack && Math.random() < 0.3) act(g, p.id, { type: 'draw' });
    else if (g.color === null) act(g, p.id, { type: 'color', color: pick(COLORS.filter(x => !(g.bans || []).includes(x))) });
    else {
      const ban = c => g.bans && g.bans.includes(c.c);
      const ok = p.hand.filter(c => g.stack ? (c.v === '+2' || c.v === '+4') && !ban(c) : playable(g, c));
      if (ok.length) {
        const c = pick(ok);
        const same = Math.random() < 0.7 ? p.hand.filter(x => x !== c && x.v === c.v && !ban(x)) : [];
        act(g, p.id, { type: 'play', cards: [c.id, ...same.map(x => x.id)], color: pick(COLORS.filter(x => !(g.bans || []).includes(x))) });
      }
      else act(g, p.id, { type: g.stack || g.drawn === null ? 'draw' : 'pass' });
    }
    assert.strictEqual(total(g), 108);
  }
  assert(g.players.some(p => p.hand.length === 0));
}

// Belirli bir masa kurmak için yardımcı.
function rig(hands, topCard, color) {
  const g = newGame(table());
  g.turn = 0; g.dir = 1; g.stack = 0; g.moves = 0; g.bans = []; g.double = false; g.round = 1; g.catchable = null; g.drawn = null;
  g.discard = [topCard]; g.color = color;
  g.players.forEach((p, i) => { p.hand = hands[i]; p.said = false; p.stats = {}; }); // açılış +2'si sayaç bırakmasın
  return g;
}
const C = (id, c, v) => ({ id, c, v });

// 2) +4 zincire 4 ekler, meydan okuma yok: sıradaki ya zinciri sürdürür ya da cezayı çeker.
let g = rig([[C(1, null, '+4'), C(2, 'deniz', '5'), C(3, 'cimen', '1')], [C(4, 'gunes', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', card: 1, color: 'mercan' });
assert(g.stack === 4 && g.turn === 1);
assert.throws(() => act(g, 'b', { type: 'challenge' }), /\+2 ya da \+4 at/);
act(g, 'b', { type: 'draw' });
assert.strictEqual(g.players[1].hand.length, 1 + 4);
assert.strictEqual(g.turn, 2);

// 4) "Tek!" demeyen yakalanır (2 kart), sıradaki oynayınca yakalama süresi biter.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.catchable, 0);
act(g, 'c', { type: 'catch' });
assert.strictEqual(g.players[0].hand.length, 3);
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'say' });
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.catchable, null);
assert.throws(() => act(g, 'c', { type: 'catch' }), /Yakalanacak/);

// 5) Son kart +2: sıradaki yine 2 çeker ve puana sayılır (20 + 7 + 2 + 2 kart).
g = rig([[C(1, 'deniz', '+2')], [C(4, 'deniz', '7')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.draw = [C(10, 'cimen', '0'), C(11, 'cimen', '0')];
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.winner, 'A');
assert.strictEqual(g.players[1].hand.length, 3);
assert.strictEqual(g.gained, 7 + 2);

// 6) Çektikten sonra elden uygun kart atılır; elde uygun kart yoksa sıra kendiliğinden geçer.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.draw = [C(10, 'gunes', '9')];
act(g, 'a', { type: 'draw' });
assert.strictEqual(g.turn, 0);
assert.throws(() => act(g, 'a', { type: 'draw' }), /Zaten/);
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.turn, 1);
g = rig([[C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.draw = [C(10, 'gunes', '9')];
act(g, 'a', { type: 'draw' });
assert.strictEqual(g.turn, 1);

// 7) Aynı sayılar birlikte: renk sonuncudan gelir; farklı sayı ya da aksiyon kartı birlikte atılmaz.
g = rig([[C(1, 'deniz', '7'), C(2, 'mercan', '7'), C(3, 'cimen', '7'), C(6, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
assert.throws(() => act(g, 'a', { type: 'play', cards: [2, 1] }), /oynanmaz/);
assert.throws(() => act(g, 'a', { type: 'play', cards: [1, 6] }), /aynı türden/);
act(g, 'a', { type: 'play', cards: [1, 3, 2] });
assert.strictEqual(g.players[0].hand.length, 1);
assert.strictEqual(g.color, 'mercan');
assert.strictEqual(g.catchable, 0);
assert.strictEqual(g.turn, 1);
g = rig([[C(1, 'deniz', '+2'), C(2, 'mercan', '+2'), C(3, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', cards: [1, 2] }); // iki +2 birlikte: ceza 4
assert.strictEqual(g.stack, 4);
assert.strictEqual(g.color, 'mercan');

// 8) +2 zinciri: B +2 üstüne +2 atar, C'nin +2'si yok: 4 çeker ve sırası A'ya geçer; zincirde başka kart atılmaz.
g = rig([[C(1, 'deniz', '+2'), C(7, 'deniz', '9')], [C(2, 'mercan', '+2'), C(8, 'mercan', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.players[1].hand.length, 2);
assert.throws(() => act(g, 'b', { type: 'play', card: 8 }), /yalnız \+2 ya da \+4/);
act(g, 'b', { type: 'play', card: 2 });
assert.strictEqual(g.stack, 4);
assert.throws(() => act(g, 'c', { type: 'pass' }), /kart çek/);
act(g, 'c', { type: 'draw' });
assert.strictEqual(g.players[2].hand.length, 5);
assert.strictEqual(g.stack, 0);
assert.strictEqual(g.turn, 0);

// 9) Zincirde +2 üstüne +4, +4 üstüne +2; renge bakılmaz.
g = rig([[C(1, 'deniz', '+2'), C(7, 'deniz', '9')], [C(2, null, '+4'), C(8, 'mercan', '1')], [C(5, 'gunes', '+2'), C(6, 'gunes', '1')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', card: 1 });
act(g, 'b', { type: 'play', card: 2, color: 'cimen' }); // B'nin elinde deniz yok: kurala uygun
assert.strictEqual(g.stack, 6);
act(g, 'c', { type: 'play', card: 5 }); // Güneş +2, renk Çimen'di ama zincirde renge bakılmaz
assert.strictEqual(g.stack, 8);
act(g, 'a', { type: 'draw' });
assert.strictEqual(g.players[0].hand.length, 1 + 8);
assert.deepStrictEqual([g.penalty.name, g.penalty.n], ['A', 8]); // dalga geçme gösterisi için olay
assert.strictEqual(g.turn, 1);

// 10) İki Atla birlikte iki kişiyi atlar; iki Yön yönü değiştirmez.
g = rig([[C(1, 'deniz', 'skip'), C(2, 'mercan', 'skip'), C(3, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', cards: [1, 2] });
assert.strictEqual(g.turn, 0);
g = rig([[C(1, 'deniz', 'rev'), C(2, 'mercan', 'rev'), C(3, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
act(g, 'a', { type: 'play', cards: [1, 2] });
assert.strictEqual(g.dir, 1);
assert.strictEqual(g.turn, 1);

// 11) Kaos: eller yön sırasıyla el değiştirir; yasak renk oynanmaz; çift cezada +2 dört sayar.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2'), C(6, 'gunes', '3'), C(7, 'gunes', '4')]], C(0, 'deniz', '3'), 'deniz');
chaos(g, { kind: 'swap' });
assert.deepStrictEqual(g.players.map(p => p.hand.length), [3, 2, 1]); // A, C'nin elini aldı
assert.strictEqual(g.chaos.wheel[g.chaos.slot].kind, 'swap'); // çark gösterdiği dilimde durur
assert.strictEqual(g.chaos.wheel.length, 8);
assert.strictEqual(g.chaos.wheel.filter(w => w.kind === 'draw').length, 3); // her oyuncunun bir dilimi
assert(g.chaos.wheel.filter(w => w.kind === 'draw').every(w => w.n >= 4 && w.n <= 10));
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '3')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
chaos(g, { kind: 'ban', color: 'deniz' });
assert(!playable(g, C(1, 'deniz', '5')) && playable(g, C(2, 'cimen', '3')));
assert.throws(() => act(g, 'a', { type: 'play', card: 1 }), /yasak/);
act(g, 'a', { type: 'play', card: 2 });
g.draw = [C(20, 'gunes', '9'), C(21, 'gunes', '8')]; // uymayan kartlar: ikisi de çekip pas geçer
act(g, 'b', { type: 'draw' }); act(g, 'c', { type: 'draw' }); // bir tur geçti: yasak sürer
assert.deepStrictEqual(g.bans, ['deniz']);
g.moves = 9; // sonraki çark gelince yasak kalkar (yeni çark kendi etkisini getirebilir)
g.players[0].hand.push(C(30, 'cimen', '7'), C(31, 'cimen', '8'));
act(g, 'a', { type: 'play', card: 30 });
assert.throws(() => act(g, 'b', { type: 'draw' }), /Çark dönüyor/); // çark dururken hamle yok
settle(g, Infinity);
assert(g.chaos.seq >= 2 && !(g.bans.includes('deniz') && g.chaosLog.every(c => c.kind !== 'ban' || c.color !== 'deniz')));
g = rig([[C(1, 'deniz', '+2'), C(2, 'cimen', '3')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
chaos(g, { kind: 'double' });
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.stack, 4);

// En az bir renk hep serbest kalır: dördüncü yasak etkisizdir.
g = rig([[C(1, 'deniz', '5')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.bans = ['deniz', 'cimen', 'gunes']; // aynı kaos turunun önceki çevirmelerinden
spin(g, { kind: 'ban', color: 'mercan' }, 4); settle(g, Infinity); // dördüncü çevirme: önceki yasakları silmez
assert.deepStrictEqual(g.bans, ['deniz', 'cimen', 'gunes']);

// Yasaklı renk jokerle de seçilemez (tek joker ya da birlikte atılan jokerler).
g = rig([[C(1, null, 'wild'), C(2, null, 'wild'), C(3, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'mercan', '3'), 'mercan');
g.bans = ['deniz'];
assert.throws(() => act(g, 'a', { type: 'play', cards: [1, 2], color: 'deniz' }), /yasak/);
assert.throws(() => act(g, 'a', { type: 'play', card: 1, color: 'deniz' }), /yasak/);
act(g, 'a', { type: 'play', cards: [1, 2], color: 'cimen' });
assert.strictEqual(g.color, 'cimen');

// Çark bir oyuncuda durursa o oyuncu dilimdeki kadar kart çeker ve dalga gösterisi tetiklenir.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
chaos(g, { kind: 'draw', who: 1, n: 7 });
assert.strictEqual(g.players[1].hand.length, 1 + 7);
assert.deepStrictEqual([g.penalty.name, g.penalty.n], ['B', 7]);

// 12) 10 hamlede bir kaos turu kendiliğinden gelir.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.moves = 9; g.chaos = null;
act(g, 'a', { type: 'play', card: 1 });
assert(g.chaos && g.chaos.seq === 1 && Number.isInteger(g.chaos.slot));
assert.strictEqual(g.chaosPending.length, 1); // sonuç henüz uygulanmadı
assert.strictEqual(settle(g, Date.now()), false); // çark daha dönüyor
assert.strictEqual(settle(g, Date.now() + 5000), true); // durunca uygulanır
assert(g.turnStart > Date.now()); // çark dönerken süre işlemez

// Deste bitip yeniden karılınca deste turu artar; çark yine tek kez döner.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.round = 1; g.reshuffle = null;
g.discard = [C(40, 'mercan', '1'), C(41, 'mercan', '2'), C(0, 'deniz', '3')]; g.draw = [];
act(g, 'a', { type: 'draw' }); // deste boş: yerdekiler (üstteki hariç) karılıp deste olur
assert.strictEqual(g.round, 2);
assert.strictEqual(g.reshuffle.seq, 1);
assert.strictEqual(g.discard.length, 1);
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.moves = 9; g.chaos = null; g.chaosLog = []; g.round = 4;
act(g, 'a', { type: 'play', card: 1 });
assert.strictEqual(g.chaosLog.length, 1); // 4. destede de çark bir kez döner
assert.strictEqual(g.chaosPending.length, 1);

// 13) Süre dolunca oyun sıradaki adına çeker ve sırayı geçirir; zincir varsa cezayı çeker. Sayaçlar birikir.
g = rig([[C(1, 'deniz', '5'), C(2, 'cimen', '1')], [C(4, 'deniz', '1')], [C(5, 'gunes', '2')]], C(0, 'deniz', '3'), 'deniz');
g.turnStart = Date.now();
assert.strictEqual(timeout(g), false);
g.turnStart = Date.now() - TURN_MS - 1;
assert.strictEqual(timeout(g), true);
assert.strictEqual(g.players[0].hand.length, 3);
assert.strictEqual(g.turn, 1);
g.stack = 4; g.turnStart = 1; // çok eski bir an: süre çoktan dolmuş
timeout(g);
assert.strictEqual(g.players[1].hand.length, 1 + 4);
assert.strictEqual(g.stack, 0);
assert.strictEqual(g.players[1].stats.pen, 4);
assert.strictEqual(g.players[1].stats.slow, 1);

console.log('3000 rastgele el ve 13 kural denemesi geçti');
