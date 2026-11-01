/* Photographic shade preview: additional attenuation keeps low-VLT interiors subdued. */
(() => {
 const section = document.getElementById('tint-selector');
 if (!section) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const radios = [...section.querySelectorAll('input[type="radio"]')];
 const status = section.querySelector('[role="status"]');
 const channels = [...section.querySelectorAll('#tintFilterLive feFuncR, #tintFilterLive feFuncG, #tintFilterLive feFuncB')];
 let observer, textAnimation, disposed = false, frame = 0;
 let current = +(radios.find(r=>r.checked)?.value || 35) / 100;
 const linearInputs=Array.from({length:256},(_,i)=>{const c=i/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
 function setTransmission(value){current=value;const table=linearInputs.map(c=>{const x=c*Math.pow(value,1.5)*.55;return (x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055).toFixed(7);}).join(' ');channels.forEach(n=>n.setAttribute('tableValues',table));}
 function transitionTo(target) {
  cancelAnimationFrame(frame); frame = 0;
  if (reduced.matches) { setTransmission(target); return; }
  const from = current, start = performance.now();
  const step = now => {
   const p = Math.min(1,(now-start)/500), eased = p*p*(3-2*p);
   setTransmission(from+(target-from)*eased);
   if (p<1 && !disposed) frame=requestAnimationFrame(step); else frame=0;
  };
  frame=requestAnimationFrame(step);
 }
 function reveal(instant = false) {
  if (instant) section.classList.add('is-instant');
  section.classList.add('is-visible'); observer?.disconnect();
 }
 function change(event) {
  if (!radios.includes(event.target) || !event.target.checked) return;
  reveal();
  const value=event.target.value;
  section.dataset.selectedVlt=value;
  status.textContent=`${value}% VLT. Lejon kalimin e ${value}% të dritës. Sa më e ulët përqindja, aq më të errët duken xhamat.`;
  transitionTo(+value/100);
  textAnimation?.cancel();
  if (!reduced.matches) {
   const inner=section.querySelector(`[data-tint-level="${value}"] .hx-tint__reading-inner`);
   if(inner.animate)textAnimation=inner.animate([{transform:'translateY(10px)'},{transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
  }
 }
 function instantReveal(){if(!section.classList.contains('is-visible'))reveal(true);}
 function motionChange(){if(reduced.matches){cancelAnimationFrame(frame);frame=0;setTransmission(+(radios.find(r=>r.checked)?.value||35)/100);textAnimation?.cancel();reveal(true);}}
 function cleanup(event){if(event.persisted)return;disposed=true;observer?.disconnect();cancelAnimationFrame(frame);textAnimation?.cancel();section.removeEventListener('change',change);section.removeEventListener('focusin',instantReveal);section.removeEventListener('pointerdown',instantReveal);reduced.removeEventListener('change',motionChange);window.removeEventListener('pagehide',cleanup);}
 setTransmission(current);section.dataset.tintCalibrated='';section.dataset.selectedVlt=String(current*100);
 section.addEventListener('change',change);section.addEventListener('focusin',instantReveal);section.addEventListener('pointerdown',instantReveal);reduced.addEventListener('change',motionChange);window.addEventListener('pagehide',cleanup);
 const image=new Image();image.src=new URL('assets/car-silver-occupants-optimized.webp',document.currentScript.src).href;
 Promise.all([image.decode().catch(()=>{}),document.fonts.ready]).then(()=>{if(disposed)return;if(reduced.matches||!('IntersectionObserver'in window)||section.classList.contains('is-visible')){reveal(true);return;}section.dataset.tintEntrance='';observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))reveal();},{threshold:0,rootMargin:'0px 0px -8% 0px'});observer.observe(section.querySelector('.hx-tint__header'));});
})();
