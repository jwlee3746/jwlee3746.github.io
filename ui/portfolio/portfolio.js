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

  function initSidebar() {
    const trigger = document.getElementById('sidebar-trigger');
    const mask = document.getElementById('mask');
    const sidebar = document.getElementById('site-sidebar');
    const shell = document.querySelector('.content-shell');
    const closeButton = document.querySelector('.sidebar-close');
    if (!trigger || !mask || !sidebar || !shell || !closeButton) return;
    const mobile = window.matchMedia('(max-width: 849px)');
    let open = false;
    function setOpen(value, restoreFocus = false) {
      open = value && mobile.matches;
      document.body.classList.toggle('sidebar-open', open);
      trigger.setAttribute('aria-expanded', String(open));
      sidebar.inert = mobile.matches && !open;
      shell.inert = open;
      if (open) closeButton.focus();
      else if (restoreFocus) trigger.focus();
    }
    closeButton.hidden = false;
    document.body.classList.add('sidebar-ready');
    setOpen(false);
    trigger.addEventListener('click', () => setOpen(!open));
    closeButton.addEventListener('click', () => setOpen(false, true));
    mask.addEventListener('click', () => setOpen(false, true));
    sidebar.addEventListener('click', event => {
      if (open && event.target.closest('a')) setOpen(false, true);
    });
    mobile.addEventListener('change', () => {
      const wasOpen = open;
      const sidebarFocused = sidebar.contains(document.activeElement);
      const buttonFocused = document.activeElement === trigger || document.activeElement === closeButton;
      setOpen(false, mobile.matches && sidebarFocused);
      if (!mobile.matches && (buttonFocused || wasOpen)) sidebar.querySelector('a').focus();
    });
    window.addEventListener('pageshow', () => setOpen(false));
    document.addEventListener('keydown', event => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, true);
      }
      if (event.key === 'Tab') {
        const controls = [...sidebar.querySelectorAll('a, button')].filter(control => control.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
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
