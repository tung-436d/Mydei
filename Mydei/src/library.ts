import{initImageFallbacks}from'./controllers/image-fallback';import{initLibrary}from'./controllers/library';import{initNavigation}from'./controllers/navigation';
document.documentElement.classList.add('js');
const cleanups=[initNavigation(),initLibrary(),initImageFallbacks()];
window.addEventListener('pagehide',()=>cleanups.forEach(cleanup=>cleanup()),{once:true});
