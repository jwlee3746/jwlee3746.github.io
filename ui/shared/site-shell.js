(() => {
  const form = document.querySelector('.site-search');
  const input = document.getElementById('search-input');
  form?.addEventListener('submit', event => {
    if (!input.value.trim() && !document.getElementById('post-results')) event.preventDefault();
  });
  const sidebar = document.getElementById('site-sidebar');
  const shell = document.getElementById('site-shell');
  const trigger = document.querySelector('.site-menu-trigger');
  const close = document.querySelector('.site-menu-close');
  const mask = document.querySelector('.site-mask');
  if (!sidebar || !shell || !trigger || !close || !mask) return;

  const mobile = window.matchMedia('(max-width: 849px)');
  let open = false;
  function setOpen(value, restoreFocus = false) {
    open = value && mobile.matches;
    document.body.classList.toggle('site-nav-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    sidebar.inert = mobile.matches && !open;
    shell.inert = open;
    mask.hidden = !open;
    if (open) close.focus();
    else if (restoreFocus) trigger.focus();
  }

  trigger.hidden = false;
  close.hidden = false;
  document.body.classList.add('site-nav-ready');
  setOpen(false);
  trigger.addEventListener('click', () => setOpen(!open));
  close.addEventListener('click', () => setOpen(false, true));
  mask.addEventListener('click', () => setOpen(false, true));
  sidebar.addEventListener('click', event => {
    if (open && event.target.closest('a')) setOpen(false, true);
  });
  mobile.addEventListener('change', () => {
    const wasOpen = open;
    const focusWasInSidebar = sidebar.contains(document.activeElement);
    const focusWasOnButton = document.activeElement === trigger || document.activeElement === close;
    setOpen(false, mobile.matches && focusWasInSidebar);
    if (!mobile.matches && (focusWasOnButton || wasOpen)) sidebar.querySelector('a').focus();
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
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();
