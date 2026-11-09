/**
 * Baut playables/calm-arrow-puzzle.html – die spielbare Anzeige für Calm Arrow Puzzle.
 *
 *   node playables/src/calm-arrow-puzzle/build.cjs ["D:/Mobile Games/Neon Drift/game"]
 *
 * Alles kommt aus dem Godot-Projekt des Spiels: echte Level (levels/level_NNN.json),
 * die farbige Illustration jedes Motivs (assets/redesign/v3, figure-map.json),
 * Kapitelhintergrund, Herz-, Feder-, Tipp- und Neustart-Symbol, Store-Icon und die
 * Originalklänge (assets/sfx, als AAC/M4A, weil iOS-WebViews kein Vorbis können).
 * Braucht ffmpeg im PATH. Ergebnis: eine einzelne HTML-Datei ohne Netzwerkzugriffe.
 */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const GAME = process.argv[2] || 'D:/Mobile Games/Neon Drift/game';
const HERE = __dirname;
const OUT = path.resolve(HERE, '..', '..', 'calm-arrow-puzzle.html');

/** Drei kleine Level mit farbiger Illustration: Wal, Ruderboot, Drachen (Kapitel 1). */
const LEVELS = [
  { file: 'level_007.json', name: { de: 'Wal', en: 'Whale', es: 'Ballena', fr: 'Baleine', it: 'Balena', nl: 'Walvis', pt: 'Baleia' } },
  { file: 'level_013.json', name: { de: 'Ruderboot', en: 'Rowboat', es: 'Bote de remos', fr: 'Barque', it: 'Barca a remi', nl: 'Roeiboot', pt: 'Barco a remos' } },
  { file: 'level_026.json', name: { de: 'Drachen', en: 'Kite', es: 'Cometa', fr: 'Cerf-volant', it: 'Aquilone', nl: 'Vlieger', pt: 'Papagaio' } },
];
/** Klänge wie scripts/autoload/audio.gd: drei Pfeilfassungen, Kettenstufen, Blockade, Herz, Enthüllung. */
const SOUNDS = ['arrow_out_1', 'arrow_out_2', 'arrow_out_3', 'chain_1', 'chain_2', 'chain_3', 'blocked', 'heart_lost', 'reveal', 'feathers', 'ui_tap'];

const I18N = {
  de: { title: 'Calm Arrow Puzzle', eyebrow: 'Pfeil-Rätsel · Bilder entdecken', rule: 'Tippe einen Pfeil an – er fliegt, wenn sein Weg frei ist.', picture: 'Bild', blocked: 'Blockiert – ein anderer Pfeil steht im Weg.', auto: 'Super! Der Rest fliegt von selbst …', wonderful: 'Wundervoll!', next: 'Nächstes Bild', again: 'Noch einmal spielen', allDone: 'Alle drei Bilder entdeckt! 350 weitere warten in der App.', noHearts: 'Keine Herzen mehr. Gleich nochmal?', retry: 'Nochmal', hint: 'Tipp', restart: 'Neu', cta: 'Jetzt weiterspielen', adLabel: 'Spielbare Anzeige · JOCULUS', soundOn: 'Ton an', soundOff: 'Ton aus' },
  en: { title: 'Calm Arrow Puzzle', eyebrow: 'Arrow puzzle · reveal pictures', rule: 'Tap an arrow – it flies if its path is clear.', picture: 'Picture', blocked: 'Blocked – another arrow is in the way.', auto: 'Nice! Watch the rest fly …', wonderful: 'Wonderful!', next: 'Next picture', again: 'Play again', allDone: 'All three pictures revealed! 350 more await in the app.', noHearts: 'Out of hearts. Try again?', retry: 'Try again', hint: 'Hint', restart: 'Restart', cta: 'Keep playing', adLabel: 'Playable ad · JOCULUS', soundOn: 'Sound on', soundOff: 'Sound off' },
  es: { title: 'Calm Arrow Puzzle', eyebrow: 'Puzle de flechas · descubre imágenes', rule: 'Toca una flecha: vuela si su camino está libre.', picture: 'Imagen', blocked: 'Bloqueada: otra flecha está en medio.', auto: '¡Genial! El resto vuela solo …', wonderful: '¡Maravilloso!', next: 'Siguiente imagen', again: 'Jugar de nuevo', allDone: '¡Las tres imágenes descubiertas! 350 más te esperan en la app.', noHearts: 'Sin corazones. ¿Otra vez?', retry: 'Reintentar', hint: 'Pista', restart: 'Reiniciar', cta: 'Sigue jugando', adLabel: 'Anuncio jugable · JOCULUS', soundOn: 'Sonido sí', soundOff: 'Sonido no' },
  fr: { title: 'Calm Arrow Puzzle', eyebrow: 'Puzzle de flèches · révèle les images', rule: 'Touche une flèche : elle s’envole si la voie est libre.', picture: 'Image', blocked: 'Bloquée – une autre flèche gêne.', auto: 'Super ! Le reste s’envole tout seul …', wonderful: 'Magnifique !', next: 'Image suivante', again: 'Rejouer', allDone: 'Les trois images révélées ! 350 autres t’attendent dans l’app.', noHearts: 'Plus de cœurs. On recommence ?', retry: 'Réessayer', hint: 'Indice', restart: 'Rejouer', cta: 'Continuer à jouer', adLabel: 'Publicité jouable · JOCULUS', soundOn: 'Son activé', soundOff: 'Son coupé' },
  it: { title: 'Calm Arrow Puzzle', eyebrow: 'Puzzle di frecce · scopri le immagini', rule: 'Tocca una freccia: vola via se la strada è libera.', picture: 'Immagine', blocked: 'Bloccata: c’è un’altra freccia in mezzo.', auto: 'Ottimo! Il resto vola da solo …', wonderful: 'Meraviglioso!', next: 'Immagine successiva', again: 'Gioca ancora', allDone: 'Tutte e tre le immagini scoperte! Altre 350 ti aspettano nell’app.', noHearts: 'Cuori finiti. Riprovi?', retry: 'Riprova', hint: 'Aiuto', restart: 'Ricomincia', cta: 'Continua a giocare', adLabel: 'Annuncio giocabile · JOCULUS', soundOn: 'Suono sì', soundOff: 'Suono no' },
  nl: { title: 'Calm Arrow Puzzle', eyebrow: 'Pijlpuzzel · ontdek plaatjes', rule: 'Tik op een pijl – hij vliegt weg als de weg vrij is.', picture: 'Plaatje', blocked: 'Geblokkeerd – er zit een andere pijl in de weg.', auto: 'Top! De rest vliegt vanzelf …', wonderful: 'Prachtig!', next: 'Volgend plaatje', again: 'Speel opnieuw', allDone: 'Alle drie plaatjes ontdekt! Er wachten er nog 350 in de app.', noHearts: 'Geen hartjes meer. Nog een keer?', retry: 'Opnieuw', hint: 'Hint', restart: 'Opnieuw', cta: 'Speel verder', adLabel: 'Speelbare advertentie · JOCULUS', soundOn: 'Geluid aan', soundOff: 'Geluid uit' },
  pt: { title: 'Calm Arrow Puzzle', eyebrow: 'Puzzle de setas · descobre imagens', rule: 'Toca numa seta – voa se o caminho estiver livre.', picture: 'Imagem', blocked: 'Bloqueada – outra seta está no caminho.', auto: 'Boa! O resto voa sozinho …', wonderful: 'Maravilhoso!', next: 'Próxima imagem', again: 'Jogar novamente', allDone: 'As três imagens descobertas! Mais 350 esperam por ti na app.', noHearts: 'Sem corações. Tentar de novo?', retry: 'Tentar de novo', hint: 'Dica', restart: 'Reiniciar', cta: 'Continuar a jogar', adLabel: 'Anúncio jogável · JOCULUS', soundOn: 'Som ligado', soundOff: 'Som desligado' },
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-playable-'));
function ffmpeg(args, out) {
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args, out]);
  return fs.readFileSync(out);
}
const dataUri = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;
const res = (p) => path.join(GAME, p.replace(/^res:\/\//, ''));

/** Spielregel-Port aus template.html laden und ein Level greedy lösen (Kontrolle beim Bauen). */
function loadBoard() {
  const tpl = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
  const start = tpl.indexOf('const key = (c)');
  const end = tpl.indexOf('/* ===== Pfeil-Zeichnung');
  return new Function(tpl.slice(start, end) + '\nreturn Board;')();
}

function main() {
  const Board = loadBoard();
  const figureMap = JSON.parse(fs.readFileSync(res('assets/redesign/v3/figure-map.json'), 'utf8'));
  const levels = LEVELS.map((L, i) => {
    const d = JSON.parse(fs.readFileSync(res('levels/' + L.file), 'utf8'));
    const b = new Board(d);
    let guard = 0;
    while (b.remaining() > 0) {
      const fr = b.free();
      if (!fr.length || guard++ > 999) throw new Error(`${L.file} nicht lösbar`);
      b.remove(fr[0]);
    }
    const fig = d.meta.figure, e = figureMap[fig];
    if (!e) throw new Error(`Keine Illustration für ${fig}`);
    const [x, y, w, h] = e.rect;
    const pic = ffmpeg(['-i', res('assets/redesign/v3/' + e.atlas), '-vf', `crop=${w}:${h}:${x}:${y},scale=360:-1`, '-c:v', 'libwebp', '-quality', '82'], path.join(tmp, `fig${i}.webp`));
    const level = { w: d.w, h: d.h, arrows: d.arrows, name: L.name, picture: dataUri('image/webp', pic), figure: fig, chapter: d.meta.chapter, pos: d.meta.pos };
    if (d.links) level.links = d.links;
    if (d.gates) level.gates = d.gates;
    return level;
  });

  const sounds = {};
  for (const s of SOUNDS) sounds[s] = ffmpeg(['-i', res(`assets/sfx/${s}.ogg`), '-c:a', 'aac', '-b:a', '80k', '-ac', '1'], path.join(tmp, `${s}.m4a`)).toString('base64');

  const icon = dataUri('image/webp', ffmpeg(['-i', res('assets/gen/store/icon_512.png'), '-vf', 'scale=128:128', '-c:v', 'libwebp', '-quality', '88'], path.join(tmp, 'icon.webp')));
  const background = dataUri('image/webp', ffmpeg(['-i', res('assets/gen/backgrounds/bg_01_kueste.png'), '-vf', 'scale=720:-1', '-c:v', 'libwebp', '-quality', '62'], path.join(tmp, 'bg.webp')));
  /** Symbole der App; die weißen Vorlagen (für Godot-Modulate) bekommen die Tintenfarbe der App. */
  const svg = (p, color) => {
    let s = fs.readFileSync(res(p), 'utf8');
    if (color) s = s.replace(/"white"/g, `"${color}"`);
    return dataUri('image/svg+xml', Buffer.from(s));
  };
  const icons = {
    heart: svg('assets/redesign/v2/icons/heart.svg'),
    feather: svg('assets/redesign/v3/feather.svg'),
    hint: svg('assets/redesign/v2/icons/hint.svg', '#303932'),
    restart: svg('assets/redesign/v2/icons/refresh.svg', '#303932'),
  };

  const data = { levels, i18n: I18N, sounds, icon, background, icons };
  const tpl = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8').replace(/\r\n/g, '\n');
  const html = tpl.replace('/*__DATA__*/null', () => JSON.stringify(data));
  fs.writeFileSync(OUT, html);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`playables/calm-arrow-puzzle.html: ${(html.length / 1024).toFixed(0)} KB · ${levels.map((l) => `${l.name.de} (${l.arrows.length} Pfeile)`).join(', ')}`);
}

main();
