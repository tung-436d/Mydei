import{initGallery}from'./controllers/gallery';import{initImageFallbacks}from'./controllers/image-fallback';import{initNavigation}from'./controllers/navigation';import{initSectionSpy}from'./controllers/section-spy';import{initTabs}from'./controllers/tabs';
document.documentElement.classList.add('js');
const cleanups=[initNavigation(),initTabs(),initGallery(),initImageFallbacks(),initSectionSpy()];
window.addEventListener('pagehide',()=>cleanups.forEach(cleanup=>cleanup()),{once:true});
