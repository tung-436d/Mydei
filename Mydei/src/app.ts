import{initImageFallbacks}from'./controllers/image-fallback';import{initNavigation}from'./controllers/navigation';
document.documentElement.classList.add('js');
const legacyHashes:Record<string,string>={'#overview':'./profile/','#skills':'./skills/','#eidolons':'./eidolons/','#story':'./profile/#story','#gallery':'./gallery/','#builds':'./404.html','#teams':'./404.html','#rotation':'./404.html'};
const legacyTarget=legacyHashes[window.location.hash];if(legacyTarget)window.location.replace(legacyTarget);
const cleanups=[initNavigation(),initImageFallbacks()];
window.addEventListener('pagehide',()=>cleanups.forEach(cleanup=>cleanup()),{once:true});
