const LANG_CLASS = {
  JavaScript: 'lang-javascript',
  TypeScript: 'lang-typescript',
  Python: 'lang-python',
  Rust: 'lang-rust',
  Go: 'lang-go',
  CSS: 'lang-css',
  HTML: 'lang-html',
  Vue: 'lang-vue',
  Svelte: 'lang-svelte',
  C: 'lang-c',
  'C++': 'lang-cpp',
  Java: 'lang-java',
  Kotlin: 'lang-kotlin',
  Swift: 'lang-swift',
  Ruby: 'lang-ruby',
  PHP: 'lang-php',
  Shell: 'lang-shell',
};

const ICON = {
  externalLink: `<svg class="repo-card__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,
  star: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  fork: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 3a4 4 0 0 1 3.874 3h2.252A4 4 0 1 1 17 9.874V12a3 3 0 0 1-3 3h-1v2.126a4 4 0 1 1-2 0V15H9a3 3 0 0 1-3-3V9.874A4.002 4.002 0 0 1 7 3zm5 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>`,
};

export class GithubRepos {
  /**
   * @param {string} sectionSelector
   * @param {string} username
   */
  constructor(sectionSelector, username) {
    this.section = document.querySelector(sectionSelector);
    this.username = username;

    if (!this.section) {
      console.warn(`[GithubRepos] Секция "${sectionSelector}" не найдена.`);
      return;
    }
    if (!username) {
      console.warn('[GithubRepos] Не передан username.');
      return;
    }

    this.#render();
  }

  async #render() {
    this.section.innerHTML =
      this.section.innerHTML +
      `
      <div class="repos-grid" id="repos-grid">
        ${this.#renderSkeletons(6)}
      </div>
    `;

    try {
      const repos = await this.#fetchRepos();
      document.getElementById('repos-grid').innerHTML = repos.length
        ? repos.map((r) => this.#renderCard(r)).join('')
        : this.#renderEmpty();
    } catch (err) {
      console.error('[GithubRepos]', err);
      document.getElementById('repos-grid').innerHTML = this.#renderError();
    }
  }

  #cacheKey() {
    return `gh_repos_${this.username}`;
  }
  #cacheTTL = 5 * 60 * 1000;

  async #fetchRepos() {
    try {
      const cached = localStorage.getItem(this.#cacheKey());
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < this.#cacheTTL) return data;
      }
    } catch (e) {
      console.err('Fail while fetch repos, reason:', e.message);
    }

    const res = await fetch(
      `https://api.github.com/users/${this.username}/repos?per_page=100&type=public`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );

    if (!res.ok) throw new Error(`GitHub API: ${res.status} ${res.statusText}`);

    const all = await res.json();

    const own = all.filter((r) => !r.fork);

    own.sort((a, b) => {
      const stars = b.stargazers_count - a.stargazers_count;
      return stars !== 0 ? stars : b.forks_count - a.forks_count;
    });

    const withDesc = own.filter((r) => r.description?.trim());
    const withoutDesc = own.filter((r) => !r.description?.trim());
    const data = [...withDesc, ...withoutDesc].slice(0, 6);

    try {
      localStorage.setItem(
        this.#cacheKey(),
        JSON.stringify({ ts: Date.now(), data })
      );
    } catch {}

    return data;
  }

  #renderCard(repo) {
    const langClass = repo.language
      ? (LANG_CLASS[repo.language] ?? 'lang-default')
      : null;

    const desc = repo.description?.trim();

    return `
      <a class="repo-card" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
        <div class="repo-card__head">
          <span class="repo-card__name" title="${repo.name}">${repo.name}</span>
          ${ICON.externalLink}
        </div>

        <p class="repo-card__desc ${desc ? '' : 'repo-card__desc--empty'}">
          ${desc || 'Описание отсутствует'}
        </p>

        <div class="repo-card__foot">
          ${
            langClass
              ? `
            <span class="repo-card__lang">
              <span class="repo-card__lang-dot ${langClass}"></span>
              ${repo.language}
            </span>
          `
              : ''
          }

          ${
            repo.stargazers_count > 0
              ? `
            <span class="repo-card__stat">
              ${ICON.star} ${repo.stargazers_count}
            </span>
          `
              : ''
          }

          ${
            repo.forks_count > 0
              ? `
            <span class="repo-card__stat">
              ${ICON.fork} ${repo.forks_count}
            </span>
          `
              : ''
          }
        </div>
      </a>
    `;
  }

  #renderSkeletons(n) {
    return Array.from(
      { length: n },
      () => `
      <div class="repo-skeleton">
        <div class="skeleton-line" style="width:55%;height:14px;"></div>
        <div class="skeleton-line" style="width:90%;height:11px;margin-top:4px;"></div>
        <div class="skeleton-line" style="width:75%;height:11px;"></div>
        <div class="skeleton-line" style="width:30%;height:11px;margin-top:auto;"></div>
      </div>
    `
    ).join('');
  }

  #renderEmpty() {
    return `<p class="repos-state">Публичные репозитории не найдены</p>`;
  }

  #renderError() {
    return `<p class="repos-state repos-state--error">Не удалось загрузить репозитории — проверь имя пользователя или попробуй позже</p>`;
  }
}
