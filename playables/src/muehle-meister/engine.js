/*
 * Mühle-Regeln für die spielbare Anzeige (Playable Ad).
 *
 * Gleiche Nummerierung wie lib/game/constants.ts: 0-7 äußerer Ring, 8-15 mittlerer,
 * 16-23 innerer, jeweils oben links beginnend im Uhrzeigersinn. ADJACENCY und
 * MILL_LINES sind 1:1 von dort übernommen (test.cjs prüft das).
 *
 * Läuft im Browser (window.MuehleEngine) und unter Node (module.exports) für die Tests.
 */
(function (root) {
  'use strict';

  var ADJACENCY = {
    0: [1, 7], 1: [0, 2, 9], 2: [1, 3], 3: [2, 4, 11], 4: [3, 5], 5: [4, 6, 13], 6: [5, 7], 7: [0, 6, 15],
    8: [9, 15], 9: [1, 8, 10, 17], 10: [9, 11], 11: [3, 10, 12, 19], 12: [11, 13], 13: [5, 12, 14, 21], 14: [13, 15], 15: [7, 8, 14, 23],
    16: [17, 23], 17: [9, 16, 18], 18: [17, 19], 19: [11, 18, 20], 20: [19, 21], 21: [13, 20, 22], 22: [21, 23], 23: [15, 16, 22],
  };

  var MILL_LINES = [
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
  ];

  /** Knotenkoordinaten (0..1) des klassischen Bretts, aus lib/utils/boardCoordinates.ts. */
  var COORDS = [
    [0.08, 0.08], [0.5, 0.08], [0.92, 0.08], [0.92, 0.5], [0.92, 0.92], [0.5, 0.92], [0.08, 0.92], [0.08, 0.5],
    [0.22, 0.22], [0.5, 0.22], [0.78, 0.22], [0.78, 0.5], [0.78, 0.78], [0.5, 0.78], [0.22, 0.78], [0.22, 0.5],
    [0.36, 0.36], [0.5, 0.36], [0.64, 0.36], [0.64, 0.5], [0.64, 0.64], [0.5, 0.64], [0.36, 0.64], [0.36, 0.5],
  ];

  /**
   * Drei kleine Rätsel, jedes mit genau einem Zug, der eine Mühle schließt.
   *  1. Setzphase: den dritten Stein setzen.
   *  2. Zugphase: einen Stein zur Mühle schieben; die schwarze Mühle ist geschützt.
   *  3. Zwickmühle: hin- und zurückziehen, jeder Zug schließt eine Mühle (Schwarz zieht dazwischen).
   * W = Spieler (weiß), B = Gegner (schwarz).
   */
  var LEVELS = [
    { id: 'place', phase: 'place', white: [0, 1, 12], black: [9, 14, 21], supply: 6, mills: 1 },
    { id: 'move', phase: 'move', white: [4, 6, 16, 17, 19], black: [8, 9, 10, 12, 22], mills: 1 },
    { id: 'zwick', phase: 'move', white: [0, 1, 2, 8, 10], black: [4, 6, 14, 19, 22], mills: 2 },
  ];

  function other(color) { return color === 'W' ? 'B' : 'W'; }

  function newBoard(level) {
    var b = [];
    for (var i = 0; i < 24; i++) b.push(null);
    level.white.forEach(function (p) { b[p] = 'W'; });
    level.black.forEach(function (p) { b[p] = 'B'; });
    return b;
  }

  function count(board, color) {
    var n = 0;
    for (var i = 0; i < 24; i++) if (board[i] === color) n++;
    return n;
  }

  /** Mühlen-Linien durch `pos`, die vollständig in der Farbe des Steins auf `pos` sind. */
  function millsAt(board, pos) {
    var c = board[pos];
    if (!c) return [];
    return MILL_LINES.filter(function (l) {
      return l.indexOf(pos) >= 0 && board[l[0]] === c && board[l[1]] === c && board[l[2]] === c;
    });
  }

  function inMill(board, pos) { return millsAt(board, pos).length > 0; }

  /** Steine von `color`, die geschlagen werden dürfen: nicht in einer Mühle – außer alle stehen in Mühlen. */
  function removable(board, color) {
    var all = [], free = [];
    for (var i = 0; i < 24; i++) {
      if (board[i] !== color) continue;
      all.push(i);
      if (!inMill(board, i)) free.push(i);
    }
    return free.length ? free : all;
  }

  function canFly(board, color) { return count(board, color) <= 3; }

  /** Zielfelder eines Steins in der Zugphase (Springen ab drei Steinen). */
  function targets(board, from) {
    var c = board[from];
    if (!c) return [];
    if (canFly(board, c)) {
      var all = [];
      for (var i = 0; i < 24; i++) if (!board[i]) all.push(i);
      return all;
    }
    return ADJACENCY[from].filter(function (p) { return !board[p]; });
  }

  /** Alle Züge einer Farbe: {from, to}; from = null beim Setzen. */
  function moves(board, color, phase) {
    var list = [];
    if (phase === 'place') {
      for (var i = 0; i < 24; i++) if (!board[i]) list.push({ from: null, to: i });
      return list;
    }
    for (var f = 0; f < 24; f++) {
      if (board[f] !== color) continue;
      targets(board, f).forEach(function (t) { list.push({ from: f, to: t }); });
    }
    return list;
  }

  function apply(board, move, color) {
    var b = board.slice();
    if (move.from != null) b[move.from] = null;
    b[move.to] = color;
    return b;
  }

  /** Schließt der Zug eine Mühle? */
  function closesMill(board, move, color) {
    return inMill(apply(board, move, color), move.to);
  }

  /** Der eine Zug, der in diesem Rätselzustand eine Mühle schließt (für Hinweis und Tests). */
  function solutions(board, color, phase) {
    return moves(board, color, phase).filter(function (m) { return closesMill(board, m, color); });
  }

  /**
   * Gegnerzug (nur im Zwickmühlen-Rätsel): zuerst eine eigene Mühle, dann die
   * nächste Mühle des Spielers blockieren, sonst eine eigene Zweierreihe
   * aufbauen. Feste Reihenfolge, kein Zufall – die Anzeige ist reproduzierbar.
   */
  function aiMove(board, color, phase) {
    var list = moves(board, color, phase);
    if (!list.length) return null;
    var foe = other(color);
    var threats = solutions(board, foe, phase).map(function (m) { return m.to; });
    var best = null, bestScore = -Infinity;
    list.forEach(function (m, i) {
      var after = apply(board, m, color);
      var score = 0;
      if (inMill(after, m.to)) score += 100;
      if (threats.indexOf(m.to) >= 0) score += 50;
      MILL_LINES.forEach(function (l) {
        if (l.indexOf(m.to) < 0) return;
        var own = 0, empty = 0;
        l.forEach(function (p) { if (after[p] === color) own++; else if (!after[p]) empty++; });
        if (own === 2 && empty === 1) score += 6;
      });
      // Ein eigener Stein, der eine Mühle des Spielers frei macht, wäre ein Geschenk.
      if (m.from != null && solutions(after, foe, phase).length > threats.length) score -= 20;
      score -= i * 0.001;
      if (score > bestScore) { bestScore = score; best = m; }
    });
    return best;
  }

  var api = {
    ADJACENCY: ADJACENCY, MILL_LINES: MILL_LINES, COORDS: COORDS, LEVELS: LEVELS,
    other: other, newBoard: newBoard, count: count, millsAt: millsAt, inMill: inMill,
    removable: removable, canFly: canFly, targets: targets, moves: moves, apply: apply,
    closesMill: closesMill, solutions: solutions, aiMove: aiMove,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MuehleEngine = api;
})(this);
