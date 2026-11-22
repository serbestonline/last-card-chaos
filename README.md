# Last Card Chaos

A fast, chaotic color-matching card game for **2 to 4 players**, played in the browser on your phones. One person runs a tiny server on their computer; everyone else just opens a link. No accounts, no app store, no dependencies.

[Türkçe aşağıda / Turkish below](#türkçe)

## Features

- Classic color-and-number matching with Skip, Reverse, +2, Wild and Wild +4 (108-card deck, 12 cards each)
- **Chaos wheel** every 10 turns: a player draws 4 to 10 cards, hands swap, a color gets banned or penalties double until the next wheel
- Stack +2 and +4 on each other, play several cards of the same kind at once
- 15-second turns with a countdown, "Last card!" calls you can get caught on, emoji reactions you can throw at friends
- Animations, sounds, background music and end-of-hand awards
- Turkish and English interface

## Quick start

You need [Node.js](https://nodejs.org) 18 or newer. Nothing else to install.

```bash
git clone https://github.com/serbestonline/last-card-chaos.git
cd last-card-chaos
npm start
```

The server prints the address to open. Everyone opens it on their phone, types a name and sits at the table; when everyone is in, someone presses **Start**.

### Language and port

The interface is in English by default. Whoever runs the server picks the language for everyone:

```bash
GAME_LANG=tr npm start
```

On Windows PowerShell:

```powershell
$env:GAME_LANG="tr"; npm start
```

The default port is 3333; change it with `PORT=4000 npm start`.

## Play together on the same Wi-Fi

If everyone is in the same place, nothing else is needed: phones on the same Wi-Fi open the `http://192.168.x.x:3333` address the server prints.

## Play online with friends (free Cloudflare tunnel)

If your friends are elsewhere, a free Cloudflare quick tunnel gives your local server a public `https://` link. No Cloudflare account is needed.

1. Install `cloudflared`:
   - macOS: `brew install cloudflared`
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Linux: download the package for your system from [Cloudflare's downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. Start the game in one terminal: `npm start`
3. In a second terminal, open the tunnel:

   ```bash
   cloudflared tunnel --url http://localhost:3333
   ```

4. Cloudflare prints a link like `https://some-random-words.trycloudflare.com`. Send it to your friends; everyone (you too) plays from that link.

Good to know:

- The link changes every time you start the tunnel.
- Keep both terminals open and the computer awake while you play.
- Quick tunnels are free and meant for testing; Cloudflare gives no uptime guarantee.
- Anyone with the link can join the table or reset it, so share it only with the people you play with.
- The game state is saved to `masa.json` after every move, so restarting the server does not lose the hand in progress.

## Rules

Match the top card by **color**, **number** or **symbol**. Wilds can be played on anything and let you pick the next color. First player to empty their hand wins the hand and scores the cards left in the others' hands (numbers at face value, Skip/Reverse/+2 = 20, Wilds = 50). First to **500 points** wins the game.

House rules that make it chaotic:

- **Same kind together:** play several cards of the same number or symbol in one move; the last one sets the color. Two Skips skip two players.
- **Draw, then play:** after drawing, you may play any matching card from your hand; if nothing matches, your turn passes.
- **Stacking:** a +2 or +4 can be answered with another +2 or +4; the total keeps growing until someone draws it all.
- **Last card!:** press it when you are down to one or two cards. If you forget, another player can catch you and you draw 2.
- **15-second turns:** if time runs out, the game draws for you and passes.
- **Chaos wheel:** every 10 turns the wheel spins. Slices: each player "draws 4 to 10", "swap hands", "penalties ×2" and color bans. Bans and ×2 last until the next wheel; at least one color always stays free.
- Tap an opponent's box to throw 🍅 😂 💀 🔥 at them.

## Development

```bash
npm test
```

runs thousands of random hands and the rule checks. The code is three small files: `game.js` (rules), `server.js` (HTTP server, no dependencies) and `public/index.html` (the whole interface). Texts live in `lang.js` (server) and at the top of the script in `index.html` (interface).

## Credits and license

All sounds and the music are CC0 (public domain); see [CREDITS.md](CREDITS.md). The code is released under the [MIT License](LICENSE).

---

## Türkçe

Telefonlarda tarayıcıdan oynanan, **2 ile 4 kişilik**, hızlı ve kaotik bir renk eşleme kart oyunu. Bir kişi kendi bilgisayarında küçük bir sunucu çalıştırır, diğerleri yalnız bir link açar. Hesap, uygulama mağazası ya da ek kurulum yok.

### Neler var

- Klasik renk ve sayı eşleme; Atla, Yön, +2, Joker ve Joker +4 (108 kart, herkese 12 kart)
- Her 10 sırada bir **kaos çarkı**: bir oyuncu 4 ile 10 arası kart çeker, eller el değiştirir, bir renk yasaklanır ya da cezalar bir sonraki çarka kadar ikiye katlanır
- +2 ve +4 birbirinin üstüne atılır; aynı türden kartlar birlikte atılır
- Geri sayımlı 15 saniyelik sıralar, unutursan yakalandığın "Tek!" çağrısı, arkadaşlarına fırlatabileceğin emojiler
- Animasyonlar, sesler, arka plan müziği ve el sonu ödülleri
- Türkçe ve İngilizce arayüz

### Hızlı başlangıç

[Node.js](https://nodejs.org) 18 ya da daha yenisi yeterli; başka bir şey kurmak gerekmez.

```bash
git clone https://github.com/serbestonline/last-card-chaos.git
cd last-card-chaos
GAME_LANG=tr npm start
```

Sunucu açılacak adresi yazar. Herkes onu telefonunda açar, adını yazıp masaya oturur; herkes gelince biri **Başlat**'a basar.

Arayüz varsayılan olarak İngilizcedir; `GAME_LANG=tr` ile herkes için Türkçe olur. Windows PowerShell'de: `$env:GAME_LANG="tr"; npm start`. Varsayılan port 3333; değiştirmek için `PORT=4000 npm start`.

### Aynı Wi-Fi'da oynamak

Herkes aynı yerdeyse başka bir şey gerekmez: aynı Wi-Fi'daki telefonlar sunucunun yazdığı `http://192.168.x.x:3333` adresini açar.

### Arkadaşlarla internetten oynamak (ücretsiz Cloudflare tüneli)

Arkadaşların başka yerdeyse Cloudflare'in ücretsiz hızlı tüneli, bilgisayarındaki sunucuya herkesin açabileceği bir `https://` linki verir. Cloudflare hesabı gerekmez.

1. `cloudflared`'ı kur:
   - macOS: `brew install cloudflared`
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Linux: sistemine uygun paketi [Cloudflare'in indirme sayfasından](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) indir
2. Bir terminalde oyunu başlat: `GAME_LANG=tr npm start`
3. İkinci bir terminalde tüneli aç:

   ```bash
   cloudflared tunnel --url http://localhost:3333
   ```

4. Cloudflare `https://rastgele-kelimeler.trycloudflare.com` gibi bir link yazar. Linki arkadaşlarına gönder; herkes (sen de) bu linkten oynar.

Bilmekte fayda var:

- Link, tüneli her açışında değişir.
- Oynarken iki terminal de açık, bilgisayar da uyanık kalmalı.
- Hızlı tüneller ücretsizdir ve deneme amaçlıdır; Cloudflare kesintisiz çalışma garantisi vermez.
- Linki bilen herkes masaya oturabilir ya da masayı sıfırlayabilir; linki yalnız birlikte oynadığın kişilerle paylaş.
- Oyun her hamleden sonra `masa.json` dosyasına kaydedilir; sunucuyu yeniden başlatmak süren eli silmez.

### Kurallar

Yerdeki karta **renk**, **sayı** ya da **sembolle** uyan bir kart at. Joker her şeyin üstüne atılır ve sonraki rengi sen seçersin. Elini ilk bitiren eli kazanır ve diğerlerinin elinde kalan kartlar kadar puan alır (sayılar kendi değeri, Atla/Yön/+2 20, jokerler 50). **500 puana** ilk ulaşan oyunu kazanır.

Oyunu kaotik yapan ev kuralları:

- **Aynı türden birlikte:** aynı sayı ya da sembolden birkaç kartı tek hamlede at; renk son kartın rengi olur. İki Atla iki kişiyi atlatır.
- **Çek, sonra at:** çektikten sonra elindeki uyan herhangi bir kartı atabilirsin; uyan yoksa sıra geçer.
- **Zincir:** +2 ya da +4'e başka bir +2 ya da +4 ile cevap verilir; ceza biri hepsini çekene kadar büyür.
- **Tek!:** bir ya da iki kartın kalınca bas. Unutursan başka bir oyuncu seni yakalar ve 2 kart çekersin.
- **15 saniyelik sıra:** süre dolarsa oyun senin yerine bir kart çeker ve sırayı geçirir.
- **Kaos çarkı:** her 10 sırada bir döner. Dilimler: her oyuncu için "4-10 kart çek", "eller değişir", "ceza ×2" ve renk yasakları. Yasak ve ×2 bir sonraki çarka kadar sürer; en az bir renk hep serbest kalır.
- Bir rakibin kutusuna dokunup ona 🍅 😂 💀 🔥 fırlatabilirsin.

### Geliştirme

`npm test` binlerce rastgele eli ve kural denemelerini çalıştırır. Kod üç küçük dosya: `game.js` (kurallar), `server.js` (bağımlılıksız HTTP sunucusu) ve `public/index.html` (bütün arayüz). Yazılar `lang.js`'te (sunucu) ve `index.html`'deki betiğin başında (arayüz) durur.

### Kaynaklar ve lisans

Bütün sesler ve müzik CC0 (kamu malı); ayrıntılar [CREDITS.md](CREDITS.md) dosyasında. Kod [MIT lisansıyla](LICENSE) paylaşılıyor.
