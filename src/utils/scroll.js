import Lenis from '@studio-freight/lenis';

export class ScrollManager {
  /** @type {Lenis} */
  #lenis = null;

  /** @type {ReturnType<typeof setTimeout>|null} */
  #snapTimeout = null;

  /** @type {NodeListOf<Element>} */
  #sections;

  /** @type {IntersectionObserver} */
  #navObserver;

  #onWheel = null;
  #onVisibility = null;
  #navLinkSelector = '.nav-links a';
  #snapDelay = 50;

  /**
   * @param {object} options
   * @param {string} [options.wrapperSelector='.snap-container']
   * @param {string} [options.sectionSelector='.snap-section']
   * @param {string} [options.navLinkSelector='.nav-links a']
   * @param {number}  [options.snapDelay=50]
   * @param {number}  [options.lenisDuration=1.2]
   */
  constructor({
    wrapperSelector = '.snap-container',
    sectionSelector = '.snap-section',
    navLinkSelector = '.nav-links a',
    snapDelay = 50,
    lenisDuration = 1.2,
  } = {}) {
    this.#sections = document.querySelectorAll(sectionSelector);
    this.#navLinkSelector = navLinkSelector;
    this.#snapDelay = snapDelay;
    this.#initLenis(wrapperSelector, lenisDuration);
    this.#initSnapOnWheel();
    this.#initNavObserver();
    this.#initVisibilityPause();
    this.#startRaf();
  }

  scrollTo(target, options = {}) {
    this.#lenis.scrollTo(target, {
      offset: 0,
      duration: 1.5,
      easing: ScrollManager.#ease,
      immediate: false,
      ...options,
    });
  }

  get lenis() {
    return this.#lenis;
  }

  pauseWheel() {
    this.#lenis.options.smoothWheel = false;
  }

  resumeWheel() {
    this.#lenis.options.smoothWheel = true;
  }

  destroy() {
    this.#lenis.destroy();
    this.#navObserver.disconnect();
    window.removeEventListener('wheel', this.#onWheel);
    document.removeEventListener('visibilitychange', this.#onVisibility);
  }

  /** @param {string} wrapper @param {number} duration */
  #initLenis(wrapper, duration) {
    const el = document.querySelector(wrapper);
    this.#lenis = new Lenis({
      wrapper: el,
      content: el,
      duration,
      easing: ScrollManager.#ease,
      smoothWheel: true,
      lerp: 0.1,
    });
  }

  #initSnapOnWheel() {
    this.#onWheel = () => {
      clearTimeout(this.#snapTimeout);
      this.#snapTimeout = setTimeout(() => {
        const scrollY = this.#lenis.scroll;
        const idx = Math.round(scrollY / window.innerHeight);
        const target = this.#sections[Math.min(idx, this.#sections.length - 1)];
        if (target) {
          this.#lenis.scrollTo(target, { lerp: 0.05, immediate: false });
        }
      }, this.#snapDelay);
    };

    window.addEventListener('wheel', this.#onWheel, { passive: true });
  }

  #initNavObserver() {
    this.#navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('id');
          document.querySelectorAll(this.#navLinkSelector).forEach((link) => {
            link.classList.toggle(
              'active',
              link.getAttribute('href') === `#${id}`
            );
          });
        });
      },
      { root: null, rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    document
      .querySelectorAll('section')
      .forEach((s) => this.#navObserver.observe(s));
  }

  #initVisibilityPause() {
    this.#onVisibility = () => {
      document.hidden ? this.#lenis.stop() : this.#lenis.start();
    };
    document.addEventListener('visibilitychange', this.#onVisibility);
  }

  #startRaf() {
    const raf = (time) => {
      this.#lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  static #ease = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));
}
