(() => {
  'use strict';

  const C = window.CONTENT;
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const bg = $('#bg');
  const music = $('#music');
  const backBtn = $('#back');
  const muteBtn = $('#mute');

  const HEARTS = ['💖', '💕', '💗', '❤️', '💓', '🌸'];
  const TILTS = [-6, 5, -3, 7, -5, 3, -7, 4];

  const photos = []; // { url, caption }, kept only in this browser's memory
  let steps = [];
  let idx = -1;
  let busy = false;
  let busyTimer = 0;
  let navToken = 0;
  let current = {};

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // While busy, taps don't move the show forward (so nothing gets skipped by accident)
  function lock(ms) {
    if (!ms) return unlock();
    busy = true;
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => { busy = false; }, ms);
  }
  function unlock() {
    clearTimeout(busyTimer);
    busy = false;
  }

  /* ---------- hearts and confetti ---------- */

  // Clean up a piece once its animation is over (with a timer too, in case animationend never fires)
  function removeAfter(node, seconds) {
    node.addEventListener('animationend', () => node.remove());
    setTimeout(() => node.remove(), seconds * 1000 + 300);
  }

  function floatHeart() {
    const h = el('span', 'float-heart', pick(HEARTS));
    h.style.left = rand(0, 95) + 'vw';
    h.style.fontSize = rand(16, 34) + 'px';
    const d = rand(9, 15);
    h.style.setProperty('--d', d + 's');
    h.style.setProperty('--sway', rand(-40, 40) + 'px');
    removeAfter(h, d);
    bg.append(h);
  }
  setInterval(floatHeart, 800);

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = el('span', 'burst', pick(HEARTS));
      const a = (Math.PI * 2 * i) / n + rand(-0.2, 0.2);
      const d = rand(90, 190);
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.fontSize = rand(18, 32) + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      removeAfter(p, 1);
      document.body.append(p);
    }
  }
  function burstAt(node, n = 18) {
    if (!node.isConnected) return;
    const r = node.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n);
  }

  function confetti(n = 90) {
    const pieces = [...HEARTS, '✨', '💝'];
    for (let i = 0; i < n; i++) {
      const p = el('span', 'confetti', pick(pieces));
      p.style.left = rand(0, 98) + 'vw';
      p.style.fontSize = rand(18, 36) + 'px';
      const delay = rand(0, 1.2);
      const d = rand(2.8, 5);
      p.style.animationDelay = delay + 's';
      p.style.setProperty('--d', d + 's');
      p.style.setProperty('--spin', rand(-360, 360) + 'deg');
      p.style.setProperty('--drift', rand(-60, 60) + 'px');
      removeAfter(p, delay + d);
      document.body.append(p);
    }
  }

  /* ---------- music ---------- */

  function startMusic() {
    music.volume = 0.7;
    const p = music.play();
    if (p) p.then(() => muteBtn.classList.add('show')).catch(() => {});
  }
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    music.muted = !music.muted;
    muteBtn.textContent = music.muted ? '🔇' : '🔊';
  });

  /* ---------- scenes ---------- */

  function titleStep(text) {
    return { render(sc) { sc.append(el('h1', 'big fade-in', text)); return 1100; } };
  }

  function since() {
    const [y, m, d] = C.startDate.split('-').map(Number);
    const s = Math.max(0, Math.floor((Date.now() - new Date(y, m - 1, d)) / 1000));
    return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  }

  function counterScene(sc) {
    sc.append(el('h1', 'big fade-in', C.counterTitle));
    const grid = el('div', 'counter fade-in');
    const nums = ['days', 'hours', 'minutes', 'seconds'].map((u) => {
      const cell = el('div', 'cell');
      const n = el('div', 'num', '0');
      cell.append(n, el('div', 'unit', u));
      grid.append(cell);
      return n;
    });
    sc.append(grid, el('p', 'sub fade-in delay3', C.counterSub));

    const t0 = performance.now();
    const dur = 2600;
    function frame(now) {
      if (!sc.isConnected) return;
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      since().forEach((v, i) => { nums[i].textContent = Math.floor(v * ease); });
      if (p < 1) return requestAnimationFrame(frame);
      const live = setInterval(() => {
        if (!sc.isConnected) return clearInterval(live);
        since().forEach((v, i) => { nums[i].textContent = v; });
      }, 1000);
    }
    requestAnimationFrame(frame);
    return 2800;
  }

  function reasonScene(sc, text, i, n) {
    sc.append(el('p', 'label fade-in', `reason ${i + 1} of ${n}`));
    const card = el('div', 'card pop-in', text);
    sc.append(card);
    setTimeout(() => burstAt(card, 14), 400);
    return 1000;
  }

  function genieScene(sc) {
    const wrap = el('div', 'genie-wrap');
    const bubble = el('div', 'bubble', C.genie);
    wrap.append(bubble, el('div', 'genie', '🧞'), el('div', 'lamp', '🪔'));
    for (let i = 0; i < 8; i++) {
      const s = el('span', 'sparkle', '✨');
      s.style.left = rand(5, 88) + '%';
      s.style.top = rand(10, 85) + '%';
      s.style.animationDelay = rand(0, 2) + 's';
      wrap.append(s);
    }
    sc.append(wrap);
    setTimeout(() => burstAt(bubble, 16), 2300);
    return 2800;
  }

  function photoScene(sc, i) {
    const pile = el('div', 'pile');
    for (let k = 0; k <= i; k++) {
      const card = el('figure', k === i ? 'polaroid drop' : 'polaroid');
      card.style.setProperty('--r', TILTS[k % TILTS.length] + 'deg');
      card.style.setProperty('--x', ((k % 3) - 1) * 10 + 'px');
      const img = new Image();
      img.src = photos[k].url;
      img.alt = '';
      card.append(img);
      if (photos[k].caption.trim()) card.append(el('figcaption', null, photos[k].caption.trim()));
      pile.append(card);
    }
    sc.append(pile);
    return 1100;
  }

  // Split the letter into short pages at sentence breaks
  function paginate(text, max) {
    const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\)?\s*/g) || [text];
    const pages = [];
    let cur = '';
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s) continue;
      if (cur && (cur + ' ' + s).length > max) {
        pages.push(cur);
        cur = s;
      } else {
        cur = cur ? cur + ' ' + s : s;
      }
    }
    if (cur) pages.push(cur);
    return pages;
  }

  function letterScene(sc, text, i, n, cur) {
    const card = el('div', 'paper fade-in');
    const p = el('p', 'letter-text');
    card.append(p, el('div', 'page-num', `${i + 1} / ${n}`));
    sc.append(card);

    const speed = 32;
    let k = 0;
    const timer = setInterval(() => {
      if (!p.isConnected) return clearInterval(timer);
      k++;
      p.textContent = text.slice(0, k);
      if (k >= text.length) finish();
    }, speed);
    function finish() {
      clearInterval(timer);
      p.textContent = text;
      unlock();
    }
    cur.skip = finish; // a tap while it's typing shows the whole page
    return text.length * speed + 600;
  }

  function questionScene(sc) {
    sc.append(el('h1', 'big fade-in', C.question));
    const area = el('div', 'answer fade-in late');
    const yes = el('button', 'yes', 'YES 💕');
    const no = el('button', 'no', 'No');
    yes.type = no.type = 'button';
    area.append(yes, no);
    sc.append(area);

    let scale = 1;
    function overlaps(x, y, w, h, r, pad) {
      return x < r.right + pad && x + w > r.left - pad && y < r.bottom + pad && y + h > r.top - pad;
    }
    function dodge(e) {
      e.preventDefault();
      e.stopPropagation();
      const b = no.getBoundingClientRect();
      const y1 = yes.getBoundingClientRect();
      const maxX = window.innerWidth - b.width - 16;
      const maxY = window.innerHeight - b.height - 30;
      let x, y, tries = 0;
      do {
        x = rand(16, maxX);
        y = rand(90, maxY);
        tries++;
      } while (tries < 40 && (Math.hypot(x - b.left, y - b.top) < 150 || overlaps(x, y, b.width, b.height, y1, 30)));
      // Move it out of the animated row so "fixed" means the screen, not that row
      if (no.parentNode !== sc) sc.append(no);
      no.style.position = 'fixed';
      no.style.left = x + 'px';
      no.style.top = y + 'px';
      scale = Math.min(scale + 0.12, 1.8);
      yes.style.transform = `scale(${scale})`;
    }
    no.addEventListener('pointerdown', dodge);
    no.addEventListener('pointerenter', dodge);
    no.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });

    let said = false;
    yes.addEventListener('click', (e) => {
      e.stopPropagation();
      if (said) return;
      said = true;
      no.remove();
      burstAt(yes, 30);
      confetti(70);
      lock(1500);
      const t = navToken;
      setTimeout(() => { if (t === navToken) show(idx + 1); }, 1100);
    });
    return 1500;
  }

  function finalScene(sc) {
    const msg = el('h1', 'princess pop-in', C.finalMessage);
    sc.append(msg);
    setTimeout(() => { msg.className = 'princess beat'; }, 900);
    const replay = el('button', 'replay fade-in delay3', '↻ replay');
    replay.type = 'button';
    replay.addEventListener('click', (e) => { e.stopPropagation(); show(1); });
    sc.append(replay);
    confetti(70);
    const rain = setInterval(() => {
      if (!sc.isConnected) return clearInterval(rain);
      confetti(8);
    }, 1800);
    return 1500;
  }

  function buildSteps() {
    const s = [];

    // Blank black screen to sit on while the screenshare starts
    s.push({
      dark: true,
      render(sc) { sc.append(el('div', 'ready-heart', '♥')); return 0; },
      leave() {
        startMusic();
        const root = document.documentElement;
        if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
        if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {});
        return 0;
      },
    });
    s.push({ dark: true, render(sc) { sc.append(el('h1', 'big slow-fade', `Hey ${C.name}…`)); return 1800; } });
    s.push({ dark: true, render(sc) { sc.append(el('h1', 'big slow-fade', C.madeSomething)); return 1800; } });
    s.push({
      dark: true,
      render(sc) {
        sc.append(el('div', 'pulse-heart', '❤️'), el('p', 'hint fade-in late', 'tap me'));
        return 1200;
      },
      leave(sc) {
        const heart = sc.querySelector('.pulse-heart');
        sc.querySelector('.hint').remove();
        burstAt(heart, 26);
        heart.classList.add('pop');
        return 800;
      },
    });

    s.push({ render: counterScene });

    s.push(titleStep(C.reasonsTitle));
    C.reasons.forEach((r, i) => s.push({ render: (sc) => reasonScene(sc, r, i, C.reasons.length) }));

    s.push({ render: genieScene });

    if (photos.length) {
      s.push(titleStep(C.photosTitle));
      photos.forEach((_, i) => s.push({ render: (sc) => photoScene(sc, i) }));
    }

    // The letter is optional: add letterTitle and letter to content.js to bring it back
    if (C.letter && C.letter.trim()) {
      const pages = paginate(C.letter, 190);
      s.push(titleStep(C.letterTitle));
      pages.forEach((p, i) => s.push({ render: (sc, cur) => letterScene(sc, p, i, pages.length, cur) }));
    }

    s.push({ render(sc) { sc.append(el('div', 'grow-heart', '❤️')); return 1800; } });
    s.push({ render(sc) { sc.append(el('h1', 'big slow-fade', C.favorite)); return 1600; } });
    s.push({
      render(sc) {
        sc.append(el('h1', 'huge slow-fade', C.iLoveYou), el('p', 'sub fade-in late', C.forever));
        setTimeout(() => { if (sc.isConnected) confetti(); }, 500);
        return 2200;
      },
    });

    s.push({ noTap: true, render: questionScene });
    s.push({ noTap: true, render: finalScene });
    return s;
  }

  /* ---------- navigation ---------- */

  function show(i) {
    if (i < 0 || i >= steps.length) return;
    navToken++;
    idx = i;
    const st = steps[i];
    document.body.classList.toggle('dark', !!st.dark);
    const sc = el('div', 'scene');
    stage.replaceChildren(sc);
    current = {};
    lock(st.render(sc, current) || 0);
    backBtn.classList.toggle('show', i > 1);
  }

  async function next() {
    if (idx < 0) return;
    if (busy) {
      if (current.skip) current.skip();
      return;
    }
    const st = steps[idx];
    if (st.noTap) return;
    const t = navToken;
    if (st.leave) {
      const ms = st.leave(stage.firstElementChild);
      if (ms) {
        lock(ms + 100);
        await wait(ms);
        if (t !== navToken) return;
      }
    }
    show(idx + 1);
  }

  stage.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    next();
  });
  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (idx > 1) show(idx - 1);
  });

  /* ---------- start ---------- */

  // Photos come from content.js (files in the photos folder)
  for (const p of C.photos || []) {
    photos.push({ url: p.file, caption: p.caption || '' });
    new Image().src = p.file; // preload so they appear instantly
  }

  steps = buildSteps();
  show(0);
})();
