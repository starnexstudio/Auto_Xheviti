/* "Punimet tona" album: a looping 3D coverflow driven by one continuous position `pos` (in slides).
   Each slide's offset, scale, rotation, depth and opacity are interpolated from its wrapped distance
   to the centre, so photographs grow, straighten and recede continuously instead of switching states.
   Input: pointer drag (mouse + touch), horizontal trackpad wheel, arrows, dots and keyboard.
   Vertical wheel/swipe is never captured, so the page always keeps scrolling. */
(() => {
  const root = document.getElementById('punime');
  const view = document.getElementById('hxAlbum');
  if (!root || !view) return;

  const slides = [...view.querySelectorAll('.hx-album__slide')];
  const N = slides.length;
  const caption = document.getElementById('hxAlbumCaption');
  const dotsBox = document.getElementById('hxAlbumDots');
  const CAPTIONS = [                                   // the make (and model where its badge is visible) plus the work shown
    'Audi · Xhama të zinj',
    'Mercedes-Benz · Errësim profesional',
    'BMW · Xhama të zinj',
    'Mercedes-Benz · Llampa Xenon',
    'Tesla · Detaje & finish',
    'Audi A8 L · Xhama të zinj',
    'Audi · Xhama të zinj',
    'Mercedes-Benz · Xhama të zinj',
    'BYD · Xhama të zinj',
    'Audi SQ7 · Xhama të zinj',
  ];

  const mobileQuery = matchMedia('(max-width: 767px)');
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

  // Keyframes by distance |d| from the centre: x offset (card widths), scale, rotateY (deg), opacity.
  // Values between keyframes are linearly interpolated; outside the last one the slide is hidden.
  const LAYOUT = {
    wide:   { d: [0, 1, 2, 3],     x: [0, .875, 1.47, 1.95], s: [1, .72, .52, .40], r: [0, 24, 34, 38], o: [1, 1, 1, 0], fade: [2.2, 2.7] },
    mobile: { d: [0, 1, 2],        x: [0, .86, 1.42],        s: [1, .68, .52],      r: [0, 22, 30],     o: [1, 1, 0],    fade: [1.25, 1.75] },
  };
  const lerpTable = (t, ds, vs) => {
    if (t >= ds[ds.length - 1]) return vs[vs.length - 1];
    let k = 0; while (t > ds[k + 1]) k++;
    const f = (t - ds[k]) / (ds[k + 1] - ds[k]);
    return vs[k] + (vs[k + 1] - vs[k]) * f;
  };
  const wrap = d => ((d % N) + N + N / 2) % N - N / 2;  // shortest signed distance on the loop
  const mod = i => ((i % N) + N) % N;

  let pos = 2;          // start on 03 (BMW)
  let target = pos;
  let vel = 0;
  let cardW = 1;
  let raf = 0;
  let last = 0;
  let active = -1;
  // Entrance: null = finished; 'wait' = hidden until the section is in view; a number = start time (ms)
  let intro = null;
  const INTRO_DELAY = 150, INTRO_STAGGER = 130, INTRO_DUR = 950;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // ---- Render ----
  function render() {
    const L = mobileQuery.matches ? LAYOUT.mobile : LAYOUT.wide;
    const reduced = reducedQuery.matches;
    const elapsed = intro === null ? Infinity : intro === 'wait' ? 0 : performance.now() - intro;
    for (let i = 0; i < N; i++) {
      const d = wrap(i - pos);
      const a = Math.abs(d);
      const sign = d < 0 ? -1 : 1;
      let x = lerpTable(a, L.d, L.x) * cardW * sign;
      let s = lerpTable(a, L.d, L.s);
      let r = reduced ? 0 : lerpTable(a, L.d, L.r) * -sign;      // inner edge recedes toward the centre
      let o = a <= L.fade[0] ? 1 : Math.max(0, 1 - (a - L.fade[0]) / (L.fade[1] - L.fade[0]));
      let y = 0;
      if (elapsed < Infinity) {
        // Photos fan out from behind the centre one: centre first, then each ring outward
        const t = Math.min(1, Math.max(0, (elapsed - INTRO_DELAY - a * INTRO_STAGGER) / INTRO_DUR));
        const e = easeOut(t);
        x *= .12 + .88 * e; s *= .84 + .16 * e; r *= e; y = (1 - e) * 40; o *= Math.min(1, t * 2.2);
      }
      const el = slides[i];
      el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotateY(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      el.style.opacity = o.toFixed(3);
      el.style.zIndex = String(1000 - Math.round(a * 100));
      el.style.visibility = o < .01 ? 'hidden' : '';
    }
    const now = mod(Math.round(pos));
    if (now !== active) setActive(now);
  }

  function setActive(i) {
    const first = active < 0;
    active = i;
    slides.forEach((el, k) => el.setAttribute('aria-hidden', k === i ? 'false' : 'true'));
    dots.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    const write = () => {
      caption.querySelector('.hx-album__name').textContent = CAPTIONS[i];
    };
    if (first || reducedQuery.matches) { write(); return; }
    caption.classList.add('is-swapping');
    clearTimeout(setActive.t);
    setActive.t = setTimeout(() => { write(); caption.classList.remove('is-swapping'); }, 180);
  }

  // ---- Motion: critically damped spring toward `target` (no bounce) ----
  function step(t) {
    const dt = Math.min(.05, (t - last) / 1000 || .016);
    last = t;
    if (dragging || wheeling) { raf = 0; return; }
    const k = reducedQuery.matches ? 900 : 140;
    const acc = -k * (pos - target) - 2 * Math.sqrt(k) * vel;
    vel += acc * dt;
    pos += vel * dt;
    if (Math.abs(pos - target) < .0005 && Math.abs(vel) < .001) {
      pos = target = normalise(target); vel = 0; render(); raf = 0; return;
    }
    render();
    raf = requestAnimationFrame(step);
  }
  const normalise = p => { const r = Math.round(p); return p - r + mod(r); };   // keep numbers small, same visual state
  function animate() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }
  function goTo(t) { target = t; animate(); }
  function goBy(n) { goTo(Math.round(target) + n); }
  function goIndex(i) { goTo(Math.round(target) + wrap(i - mod(Math.round(target)))); }

  // ---- Dots ----
  const dots = CAPTIONS.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hx-album__dot';
    b.setAttribute('aria-label', `Foto ${i + 1} nga ${N}: ${c}`);
    b.addEventListener('click', () => goIndex(i));
    dotsBox.appendChild(b);
    return b;
  });
  document.getElementById('hxAlbumPrev').addEventListener('click', () => goBy(-1));
  document.getElementById('hxAlbumNext').addEventListener('click', () => goBy(1));

  // ---- Keyboard (when the album has focus) ----
  view.addEventListener('keydown', e => {
    const map = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in map) { e.preventDefault(); goBy(map[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); goIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); goIndex(N - 1); }
  });

  // ---- Pointer drag (mouse and touch; touch-action: pan-y leaves vertical swipes to the page) ----
  const slideStep = () => cardW * (mobileQuery.matches ? LAYOUT.mobile.x[1] : LAYOUT.wide.x[1]);
  let dragging = false, pid = null, x0 = 0, y0 = 0, p0 = 0, moved = false, samples = [];
  view.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; p0 = pos; moved = false; samples = [[e.timeStamp, pos]];
  });
  view.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!dragging) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;   // wait for a clear horizontal gesture
      dragging = moved = true; vel = 0; view.setPointerCapture(pid); view.classList.add('is-dragging');
      x0 = e.clientX; p0 = pos;
    }
    pos = p0 - (e.clientX - x0) / slideStep();
    samples.push([e.timeStamp, pos]); if (samples.length > 6) samples.shift();
    render();
  });
  const release = e => {
    if (e.pointerId !== pid) return;
    pid = null;
    if (!dragging) return;
    dragging = false; view.classList.remove('is-dragging');
    const [t1, q1] = samples[0], [t2, q2] = samples[samples.length - 1];
    const v = t2 > t1 ? (q2 - q1) / ((t2 - t1) / 1000) : 0;           // slides per second
    const throwBy = Math.max(-2, Math.min(2, v * .22));                 // restrained momentum
    vel = Math.max(-6, Math.min(6, v)) * .5;
    goTo(Math.round(pos + throwBy));
  };
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);
  // A tap on a side photo brings it to the centre (never after a drag)
  view.addEventListener('click', e => {
    if (moved) { moved = false; return; }
    const li = e.target.closest('.hx-album__slide');
    if (li) goIndex(slides.indexOf(li));
  });

  // ---- Horizontal trackpad / shift-wheel. Vertical wheel is left alone so the page scrolls. ----
  let wheeling = false, wheelTimer = 0;
  view.addEventListener('wheel', e => {
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (!dx || Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
    e.preventDefault();
    const px = dx * (e.deltaMode === 1 ? 16 : 1);
    wheeling = true; vel = 0;
    pos += px / slideStep();
    target = pos;
    render();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheeling = false; goTo(Math.round(pos)); }, 140);
  }, { passive: false });

  // ---- Layout ----
  function measure() { cardW = slides[0].offsetWidth || 1; render(); }
  addEventListener('resize', measure);
  mobileQuery.addEventListener('change', measure);
  reducedQuery.addEventListener('change', measure);
  measure();

  // ---- Entrance: once, as the section first enters the viewport ----
  if (!reducedQuery.matches && 'IntersectionObserver' in window && root.getBoundingClientRect().top > innerHeight * .9) {
    root.classList.add('is-pending');
    intro = 'wait'; render();
    const io = new IntersectionObserver(entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      root.classList.remove('is-pending');
      intro = performance.now();
      const end = intro + INTRO_DELAY + 3 * INTRO_STAGGER + INTRO_DUR;
      const frame = t => { if (t >= end) { intro = null; render(); return; } render(); requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    }, { threshold: .25 });
    io.observe(root);
  }

  // Test hook
  window.hxAlbum = { get pos() { return pos; }, get target() { return target; }, get moving() { return !!raf || dragging || wheeling || intro !== null; }, get active() { return active; }, goBy, goIndex };
})();
