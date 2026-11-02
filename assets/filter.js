// Link-in filters for the club-type pages: ?filter=complex shows only clubs
// with a complex airplane, ?filter=high-performance only clubs with a high-
// performance one, ?filter=complex,high-performance clubs with both. Rows and
// cards carry data-tags (build.py tags_attr). Unknown filter names are ignored.
//
// Rates follow the filter: a rate with data-rates (build.py rates_attr) is
// replaced by the cheapest airplane that matches, and the table's data-sort
// with it, so ?filter=complex&sort=hourly sorts on the complex airplanes'
// rates. Loaded before sort.js for that reason.
(function () {
  var LABELS = { "complex": "a complex airplane", "high-performance": "a high-performance airplane" };
  var raw = new URLSearchParams(location.search).get("filter") || "";
  var want = raw.split(/[\s,]+/).filter(function (f) { return LABELS[f]; });
  if (!want.length) return;

  var shown = 0;
  document.querySelectorAll("[data-tags]").forEach(function (el) {
    var tags = el.getAttribute("data-tags").split(" ");
    var ok = want.every(function (f) { return tags.indexOf(f) !== -1; });
    el.hidden = !ok;
    if (ok && el.tagName === "ARTICLE") shown++;
  });

  document.querySelectorAll("[data-rates]").forEach(function (el) {
    var match = JSON.parse(el.getAttribute("data-rates")).filter(function (r) {
      return want.every(function (f) { return r[2].indexOf(f) !== -1; });
    });
    if (!match.length) return;  // the club is hidden anyway
    match.sort(function (a, b) { return a[0] - b[0]; });
    var prefix = el.hasAttribute("data-prefix") && match.length > 1 ? "From " : "";
    el.textContent = prefix + match[0][1];
    if (el.hasAttribute("data-sort")) el.setAttribute("data-sort", match[0][0]);
  });

  var note = document.querySelector(".filternote");
  if (!note) return;
  var what = want.map(function (f) { return LABELS[f]; }).join(" and ");
  var p = new URLSearchParams(location.search);
  p.delete("filter");
  var all = location.pathname.split("/").pop() + (p.toString() ? "?" + p.toString() : "");
  note.innerHTML = (shown ? "Showing only the " + shown + " club" + (shown === 1 ? "" : "s") + " with " + what + ". "
                          : "None of these clubs has " + what + ". ") +
    (shown ? "Rates are for those airplanes. " : "") +
    '<a href="' + all + '">Show all clubs</a>';
  note.hidden = false;
})();
