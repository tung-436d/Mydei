import{initImageFallbacks}from'./controllers/image-fallback';import{initNavigation}from'./controllers/navigation';import{initProfileStories}from'./controllers/profile-stories';
document.documentElement.classList.add('js');
const legacyHashes:Record<string,string>={'#overview':'/profile/','#skills':'/skills/','#eidolons':'/eidolons/','#story':'/profile/#stories','#gallery':'/404.html','#builds':'/404.html','#teams':'/404.html','#rotation':'/404.html'};
const legacyTarget=legacyHashes[window.location.hash];if(legacyTarget)window.location.replace(legacyTarget);
const cleanups=[initNavigation(),initImageFallbacks(),initProfileStories()];
window.addEventListener('pagehide',()=>cleanups.forEach(cleanup=>cleanup()),{once:true});
