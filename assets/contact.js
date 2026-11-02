// Contact form: show the fields for the chosen topic, prefill from the URL
// (?topic=revision&club=slug), and build a useful email subject on submit.
(function () {
  var form = document.getElementById("contact");
  if (!form) return;
  var params = new URLSearchParams(location.search);
  var LABELS = { "new-club": "New club", revision: "Correction", comment: "Comment", author: "Message for the author" };

  function topic() {
    var r = form.querySelector('input[name="topic"]:checked');
    return r ? r.value : "";
  }

  function update() {
    var t = topic();
    form.querySelectorAll("[data-show]").forEach(function (el) {
      var on = el.getAttribute("data-show").split(" ").indexOf(t) !== -1;
      el.hidden = !on;
      // Hidden fields must not be submitted or block validation.
      el.querySelectorAll("input, select, textarea").forEach(function (f) { f.disabled = !on; });
    });
    var club = form.querySelector("#club");
    club.required = (t === "revision" || t === "comment");
    form.querySelector("#club_name").required = (t === "new-club");
  }

  var pre = params.get("topic");
  if (pre) {
    var radio = form.querySelector('input[name="topic"][value="' + pre + '"]');
    if (radio) radio.checked = true;
  }
  if (params.get("club")) form.querySelector("#club").value = params.get("club");
  if (params.get("type")) form.querySelector("#club_type").value = params.get("type");
  form.querySelectorAll('input[name="topic"]').forEach(function (r) { r.addEventListener("change", update); });
  update();

  var keyMissing = form.getAttribute("data-key-missing") === "1";
  if (keyMissing) document.getElementById("keywarn").hidden = false;

  form.addEventListener("submit", function (ev) {
    if (keyMissing) { ev.preventDefault(); document.getElementById("keywarn").scrollIntoView({ block: "center" }); return; }
    var t = topic();
    var about = "";
    if (t === "revision" || t === "comment") {
      var sel = form.querySelector("#club");
      about = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : "";
    } else if (t === "new-club") {
      about = form.querySelector("#club_name").value;
    }
    form.querySelector('input[name="subject"]').value =
      "[AZ Flying Clubs] " + (LABELS[t] || "Message") + (about ? ": " + about : "");
    form.querySelector('input[name="redirect"]').value = new URL("thanks.html", location.href).href;
  });
})();
