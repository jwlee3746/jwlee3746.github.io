(() => {
  const form = document.querySelector('.site-search');
  const input = document.getElementById('search-input');
  const status = document.getElementById('post-results');
  const empty = document.getElementById('post-empty');
  if (!form || !input || !status || !empty) return;
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase();
  const cards = [...document.querySelectorAll('.post-card')].map(card => ({
    card, text: normalize(card.dataset.search || ''),
  }));
  function filter() {
    const words = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const { card, text } of cards) {
      const matches = words.every(word => text.includes(word));
      card.hidden = !matches;
      if (matches) count++;
    }
    status.textContent = words.length ? `검색 결과 ${count}개 / 전체 ${cards.length}개` : `${cards.length}개의 글`;
    empty.hidden = count !== 0;
  }
  function readUrl() {
    input.value = new URL(location.href).searchParams.get('q') || '';
    filter();
  }
  readUrl();
  input.addEventListener('input', filter);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    history.pushState(null, '', url);
    filter();
  });
  window.addEventListener('popstate', readUrl);
})();
