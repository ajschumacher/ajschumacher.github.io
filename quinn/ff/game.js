(() => {
  const WORLD_W = 10;
  const WORLD_H = 3;
  const START_TILE = { x: 7, y: 2 };
  const FAIRY_SPEED = 0.45; // tile fractions per second

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
    return state.tileSet === 'qworld'
      ? `images/qworld/${x}_${y}.jpeg`
      : `images/world/${x}_${y}.png`;
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

  function loadTile() {
    tileImg.src = tileSrc(state.tile.x, state.tile.y);
  }

  function enterWorld() {
    loadTile();
    updateFairyPosition();
    showJoystickIfTouch();
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

  // Compute the rendered tile rectangle (image is object-fit: contain inside #tile-frame).
  function getTileRect() {
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

  // Place a fairy element at a normalized position within the tile.
  function placeFairyEl(el, pos) {
    const r = getTileRect();
    const size = Math.max(28, Math.round(r.height * 0.08));
    el.style.fontSize = size + 'px';
    el.style.left = (r.left + pos.x * r.width) + 'px';
    el.style.top  = (r.top  + (1 - pos.y) * r.height) + 'px';
  }

  function updateFairyPosition() {
    placeFairyEl(fairy, state.pos);
    renderAllPeers();
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
  const FIREBASE_APP_MOD = 'https://esm.sh/firebase@12.13.0/app';
  const FIREBASE_DB_MOD  = 'https://esm.sh/firebase@12.13.0/database';
  // The Firebase Realtime Database URL is not a secret — database rules
  // limit writes to the players path.
  const FIREBASE_DB_URL = 'https://fairy-fun-182dc-default-rtdb.firebaseio.com';
  // Everyone playing Fairy Fun shares one world room.
  const FIXED_ROOM = 'meadow-2';
  // How long to wait for the database library to load and the handshake
  // to succeed before giving up and offering single player.
  const CONNECT_TIMEOUT_MS = 8000;

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

    const db = fb.db.getDatabase(fbApp);
    const playersRef = fb.db.ref(db, `fairyfun/rooms/${FIXED_ROOM}/players`);
    // push() generates a server-friendly unique key for this player.
    const selfRef = fb.db.push(playersRef);
    const selfId = selfRef.key;
    const connectedRef = fb.db.ref(db, '.info/connected');

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
    mp = { db, playersRef, selfRef, selfId, peers };

    // Ask the server to delete our presence node the moment it notices
    // we have gone — no more ghost fairies, no heartbeat needed.
    fb.db.onDisconnect(selfRef).remove();

    // Watch the players list. The snapshot is the source of truth, so
    // we add / update / remove peers to match.
    fb.db.onValue(playersRef, (snap) => {
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

    mpConnecting = false;
    setConnectionState('connected');
    // If we are already in the world (e.g., reconnect after a drop),
    // republish ourselves so other players see us again.
    broadcastState();
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
  tileImg.addEventListener('load', updateFairyPosition);
  window.addEventListener('resize', updateFairyPosition);

  // Boot: show the initial screen.
  show(initialScreen);
})();
