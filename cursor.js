// Soft cursor glow that trails the pointer and grows over interactive elements.
// Skipped on touch/coarse pointers and when the viewer prefers reduced motion.
(function () {
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine || still) return;

  var glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  var targetX = window.innerWidth / 2;
  var targetY = window.innerHeight / 2;
  var x = targetX;
  var y = targetY;
  var shown = false;

  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!shown) {
      shown = true;
      glow.classList.add("visible");
    }
    var hot = !!(event.target.closest && event.target.closest("a, button, input, .row, .card, [role='button']"));
    glow.classList.toggle("hot", hot);
  });

  document.addEventListener("pointerleave", function () {
    shown = false;
    glow.classList.remove("visible");
  });

  function frame() {
    x += (targetX - x) * 0.2;
    y += (targetY - y) * 0.2;
    glow.style.transform = "translate(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px)";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
