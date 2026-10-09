// Shared behavior: copy buttons, copy-all, share link, live search, pointer sheen, scroll progress, toast.
(function () {
  var toastEl = null;
  var toastTimer = null;
  var progressEl = document.querySelector(".progress");

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML =
      '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    toastEl.appendChild(document.createTextNode(message));
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1900);
  }

  function copyText(text) {
    if (!navigator.clipboard) {
      return Promise.reject(new Error("Clipboard unavailable"));
    }
    return navigator.clipboard.writeText(text);
  }

  function setLabel(button, label, done) {
    var span = button.querySelector("span");
    if (!span) return;
    span.textContent = label;
    button.classList.toggle("is-done", !!done);
    clearTimeout(button._resetTimer);
    button._resetTimer = setTimeout(function () {
      span.textContent = "Copy";
      button.classList.remove("is-done");
    }, 1600);
  }

  document.addEventListener("click", function (event) {
    var copyBtn = event.target.closest(".btn-copy");
    if (copyBtn) {
      var row = copyBtn.closest(".cmd");
      var code = row && row.querySelector("code");
      if (!code) return;
      copyText(code.textContent.trim()).then(
        function () {
          setLabel(copyBtn, "Copied", true);
          toast("Command copied");
        },
        function () {
          setLabel(copyBtn, "Failed", false);
          toast("Copy failed. Select the text instead.");
        }
      );
      return;
    }

    var allBtn = event.target.closest("[data-copy-all]");
    if (allBtn) {
      var group = document.querySelector(allBtn.getAttribute("data-copy-all"));
      if (!group) return;
      var lines = Array.prototype.map.call(group.querySelectorAll("code"), function (c) {
        return c.textContent.trim();
      });
      copyText(lines.join("\n")).then(
        function () {
          toast("All " + lines.length + " commands copied");
        },
        function () {
          toast("Copy failed. Select the text instead.");
        }
      );
      return;
    }

    // Any element with data-copy-text copies that text. Links keep their default action,
    // so a "download + copy" link still downloads while it copies.
    var textBtn = event.target.closest("[data-copy-text]");
    if (textBtn) {
      copyText(textBtn.getAttribute("data-copy-text")).then(
        function () {
          toast("Copied to clipboard");
        },
        function () {
          toast("Copy failed. Select the text instead.");
        }
      );
      return;
    }

    var linkBtn = event.target.closest("[data-copy-link]");
    if (linkBtn) {
      copyText(window.location.href).then(
        function () {
          toast("Link copied");
        },
        function () {
          toast("Copy failed. Use the address bar instead.");
        }
      );
    }
  });

  // Live search: any input with data-filter filters the elements marked data-search inside its target.
  // Delegated, so it keeps working on pages swapped in by soft navigation.
  function applySearch(input) {
    var items = document.querySelectorAll(input.getAttribute("data-filter") + " [data-search]");
    var empty = document.querySelector("[data-empty]");
    var query = input.value.trim().toLowerCase();
    var shown = 0;
    Array.prototype.forEach.call(items, function (el) {
      var hit = !query || el.getAttribute("data-search").indexOf(query) !== -1;
      el.hidden = !hit;
      if (hit) shown++;
    });
    if (empty) empty.classList.toggle("show", shown === 0);
  }

  document.addEventListener("input", function (event) {
    if (event.target.matches && event.target.matches("[data-filter]")) applySearch(event.target);
  });

  document.addEventListener("keydown", function (event) {
    var active = document.activeElement;
    var typing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    if (event.key === "/" && !typing) {
      var search = document.querySelector("[data-filter]");
      if (search) {
        event.preventDefault();
        search.focus();
      }
    } else if (event.key === "Escape" && active && active.matches && active.matches("[data-filter]")) {
      active.value = "";
      applySearch(active);
      active.blur();
    }
  });

  // Scroll progress bar. Looked up on each update, so it follows soft navigation.
  function updateProgress() {
    var bar = document.querySelector(".progress");
    if (!bar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? window.scrollY / max : 0;
    bar.style.setProperty("--p", Math.min(1, Math.max(0, ratio)).toFixed(4));
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  document.addEventListener("stripes:navigated", updateProgress);
  updateProgress();

  // 3D tilt: buttons, rows, and cards lean toward the mouse. Mouse only; reduced motion stays flat.
  (function () {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var SELECTOR = ".row, .card, .btn";
    var current = null;

    function reset(el) {
      if (!el) return;
      el.style.removeProperty("--tx");
      el.style.removeProperty("--ty");
      if (current === el) current = null;
    }

    document.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") return;
      var el = event.target.closest && event.target.closest(SELECTOR);
      if (current && current !== el) reset(current);
      if (!el) return;

      current = el;
      var box = el.getBoundingClientRect();
      var tx = ((event.clientX - box.left) / box.width) * 2 - 1;
      var ty = ((event.clientY - box.top) / box.height) * 2 - 1;
      el.style.setProperty("--tx", tx.toFixed(3));
      el.style.setProperty("--ty", ty.toFixed(3));
    });

    document.documentElement.addEventListener("mouseleave", function () {
      reset(current);
    });
  })();

  // Scroll progress bar.
  if (progressEl) {
    var updateProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? window.scrollY / max : 0;
      progressEl.style.setProperty("--p", Math.min(1, Math.max(0, ratio)).toFixed(4));
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }
})();
