// Existing /tags/#tag-… bookmarks lead to their dedicated tag page.
// Without JavaScript, the same fragment still reaches a normal tag link.
(() => {
  function followTag() {
    const link = document.getElementById(location.hash.slice(1));
    if (link?.matches('.tag-list a')) location.replace(link.getAttribute('href') + location.search);
  }
  followTag();
  window.addEventListener('hashchange', followTag);
})();
