/* Verified WhatsApp handoff: this page prepares a message; sending happens there. */
(() => {
 'use strict';
 const section=document.getElementById('kontakt');
 if(!section)return;
 const form=section.querySelector('form'), summary=section.querySelector('[data-contact-summary]'), handoff=section.querySelector('[data-contact-handoff]');
 const submit=form.querySelector('button[type=submit]'), fields=[...form.querySelectorAll('input,select,textarea')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'), map=section.querySelector('.hx-contact__map'), toggle=section.querySelector('[data-map-toggle]'), iframe=map.querySelector('iframe');
 let observer=null,disposed=false;
 function reveal(instant=false){if(instant)section.classList.add('is-instant');section.classList.add('is-visible');observer?.disconnect();}
 function revealOnFocus(){reveal(true);}
 function errorFor(field){
  const value=field.value.trim();
  if(field.required&&!value)return {contactName:'Shkruani emrin tuaj.',contactPhone:'Shkruani numrin tuaj të telefonit.',contactService:'Zgjidhni një shërbim ose produkt.',contactMessage:'Shkruani mesazhin tuaj.'}[field.id];
  if(field.id==='contactPhone'&&(!/^[+\d\s().-]+$/.test(value)||value.replace(/\D/g,'').length<7||value.replace(/\D/g,'').length>15))return 'Shkruani një numër telefoni të vlefshëm (7–15 shifra).';
  if(field.maxLength>0&&value.length>field.maxLength)return `Përdorni deri në ${field.maxLength} karaktere.`;
  return '';
 }
 function validate(field){const error=errorFor(field),node=document.getElementById(`${field.id}Error`);node.textContent=error;node.hidden=!error;field.setAttribute('aria-invalid',String(!!error));return !error;}
 function onEdit(event){if(!fields.includes(event.target))return;handoff.hidden=true;if(event.target.getAttribute('aria-invalid')==='true')validate(event.target);if(fields.every(f=>!errorFor(f)))summary.hidden=true;}
 function onSubmit(event){
  event.preventDefault();reveal(true);
  const valid=fields.map(validate),first=fields[valid.indexOf(false)];
  handoff.hidden=true;
  if(first){summary.textContent='Kontrolloni fushat e shënuara më poshtë.';summary.hidden=false;first.focus();return;}
  summary.hidden=true;
  const data=new FormData(form),text=`Përshëndetje Auto Xheviti!\n\nEmri: ${data.get('name').trim()}\nTelefoni: ${data.get('phone').trim()}\nModeli i makinës: ${data.get('car').trim()||'Nuk është specifikuar'}\nShërbimi ose produkti: ${data.get('service')}\n\nMesazhi:\n${data.get('message').trim()}`;
  const url=`https://wa.me/355692745532?text=${encodeURIComponent(text)}`;
  handoff.querySelector('a').href=url;
  handoff.hidden=false;
  // No submission request, loading spinner, automatic reset or "sent" confirmation.
  window.open(url,'_blank','noopener,noreferrer');
 }
 function setMap(active){map.classList.toggle('is-active',active);toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'Çaktivizoni hartën':'Aktivizoni hartën';iframe.tabIndex=active?0:-1;}
 function mapClick(){setMap(!map.classList.contains('is-active'));}
 function outside(event){if(!map.contains(event.target))setMap(false);}
 function escape(event){if(event.key==='Escape'&&map.classList.contains('is-active')){setMap(false);toggle.focus();}}
 function backTop(event){const top=document.getElementById('hxPin');if(!top)return;event.preventDefault();setMap(false);top.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});history.replaceState(null,'','#hxPin');const logo=document.querySelector('.hx-nav__logo');logo?.focus({preventScroll:true});}
 function motionChange(){if(reduced.matches)reveal(true);}
 form.noValidate=true;
 submit.disabled=false;
 form.addEventListener('submit',onSubmit);form.addEventListener('input',onEdit);form.addEventListener('change',onEdit);
 section.addEventListener('focusin',revealOnFocus);
 toggle.hidden=false;toggle.addEventListener('click',mapClick);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
 const back=document.querySelector('[data-back-top]');back?.addEventListener('click',backTop);
 const year=document.querySelector('[data-copyright-year]');if(year)year.textContent=new Date().getFullYear();
 // An iframe can load a provider error document. Keep a normal directions link visible regardless.
 iframe.addEventListener('error',()=>{section.querySelector('[data-map-fallback]').hidden=false;});
 if('IntersectionObserver' in window&&!reduced.matches){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))reveal();},{threshold:0,rootMargin:'0px 0px -72px 0px'});section.setAttribute('data-contact-entrance','');observer.observe(section);}else reveal(true);
 reduced.addEventListener('change',motionChange);
 addEventListener('pagehide',event=>{if(event.persisted||disposed)return;disposed=true;observer?.disconnect();form.removeEventListener('submit',onSubmit);form.removeEventListener('input',onEdit);form.removeEventListener('change',onEdit);section.removeEventListener('focusin',revealOnFocus);toggle.removeEventListener('click',mapClick);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);back?.removeEventListener('click',backTop);reduced.removeEventListener('change',motionChange);},{once:true});
})();
