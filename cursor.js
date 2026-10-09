// Cursor glow with a fading trail. Skipped on touch/coarse pointers and for reduced motion.
(function () {
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || still) return;

  // Replace the system pointer with the custom ring everywhere.
  document.documentElement.classList.add("custom-cursor");

  var TRAIL_MS = 480;
  var TRAIL_MAX = 48;
  var RED = "255, 77, 85";

  // Trail canvas, drawn beneath the glow ring.
  var canvas = document.createElement("canvas");
  canvas.className = "cursor-trail";
  canvas.setAttribute("aria-hidden", "true");
  var ctx = canvas.getContext("2d");
  document.body.appendChild(canvas);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // Glow ring that follows the pointer with easing.
  var glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  var targetX = window.innerWidth / 2;
  var targetY = window.innerHeight / 2;
  var x = targetX;
  var y = targetY;
  var shown = false;
  var points = [];

  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    targetX = event.clientX;
    targetY = event.clientY;
    points.push({ x: event.clientX, y: event.clientY, t: performance.now() });
    if (points.length > TRAIL_MAX) points.shift();

    if (!shown) {
      shown = true;
      glow.classList.add("visible");
    }
    var hot = !!(event.target.closest && event.target.closest("a, button, input, .row, .card, [role='button']"));
    glow.classList.toggle("hot", hot);
  });

  // Hide the ring when the pointer leaves the browser window.
  document.documentElement.addEventListener("mouseleave", function () {
    shown = false;
    points = [];
    glow.classList.remove("visible");
  });

  function drawTrail(now) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    while (points.length && now - points[0].t > TRAIL_MS) points.shift();
    if (points.length < 2) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1];
      var b = points[i];
      var life = 1 - (now - b.t) / TRAIL_MS; // 1 when fresh, 0 when gone
      if (life <= 0) continue;
      ctx.strokeStyle = "rgba(" + RED + ", " + (life * 0.6).toFixed(3) + ")";
      ctx.lineWidth = 0.6 + life * 5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function frame(now) {
    x += (targetX - x) * 0.22;
    y += (targetY - y) * 0.22;
    glow.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
    drawTrail(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
