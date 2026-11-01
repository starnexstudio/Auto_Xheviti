/* Auto Xheviti hero.
   Desktop retains its timed entrance; mobile starts in its settled composition.
   One animation-frame driver applies a fixed, reversible scroll timeline.
   Geometry is measured outside scroll frames and frozen across mobile toolbar resizes.
   Repeated unchanged SVG/style writes are skipped. No libraries or globals. */
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
  root.classList.add('hx-car-loading');

  // Automatic entrance timing (ms)
  const ENTER_CAR = 1800;                // car drives in and stops; wheels stop with it
  const ENTER_HEAD = 1100;               // headline descends
  const COPY_FROM = 0, COPY_TO = ENTER_HEAD; // title and supporting copy fade in together
  const UI_FROM = 1500, UI_TO = 1900;    // tint indicator appears
  const ENTER_TOTAL = UI_TO;

  // Scroll phases, as fractions of the range from the tint origin to the end of the pin
  const TINT_END = 0.42;                 // 0 → TINT_END: windows darken (car stationary)
  const EXIT_START = 0.48, EXIT_END = 0.76;   // complete the drive-out before the section transition

  const TYRE_R = 79.001;                 // rendered tyre radius in SVG units (viewBox width 1100)
  const RAD2DEG = 180 / Math.PI;
  const assetBase = new URL('assets/', document.currentScript.src);
  const ASSETS = ['car-silver-occupants-optimized', 'wheel-rear', 'caliper-rear', 'spokes-rear',
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
  let origin = null;
  let entranceActive = false;
  let viewportMax = innerHeight;
  let previousStyles = new WeakMap();

  // Avoid invalidating SVG paint, text and compositing layers when a value has not changed.
  function write(node, key, value) {
    let previous = previousStyles.get(node);
    if (!previous) { previous = {}; previousStyles.set(node, previous); }
    if (previous[key] === value) return;
    previous[key] = value;
    if (key.startsWith('--')) node.style.setProperty(key, value);
    else node.style[key] = value;
  }

  // The desktop headline shares the page's content edges; mobile retains its stacked composition.
  function fitHeadline() {
    const mobile = mobileQuery.matches;
    // Mobile sizing is CSS-driven. Never remove/reapply pixel sizes during toolbar resizes.
    if (mobile) { headline.style.removeProperty('--hx-head-size'); return; }
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
    root.classList.toggle('hx-transition-live', !reducedQuery.matches);
    const vh = sticky.offsetHeight;
    const vw = sticky.clientWidth;
    const stageLeft = (vw - stage.offsetWidth) / 2;                    // stage is centred
    const carLeft = stageLeft + vehicle.offsetLeft;                      // settled left edge in the viewport
    const carW = vehicle.offsetWidth;
    m = {
      start: pin.getBoundingClientRect().top + scrollY,
      vh,
      carFromLeft: -(carLeft + carW) - 24,             // entrance starts fully outside the left edge
      carToRight: vw - carLeft + 24,                   // exit ends fully outside the right edge
      headIn: -(headline.offsetTop + headline.offsetHeight) - 32,   // headline starts above the viewport
      pxPerUnit: carW / 1100,                          // CSS px per SVG unit, for wheel rotation
      scrollable: Math.max(1, pin.offsetHeight - vh),
      // A compact stage may be shorter than the largest mobile viewport. Finish the
      // departure before Services reaches the bottom edge of that window.
      exitRange: Math.max(1, pin.offsetHeight - Math.max(vh, viewportMax)),
    };
  }

  // Rolling without slip: angle (rad) = horizontal travel / tyre radius, both in SVG units.
  // Moving right → angle increases → clockwise on screen.
  const wheelAngle = xPx => (xPx / m.pxPerUnit / TYRE_R) * RAD2DEG;
  function setSpin(groups, xPx) {
    const t = `rotate(${wheelAngle(xPx).toFixed(3)})`;
    for (const g of groups) if (g.getAttribute('transform') !== t) g.setAttribute('transform', t);
  }

  const scrolled = () => Math.max(0, scrollY - (m ? m.start : 0));

  // The complete tint and departure sequence finishes inside the pinned hero.
  function scrollProgress(s) {
    if (origin === null) return 0;
    return EXIT_END * clamp(s / m.exitRange);
  }

  function render() {
    const s = scrolled(); // All geometry is cached; scroll frames only read the scroll position.
    if (reducedQuery.matches) {
      write(stage, '--hx-handoff-y', '0px');
      for (const node of [drive, vehicle, headline, copy]) write(node, 'transform', 'none');
      setSpin(spinIn, 0); setSpin(spinOut, 0);
      write(car, '--hx-tint', '1');
      write(copy, 'opacity', '1');
      write(indicator, 'opacity', '0');
      copy.inert = false;
      services.inert = false;
      pin.style.pointerEvents = '';
      write(headline, 'opacity', '1');
      if (showDebug) debug.textContent = 'reduced motion · static tinted state';
      return;
    }

    // 1 · Entrance (time) — owns #hxDrive, .hx-spin-in, the headline and the copy fade
    const carT = easeOut(seg(enterMs, 0, ENTER_CAR));
    const inX = m.carFromLeft * (1 - carT);
    write(drive, 'transform', `translate3d(${inX.toFixed(2)}px, 0, 0)`);
    setSpin(spinIn, inX);
    const c = smooth(seg(enterMs, COPY_FROM, COPY_TO));
    write(copy, 'transform', `translate3d(0, ${((1 - c) * 12).toFixed(2)}px, 0)`);
    const ui = smooth(seg(enterMs, UI_FROM, UI_TO));

    // 2 · Scroll — owns #hxVehicle, .hx-spin-out and the tint
    const q = scrollProgress(s);
    // Keep the composition level until the car is gone; normal scrolling follows the pin.
    write(stage, '--hx-handoff-y', '0px');
    const tint = smooth(seg(q, 0, TINT_END));
    const outX = m.carToRight * easeIn(seg(q, EXIT_START, EXIT_END));
    write(vehicle, 'transform', `translate3d(${outX.toFixed(2)}px, 0, 0)`);
    setSpin(spinOut, outX);
    write(car, '--hx-tint', tint.toFixed(4));

    // Release directly into normal document flow once the vehicle clears the screen.
    // The next section remains opaque; outgoing hero copy bridges the two sections.
    const afterExit = Math.max(0, s - m.scrollable);
    const dismiss = smooth(seg(afterExit, m.vh * .45, m.vh * .75));
    write(headline, 'opacity', (c * (1 - dismiss)).toFixed(4));
    const headEntrance = m.headIn * (1 - easeOut(seg(enterMs, 0, ENTER_HEAD)));
    write(headline, 'transform', `translate3d(0, ${headEntrance.toFixed(2)}px, 0)`);
    write(copy, 'opacity', (c * (1 - dismiss)).toFixed(4));
    copy.inert = dismiss > 0.99;

    write(indicator, 'opacity', (ui * (1 - dismiss)).toFixed(3));
    write(indicatorFill, 'transform', `scaleX(${tint.toFixed(4)})`);

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
    frame = requestAnimationFrame(now => {
      frame = 0;
      if (entranceActive) {
        enterMs = Math.min(ENTER_TOTAL, now - enterStart);
        if (enterMs >= ENTER_TOTAL) settle();
      }
      render();
      if (entranceActive) requestRender();
    });
  }

  function settle() {
    enterMs = ENTER_TOTAL;
    entranceActive = false;
    origin = 0; // One deterministic timeline, including the very first swipe and reverse scroll.
  }

  function start() {
    if (enterStart !== null) return;
    enterStart = performance.now();
    relayout();
    if (location.hash === '#sherbime') services.scrollIntoView();
    const s = scrolled();
    if (mobileQuery.matches || reducedQuery.matches || s > 1) {
      settle();                                        // nothing to watch: show the settled state
      render();
    } else {
      render();                                        // first frame: car off-left, headline above
      entranceActive = true;
      requestRender();
    }
    root.classList.add('hx-live');
  }

  // Load and decode every vehicle layer (and the headline font) before anything moves
  const decode = src => { const img = new Image(); img.src = src; return img.decode().then(() => true, () => false); };
  const timeout = ms => new Promise(r => setTimeout(r, ms));
  const primaryReady = decode(ASSETS[0]).then(ready => {
    if (ready) { root.classList.add('hx-car-ready'); root.classList.remove('hx-car-loading'); }
    return ready;
  });
  // Mobile is visible immediately and has no timed drive-in competing with the first gesture.
  // Desktop retains the entrance; local preloaded fonts avoid cross-origin loading chains.
  if (mobileQuery.matches || reducedQuery.matches) start();
  else Promise.race([
    Promise.all([primaryReady, ...ASSETS.slice(1).map(decode), document.fonts ? document.fonts.load('800 100px "Big Shoulders Display"').catch(() => []) : null]),
    timeout(1500),
  ]).then(() => requestAnimationFrame(start));

  function relayout() {
    const widthChanged = innerWidth !== lastWidth;
    lastWidth = innerWidth;
    previousStyles = new WeakMap();
    root.style.setProperty('--hx-viewport-width', `${sticky.clientWidth}px`);
    if (mobileQuery.matches && (widthChanged || !root.style.getPropertyValue('--hx-mobile-height'))) {
      const meter = document.createElement('div');
      meter.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:100svh';
      document.body.append(meter);
      const stableHeight = meter.offsetHeight || innerHeight;
      meter.style.height = CSS.supports('height', '100lvh') ? '100lvh' : '100vh';
      viewportMax = Math.max(stableHeight, meter.offsetHeight || innerHeight);
      meter.remove();
      root.style.setProperty('--hx-mobile-height', `${stableHeight}px`);
    } else if (!mobileQuery.matches) viewportMax = innerHeight;
    fitHeadline();
    measure();
    if (enterStart !== null) render();
  }

  addEventListener('scroll', () => {
    if (entranceActive && scrolled() > 1) settle();
    requestRender();
  }, { passive: true });
  addEventListener('resize', () => {
    // Height-only resizes on touch devices are the URL bar; layout is svh-based, so ignore them
    if (innerWidth !== lastWidth || !mobileQuery.matches) relayout();
    else requestRender();
  });
  mobileQuery.addEventListener('change', () => {
    if (mobileQuery.matches && enterStart === null) start();
    else { if (mobileQuery.matches && entranceActive) settle(); relayout(); }
  });
  reducedQuery.addEventListener('change', () => { if (reducedQuery.matches && origin === null && enterStart !== null) settle(); relayout(); });
  if (enterStart === null) relayout();

  // Mobile navigation is progressively managed by mobile-nav.js.
})();
