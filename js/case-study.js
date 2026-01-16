// case-study.js - modal player supporting:
// 1) YouTube via IFrame Player API (custom controls)
// 2) Generic iframe embeds (fullscreen + watch link only)

(() => {
  const SELECTORS = {
    samples: '.sample[data-video]',
    overlay: '#playerOverlay',
    wrap: '#playerWrap',
    mount: '#ytPlayer',
    title: '#playerTitle',
    close: '[data-player-close]',
    btnPlay: '[data-ctrl="play"]',
    btnMute: '[data-ctrl="mute"]',
    rangeVol: '[data-ctrl="volume"]',
    btnFs: '[data-ctrl="fullscreen"]',
    linkWatch: '[data-ctrl="watch"]',
    iconPlay: '[data-icon="play"]',
    iconPause: '[data-icon="pause"]',
    iconVol: '[data-icon="vol"]',
    iconMuted: '[data-icon="muted"]'
  };

  const state = {
    isOpen: false,
    lastFocused: null,

    // YouTube-only state
    apiReady: false,
    player: null,
    desiredVolume: 80,

    // Current item
    provider: null,      // "youtube" | "iframe"
    videoValue: null,    // yt videoId OR iframe url
    watchUrl: null
  };

  function stampYear() {
    const yearEl = document.querySelector('[data-year]');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  function setPlayUi(isPlaying) {
    const play = document.querySelector(SELECTORS.iconPlay);
    const pause = document.querySelector(SELECTORS.iconPause);
    if (!play || !pause) return;
    play.classList.toggle('is-hidden', isPlaying);
    pause.classList.toggle('is-hidden', !isPlaying);
  }

  function setMuteUi(isMuted) {
    const vol = document.querySelector(SELECTORS.iconVol);
    const muted = document.querySelector(SELECTORS.iconMuted);
    if (!vol || !muted) return;
    vol.classList.toggle('is-hidden', isMuted);
    muted.classList.toggle('is-hidden', !isMuted);
  }

  function syncVolumeUi(vol) {
    const r = document.querySelector(SELECTORS.rangeVol);
    if (r) r.value = String(Math.max(0, Math.min(100, vol)));
  }

  // ----------------------------
  // YouTube API loading
  // ----------------------------
  function loadYouTubeApiOnce() {
    if (window.YT && typeof window.YT.Player === 'function') {
      state.apiReady = true;
      return Promise.resolve();
    }

    if (document.querySelector('script[data-yt-iframe-api]')) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (window.YT && typeof window.YT.Player === 'function') {
            clearInterval(check);
            state.apiReady = true;
            resolve();
          }
        }, 50);
      });
    }

    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.dataset.ytIframeApi = '1';
      document.head.appendChild(s);

      window.onYouTubeIframeAPIReady = () => {
        state.apiReady = true;
        resolve();
      };
    });
  }

  function ensureMountCleared() {
    const mount = document.querySelector(SELECTORS.mount);
    if (!mount) return;
    // Remove any iframe we injected before
    mount.innerHTML = '';
  }

  function ensureYouTubePlayer(videoId) {
    const mountEl = document.querySelector(SELECTORS.mount);
    if (!mountEl) return;

    if (state.player) return;

    state.player = new window.YT.Player(mountEl, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        fs: 0,
        iv_load_policy: 3
      },
      events: {
        onReady: () => {
          try {
            state.player.setVolume(state.desiredVolume);
            state.player.unMute();
            setMuteUi(false);
            syncVolumeUi(state.desiredVolume);
            state.player.playVideo();
            setPlayUi(true);
          } catch (_) {}
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.PLAYING) setPlayUi(true);
          if (e.data === window.YT.PlayerState.PAUSED) setPlayUi(false);
          if (e.data === window.YT.PlayerState.ENDED) setPlayUi(false);
        }
      }
    });
  }

  function loadYouTubeVideo(videoId) {
    if (!state.player) return;
    try {
      state.player.loadVideoById(videoId);
      state.player.playVideo();
      state.player.setVolume(state.desiredVolume);
      if (state.desiredVolume === 0) state.player.mute();
      else state.player.unMute();
      setMuteUi(state.player.isMuted());
      setPlayUi(true);
    } catch (_) {}
  }

  // ----------------------------
  // Iframe provider (OUA.tv etc)
  // ----------------------------
  function openIframe(url) {
    const mount = document.querySelector(SELECTORS.mount);
    if (!mount) return;

    ensureMountCleared();

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = 'Embedded video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('frameborder', '0');

    mount.appendChild(iframe);
  }

  // ----------------------------
  // Overlay open/close
  // ----------------------------
  function openOverlay(titleText, watchUrl, providerClass) {
    const overlay = document.querySelector(SELECTORS.overlay);
    const title = document.querySelector(SELECTORS.title);
    const link = document.querySelector(SELECTORS.linkWatch);
    if (!overlay) return;

    state.lastFocused = document.activeElement;
    state.isOpen = true;

    // Provider class toggles which controls show
    overlay.classList.toggle('is-iframe', providerClass === 'is-iframe');

    if (title) title.textContent = titleText || 'Video';
    if (link) link.href = watchUrl || '#';

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const closeBtn = overlay.querySelector(SELECTORS.close);
    if (closeBtn) closeBtn.focus();
  }

  function closePlayer() {
    const overlay = document.querySelector(SELECTORS.overlay);
    if (!overlay || !state.isOpen) return;

    state.isOpen = false;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Stop YouTube (if active)
    if (state.player && state.provider === 'youtube') {
      try { state.player.stopVideo(); } catch (_) {}
    }

    // Clear injected iframe (if active)
    if (state.provider === 'iframe') {
      ensureMountCleared();
    }

    setPlayUi(false);

    if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
      state.lastFocused.focus();
    }
  }

  // ----------------------------
  // Controls (YouTube only)
  // ----------------------------
  function togglePlay() {
    if (!state.player) return;
    try {
      const s = state.player.getPlayerState();
      if (s === window.YT.PlayerState.PLAYING) {
        state.player.pauseVideo();
        setPlayUi(false);
      } else {
        state.player.playVideo();
        setPlayUi(true);
      }
    } catch (_) {}
  }

  function toggleMute() {
    if (!state.player) return;
    try {
      const isMuted = state.player.isMuted();
      if (isMuted) {
        if (state.desiredVolume === 0) state.desiredVolume = 80;
        state.player.unMute();
        state.player.setVolume(state.desiredVolume);
        setMuteUi(false);
        syncVolumeUi(state.desiredVolume);
      } else {
        state.player.mute();
        setMuteUi(true);
      }
    } catch (_) {}
  }

  function setVolume(v) {
    state.desiredVolume = Math.max(0, Math.min(100, v));
    if (!state.player) return;
    try {
      state.player.setVolume(state.desiredVolume);
      if (state.desiredVolume === 0) {
        state.player.mute();
        setMuteUi(true);
      } else {
        state.player.unMute();
        setMuteUi(false);
      }
    } catch (_) {}
  }

  function toggleFullscreen() {
    const wrap = document.querySelector(SELECTORS.wrap);
    if (!wrap) return;

    const doc = document;
    const isFs = doc.fullscreenElement;

    if (!isFs) wrap.requestFullscreen?.().catch(() => {});
    else doc.exitFullscreen?.().catch(() => {});
  }

  // ----------------------------
  // Wiring
  // ----------------------------
  function wire() {
    const overlay = document.querySelector(SELECTORS.overlay);
    if (!overlay) return;

    // Samples
    document.querySelectorAll(SELECTORS.samples).forEach((card) => {
      card.setAttribute('role', card.getAttribute('role') || 'button');
      card.setAttribute('tabindex', card.getAttribute('tabindex') || '0');

      const handler = (evt) => {
        evt.preventDefault();

        const provider = (card.getAttribute('data-provider') || 'youtube').toLowerCase();
        const value = card.getAttribute('data-video');
        if (!value) return;

        const titleText =
          card.getAttribute('data-title') ||
          card.querySelector('.sample-title')?.textContent?.trim() ||
          'Video';

        const watchUrl =
          card.getAttribute('data-youtube-url') ||
          card.getAttribute('data-watch-url') ||
          (provider === 'youtube' ? `https://www.youtube.com/watch?v=${value}` : value);

        state.provider = provider;
        state.videoValue = value;
        state.watchUrl = watchUrl;

        if (provider === 'iframe') {
          openOverlay(titleText, watchUrl, 'is-iframe');
          openIframe(value);
          return;
        }

        // YouTube
        openOverlay(titleText, watchUrl, '');
        loadYouTubeApiOnce().then(() => {
          // Mount needs to exist; if previously used iframe, clear it first
          ensureMountCleared();
          ensureYouTubePlayer(value);
          if (state.player) loadYouTubeVideo(value);
        });
      };

      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') handler(e);
      });
    });

    // Close button
    overlay.querySelectorAll(SELECTORS.close).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closePlayer();
      });
    });

    // Click outside card closes
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePlayer();
    });

    // ESC closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePlayer();
    });

    // Controls
    overlay.querySelector(SELECTORS.btnPlay)?.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.provider !== 'youtube') return;
      togglePlay();
    });

    overlay.querySelector(SELECTORS.btnMute)?.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.provider !== 'youtube') return;
      toggleMute();
    });

    overlay.querySelector(SELECTORS.rangeVol)?.addEventListener('input', (e) => {
      if (state.provider !== 'youtube') return;
      const v = Number(e.target.value || 0);
      setVolume(v);
    });

    overlay.querySelector(SELECTORS.btnFs)?.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFullscreen();
    });
  }

  function onReady() {
    document.body.classList.add('is-ready');
    stampYear();
    wire();

    // default UI state
    setPlayUi(false);
    setMuteUi(false);
    syncVolumeUi(state.desiredVolume);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
