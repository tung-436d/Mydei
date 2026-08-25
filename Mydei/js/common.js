const HEADER_OFFSET = 80;

function scrollToHash(event) {
    const link = event.currentTarget;
    const hash = link.getAttribute('href');

    if (!hash || hash === '#') {
        return;
    }

    const target = document.querySelector(hash);
    if (!target) {
        return;
    }

    event.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;

    window.scrollTo({
        top,
        behavior: reduceMotion ? 'auto' : 'smooth'
    });

    if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
    history.pushState(null, '', hash);
}

function setAnimationDelays() {
    document.querySelectorAll('.fade-in').forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
    });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', scrollToHash);
});

setAnimationDelays();
