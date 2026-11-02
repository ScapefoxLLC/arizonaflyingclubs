// Staff comment moderation. The password is kept in sessionStorage for this
// tab only and sent with every request; the comments API checks it.
(function () {
  var root = document.getElementById("staff");
  if (!root) return;
  var api = root.getAttribute("data-api");
  var NAMES = {};
  ((window.AZFC || {}).clubs || []).forEach(function (c) { NAMES[c.slug] = c.name; });
  var TABS = [["pending", "Waiting"], ["approved", "Approved"], ["rejected", "Rejected"]];
  var pw = "", tab = "pending";

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function when(t) { return new Date(t * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }
  function store(v) { try { v ? sessionStorage.setItem("azfc_staff", v) : sessionStorage.removeItem("azfc_staff"); } catch (e) {} }
  function stored() { try { return sessionStorage.getItem("azfc_staff") || ""; } catch (e) { return ""; } }

  function call(data) {
    data.password = pw;
    return fetch(api, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) })
      .then(function (r) {
        return r.json().then(function (d) {
          if (r.status === 403) { signOut(d.error); throw new Error(d.error); }
          if (!r.ok) throw new Error(d.error || "Something went wrong.");
          return d;
        });
      });
  }

  function login(ev) {
    ev.preventDefault();
    var f = ev.target;
    pw = f.querySelector("#st_pw").value;
    call({ action: "login" }).then(function () { store(pw); load(); })
      .catch(function (e) { var m = f.querySelector(".comments__msg"); m.textContent = e.message; m.hidden = false; m.className = "comments__msg comments__msg--bad"; });
  }

  function signOut(why) {
    pw = ""; store("");
    root.innerHTML = '<form class="form staff__login"><div class="field"><label for="st_pw">Staff password</label>' +
      '<input id="st_pw" type="password" required autocomplete="current-password"></div>' +
      '<p class="comments__msg comments__msg--bad" role="status"' + (why ? "" : " hidden") + ">" + esc(why || "") + "</p>" +
      '<button class="btn" type="submit">Sign in</button></form>';
    root.querySelector("form").addEventListener("submit", login);
  }

  function load() {
    call({ action: "list", status: tab }).then(render).catch(function () {});
  }

  function render(d) {
    var counts = d.counts || {};
    var html = '<div class="staff__bar"><div class="staff__tabs">' + TABS.map(function (t) {
      return '<button class="btn ' + (t[0] === tab ? "" : "btn--ghost") + '" data-tab="' + t[0] + '">' + t[1] + " (" + (counts[t[0]] || 0) + ")</button>";
    }).join("") + '</div><button class="btn btn--ghost" data-out>Sign out</button></div>';
    if (!d.comments.length) html += '<p class="aside">Nothing here.</p>';
    html += d.comments.map(function (c) {
      var acts = {
        pending: [["approve", "Approve"], ["reject", "Reject"]],
        approved: [["reject", "Reject"], ["pending", "Move back to waiting"]],
        rejected: [["approve", "Approve"], ["pending", "Move back to waiting"]]
      }[c.status];
      return '<article class="scomment" data-id="' + c.id + '">' +
        '<p class="scomment__meta"><a href="clubs/' + esc(c.club) + '.html#comments">' + esc(NAMES[c.club] || c.club) + "</a> &middot; " + when(c.created) +
        (c.email ? ' &middot; <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") +
        (c.edited ? ' &middot; <span class="badge badge--todo">edited</span>' : "") + "</p>" +
        '<div class="field"><label>Name</label><input class="sc_name" maxlength="80" value="' + esc(c.name) + '"></div>' +
        '<div class="field"><label>Comment</label><textarea class="sc_body" rows="5" maxlength="3000">' + esc(c.body) + "</textarea></div>" +
        (c.edited ? '<details><summary class="aside">Original text</summary><p class="aside">' + esc(c.original_body).replace(/\n/g, "<br>") + "</p></details>" : "") +
        '<div class="scomment__acts">' +
        acts.map(function (a) { return '<button class="btn' + (a[0] === "approve" ? "" : " btn--ghost") + '" data-act="' + a[0] + '">' + a[1] + "</button>"; }).join("") +
        '<button class="btn btn--ghost" data-act="edit" hidden>Save changes</button></div></article>';
    }).join("");
    root.innerHTML = html;
  }

  root.addEventListener("click", function (ev) {
    var b = ev.target.closest("button");
    if (!b || b.closest("form")) return;  // the sign-in form handles its own button
    if (b.hasAttribute("data-out")) { signOut(); return; }
    if (b.getAttribute("data-tab")) { tab = b.getAttribute("data-tab"); load(); return; }
    var card = b.closest(".scomment"), act = b.getAttribute("data-act");
    if (!card || !act) return;
    var id = +card.getAttribute("data-id");
    var name = card.querySelector(".sc_name").value, body = card.querySelector(".sc_body").value;
    var dirty = card.hasAttribute("data-dirty");
    b.disabled = true;
    // Approving after an edit saves the edit first, so what goes live is what you see.
    var first = (act === "edit" || (dirty && act === "approve")) ? call({ action: "edit", id: id, name: name, body: body }) : Promise.resolve();
    first.then(function () { return act === "edit" ? null : call({ action: act, id: id }); })
      .then(load)
      .catch(function (e) { b.disabled = false; alert(e.message); });
  });

  root.addEventListener("input", function (ev) {
    var card = ev.target.closest(".scomment");
    if (!card) return;
    card.setAttribute("data-dirty", "");
    card.querySelector('[data-act="edit"]').hidden = false;
  });

  root.querySelector("form").addEventListener("submit", login);
  pw = stored();
  if (pw) load();
})();
