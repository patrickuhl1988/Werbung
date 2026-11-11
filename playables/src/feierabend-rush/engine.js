/*
 * Feierabend Rush – Spiel-Mathematik der spielbaren Anzeige.
 *
 * Formeln und Konstanten 1:1 aus der App (src/game/engine.ts): Spurversatz,
 * gekachelte Kollision mit Spieler- und Hindernis-Toleranz, Kaffee-Boost,
 * Hupen, Punkte und Sterne. test.cjs vergleicht die Zahlen mit der App.
 *
 * Das Level ist eine Kurzfassung von Level 1 „Der Arbeitsweg“
 * (src/levels/level1.ts): Wohnstraße, Hauptstraße mit Bus, Bahnübergang,
 * Firmengelände – dieselben Spuren, Tempi und Phasen, nur weniger davon.
 * Gespielt wird im Tempo des Modus „Leicht“ (easyFactor 0,78).
 */
(function (root) {
  'use strict';

  var HIT_FORGIVENESS = 0.32;
  var ENTITY_FORGIVENESS = 0.18;
  var COFFEE_BOOST = { seconds: 6, factor: 0.65 };
  var HONK = { near: 2.0, cooldown: 3.0 };
  var SCORE = { perRow: 10, perGoal: 600, perPickup: 25, timeBonusPerSecond: 3, lifeBonus: 200 };

  function mod(a, n) {
    return ((a % n) + n) % n;
  }

  /** Versatz einer Spur zum Zeitpunkt t, in Rasterfeldern (positiv = nach rechts). */
  function laneOffset(lane, t, speedScale) {
    var dir = lane.dir || 1;
    var speed = (lane.speed || 0) * speedScale;
    return dir * speed * (t + (lane.phase || 0));
  }

  function overlapsTiled(entStart, entLen, pattern, aLo, aHi) {
    var p = mod(entStart, pattern);
    for (var k = -1; k <= 1; k++) {
      var lo = p + k * pattern;
      var hi = lo + entLen;
      if (aLo < hi && lo < aHi) return true;
    }
    return false;
  }

  /** Trifft die Spur den Spieler? playerX = linke Kante in Feldern. */
  function laneHitsPlayer(lane, t, playerX, speedScale) {
    var ents = lane.entities;
    if (!ents || !ents.length) return false;
    var pattern = lane.patternCells || 1;
    var off = laneOffset(lane, t, speedScale);
    var aLo = playerX + HIT_FORGIVENESS;
    var aHi = playerX + 1 - HIT_FORGIVENESS;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      var inset = Math.min(ENTITY_FORGIVENESS, e.len * 0.3);
      if (overlapsTiled(e.at + off + inset, e.len - inset * 2, pattern, aLo, aHi)) return true;
    }
    return false;
  }

  /**
   * Hupt ein Straßenfahrzeug? Wie in der App: wer knapp vor die Haube läuft
   * (Abstand unter HONK.near Feldern, Fahrzeug kommt auf ihn zu), hört es.
   */
  function honkDistance(lane, t, playerX, speedScale) {
    var ents = lane.entities;
    if (!ents || !ents.length) return Infinity;
    var pattern = lane.patternCells || 1;
    var off = laneOffset(lane, t, speedScale);
    var dir = lane.dir || 1;
    var best = Infinity;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      var p = mod(e.at + off, pattern);
      for (var k = -1; k <= 1; k++) {
        var lo = p + k * pattern;
        var d = dir > 0 ? playerX - (lo + e.len) : lo - (playerX + 1);
        if (d >= 0 && d < best) best = d;
      }
    }
    return best;
  }

  /*
   * Reihen von UNTEN nach OBEN. Index 0 = Start (Vorplatz vor der Haustür).
   * Kommentare nennen die Reihe aus level1.ts, aus der die Spur stammt.
   */
  var LEVEL = {
    id: 'level1-ad',
    cols: 9,
    timeLimit: 75,
    lives: 3,
    speedScale: 0.78,
    goalSlots: [4],
    stars: {
      two: { minLives: 2, minTimeFrac: 0.25 },
      three: { minLives: 3, minTimeFrac: 0.4, minPickupFrac: 0.7 },
    },
    lanes: [
      /* 0 */ { kind: 'start', skin: 'sidewalk' },
      /* 1 */ { kind: 'safe', skin: 'grass', coinAt: 6 },
      /* 2  (l1 #2) */ { kind: 'traffic', skin: 'road', dir: 1, speed: 1.6, patternCells: 14, entities: [{ type: 'car', at: 0, len: 2 }, { type: 'car', at: 7, len: 2 }] },
      /* 3  (l1 #3) */ { kind: 'traffic', skin: 'road-dashed', dir: -1, speed: 2.0, phase: 1.4, patternCells: 13, entities: [{ type: 'car', at: 0, len: 2 }, { type: 'car', at: 6.5, len: 2 }] },
      /* 4 */ { kind: 'safe', skin: 'grass' },
      /* 5  (l1 #5) */ { kind: 'traffic', skin: 'road', dir: -1, speed: 1.5, patternCells: 15, entities: [{ type: 'van', at: 0, len: 3 }, { type: 'van', at: 8, len: 3 }] },
      /* 6  (l1 #6) */ { kind: 'traffic', skin: 'road-dashed', dir: 1, speed: 2.5, phase: 0.7, patternCells: 14, entities: [{ type: 'bike', at: 0, len: 1 }, { type: 'bike', at: 6, len: 1 }], coinAt: 4 },
      /* 7  (l1 #7, Bäckerei) */ { kind: 'safe', skin: 'sidewalk', checkpoint: true, pickup: { at: 2, type: 'coffee' } },
      /* 8  (l1 #8, Busspur) */ { kind: 'traffic', skin: 'road', dir: -1, speed: 2.0, patternCells: 18, entities: [{ type: 'bus', at: 0, len: 4 }, { type: 'bus', at: 10, len: 3.5 }] },
      /* 9  (l1 #9) */ { kind: 'safe', skin: 'grass', checkpoint: true, coinAt: 7 },
      /* 10 (l1 #16, Gleis) */ { kind: 'traffic', skin: 'rails', dir: -1, speed: 4.8, patternCells: 26, entities: [{ type: 'tram', at: 0, len: 7 }] },
      /* 11 (l1 #17, Bahnsteig) */ { kind: 'safe', skin: 'sidewalk', checkpoint: true, coinAt: 2 },
      /* 12 (l1 #10, E-Scooter) */ { kind: 'traffic', skin: 'road-dashed', dir: 1, speed: 3.0, phase: 2.1, patternCells: 14, entities: [{ type: 'scooter', at: 0, len: 1 }, { type: 'scooter', at: 7, len: 1 }] },
      /* 13 (l1 #11, Lieferwagen) */ { kind: 'traffic', skin: 'road', dir: 1, speed: 2.2, phase: 3.2, patternCells: 15, entities: [{ type: 'van', at: 0, len: 2.5 }, { type: 'van', at: 8, len: 2.5 }] },
      /* 14 (l1 #26) */ { kind: 'safe', skin: 'tiles', coinAt: 1 },
      /* 15 (l1 #27, Stempeluhr) */ { kind: 'goal', skin: 'tiles' },
    ],
  };

  function goalRow(level) {
    for (var i = level.lanes.length - 1; i >= 0; i--) if (level.lanes[i].kind === 'goal') return i;
    return level.lanes.length - 1;
  }

  function countPickups(level) {
    var n = 0;
    for (var i = 0; i < level.lanes.length; i++) {
      if (level.lanes[i].coinAt !== undefined) n++;
      if (level.lanes[i].pickup) n++;
    }
    return n;
  }

  function countCoins(level) {
    var n = 0;
    for (var i = 0; i < level.lanes.length; i++) if (level.lanes[i].coinAt !== undefined) n++;
    return n;
  }

  function ruleMet(rule, lives, timeFrac, pickupFrac) {
    if (rule.minLives !== undefined && lives < rule.minLives) return false;
    if (rule.minTimeFrac !== undefined && timeFrac < rule.minTimeFrac) return false;
    if (rule.minPickupFrac !== undefined && pickupFrac < rule.minPickupFrac) return false;
    return true;
  }

  /** Auswertung wie evaluateRun() der App. */
  function evaluate(level, a) {
    var pickupTotal = countPickups(level);
    var goalScore = a.goalsFilled * SCORE.perGoal;
    var pickupScore = a.pickups * SCORE.perPickup;
    var timeBonus = Math.max(0, Math.round(a.timeLeft) * SCORE.timeBonusPerSecond);
    var lifeBonus = a.livesLeft * SCORE.lifeBonus;
    var timeFrac = level.timeLimit > 0 ? a.timeLeft / level.timeLimit : 0;
    var pickupFrac = pickupTotal > 0 ? a.pickups / pickupTotal : 1;
    var stars = 1;
    if (ruleMet(level.stars.two, a.livesLeft, timeFrac, pickupFrac)) stars = 2;
    if (ruleMet(level.stars.three, a.livesLeft, timeFrac, pickupFrac)) stars = 3;
    return {
      score: Math.round(a.rowScore + goalScore + pickupScore + timeBonus + lifeBonus),
      rowScore: a.rowScore,
      goalScore: goalScore,
      pickupScore: pickupScore,
      timeBonus: timeBonus,
      lifeBonus: lifeBonus,
      stars: stars,
      pickupTotal: pickupTotal,
    };
  }

  root.FeierabendEngine = {
    HIT_FORGIVENESS: HIT_FORGIVENESS,
    ENTITY_FORGIVENESS: ENTITY_FORGIVENESS,
    COFFEE_BOOST: COFFEE_BOOST,
    HONK: HONK,
    SCORE: SCORE,
    LEVEL: LEVEL,
    mod: mod,
    laneOffset: laneOffset,
    laneHitsPlayer: laneHitsPlayer,
    honkDistance: honkDistance,
    goalRow: goalRow,
    countPickups: countPickups,
    countCoins: countCoins,
    evaluate: evaluate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
