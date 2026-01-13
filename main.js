(() => {
  // Keep desktop behavior consistent with your existing setup
  // ✅ FIX: align with your CSS breakpoint (>=1025px)
  const desktop = window.matchMedia("(min-width: 1025px)");
  if (!desktop.matches) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =========================================================
  // ✅ In-page Pop-out Video Players (no new tabs/windows)
  // - financial-media-motion.html uses: #ytModal + #ytPlayer
  // - broadcast-graphics.html uses: #mediaModalA + #ytPlayerA / #embedPlayerA
  // =========================================================

  let ytApiPromise = null;

  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve(window.YT);
      };

      // If script already injected, don't inject again
      if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });

    return ytApiPromise;
  }

  function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
  }

  // -------------------------
  // Financial page modal (YT)
  // -------------------------
  const ytModal = document.getElementById("ytModal");
  const ytPlayerEl = document.getElementById("ytPlayer");
  let ytPlayer = null;

  function openYtModal(videoId) {
    if (!ytModal || !ytPlayerEl || !videoId) return;

    ytModal.classList.add("is-open");
    ytModal.setAttribute("aria-hidden", "false");
    lockScroll(true);

    // clean mount
    ytPlayerEl.innerHTML = "";

    loadYouTubeAPI().then(() => {
      if (!ytModal.classList.contains("is-open")) return;

      ytPlayer = new YT.Player("ytPlayer", {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1
        }
      });

      // wire controls
      const playBtn = ytModal.querySelector("[data-yt-play]");
      const pauseBtn = ytModal.querySelector("[data-yt-pause]");
      const vol = ytModal.querySelector("[data-yt-volume]");

      if (playBtn) playBtn.onclick = () => ytPlayer?.playVideo?.();
      if (pauseBtn) pauseBtn.onclick = () => ytPlayer?.pauseVideo?.();
      if (vol) {
        vol.oninput = () => {
          const v = parseInt(vol.value, 10);
          ytPlayer?.setVolume?.(Number.isFinite(v) ? v : 0);
        };
      }
    });
  }

  function closeYtModal() {
    if (!ytModal) return;
    ytModal.classList.remove("is-open");
    ytModal.setAttribute("aria-hidden", "true");
    lockScroll(false);

    if (ytPlayer && ytPlayer.destroy) {
      ytPlayer.destroy();
      ytPlayer = null;
    }
    if (ytPlayerEl) ytPlayerEl.innerHTML = "";
  }

  // bind close for financial modal
  if (ytModal) {
    ytModal.querySelectorAll("[data-yt-close]").forEach(el => {
      el.addEventListener("click", (e) => { e.preventDefault(); closeYtModal(); });
    });
  }

  // bind financial tiles
  document.querySelectorAll(".yt-tile[data-yt-id]").forEach(tile => {
    tile.addEventListener("click", (e) => {
      e.preventDefault();
      const id = tile.getAttribute("data-yt-id");
      openYtModal(id);
    });
  });

  // --------------------------------
  // Broadcast page modal (YT + embed)
  // --------------------------------
  const mediaModal = document.getElementById("mediaModalA");
  const ytPlayerAEl = document.getElementById("ytPlayerA");
  const embedPlayerAEl = document.getElementById("embedPlayerA");
  const mediaHintAEl = document.getElementById("mediaHintA");
  let ytPlayerA = null;

  function showHint(msg) {
    if (!mediaHintAEl) return;
    mediaHintAEl.textContent = msg || "";
  }

  function openMediaModal() {
    if (!mediaModal) return;
    mediaModal.classList.add("is-open");
    mediaModal.setAttribute("aria-hidden", "false");
    lockScroll(true);
  }

  function closeMediaModal() {
    if (!mediaModal) return;
    mediaModal.classList.remove("is-open");
    mediaModal.setAttribute("aria-hidden", "true");
    lockScroll(false);

    // stop + cleanup
    if (ytPlayerA && ytPlayerA.destroy) {
      ytPlayerA.destroy();
      ytPlayerA = null;
    }
    if (ytPlayerAEl) ytPlayerAEl.innerHTML = "";

    if (embedPlayerAEl) {
      embedPlayerAEl.src = "about:blank";
      embedPlayerAEl.style.display = "none";
    }

    showHint("");
  }

  function openBroadcastYouTube(videoId) {
    if (!mediaModal || !ytPlayerAEl || !videoId) return;

    openMediaModal();

    // reset embed
    if (embedPlayerAEl) {
      embedPlayerAEl.src = "about:blank";
      embedPlayerAEl.style.display = "none";
    }

    // show YT slot
    ytPlayerAEl.style.display = "block";
    ytPlayerAEl.innerHTML = "";

    showHint("");

    loadYouTubeAPI().then(() => {
      if (!mediaModal.classList.contains("is-open")) return;

      ytPlayerA = new YT.Player("ytPlayerA", {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1
        }
      });

      const playBtn = mediaModal.querySelector("[data-media-play]");
      const pauseBtn = mediaModal.querySelector("[data-media-pause]");
      const vol = mediaModal.querySelector("[data-media-volume]");

      if (playBtn) {
        playBtn.disabled = false;
        playBtn.onclick = () => ytPlayerA?.playVideo?.();
      }
      if (pauseBtn) {
        pauseBtn.disabled = false;
        pauseBtn.onclick = () => ytPlayerA?.pauseVideo?.();
      }
      if (vol) {
        vol.oninput = () => {
          const v = parseInt(vol.value, 10);
          ytPlayerA?.setVolume?.(Number.isFinite(v) ? v : 0);
        };
      }
    });
  }

  function openBroadcastEmbed(url) {
    if (!mediaModal || !embedPlayerAEl || !url) return;

    openMediaModal();

    // cleanup YT
    if (ytPlayerA && ytPlayerA.destroy) {
      ytPlayerA.destroy();
      ytPlayerA = null;
    }
    if (ytPlayerAEl) {
      ytPlayerAEl.innerHTML = "";
      ytPlayerAEl.style.display = "none";
    }

    // show embed
    embedPlayerAEl.style.display = "block";
    embedPlayerAEl.src = url;

    const playBtn = mediaModal.querySelector("[data-media-play]");
    const pauseBtn = mediaModal.querySelector("[data-media-pause]");

    if (playBtn) playBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = true;

    showHint("This embedded player uses its own playback controls.");
  }

  // bind close for broadcast modal
  if (mediaModal) {
    mediaModal.querySelectorAll("[data-media-close]").forEach(el => {
      el.addEventListener("click", (e) => { e.preventDefault(); closeMediaModal(); });
    });
  }

  // bind broadcast tiles
  document.querySelectorAll(".media-tile-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const type = btn.getAttribute("data-media-type");
      if (type === "youtube") {
        openBroadcastYouTube(btn.getAttribute("data-media-id"));
      } else if (type === "embed") {
        openBroadcastEmbed(btn.getAttribute("data-media-url"));
      }
    });
  });

  // global escape closes whichever modal is open
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (ytModal?.classList.contains("is-open")) closeYtModal();
    if (mediaModal?.classList.contains("is-open")) closeMediaModal();
  });

  // =========================================================
  // ✅ EXISTING GSAP / HERO LOGIC (unchanged behavior)
  // =========================================================
  if (typeof gsap === "undefined") {
    // project pages still keep the in-page pop-out video feature above
    return;
  }

  // =========================
  // Flow circles (ScrollTrigger)
  // =========================

  if (prefersReduced) {
    const flowSteps = document.querySelectorAll(".flow-step");
    if (flowSteps.length) gsap.set(flowSteps, { opacity: 1, scale: 1, y: 0 });
  } else if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);

    // =========================================================
    // ✅ Footer: hide when you reach the bottom of the page,
    // and reappear as you scroll back up.
    // =========================================================
    const siteFooter = document.querySelector(".site-footer");
    if (siteFooter) {
      ScrollTrigger.create({
        trigger: document.documentElement,
        start: "bottom bottom",
        onEnter: () => siteFooter.classList.add("is-hidden"),
        onLeaveBack: () => siteFooter.classList.remove("is-hidden")
      });
    }

    const flowSection = document.querySelector(".flow-circles-section");
    const flowSteps = gsap.utils.toArray(".flow-step");

    if (flowSection && flowSteps.length) {
      gsap.set(flowSteps, { opacity: 0, scale: 0.88, y: 14 });

      gsap.to(flowSteps, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: flowSection,
          start: "top 70%",
          toggleActions: "play none none none"
        }
      });
    }
  } else {
    const flowSteps = document.querySelectorAll(".flow-step");
    if (flowSteps.length) gsap.set(flowSteps, { opacity: 1, scale: 1, y: 0 });
  }

  // =========================
  // Page indicator (billboard)
  // =========================
  const indicator = document.querySelector(".page-indicator");
  const cur = indicator?.querySelector(".page-indicator__num.is-current");
  const next = indicator?.querySelector(".page-indicator__num.is-next");

  let currentPage = 1;
  let flipping = false;

  function flipTo(num) {
    if (!indicator || !cur || !next) return;
    if (num === currentPage || flipping) return;

    // reduced motion: just update text
    if (prefersReduced) {
      cur.textContent = String(num);
      next.textContent = String(num);
      currentPage = num;
      return;
    }

    flipping = true;
    next.textContent = String(num);

    gsap.set(next, { opacity: 0, rotateX: 90 });

    const tl = gsap.timeline({
      defaults: { overwrite: true },
      onComplete: () => {
        cur.textContent = String(num);
        gsap.set(cur, { opacity: 1, rotateX: 0 });
        gsap.set(next, { opacity: 0, rotateX: 90 });

        currentPage = num;
        flipping = false;
      }
    });

    tl.to(cur, { duration: 0.22, rotateX: -90, opacity: 0, ease: "power2.in" }, 0);
    tl.to(next, { duration: 0.34, rotateX: 0, opacity: 1, ease: "power3.out" }, 0.06);
  }

  if (indicator && cur && next) {
    gsap.set(indicator, { opacity: 0, rotateX: 90, transformPerspective: 900 });
    gsap.to(indicator, { opacity: 1, rotateX: 0, duration: 0.55, ease: "power3.out", delay: 0.05 });
  }

  // =========================
  // ✅ Indicator should ONLY track 3 sections:
  // 1) hero  2) workflow  3) blue
  // =========================
  if (typeof ScrollTrigger !== "undefined" && indicator && cur && next) {
    gsap.registerPlugin(ScrollTrigger);

    const sections = [
      document.querySelector(".hero"),
      document.querySelector("#workflow"),
      document.querySelector("#blue")
    ].filter(Boolean);

    // Ensure correct initial value
    cur.textContent = "1";
    next.textContent = "1";
    currentPage = 1;

    sections.forEach((sec, i) => {
      const pageNum = i + 1;
      ScrollTrigger.create({
        trigger: sec,
        start: "top 55%",
        end: "bottom 55%",
        onEnter: () => flipTo(pageNum),
        onEnterBack: () => flipTo(pageNum)
      });
    });
  }

  // =========================
  // Hover preview logic
  // =========================
  const coverPlates = gsap.utils.toArray(".plate.cover:not(#leftBig)");

  // ✅ Apply authored covers
  coverPlates.forEach(plate => {
    const src = plate.dataset.cover;
    if (src) plate.style.backgroundImage = `url(${src})`;
  });

  let previewEl = null;

  function ensurePreviewEl() {
    if (previewEl) return previewEl;
    previewEl = document.createElement("div");
    previewEl.className = "hover-preview";
    previewEl.innerHTML = `
      <div class="hover-preview__media"></div>
      <div class="hover-preview__meta"></div>
    `;
    document.body.appendChild(previewEl);
    return previewEl;
  }

  function positionPreview(anchorRect) {
    const el = ensurePreviewEl();
    const pad = 12;
    const w = el.offsetWidth || 360;
    const h = el.offsetHeight || 240;

    let left = anchorRect.right + pad;
    let top = anchorRect.top + Math.min(24, anchorRect.height * 0.15);

    if (left + w > window.innerWidth - pad) left = anchorRect.left - w - pad;
    left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
    top = Math.max(pad, Math.min(window.innerHeight - h - pad, top));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  function showPreview(plate) {
    const el = ensurePreviewEl();
    const media = el.querySelector(".hover-preview__media");
    media.style.backgroundImage = plate.dataset.cover ? `url(${plate.dataset.cover})` : "";
    positionPreview(plate.getBoundingClientRect());
    el.style.display = "block";
    gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.18 });
  }

  function hidePreview() {
    if (!previewEl) return;
    gsap.to(previewEl, {
      opacity: 0, y: 8, duration: 0.2,
      onComplete: () => previewEl.style.display = "none"
    });
  }

  coverPlates.forEach(plate => {
    plate.addEventListener("mouseenter", () => showPreview(plate));
    plate.addEventListener("mouseleave", hidePreview);
  });

  // =========================================================
  // ✅ HERO PARALLAX + TILE FOREGROUND HOVER (FIXED TO YOUR DOM)
  // - Uses #group and #group .plate (your actual hero structure)
  // =========================================================
  if (!prefersReduced) {
    const hero = document.querySelector(".hero");
    const group = document.getElementById("group");
    const heroTiles = gsap.utils.toArray("#group .plate");

    if (hero && group && heroTiles.length) {
      const strength = 10;

      const toX = gsap.quickTo(group, "x", { duration: 0.35, ease: "power3.out" });
      const toY = gsap.quickTo(group, "y", { duration: 0.35, ease: "power3.out" });

      hero.addEventListener("mousemove", (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        toX(x * strength);
        toY(y * strength);
      });

      hero.addEventListener("mouseleave", () => {
        toX(0);
        toY(0);
      });

      // Foreground hover (z-index pop + slight scale)
      let hoverZ = 2000;

      heroTiles.forEach((tile) => {
        if (!tile.dataset.z0) {
          const z0 = window.getComputedStyle(tile).zIndex;
          tile.dataset.z0 = (z0 && z0 !== "auto") ? z0 : "2";
        }

        tile.addEventListener("pointerenter", () => {
          hoverZ += 1;
          tile.style.zIndex = String(hoverZ);

          gsap.to(tile, {
            scale: 1.02,
            duration: 0.18,
            ease: "power2.out",
            overwrite: true
          });
        });

        tile.addEventListener("pointerleave", () => {
          gsap.to(tile, {
            scale: 1,
            duration: 0.22,
            ease: "power3.out",
            overwrite: true,
            onComplete: () => {
              tile.style.zIndex = tile.dataset.z0 || "";
            }
          });
        });
      });

      // Stagger intro on load (subtle, does not change layout)
      const introEls = [
        ...gsap.utils.toArray("#group .plate"),
        ...gsap.utils.toArray("#group .heroTitleBlock"),
        ...gsap.utils.toArray("#group .workSamplesTagWrap"),
        ...gsap.utils.toArray("#group .label")
      ].filter(Boolean);

      if (introEls.length) {
        gsap.set(introEls, { opacity: 0, y: 10 });
        gsap.to(introEls, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          ease: "power3.out",
          stagger: 0.045,
          delay: 0.05
        });
      }
    }
  }
})();
