/* =========================================================
   The Notebook — script.js (v2.1)
   What this does:
     1. Reading-progress rail
     2. Title hand-drawn highlight on load
     3. Project-domain navigation
     4. Auto-generate Unique Clinic + MeterTrack galleries
     5. KaTeX render with graceful fallback
     6. Lightbox with arrow-key and swipe navigation
     7. Image protection: block right-click and drag on images
     8. Dateline auto-update
   ========================================================= */

(function () {
  'use strict';

  /* ============================================================
     1. Reading-progress rail
     ============================================================ */
  const readMeter = document.getElementById('read-meter');
  const readMeterFill = document.getElementById('read-meter-fill');
  const projectDomains = Array.from(document.querySelectorAll('.project-domain'));
  const projectLinks = Array.from(document.querySelectorAll('[data-project-target]'));

  function getActiveProjectDomain() {
    const marker = window.innerHeight * 0.38;
    return projectDomains.find((domain) => {
      const rect = domain.getBoundingClientRect();
      return rect.top <= marker && rect.bottom >= marker;
    });
  }

  function setActiveProjectLink(activeDomain) {
    projectLinks.forEach((link) => {
      link.classList.toggle('is-active', Boolean(activeDomain && link.dataset.projectTarget === activeDomain.id));
    });
  }

  function updateReadingProgress() {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const scrolled = h.scrollTop || document.body.scrollTop;
    const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;

    if (readMeterFill) readMeterFill.style.transform = `scaleX(${pct / 100})`;
    if (readMeter) readMeter.setAttribute('aria-valuenow', String(Math.round(pct)));

    const activeDomain = getActiveProjectDomain();
    setActiveProjectLink(activeDomain);
  }

  let progressTicking = false;
  function requestProgressUpdate() {
    if (progressTicking) return;
    window.requestAnimationFrame(() => {
      updateReadingProgress();
      progressTicking = false;
    });
    progressTicking = true;
  }

  window.addEventListener('scroll', requestProgressUpdate, { passive: true });
  window.addEventListener('resize', requestProgressUpdate);
  updateReadingProgress();

  /* ============================================================
     2. Title highlight on load
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('.title-block h1');
    if (h1) h1.classList.add('is-loaded');
  });

  /* ============================================================
     3. Project-domain navigation
     ============================================================ */
  function openProjectDomain(id) {
    const target = document.getElementById(id);
    if (!target) return;
    if (target.tagName === 'DETAILS') target.open = true;
    projectDomains.forEach((domain) => {
      if (domain !== target && domain.tagName === 'DETAILS') domain.open = false;
    });
  }

  projectLinks.forEach((link) => {
    link.addEventListener('click', () => {
      openProjectDomain(link.dataset.projectTarget);
      requestProgressUpdate();
    });
  });

  projectDomains.forEach((domain) => {
    domain.addEventListener('toggle', requestProgressUpdate);
  });

  /* ============================================================
     4. Auto-generate the big galleries
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
     5. KaTeX with graceful fallback
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
     6. Lightbox with gallery navigation
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
  let touchStartX = 0;
  let touchStartY = 0;
  let suppressLightboxClick = false;

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
  if (lightboxImg) lightboxImg.addEventListener('click', (e) => {
    if (suppressLightboxClick) {
      e.preventDefault();
      suppressLightboxClick = false;
      return;
    }
    closeLightbox();
  });
  if (lightbox) lightbox.addEventListener('click', (e) => {
    // close on backdrop click but not on the nav buttons
    if (e.target === lightbox) closeLightbox();
  });

  if (lightboxImg) {
    lightboxImg.addEventListener('touchstart', (e) => {
      if (!e.changedTouches.length) return;
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    lightboxImg.addEventListener('touchend', (e) => {
      if (currentMode !== 'gallery' || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 45 && Math.abs(dy) < 70) {
        suppressLightboxClick = true;
        window.setTimeout(() => { suppressLightboxClick = false; }, 500);
        if (dx < 0) nextImage();
        else prevImage();
      }
    }, { passive: true });
  }

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
     7. Image protection (casual)
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
     8. Bonus: dateline auto-update
     ============================================================ */
  const dateEl = document.getElementById('last-updated');
  if (dateEl) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    dateEl.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  }
})();
