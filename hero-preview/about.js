/* One reversible, position-mapped timeline; no autoplay, smoothing loop or observer. */
(() => {
 const section = document.getElementById('rreth');
 if (!section) return;
 const track = section.querySelector('.hx-about__track');
 const scene = section.querySelector('.hx-about__scene');
 const visual = section.querySelector('.hx-about__visual');
 const composition = section.querySelector('.hx-about__composition');
 const story = section.querySelector('.hx-about__story');
 const visit = section.querySelector('.hx-about__visit');
 const link = section.querySelector('.hx-about__visit-link');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const clamp = x => Math.max(0, Math.min(1, x));
 const phase = (p, a, b) => clamp((p - a) / (b - a));
 const ease = x => 1 - (1 - x) ** 3;
 const move = (n, x, y = 0) => { n.style.transform = `translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`; };
 const mask = (n, x) => { n.style.clipPath = `inset(${(100 * (1 - x)).toFixed(3)}% 0 0 0)`; };
 const paragraphs = [...story.querySelectorAll('p')].map(node => ({node, text: node.textContent}));
 let lines = [], measureData, frame = 0, lastWidth = 0, lastHeight = 0, disposed = false;
 const restoreKey = 'ax-about-scroll:' + location.pathname;
 let restoredScroll = null;
 try {
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload') restoredScroll = JSON.parse(sessionStorage.getItem(restoreKey) || 'null');
  sessionStorage.removeItem(restoreKey);
 } catch (_) { /* Storage is optional; normal browser restoration still works. */ }
 const previousRestoration = restoredScroll !== null ? history.scrollRestoration : null;
 if (previousRestoration !== null) history.scrollRestoration = 'manual';
 function splitLines() {
  lines = [];
  for (const {node, text} of paragraphs) {
   node.replaceChildren(document.createTextNode(text)); node.removeAttribute('aria-label');
   const textNode = node.firstChild, range = document.createRange(), groups = [];
   for (const match of text.matchAll(/\S+/g)) {
    range.setStart(textNode, match.index); range.setEnd(textNode, match.index + match[0].length);
    const y = Math.round(range.getBoundingClientRect().top), previous = groups.at(-1);
    if (previous && Math.abs(previous.y - y) <= 2) previous.words.push(match[0]);
    else groups.push({y, words: [match[0]]});
   }
   // The wrapped spans retain the single accessible paragraph text.
   const fragment = document.createDocumentFragment();
   for (const group of groups) {
    const clip = document.createElement('span'), line = document.createElement('span');
    clip.className = 'hx-about__line-mask';
    line.className = 'hx-about__line'; line.textContent = group.words.join(' ') + ' ';
    clip.append(line); fragment.append(clip);
    lines.push({clip, line, column: node.closest('.hx-about__column').dataset.column});
   }
   node.replaceChildren(fragment);
  }
 }
 function render() {
  frame = 0;
  if (!measureData || reduced.matches) return;
  const m = measureData, distance = scrollY - m.start;
  const p = m.full ? clamp(distance / m.travel) : distance <= m.travel
   ? .48 * clamp(distance / m.travel) : .48 + .52 * clamp((distance - m.travel) / m.storyTravel);
  section.dataset.aboutProgress = p.toFixed(5);
  const a = ease(phase(p, 0, .08)), b = ease(phase(p, 0, .28));
  const d = ease(phase(p, .48, .75)), e = ease(phase(p, .75, .85));
  section.querySelectorAll('.hx-about__headline-line').forEach((n, i) => move(n, (i ? 1 : -1) * m.headTravel * (1 - a)));
  const photo = section.querySelector('.hx-about__photo-clip');
  photo.style.clipPath = `inset(0 0 ${(35 * (1 - b)).toFixed(3)}% 0)`;
  photo.style.visibility = 'visible';
  section.querySelector('.hx-about__photo-zoom').style.transform = `scale(${(1.15 - .15 * b).toFixed(5)})`;
  move(composition, 0, m.lift * (1 - d));
  section.querySelectorAll('.hx-about__metric').forEach((n, i) => {
   const c = ease(phase(p, .22, .4)); move(n, (i ? 1 : -1) * m.metricTravel * (1 - c));
   n.style.visibility = p <= .22 ? 'hidden' : 'visible';
   move(n.querySelector('.hx-about__metric-plus'), 0, 50 * (1 - ease(phase(p, .28, .43))));
   mask(n.querySelector('.hx-about__metric-label-mask'), ease(phase(p, .33, .48)));
  });
  const count = Math.max(1, lines.length);
  lines.forEach(({clip, line, column}, i) => {
   const t = ease(phase(p, .48 + i / count * .05, .7 + i / count * .05));
   mask(clip, t); move(line, (column === 'first' ? -1 : 1) * m.storyX * (1 - t), 24 * (1 - t));
  });
  section.querySelector('.hx-about__rule').style.transform = `scaleX(${e.toFixed(5)})`;
  move(section.querySelector('.hx-about__location'), 0, 30 * (1 - e));
  mask(section.querySelector('.hx-about__location-mask'), e);
  mask(link, e); move(section.querySelector('.hx-about__arrow'), -12 * (1 - e), 12 * (1 - e));
  link.inert = p < .85;
  const cue = section.querySelector('.hx-about__cue');
  cue.style.opacity = (1 - phase(p, .48, .62)).toFixed(4);
  section.querySelector('.hx-about__cue-fill').style.transform = 'scaleX(' + clamp(p / .48).toFixed(5) + ')';
 }
 const requestRender = () => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
 function measure() {
  if (disposed) return;
  const previous = measureData;
  const scrollBeforeMeasure = scrollY;
  if (previous) track.style.height = `${track.offsetHeight}px`;
  const oldP = previous && clamp((scrollY - previous.start) / previous.travel);
  const wasWithin = previous && scrollY >= previous.start && scrollY <= previous.start + previous.travel;
  section.removeAttribute('data-about-motion'); section.classList.remove('is-full-pin', 'is-compact-pin');
  visual.style.removeProperty('position');
  if (reduced.matches) {
   section.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
   for (const {node, text} of paragraphs) { node.textContent = text; node.removeAttribute('aria-label'); }
   track.style.removeProperty('height'); link.inert = false; measureData = null; delete section.dataset.aboutProgress; return;
  }
  splitLines();
  const top = parseFloat(getComputedStyle(section).getPropertyValue('--hx-nav-h')) + (innerWidth < 768 ? 12 : 16);
  const usable = innerHeight - top - 12;
  const full = innerWidth >= 1100 && scene.offsetHeight <= usable;
  const visualH = visual.offsetHeight, canPinVisual = visualH <= usable;
  const travel = full ? innerHeight * 1.25 : canPinVisual ? Math.min(360, innerHeight * .5) : 0;
  const base = track.getBoundingClientRect().top + scrollY, sceneH = scene.offsetHeight;
  measureData = {start: base - top, travel: Math.max(1, travel), full,
   storyTravel: Math.max(100, Math.min((story.offsetHeight + visit.offsetHeight) * .65, visualH + story.offsetHeight + visit.offsetHeight + 120 - usable)),
   headTravel: innerWidth < 768 ? 14 : 32, metricTravel: track.clientWidth * .67,
   lift: innerWidth < 768 ? 12 : 24, storyX: innerWidth < 768 ? 30 : 72};
  section.dataset.aboutMotion = ''; section.classList.add(full ? 'is-full-pin' : 'is-compact-pin');
  section.style.setProperty('--about-track-h', full ? `${sceneH + travel}px` : 'auto');
  section.style.setProperty('--about-visual-track-h', `${visualH + travel}px`);
  if (!canPinVisual && !full) visual.style.position = 'static';
  if (wasWithin && previous.full === full && lastWidth !== innerWidth) scrollTo(0, measureData.start + oldP * measureData.travel);
  track.style.removeProperty('height');
  const availableAfterPin = Math.max(1, document.documentElement.scrollHeight - innerHeight - measureData.start - measureData.travel);
  measureData.storyTravel = Math.min(measureData.storyTravel, availableAfterPin);
  if (previous && !(wasWithin && previous.full === full && lastWidth !== innerWidth)) scrollTo(0, scrollBeforeMeasure);
  lastWidth = innerWidth; lastHeight = innerHeight;
  if (restoredScroll !== null) { scrollTo(0, restoredScroll); restoredScroll = null; }
  render();
 }
 function resize() { if (innerWidth !== lastWidth || Math.abs(innerHeight - lastHeight) > 80) measure(); else requestRender(); }
 function dispose() {
  disposed = true; cancelAnimationFrame(frame);
  window.removeEventListener('scroll', requestRender); window.removeEventListener('resize', resize);
  window.removeEventListener('pageshow', onPageShow); window.removeEventListener('pagehide', onPageHide); reduced.removeEventListener('change', measure);
 }
 window.addEventListener('scroll', requestRender, {passive: true});
 window.addEventListener('resize', resize, {passive: true});
 function onPageShow() {
  measure();
  if (previousRestoration !== null) requestAnimationFrame(() => { history.scrollRestoration = previousRestoration; });
 }
 window.addEventListener('pageshow', onPageShow);
 reduced.addEventListener('change', measure);
 function onPageHide(event) {
  try {
   const rect = section.getBoundingClientRect();
   if (rect.top < innerHeight && rect.bottom > 0) sessionStorage.setItem(restoreKey, JSON.stringify(scrollY));
  } catch (_) { /* A disabled storage policy must not affect the timeline. */ }
  if (!event.persisted) dispose();
 }
 window.addEventListener('pagehide', onPageHide);
 Promise.all([document.fonts.ready, section.querySelector('img').decode().catch(() => {})]).then(measure);
})();
