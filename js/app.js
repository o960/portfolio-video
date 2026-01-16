// app.js
/**
 * - Blue panel scroll scrub
 * - Mouse parallax on .blocks only
 * - Page indicator billboard on load
 * - Cloudinary <video> slideshow with billboard transitions + mute toggle
 *
 * COLLECTION page:
 * - Hover resize strip
 * - Click takeover to fullscreen detail
 * - Intro: tiles stack under one tile, then scatter into place
 * - Detail: swaps placeholder video using tile data-video
 * - Detail video: AUTOPLAYS (muted for browser policy)
 * - Exit: pauses + unloads detail video
 */

const panel = document.querySelector(".blue-panel");
const blocks = document.querySelector(".blocks");
const pageIndicator = document.querySelector(".corner-square .page-num");

// -------------------------------------------------
// UI SOUND EFFECTS (plug your SFX by setting src=... in HTML)
// -------------------------------------------------
const sfx = {
  click: document.getElementById("sfx-click"),
  hover: document.getElementById("sfx-hover"),
};

// Unlock audio after first user interaction (browser policy safe)
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  if (sfx.click) sfx.click.volume = 0.6;
  if (sfx.hover) sfx.hover.volume = 0.35;

  Object.values(sfx).forEach((audio) => {
    if (!audio) return;
    try {
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {});
    } catch {}
  });

  window.removeEventListener("pointerdown", unlockAudio);
}
window.addEventListener("pointerdown", unlockAudio);

// Utility: safe play (no overlap popping)
function playSFX(audioEl) {
  if (!audioEl || !audioUnlocked) return;
  try {
    audioEl.currentTime = 0;
    audioEl.play();
  } catch {}
}

// CLICK SFX
document.addEventListener("click", (e) => {
  const target = e.target.closest(".sfx-click");
  if (!target) return;
  playSFX(sfx.click);
});

// HOVER SFX (fires once per hover entry)
const hovered = new WeakSet();

document.addEventListener(
  "pointerenter",
  (e) => {
    const target = e.target.closest(".sfx-hover");
    if (!target || hovered.has(target)) return;

    hovered.add(target);
    playSFX(sfx.hover);
  },
  true
);

document.addEventListener(
  "pointerleave",
  (e) => {
    const target = e.target.closest(".sfx-hover");
    if (!target) return;

    hovered.delete(target);
  },
  true
);

// -------------------------------------------------
// Blue panel scrub (scroll)
// -------------------------------------------------
let progress = 0;
const SCROLL_SENSITIVITY = 0.0009;
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

if (panel && typeof gsap !== "undefined") gsap.set(panel, { yPercent: 100 });

function renderPanel() {
  if (!panel || typeof gsap === "undefined") return;
  gsap.set(panel, { yPercent: 100 - progress * 100 });
}

window.addEventListener(
  "wheel",
  (e) => {
    const overPanel = panel && panel.contains(e.target);
    if (overPanel && progress >= 0.999) return;

    e.preventDefault();
    progress = clamp(progress + e.deltaY * SCROLL_SENSITIVITY);
    renderPanel();
  },
  { passive: false }
);

// -------------------------------------------------
// Mouse-follow parallax (ONLY .blocks)
// -------------------------------------------------
let parallaxTween = null;

function applyParallax(e) {
  if (!blocks || typeof gsap === "undefined") return;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;

  const MAX = 2;
  const x = dx * MAX;
  const y = dy * MAX;

  if (parallaxTween) parallaxTween.kill();
  parallaxTween = gsap.to(blocks, { x, y, duration: 0.35, ease: "power3.out" });
}

function resetParallax() {
  if (!blocks || typeof gsap === "undefined") return;
  if (parallaxTween) parallaxTween.kill();
  parallaxTween = gsap.to(blocks, { x: 0, y: 0, duration: 0.6, ease: "power3.out" });
}

window.addEventListener("mousemove", applyParallax);
window.addEventListener("mouseleave", resetParallax);

// -------------------------------------------------
// Page indicator billboard on load
// -------------------------------------------------
window.addEventListener("load", () => {
  if (!pageIndicator || typeof gsap === "undefined") return;

  gsap.set(pageIndicator, { transformOrigin: "50% 50%" });

  gsap.fromTo(
    pageIndicator,
    { rotateY: -88, opacity: 0, scale: 0.98 },
    { rotateY: 0, opacity: 1, scale: 1, duration: 0.9, ease: "power3.out", delay: 0.12 }
  );

  gsap.to(pageIndicator, {
    rotateY: -2,
    duration: 0.12,
    ease: "power1.inOut",
    delay: 0.9,
    yoyo: true,
    repeat: 1,
  });
});

// -------------------------------------------------
// Cloudinary video slideshow (index page tile)
// -------------------------------------------------
const DEFAULT_SCALE = 1.06;

const VIDEO_SLIDES = [
  {
    src: "https://res.cloudinary.com/dxtebpiwh/video/upload/v1768364039/SS_01_MTV_l7v7dy.mp4",
    title: "CARLETON @ WESTERN Basketball Men's, 2025",
    channelName: "Mustangs TV",
    channelImg: "/assets/media/channel-placeholder.png",
    startAt: 0,
    offsetX: 0,
    offsetY: 0,
    scale: DEFAULT_SCALE,
  },
  {
    src: "https://res.cloudinary.com/dxtebpiwh/video/upload/v1768369044/The_Annual_Empire_Awards_Winners_Losers_and_Favorites_-_Empire_mcn2ds.mp4",
    title: "Empire Awards – Winners, Losers & Favorites, 2023",
    channelName: "Blockworks LLC",
    channelImg: "/assets/media/channel-placeholder.png",
    startAt: 386,
    offsetX: 30,
    offsetY: 0,
    scale: 1.18,
  },
  {
    src: "https://res.cloudinary.com/dxtebpiwh/video/upload/v1768369196/Mama_Bear_Clan_-_Comedy_Records_rfbrch.mp4",
    title: "Inside the Mama Bear, 2022",
    channelName: "Mama Bear Clan",
    channelImg: "/assets/media/channel-placeholder.png",
    startAt: 30,
    offsetX: 0,
    offsetY: 0,
    scale: DEFAULT_SCALE,
  },
];

const SLIDE_INTERVAL_MS = 15000;

let slideIndex = 0;
let slideTimer = null;
let isMuted = true;

const videoBlock = document.querySelector(".block--video");
const videoEl = document.getElementById("video-el");

const channelImgEl = document.getElementById("channel-img");
const channelTitleEl = document.getElementById("channel-title");
const channelDescEl = document.getElementById("channel-desc");
const muteBtn = document.getElementById("mute-toggle");

function updateOverlay(slide) {
  if (!slide) return;
  if (channelTitleEl) channelTitleEl.textContent = slide.channelName || "Video Gallery";
  if (channelDescEl) channelDescEl.textContent = slide.title || "Now playing";
  if (channelImgEl && slide.channelImg) channelImgEl.src = slide.channelImg;
}

function updateMuteUI() {
  if (!muteBtn) return;
  muteBtn.setAttribute("aria-pressed", String(!isMuted));

  const icon = muteBtn.querySelector(".mute-toggle__icon");
  const text = muteBtn.querySelector(".mute-toggle__text");
  if (icon) icon.textContent = isMuted ? "🔇" : "🔊";
  if (text) text.textContent = isMuted ? "Muted" : "Sound";
}

async function playVideoSafe() {
  if (!videoEl) return;
  try {
    await videoEl.play();
  } catch (err) {
    console.warn("Video play blocked/failing:", err);
  }
}

function buildVideoSrc(slide) {
  const start = Number(slide.startAt || 0);
  return start > 0 ? `${slide.src}#t=${start}` : slide.src;
}

function setSlide(i) {
  const slide = VIDEO_SLIDES[i];
  if (!slide || !videoEl) return Promise.resolve();

  updateOverlay(slide);

  videoEl.muted = isMuted;
  videoEl.volume = isMuted ? 0 : 1;

  const x = Number(slide.offsetX || 0);
  const y = Number(slide.offsetY || 0);
  const scale = Number(slide.scale || DEFAULT_SCALE);
  videoEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;

  const startTime = Number(slide.startAt || 0);

  videoEl.pause();
  videoEl.src = buildVideoSrc(slide);
  videoEl.load();

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      videoEl.removeEventListener("canplay", onCanPlay);
      videoEl.removeEventListener("seeked", onSeeked);
      videoEl.removeEventListener("timeupdate", onTimeUpdateOnce);
    };

    const done = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      playVideoSafe();
      resolve();
    };

    const onSeeked = () => requestAnimationFrame(done);
    const onTimeUpdateOnce = () => requestAnimationFrame(done);

    const onCanPlay = () => {
      const needsSeek =
        startTime > 0 &&
        (Number.isFinite(videoEl.currentTime)
          ? Math.abs(videoEl.currentTime - startTime) > 1
          : true);

      if (needsSeek) {
        try {
          videoEl.currentTime = startTime;
          videoEl.addEventListener("seeked", onSeeked, { once: true });
          videoEl.addEventListener("timeupdate", onTimeUpdateOnce, { once: true });
        } catch {
          requestAnimationFrame(done);
        }
      } else {
        requestAnimationFrame(done);
      }
    };

    videoEl.addEventListener("canplay", onCanPlay, { once: true });
    setTimeout(done, 1200);
  });
}

function loadSlideWithBillboard(i) {
  if (!videoBlock || typeof gsap === "undefined") {
    setSlide(i);
    return;
  }

  const tl = gsap.timeline();

  tl.to(videoBlock, {
    rotateY: 88,
    opacity: 0,
    duration: 0.38,
    ease: "power3.in",
  });

  tl.add(() => {
    tl.pause();
    setSlide(i).then(() => {
      gsap.set(videoBlock, { rotateY: -88 });
      tl.play();
    });
  });

  tl.to(videoBlock, {
    rotateY: 0,
    opacity: 1,
    duration: 0.48,
    ease: "power3.out",
  });
}

function nextSlide() {
  slideIndex = (slideIndex + 1) % VIDEO_SLIDES.length;
  loadSlideWithBillboard(slideIndex);
}

function startSlideshow() {
  if (slideTimer) clearInterval(slideTimer);
  slideTimer = setInterval(nextSlide, SLIDE_INTERVAL_MS);
}

if (muteBtn) {
  updateMuteUI();
  muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    updateMuteUI();

    if (videoEl) {
      videoEl.muted = isMuted;
      videoEl.volume = isMuted ? 0 : 1;
      playVideoSafe();
    }
  });
}

window.addEventListener("load", () => {
  if (!videoEl) return;

  setSlide(0).then(() => {
    if (videoBlock && typeof gsap !== "undefined") {
      gsap.fromTo(
        videoBlock,
        { rotateY: -35, opacity: 0.2 },
        { rotateY: 0, opacity: 1, duration: 0.55, ease: "power3.out" }
      );
    }
    startSlideshow();
  });
});

// -------------------------------------------------
// Main (index page) stagger intro on load
// -------------------------------------------------
window.addEventListener("load", () => {
  const main = document.querySelector("main.page");
  if (!main || typeof gsap === "undefined") return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;

  const items = main.querySelectorAll(".blocks > *");
  if (!items.length) return;

  gsap.from(items, {
    x: -28,
    opacity: 0,
    duration: 0.85,
    ease: "power3.out",
    stagger: 0.12,
    delay: 0.08,
    clearProps: "transform,opacity",
  });
});

// ===============================
// COLLECTION: hover resize + click takeover -> detail view
// + intro scatter into position
// + per-tile video swap via data-video (AUTOPLAY muted)
// ===============================
(() => {
  const strip = document.querySelector(".collection-strip");
  if (!strip || typeof gsap === "undefined") return;

  const tiles = Array.from(document.querySelectorAll(".collection-tile"));
  const overviewUI = Array.from(document.querySelectorAll('[data-ui="overview"]'));

  const detailView = document.querySelector(".collection-detail");
  const exitBtn = document.querySelector(".detail-exit");

  if (!detailView || tiles.length === 0) return;

  const ACTIVE_WIDTH = 55;
  const INACTIVE_WIDTH = (100 - ACTIVE_WIDTH) / Math.max(1, tiles.length - 1);
  const defaultActiveIndex = Math.min(1, tiles.length - 1);

  let isTransitioning = false;
  let isDetailOpen = false;
  let activeTile = null;

  gsap.set(detailView, { autoAlpha: 0 });
  detailView.setAttribute("aria-hidden", "true");

  function setActive(activeIndex, animate) {
    tiles.forEach((t) => t.classList.remove("is-active"));
    tiles[activeIndex]?.classList.add("is-active");

    const widths = tiles.map((_, i) => (i === activeIndex ? ACTIVE_WIDTH : INACTIVE_WIDTH));

    if (!animate) {
      tiles.forEach((t, i) => {
        t.style.width = `${widths[i]}%`;
      });
      return;
    }

    gsap.to(tiles, {
      width: (i) => `${widths[i]}%`,
      duration: 0.45,
      ease: "power4.out",
      overwrite: true,
      stagger: { each: 0.015, from: "center" },
    });
  }

  function scatterIntro() {
    isTransitioning = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchor = tiles[defaultActiveIndex] || tiles[0];
        if (!anchor) {
          isTransitioning = false;
          return;
        }

        const anchorRect = anchor.getBoundingClientRect();

        tiles.forEach((t, i) => {
          const r = t.getBoundingClientRect();
          const dx = anchorRect.left - r.left;

          gsap.set(t, {
            x: dx,
            y: 0,
            scale: 0.985,
            autoAlpha: 1,
            zIndex: 10 - i,
          });
        });

        gsap.to(tiles, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.95,
          ease: "expo.out",
          stagger: { each: 0.07, from: "center" },
          clearProps: "x,y,scale,zIndex",
          onComplete: () => {
            isTransitioning = false;
          },
        });
      });
    });
  }

  setActive(defaultActiveIndex, false);
  scatterIntro();

  tiles.forEach((tile, idx) => {
    tile.addEventListener("mouseenter", () => {
      if (isDetailOpen || isTransitioning) return;
      setActive(idx, true);
    });

    tile.addEventListener("focus", () => {
      if (isDetailOpen || isTransitioning) return;
      setActive(idx, true);
    });

    tile.addEventListener("click", (e) => {
      e.preventDefault();
      if (isDetailOpen || isTransitioning) return;
      openDetail(tile);
    });
  });

  strip.addEventListener("mouseleave", () => {
    if (isDetailOpen || isTransitioning) return;
    setActive(defaultActiveIndex, true);
  });

  if (exitBtn) {
    exitBtn.addEventListener("click", () => {
      if (isTransitioning || !isDetailOpen) return;
      closeDetail();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isDetailOpen && !isTransitioning) {
      closeDetail();
    }
  });

  function openDetail(tile) {
    isTransitioning = true;
    activeTile = tile;

    const title = tile.getAttribute("data-title") || "COLLECTION";
    const dh = document.querySelector(".detail-heading");
    if (dh) dh.textContent = title;

    const videoWrap = document.querySelector(".detail-video");
    const videoSrc = tile.getAttribute("data-video");

    if (videoWrap) {
      videoWrap.innerHTML = "";

      if (videoSrc) {
        const v = document.createElement("video");

        v.controls = true;
        v.playsInline = true;
        v.preload = "metadata";
        v.src = videoSrc;

        v.muted = true;
        v.autoplay = true;

        v.style.width = "100%";
        v.style.height = "100%";
        v.style.objectFit = "cover";
        v.style.display = "block";

        v.addEventListener("canplay", () => {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        });

        videoWrap.appendChild(v);
      } else {
        const ph = document.createElement("div");
        ph.className = "detail-video-placeholder";
        ph.textContent = "VIDEO PLACEHOLDER";
        videoWrap.appendChild(ph);
      }
    }

    detailView.classList.add("is-open");
    detailView.setAttribute("aria-hidden", "false");

    const rect = tile.getBoundingClientRect();

    tile.classList.add("is-selected");
    gsap.set(tile, {
      position: "fixed",
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      margin: 0,
      zIndex: 1001,
    });

    const detailItems = [
      document.querySelector(".detail-heading"),
      document.querySelector(".detail-video"),
      document.querySelector(".detail-writeup"),
    ].filter(Boolean);

    gsap.set(detailItems, { autoAlpha: 0, y: 12 });

    const others = tiles.filter((t) => t !== tile);

    const tl = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => {
        isTransitioning = false;
        isDetailOpen = true;
      },
    });

    tl.to(
      overviewUI,
      { autoAlpha: 0, duration: 0.25, stagger: 0.05 },
      0
    );

    tl.to(
      others,
      { autoAlpha: 0, duration: 0.22, stagger: { each: 0.03, from: "center" } },
      0
    );

    tl.to(
      tile,
      { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, duration: 0.65, ease: "expo.out" },
      0.05
    );

    tl.to(
      detailView,
      { autoAlpha: 1, duration: 0.2 },
      0.28
    );

    tl.to(
      detailItems,
      { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08, ease: "power4.out" },
      0.36
    );
  }

  function closeDetail() {
    isTransitioning = true;

    const tile = activeTile;
    if (!tile) {
      isTransitioning = false;
      return;
    }

    const videoWrap = document.querySelector(".detail-video");
    const vid = videoWrap ? videoWrap.querySelector("video") : null;
    if (vid) {
      try { vid.pause(); } catch {}
      vid.removeAttribute("src");
      try { vid.load(); } catch {}
    }

    const rectTarget = getTileReturnRect(tile);

    const detailItems = [
      document.querySelector(".detail-heading"),
      document.querySelector(".detail-video"),
      document.querySelector(".detail-writeup"),
    ].filter(Boolean);

    const others = tiles.filter((t) => t !== tile);

    const tl = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => {
        tile.classList.remove("is-selected");
        gsap.set(tile, { clearProps: "all" });

        gsap.set(others, { autoAlpha: 1 });
        gsap.set(overviewUI, { autoAlpha: 1 });

        detailView.classList.remove("is-open");
        detailView.setAttribute("aria-hidden", "true");
        gsap.set(detailView, { autoAlpha: 0 });

        setActive(defaultActiveIndex, false);

        isTransitioning = false;
        isDetailOpen = false;
        activeTile = null;
      },
    });

    tl.to(detailItems, { autoAlpha: 0, y: 10, duration: 0.25, stagger: 0.05 }, 0);
    tl.to(detailView, { autoAlpha: 0, duration: 0.18 }, 0.08);

    tl.to(
      tile,
      { left: rectTarget.left, top: rectTarget.top, width: rectTarget.width, height: rectTarget.height, duration: 0.6, ease: "expo.out" },
      0.12
    );

    tl.to(overviewUI, { autoAlpha: 1, duration: 0.2, stagger: 0.05 }, 0.34);
    tl.to(others, { autoAlpha: 1, duration: 0.22, stagger: { each: 0.03, from: "center" } }, 0.35);
  }

  function getTileReturnRect(tile) {
    const prev = {
      position: tile.style.position,
      left: tile.style.left,
      top: tile.style.top,
      width: tile.style.width,
      height: tile.style.height,
      zIndex: tile.style.zIndex,
    };

    tile.style.position = "";
    tile.style.left = "";
    tile.style.top = "";
    tile.style.width = "";
    tile.style.height = "";
    tile.style.zIndex = "";

    setActive(defaultActiveIndex, false);

    const rect = tile.getBoundingClientRect();

    tile.style.position = prev.position;
    tile.style.left = prev.left;
    tile.style.top = prev.top;
    tile.style.width = prev.width;
    tile.style.height = prev.height;
    tile.style.zIndex = prev.zIndex;

    return rect;
  }

  window.addEventListener("resize", () => {
    if (!isDetailOpen || !activeTile) return;
    gsap.set(activeTile, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
  });
  
})();

