export class Timeline {
  #track = null;
  #scrollManager = null;

  // Drag
  #isDragging = false;
  #startX = 0;
  #scrollLeft = 0;
  #lastX = 0;
  #velocity = 0;
  #rafId = null;

  constructor(trackSelector = '.timeline-track', scrollManager = null) {
    const track = document.querySelector(trackSelector);
    if (!track) {
      console.warn(`[Timeline] Трек "${trackSelector}" не найден.`);
      return;
    }
    this.#track = track;
    this.#scrollManager = scrollManager;

    this.#fixLineWidth();
    this.#bindHover();
    this.#bindWheel();
    this.#bindDrag();
  }

  #fixLineWidth() {
    const setWidth = () => {
      const line = this.#track.querySelector('.tl-line');
      if (line) line.style.width = this.#track.scrollWidth + 'px';
    };

    requestAnimationFrame(setWidth);

    new ResizeObserver(setWidth).observe(document.body);
  }

  #pauseScroll() {
    this.#scrollManager?.pauseWheel();
  }
  #resumeScroll() {
    this.#scrollManager?.resumeWheel();
  }

  #bindHover() {
    this.#track.addEventListener('mouseenter', () => this.#pauseScroll());
    this.#track.addEventListener('mouseleave', () => {
      if (!this.#isDragging) this.#resumeScroll();
    });
  }

  #bindWheel() {
    this.#track.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        this.#track.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
  }

  #bindDrag() {
    const track = this.#track;

    track.addEventListener('mousedown', (e) => {
      cancelAnimationFrame(this.#rafId);
      this.#isDragging = true;
      this.#startX = e.pageX;
      this.#scrollLeft = track.scrollLeft;
      this.#lastX = e.pageX;
      this.#velocity = 0;
      track.classList.add('is-dragging');
      this.#pauseScroll();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.#isDragging) return;
      e.preventDefault();
      this.#velocity = e.pageX - this.#lastX;
      this.#lastX = e.pageX;
      track.scrollLeft = this.#scrollLeft - (e.pageX - this.#startX);
    });

    document.addEventListener('mouseup', () => {
      if (!this.#isDragging) return;
      this.#isDragging = false;
      track.classList.remove('is-dragging');
      if (!track.matches(':hover')) this.#resumeScroll();
      this.#momentum();
    });

    // Touch
    let tx = 0,
      tsl = 0,
      tv = 0,
      tlx = 0;

    track.addEventListener(
      'touchstart',
      (e) => {
        cancelAnimationFrame(this.#rafId);
        tx = e.touches[0].pageX;
        tsl = track.scrollLeft;
        tv = 0;
        tlx = e.touches[0].pageX;
      },
      { passive: true }
    );

    track.addEventListener(
      'touchmove',
      (e) => {
        tv = e.touches[0].pageX - tlx;
        tlx = e.touches[0].pageX;
        track.scrollLeft = tsl + (tx - e.touches[0].pageX);
      },
      { passive: true }
    );

    track.addEventListener('touchend', () => {
      this.#velocity = tv;
      this.#momentum();
    });
  }

  #momentum() {
    const track = this.#track;
    const friction = 0.92;

    const step = () => {
      if (Math.abs(this.#velocity) < 0.5) return;
      track.scrollLeft -= this.#velocity;
      this.#velocity *= friction;
      this.#rafId = requestAnimationFrame(step);
    };

    this.#rafId = requestAnimationFrame(step);
  }
}
