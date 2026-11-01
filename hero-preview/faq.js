/* Progressively enhanced semantic accordion. Answers stay readable if this script fails. */
(() => {
 const section = document.getElementById('faq');
 if (!section) return;
 const items = [...section.querySelectorAll('.hx-faq__item')];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const animations = new Map();
 let observer, resizeObserver, disposed = false;
 function update(item, open, immediate = false) {
  const button = item.querySelector('button'), panel = item.querySelector('.hx-faq__panel');
  const current = panel.hidden ? 0 : panel.getBoundingClientRect().height;
  const previous = animations.get(item);
  panel.style.height = `${current}px`;
  if (previous) { animations.delete(item); previous.cancel(); }
  panel.hidden = false;
  button.setAttribute('aria-expanded', String(open));
  item.classList.toggle('is-open', open);
  panel.inert = !open;
  panel.setAttribute('aria-hidden', String(!open));
  const target = open ? panel.firstElementChild.getBoundingClientRect().height : 0;
  const finish = () => { panel.hidden = !open; panel.style.height = open ? 'auto' : '0px'; };
  if (immediate || reduced.matches || !panel.animate || Math.abs(current - target) < .5) { finish(); return; }
  const animation = panel.animate([{height: `${current}px`}, {height: `${target}px`}], {duration: 330, easing: 'cubic-bezier(.4,0,.2,1)'});
  panel.style.height = `${target}px`;
  animations.set(item, animation);
  animation.finished.then(() => {
   if (animations.get(item) !== animation || disposed) return;
   animations.delete(item); finish();
  }).catch(() => { /* Reversing a live animation intentionally cancels its previous promise. */ });
 }
 function reveal(instant = false) {
  if (instant) section.classList.add('is-instant');
  section.classList.add('is-visible'); observer?.disconnect();
 }
 function click(event) {
  const button = event.target.closest('.hx-faq__button');
  if (!button || !section.contains(button)) return;
  reveal(true);
  const item = button.closest('.hx-faq__item'), open = button.getAttribute('aria-expanded') !== 'true';
  for (const other of items) if (other !== item && other.querySelector('button').getAttribute('aria-expanded') === 'true') update(other, false);
  update(item, open);
 }
 function focus() { reveal(true); }
 function motionChange() {
  if (!reduced.matches) return;
  reveal(true);
  for (const item of items) update(item, item.querySelector('button').getAttribute('aria-expanded') === 'true', true);
 }
 function dispose(event) {
  if (event.persisted) return;
  disposed = true; observer?.disconnect(); resizeObserver?.disconnect();
  for (const animation of animations.values()) animation.cancel();
  animations.clear(); section.removeEventListener('click', click); section.removeEventListener('focusin', focus);
  reduced.removeEventListener('change', motionChange); window.removeEventListener('pagehide', dispose);
 }
 section.addEventListener('click', click); section.addEventListener('focusin', focus);
 section.dataset.faqReady = '';
 items.forEach((item, i) => update(item, i === 0, true));
 if (!reduced.matches && 'IntersectionObserver' in window) {
  section.dataset.faqEntrance = '';
  observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) reveal(); }, {rootMargin: '0px 0px -8% 0px', threshold: 0});
  observer.observe(section.querySelector('.hx-faq__header'));
 } else reveal(true);
 if ('ResizeObserver' in window) {
  resizeObserver = new ResizeObserver(entries => {
   for (const entry of entries) {
    const item = entry.target.closest('.hx-faq__item');
    if (animations.has(item) && item.querySelector('button').getAttribute('aria-expanded') === 'true') update(item, true);
   }
  });
  items.forEach(item => resizeObserver.observe(item.querySelector('.hx-faq__panel-inner')));
 }
 reduced.addEventListener('change', motionChange); window.addEventListener('pagehide', dispose);
})();
