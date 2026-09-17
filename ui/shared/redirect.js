// Preserve shared heading anchors and search queries when leaving legacy URLs.
const destination = new URL(document.querySelector('link[rel="canonical"]').href);
location.replace(destination.pathname + location.search + location.hash);
