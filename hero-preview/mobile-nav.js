/* Full mobile navigation: native anchors, contained scrolling and keyboard access. */
(() => {
 'use strict';
 const nav = document.getElementById('hxNav');
 const button = document.getElementById('hxMenuBtn');
 const menu = document.getElementById('hxMenu');
 if (!nav || !button || !menu) return;
 const mobile = matchMedia('(max-width: 767px)');
 const label = button.querySelector('.hx-menu-btn__label');
 const background = [...document.querySelectorAll('body > main, body > footer')];
 let previousOverflow = '', previousInert = [], opened = false;

 function setOpen(open, restoreFocus = false) {
  if (open && !mobile.matches) return;
  if (open === opened) return;
  opened = open;
  if (open) {
   previousOverflow = document.body.style.overflow;
   previousInert = background.map(node => node.inert);
   background.forEach(node => { node.inert = true; });
   document.body.style.overflow = 'hidden';
   const current = location.hash || '#hxPin';
   for (const link of menu.querySelectorAll('a[href^="#"]')) {
    if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
   }
  } else {
   document.body.style.overflow = previousOverflow;
   background.forEach((node, i) => { node.inert = previousInert[i]; });
  }
  menu.hidden = !open;
  menu.classList.toggle('is-entering', open);
  nav.toggleAttribute('data-menu-open', open);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Mbyll menunë' : 'Hap menunë');
  label.textContent = open ? 'Mbyll' : 'Menu';
  if (open) menu.scrollTop = 0;
  if (!open && restoreFocus) button.focus({preventScroll: true});
 }

 button.addEventListener('click', () => setOpen(!opened));
 menu.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  setOpen(false);
  const hash = link.getAttribute('href');
  if (hash.startsWith('#')) {
   const target = document.getElementById(hash.slice(1));
   const heading = target?.querySelector('h1, h2');
   if (heading) {
    heading.tabIndex = -1;
    requestAnimationFrame(() => { if (!opened && heading.isConnected) heading.focus({preventScroll: true}); });
   }
  }
 });
 nav.querySelector('.hx-nav__logo').addEventListener('click', () => setOpen(false));
 document.addEventListener('keydown', event => {
  if (!opened) return;
  if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); return; }
  if (event.key !== 'Tab') return;
  const controls = [nav.querySelector('.hx-nav__logo'), button, ...menu.querySelectorAll('a[href]')];
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
 });
 mobile.addEventListener('change', () => { if (!mobile.matches) setOpen(false); });
 addEventListener('pagehide', () => setOpen(false));
})();
