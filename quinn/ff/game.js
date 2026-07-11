(() => {
  const WORLD_W = 10;
  const WORLD_H = 3;
  const START_TILE = { x: 7, y: 2 };
  const FAIRY_SPEED = 0.45; // tile fractions per second

  // Fruits grow on the three orchard tiles around the spawn tile:
  // strawberries above, apples to the right, bananas below.
  const FRUIT_TYPES = ['s', 'a', 'b']; // strawberry, apple, banana
  const ORCHARD_TILES = {
    s: { x: START_TILE.x, y: START_TILE.y + 1 },
    a: { x: START_TILE.x + 1, y: START_TILE.y },
    b: { x: START_TILE.x, y: START_TILE.y - 1 },
  };
  const FRUIT_TARGET = 15;          // the world aims to hold 15 of each type
  const FRUIT_SPAWN_MS = 30 * 1000; // but at most one new fruit per 30 seconds
  const FRUIT_CHECK_MS = 5 * 1000;  // how often to consider spawning
  const DOUBLE_TAP_MS = 300;        // window for double-tapping a carried fruit

  const initialScreen = document.getElementById('initial-screen');
  const welcomeScreen = document.getElementById('welcome-screen');
  const connectingScreen = document.getElementById('connecting-screen');
  const chooserScreen = document.getElementById('chooser-screen');
  const worldScreen = document.getElementById('world-screen');
  const startBtn = document.getElementById('start-btn');
  const nextBtn = document.getElementById('next-btn');
  const connectingSpinner = document.getElementById('connecting-spinner');
  const connectingMessage = document.getElementById('connecting-message');
  const connectingRetryBtn = document.getElementById('connecting-retry-btn');
  const connectingNextBtn = document.getElementById('connecting-next-btn');
  const fairyGrid = document.getElementById('fairy-grid');
  const chooserNextBtn = document.getElementById('chooser-next-btn');
  const tileImg = document.getElementById('tile-img');
  const fairy = document.getElementById('fairy');
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const bgm = document.getElementById('bgm');

  const state = {
    tile: { ...START_TILE },
    pos: { x: 0.5, y: 0.5 }, // normalized within tile, (0,0) bottom-left, (1,1) top-right
    tileSet: 'world',         // 'world' (fancy) or 'qworld' (Quinn's sketches)
    fairy: { g: 'f', t: 0 },  // appearance: gender n/f/m, skin tone 0-5 (set by the chooser)
    keys: { up: false, down: false, left: false, right: false },
    joy: { active: false, dx: 0, dy: 0 },
    lastT: 0,
  };

  // True once the player has left the chooser and entered the world.
  // Until then we connect to multiplayer to listen, but do not announce
  // ourselves (the player has no fairy yet).
  let inWorld = false;

  // ---------- Fairy appearance ----------
  // The fairy is a fairy emoji: a gender presentation (neutral / female
  // / male) and one of six skin tones. The player picks theirs on the
  // fairy chooser screen.
  const FAIRY_BASE = '\u{1F9DA}';   // fairy
  const ZWJ = '‍';             // zero-width joiner
  const VS16 = '️';            // emoji presentation selector
  const GENDER_SIGN = {
    f: '♀' + VS16,             // female sign
    m: '♂' + VS16,             // male sign
  };
  const TONE_CHARS = [
    '',            // 0: default (yellow)
    '\u{1F3FB}',   // 1: light
    '\u{1F3FC}',   // 2: medium-light
    '\u{1F3FD}',   // 3: medium
    '\u{1F3FE}',   // 4: medium-dark
    '\u{1F3FF}',   // 5: dark
  ];

  function fairyEmoji(f) {
    if (!f) return FAIRY_BASE;
    const tone = TONE_CHARS[f.t] || '';
    if (f.g === 'n') return FAIRY_BASE + tone;
    return FAIRY_BASE + tone + ZWJ + (GENDER_SIGN[f.g] || GENDER_SIGN.f);
  }

  function fairyCode(f) {
    f = f || state.fairy;
    return `${f.g}${f.t}`;
  }

  function parseFairyCode(s) {
    if (!s || typeof s !== 'string') return null;
    const m = /^([nfm])([0-5])$/.exec(s.trim());
    return m ? { g: m[1], t: Number(m[2]) } : null;
  }

  function applyFairyAppearance() {
    fairy.textContent = fairyEmoji(state.fairy);
  }

  // ---------- Screen flow ----------
  function show(screen) {
    [initialScreen, welcomeScreen, connectingScreen, chooserScreen, worldScreen]
      .forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
  }

  function startMusic() {
    bgm.volume = 0.7;
    const p = bgm.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* ignore */ });
  }

  // The game flows forward through five screens: initial -> welcome ->
  // entering the fairy world -> fairy chooser -> fairy world. The player
  // enters by clicking through; there is no URL routing.
  startBtn.addEventListener('click', () => {
    startMusic();
    show(welcomeScreen);
  });

  nextBtn.addEventListener('click', () => {
    enterConnectingScreen();
  });

  // ---------- Entering the fairy world ----------
  // Before the fairy chooser, this screen reaches out to the shared
  // multiplayer world and shows the player how the connection is
  // going: 'idle' before the first attempt, then 'connecting' and
  // finally 'connected' or 'failed'.
  let connectionState = 'idle';

  function setConnectionState(s) {
    connectionState = s;
    renderConnectionStatus();
  }

  function renderConnectionStatus() {
    if (connectionState === 'connected') {
      connectingMessage.textContent = 'We have entered the shared fairy world';
    } else if (connectionState === 'failed') {
      connectingMessage.textContent =
        'Unable to reach shared fairy world. You can still fly solo.';
    } else {
      connectingMessage.textContent = 'Communicating with shared fairy world...';
    }
    const connecting = connectionState === 'connecting';
    connectingSpinner.classList.toggle('hidden', !connecting);
    connectingRetryBtn.classList.toggle('hidden', connectionState !== 'failed');
    // The "next" button waits for the outcome, then lets the player
    // continue whether or not the shared world was reached.
    connectingNextBtn.disabled = connecting;
  }

  function enterConnectingScreen() {
    show(connectingScreen);
    initMultiplayer();
  }

  connectingRetryBtn.addEventListener('click', () => {
    initMultiplayer();
  });

  connectingNextBtn.addEventListener('click', () => {
    show(chooserScreen);
    openChooser();
  });

  // ---------- Fairy chooser ----------
  // A grid of every fairy emoji: rows top-to-bottom are female,
  // neutral, male; columns left-to-right are skin tone 0 (yellow)
  // through 5 (dark). Fairies already in use by players in the world
  // are shown as blank, unpickable cells.
  const CHOOSER_ROWS = ['f', 'n', 'm'];
  let chooserSelection = null; // { g, t } once the player has picked

  function openChooser() {
    chooserSelection = null;
    chooserNextBtn.disabled = true;
    // Multiplayer was already contacted on the "Entering the fairy
    // world" screen, so the grid can hide fairies already in use.
    renderFairyGrid();
  }

  // Fairy codes currently in use by other players in the world.
  function takenFairyCodes() {
    const taken = new Set();
    if (mp) {
      for (const peer of mp.peers.values()) {
        if (peer.fairy) taken.add(peer.fairy);
      }
    }
    return taken;
  }

  function renderFairyGrid() {
    const taken = takenFairyCodes();
    fairyGrid.textContent = '';
    for (const g of CHOOSER_ROWS) {
      for (let t = 0; t <= 5; t++) {
        const cell = document.createElement('button');
        cell.className = 'fairy-cell';
        if (taken.has(`${g}${t}`)) {
          // Already in use — a blank cell that cannot be picked.
          cell.classList.add('taken');
          cell.disabled = true;
        } else {
          cell.textContent = fairyEmoji({ g, t });
          cell.addEventListener('click', () => selectFairy(g, t, cell));
        }
        fairyGrid.appendChild(cell);
      }
    }
  }

  function selectFairy(g, t, cell) {
    chooserSelection = { g, t };
    for (const c of fairyGrid.children) c.classList.remove('selected');
    cell.classList.add('selected');
    chooserNextBtn.disabled = false;
  }

  // While the player is still deciding, keep the grid in sync as other
  // players come and go. Once a fairy is picked we leave the grid
  // alone — we deliberately do not re-check for clashes after that.
  function refreshChooserIfOpen() {
    if (!chooserScreen.classList.contains('hidden') && !chooserSelection) {
      renderFairyGrid();
    }
  }

  chooserNextBtn.addEventListener('click', () => {
    if (!chooserSelection) return;
    state.fairy = chooserSelection;
    applyFairyAppearance();
    state.tile = { ...START_TILE };
    state.pos = { x: 0.5, y: 0.5 };
    inWorld = true;
    show(worldScreen);
    enterWorld();
    broadcastState(); // announce ourselves to players already in the world
  });

  // ---------- World ----------
  function tileSrc(x, y) {
    // The fancy "world" tiles are served from world_reencoded: optimized
    // JPEGs (~7x smaller than the original PNGs in images/world, which we
    // keep as the masters). Quinn's "qworld" sketches are already JPEGs.
    return state.tileSet === 'qworld'
      ? `images/qworld/${x}_${y}.jpeg`
      : `images/world_reencoded/${x}_${y}.jpeg`;
  }

  function toggleTileSet() {
    state.tileSet = state.tileSet === 'qworld' ? 'world' : 'qworld';
    loadTile();
  }

  // Triple-tap/click the fairy to toggle the tile set.
  let fairyTaps = [];
  fairy.addEventListener('pointerdown', (e) => {
    const now = performance.now();
    fairyTaps = fairyTaps.filter(t => now - t < 800);
    fairyTaps.push(now);
    if (fairyTaps.length >= 3) {
      fairyTaps = [];
      toggleTileSet();
    }
    e.stopPropagation();
  });

  // Neighbor prefetch keeps the up-to-four adjacent tiles warm in the
  // browser cache, so flying across an edge usually swaps in instantly
  // instead of leaving the previous tile on screen while the next one
  // downloads. We hold a reference to each Image so the cache entry is
  // not collected before the player reaches it.
  const prefetched = new Map(); // src -> Image

  function prefetchNeighbors() {
    const { x, y } = state.tile;
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 1 || nx > WORLD_W || ny < 1 || ny > WORLD_H) continue;
      const src = tileSrc(nx, ny);
      if (prefetched.has(src)) continue;
      const img = new Image();
      img.src = src;
      prefetched.set(src, img);
    }
  }

  function loadTile() {
    tileImg.src = tileSrc(state.tile.x, state.tile.y);
    // Dim the old tile while the new one loads, as a quiet "waiting"
    // hint. If the tile came straight from cache (the common case once
    // neighbor prefetch has run) it is already complete, so skip the
    // dim to avoid a needless flash.
    if (tileImg.complete && tileImg.naturalWidth > 0) {
      tileImg.classList.remove('loading');
    } else {
      tileImg.classList.add('loading');
    }
    prefetchNeighbors();
  }

  function enterWorld() {
    invalidateTileRect(); // the world screen has just become visible
    loadTile();
    updateFairyPosition();
    showJoystickIfTouch();
    startIdleWatch();
    startFruitSpawner();
    if (!rafRunning) {
      rafRunning = true;
      state.lastT = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function showJoystickIfTouch() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) joystick.classList.add('visible');
  }

  // Compute the rendered tile rectangle (image is object-fit: contain
  // inside #tile-frame). Reading layout is comparatively expensive and
  // fairies and fruits ask for this rectangle many times per frame, so
  // the result is cached; the cache is dropped whenever the rectangle
  // could actually change (resize, tile image load, entering the world).
  let tileRectCache = null;

  function invalidateTileRect() {
    tileRectCache = null;
  }

  function getTileRect() {
    if (!tileRectCache) tileRectCache = computeTileRect();
    return tileRectCache;
  }

  function computeTileRect() {
    const frame = tileImg.parentElement.getBoundingClientRect();
    const natW = tileImg.naturalWidth || 16;
    const natH = tileImg.naturalHeight || 9;
    const frameRatio = frame.width / frame.height;
    const imgRatio = natW / natH;
    let w, h;
    if (frameRatio > imgRatio) {
      h = frame.height;
      w = h * imgRatio;
    } else {
      w = frame.width;
      h = w / imgRatio;
    }
    const left = (frame.width - w) / 2;
    const top = (frame.height - h) / 2;
    return { left, top, width: w, height: h };
  }

  // The fairy emoji's rendered size in px. Treating the glyph as a
  // circle, this is its diameter (2r) — the fruit-touching threshold.
  function fairyFontPx(rect) {
    return Math.max(28, Math.round(rect.height * 0.08));
  }

  // Place a fairy-like element at a normalized position within the
  // tile. Fruits use scale 0.5: a fruit is a circle of radius r/2 to
  // the fairy's r.
  function placeFairyEl(el, pos, scale = 1) {
    const r = getTileRect();
    el.style.fontSize = Math.round(fairyFontPx(r) * scale) + 'px';
    el.style.left = (r.left + pos.x * r.width) + 'px';
    el.style.top  = (r.top  + (1 - pos.y) * r.height) + 'px';
  }

  function updateFairyPosition() {
    placeFairyEl(fairy, state.pos);
    renderAllPeers();
    renderAllFruits();
    updateFruitGlow();
  }

  // ---------- Input ----------
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right',
    W: 'up', A: 'left', S: 'down', D: 'right',
  };

  window.addEventListener('keydown', (e) => {
    const k = keyMap[e.key];
    if (!k) return;
    state.keys[k] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = keyMap[e.key];
    if (!k) return;
    state.keys[k] = false;
    e.preventDefault();
  });

  // Joystick (pointer events handle both touch and mouse)
  let joyPointerId = null;
  function joyCenter() {
    const r = joystick.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: r.width / 2 };
  }
  function setJoy(clientX, clientY) {
    const { cx, cy, radius } = joyCenter();
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxDist = radius * 0.55;
    if (dist > maxDist) {
      dx = dx * maxDist / dist;
      dy = dy * maxDist / dist;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const usable = maxDist || 1;
    state.joy.dx = dx / usable;            // -1..1 right
    state.joy.dy = -dy / usable;           // -1..1 up (screen y is inverted)
    state.joy.active = true;
  }
  function resetJoy() {
    state.joy.active = false;
    state.joy.dx = 0;
    state.joy.dy = 0;
    knob.style.transform = 'translate(-50%, -50%)';
  }
  joystick.addEventListener('pointerdown', (e) => {
    if (joyPointerId !== null) return; // already tracking a finger
    joyPointerId = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    setJoy(e.clientX, e.clientY);
    e.preventDefault();
  });
  joystick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointerId) return;
    setJoy(e.clientX, e.clientY);
  });
  function endJoy(e) {
    if (e.pointerId !== joyPointerId) return;
    joyPointerId = null;
    resetJoy();
  }
  joystick.addEventListener('pointerup', endJoy);
  joystick.addEventListener('pointercancel', endJoy);
  joystick.addEventListener('pointerleave', endJoy);

  // If the window loses focus mid-move (the player alt-tabs or switches
  // apps), the matching keyup / pointerup may never arrive. Clear all
  // input so the fairy does not drift on its own when focus returns.
  window.addEventListener('blur', () => {
    state.keys.up = state.keys.down = state.keys.left = state.keys.right = false;
    joyPointerId = null;
    resetJoy();
  });

  // ---------- Multiplayer (Firebase Realtime Database) ----------
  // No game server: every player publishes their presence (fairy, tile,
  // position) to a single shared path in a hosted Firebase Realtime
  // Database, and listens to that path for everyone else. The game
  // itself remains a set of static files — Firebase is a hosted
  // service, not a server we run.
  //
  // Players in the same room see each other's fairies; you only see
  // another fairy when you're both standing on the same tile.
  // Firebase's own modular CDN builds. These are the supported way to
  // load Firebase without a bundler: each module shares the one
  // @firebase/app instance, so getDatabase() can find the database
  // service that firebase-database.js registers. (Loading the same
  // modules as two independent esm.sh bundles gives each its own copy
  // of that registry, and getDatabase() then throws "Service database
  // is not available".)
  const FIREBASE_APP_MOD = 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
  const FIREBASE_DB_MOD  = 'https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js';
  // The Firebase Realtime Database URL is not a secret — database rules
  // limit writes to the players path.
  const FIREBASE_DB_URL = 'https://fairy-fun-182dc-default-rtdb.firebaseio.com';
  // Everyone playing Fairy Fun shares one world room.
  const FIXED_ROOM = 'meadow-2';
  // How long to wait for the database library to load and the handshake
  // to succeed before giving up and offering single player.
  const CONNECT_TIMEOUT_MS = 8000;
  // How long a player can stand still in the world before we assume the
  // tab was left open and abandoned. At that point we remove their fairy
  // from the shared world, leave the connection, and bounce back to the
  // welcome screen. This keeps idle tabs from littering the world with
  // stale fairies that never move and never disconnect.
  const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // one hour

  // Module-level caches so that retrying after a failure does not
  // re-import or re-initialize when the previous attempt got partway.
  let fb = null;       // { app: appMod, db: dbMod } once imported
  let fbApp = null;    // initialized Firebase app
  let mp = null;       // { db, playersRef, selfRef, selfId, peers } once joined
  let mpConnecting = false;

  function renderAllPeers() {
    if (!mp) return;
    for (const [id, peer] of mp.peers) renderPeer(id, peer);
  }

  function renderPeer(id, peer) {
    if (!peer.el) {
      peer.el = document.createElement('div');
      peer.el.className = 'remote-fairy';
      tileImg.parentElement.appendChild(peer.el);
    }
    const sameTile = peer.tile
      && peer.tile.x === state.tile.x && peer.tile.y === state.tile.y;
    peer.el.textContent = fairyEmoji(parseFairyCode(peer.fairy));
    peer.el.style.display = sameTile ? '' : 'none';
    if (sameTile && peer.pos) {
      if (!peer.placed) {
        // First placement: snap into position rather than sliding in
        // from the corner (the CSS transition would otherwise animate
        // from the element's default 0,0).
        peer.el.style.transition = 'none';
        placeFairyEl(peer.el, peer.pos);
        peer.el.getBoundingClientRect(); // flush layout before re-enabling
        peer.el.style.transition = '';
        peer.placed = true;
      } else {
        placeFairyEl(peer.el, peer.pos);
      }
    }
  }

  function myStatePayload() {
    return {
      tile: { x: state.tile.x, y: state.tile.y },
      pos: { x: +state.pos.x.toFixed(3), y: +state.pos.y.toFixed(3) },
      fairy: fairyCode(),
    };
  }

  function broadcastState() {
    // Only announce ourselves once we are actually in the world. On the
    // chooser screen we are connected (to see who is around) but have
    // no fairy yet, so other players should not see us.
    if (inWorld && mp) {
      try { fb.db.set(mp.selfRef, myStatePayload()); } catch (e) { /* ignore */ }
    }
    // A carried fruit travels with us, so share its position on the
    // same cadence as our own.
    if (carrying) syncCarriedFruit();
    lastNetSync = performance.now();
  }

  // Dynamic import with a timeout, so a hung CDN request cannot leave
  // the player staring at the spinner forever.
  function importWithTimeout(url, ms) {
    return Promise.race([
      import(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('import timed out')), ms)),
    ]);
  }

  async function initMultiplayer() {
    if (mp) { setConnectionState('connected'); return; }
    if (mpConnecting) return; // an attempt is already in flight
    mpConnecting = true;
    setConnectionState('connecting');

    // Load the Firebase modules (cached across retries).
    if (!fb) {
      try {
        const [app, db] = await Promise.all([
          importWithTimeout(FIREBASE_APP_MOD, CONNECT_TIMEOUT_MS),
          importWithTimeout(FIREBASE_DB_MOD,  CONNECT_TIMEOUT_MS),
        ]);
        fb = { app, db };
      } catch (e) {
        console.warn('Fairy Fun: multiplayer library unavailable, playing solo.', e);
        mpConnecting = false;
        setConnectionState('failed');
        return;
      }
    }

    // Initialize the app once (initializeApp throws if called twice).
    if (!fbApp) {
      try {
        fbApp = fb.app.initializeApp({ databaseURL: FIREBASE_DB_URL });
      } catch (e) {
        console.warn('Fairy Fun: could not initialize Firebase, playing solo.', e);
        mpConnecting = false;
        setConnectionState('failed');
        return;
      }
    }

    // Set up the database handles. These calls are synchronous, but
    // getDatabase() can still throw (e.g. the database service failed to
    // register). Guard them too, or such a throw would escape before the
    // handshake timeout below is armed and leave the spinner running
    // forever instead of falling back to solo play.
    let db, playersRef, selfRef, selfId, connectedRef, fruitsRef, fruitSpawnRef;
    try {
      db = fb.db.getDatabase(fbApp);
      playersRef = fb.db.ref(db, `fairyfun/rooms/${FIXED_ROOM}/players`);
      // push() generates a server-friendly unique key for this player.
      selfRef = fb.db.push(playersRef);
      selfId = selfRef.key;
      fruitsRef = fb.db.ref(db, `fairyfun/rooms/${FIXED_ROOM}/fruits`);
      fruitSpawnRef = fb.db.ref(db, `fairyfun/rooms/${FIXED_ROOM}/fruitLastSpawnAt`);
      connectedRef = fb.db.ref(db, '.info/connected');
    } catch (e) {
      console.warn('Fairy Fun: database service unavailable, playing solo.', e);
      mpConnecting = false;
      setConnectionState('failed');
      return;
    }

    // Wait for the database to actually report itself connected. This
    // is the real "are we in the shared world?" signal — it goes true
    // only after the websocket has authenticated against the database,
    // and it goes back to false on a network drop.
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('handshake timed out')), CONNECT_TIMEOUT_MS);
        const unsub = fb.db.onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            clearTimeout(timer);
            unsub();
            resolve();
          }
        }, (err) => {
          clearTimeout(timer);
          unsub();
          reject(err);
        });
      });
    } catch (e) {
      console.warn('Fairy Fun: handshake server unreachable, playing solo.', e);
      mpConnecting = false;
      setConnectionState('failed');
      return;
    }

    const peers = new Map();
    mp = { db, playersRef, selfRef, selfId, peers, fruitsRef, fruitSpawnRef };

    // Ask the server to delete our presence node the moment it notices
    // we have gone — no more ghost fairies, no heartbeat needed.
    fb.db.onDisconnect(selfRef).remove();

    // Watch the players list. The snapshot is the source of truth, so
    // we add / update / remove peers to match. Keep the unsubscribe so
    // we can stop listening when we leave the world.
    mp.unsubPlayers = fb.db.onValue(playersRef, (snap) => {
      const data = snap.val() || {};
      // Drop peers that are no longer in the snapshot.
      for (const [id, peer] of peers) {
        if (!(id in data)) {
          if (peer.el) peer.el.remove();
          peers.delete(id);
        }
      }
      // Add or update peers from the snapshot (skip ourselves).
      for (const [id, value] of Object.entries(data)) {
        if (id === selfId) continue;
        if (!value || typeof value !== 'object') continue;
        let peer = peers.get(id);
        if (!peer) { peer = {}; peers.set(id, peer); }
        peer.tile = value.tile;
        peer.pos = value.pos;
        peer.fairy = value.fairy;
        renderPeer(id, peer);
      }
      refreshChooserIfOpen();
    });

    // Watch the shared fruits. As with players, the snapshot is the
    // source of truth — except for a fruit we are carrying, which we
    // drive locally and only echo back to the database.
    mp.unsubFruits = fb.db.onValue(fruitsRef, (snap) => {
      const data = snap.val() || {};
      for (const [id, f] of fruits) {
        if (!(id in data)) {
          if (carrying && carrying.id === id) carrying = null;
          if (f.el) f.el.remove();
          fruits.delete(id);
        }
      }
      for (const [id, value] of Object.entries(data)) {
        if (!value || typeof value !== 'object') continue;
        let f = fruits.get(id);
        if (!f) { f = {}; fruits.set(id, f); }
        if (carrying && carrying.id === id) {
          if (value.carriedBy && value.carriedBy !== mp.selfId) {
            // Another player claimed this fruit in a pickup race; the
            // last write wins, so let go of it.
            carrying = null;
            cancelCarryCleanup(id);
          } else {
            continue; // our own echo — we drive this fruit while carrying
          }
        }
        f.t = value.t;
        f.v = value.v || 0;
        f.tile = value.tile;
        f.pos = value.pos;
        f.carriedBy = value.carriedBy || null;
        renderFruit(id, f);
      }
      updateFruitGlow();
    });

    mpConnecting = false;
    setConnectionState('connected');
    // If we are already in the world (e.g., reconnect after a drop),
    // republish ourselves so other players see us again.
    broadcastState();
  }

  // Leave the shared world: stop listening, cancel the queued
  // disconnect-cleanup and remove our presence node now, and clear away
  // any peer fairies. We deliberately leave the Firebase app and modules
  // cached so a later re-entry can reconnect without re-importing.
  function leaveMultiplayer() {
    if (!mp) return;
    try { if (mp.unsubPlayers) mp.unsubPlayers(); } catch (e) { /* ignore */ }
    try { if (mp.unsubFruits) mp.unsubFruits(); } catch (e) { /* ignore */ }
    try { fb.db.onDisconnect(mp.selfRef).cancel(); } catch (e) { /* ignore */ }
    try { fb.db.remove(mp.selfRef); } catch (e) { /* ignore */ }
    for (const [, peer] of mp.peers) {
      if (peer.el) peer.el.remove();
    }
    // The shared fruits stay in the database for everyone else; we just
    // stop showing them.
    for (const [, f] of fruits) {
      if (f.el) f.el.remove();
    }
    fruits.clear();
    carrying = null;
    mp = null;
  }

  // ---------- Fruits ----------
  // Strawberries, apples, and bananas grow on the orchard tiles and are
  // shared state: they live in the database alongside the players, so
  // they persist as players come and go. When the shared world cannot
  // be reached, fruits are kept locally instead so solo play still has
  // them (they just do not survive a page reload).
  //
  // A fairy close enough to a fruit (fruit center within 2r of the
  // fairy center, where r is the fairy's radius) sees it glow. Tap a
  // glowing fruit to pick it up; the fruit rides along at the offset it
  // was picked up at. Tap a carried fruit to put it down, or double-tap
  // it to eat it.
  const fruits = new Map(); // id -> { t, v, tile, pos, carriedBy, el, placed }
  let carrying = null;      // { id, rel: {x, y} } while we carry a fruit
  let fruitTapTimer = null; // pending single-tap (put down) on the carried fruit

  const FRUIT_GLYPHS = { s: '\u{1F353}', b: '\u{1F34C}' };
  const APPLE_GLYPHS = ['\u{1F34E}', '\u{1F34F}']; // red and green apples

  function fruitEmoji(f) {
    if (f.t === 'a') return APPLE_GLYPHS[f.v ? 1 : 0];
    return FRUIT_GLYPHS[f.t] || FRUIT_GLYPHS.s;
  }

  function fruitsAreShared() {
    return !!(mp && mp.fruitsRef);
  }

  function fruitRefFor(id) {
    return fb.db.child(mp.fruitsRef, id);
  }

  // What the database stores for a fruit (everything but our local
  // bookkeeping like the DOM element).
  function fruitPayload(f) {
    const p = { t: f.t, v: f.v || 0, tile: f.tile, pos: f.pos };
    if (f.carriedBy) p.carriedBy = f.carriedBy;
    return p;
  }

  function fruitOnMyTile(f) {
    return !!(f.tile && f.tile.x === state.tile.x && f.tile.y === state.tile.y);
  }

  // Is another player (who is actually still here) holding this fruit?
  // If the carrier has vanished without cleanup, the fruit counts as
  // free again wherever it was last seen.
  function fruitHeldByOther(id, f) {
    if (!f.carriedBy) return false;
    if (carrying && carrying.id === id) return false;
    return !!(mp && f.carriedBy !== mp.selfId && mp.peers.has(f.carriedBy));
  }

  // "Touching": the fruit's center is within 2r of the fairy's center,
  // where the fairy emoji is a circle of radius r (and the fruit r/2).
  function fruitIsClose(f) {
    if (!fruitOnMyTile(f) || !f.pos) return false;
    const r = getTileRect();
    const dx = (f.pos.x - state.pos.x) * r.width;
    const dy = (f.pos.y - state.pos.y) * r.height;
    return Math.hypot(dx, dy) <= fairyFontPx(r); // font size = 2r
  }

  function updateFruitGlow() {
    for (const [id, f] of fruits) {
      if (!f.el) continue;
      const free = !(carrying && carrying.id === id) && !fruitHeldByOther(id, f);
      f.el.classList.toggle('close', free && fruitIsClose(f));
    }
  }

  function renderFruit(id, f) {
    if (!f.el) {
      f.el = document.createElement('div');
      f.el.className = 'fruit';
      f.el.addEventListener('pointerdown', (e) => {
        tapFruit(id);
        e.stopPropagation();
      });
      tileImg.parentElement.appendChild(f.el);
    }
    const glyph = fruitEmoji(f);
    if (f.el.textContent !== glyph) f.el.textContent = glyph;
    const carriedByMe = !!(carrying && carrying.id === id);
    f.el.classList.toggle('carried', carriedByMe);
    if (carriedByMe) {
      // Our carried fruit follows the fairy directly, every frame.
      f.el.style.display = '';
      placeFairyEl(f.el, {
        x: state.pos.x + carrying.rel.x,
        y: state.pos.y + carrying.rel.y,
      }, 0.5);
      return;
    }
    const visible = fruitOnMyTile(f);
    f.el.style.display = visible ? '' : 'none';
    if (visible && f.pos) {
      if (!f.placed) {
        // First placement: snap rather than sliding in (same trick as
        // remote fairies).
        f.el.style.transition = 'none';
        placeFairyEl(f.el, f.pos, 0.5);
        f.el.getBoundingClientRect();
        f.el.style.transition = '';
        f.placed = true;
      } else {
        placeFairyEl(f.el, f.pos, 0.5);
      }
    }
  }

  function renderAllFruits() {
    for (const [id, f] of fruits) renderFruit(id, f);
  }

  // Where the carried fruit sits in world terms: our tile and position
  // plus the pickup offset, carried over into the neighboring tile if
  // the offset pushes it past an edge.
  function carriedWorldPos() {
    let tx = state.tile.x, ty = state.tile.y;
    let px = state.pos.x + carrying.rel.x;
    let py = state.pos.y + carrying.rel.y;
    if (px > 1) { if (tx < WORLD_W) { tx += 1; px -= 1; } else px = 1; }
    if (px < 0) { if (tx > 1)       { tx -= 1; px += 1; } else px = 0; }
    if (py > 1) { if (ty < WORLD_H) { ty += 1; py -= 1; } else py = 1; }
    if (py < 0) { if (ty > 1)       { ty -= 1; py += 1; } else py = 0; }
    return {
      tile: { x: tx, y: ty },
      pos: { x: +px.toFixed(3), y: +py.toFixed(3) },
    };
  }

  function syncCarriedFruit() {
    const f = fruits.get(carrying.id);
    if (!f) { carrying = null; return; }
    const w = carriedWorldPos();
    f.tile = w.tile;
    f.pos = w.pos;
    if (fruitsAreShared()) {
      try { fb.db.set(fruitRefFor(carrying.id), fruitPayload(f)); } catch (e) { /* ignore */ }
    }
  }

  // If we vanish mid-carry (tab closed, network lost), the server frees
  // the fruit wherever we last carried it.
  function armCarryCleanup(id) {
    if (!fruitsAreShared()) return;
    try {
      fb.db.onDisconnect(fb.db.child(mp.fruitsRef, `${id}/carriedBy`)).remove();
    } catch (e) { /* ignore */ }
  }

  function cancelCarryCleanup(id) {
    if (!fruitsAreShared()) return;
    try {
      fb.db.onDisconnect(fb.db.child(mp.fruitsRef, `${id}/carriedBy`)).cancel();
    } catch (e) { /* ignore */ }
  }

  function tapFruit(id) {
    const f = fruits.get(id);
    if (!f) return;
    markActivity();
    if (carrying && carrying.id === id) {
      // Single tap puts the fruit down; a quick second tap eats it. The
      // put-down waits out the double-tap window so that eating does
      // not first drop the fruit.
      if (fruitTapTimer) {
        clearTimeout(fruitTapTimer);
        fruitTapTimer = null;
        eatFruit(id);
      } else {
        fruitTapTimer = setTimeout(() => {
          fruitTapTimer = null;
          putDownFruit(id);
        }, DOUBLE_TAP_MS);
      }
      return;
    }
    if (carrying) return;              // already carrying — one fruit at a time
    if (fruitHeldByOther(id, f)) return;
    if (!fruitIsClose(f)) return;
    pickUpFruit(id);
  }

  function pickUpFruit(id) {
    const f = fruits.get(id);
    carrying = {
      id,
      rel: { x: f.pos.x - state.pos.x, y: f.pos.y - state.pos.y },
    };
    f.carriedBy = fruitsAreShared() ? mp.selfId : 'self';
    if (fruitsAreShared()) {
      try { fb.db.set(fruitRefFor(id), fruitPayload(f)); } catch (e) { /* ignore */ }
      armCarryCleanup(id);
    }
    renderFruit(id, f);
    updateFruitGlow();
  }

  function putDownFruit(id) {
    if (!carrying || carrying.id !== id) return;
    const f = fruits.get(id);
    if (!f) { carrying = null; return; }
    const w = carriedWorldPos();
    f.tile = w.tile;
    f.pos = w.pos;
    f.carriedBy = null;
    carrying = null;
    cancelCarryCleanup(id);
    if (fruitsAreShared()) {
      try { fb.db.set(fruitRefFor(id), fruitPayload(f)); } catch (e) { /* ignore */ }
    }
    renderFruit(id, f);
    updateFruitGlow();
  }

  function eatFruit(id) {
    if (!carrying || carrying.id !== id) return;
    const f = fruits.get(id);
    carrying = null;
    cancelCarryCleanup(id);
    if (f && f.el) f.el.remove();
    fruits.delete(id);
    if (fruitsAreShared()) {
      try { fb.db.remove(fruitRefFor(id)); } catch (e) { /* ignore */ }
    }
  }

  // ---------- Fruit spawning ----------
  // There is no game server, so the players themselves keep the
  // orchards stocked: while in the world, each client periodically
  // checks whether any fruit type is below the target of 15. Spawning
  // is throttled to one fruit per 30 seconds world-wide; in the shared
  // world the throttle is a timestamp in the database, and a
  // transaction on it decides which client gets to spawn.
  let fruitSpawnTimer = null;
  let soloLastSpawnT = 0;
  let soloFruitSeq = 0;

  // The fruit type most in need of spawning, or null if fully stocked.
  function fruitDeficitType() {
    const counts = { s: 0, a: 0, b: 0 };
    for (const [, f] of fruits) {
      if (counts[f.t] !== undefined) counts[f.t] += 1;
    }
    let best = null;
    for (const t of FRUIT_TYPES) {
      if (counts[t] >= FRUIT_TARGET) continue;
      if (best === null || counts[t] < counts[best]) best = t;
    }
    return best;
  }

  function newFruitData(type) {
    return {
      t: type,
      v: Math.random() < 0.5 ? 0 : 1, // apples: red or green
      tile: { ...ORCHARD_TILES[type] },
      pos: {
        x: +(0.15 + Math.random() * 0.7).toFixed(3),
        y: +(0.15 + Math.random() * 0.7).toFixed(3),
      },
    };
  }

  function maybeSpawnFruit() {
    const type = fruitDeficitType();
    if (!type) return;
    if (fruitsAreShared()) {
      try {
        fb.db.runTransaction(mp.fruitSpawnRef, (last) => {
          // Returning undefined aborts: someone spawned too recently.
          if (typeof last === 'number' && Date.now() - last < FRUIT_SPAWN_MS) return;
          return Date.now();
        }).then((res) => {
          if (!res.committed) return;
          const fRef = fb.db.push(mp.fruitsRef);
          return fb.db.set(fRef, newFruitData(type));
        }).catch(() => { /* ignore — e.g. offline or rules deny */ });
      } catch (e) { /* ignore */ }
    } else {
      if (Date.now() - soloLastSpawnT < FRUIT_SPAWN_MS) return;
      soloLastSpawnT = Date.now();
      const id = `solo-${++soloFruitSeq}`;
      const f = newFruitData(type);
      fruits.set(id, f);
      renderFruit(id, f);
    }
  }

  function startFruitSpawner() {
    if (fruitSpawnTimer) return;
    maybeSpawnFruit();
    fruitSpawnTimer = setInterval(maybeSpawnFruit, FRUIT_CHECK_MS);
  }

  function stopFruitSpawner() {
    if (fruitSpawnTimer) { clearInterval(fruitSpawnTimer); fruitSpawnTimer = null; }
  }

  // ---------- Idle timeout ----------
  // The world watches for inactivity: any movement marks the player
  // active, and if an hour passes with no movement we tear down the
  // shared-world connection and send the player back to the welcome
  // screen. A backgrounded/abandoned tab counts as inactive too.
  let lastActivityT = 0;
  let idleTimer = null;

  function markActivity() {
    lastActivityT = Date.now();
  }

  function startIdleWatch() {
    markActivity();
    if (idleTimer) return;
    // Checking once a minute is plenty for an hour-long timeout and
    // keeps us robust to background-tab timer throttling.
    idleTimer = setInterval(() => {
      if (Date.now() - lastActivityT >= IDLE_TIMEOUT_MS) goIdle();
    }, 60 * 1000);
  }

  function stopIdleWatch() {
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  }

  function goIdle() {
    stopIdleWatch();
    stopFruitSpawner();
    if (fruitTapTimer) { clearTimeout(fruitTapTimer); fruitTapTimer = null; }
    if (carrying) putDownFruit(carrying.id); // don't walk off with a fruit
    rafRunning = false;     // halt the world loop
    inWorld = false;        // we no longer belong in the shared world
    leaveMultiplayer();     // remove our fairy and drop the connection
    show(welcomeScreen);    // back to "Welcome to FAIRY FUN!"
  }

  // ---------- Main loop ----------
  let rafRunning = false;
  let lastNetSync = 0;
  let wasMoving = false;
  function tick(now) {
    if (!rafRunning) return;
    const dt = Math.min(0.05, (now - state.lastT) / 1000);
    state.lastT = now;

    let vx = 0, vy = 0;
    if (state.keys.left)  vx -= 1;
    if (state.keys.right) vx += 1;
    if (state.keys.up)    vy += 1;
    if (state.keys.down)  vy -= 1;
    if (state.joy.active) {
      vx += state.joy.dx;
      vy += state.joy.dy;
    }
    const mag = Math.hypot(vx, vy);
    if (mag > 1) { vx /= mag; vy /= mag; }

    const moving = (vx !== 0 || vy !== 0);
    if (moving) {
      markActivity();
      state.pos.x += vx * FAIRY_SPEED * dt;
      state.pos.y += vy * FAIRY_SPEED * dt;
      const tileChanged = resolveTileTransitions();
      updateFairyPosition();
      if (tileChanged || now - lastNetSync > 120) broadcastState();
    } else if (wasMoving) {
      // Send one last update the moment the player stops.
      broadcastState();
    }
    wasMoving = moving;

    requestAnimationFrame(tick);
  }

  function resolveTileTransitions() {
    let changed = false;
    while (state.pos.x > 1) {
      if (state.tile.x < WORLD_W) {
        state.tile.x += 1;
        state.pos.x -= 1;
        loadTile();
        changed = true;
      } else {
        state.pos.x = 1;
        break;
      }
    }
    while (state.pos.x < 0) {
      if (state.tile.x > 1) {
        state.tile.x -= 1;
        state.pos.x += 1;
        loadTile();
        changed = true;
      } else {
        state.pos.x = 0;
        break;
      }
    }
    while (state.pos.y > 1) {
      if (state.tile.y < WORLD_H) {
        state.tile.y += 1;
        state.pos.y -= 1;
        loadTile();
        changed = true;
      } else {
        state.pos.y = 1;
        break;
      }
    }
    while (state.pos.y < 0) {
      if (state.tile.y > 1) {
        state.tile.y -= 1;
        state.pos.y += 1;
        loadTile();
        changed = true;
      } else {
        state.pos.y = 0;
        break;
      }
    }
    return changed;
  }

  // Re-place fairy after image loads (sizes may change) and on resize.
  // Clearing the dim here reveals the freshly loaded tile.
  tileImg.addEventListener('load', () => {
    tileImg.classList.remove('loading');
    invalidateTileRect();
    updateFairyPosition();
  });
  // If a tile fails to load, don't leave it dimmed forever.
  tileImg.addEventListener('error', () => tileImg.classList.remove('loading'));
  window.addEventListener('resize', () => {
    invalidateTileRect();
    updateFairyPosition();
  });

  // Boot: show the initial screen.
  show(initialScreen);
})();
