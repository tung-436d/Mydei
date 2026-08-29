import{initGallery}from'./controllers/gallery';
import{initImageFallbacks}from'./controllers/image-fallback';
import{initNavigation}from'./controllers/navigation';

document.documentElement.classList.add('js');
const cleanups=[initNavigation(),initGallery(),initImageFallbacks()];
window.addEventListener('pagehide',()=>cleanups.forEach(cleanup=>cleanup()),{once:true});
