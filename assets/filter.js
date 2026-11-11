// Link-in filters for the club-type pages: ?filter=complex shows only clubs
// with a complex airplane, ?filter=high-performance only clubs with a high-
// performance one, ?filter=complex,high-performance clubs with both. Rows and
// cards carry data-tags (build.py tags_attr). Unknown filter names are ignored.
//
// ?area=phoenix or ?area=tucson shows only the clubs in that area (data-areas,
// also from tags_attr), and combines with ?filter=.
//
// Rates follow the filter: a rate with data-rates (build.py rates_attr) is
// replaced by the cheapest airplane that matches, and the table's data-sort
// with it, so ?filter=complex&sort=hourly sorts on the complex airplanes'
// rates. Loaded before sort.js for that reason.
(function () {
  var LABELS = { "complex": "a complex airplane", "high-performance": "a high-performance airplane" };
  var AREAS = { "phoenix": "in the Phoenix area", "tucson": "in the Tucson area" };
  var params = new URLSearchParams(location.search);
  var want = (params.get("filter") || "").split(/[\s,]+/).filter(function (f) { return LABELS[f]; });
  var area = AREAS[params.get("area")] ? params.get("area") : "";
  if (!want.length && !area) return;

  var shown = 0;
  document.querySelectorAll("[data-tags], [data-areas]").forEach(function (el) {
    var tags = (el.getAttribute("data-tags") || "").split(" ");
    var areas = (el.getAttribute("data-areas") || "").split(" ");
    var ok = want.every(function (f) { return tags.indexOf(f) !== -1; }) &&
             (!area || areas.indexOf(area) !== -1);
    el.hidden = !ok;
    if (ok && el.tagName === "ARTICLE") shown++;
  });

  if (want.length) {
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
  }

  var note = document.querySelector(".filternote");
  if (!note) return;
  var what = (area ? AREAS[area] : "") +
    (want.length ? (area ? " with " : "with ") + want.map(function (f) { return LABELS[f]; }).join(" and ") : "");
  var p = new URLSearchParams(location.search);
  p.delete("filter");
  p.delete("area");
  var all = location.pathname.split("/").pop() + (p.toString() ? "?" + p.toString() : "");
  note.innerHTML = (shown ? "Showing only " + (shown === 1 ? "the one club" : "the " + shown + " clubs") + " " + what + ". "
                          : "None of these clubs " + (area ? "is " : "has ") + what.replace(/^with /, "") + ". ") +
    (shown && want.length ? "Rates are for those airplanes. " : "") +
    '<a href="' + all + '">Show all clubs</a>';
  note.hidden = false;
})();
