(() => {
  const article = document.querySelector('.post-content');
  if (!article || typeof HTMLDialogElement === 'undefined') return;

  const media = [...article.querySelectorAll('img, .post-diagram > svg, .eval-explainer svg')]
    .filter(item => !item.closest('a, button'));
  if (!media.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-label', '그림 확대 보기');
  dialog.innerHTML = `
    <div class="image-viewer-panel">
      <header class="image-viewer-header">
        <strong class="image-viewer-title"></strong>
        <button type="button" data-action="close" autofocus aria-label="그림 닫기">닫기 ×</button>
      </header>
      <div class="image-viewer-controls" role="group" aria-label="그림 크기 조절">
        <button type="button" data-action="fit">화면 맞춤</button>
        <button type="button" data-action="actual">100%</button>
        <button type="button" data-action="out" aria-label="그림 축소">−</button>
        <button type="button" data-action="in" aria-label="그림 확대">＋</button>
        <output aria-live="polite" aria-label="현재 배율"></output>
        <a class="image-viewer-original" target="_blank" rel="noopener">원본 ↗</a>
      </div>
      <div class="image-viewer-stage" tabindex="0" role="region" aria-label="그림 보기. 확대 후 좌우와 위아래로 스크롤">
        <div class="image-viewer-canvas post-diagram"></div>
      </div>
    </div>`;
  article.append(dialog);
  const stage = dialog.querySelector('.image-viewer-stage');
  const canvas = dialog.querySelector('.image-viewer-canvas');
  const output = dialog.querySelector('output');
  const original = dialog.querySelector('.image-viewer-original');
  let active;
  let scale = 1;
  let fitted = true;

  function resize(nextScale) {
    // Keep the visible center when zooming; the scroll area exposes every edge.
    const centerX = (stage.scrollLeft + stage.clientWidth / 2) / scale;
    const centerY = (stage.scrollTop + stage.clientHeight / 2) / scale;
    scale = nextScale;
    canvas.style.setProperty('--viewer-width', `${active.width * scale}px`);
    output.value = `${Math.round(scale * 100)}%`;
    stage.scrollLeft = centerX * scale - stage.clientWidth / 2;
    stage.scrollTop = centerY * scale - stage.clientHeight / 2;
  }

  function fit() {
    if (!active) return;
    fitted = true;
    resize(Math.min(1, Math.max(1, stage.clientWidth - 32) / active.width,
      Math.max(1, stage.clientHeight - 32) / active.height));
    stage.scrollTo(0, 0);
  }

  function open(item, trigger, label) {
    if (active) return;
    const box = item.viewBox?.baseVal;
    const width = box?.width || item.naturalWidth || item.width?.baseVal?.value || item.width;
    const height = box?.height || item.naturalHeight || item.height?.baseVal?.value || item.height;
    if (!(width > 0 && height > 0)) return;
    active = { item, trigger, width, height };
    // Move, rather than clone, inline SVGs to retain webfonts, marker IDs and labels.
    trigger.style.minHeight = `${trigger.getBoundingClientRect().height}px`;
    item.setAttribute('data-viewer-media', '');
    canvas.append(item);
    dialog.querySelector('.image-viewer-title').textContent = label;
    const src = item.currentSrc || item.getAttribute('src') || item.dataset.diagramSrc;
    original.hidden = !src;
    if (src) original.href = src;
    else original.removeAttribute('href');
    document.documentElement.classList.add('image-viewer-open');
    dialog.showModal();
    fit();
  }

  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (event.target === dialog || action === 'close') dialog.close();
    else if (action === 'fit') fit();
    else if (active && action) {
      fitted = false;
      resize(action === 'actual' ? 1 : Math.max(.05, Math.min(4, scale * (action === 'in' ? 1.5 : 1 / 1.5))));
    }
  });
  dialog.addEventListener('close', () => {
    if (!active) return;
    const { item, trigger } = active;
    item.removeAttribute('data-viewer-media');
    trigger.prepend(item);
    trigger.style.removeProperty('min-height');
    active = undefined;
    document.documentElement.classList.remove('image-viewer-open');
    trigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, a[href], [tabindex="0"]')]
      .filter(control => !control.hidden && control.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('resize', () => { if (dialog.open && fitted) fit(); });

  for (const item of media) {
    const label = item.getAttribute('alt') || item.querySelector('title')?.textContent || '그림';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'image-zoom-trigger';
    trigger.setAttribute('aria-label', `${label} 크게 보기`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    const container = item.parentElement;
    if (container.matches('.post-diagram, .eval-explainer > [role="region"]')) {
      container.removeAttribute('tabindex');
      container.removeAttribute('role');
      container.removeAttribute('aria-label');
    }
    item.replaceWith(trigger);
    trigger.append(item);
    const hint = document.createElement('span');
    hint.className = 'image-zoom-hint';
    hint.textContent = '확대 보기 ↗';
    hint.setAttribute('aria-hidden', 'true');
    trigger.append(hint);
    trigger.addEventListener('click', () => open(item, trigger, label));
  }
})();
