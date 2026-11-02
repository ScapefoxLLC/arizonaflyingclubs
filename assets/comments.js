// Club page comments: show the approved comments from the comments API and
// submit new ones (held for staff approval). After a successful submit, a
// Web3Forms email tells Ted there is something to review.
(function () {
  var box = document.getElementById("comments");
  if (!box) return;
  var api = box.getAttribute("data-api");
  var club = box.getAttribute("data-club");
  var list = box.querySelector(".comments__list");
  var form = box.querySelector(".comments__form");
  var msg = box.querySelector(".comments__msg");

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function date(t) { return new Date(t * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  function say(text, bad) { msg.textContent = text; msg.hidden = false; msg.className = "comments__msg" + (bad ? " comments__msg--bad" : ""); }

  fetch(api + "?club=" + encodeURIComponent(club))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var cs = d.comments || [];
      list.innerHTML = cs.length ? cs.map(function (c) {
        return '<article class="comment"><p class="comment__by"><strong>' + esc(c.name) + "</strong> &middot; " + date(c.created) + "</p>" +
          esc(c.body).split(/\n{2,}/).map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; }).join("") + "</article>";
      }).join("") : '<p class="aside">No comments yet. Be the first to share your experience.</p>';
    })
    .catch(function () { list.innerHTML = '<p class="aside">Comments could not be loaded right now.</p>'; });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var btn = form.querySelector("button");
    var data = {
      action: "submit", club: club,
      name: form.elements.name.value, email: form.elements.email.value, body: form.elements.body.value,
      botcheck: form.elements.botcheck.checked ? "1" : ""
    };
    btn.disabled = true;
    fetch(api, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || "Something went wrong.");
        form.reset();
        say("Thank you! Your comment will appear here once it has been approved.");
        notify(data);
      })
      .catch(function (err) { say(err.message || "Something went wrong. Please try again.", true); })
      .then(function () { btn.disabled = false; });
  });

  function notify(d) {
    if (d.botcheck) return;
    var staff = new URL("../staff.html", location.href).href;
    fetch("https://api.web3forms.com/submit", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: box.getAttribute("data-key"),
        subject: "[AZ Flying Clubs] New comment to approve: " + box.getAttribute("data-club-name"),
        from_name: "Arizona Flying Clubs website",
        name: d.name, email: d.email || undefined,
        message: d.body + "\n\nApprove, edit or reject it at " + staff
      })
    }).catch(function () {});
  }
})();
