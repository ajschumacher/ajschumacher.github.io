(() => {
  const WORLD_W = 10;
  const WORLD_H = 3;
  const START_TILE = { x: 7, y: 2 };
  const FAIRY_SPEED = 0.45; // tile fractions per second

  const initialScreen = document.getElementById('initial-screen');
  const welcomeScreen = document.getElementById('welcome-screen');
  const worldScreen = document.getElementById('world-screen');
  const startBtn = document.getElementById('start-btn');
  const nextBtn = document.getElementById('next-btn');
  const tileImg = document.getElementById('tile-img');
  const fairy = document.getElementById('fairy');
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const bgm = document.getElementById('bgm');

  const state = {
    tile: { ...START_TILE },
    pos: { x: 0.5, y: 0.5 }, // normalized within tile, (0,0) bottom-left, (1,1) top-right
    keys: { up: false, down: false, left: false, right: false },
    joy: { active: false, dx: 0, dy: 0 },
    lastT: 0,
  };

  // ---------- Screen flow ----------
  let currentScreen = null;

  function show(screen) {
    [initialScreen, welcomeScreen, worldScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
    currentScreen = screen;
  }

  function startMusic() {
    bgm.volume = 0.7;
    const p = bgm.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* ignore */ });
  }

  // Browsers block autoplay until user interaction. If the page loads
  // directly into a non-initial screen via the URL, we kick off music on
  // the first user interaction of any kind.
  function ensureMusicOnFirstInteraction() {
    if (!bgm.paused) return;
    const kick = () => {
      startMusic();
      window.removeEventListener('pointerdown', kick, true);
      window.removeEventListener('keydown', kick, true);
      window.removeEventListener('touchstart', kick, true);
    };
    window.addEventListener('pointerdown', kick, true);
    window.addEventListener('keydown', kick, true);
    window.addEventListener('touchstart', kick, true);
  }

  startBtn.addEventListener('click', () => {
    startMusic();
    setRoute('/welcome');
  });

  nextBtn.addEventListener('click', () => {
    state.tile = { ...START_TILE };
    state.pos = { x: 0.5, y: 0.5 };
    setRoute(buildWorldRoute());
  });

  // ---------- Routing ----------
  function buildWorldRoute() {
    const t = `${state.tile.x},${state.tile.y}`;
    const p = `${state.pos.x.toFixed(3)},${state.pos.y.toFixed(3)}`;
    return `/world?tile=${t}&pos=${p}`;
  }

  function setRoute(path) {
    const next = '#' + path;
    if (location.hash !== next) {
      location.hash = next; // triggers hashchange → applyRoute
    } else {
      applyRoute();
    }
  }

  function replaceRoute(path) {
    const next = '#' + path;
    if (location.hash !== next) {
      history.replaceState(null, '', next);
    }
  }

  function parseRoute() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [pathname, query = ''] = raw.split('?');
    const params = new URLSearchParams(query);
    return { pathname, params };
  }

  function applyRoute() {
    const { pathname, params } = parseRoute();
    if (pathname === '/welcome') {
      show(welcomeScreen);
      ensureMusicOnFirstInteraction();
      stopWorldLoop();
      return;
    }
    if (pathname === '/world') {
      const tileStr = params.get('tile');
      const posStr = params.get('pos');
      let tile = { ...START_TILE };
      let pos = { x: 0.5, y: 0.5 };
      if (tileStr) {
        const [tx, ty] = tileStr.split(',').map(Number);
        if (Number.isFinite(tx) && Number.isFinite(ty)
            && tx >= 1 && tx <= WORLD_W && ty >= 1 && ty <= WORLD_H) {
          tile = { x: tx, y: ty };
        }
      }
      if (posStr) {
        const [px, py] = posStr.split(',').map(Number);
        if (Number.isFinite(px) && Number.isFinite(py)) {
          pos = { x: Math.min(1, Math.max(0, px)), y: Math.min(1, Math.max(0, py)) };
        }
      }
      state.tile = tile;
      state.pos = pos;
      show(worldScreen);
      ensureMusicOnFirstInteraction();
      enterWorld();
      return;
    }
    show(initialScreen);
    stopWorldLoop();
  }

  window.addEventListener('hashchange', applyRoute);

  // ---------- World ----------
  function tileSrc(x, y) {
    return `images/world/${x}_${y}.png`;
  }

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

  function stopWorldLoop() {
    rafRunning = false;
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

  function updateFairyPosition() {
    const r = getTileRect();
    // Scale fairy emoji to ~6% of tile height
    const size = Math.max(28, Math.round(r.height * 0.08));
    fairy.style.fontSize = size + 'px';
    fairy.style.left = (r.left + state.pos.x * r.width) + 'px';
    fairy.style.top  = (r.top  + (1 - state.pos.y) * r.height) + 'px';
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

  // ---------- Main loop ----------
  let rafRunning = false;
  let lastUrlSync = 0;
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

    if (vx !== 0 || vy !== 0) {
      state.pos.x += vx * FAIRY_SPEED * dt;
      state.pos.y += vy * FAIRY_SPEED * dt;
      const tileChanged = resolveTileTransitions();
      updateFairyPosition();
      if (tileChanged) {
        replaceRoute(buildWorldRoute());
        lastUrlSync = now;
      } else if (now - lastUrlSync > 500) {
        replaceRoute(buildWorldRoute());
        lastUrlSync = now;
      }
    }

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

  // Boot: apply the route from the URL.
  applyRoute();
})();
