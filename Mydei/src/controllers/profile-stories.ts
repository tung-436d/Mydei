export function initProfileStories():()=>void{
 const openFromHash=(focusSummary=false)=>{
  const target=document.getElementById(window.location.hash.slice(1));
  if(!(target instanceof HTMLDetailsElement)||!target.classList.contains('character-story'))return;
  target.open=true;
  const summary=target.querySelector<HTMLElement>('summary');
  requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});if(focusSummary)summary?.focus({preventScroll:true})});
 };
 const onHashChange=()=>openFromHash(true);
 window.addEventListener('hashchange',onHashChange);
 openFromHash();
 return()=>window.removeEventListener('hashchange',onHashChange);
}
