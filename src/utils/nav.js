export class NavController {
  /**
   * @param {import('./scroll').ScrollManager} scrollManager
   * @param {object} [options]
   * @param {string} [options.toggleSelector='#mobile-menu']
   * @param {string} [options.navLinksSelector='.nav-links']
   * @param {string} [options.anchorSelector='.nav-links a']
   */
  constructor(
    scrollManager,
    {
      toggleSelector = '#mobile-menu',
      navLinksSelector = '.nav-links',
      anchorSelector = '.nav-links a',
    } = {}
  ) {
    this.#scrollManager = scrollManager;
    this.#toggle = document.querySelector(toggleSelector);
    this.#navLinks = document.querySelector(navLinksSelector);
    this.#anchorSelector = anchorSelector;

    if (!this.#toggle || !this.#navLinks) {
      console.warn('[NavController] Элементы меню не найдены в DOM.');
      return;
    }

    this.#bindToggle();
    this.#bindAnchors();
  }

  /** @type {import('./scroll').ScrollManager} */
  #scrollManager;
  /** @type {HTMLElement} */
  #toggle;
  /** @type {HTMLElement} */
  #navLinks;
  /** @type {string} */
  #anchorSelector;

  #bindToggle() {
    this.#toggle.addEventListener('click', () => {
      this.#navLinks.classList.toggle('active');
      this.#toggle.classList.toggle('is-active');
    });
  }

  #bindAnchors() {
    document.querySelectorAll(this.#anchorSelector).forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();

        this.#navLinks.classList.remove('active');
        this.#toggle.classList.remove('is-active');

        const targetId = anchor.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
          this.#scrollManager.scrollTo(target);
        }
      });
    });
  }
}
