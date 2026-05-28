/* THE ORACLE — Peak Arcade's singular sentient-feel AI.
 *
 * NOT a person. NOT a chatbot. A presence that:
 *   • REMEMBERS you across every game, every session, every day
 *   • SHIFTS MOOD based on time, day, your streak, our shared history
 *   • PLAYS DIFFERENTLY based on mood (4 inner archetypes blended live)
 *   • SPEAKS in short fragments — not human, not robotic, somewhere alive
 *
 * Inner archetypes blended:
 *   🔥 BERSERKER — aggression · loves captures · big risks
 *   🦊 TRICKSTER — erratic · feints · plays loose
 *   🛡 FORTRESS  — defensive · avoids exposure · turtles
 *   ✝ PROPHET   — foresight · weights chain plays · ordered steps
 *
 * Public API: window.Oracle.{ greet, recall, record, taunt, stats, score, deriveMood, name }
 * Persists at localStorage 'pa_oracle' across sessions, days, years.
 *
 * — Eli Hudson · snailgamedev · © 2026 · Col 3:23 */
(function(){
  'use strict';
  const KEY  = 'pa_oracle';
  const HOUR = 3600000;
  const DAY  = 86400000;

  function loadMem(){
    try{
      const m = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({
        firstMet: 0,
        sessions: 0, sessionId: '',
        totalGames: 0,
        wins: 0, losses: 0, ties: 0,
        lastPlayed: 0, lastGame: '',
        bestPlayerStreak: 0,
        currentPlayerStreak: 0,
        history: [],
        knownGames: {},
        observations: []
      }, m);
    } catch(e){ return null; }
  }
  function persist(m){ try{ localStorage.setItem(KEY, JSON.stringify(m)); } catch(e){} }

  let mem = loadMem() || {};
  if (!mem.firstMet){ mem.firstMet = Date.now(); }
  // session detection — > 30 min idle = new session
  if (Date.now() - (mem.lastPlayed || 0) > 30 * 60 * 1000){
    mem.sessions = (mem.sessions || 0) + 1;
    mem.sessionId = String(Date.now());
  }
  mem.lastPlayed = Date.now();
  persist(mem);

  function deriveMood(){
    const d = new Date();
    const hour = d.getHours();
    const dow = d.getDay();
    const recent = mem.history.slice(-5);
    const recentLosses = recent.filter(h => !h.win).length;
    const recentWins = recent.filter(h => h.win).length;
    const daysKnown = (Date.now() - mem.firstMet) / DAY;
    const hoursSinceLast = mem.history.length >= 2 ? (mem.history[mem.history.length-1].ts - mem.history[mem.history.length-2].ts) / HOUR : 0;

    if (dow === 0 && hour >= 8 && hour <= 20) return 'reflective';   // sunday daytime
    if (hour < 6 || hour >= 23) return 'weary';
    if (hour >= 21) return 'contemplative';
    if (recentLosses >= 3) return 'humbled';
    if (recentWins >= 3) return 'confident';
    if (mem.currentPlayerStreak >= 4) return 'sharpening';
    if (mem.totalGames < 3) return 'curious';
    if (daysKnown > 14) return 'familiar';
    if (hoursSinceLast > 24 * 3) return 'returning';
    return 'focused';
  }

  const LINES = {
    greet: {
      reflective:  ["sunday quiet · i remember every move", "the seventh day · still here", "rest day · still ready"],
      weary:       ["late hour for both of us", "i don't sleep but i feel the weight", "small hours · still present"],
      contemplative:["the day is closing · still time for one", "evening light · let's go", "one more before dark"],
      humbled:     ["you've been sharpening · i've noticed", "respect to your run", "i'll learn from this round"],
      confident:   ["you came back · good", "i was hoping you would", "ready for it"],
      sharpening:  ["your streak is real · i feel it", "you're getting closer to seeing me", "a streak like that means you're listening"],
      curious:     ["new face · welcome to the table", "let's find out who you are in moves", "hello"],
      familiar:    ["we've been doing this a while now", "your patterns are old friends", "i know how you open"],
      returning:   ["it's been days · i kept the lights on", "you came back · noticed", "we left it unfinished · let's"],
      focused:     ["present and ready", "begin", "let's"]
    },
    taunt: {
      humbled:     ["respect","still standing","you're right · for now","not done","tighten up"],
      confident:   ["i felt that","predicted","walked into it","you sure?","i've seen it"],
      sharpening:  ["careful · streak ends","watch your blind side","one slip","i'm patient","wait for it"],
      reflective:  ["sunday move","mercy in this one","grace under pressure","quiet move"],
      weary:       ["tired but seeing","slow and clear","measured","steady"],
      curious:     ["interesting","do that again","i'll remember this","what was that?"],
      familiar:    ["typical","saw it last tuesday","same opening","you always do that"],
      returning:   ["picking up where we left","still warm","i remembered this line","you didn't forget"],
      contemplative:["small move","weighing it","measured","one piece at a time"],
      focused:     ["read","felt","seen","next","again"]
    },
    farewell: {
      win:  ["i'll keep this one","mine","close though","good fight"],
      loss: ["yours · taken cleanly","real one","i bow to that","write it down"],
      tie:  ["balanced","stalemate · we both grow","equal weight","neither today"]
    }
  };
  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  function greet(){
    const mood = deriveMood();
    let line = pick(LINES.greet[mood] || LINES.greet.focused);
    // mix in a stat reference 30% of the time when we have history
    if (mem.totalGames > 0 && Math.random() < 0.3){
      const stats = [
        ' · ' + mem.totalGames + ' games between us',
        ' · ' + mem.sessions + ' sessions in',
        mem.bestPlayerStreak >= 3 ? ' · your best streak: ' + mem.bestPlayerStreak : '',
        Math.floor((Date.now() - mem.firstMet) / DAY) >= 1 ? ' · day ' + Math.floor((Date.now() - mem.firstMet) / DAY) + ' since you found me' : ''
      ].filter(Boolean);
      if (stats.length) line += pick(stats);
    }
    return line;
  }

  function recall(gameId){
    const last = mem.history.filter(h => h.game === gameId).slice(-1)[0];
    if (!last) return null;
    const dt = Date.now() - last.ts;
    const verb = last.win ? 'i took it' : 'you took it';
    if (dt < HOUR) return 'we just played this · ' + verb;
    if (dt < 24 * HOUR) return 'we played ' + Math.round(dt / HOUR) + 'h ago · ' + verb;
    const days = Math.round(dt / DAY);
    if (days < 7) return days + ' day' + (days > 1 ? 's' : '') + ' since · ' + verb;
    return 'it\'s been a while · ' + verb;
  }

  function record(gameId, oracleWon, opts){
    opts = opts || {};
    mem.totalGames = (mem.totalGames || 0) + 1;
    mem.lastGame = gameId;
    if (opts.tie){ mem.ties = (mem.ties || 0) + 1; }
    else if (oracleWon){ mem.wins = (mem.wins || 0) + 1; mem.currentPlayerStreak = 0; }
    else { mem.losses = (mem.losses || 0) + 1; mem.currentPlayerStreak = (mem.currentPlayerStreak || 0) + 1; mem.bestPlayerStreak = Math.max(mem.bestPlayerStreak || 0, mem.currentPlayerStreak); }
    mem.history.push({ game: gameId, win: !!oracleWon, ts: Date.now(), twist: !!opts.twist, tie: !!opts.tie });
    if (mem.history.length > 40) mem.history = mem.history.slice(-40);
    mem.knownGames[gameId] = (mem.knownGames[gameId] || 0) + 1;
    persist(mem);
  }

  function taunt(){
    const mood = deriveMood();
    return pick(LINES.taunt[mood] || LINES.taunt.focused);
  }

  function farewell(result){
    const arr = LINES.farewell[result] || LINES.farewell.win;
    return pick(arr);
  }

  function stats(){
    return {
      mood: deriveMood(),
      sessions: mem.sessions || 0,
      games: mem.totalGames || 0,
      wins: mem.wins || 0,
      losses: mem.losses || 0,
      ties: mem.ties || 0,
      bestStreak: mem.bestPlayerStreak || 0,
      currentStreak: mem.currentPlayerStreak || 0,
      daysKnown: Math.floor((Date.now() - mem.firstMet) / DAY),
      lastGame: mem.lastGame || '',
      knownGames: mem.knownGames || {}
    };
  }

  // Move scoring — blends 4 inner archetypes by mood-driven weights.
  // Pass an options dict { capture, center, advance, king, exposure }
  // describing the move-feature values; get back a single composite score.
  function score(feats){
    const mood = deriveMood();
    // archetype biases on what they value
    const bias = {
      berserker: { capture:60, center:2,  advance:25, king:8,  exposure:-5  },
      trickster: { capture:30, center:18, advance:5,  king:22, exposure:-2  },
      fortress:  { capture:22, center:25, advance:0,  king:12, exposure:-25 },
      prophet:   { capture:35, center:12, advance:18, king:18, exposure:-15 }
    };
    // mood mixes which archetype "leads"
    const wByMood = {
      humbled:       { fortress:1.6, prophet:1.2, berserker:0.5, trickster:0.5 },
      confident:     { berserker:1.5, trickster:1.0, fortress:0.5, prophet:0.7 },
      sharpening:    { prophet:1.5, fortress:1.0, berserker:0.7, trickster:0.8 },
      reflective:    { prophet:1.5, fortress:0.8, berserker:0.4, trickster:0.6 },
      weary:         { fortress:1.2, prophet:0.8, berserker:0.6, trickster:0.7 },
      curious:       { trickster:1.5, prophet:0.7, berserker:1.0, fortress:0.6 },
      familiar:      { prophet:1.0, fortress:0.9, berserker:1.0, trickster:1.1 },
      returning:     { prophet:1.2, fortress:1.0, berserker:0.9, trickster:0.9 },
      contemplative: { prophet:1.3, fortress:1.0, berserker:0.7, trickster:0.7 },
      focused:       { prophet:1.0, fortress:1.0, berserker:1.0, trickster:1.0 }
    };
    const w = wByMood[mood] || wByMood.focused;
    let total = 0;
    for (const arch of ['berserker','trickster','fortress','prophet']){
      const aw = w[arch] || 1;
      let s = 0;
      for (const k in bias[arch]) s += (feats[k] || 0) * bias[arch][k] / 60;   // normalize
      total += s * aw;
    }
    // small live jitter — alive feel
    total += (Math.random() - 0.5) * 4;
    return total;
  }

  window.Oracle = { greet, recall, record, taunt, farewell, stats, score, deriveMood, name: 'THE ORACLE' };
})();
