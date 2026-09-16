(() => {
  'use strict';

  // 섹션과 링크를 한 쌍으로 관리해 잘못된 앵커가 다른 링크를 활성화하지 않게 한다.
  function initScrollSpy() {
    const items = Array.from(document.querySelectorAll('.nav-sub a[href^="#"]'))
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
      if (current === activeSection) return;

      activeSection = current;
      for (const { link, section } of items) {
        link.classList.toggle('active', section === current);
      }
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    updateActiveSection();
  }

  function initSidebar() {
    const trigger = document.getElementById('sidebar-trigger');
    const mask = document.getElementById('mask');
    if (!trigger || !mask) return;

    // 표시 상태와 접근성 속성은 항상 같은 경로에서 갱신한다.
    function setOpen(open) {
      document.body.classList.toggle('sidebar-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    }

    const close = () => setOpen(false);
    trigger.addEventListener('click', () => {
      setOpen(!document.body.classList.contains('sidebar-open'));
    });
    mask.addEventListener('click', close);
    for (const link of document.querySelectorAll('.nav a')) {
      link.addEventListener('click', close);
    }
    window.addEventListener('resize', () => {
      // portfolio.css의 모바일 사이드바 경계와 맞춘다.
      if (window.innerWidth >= 850) close();
    });
  }

  function initSearch() {
    const form = document.querySelector('.site-search');
    const input = document.getElementById('search-input');
    if (!form || !input) return;

    form.addEventListener('submit', event => {
      if (!input.value.trim()) event.preventDefault();
    });
  }

  initScrollSpy();
  initSidebar();
  initSearch();
})();
