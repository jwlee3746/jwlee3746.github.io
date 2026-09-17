(() => {
  const form = document.querySelector('.site-search');
  const input = document.getElementById('search-input');
  const status = document.getElementById('post-results');
  const empty = document.getElementById('post-empty');
  if (!form || !input || !status || !empty) return;
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase();
  const cards = [...document.querySelectorAll('.post-list .post-card')].map(card => ({
    card,
    source: (card.dataset.search || '').normalize('NFKC'),
    text: normalize(card.dataset.search || ''),
    visible: normalize([...card.querySelectorAll('.post-card-title, .post-card-excerpt, .post-card-category')].map(element => element.textContent).join(' ')),
    tags: JSON.parse(card.dataset.searchTags || '[]'),
    evidence: card.querySelector('.post-match'),
  }));

  function explain(item, words) {
    const missing = words.filter(word => !item.visible.includes(word));
    const tags = item.tags.filter(tag => missing.some(word => normalize(tag).includes(word)));
    const bodyWord = missing.find(word => !tags.some(tag => normalize(tag).includes(word)));
    const parts = tags.length ? [`태그: ${tags.join(', ')}`] : [];
    if (bodyWord) {
      const index = item.text.indexOf(bodyWord);
      const start = Math.max(0, index - 40);
      const end = Math.min(item.source.length, index + bodyWord.length + 90);
      parts.push(`본문: ${start ? '…' : ''}${item.source.slice(start, end)}${end < item.source.length ? '…' : ''}`);
    }
    // Search text may contain HTML/code examples. Never interpret it as markup.
    item.evidence.textContent = parts.join(' · ');
    item.evidence.hidden = !parts.length;
  }

  function filter() {
    const query = input.value.trim();
    const words = normalize(query).split(/\s+/).filter(Boolean);
    document.querySelector('.post-list')?.classList.toggle('is-filtered', words.length > 0);
    let count = 0;
    for (const item of cards) {
      const matches = words.every(word => item.text.includes(word));
      item.card.hidden = !matches;
      if (matches) count++;
      explain(item, matches ? words : []);
    }
    status.textContent = words.length ? `“${query}” 검색 결과 ${count}개 / 전체 ${cards.length}개` : `${cards.length}개의 글`;
    empty.hidden = count !== 0;
  }

  function readUrl() {
    input.value = new URL(location.href).searchParams.get('q') || '';
    filter();
  }
  function update() {
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    // Persist live filtering before a result is opened, without one history entry per key.
    // Preserve history state and native scroll restoration for back/forward navigation.
    if (url.href !== location.href) history.replaceState(history.state, '', url);
    filter();
  }
  readUrl();
  input.addEventListener('input', event => { if (!event.isComposing) update(); });
  input.addEventListener('compositionend', update);
  form.addEventListener('submit', event => {
    event.preventDefault();
    update();
  });
  empty.querySelector('.post-search-reset').addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();
    input.value = '';
    update();
    window.scrollTo(0, 0);
    input.focus({ preventScroll: true });
  });
  window.addEventListener('popstate', readUrl);
  window.addEventListener('pageshow', readUrl);
})();
