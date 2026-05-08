/* =========================================================
   The Notebook — script.js (v2.1)
   What this does:
     1. Reading-progress bar (top of viewport, ink line)
     2. Title hand-drawn highlight on load
     3. KaTeX render with graceful fallback
     4. Auto-generate Unique Clinic + MeterTrack galleries
     5. Lightbox with arrow-key navigation through galleries
     6. Image protection: block right-click and drag on images
     7. Dateline auto-update
   ========================================================= */

(function () {
  'use strict';

  /* ============================================================
     1. Reading-progress bar
     ============================================================ */
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    let ticking = false;
    function updateProgress() {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const scrolled = h.scrollTop || document.body.scrollTop;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      progressBar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
    updateProgress();
  }

  /* ============================================================
     2. Title highlight on load
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('.title-block h1');
    if (h1) h1.classList.add('is-loaded');
  });

  /* ============================================================
     3. Auto-generate the big galleries
     Unique Clinic = 14 images, MeterTrack = 7 images.
     Avoid 21 nearly-identical lines of HTML.
     ============================================================ */
  function generateThumbs(containerId, galleryName, count, ext) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= count; i++) {
      const div = document.createElement('div');
      div.className = 'gallery-thumb';
      div.dataset.gallery = galleryName;
      div.dataset.index = String(i - 1);
      const num = String(i).padStart(2, '0');
      div.innerHTML = `<span class="thumb-num">${num}</span>` +
        `<img loading="lazy" src="assets/${galleryName}/${i}.${ext}" alt="${galleryName} screenshot ${i}" />`;
      frag.appendChild(div);
    }
    container.appendChild(frag);
  }

  generateThumbs('gallery-unique-clinic', 'Unique_Clinic', 14, 'png');
  generateThumbs('gallery-metertrack', 'MeterTrack', 7, 'png');

  /* ============================================================
     4. KaTeX with graceful fallback
     ============================================================ */
  function renderEquations(attempt = 0) {
    if (!window.katex) {
      if (attempt < 60) {
        return setTimeout(() => renderEquations(attempt + 1), 33);
      }
      return; // KaTeX failed; HTML fallback stays
    }
    document.querySelectorAll('.katex-render').forEach((el) => {
      const tex = el.getAttribute('data-tex');
      if (!tex) return;
      try {
        el.innerHTML = window.katex.renderToString(tex, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) { /* leave fallback */ }
    });
  }
  renderEquations();

  /* ============================================================
     5. Lightbox with gallery navigation
     - cert-thumbs: single-image lightbox (no arrows)
     - gallery-thumbs: arrow nav within data-gallery group
     ============================================================ */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const btnPrev = document.getElementById('lightbox-prev');
  const btnNext = document.getElementById('lightbox-next');
  const btnClose = document.getElementById('lightbox-close');

  let currentGallery = [];
  let currentIndex = 0;
  let currentMode = 'single'; // 'single' or 'gallery'

  function getGalleryItems(galleryName) {
    return Array.from(document.querySelectorAll(`.gallery-thumb[data-gallery="${galleryName}"]`))
      .sort((a, b) => parseInt(a.dataset.index, 10) - parseInt(b.dataset.index, 10))
      .map((el) => {
        const img = el.querySelector('img');
        return { src: img.src, alt: img.alt, caption: img.alt };
      });
  }

  function openLightbox(items, index, mode) {
    currentGallery = items;
    currentIndex = index;
    currentMode = mode;
    showCurrent();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    btnPrev.style.display = (mode === 'gallery' && items.length > 1) ? '' : 'none';
    btnNext.style.display = (mode === 'gallery' && items.length > 1) ? '' : 'none';
  }

  function showCurrent() {
    const item = currentGallery[currentIndex];
    if (!item) return;
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt;
    lightboxCaption.textContent = item.caption || '';
    if (currentMode === 'gallery' && currentGallery.length > 1) {
      lightboxCounter.textContent = `${currentIndex + 1} / ${currentGallery.length}`;
      lightboxCounter.style.display = '';
    } else {
      lightboxCounter.style.display = 'none';
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function nextImage() {
    if (currentMode !== 'gallery') return;
    currentIndex = (currentIndex + 1) % currentGallery.length;
    showCurrent();
  }

  function prevImage() {
    if (currentMode !== 'gallery') return;
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    showCurrent();
  }

  // Project gallery clicks
  document.body.addEventListener('click', (e) => {
    const galleryThumb = e.target.closest('.gallery-thumb');
    if (galleryThumb) {
      const galleryName = galleryThumb.dataset.gallery;
      const idx = parseInt(galleryThumb.dataset.index, 10) || 0;
      const items = getGalleryItems(galleryName);
      if (items.length) openLightbox(items, idx, 'gallery');
      return;
    }
    const certThumb = e.target.closest('.cert-thumb');
    if (certThumb) {
      const img = certThumb.querySelector('img');
      const caption = certThumb.dataset.caption || img.alt;
      openLightbox([{ src: img.src, alt: img.alt, caption }], 0, 'single');
      return;
    }
  });

  // Lightbox controls
  if (btnClose) btnClose.addEventListener('click', closeLightbox);
  if (btnNext) btnNext.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
  if (btnPrev) btnPrev.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });

  // Click image (or backdrop) to close
  if (lightboxImg) lightboxImg.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', (e) => {
    // close on backdrop click but not on the nav buttons
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    switch (e.key) {
      case 'Escape': closeLightbox(); break;
      case 'ArrowRight': nextImage(); break;
      case 'ArrowLeft': prevImage(); break;
    }
  });

  /* ============================================================
     6. Image protection (casual)
     Blocks right-click context menu and dragstart on images shown
     on the page. Combined with CSS user-select / user-drag rules.
     Note: This stops casual users. Anyone with DevTools or who
     views page source can still get image URLs. There's no real
     way to prevent that on the public web.
     ============================================================ */
  function blockImgEvents(e) {
    const target = e.target;
    if (!target) return;
    if (target.tagName === 'IMG' || target.closest('.gallery-thumb, .cert-thumb, .lightbox')) {
      e.preventDefault();
      return false;
    }
  }
  document.addEventListener('contextmenu', blockImgEvents);
  document.addEventListener('dragstart', blockImgEvents);

  /* ============================================================
     7. Bonus: dateline auto-update
     ============================================================ */
  const dateEl = document.getElementById('last-updated');
  if (dateEl) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    dateEl.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  }
})();
