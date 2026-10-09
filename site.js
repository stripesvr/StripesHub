// Copy-to-clipboard for command snippets. Each snippet sits in a .cmd row with a .btn-copy button.
(function () {
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
    var button = event.target.closest(".btn-copy");
    if (!button) return;

    var row = button.closest(".cmd");
    var code = row && row.querySelector("code");
    if (!code) return;

    var text = code.textContent.trim();
    if (!navigator.clipboard) {
      setLabel(button, "Failed", false);
      return;
    }

    navigator.clipboard.writeText(text).then(
      function () { setLabel(button, "Copied", true); },
      function () { setLabel(button, "Failed", false); }
    );
  });
})();
