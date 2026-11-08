/* ============================================================
 * Blooming World — standalone UI: app shell, map, game,
 * shop, ranks, profile (port of page.tsx + screens)
 * ============================================================ */

const App = {
  screen: 'map',        // map | shop | ranks | profile
  level: null,          // playing level number or null
  player: null,
  bots: null,
  shopTab: 'boosters',
  ranksQuery: '',
  savedFlash: false,
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ---------- app shell ---------- */
function renderApp() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const theme = chapterTheme(Math.floor((store.maxUnlocked() - 1) / CHAPTER_SIZE));
  root.appendChild(buildBackground(theme.bg, 99, true));

  const screenBox = el('div', 'screen');
  root.appendChild(screenBox);
  if (App.level !== null) {
    Game.mount(screenBox);
  } else {
    if (App.screen === 'map') renderMap(screenBox);
    else if (App.screen === 'shop') renderShop(screenBox);
    else if (App.screen === 'ranks') renderRanks(screenBox);
    else renderProfile(screenBox);
    screenBox.appendChild(buildNav());
  }
}

function buildNav() {
  const nav = el('nav', 'bottom-nav');
  nav.setAttribute('aria-label', 'Main navigation');
  const row = el('div', 'row');
  const items = [
    { key: 'map', icon: '🗺️', label: store.t('nav.map') },
    { key: 'shop', icon: '🛍️', label: store.t('nav.shop') },
    { key: 'ranks', icon: '🏆', label: store.t('nav.ranks') },
    { key: 'profile', icon: '👤', label: store.t('nav.profile') },
  ];
  for (const item of items) {
    const b = el('button', 'nav-btn' + (App.screen === item.key ? ' active' : ''));
    b.type = 'button';
    b.innerHTML = '<span class="ico">' + item.icon + '</span><span>' + item.label + '</span>';
    b.onclick = () => { sfx.click(); App.screen = item.key; renderApp(); };
    row.appendChild(b);
  }
  nav.appendChild(row);
  return nav;
}

function coinPill() {
  const d = el('span', 'coin-pill');
  d.innerHTML = '🪙 ' + fmt(App.player.coins);
  return d;
}

let toastTimer = null;
function showToast(msg) {
  let wrap = document.getElementById('bm-toast');
  if (!wrap) {
    wrap = el('div', 'toast-wrap');
    wrap.id = 'bm-toast';
    document.body.appendChild(wrap);
  }
  wrap.innerHTML = '';
  const box = el('div', 'toast-box bm-toast-in', msg);
  wrap.appendChild(box);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { wrap.innerHTML = ''; }, 1800);
}

/* ============================================================
 * MAP SCREEN
 * ============================================================ */
function renderMap(box) {
  const wrap = el('div', 'map-wrap');
  const t = (k, v) => store.t(k, v);

  const head = el('div', 'map-head');
  head.innerHTML = '<div><h1 class="bm-text-outline">' + t('app.title') + '</h1><p class="bm-text-outline">' + t('app.subtitle') + '</p></div>';
  const starsPill = el('span', 'coin-pill');
  starsPill.innerHTML = '⭐ ' + store.totalStars();
  head.appendChild(starsPill);
  wrap.appendChild(head);

  const maxUnlocked = store.maxUnlocked();
  const currentChapter = Math.min(TOTAL_CHAPTERS - 1, Math.floor((maxUnlocked - 1) / CHAPTER_SIZE));

  const playBtn = el('button', 'btn btn-primary');
  playBtn.type = 'button';
  playBtn.style.cssText = 'width:100%;margin-bottom:16px;padding:18px;font-size:18px;';
  playBtn.textContent = '▶ ' + t('map.continue') + ' · ' + t('map.level') + ' ' + maxUnlocked;
  playBtn.onclick = () => { sfx.click(); App.level = maxUnlocked; renderApp(); };
  wrap.appendChild(playBtn);

  for (const ch of CHAPTERS) {
    const unlocked = ch.id <= currentChapter;
    const theme = chapterTheme(ch.id);
    const card = el('div', 'chapter-card' + (unlocked ? '' : ' locked'));
    card.appendChild(buildBackground(theme.bg, ch.id + 11));
    const inner = el('div', 'chapter-inner');

    const topRow = el('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';
    const titleBox = el('div');
    titleBox.innerHTML =
      '<div class="chapter-kicker bm-text-outline">' + t('map.chapter') + ' ' + (ch.id + 1) + '</div>' +
      '<div class="chapter-name bm-text-outline">' + ch.name[App.player.lang] + '</div>' +
      '<div class="chapter-tag bm-text-outline">' + ch.tagline[App.player.lang] + '</div>';
    topRow.appendChild(titleBox);
    const levels = Array.from({ length: CHAPTER_SIZE }, (_, i) => ch.id * CHAPTER_SIZE + i + 1);
    const cleared = levels.filter((lv) => (App.player.stars[lv] || 0) > 0).length;
    if (cleared === CHAPTER_SIZE) {
      const bloom = el('span', 'bloomed-pill');
      bloom.textContent = '🌸 ' + t('map.bloomed');
      topRow.appendChild(bloom);
    }
    inner.appendChild(topRow);

    const grid = el('div', 'levels-grid');
    for (const lv of levels) {
      const lvStars = App.player.stars[lv] || 0;
      const lvUnlocked = lv <= maxUnlocked;
      const isCurrent = lv === maxUnlocked && ch.id === currentChapter;
      const btn = el('button', 'level-btn ' + (lvUnlocked ? (isCurrent ? 'current' : 'open') : 'locked'));
      btn.type = 'button';
      btn.setAttribute('aria-label', t('map.level') + ' ' + lv);
      btn.innerHTML = '<span>' + (lvUnlocked ? lv : '🔒') + '</span>' +
        '<span class="level-stars">' + (lvStars > 0 ? '⭐'.repeat(lvStars) : (lvUnlocked ? '' : '·')) + '</span>';
      if (lvUnlocked) {
        btn.onclick = () => { sfx.click(); App.level = lv; renderApp(); };
      } else {
        btn.disabled = true;
      }
      grid.appendChild(btn);
    }
    inner.appendChild(grid);
    if (!unlocked) {
      const note = el('div', 'bm-text-outline');
      note.style.cssText = 'margin-top:8px;text-align:center;font-size:11px;font-weight:700;opacity:.85;';
      note.textContent = t('map.nextChapter', { n: maxUnlocked - ch.id * CHAPTER_SIZE });
      inner.appendChild(note);
    }
    card.appendChild(inner);
    wrap.appendChild(card);
  }

  const soon = el('div');
  soon.style.cssText = 'text-align:center;font-size:11px;opacity:.75;padding:6px 0 2px;';
  soon.textContent = t('map.comingSoon');
  wrap.appendChild(soon);

  box.appendChild(wrap);
}

/* ============================================================
 * GAME SCREEN
 * ============================================================ */
const Game = {
  cfg: null, board: null, moves: 0, score: 0,
  progress: { colors: [0, 0, 0, 0, 0, 0], items: 0, stones: 0 },
  busy: false, selected: null, activeBooster: null, buyBoosterId: null,
  winInfo: null, loseOpen: false, plus5Used: 0, attempt: 0,
  rng: () => 0, playId: 0, snapshot: null, shakeIdx: null,
  clearing: new Set(), born: new Set(), spawned: new Set(), stonesHit: new Set(),

  mount(box) {
    const lv = App.level;
    this.cfg = getLevelConfig(lv);
    this.rng = mulberry32(lv * 7919 + this.attempt * 104729 + 13);
    this.board = createBoard(this.cfg, this.rng);
    this.moves = this.cfg.moves;
    this.score = 0;
    this.progress = { colors: [0, 0, 0, 0, 0, 0], items: 0, stones: 0 };
    this.busy = false;
    this.selected = null;
    this.activeBooster = null;
    this.buyBoosterId = null;
    this.winInfo = null;
    this.loseOpen = false;
    this.plus5Used = 0;
    this.snapshot = null;
    this.shakeIdx = null;
    this.clearing = new Set(); this.born = new Set(); this.spawned = new Set(); this.stonesHit = new Set();
    this.buildDom(box);
    this.rebuildBoard();
    this.updateHud();
    this.renderModals();
  },

  theme() { return chapterTheme(this.cfg.chapter); },
  skin() { return GEM_SKINS.find((s) => s.id === App.player.equipped.skin) || GEM_SKINS[0]; },
  tileFx() {
    if (!App.player.equipped.tileEffect) return null;
    return EFFECTS.find((e) => e.id === App.player.equipped.tileEffect) || null;
  },
  isBoss() { return this.cfg.mode === 'tap'; },

  buildDom(box) {
    const t = (k, v) => store.t(k, v);
    const theme = this.theme();
    const wrap = el('div', 'game-wrap');
    wrap.style.background = 'none';

    // top bar
    const top = el('div', 'game-top');
    const exitBtn = el('button', 'btn btn-ghost');
    exitBtn.type = 'button';
    exitBtn.style.cssText = 'padding:7px 14px;font-size:13px;';
    exitBtn.textContent = '← ' + t('game.exit');
    exitBtn.onclick = () => {
      this.playId += 1;
      sfx.click();
      App.level = null;
      renderApp();
    };
    top.appendChild(exitBtn);
    const titleBox = el('div', 'game-title bm-text-outline');
    titleBox.innerHTML = t('map.level') + ' ' + this.cfg.level +
      (this.isBoss() ? '<span class="boss-badge bm-text-outline">' + t('game.bossLevel') + '</span>' : '');
    top.appendChild(titleBox);
    const coins = coinPill();
    coins.id = 'game-coins';
    top.appendChild(coins);
    wrap.appendChild(top);

    // stats row
    const stats = el('div', 'stats-row');
    const movesBox = el('div', 'stat-box');
    movesBox.innerHTML = '<div class="lbl">' + t('game.moves') + '</div><div class="val" id="hud-moves">' + this.moves + '</div>';
    const scoreBox = el('div', 'stat-box');
    scoreBox.innerHTML = '<div class="lbl">' + t('game.score') + '</div><div class="val" id="hud-score">0</div>';
    stats.appendChild(movesBox);
    stats.appendChild(scoreBox);
    wrap.appendChild(stats);

    // goals
    const goals = el('div', 'goals-row');
    goals.id = 'goals-row';
    wrap.appendChild(goals);

    // board
    const boardOuter = el('div', 'board-outer');
    const boardBox = el('div', 'board-box');
    boardBox.style.background = theme.bg.dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.15)';
    boardBox.style.backdropFilter = 'blur(2px)';
    boardBox.style.boxShadow = theme.bg.dark
      ? '0 8px 30px rgba(0,0,0,.5), inset 0 0 40px rgba(34,224,255,.06)'
      : '0 8px 30px rgba(0,0,0,.25), inset 0 0 30px rgba(255,255,255,.08)';
    this.boardInner = el('div', 'board-inner');
    this.boardInner.id = 'board-inner';
    this.boardInner.style.aspectRatio = this.cfg.w + ' / ' + this.cfg.h;
    if (theme.tile.pattern === 'pixel') this.boardInner.classList.add('bm-checker-light');
    this.boardInner.onclick = (e) => {
      const cellEl = e.target.closest('[data-idx]');
      if (!cellEl) return;
      this.handleCellClick(Number(cellEl.dataset.idx));
    };
    boardBox.appendChild(this.boardInner);
    boardOuter.appendChild(boardBox);
    wrap.appendChild(boardOuter);

    // hint
    const hint = el('div', 'hint-line');
    hint.id = 'hint-line';
    wrap.appendChild(hint);

    // boosters
    const boosters = el('div', 'boosters-row');
    boosters.id = 'boosters-row';
    wrap.appendChild(boosters);
    const cancelRow = el('div', 'cancel-row');
    cancelRow.id = 'cancel-row';
    wrap.appendChild(cancelRow);

    // modals container
    this.modalBox = el('div');
    wrap.appendChild(this.modalBox);

    box.appendChild(wrap);
    this.renderBoosters();
    this.updateHint();
  },

  updateHint() {
    const hint = document.getElementById('hint-line');
    if (!hint) return;
    hint.textContent = this.activeBooster
      ? store.t('game.selectTarget') + ' (' + BOOSTER_MAP[this.activeBooster].icon + ')'
      : this.isBoss() ? store.t('game.tapHint') : store.t('game.swapHint');
    const cancelRow = document.getElementById('cancel-row');
    cancelRow.innerHTML = '';
    if (this.activeBooster) {
      const btn = el('button', 'btn btn-ghost');
      btn.type = 'button';
      btn.style.cssText = 'padding:5px 16px;font-size:12px;';
      btn.textContent = store.t('game.cancel');
      btn.onclick = () => { this.activeBooster = null; this.renderBoosters(); this.updateHint(); };
      cancelRow.appendChild(btn);
    }
  },

  renderBoosters() {
    const row = document.getElementById('boosters-row');
    if (!row) return;
    row.innerHTML = '';
    for (const id of ['hammer', 'bomb', 'cross', 'shuffle', 'undo', 'moves5']) {
      const def = BOOSTER_MAP[id];
      const count = App.player.boosters[id] || 0;
      const btn = el('button', 'booster-btn' + (this.activeBooster === id ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-label', def.name[App.player.lang]);
      btn.innerHTML = '<span>' + def.icon + '</span>' +
        '<span class="booster-count ' + (count > 0 ? 'has' : 'zero') + '">' + count + '</span>';
      btn.onclick = () => this.handleBoosterButton(id);
      row.appendChild(btn);
    }
  },

  goalMet(p, sc) {
    return this.cfg.goals.every((g) => {
      if (g.type === 'score') return sc >= g.count;
      if (g.type === 'collect') return (p.colors[g.color] || 0) >= g.count;
      if (g.type === 'item') return p.items >= g.count;
      if (g.type === 'stone') return p.stones >= g.count;
      return false;
    });
  },

  updateHud() {
    const mv = document.getElementById('hud-moves');
    if (mv) mv.textContent = this.moves;
    const sc = document.getElementById('hud-score');
    if (sc) sc.textContent = fmt(this.score);
    const coins = document.getElementById('game-coins');
    if (coins) coins.innerHTML = '🪙 ' + fmt(App.player.coins);
    const goals = document.getElementById('goals-row');
    if (!goals) return;
    goals.innerHTML = '';
    for (const g of this.cfg.goals) {
      let done = false;
      let content = '';
      if (g.type === 'score') {
        done = this.score >= g.count;
        content = '🏆 ' + store.t('game.scoreGoal') + ' ' + fmt(this.score) + '/' + fmt(g.count);
      } else if (g.type === 'collect') {
        const have = this.progress.colors[g.color] || 0;
        done = have >= g.count;
        const shape = gemShapeCss(g.color);
        const color = (this.skin().palette || this.theme().palette)[g.color] || '#999';
        content = '<span style="display:inline-block;width:14px;height:14px;border:1px solid rgba(255,255,255,.6);' +
          (shape.clipPath ? 'clip-path:' + shape.clipPath + ';' : '') +
          'border-radius:' + shape.borderRadius + ';background:' + color + '"></span> ' +
          have + '/' + g.count;
      } else if (g.type === 'item') {
        done = this.progress.items >= g.count;
        content = '🌰 ' + store.t('game.itemGoal') + ' ' + this.progress.items + '/' + g.count;
      } else {
        done = this.progress.stones >= g.count;
        content = '🪨 ' + store.t('game.stoneGoal') + ' ' + Math.min(this.progress.stones, g.count) + '/' + g.count;
      }
      const chip = el('span', 'chip' + (done ? ' done' : ''));
      chip.innerHTML = content + (done ? ' ✓' : '');
      goals.appendChild(chip);
    }
  },

  rebuildBoard() {
    const inner = this.boardInner;
    if (!inner) return;
    inner.innerHTML = '';
    const w = this.board.w, h = this.board.h;
    const cw = 100 / w, chh = 100 / h;
    for (let idx = 0; idx < this.board.cells.length; idx++) {
      const cell = this.board.cells[idx];
      if (!cell) continue;
      const r = Math.floor(idx / w), c = idx % w;
      const div = el('div', 'cell');
      div.style.cssText = 'left:' + (c * cw) + '%;top:' + (r * chh) + '%;width:' + cw + '%;height:' + chh + '%;';
      div.dataset.idx = String(idx);

      if (cell.blocker) {
        const hp = cell.blocker.hp;
        if (this.stonesHit.has(idx)) div.classList.add('bm-stone-hit');
        const pips = Array.from({ length: Math.max(1, hp) }, () => '<span></span>').join('');
        div.innerHTML = '<div class="stone-wrap" style="clip-path:polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%);background:rgba(28,24,20,.6);">' +
          '<div style="position:absolute;inset:8%;' +
          'background:' + (hp >= 2 ? 'linear-gradient(160deg,#9aa2ac,#5c646e)' : 'linear-gradient(160deg,#8a92a0,#4a5260)') + ';' +
          'box-shadow:inset 0 2px 3px rgba(255,255,255,.25), inset 0 -3px 5px rgba(0,0,0,.35);">' +
          (hp === 1 ? '<div style="height:100%;width:100%;opacity:.5;background:linear-gradient(115deg, transparent 42%, rgba(20,24,30,.7) 46%, rgba(20,24,30,.7) 50%, transparent 54%), linear-gradient(245deg, transparent 60%, rgba(20,24,30,.6) 66%, rgba(20,24,30,.6) 70%, transparent 74%)"></div>' : '') +
          '</div><div class="stone-pips">' + pips + '</div></div>';
        inner.appendChild(div);
        continue;
      }
      if (!cell.tile) {
        div.classList.add('void-cell');
        div.innerHTML = '<div class="void-dot"></div>';
        inner.appendChild(div);
        continue;
      }
      const isSelected = this.selected === idx;
      const tile = cell.tile;
      let anim = '';
      if (this.clearing.has(tile.id)) anim = 'pop';
      else if (this.born.has(idx)) anim = 'born';
      else if (this.spawned.has(tile.id)) anim = 'fall';
      const btn = el('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'cell ' + r + '-' + c);
      btn.className = (isSelected ? 'sel' : '') + (this.activeBooster ? ' targeting' : '');
      btn.innerHTML = tileHtml(tile, this.theme(), this.skin(), anim);
      div.appendChild(btn);
      if (this.shakeIdx === idx) div.classList.add('bm-shake');
      inner.appendChild(div);
    }
  },

  shake(idx) {
    this.shakeIdx = idx;
    this.rebuildBoard();
    setTimeout(() => {
      if (this.shakeIdx === idx) { this.shakeIdx = null; this.rebuildBoard(); }
    }, 600);
  },

  spawnParticles(frame) {
    if (!frame.board || frame.clearingIds.length === 0) return;
    const cells = frame.clearingIds
      .map((id) => frame.board.cells.findIndex((c) => c && c.tile && c.tile.id === id))
      .filter((i) => i >= 0)
      .slice(0, 14);
    const glyph = this.tileFx() ? this.tileFx().visual : '•';
    const color = this.skin().palette || this.theme().palette;
    for (const idx of cells) {
      const r = Math.floor(idx / frame.board.w), c = idx % frame.board.w;
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 45;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      const p = el('span', 'bm-particle', glyph);
      p.style.left = ((c + 0.5) / frame.board.w * 100) + '%';
      p.style.top = ((r + 0.5) / frame.board.h * 100) + '%';
      p.style.fontSize = '14px';
      p.style.color = color[idx % color.length] || '#fff';
      p.style.setProperty('--dx', dx + 'px');
      p.style.setProperty('--dy', dy + 'px');
      p.style.setProperty('--rot', (Math.random() * 240 - 120) + 'deg');
      this.boardInner.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  },

  spawnFloat(xPct, yPct, text) {
    const f = el('span', 'float-txt bm-float-up', text);
    f.style.left = xPct + '%';
    f.style.top = yPct + '%';
    this.boardInner.appendChild(f);
    setTimeout(() => f.remove(), 950);
  },

  async playFrames(res) {
    const playId = ++this.playId;
    this.busy = true;
    for (const frame of res.frames) {
      if (playId !== this.playId) return;
      this.board = frame.board;
      this.clearing = new Set(frame.clearingIds);
      this.born = new Set(frame.bornIds);
      this.spawned = new Set(frame.spawnIds);
      this.stonesHit = new Set(frame.stonesHit);
      if (frame.points > 0) {
        this.score += frame.points;
        if (frame.clearingIds.length > 0) {
          const idxs = frame.clearingIds
            .map((id) => frame.board.cells.findIndex((c) => c && c.tile && c.tile.id === id))
            .filter((i) => i >= 0);
          if (idxs.length > 0) {
            const cx = idxs.reduce((a, i) => a + ((i % frame.board.w) + 0.5), 0) / idxs.length / frame.board.w;
            const cy = idxs.reduce((a, i) => a + (Math.floor(i / frame.board.w) + 0.5), 0) / idxs.length / frame.board.h;
            this.spawnFloat(cx * 100, cy * 100, '+' + frame.points);
          }
        }
        this.updateHud();
      }
      if (frame.clearingIds.length > 0) { this.spawnParticles(frame); sfx.match(frame.cascade); }
      if (frame.stonesHit.length > 0) sfx.boom();
      if (frame.collectedIds.length > 0) sfx.coin();
      if (frame.cascade >= 2) {
        this.spawnFloat(50, 46, 'x' + frame.cascade + '!');
      }
      this.rebuildBoard();
      await sleep(frame.clearingIds.length > 0 ? 250 : 300);
      if (playId !== this.playId) return;
      this.clearing = new Set(); this.born = new Set(); this.spawned = new Set(); this.stonesHit = new Set();
      this.rebuildBoard();
    }
    this.progress.colors = this.progress.colors.map((v, i) => v + (res.colorsCollected[i] || 0));
    this.progress.items += res.itemsCollected;
    this.progress.stones += res.stonesDestroyed;
    if (res.shuffled) showToast(store.t('game.shuffled'));
    this.updateHud();
    this.busy = false;
  },

  afterMove(res, movesUsed) {
    const p = {
      colors: this.progress.colors.map((v, i) => v + (res.colorsCollected[i] || 0)),
      items: this.progress.items + res.itemsCollected,
      stones: this.progress.stones + res.stonesDestroyed,
    };
    const sc = this.score;
    const movesLeft = this.moves;
    if (this.goalMet(p, sc)) {
      const bonus = movesLeft * 50;
      const finalScore = sc + bonus;
      const stars = finalScore >= this.cfg.star3 ? 3 : finalScore >= this.cfg.star2 ? 2 : 1;
      sfx.win();
      setTimeout(() => sfx.star(1), 400);
      const info = store.recordWin(this.cfg.level, stars, finalScore, res.maxCascade, movesUsed);
      this.score = finalScore;
      this.winInfo = { stars, reward: info.reward, firstClear: info.firstClear, newStars: info.newStars, bonus };
      this.updateHud();
      this.renderModals();
    } else if (movesLeft <= 0) {
      sfx.lose();
      this.loseOpen = true;
      this.renderModals();
    }
  },

  async doMove(res, opts) {
    opts = opts || {};
    if (opts.snapshot) this.snapshot = opts.snapshot;
    if (opts.consume !== false) {
      this.moves -= 1;
      this.updateHud();
    }
    await this.playFrames(res);
    this.afterMove(res, opts.consume === false ? 0 : 1);
  },

  handleCellClick(idx) {
    if (!this.board || !this.cfg || this.busy || this.winInfo || this.loseOpen) return;
    const cell = this.board.cells[idx];
    if (!cell) return;

    if (this.activeBooster) {
      const r = Math.floor(idx / this.board.w), c = idx % this.board.w;
      if (this.activeBooster === 'hammer') {
        if (store.useBooster('hammer')) {
          this.activeBooster = null;
          this.renderBoosters(); this.updateHint();
          void this.doMove(hammerHit(this.board, r, c, this.cfg, this.rng), { consume: false });
        }
      } else if (this.activeBooster === 'bomb') {
        if (store.useBooster('bomb')) {
          this.activeBooster = null;
          this.renderBoosters(); this.updateHint();
          void this.doMove(bombBlast(this.board, r, c, this.cfg, this.rng), { consume: false });
        }
      } else if (this.activeBooster === 'cross') {
        if (store.useBooster('cross')) {
          this.activeBooster = null;
          this.renderBoosters(); this.updateHint();
          void this.doMove(crossBlast(this.board, r, c, this.cfg, this.rng), { consume: false });
        }
      }
      return;
    }

    if (this.cfg.mode === 'tap') {
      const res = tryTap(this.board, Math.floor(idx / this.board.w), idx % this.board.w, this.cfg, this.rng);
      if (res.valid) {
        this.moves -= 1;
        this.updateHud();
        void (async () => {
          await this.playFrames(res);
          this.afterMove(res, 1);
        })();
      } else {
        this.shake(idx);
      }
      return;
    }

    // swap mode
    const tile = cell.tile;
    if (!tile || tile.kind !== 'gem') return;
    if (this.selected === null) {
      this.selected = idx;
      sfx.click();
      this.rebuildBoard();
      return;
    }
    if (this.selected === idx) {
      this.selected = null;
      this.rebuildBoard();
      return;
    }
    const rs = Math.floor(this.selected / this.board.w), cs = this.selected % this.board.w;
    const rt = Math.floor(idx / this.board.w), ct = idx % this.board.w;
    if (Math.abs(rs - rt) + Math.abs(cs - ct) !== 1) {
      this.selected = idx;
      sfx.click();
      this.rebuildBoard();
      return;
    }
    const snapshot = {
      board: this.board, moves: this.moves, score: this.score,
      colors: [...this.progress.colors], items: this.progress.items, stones: this.progress.stones,
    };
    const res = trySwap(this.board, this.selected, idx, this.cfg, this.rng);
    if (!res.valid) {
      sfx.swap();
      this.selected = null;
      this.shake(idx);
      return;
    }
    this.selected = null;
    sfx.swap();
    void this.doMove(res, { snapshot });
  },

  handleBoosterButton(id) {
    if (this.busy || this.winInfo || this.loseOpen) return;
    sfx.click();
    if (id === 'shuffle') {
      if (this.board && this.cfg && store.useBooster('shuffle')) {
        const res = shuffleBoard(this.board, this.cfg, this.rng);
        this.board = res.frames[0].board;
        this.rebuildBoard();
        this.renderBoosters();
      } else if ((App.player.boosters.shuffle || 0) <= 0) {
        this.buyBoosterId = 'shuffle';
        this.renderModals();
      }
      return;
    }
    if (id === 'undo') {
      const snap = this.snapshot;
      if (snap && store.useBooster('undo')) {
        this.board = snap.board;
        this.moves = snap.moves;
        this.score = snap.score;
        this.progress = { colors: [...snap.colors], items: snap.items, stones: snap.stones };
        this.snapshot = null;
        this.rebuildBoard();
        this.updateHud();
        this.renderBoosters();
      } else if ((App.player.boosters.undo || 0) <= 0) {
        this.buyBoosterId = 'undo';
        this.renderModals();
      }
      return;
    }
    if (id === 'moves5') {
      this.buyBoosterId = 'moves5';
      this.renderModals();
      return;
    }
    if ((App.player.boosters[id] || 0) > 0) {
      this.activeBooster = this.activeBooster === id ? null : id;
      this.renderBoosters();
      this.updateHint();
    } else {
      this.buyBoosterId = id;
      this.renderModals();
    }
  },

  handlePlus5() {
    if ((App.player.boosters.moves5 || 0) > 0) {
      store.useBooster('moves5');
    } else if (App.player.coins >= BOOSTER_MAP.moves5.price) {
      store.buyBooster('moves5');
    } else {
      return;
    }
    sfx.coin();
    this.loseOpen = false;
    this.moves += 5;
    this.plus5Used += 1;
    this.updateHud();
    this.renderModals();
  },

  renderModals() {
    const box = this.modalBox;
    if (!box) return;
    box.innerHTML = '';
    const t = (k, v) => store.t(k, v);

    if (this.winInfo) {
      const over = el('div', 'modal-overlay');
      const modal = el('div', 'modal win');
      modal.innerHTML = '<h2>' + t('game.win') + '</h2>';
      const starsRow = el('div', 'stars-row');
      for (let n = 1; n <= 3; n++) {
        const s = el('span', n <= this.winInfo.stars ? 'bm-star-pop' : 'dim', '⭐');
        if (n <= this.winInfo.stars) s.style.animationDelay = (n * 0.22) + 's';
        starsRow.appendChild(s);
      }
      modal.appendChild(starsRow);
      const scoreLine = el('div', 'sub');
      scoreLine.innerHTML = t('game.score') + ': <b>' + fmt(this.score) + '</b>' +
        (this.winInfo.bonus > 0 ? '<div style="color:#fde68a">+' + this.winInfo.bonus + ' ⚡</div>' : '');
      modal.appendChild(scoreLine);
      const reward = el('div', 'reward-pill');
      reward.textContent = '🪙 +' + this.winInfo.reward;
      modal.appendChild(reward);
      if (this.winInfo.firstClear) {
        const l = el('div', 'sub');
        l.style.cssText = 'font-weight:700;color:#d1fae5;';
        l.textContent = t('game.firstWin');
        modal.appendChild(l);
      } else if (this.winInfo.newStars) {
        const l = el('div', 'sub');
        l.style.cssText = 'font-weight:700;color:#fde68a;';
        l.textContent = t('game.newStars');
        modal.appendChild(l);
      }
      const col = el('div', 'col');
      const nextBtn = el('button', 'btn btn-white');
      nextBtn.type = 'button';
      nextBtn.textContent = t('game.next') + ' →';
      nextBtn.onclick = () => {
        this.winInfo = null;
        if (this.cfg.level < TOTAL_LEVELS) { App.level = this.cfg.level + 1; renderApp(); }
        else { App.level = null; renderApp(); }
      };
      col.appendChild(nextBtn);
      const row2 = el('div', 'row2');
      const retryBtn = el('button', 'btn btn-ghost');
      retryBtn.style.flex = '1';
      retryBtn.type = 'button';
      retryBtn.textContent = t('game.retry');
      retryBtn.onclick = () => { this.winInfo = null; this.attempt += 1; renderApp(); };
      row2.appendChild(retryBtn);
      const exitBtn = el('button', 'btn btn-ghost');
      exitBtn.style.flex = '1';
      exitBtn.type = 'button';
      exitBtn.textContent = t('game.exit');
      exitBtn.onclick = () => { this.winInfo = null; App.level = null; renderApp(); };
      row2.appendChild(exitBtn);
      col.appendChild(row2);
      modal.appendChild(col);
      over.appendChild(modal);
      box.appendChild(over);
      return;
    }

    if (this.loseOpen) {
      const over = el('div', 'modal-overlay');
      const modal = el('div', 'modal lose');
      modal.innerHTML = '<h2>' + t('game.lose') + '</h2>';
      const col = el('div', 'col');
      if (this.plus5Used < 2) {
        const p5 = el('button', 'btn btn-amber');
        p5.type = 'button';
        p5.textContent = t('game.plus5') + ' · 🪙 ' + BOOSTER_MAP.moves5.price + ' ' + t('game.buyAndUse').toLowerCase();
        p5.onclick = () => this.handlePlus5();
        col.appendChild(p5);
      }
      const retryBtn = el('button', 'btn btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = t('game.retry');
      retryBtn.onclick = () => { this.loseOpen = false; this.attempt += 1; renderApp(); };
      col.appendChild(retryBtn);
      const exitBtn = el('button', 'btn btn-ghost');
      exitBtn.type = 'button';
      exitBtn.textContent = t('game.exit');
      exitBtn.onclick = () => { this.loseOpen = false; App.level = null; renderApp(); };
      col.appendChild(exitBtn);
      modal.appendChild(col);
      over.appendChild(modal);
      box.appendChild(over);
      return;
    }

    if (this.buyBoosterId) {
      const id = this.buyBoosterId;
      const def = BOOSTER_MAP[id];
      const over = el('div', 'modal-overlay');
      const modal = el('div', 'modal light');
      modal.innerHTML = '<h2>' + def.icon + ' ' + def.name[App.player.lang] + '</h2>' +
        '<div class="sub" style="opacity:.7">' + def.desc[App.player.lang] + '</div>';
      const col = el('div', 'col');
      const buyBtn = el('button', 'btn btn-amber');
      buyBtn.type = 'button';
      buyBtn.textContent = '🪙 ' + def.price + ' · ' + t('game.buyAndUse');
      buyBtn.onclick = () => {
        if (id === 'moves5') {
          this.handlePlus5();
        } else if (store.buyBooster(id)) {
          sfx.coin();
          if (this.activeBooster === null && id !== 'shuffle' && id !== 'undo') {
            this.activeBooster = id;
          }
        } else {
          showToast(t('shop.notEnough'));
        }
        this.buyBoosterId = null;
        this.renderBoosters();
        this.updateHint();
        this.renderModals();
        this.updateHud();
      };
      col.appendChild(buyBtn);
      const cancelBtn = el('button', 'btn');
      cancelBtn.type = 'button';
      cancelBtn.style.cssText = 'background:#e2e8f0;color:#334155;';
      cancelBtn.textContent = t('game.cancel');
      cancelBtn.onclick = () => { this.buyBoosterId = null; this.renderModals(); };
      col.appendChild(cancelBtn);
      modal.appendChild(col);
      over.appendChild(modal);
      box.appendChild(over);
    }
  },
};

/* ============================================================
 * SHOP SCREEN
 * ============================================================ */
function renderShop(box) {
  const wrap = el('div', 'panel-wrap');
  const t = (k) => store.t(k);

  const head = el('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
  head.innerHTML = '<h1 class="panel-title bm-text-outline">' + t('shop.title') + '</h1>';
  head.appendChild(coinPill());
  wrap.appendChild(head);

  const tabs = ['boosters', 'bank', 'skins', 'avatars', 'frames', 'names', 'effects'];
  const tabsRow = el('div', 'tabs-row');
  for (const tab of tabs) {
    const b = el('button', 'tab-btn' + (App.shopTab === tab ? ' active' : ''));
    b.type = 'button';
    b.textContent = t('shop.tab.' + tab);
    b.onclick = () => { sfx.click(); App.shopTab = tab; renderApp(); };
    tabsRow.appendChild(b);
  }
  wrap.appendChild(tabsRow);

  const content = el('div');
  const lang = App.player.lang;
  const equipBtn = (kind, id, price, ownedNow) => {
    const equippedId = kind === 'skin' ? App.player.equipped.skin
      : kind === 'avatar' ? App.player.equipped.avatar
      : kind === 'frame' ? App.player.equipped.frame
      : kind === 'nameStyle' ? App.player.equipped.nameStyle
      : kind === 'tileEffect' ? App.player.equipped.tileEffect
      : kind === 'avatarEffect' ? App.player.equipped.avatarEffect
      : App.player.equipped.nameEffect;
    const owned = ownedNow !== undefined ? ownedNow : App.player.owned[
      { skin: 'skins', avatar: 'avatars', frame: 'frames', nameStyle: 'nameStyles', tileEffect: 'effects', avatarEffect: 'effects', nameEffect: 'effects' }[kind]
    ].includes(id);
    const btn = el('button', 'btn ' + (equippedId === id ? 'btn-dark' : 'btn-primary'));
    btn.type = 'button';
    btn.style.cssText = 'padding:7px 14px;font-size:12px;white-space:nowrap;';
    if (equippedId === id) { btn.textContent = '✓ ' + t('shop.equipped'); btn.onclick = () => {}; }
    else if (owned) {
      btn.textContent = t('shop.equip');
      btn.onclick = () => { sfx.click(); store.equip(kind, id); renderApp(); };
    } else {
      btn.innerHTML = '🪙 ' + price + ' · ' + t('shop.buy');
      btn.onclick = () => {
        if (store.buyCosmetic(
          { skin: 'skins', avatar: 'avatars', frame: 'frames', nameStyle: 'nameStyles', tileEffect: 'effects', avatarEffect: 'effects', nameEffect: 'effects' }[kind],
          id, price,
        )) { sfx.coin(); showToast(t('shop.purchased')); }
        else showToast(t('shop.notEnough'));
        renderApp();
      };
    }
    return btn;
  };

  if (App.shopTab === 'boosters') {
    for (const b of BOOSTERS) {
      const item = el('div', 'shop-item');
      item.innerHTML = '<span style="font-size:26px">' + b.icon + '</span>' +
        '<div class="info"><div class="nm">' + b.name[lang] + '</div><div class="ds">' + b.desc[lang] + '</div></div>' +
        '<div style="text-align:right"><div class="pr">🪙 ' + b.price + '</div><div class="ds">×' + (App.player.boosters[b.id] || 0) + '</div></div>';
      const buy = el('button', 'btn btn-amber');
      buy.type = 'button';
      buy.style.cssText = 'padding:7px 14px;font-size:12px;white-space:nowrap;';
      buy.textContent = t('shop.buy');
      buy.onclick = () => {
        if (store.buyBooster(b.id)) { sfx.coin(); showToast(t('shop.purchased')); }
        else showToast(t('shop.notEnough'));
        renderApp();
      };
      item.appendChild(buy);
      content.appendChild(item);
    }
  } else if (App.shopTab === 'bank') {
    const note = el('div', 'shop-item');
    note.innerHTML = '<span style="font-size:26px">🏦</span><div class="info"><div class="nm">' + t('shop.simulatePay') + '</div><div class="ds">' + t('shop.demoNote') + '</div></div>';
    content.appendChild(note);
    for (const pack of COIN_PACKS) {
      const item = el('div', 'shop-item');
      item.innerHTML = '<span style="font-size:26px">🪙</span>' +
        '<div class="info"><div class="nm">' + fmt(pack.coins) + ' ' + t('common.coins') + (pack.bonus ? ' <span style="color:#34d399">' + pack.bonus + '</span>' : '') + '</div></div>' +
        '<span class="pr">' + pack.priceLabel + '</span>';
      const buy = el('button', 'btn btn-primary');
      buy.type = 'button';
      buy.style.cssText = 'padding:7px 14px;font-size:12px;white-space:nowrap;';
      buy.textContent = t('shop.simulatePay');
      buy.onclick = () => { sfx.coin(); store.addCoins(pack.coins); showToast(t('shop.purchased')); renderApp(); };
      item.appendChild(buy);
      content.appendChild(item);
    }
  } else if (App.shopTab === 'skins') {
    const grid = el('div', 'skins-grid');
    for (const s of GEM_SKINS) {
      const card = el('div', 'skin-card' + (App.player.equipped.skin === s.id ? ' equipped' : ''));
      const prev = el('div', 'skin-preview');
      prev.innerHTML = ANCHORS.map((_, ci) => previewTileHtml(ci, s)).join('');
      card.appendChild(prev);
      card.innerHTML = card.innerHTML + '<div style="font-size:12px;font-weight:800">' + s.name[lang] + '</div>';
      card.appendChild(equipBtn('skin', s.id, s.price, App.player.owned.skins.includes(s.id)));
      grid.appendChild(card);
    }
    content.appendChild(grid);
  } else if (App.shopTab === 'avatars') {
    const grid = el('div', 'skins-grid');
    for (const a of AVATARS) {
      const card = el('div', 'skin-card' + (App.player.equipped.avatar === a.id ? ' equipped' : ''));
      const bubble = el('div', 'avatar-bubble');
      bubble.style.cssText += 'margin:0 auto 6px;width:44px;height:44px;font-size:24px;background:' + a.bg + ';box-shadow:' + (App.player.equipped.avatar === a.id ? '0 0 0 2px #fbbf24' : 'none') + ';';
      bubble.textContent = a.emoji;
      card.appendChild(bubble);
      card.appendChild(equipBtn('avatar', a.id, a.price, App.player.owned.avatars.includes(a.id)));
      grid.appendChild(card);
    }
    content.appendChild(grid);
  } else if (App.shopTab === 'frames') {
    for (const f of FRAMES) {
      const item = el('div', 'shop-item');
      const demo = el('div', 'avatar-bubble');
      demo.style.cssText = 'width:40px;height:40px;font-size:20px;background:linear-gradient(135deg,#dbeafe,#93c5fd);box-shadow:' + f.css + ';flex-shrink:0;';
      demo.textContent = '🌱';
      item.appendChild(demo);
      item.insertAdjacentHTML('beforeend', '<div class="info"><div class="nm">' + f.name[lang] + '</div></div>');
      item.appendChild(equipBtn('frame', f.id, f.price, App.player.owned.frames.includes(f.id)));
      content.appendChild(item);
    }
  } else if (App.shopTab === 'names') {
    for (const ns of NAME_STYLES) {
      const item = el('div', 'shop-item');
      const demo = el('div');
      demo.style.cssText = 'font-size:16px;width:110px;flex-shrink:0;' + ns.css;
      demo.textContent = App.player.name || 'Player';
      item.appendChild(demo);
      item.insertAdjacentHTML('beforeend', '<div class="info"><div class="nm">' + ns.name[lang] + '</div></div>');
      item.appendChild(equipBtn('nameStyle', ns.id, ns.price, App.player.owned.nameStyles.includes(ns.id)));
      content.appendChild(item);
    }
  } else {
    const groups = [
      { kind: 'tileEffect', title: t('shop.effectTile'), items: EFFECTS.filter((e) => e.kind === 'tile') },
      { kind: 'avatarEffect', title: t('shop.effectAvatar'), items: EFFECTS.filter((e) => e.kind === 'avatar') },
      { kind: 'nameEffect', title: t('shop.effectName'), items: EFFECTS.filter((e) => e.kind === 'name') },
    ];
    for (const g of groups) {
      const h = el('div');
      h.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:10px 0 6px;';
      h.textContent = g.title;
      content.appendChild(h);
      for (const e of g.items) {
        const item = el('div', 'shop-item');
        const visual = e.kind === 'tile' ? e.visual
          : e.kind === 'avatar' ? { glow: '✨', pulse: '💫', spin: '🌀', aurora: '🌈', flame: '🔥', galaxy: '🌌' }[e.visual]
          : { glow: '🌟', rainbow: '🏳️‍🌈', blink: '💡', wave: '〰️', fire: '🔥', starlight: '⭐' }[e.visual];
        item.innerHTML = '<span style="font-size:22px;width:30px;text-align:center">' + visual + '</span>' +
          '<div class="info"><div class="nm">' + e.name[lang] + '</div></div>' +
          '<span class="pr">🪙 ' + e.price + '</span>';
        item.appendChild(equipBtn(g.kind, e.id, e.price, App.player.owned.effects.includes(e.id)));
        content.appendChild(item);
      }
    }
  }

  wrap.appendChild(content);
  box.appendChild(wrap);
}

/* ============================================================
 * RANKS SCREEN
 * ============================================================ */
function renderRanks(box) {
  const wrap = el('div', 'panel-wrap');
  const t = (k, v) => store.t(k);

  wrap.innerHTML = '<h1 class="panel-title bm-text-outline">' + t('ranks.title') + '</h1>';

  const maxUnlocked = store.maxUnlocked();
  const cleared = Math.max(0, maxUnlocked - 1);
  const playerEntry = {
    id: 'player',
    name: App.player.name || 'Player',
    level: cleared,
    stars: store.totalStars(),
    avatarId: App.player.equipped.avatar,
    frameId: App.player.equipped.frame,
    nameStyleId: App.player.equipped.nameStyle,
    nameEffectId: App.player.equipped.nameEffect || null,
    isPlayer: true,
  };
  const all = [...App.bots, playerEntry].sort((x, y) =>
    y.level - x.level || y.stars - x.stars || (x.isPlayer ? -1 : 1));
  const pos = all.findIndex((e) => e.isPlayer) + 1;

  const info = el('div');
  info.style.cssText = 'font-size:13px;opacity:.85;';
  info.textContent = fmt(all.length) + ' ' + t('ranks.players') + ' · ' + t('ranks.youAre') + ' #' + pos;
  wrap.appendChild(info);

  const search = el('input', 'search-input');
  search.type = 'text';
  search.placeholder = t('ranks.search');
  search.value = App.ranksQuery;
  search.oninput = () => { App.ranksQuery = search.value; renderApp(); };
  wrap.appendChild(search);

  const q = App.ranksQuery.trim().toLowerCase();
  const filtered = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all;

  if (!q && filtered.length >= 3) {
    const podium = el('div', 'rank-podium');
    const medals = ['🥇', '🥈', '🥉'];
    const order = [1, 0, 2];
    for (const i of order) {
      const e = filtered[i];
      const pod = el('div', 'pod');
      pod.innerHTML = '<div class="em">' + medals[i] + '</div>' +
        '<div style="font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + e.name + '</div>' +
        '<div style="opacity:.75">' + t('ranks.level') + ' ' + fmt(e.level) + ' · ⭐ ' + fmt(e.stars) + '</div>';
      if (e.isPlayer) pod.style.boxShadow = '0 0 0 2px #fbbf24';
      podium.appendChild(pod);
    }
    wrap.appendChild(podium);
  }

  // list: top 30 + window around player
  const shown = [];
  const topN = q ? 60 : 30;
  const seen = new Set();
  filtered.slice(0, topN).forEach((e, i) => { shown.push({ e, p: i + 1 }); seen.add(e.id); });
  if (!q) {
    const around = 3;
    for (let i = Math.max(0, pos - around - 1); i <= Math.min(filtered.length - 1, pos + around - 1); i++) {
      if (!seen.has(filtered[i].id)) { shown.push({ e: filtered[i], p: i + 1 }); seen.add(filtered[i].id); }
    }
  }
  shown.sort((a, b) => a.p - b.p);
  let prevP = 0;
  for (const { e, p } of shown) {
    if (prevP && p - prevP > 1) {
      const dots = el('div');
      dots.style.cssText = 'text-align:center;opacity:.5;font-size:12px;margin:2px 0;';
      dots.textContent = '···';
      wrap.appendChild(dots);
    }
    prevP = p;
    const row = el('div', 'rank-row' + (e.isPlayer ? ' me' : ''));
    const av = AVATARS.find((a) => a.id === e.avatarId) || AVATARS[0];
    const fr = FRAMES.find((f) => f.id === e.frameId) || FRAMES[0];
    const ns = NAME_STYLES.find((s) => s.id === e.nameStyleId) || NAME_STYLES[0];
    const avBox = el('div', 'avatar-bubble');
    avBox.style.cssText = 'width:32px;height:32px;font-size:17px;background:' + av.bg + ';box-shadow:' + fr.css + ';flex-shrink:0;';
    avBox.textContent = av.emoji;
    row.appendChild(avBox);
    const nm = el('div', 'nm');
    nm.style.cssText += ns.css;
    if (e.isPlayer) nm.innerHTML = '<span>' + e.name + ' (' + t('ranks.you') + ')</span>';
    else nm.textContent = e.name;
    row.appendChild(nm);
    const lv = el('span');
    lv.style.cssText = 'font-weight:800;white-space:nowrap;';
    lv.textContent = t('ranks.level') + ' ' + fmt(e.level);
    row.appendChild(lv);
    const st = el('span');
    st.style.cssText = 'white-space:nowrap;';
    st.textContent = '⭐ ' + fmt(e.stars);
    row.appendChild(st);
    wrap.appendChild(row);
  }

  box.appendChild(wrap);
}

/* ============================================================
 * PROFILE SCREEN (+ settings)
 * ============================================================ */
function renderProfile(box) {
  const wrap = el('div', 'panel-wrap');
  const t = (k) => store.t(k);
  const lang = App.player.lang;

  const head = el('div', 'profile-head');
  const av = AVATARS.find((a) => a.id === App.player.equipped.avatar) || AVATARS[0];
  const fr = FRAMES.find((f) => f.id === App.player.equipped.frame) || FRAMES[0];
  const ns = NAME_STYLES.find((s) => s.id === App.player.equipped.nameStyle) || NAME_STYLES[0];
  const bubble = el('div', 'avatar-bubble');
  bubble.style.cssText = 'background:' + av.bg + ';box-shadow:' + fr.css + ';';
  bubble.textContent = av.emoji;
  head.appendChild(bubble);
  const nameBox = el('div');
  const nameTxt = el('div');
  nameTxt.style.cssText = 'font-size:20px;font-weight:900;' + ns.css;
  nameTxt.textContent = App.player.name || 'Player';
  nameBox.appendChild(nameTxt);
  const sub = el('div');
  sub.style.cssText = 'font-size:12px;opacity:.75;';
  sub.textContent = t('ranks.level') + ' ' + Math.max(0, store.maxUnlocked() - 1) + ' · ⭐ ' + store.totalStars();
  nameBox.appendChild(sub);
  head.appendChild(nameBox);
  wrap.appendChild(head);

  // name form
  const form = el('div', 'card');
  form.style.cssText = 'padding:12px;display:flex;gap:8px;align-items:center;';
  const input = el('input', 'name-input');
  input.type = 'text';
  input.maxLength = 16;
  input.placeholder = t('profile.namePlaceholder');
  input.value = App.player.name;
  const saveBtn = el('button', 'btn btn-primary');
  saveBtn.type = 'button';
  saveBtn.style.cssText = 'padding:9px 16px;white-space:nowrap;';
  saveBtn.textContent = t('profile.save');
  saveBtn.onclick = () => {
    sfx.click();
    store.setName(input.value);
    App.savedFlash = true;
    renderApp();
    setTimeout(() => { App.savedFlash = false; }, 1500);
  };
  form.appendChild(input);
  form.appendChild(saveBtn);
  if (App.savedFlash) {
    const ok = el('div');
    ok.style.cssText = 'font-size:12px;color:#6ee7b7;margin-top:6px;';
    ok.textContent = '✓ ' + t('profile.saved');
    wrap.appendChild(ok);
  }
  wrap.appendChild(form);

  // stats
  const statsTitle = el('div');
  statsTitle.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:14px 0 4px;';
  statsTitle.textContent = t('profile.stats');
  wrap.appendChild(statsTitle);
  const grid = el('div', 'stat-grid');
  const levelsCleared = Object.keys(App.player.stars).length;
  const statsData = [
    [String(App.player.stats.wins), t('profile.stat.wins')],
    [String(levelsCleared), t('profile.stat.levels')],
    [String(store.totalStars()), t('profile.stat.stars')],
    ['x' + Math.max(0, App.player.stats.bestCascade), t('profile.stat.bestCascade')],
    [fmt(App.player.stats.totalScore), t('profile.stat.totalScore')],
    [fmt(App.player.stats.movesMade), t('profile.stat.moves')],
  ];
  for (const [v, k] of statsData) {
    const card = el('div', 'stat-card');
    card.innerHTML = '<div class="v">' + v + '</div><div class="k">' + k + '</div>';
    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  // equipped
  const eqTitle = el('div');
  eqTitle.style.cssText = 'font-size:13px;font-weight:900;opacity:.85;margin:14px 0 0;';
  eqTitle.textContent = t('profile.equipped');
  wrap.appendChild(eqTitle);
  const eqList = el('div', 'eq-list');
  const eqData = [
    ['🎨', (GEM_SKINS.find((s) => s.id === App.player.equipped.skin) || GEM_SKINS[0]).name[lang]],
    [av.emoji, t('shop.tab.avatars')],
    ['🖼️', (FRAMES.find((f) => f.id === App.player.equipped.frame) || FRAMES[0]).name[lang]],
    ['✍️', ns.name[lang]],
  ];
  for (const [icon, label] of eqData) {
    const chip = el('span', 'chip');
    chip.textContent = icon + ' ' + label;
    eqList.appendChild(chip);
  }
  wrap.appendChild(eqList);

  // settings
  const settings = el('div', 'settings-block');
  settings.innerHTML = '<div style="font-size:14px;font-weight:900;margin-bottom:6px;">⚙️ ' + t('settings.title') + '</div>';
  const rowLang = el('div', 'settings-row');
  rowLang.innerHTML = '<span>' + t('settings.language') + '</span>';
  const segLang = el('div', 'seg');
  for (const l of ['ru', 'en']) {
    const b = el('button', App.player.lang === l ? 'on' : '', l.toUpperCase());
    b.type = 'button';
    b.onclick = () => { sfx.click(); store.setLang(l); renderApp(); };
    segLang.appendChild(b);
  }
  rowLang.appendChild(segLang);
  settings.appendChild(rowLang);

  const rowSound = el('div', 'settings-row');
  rowSound.innerHTML = '<span>' + t('settings.sound') + '</span>';
  const segSound = el('div', 'seg');
  for (const v of [true, false]) {
    const b = el('button', App.player.sound === v ? 'on' : '', v ? t('settings.on') : t('settings.off'));
    b.type = 'button';
    b.onclick = () => { store.setSound(v); sfx.click(); renderApp(); };
    segSound.appendChild(b);
  }
  rowSound.appendChild(segSound);
  settings.appendChild(rowSound);

  const resetBtn = el('button', 'btn');
  resetBtn.type = 'button';
  resetBtn.style.cssText = 'background:rgba(244,63,94,.85);color:#fff;width:100%;margin-top:8px;';
  resetBtn.textContent = '🗑️ ' + t('settings.reset');
  resetBtn.onclick = () => { renderResetConfirm(); };
  settings.appendChild(resetBtn);
  wrap.appendChild(settings);

  box.appendChild(wrap);

  function renderResetConfirm() {
    const over = el('div', 'modal-overlay');
    over.style.zIndex = '90';
    const modal = el('div', 'modal light');
    modal.innerHTML = '<h2>' + t('settings.reset') + '</h2><div class="sub">' + t('settings.resetConfirm') + '</div>';
    const col = el('div', 'col');
    const yes = el('button', 'btn');
    yes.type = 'button';
    yes.style.cssText = 'background:#e11d48;color:#fff;';
    yes.textContent = t('settings.resetYes');
    yes.onclick = () => { store.resetAll(); over.remove(); showToast(t('settings.resetDone')); renderApp(); };
    col.appendChild(yes);
    const no = el('button', 'btn');
    no.type = 'button';
    no.style.cssText = 'background:#e2e8f0;color:#334155;';
    no.textContent = t('settings.resetNo');
    no.onclick = () => over.remove();
    col.appendChild(no);
    modal.appendChild(col);
    over.appendChild(modal);
    document.body.appendChild(over);
  }
}

/* ---------------- boot ---------------- */
App.player = loadState();
setSoundEnabled(App.player.sound);
App.bots = generateBots();
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
if (document.readyState !== 'loading') renderApp();
