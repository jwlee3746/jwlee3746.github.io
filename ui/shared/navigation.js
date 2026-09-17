(() => {
  for (const button of document.querySelectorAll('.site-nav-heading button')) {
    const submenu = document.getElementById(button.getAttribute('aria-controls'));
    if (!submenu) continue;
    button.hidden = false;
    submenu.hidden = button.getAttribute('aria-expanded') !== 'true';
    button.addEventListener('click', () => {
      submenu.hidden = !submenu.hidden;
      button.setAttribute('aria-expanded', String(!submenu.hidden));
    });
  }
})();
