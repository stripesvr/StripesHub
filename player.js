// Shared player. Loaded on every page so the track, the lightning, and the music toggle
// keep running while the visitor moves around the site. Internal links swap only the
// page content (no full reload), so the audio element is never torn down.
(function () {
  "use strict";

  var SONG = "song.mp3";
  var VOLUME = 0.05;      // background volume, 0.0 to 1.0
  var START_AT = 7;       // seconds to skip into the track on a fresh start
  var STORE = "stripes_music";

  var audio = document.getElementById("bg-audio");
  var canvas = document.getElementById("lightning-canvas");
  var ctx = canvas ? canvas.getContext("2d") : null;
  if (!audio || !canvas) return;

  var audioCtx = null;
  var analyser = null;
  var freq = null;
  var graphReady = false;
  var playing = false;
  var rafId = 0;

  // Beat detection state.
  var prevEnergy = 0;
  var fluxHistory = [];
  var lastHit = 0;
  var strikes = [];
  var flash = 0;
  var beats = 0;

  var W = 0;
  var H = 0;

  // ---------- Storage (per tab, survives full page loads) ----------

  function readSaved() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || "null"); } catch (e) { return null; }
  }

  function save() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ t: audio.currentTime || 0, playing: playing }));
    } catch (e) { /* storage blocked: playback still works, it just will not resume */ }
  }

  // ---------- Audio ----------

  function ensureSrc(startAt) {
    if (audio.getAttribute("src")) return;
    audio.src = SONG;
    if (startAt != null) {
      audio.addEventListener("loadedmetadata", function () { audio.currentTime = startAt; }, { once: true });
    }
  }

  // The audio graph can only be created after a user gesture, so it is built on the first play.
  function ensureGraph() {
    if (graphReady) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      freq = new Uint8Array(analyser.frequencyBinCount);
      audioCtx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(audioCtx.destination);
      graphReady = true;
      if (playing) startLoop();
    } catch (err) {
      console.error("Audio graph unavailable:", err);
    }
  }

  function play() {
    ensureSrc(START_AT);
    audio.volume = VOLUME;
    audio.loop = true;
    ensureGraph();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    var attempt = audio.play();
    if (attempt && attempt.catch) attempt.catch(function (err) { console.error("Playback blocked:", err); });
  }

  function pause() {
    audio.pause();
  }

  // Try to resume a track from the previous page without a gesture. Browsers may refuse it,
  // in which case the toggle simply shows "Music off" until the visitor presses it.
  function tryResume(saved) {
    ensureSrc(null);
    audio.volume = VOLUME;
    audio.loop = true;
    audio.addEventListener("loadedmetadata", function () { audio.currentTime = saved.t; }, { once: true });
    var attempt = audio.play();
    if (attempt && attempt.then) {
      attempt.then(function () { ensureGraph(); if (audioCtx && audioCtx.state === "suspended") audioCtx.resume(); }, function () {});
    }
  }

  // ---------- Lightning ----------

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeBolt(power) {
    var segs = 14 + Math.round(power * 6);
    var spread = 80 + power * 70;
    var main = [{ x: Math.random() * W, y: -10 }];
    for (var i = 1; i <= segs; i++) {
      var prev = main[i - 1];
      var drift = (Math.random() - 0.5) * spread * (1 - (i / segs) * 0.35);
      main.push({ x: prev.x + drift, y: (H + 20) * (i / segs) - 10 });
    }
    var branches = [];
    for (var j = 2; j < main.length - 2; j++) {
      if (Math.random() < 0.2) {
        var side = Math.random() < 0.5 ? -1 : 1;
        var len = 3 + Math.floor(Math.random() * 4);
        var pts = [main[j]];
        for (var k = 1; k <= len; k++) {
          var p = pts[k - 1];
          pts.push({ x: p.x + side * (16 + Math.random() * 18), y: p.y + 20 + Math.random() * 16 });
        }
        branches.push(pts);
      }
    }
    return { main: main, branches: branches, life: 1, power: power };
  }

  function strike(power) {
    if (strikes.length >= 3) strikes.shift();
    strikes.push(makeBolt(power));
    flash = Math.max(flash, 0.1 + power * 0.16);
    beats += 1;
  }

  function strokePath(pts, width, color, blur) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowBlur = blur;
    ctx.shadowColor = "rgba(255, 40, 50, 0.9)";
    ctx.stroke();
  }

  function drawBolt(b) {
    var a = b.life;
    var w = 2 + b.power * 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokePath(b.main, w * 3, "rgba(255, 60, 70, " + (0.42 * a).toFixed(3) + ")", 34);
    b.branches.forEach(function (br) {
      strokePath(br, w * 1.5, "rgba(255, 60, 70, " + (0.38 * a).toFixed(3) + ")", 18);
    });
    strokePath(b.main, w, "rgba(255, 255, 255, " + a.toFixed(3) + ")", 10);
    b.branches.forEach(function (br) {
      strokePath(br, w * 0.6, "rgba(255, 255, 255, " + (0.75 * a).toFixed(3) + ")", 6);
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (flash > 0.01) {
      ctx.fillStyle = "rgba(255, 50, 60, " + flash.toFixed(3) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    flash *= 0.84;
    strikes = strikes.filter(function (b) { return b.life > 0.03; });
    strikes.forEach(function (b) {
      drawBolt(b);
      b.life *= 0.8;
    });
    ctx.shadowBlur = 0;
  }

  function tick(now) {
    rafId = 0;
    if (!playing) {
      ctx.clearRect(0, 0, W, H);
      return;
    }
    if (!analyser) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    analyser.getByteFrequencyData(freq);
    // Bass: the lowest few bins, roughly 0 to 375 Hz at 48 kHz.
    var energy = (freq[0] + freq[1] + freq[2] + freq[3]) / 4;

    // Onset detection: a hit is a sudden rise in bass energy above its recent average.
    var rise = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
    fluxHistory.push(rise);
    if (fluxHistory.length > 45) fluxHistory.shift();
    var mean = 0;
    for (var i = 0; i < fluxHistory.length; i++) mean += fluxHistory[i];
    mean /= fluxHistory.length;
    var threshold = mean * 1.5 + 3;

    if (rise > threshold && energy > 70 && now - lastHit > 130) {
      lastHit = now;
      strike(Math.min(1, 0.35 + rise / (threshold * 2.5)));
    }

    document.documentElement.style.setProperty("--beat-glow", (energy / 255 * 40).toFixed(1) + "px");
    render();
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  // ---------- Music toggle (bottom-left dock) ----------

  var toggle = document.querySelector(".music-toggle");

  function updateToggle() {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    toggle.querySelector(".music-label").textContent = playing ? "Music on" : "Music off";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      if (playing) pause(); else play();
    });
  }

  // ---------- Audio events ----------

  audio.addEventListener("play", function () {
    playing = true;
    updateToggle();
    save();
    startLoop();
  });

  audio.addEventListener("pause", function () {
    playing = false;
    updateToggle();
    document.documentElement.style.setProperty("--beat-glow", "0px");
    save();
  });

  var lastSave = 0;
  audio.addEventListener("timeupdate", function () {
    var now = Date.now();
    if (now - lastSave > 1000) {
      lastSave = now;
      save();
    }
  });

  window.addEventListener("pagehide", save);
  window.addEventListener("resize", resize);
  resize();

  // ---------- Home gate: subscribe lock and click-to-enter ----------

  // The gate is shown on every full page load. Moving between pages on the site
  // (soft navigation) keeps the visitor's choice in memory, so the gate stays dismissed.
  var entered = false;

  function subscribeLock() {
    var container = document.getElementById("menu-links");
    var modal = document.getElementById("subscription-modal");
    var subBtn = document.getElementById("subscribe-action-btn");
    var verifyBtn = document.getElementById("verify-action-btn");
    var errorMsg = document.getElementById("locker-error");
    if (!container || !modal) return;

    var visited = null;
    try { visited = localStorage.getItem("stripes_visited"); } catch (e) { /* ignore */ }

    if (visited) {
      modal.style.display = "none";
      container.style.display = "flex";
      return;
    }

    container.style.display = "none";
    modal.style.display = "block";
    var clickedSubscribe = false;

    subBtn.addEventListener("click", function () {
      clickedSubscribe = true;
      errorMsg.style.display = "none";
    });

    verifyBtn.addEventListener("click", function () {
      if (!clickedSubscribe) {
        errorMsg.style.display = "block";
        return;
      }
      try { localStorage.setItem("stripes_visited", "true"); } catch (e) { /* ignore */ }
      modal.style.display = "none";
      container.style.display = "flex";
    });
  }

  // Click-to-enter gate on every page.
  function bindGate() {
    var overlay = document.getElementById("overlay-screen");
    var site = document.getElementById("site-content");
    if (!overlay) return;

    if (entered) {
      overlay.classList.add("hidden");
      if (site) site.classList.add("active");
      return;
    }

    overlay.onclick = function () {
      var status = document.getElementById("enter-status");
      if (status) status.textContent = "Loading Track...";
      entered = true;
      overlay.classList.add("hidden");
      if (site) site.classList.add("active");
      play();
    };
  }

  function bindHome() {
    bindGate();
    subscribeLock();
  }

  // ---------- Soft navigation ----------

  function isSoftLink(a) {
    if (!a || a.target || a.hasAttribute("download")) return false;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return /\.html$|\/$/.test(url.pathname);
  }

  function swapTo(url, push) {
    fetch(url, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, "text/html");
        var incoming = doc.getElementById("app");
        var current = document.getElementById("app");
        if (!incoming || !current || doc.body.hasAttribute("data-full-nav")) {
          location.href = url;
          return;
        }

        document.title = doc.title;
        var newDesc = doc.querySelector('meta[name="description"]');
        var oldDesc = document.querySelector('meta[name="description"]');
        if (newDesc && oldDesc) oldDesc.setAttribute("content", newDesc.getAttribute("content"));
        document.body.className = doc.body.className;

        current.replaceWith(document.adoptNode(incoming));
        // The home page brings its own gate inside the swapped content, so drop any leftover gate.
        if (document.querySelector("#app #overlay-screen")) {
          document.querySelectorAll("body > #overlay-screen").forEach(function (el) { el.remove(); });
        }
        if (push) history.pushState({}, "", url);
        window.scrollTo(0, 0);
        afterSwap();
      })
      .catch(function () {
        location.href = url;
      });
  }

  function afterSwap() {
    bindHome();
    document.dispatchEvent(new CustomEvent("stripes:navigated"));
  }

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var a = event.target.closest && event.target.closest("a[href]");
    if (!isSoftLink(a)) return;
    event.preventDefault();
    swapTo(a.href, true);
  });

  window.addEventListener("popstate", function () {
    swapTo(location.href, false);
  });

  // ---------- Start ----------

  var saved = readSaved();
  if (saved && saved.t > 0) {
    ensureSrc(null);
    if (saved.playing) tryResume(saved);
    else audio.addEventListener("loadedmetadata", function () { audio.currentTime = saved.t; }, { once: true });
  }

  updateToggle();
  bindHome();

  // Exposed for debugging and tests.
  window.StripesPlayer = {
    isPlaying: function () { return playing; },
    beats: function () { return beats; }
  };
})();
