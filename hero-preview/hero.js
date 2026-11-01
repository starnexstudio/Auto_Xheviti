/* Auto Xheviti — isolated hero preview.

   Two independent drivers, each owning its own layers:

   1 · Automatic entrance (time-based, once per page load). After the vehicle images are decoded the car
       drives in from the left on #hxDrive with its .hx-spin-in wheel groups, decelerating to a stop in the
       centre; the headline descends. ~1.8 s. Glass stays clear. It never replays on backward scrolling.

   2 · Scroll-controlled tint and exit. Only after the entrance settles, the scroll position at that moment
       becomes the tint origin. From there every property is a pure function of scroll: tint 0 → 100 %,
       tinted hold, then #hxVehicle with its .hx-spin-out groups drives out to the right.
       No timers or smoothing on these layers: stopping holds the state; reversing restores it exactly.

   No libraries, no globals. */
(() => {
  const root = document.documentElement;
  const pin = document.getElementById('hxPin');
  const sticky = pin.querySelector('.hx-sticky');
  const stage = document.getElementById('hxStage');
  const headline = document.getElementById('hxHeadline');
  const vehicle = document.getElementById('hxVehicle');
  const drive = document.getElementById('hxDrive');
  const car = document.getElementById('hxCar');
  const copy = document.getElementById('hxCopy');
  const spinIn = [...car.querySelectorAll('.hx-spin-in')];
  const spinOut = [...car.querySelectorAll('.hx-spin-out')];
  const indicator = document.getElementById('hxIndicator');
  const indicatorFill = document.getElementById('hxIndicatorFill');
  const debug = document.getElementById('hxDebug');
  const services = document.getElementById('sherbime');

  const mobileQuery = matchMedia('(max-width: 767px)');
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const showDebug = new URLSearchParams(location.search).has('debug');
  if (showDebug) debug.hidden = false;

  // Automatic entrance timing (ms)
  const ENTER_CAR = 1800;                // car drives in and stops; wheels stop with it
  const ENTER_HEAD = 1100;               // headline descends
  const COPY_FROM = 0, COPY_TO = ENTER_HEAD; // title and supporting copy fade in together
  const UI_FROM = 1500, UI_TO = 1900;    // tint indicator appears
  const ENTER_TOTAL = UI_TO;

  // Scroll phases, as fractions of the range from the tint origin to the end of the pin
  const TINT_END = 0.42;                 // 0 → TINT_END: windows darken (car stationary)
  const EXIT_START = 0.48, EXIT_END = 0.76;   // complete the drive-out before the section transition
  const MIN_RANGE = 0.6;                 // leave at least 60% of the pin for early-scroll visitors

  const TYRE_R = 79.001;                 // rendered tyre radius in SVG units (viewBox width 1100)
  const RAD2DEG = 180 / Math.PI;
  const assetBase = new URL('assets/', document.currentScript.src);
  const ASSETS = ['car-silver-occupants-seat-fixed', 'wheel-rear', 'caliper-rear', 'spokes-rear',
    'wheel-front', 'caliper-front', 'spokes-front'].map(n => new URL(`${n}.webp`, assetBase).href);
  ASSETS.push(new URL('glass-blackout.svg?v=1', assetBase).href);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (v, a, b) => clamp((v - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  const easeOut = t => 1 - (1 - t) ** 3;     // arrives at speed, brakes to zero velocity
  const easeIn = t => t * t;                 // pulls away gradually while the hero stays pinned

  let m = null;
  let lastWidth = 0;
  let frame = 0;
  let enterStart = null;                 // performance.now() when the entrance began
  let enterMs = 0;                       // elapsed entrance time, frozen at ENTER_TOTAL when done
  let origin = null;                     // scroll px where tint starts (set when the entrance settles)

  // The desktop headline shares the page's content edges; mobile retains its stacked composition.
  function fitHeadline() {
    const mobile = mobileQuery.matches;
    const u = stage.offsetWidth / (mobile ? 390 : 1440);
    headline.style.removeProperty('--hx-head-size');
    const base = parseFloat(getComputedStyle(headline).fontSize);
    const measured = mobile
      ? headline.querySelector('.hx-headline__name').getBoundingClientRect().width
      : headline.getBoundingClientRect().width;
    if (!measured) return;
    const wanted = mobile ? 370 * u : services.querySelector('.hx-services__inner').clientWidth;
    headline.style.setProperty('--hx-head-size', `${(base * wanted / measured).toFixed(2)}px`);
  }

  // Travel distances depend on layout only (offset* ignores transforms), measured against the
  // sticky viewport height so mobile URL-bar show/hide doesn't change them mid-scroll.
  function measure() {
    const vh = sticky.offsetHeight;
    const vw = sticky.clientWidth;
    const stageLeft = (vw - stage.offsetWidth) / 2;                    // stage is centred
    const carLeft = stageLeft + vehicle.offsetLeft;                      // settled left edge in the viewport
    const carW = vehicle.offsetWidth;
    root.classList.toggle('hx-transition-live', !reducedQuery.matches);
    m = {
      vh,
      carFromLeft: -(carLeft + carW) - 24,             // entrance starts fully outside the left edge
      carToRight: vw - carLeft + 24,                   // exit ends fully outside the right edge
      headIn: -(headline.offsetTop + headline.offsetHeight) - 32,   // headline starts above the viewport
      pxPerUnit: carW / 1100,                          // CSS px per SVG unit, for wheel rotation
      scrollable: Math.max(1, pin.offsetHeight - vh),
      // A compact desktop stage may be shorter than the window. Finish the
      // departure before Services reaches the bottom edge of that window.
      exitRange: Math.max(1, pin.offsetHeight - Math.max(vh, innerHeight)),
    };
  }

  // Rolling without slip: angle (rad) = horizontal travel / tyre radius, both in SVG units.
  // Moving right → angle increases → clockwise on screen.
  const wheelAngle = xPx => (xPx / m.pxPerUnit / TYRE_R) * RAD2DEG;
  function setSpin(groups, xPx) {
    const t = `rotate(${wheelAngle(xPx).toFixed(3)})`;
    for (const g of groups) g.setAttribute('transform', t);
  }

  const scrolled = () => Math.max(0, -pin.getBoundingClientRect().top);

  // The complete tint and departure sequence finishes inside the pinned hero.
  function scrollProgress(s) {
    if (origin === null) return 0;
    return EXIT_END * clamp((s - origin) / Math.max(1, m.exitRange - origin));
  }

  function render() {
    if (reducedQuery.matches) {
      stage.style.setProperty('--hx-handoff-y', '0px');
      drive.style.transform = vehicle.style.transform = headline.style.transform = copy.style.transform = 'none';
      setSpin(spinIn, 0); setSpin(spinOut, 0);
      car.style.setProperty('--hx-tint', '1');
      copy.style.opacity = '1';
      indicator.style.opacity = '0';
      copy.inert = false;
      services.inert = false;
      pin.style.pointerEvents = '';
      headline.style.opacity = '1';
      if (showDebug) debug.textContent = 'reduced motion · static tinted state';
      return;
    }

    // 1 · Entrance (time) — owns #hxDrive, .hx-spin-in, the headline and the copy fade
    const carT = easeOut(seg(enterMs, 0, ENTER_CAR));
    const inX = m.carFromLeft * (1 - carT);
    drive.style.transform = `translate3d(${inX.toFixed(2)}px, 0, 0)`;
    setSpin(spinIn, inX);
    const c = smooth(seg(enterMs, COPY_FROM, COPY_TO));
    copy.style.opacity = c.toFixed(3);
    copy.style.transform = `translate3d(0, ${((1 - c) * 12).toFixed(2)}px, 0)`;
    const ui = smooth(seg(enterMs, UI_FROM, UI_TO));

    // 2 · Scroll — owns #hxVehicle, .hx-spin-out and the tint
    const s = scrolled();
    const q = scrollProgress(s);
    // Keep the composition level until the car is gone; normal scrolling follows the pin.
    stage.style.setProperty('--hx-handoff-y', '0px');
    const tint = smooth(seg(q, 0, TINT_END));
    const outX = m.carToRight * easeIn(seg(q, EXIT_START, EXIT_END));
    vehicle.style.transform = `translate3d(${outX.toFixed(2)}px, 0, 0)`;
    setSpin(spinOut, outX);
    car.style.setProperty('--hx-tint', tint.toFixed(4));

    // Release directly into normal document flow once the vehicle clears the screen.
    // Services remains fully opaque, and the outgoing hero copy bridges the two sections.
    const afterExit = Math.max(0, s - m.scrollable);
    const dismiss = smooth(seg(afterExit, m.vh * .45, m.vh * .75));
    headline.style.opacity = (c * (1 - dismiss)).toFixed(4);
    const headEntrance = m.headIn * (1 - easeOut(seg(enterMs, 0, ENTER_HEAD)));
    headline.style.transform = `translate3d(0, ${headEntrance.toFixed(2)}px, 0)`;
    copy.style.opacity = (c * (1 - dismiss)).toFixed(4);
    copy.inert = dismiss > 0.99;

    indicator.style.opacity = (ui * (1 - dismiss)).toFixed(3);
    indicatorFill.style.transform = `scaleX(${tint.toFixed(4)})`;

    if (showDebug) {
      const phase = origin === null ? (enterStart === null ? 'loading assets' : 'entrance (auto)')
        : q <= 0 ? 'parked · clear' : q < TINT_END ? 'tint (scroll)' : q < EXIT_START ? 'tinted hold'
        : q < EXIT_END ? 'exit (scroll)' : 'gone';
      debug.textContent = `${phase} · t ${Math.round(enterMs)}ms · q ${q.toFixed(3)} · tint ${Math.round(tint * 100)}% · origin ${origin === null ? '–' : Math.round(origin)}px · x ${Math.round(inX + outX)}px`;
    }
  }

  // At most one render per animation frame, always from the current scroll position
  function requestRender() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; render(); });
  }

  function settle() {
    enterMs = ENTER_TOTAL;
    // Clean starting point for the tint: wherever the reader is now (scrolling during the entrance is
    // allowed and never tints). If the hero is already off-screen (e.g. refreshed further down the
    // page), use the normal full range so scrolling back up reverses the exit naturally.
    const s = scrolled();
    origin = s > m.exitRange * (1 - MIN_RANGE) ? 0 : s;
  }

  function tick(now) {
    if (origin !== null) return;                        // a services link may have skipped the entrance
    enterMs = Math.min(ENTER_TOTAL, now - enterStart);
    if (enterMs >= ENTER_TOTAL) settle();
    render();
    if (origin === null) requestAnimationFrame(tick);
  }

  function start() {
    if (enterStart !== null) return;
    enterStart = performance.now();
    relayout();
    if (location.hash === '#sherbime') services.scrollIntoView();
    const s = scrolled();
    if (reducedQuery.matches || s >= m.exitRange) {
      settle();                                        // nothing to watch: show the settled state
      render();
    } else {
      render();                                        // first frame: car off-left, headline above
      requestAnimationFrame(tick);
    }
    root.classList.add('hx-live');
  }

  // Load and decode every vehicle layer (and the headline font) before anything moves
  const decode = src => { const img = new Image(); img.src = src; return img.decode().catch(() => {}); };
  const timeout = ms => new Promise(r => setTimeout(r, ms));
  Promise.race([
    Promise.all([...ASSETS.map(decode), document.fonts ? document.fonts.ready : null]),
    timeout(4000),                                     // never leave the hero blank on a stalled request
  ]).then(() => requestAnimationFrame(start));

  function relayout() {
    lastWidth = innerWidth;
    root.style.setProperty('--hx-viewport-width', `${sticky.clientWidth}px`);
    fitHeadline();
    measure();
    if (enterStart !== null) render();
  }

  addEventListener('scroll', requestRender, { passive: true });
  addEventListener('resize', () => {
    // Height-only resizes on touch devices are the URL bar; layout is svh-based, so ignore them
    if (innerWidth !== lastWidth || !matchMedia('(pointer: coarse)').matches) relayout();
    else requestRender();
  });
  mobileQuery.addEventListener('change', relayout);
  reducedQuery.addEventListener('change', () => { if (reducedQuery.matches && origin === null && enterStart !== null) settle(); relayout(); });
  relayout();

  // Mobile navigation is progressively managed by mobile-nav.js.
})();
