(() => {
  'use strict';

  // 섹션과 링크를 한 쌍으로 관리해 잘못된 앵커가 다른 링크를 활성화하지 않게 한다.
  function initScrollSpy() {
    const items = Array.from(document.querySelectorAll('#home-sections a[href^="#"]'))
      .map(link => ({
        link,
        section: document.getElementById(link.getAttribute('href').slice(1)),
      }))
      .filter(item => item.section);

    if (!items.length) return;

    const activationOffset = 200;
    let activeSection = null;

    function updateActiveSection() {
      let current = items[0].section;
      for (const { section } of items) {
        if (section.getBoundingClientRect().top <= activationOffset) current = section;
      }
      // A short final section may never reach the activation line.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = items.at(-1).section;
      }
      if (current === activeSection) return;

      activeSection = current;
      for (const { link, section } of items) {
        link.classList.toggle('active', section === current);
        if (section === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    window.addEventListener('pageshow', updateActiveSection);
    document.fonts?.ready.then(updateActiveSection);
    updateActiveSection();
  }

  initScrollSpy();
})();
