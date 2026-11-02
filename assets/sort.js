// Sortable tables: click a column heading in a table.sortable to sort by it,
// click again to reverse. A cell's data-sort (a number) is used when present,
// otherwise its text. Cells with no value (data-sort="") always go last.
//
// A heading's data-key also lets a link pick the sort: ?sort=join_fee sorts by
// that column (lowest first), ?sort=-join_fee or &dir=desc reverses it. Clicking
// a heading updates ?sort= in the address bar, so the current view can be shared.
(function () {
  var params = new URLSearchParams(location.search);
  var want = params.get("sort") || "";
  var wantDir = want.charAt(0) === "-" || params.get("dir") === "desc" ? -1 : 1;
  want = want.replace(/^-/, "");

  document.querySelectorAll("table.sortable").forEach(function (table) {
    var heads = table.querySelectorAll("thead th");

    function sortBy(th, col, dir) {
      heads.forEach(function (h) { h.removeAttribute("aria-sort"); });
      th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
      var body = table.tBodies[0];
      var rows = [].slice.call(body.rows);
      function key(row) {
        var cell = row.cells[col];
        if (cell.hasAttribute("data-sort")) {
          var v = cell.getAttribute("data-sort");
          return v === "" ? null : +v;
        }
        return cell.textContent.trim().toLowerCase();
      }
      rows.sort(function (a, b) {
        var x = key(a), y = key(b);
        if (x === null || y === null) return x === y ? 0 : (x === null ? 1 : -1);
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
      rows.forEach(function (r) { body.appendChild(r); });
    }

    heads.forEach(function (th, col) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sortbtn";
      while (th.firstChild) btn.appendChild(th.firstChild);
      th.appendChild(btn);
      btn.addEventListener("click", function () {
        var dir = th.getAttribute("aria-sort") === "ascending" ? -1 : 1;
        sortBy(th, col, dir);
        if (th.dataset.key && history.replaceState) {
          var p = new URLSearchParams(location.search);
          p.delete("dir");
          p.set("sort", (dir === -1 ? "-" : "") + th.dataset.key);
          history.replaceState(null, "", "?" + p.toString() + location.hash);
        }
      });
      if (want && th.dataset.key === want) sortBy(th, col, wantDir);
    });
  });
})();
