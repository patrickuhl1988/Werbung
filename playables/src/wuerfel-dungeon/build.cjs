/**
 * Baut playables/wuerfel-dungeon.html – die spielbare Anzeige für Würfel Dungeon (Dice Dungeon).
 *
 *   node playables/src/wuerfel-dungeon/build.cjs ["D:/Claude/Würfel Dungeon"]
 *
 * Aus dem Spielprojekt kommen: Kampfhintergründe (godot/art/painted), App-Symbol, die Schriften
 * Cinzel und Inter (fonts/*.woff2) und alle Spielbegriffe in neun Sprachen (Kombos, Gegner, Ansagen):
 * Deutsch/Englisch aus godot/data/game-data.json, die übrigen aus godot/data/locales/<lang>.json.
 * Die Figuren in sprites/ sind aus den 3D-Modellen des Spiels gerendert (godot/tests/playable_render.gd).
 * Braucht ffmpeg im PATH. Ergebnis: eine einzelne HTML-Datei ohne Netzwerkzugriffe.
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const GAME = process.argv[2] || 'D:/Claude/Würfel Dungeon';
const HERE = __dirname;
const OUT = path.resolve(HERE, '..', '..', 'wuerfel-dungeon.html');
const LANGS = ['de', 'en', 'fr', 'it', 'es', 'th', 'ko', 'ja', 'zh'];

/** Spielbegriffe: Schlüssel in game-data.json (de/en) und englischer Quelltext für locales/<lang>.json. */
const OFFICIAL = {
  room: ['room', 'Room {n}/10'],
  bossRoom: ['banner.boss', 'ROOM {n} · BOSS'],
  cleared: ['banner.roomCleared', 'ROOM {n} CLEARED'],
  you: ['you', 'You'],
  attack: ['attack', 'Attack'],
  shield: ['shield', 'Shield'],
  heal: ['heal', 'Heal'],
  reroll: ['reroll', 'Reroll ({n})'],
  endTurn: ['endTurn', 'End Turn'],
  nextTurn: ['nextTurn', 'Next turn'],
  where: ['hintWhere', 'Where to? Attack, Shield or Heal'],
  roar: ['roar', 'Roars'],
  roarSub: ['roarSub', 'gathering power'],
  curse: ['intent.curse', 'Curse'],
  weaken: ['intent.weaken', 'Weaken'],
  poison: ['intent.poison', 'Poison'],
  fBlocked: ['float.blocked', 'Blocked!'],
  fCurse: ['float.curse', 'Curse!'],
  fWeak: ['float.weak', 'Weakened!'],
  fPoison: ['float.poison', 'Poison!'],
  victory: ['end.win', 'Victory!'],
  fell: ['end.lose', 'You Fell'],
  tagline: ['tagline', '5 dice. 10 rooms. One fate.'],
  pasch: ['combos.pasch', 'Pair'],
  drilling: ['combos.drilling', 'Triple'],
  vierling: ['combos.vierling', 'Four of a Kind'],
  fuenfling: ['combos.fuenfling', 'Five of a Kind'],
  kstrasse: ['combos.kstrasse', 'Small Straight'],
  gstrasse: ['combos.gstrasse', 'Large Straight'],
  fullhouse: ['combos.fullhouse', 'Full House'],
  bVierling: ['banner.vierling', 'FOUR OF A KIND!'],
  bFuenfling: ['banner.fuenfling', 'FIVE OF A KIND!'],
  bGstrasse: ['banner.gstrasse', 'LARGE STRAIGHT!'],
};
const ENEMY_NAMES = { slime: 'Slime Lob', kobold: 'Bone Kobold', eater: 'The Dice Devourer' };

/** Store-Namen wie im Play-Eintrag (docs/store/listings-current.json, ohne Suchbegriff-Zusatz). */
const STORE_NAME = { de: 'Würfel Dungeon', en: 'Dice Dungeon', fr: 'Donjon des Dés', it: 'Dungeon dei Dadi', es: 'Mazmorra de Dados', th: 'ดันเจี้ยนลูกเต๋า', ko: '주사위 던전', ja: 'ダイスダンジョン', zh: '骰子地牢' };

/** Texte nur für die Anzeige (Anleitung, Vorschau, Endkarte). */
const AD = {
  de: { g1: 'Ein Pasch! Tippe auf Angriff.', g2: 'Halte die zwei Vieren (antippen) und würfle neu.', g3: 'Vierling! Der Schleim ist so gut wie erledigt.', noCombo: 'Keine Kombo – halte Würfel und würfle neu.', stuck: 'Keine Kombo mehr – Zug beenden.', autoEnd: 'Zug endet …', hold: 'Tippe Würfel an, um sie zu halten.', enemyTo: 'Gegner → {n}', noHit: 'Kein Treffer', hitFor: 'Treffer −{n}', hpTo: 'LP → {n}', allIn: 'Alles auf Angriff: +20 %', heals: 'heilt', blocks: 'blockt', endWin: 'Der Würfelfresser ist besiegt!', endWinText: 'Raum 6 bis 10, das Auge der Sechs, dein Lager und tägliche Dungeons warten in der App.', endLoseText: 'Der Würfelfresser war stärker. Revanche?', retry: 'Revanche', again: 'Noch einmal', cta: 'Jetzt spielen', adLabel: 'Spielbare Anzeige · JOCULUS', soundOn: 'Ton an', soundOff: 'Ton aus' },
  en: { g1: 'A pair! Tap Attack.', g2: 'Hold the two fours (tap them) and reroll.', g3: 'Four of a kind! The slime is as good as done.', noCombo: 'No combo – hold dice and reroll.', stuck: 'No combo left – end your turn.', autoEnd: 'Turn ends …', hold: 'Tap dice to hold them.', enemyTo: 'Enemy → {n}', noHit: 'No hit', hitFor: 'Hit −{n}', hpTo: 'HP → {n}', allIn: 'All-in attack: +20%', heals: 'heals', blocks: 'blocks', endWin: 'The Dice Devourer is beaten!', endWinText: 'Rooms 6 to 10, the Eye of Six, your camp and daily dungeons await in the app.', endLoseText: 'The Dice Devourer was stronger. Rematch?', retry: 'Rematch', again: 'Play again', cta: 'Play now', adLabel: 'Playable ad · JOCULUS', soundOn: 'Sound on', soundOff: 'Sound off' },
  fr: { g1: 'Une paire ! Touche Attaque.', g2: 'Garde les deux 4 (touche-les) et relance.', g3: 'Carré ! Le slime est presque vaincu.', noCombo: 'Aucune combinaison – garde des dés et relance.', stuck: 'Plus de combinaison – fin du tour.', autoEnd: 'Fin du tour …', hold: 'Touche les dés pour les garder.', enemyTo: 'Ennemi → {n}', noHit: 'Aucun dégât', hitFor: 'Dégâts −{n}', hpTo: 'PV → {n}', allIn: 'Tout en attaque : +20 %', heals: 'se soigne', blocks: 'bloque', endWin: 'Le Dévoreur de dés est vaincu !', endWinText: 'Les salles 6 à 10, l’Œil du Six, ton camp et les donjons du jour t’attendent dans l’app.', endLoseText: 'Le Dévoreur de dés était plus fort. Revanche ?', retry: 'Revanche', again: 'Rejouer', cta: 'Jouer maintenant', adLabel: 'Publicité jouable · JOCULUS', soundOn: 'Son activé', soundOff: 'Son coupé' },
  it: { g1: 'Una coppia! Tocca Attacco.', g2: 'Tieni i due 4 (toccali) e rilancia.', g3: 'Poker! Lo slime è quasi sconfitto.', noCombo: 'Nessuna combo – tieni dei dadi e rilancia.', stuck: 'Nessuna combo – termina il turno.', autoEnd: 'Fine turno …', hold: 'Tocca i dadi per tenerli.', enemyTo: 'Nemico → {n}', noHit: 'Nessun danno', hitFor: 'Danno −{n}', hpTo: 'PV → {n}', allIn: 'Tutto in attacco: +20%', heals: 'si cura', blocks: 'blocca', endWin: 'Il divoratore di dadi è sconfitto!', endWinText: 'Le stanze da 6 a 10, l’Occhio del Sei, il tuo accampamento e i dungeon giornalieri ti aspettano nell’app.', endLoseText: 'Il divoratore di dadi era più forte. Rivincita?', retry: 'Rivincita', again: 'Gioca ancora', cta: 'Gioca ora', adLabel: 'Annuncio giocabile · JOCULUS', soundOn: 'Suono sì', soundOff: 'Suono no' },
  es: { g1: '¡Una pareja! Toca Ataque.', g2: 'Guarda los dos 4 (tócalos) y relanza.', g3: '¡Cuatro iguales! El limo está casi acabado.', noCombo: 'Sin combo: guarda dados y relanza.', stuck: 'Sin combos: termina el turno.', autoEnd: 'Fin del turno …', hold: 'Toca los dados para guardarlos.', enemyTo: 'Enemigo → {n}', noHit: 'Sin daño', hitFor: 'Daño −{n}', hpTo: 'PV → {n}', allIn: 'Todo al ataque: +20 %', heals: 'se cura', blocks: 'bloquea', endWin: '¡El devoradados ha caído!', endWinText: 'Las salas 6 a 10, el Ojo del Seis, tu campamento y las mazmorras diarias te esperan en la app.', endLoseText: 'El devoradados fue más fuerte. ¿Revancha?', retry: 'Revancha', again: 'Jugar de nuevo', cta: 'Jugar ahora', adLabel: 'Anuncio jugable · JOCULUS', soundOn: 'Sonido sí', soundOff: 'Sonido no' },
  th: { g1: 'ได้หนึ่งคู่! แตะ โจมตี', g2: 'แตะเลข 4 ทั้งสองลูกเพื่อเก็บไว้ แล้วทอยใหม่', g3: 'สี่เหมือน! สไลม์ใกล้แพ้แล้ว', noCombo: 'ไม่มีคอมโบ – เก็บลูกเต๋าแล้วทอยใหม่', stuck: 'ไม่มีคอมโบแล้ว – จบเทิร์น', autoEnd: 'กำลังจบเทิร์น …', hold: 'แตะลูกเต๋าเพื่อเก็บไว้', enemyTo: 'ศัตรู → {n}', noHit: 'ไม่โดน', hitFor: 'โดน −{n}', hpTo: 'HP → {n}', allIn: 'โจมตีทั้งหมด: +20%', heals: 'ฟื้นพลัง', blocks: 'ป้องกัน', endWin: 'ปราบผู้กลืนลูกเต๋าได้แล้ว!', endWinText: 'ห้อง 6 ถึง 10 ดวงตาแห่งเลขหก แคมป์ของคุณ และดันเจี้ยนรายวัน รออยู่ในแอป', endLoseText: 'ผู้กลืนลูกเต๋าแข็งแกร่งกว่า ลองอีกครั้ง?', retry: 'แก้มือ', again: 'เล่นอีกครั้ง', cta: 'เล่นเลย', adLabel: 'โฆษณาแบบเล่นได้ · JOCULUS', soundOn: 'เปิดเสียง', soundOff: 'ปิดเสียง' },
  ko: { g1: '원페어! 공격을 누르세요.', g2: '4 두 개를 눌러 고정하고 다시 굴리세요.', g3: '포카인드! 슬라임은 거의 끝났어요.', noCombo: '족보 없음 – 주사위를 고정하고 다시 굴리세요.', stuck: '족보가 없어요 – 턴을 끝내세요.', autoEnd: '턴 종료 중 …', hold: '주사위를 눌러 고정하세요.', enemyTo: '적 → {n}', noHit: '피해 없음', hitFor: '피해 −{n}', hpTo: 'HP → {n}', allIn: '전부 공격: +20%', heals: '회복', blocks: '방어', endWin: '주사위 포식자를 쓰러뜨렸어요!', endWinText: '6~10번 방, 여섯의 눈, 나만의 캠프와 일일 던전이 앱에서 기다려요.', endLoseText: '주사위 포식자가 더 강했어요. 재도전?', retry: '재도전', again: '다시 하기', cta: '지금 플레이', adLabel: '플레이 가능한 광고 · JOCULUS', soundOn: '소리 켜기', soundOff: '소리 끄기' },
  ja: { g1: 'ペア！ 「攻撃」をタップ。', g2: '4を2つタップしてキープし、振り直そう。', g3: 'フォーカード！ スライムはもう虫の息。', noCombo: '役なし – ダイスをキープして振り直そう。', stuck: '役がない – ターン終了。', autoEnd: 'ターン終了 …', hold: 'ダイスをタップしてキープ。', enemyTo: '敵 → {n}', noHit: 'ノーダメージ', hitFor: 'ダメージ −{n}', hpTo: 'HP → {n}', allIn: '全力攻撃：+20%', heals: '回復', blocks: '防御', endWin: 'ダイス喰らいを倒した！', endWinText: '部屋6〜10、六の眼、自分の拠点、デイリーダンジョンがアプリで待っています。', endLoseText: 'ダイス喰らいが上手だった。リベンジする？', retry: 'リベンジ', again: 'もう一度', cta: '今すぐプレイ', adLabel: 'プレイアブル広告 · JOCULUS', soundOn: 'サウンドオン', soundOff: 'サウンドオフ' },
  zh: { g1: '对子！点击“攻击”。', g2: '点击两颗 4 将其保留，然后重掷。', g3: '四同！史莱姆快撑不住了。', noCombo: '没有组合——保留骰子后重掷。', stuck: '没有组合了——结束回合。', autoEnd: '回合结束中 …', hold: '点击骰子即可保留。', enemyTo: '敌人 → {n}', noHit: '未受伤', hitFor: '受伤 −{n}', hpTo: '生命 → {n}', allIn: '全力攻击：+20%', heals: '治疗', blocks: '格挡', endWin: '击败了噬骰者！', endWinText: '第 6 到 10 个房间、六之眼、你的营地和每日地牢都在应用里等你。', endLoseText: '噬骰者更强一些。要复仇吗？', retry: '复仇', again: '再玩一次', cta: '立即游玩', adLabel: '可试玩广告 · JOCULUS', soundOn: '开启声音', soundOff: '关闭声音' },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wd-playable-'));
const ffmpeg = (args, out) => { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args, out]); return fs.readFileSync(out); };
const dataUri = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;
const game = (p) => path.join(GAME, p);
const pick = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

function strings() {
  const data = JSON.parse(fs.readFileSync(game('godot/data/game-data.json'), 'utf8'));
  const enemyDe = Object.fromEntries(data.enemies.map((e) => [e.id, e.name]));
  const out = {};
  for (const lang of LANGS) {
    const t = { title: STORE_NAME[lang], ...AD[lang] };
    const locale = ['de', 'en'].includes(lang) ? null : JSON.parse(fs.readFileSync(game(`godot/data/locales/${lang}.json`), 'utf8'));
    for (const [key, [dataKey, english]] of Object.entries(OFFICIAL)) {
      const value = locale ? locale[english] : pick(data.translations[lang], dataKey);
      if (typeof value !== 'string' || !value) throw new Error(`Spielbegriff fehlt: ${lang} ${key} (${english})`);
      t[key] = value;
    }
    for (const [id, english] of Object.entries(ENEMY_NAMES)) {
      const value = lang === 'de' ? enemyDe[id] : lang === 'en' ? english : locale[english];
      if (!value) throw new Error(`Gegnername fehlt: ${lang} ${id}`);
      t['enemy_' + id] = value;
    }
    for (const key of Object.keys(AD.de)) if (!t[key]) throw new Error(`Anzeigentext fehlt: ${lang} ${key}`);
    out[lang] = t;
  }
  return out;
}

function main() {
  const i18n = strings();
  const img = {};
  for (const name of ['hero-idle', 'hero-cheer', 'slime', 'kobold', 'eater']) img[name] = dataUri('image/webp', fs.readFileSync(path.join(HERE, 'sprites', name + '.webp')));
  /** Kampfhintergründe des Spiels: Gewölbe am Wasser (Räume 1–2), Glutschmiede (Boss). */
  img.bg1 = dataUri('image/webp', ffmpeg(['-i', game('godot/art/painted/fight-bg-1.png'), '-vf', 'scale=900:-1', '-c:v', 'libwebp', '-quality', '58'], path.join(tmp, 'bg1.webp')));
  img.bg2 = dataUri('image/webp', ffmpeg(['-i', game('godot/art/painted/fight-bg-4.png'), '-vf', 'scale=900:-1', '-c:v', 'libwebp', '-quality', '58'], path.join(tmp, 'bg2.webp')));
  img.icon = dataUri('image/webp', ffmpeg(['-i', game('godot/art/app-icon.png'), '-vf', 'scale=128:128', '-c:v', 'libwebp', '-quality', '86'], path.join(tmp, 'icon.webp')));
  const fonts = {
    cinzel: fs.readFileSync(game('fonts/cinzel-800-latin.woff2')).toString('base64'),
    inter: fs.readFileSync(game('fonts/inter-700-latin.woff2')).toString('base64'),
  };
  const data = { i18n, img, fonts };
  const tpl = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8').replace(/\r\n/g, '\n');
  const html = tpl.replace('/*__DATA__*/null', () => JSON.stringify(data));
  fs.writeFileSync(OUT, html);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`playables/wuerfel-dungeon.html: ${(html.length / 1024).toFixed(0)} KB · ${LANGS.length} Sprachen`);
}

main();
