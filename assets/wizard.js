// Club wizard. Asks a few questions, scores every club in window.AZFC.clubs,
// and explains each suggestion. All the knobs that decide a match are in score().
(function () {
  var D = window.AZFC;
  var root = document.getElementById("wizard");
  if (!D || !root) return;

  var GOAL = {}; D.goals.concat(D.social_goals).forEach(function (g) { GOAL[g.key] = g; });
  var REGION = {}; D.regions.forEach(function (r) { REGION[r.key] = r; });
  var TYPE = {}; D.types.forEach(function (t) { TYPE[t.key] = t; });

  var STUDENT = 0, COMMERCIAL = 1200;
  var PHOENIX = ["phoenix-north", "east-valley", "west-valley"];

  var STEPS = [
    { id: "want", q: "What are you looking for?", kind: "one", opts: [
      { v: "fly", t: "A club with airplanes" },
      { v: "social", t: "A social club without airplanes", s: "BBQs, fly-outs, breakfasts and learning. I have, or rent, my own airplane, or am just interested in aviation." } ] },
    { id: "exp", q: "How much flying experience do you have?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: STUDENT, t: "I'm not a pilot yet, or I'm a student pilot" },
        { v: 60, t: "Private pilot, under 100 hours" },
        { v: 175, t: "100 to 250 hours" },
        { v: 500, t: "250 hours or more" },
        { v: COMMERCIAL, t: "More than 1,000 hours, with a commercial certificate" } ] },
    { id: "goals", q: "What do you want to do with the club?", hint: "Choose all that apply.", kind: "many",
      opts: function (a) {
        if (a.want === "social") return D.social_goals.map(function (g) { return { v: g.key, t: g.wizard }; });
        // Cost and area have their own questions, club size too (it replaces
        // "variety"), and every club has instructors. Order is Ted's.
        return [
          { v: "training", t: "Learn to fly" },
          { v: "slow", t: "Fly lower-performance aircraft" },
          { v: "fast", t: "Fly fast, high-performance aircraft" },
          { v: "fastest", t: "Fly the fastest airplanes I can find, price is not an object" },
          { v: "useful-load", t: "Fly an airplane with a high useful load" },
          { v: "rotor-twin", t: "Fly a helicopter or a twin" },
          { v: "long-xc", t: "Fly a few long cross-country trips a year" },
          { v: "build-time", t: "Build time" },
          { v: "low-util", t: "Belong to a club with low aircraft utilization, for easy scheduling" },
          { v: "fun", t: GOAL.fun.label }
        ];
      } },
    { id: "mexico", q: "Do you want to be able to fly to Mexico?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "No, or it doesn't matter" } ] },
    { id: "size", q: "What size of club would you prefer?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: "small", t: "One airplane and a handful of members" },
        { v: "large", t: "A larger club with a range of aircraft and many members" },
        { v: "either", t: "Either is fine" } ] },
    { id: "join", q: "How do you feel about up-front costs to join a club?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: "tight", t: "Keep them as low as possible" },
        { v: "balanced", t: "Good value matters, but so does the club" },
        { v: "any", t: "Cost is no issue" } ] },
    { id: "dues", q: "How do you feel about monthly costs?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: "tight", t: "Keep them as low as possible" },
        { v: "balanced", t: "Good value matters, but so does the club" },
        { v: "any", t: "Cost is no issue" } ] },
    { id: "rate", q: "How do you feel about hourly costs to fly the airplanes?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: "tight", t: "Keep them as low as possible" },
        { v: "balanced", t: "Good value matters, but so does the airplane" },
        { v: "any", t: "Cost is no issue; I want the best airplane for the job" } ] },
    { id: "hours", q: "How many hours a month do you expect to fly?", hint: "Used to estimate your monthly cost at each club.", kind: "range",
      skip: function (a) { return a.want === "social"; }, min: 1, max: 20, def: 3 },
    { id: "region", q: "Where are you located?", kind: "one",
      opts: function (a) {
        // Social clubs are either Phoenix-only or statewide, so two choices are enough.
        if (a.want === "social") return [{ v: "phoenix", t: "Phoenix area" }, { v: "outside", t: "Outside the Phoenix area" }];
        // Phoenix choices first, then the rest of the state.
        function opt(r) { return { v: r.key, t: r.label }; }
        var valley = D.regions.filter(function (r) { return PHOENIX.indexOf(r.key) !== -1; }).map(opt);
        var other = D.regions.filter(function (r) { return PHOENIX.indexOf(r.key) === -1; }).map(opt);
        return [{ v: "phoenix", t: "Anywhere in the Phoenix Metro area" }].concat(valley, other,
          [{ v: "anywhere", t: "Anywhere in the state" }]);
      } },
    { id: "involve", q: "What kind of club do you want to belong to?", kind: "one",
      skip: function (a) { return a.want === "social"; },
      opts: [
        { v: "owner", t: "A co-owner with a vote", s: "Equity club: shared airplane, shared insurance, members vote on club and maintenance decisions, no non-owned insurance" },
        { v: "renter", t: "Non-equity clubs", s: "Just let me book and fly. I'm OK with paying for non-owned insurance." },
        { v: "either", t: "Either is fine" } ] }
  ];

  var answers = {};
  var idx = 0;

  function active() { return STEPS.filter(function (s) { return !(s.skip && s.skip(answers)); }); }
  function optsOf(s) { return typeof s.opts === "function" ? s.opts(answers) : s.opts; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function usd(n) { return "$" + Math.round(n).toLocaleString(); }

  function renderStep() {
    var steps = active();
    var s = steps[idx];
    var pct = Math.round(idx / steps.length * 100);
    var body = "";
    if (s.kind === "range") {
      var v = answers[s.id] || s.def;
      body = '<div class="wiz__range"><input type="range" min="' + s.min + '" max="' + s.max + '" value="' + v + '" id="wr">' +
        '<output id="wro">' + v + " hrs</output></div>";
    } else {
      body = '<div class="wiz__opts">' + optsOf(s).map(function (o) {
        var type = s.kind === "many" ? "checkbox" : "radio";
        var cur = answers[s.id];
        var on = s.kind === "many" ? (cur || []).indexOf(o.v) !== -1 : cur === o.v;
        return '<label class="wiz__opt"><input type="' + type + '" name="w" value="' + esc(o.v) + '"' + (on ? " checked" : "") + '>' +
          "<span>" + esc(o.t) + (o.s ? "<small>" + esc(o.s) + "</small>" : "") + "</span></label>";
      }).join("") + "</div>";
    }
    root.innerHTML =
      '<div class="wiz__progress"><span style="width:' + pct + '%"></span></div>' +
      '<p class="wiz__step">Question ' + (idx + 1) + " of " + steps.length + "</p>" +
      '<h2 class="wiz__q">' + esc(s.q) + "</h2>" + (s.hint ? '<p class="aside">' + esc(s.hint) + "</p>" : "") + body +
      '<div class="wiz__nav"><button class="btn btn--ghost" id="wb"' + (idx === 0 ? " disabled" : "") + '>Back</button>' +
      '<button class="btn" id="wn">' + (idx === steps.length - 1 ? "Show my clubs" : "Next") + "</button></div>";

    var next = document.getElementById("wn");
    function sync() {
      if (s.kind === "range") return;
      var opts = optsOf(s);
      var picked = [].slice.call(root.querySelectorAll('input[name="w"]:checked')).map(function (i) {
        return opts.filter(function (o) { return String(o.v) === i.value; })[0].v;
      });
      answers[s.id] = s.kind === "many" ? picked : picked[0];
      next.disabled = s.kind === "one" && picked.length === 0;
    }
    if (s.kind === "range") {
      var r = document.getElementById("wr"), out = document.getElementById("wro");
      answers[s.id] = +r.value;
      r.addEventListener("input", function () { answers[s.id] = +r.value; out.textContent = r.value + " hrs"; });
    } else {
      root.querySelectorAll('input[name="w"]').forEach(function (i) { i.addEventListener("change", sync); });
      sync();
    }
    document.getElementById("wb").addEventListener("click", function () { idx--; renderStep(); });
    next.addEventListener("click", function () {
      if (idx < active().length - 1) { idx++; renderStep(); } else { renderResults(); }
      root.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  // Estimated monthly cost at the club's cheapest airplane: dues (or annual fee / 12),
  // plus hours beyond any included in the dues x (rate + fuel if dry).
  function monthly(c, a) {
    var fleet = (c.aircraft || []).filter(function (x) { return x.rate != null && !x.sim; });
    if (!fleet.length) return null;
    var hours = a.hours || 3;
    var dues = c.monthly_dues;
    if (a.exp === STUDENT && c.student_monthly_dues != null) dues = c.student_monthly_dues;
    if (dues == null) dues = c.annual_fee ? c.annual_fee / 12 : 0;
    var each = fleet.map(function (x) {
      var fuel = x.rate_basis === "dry" && x.gph_est ? x.gph_est * D.fuel_price : 0;
      return { hr: x.rate + fuel, ac: x, fuel: fuel };
    }).sort(function (p, q) { return p.hr - q.hr; });
    var lo = each[0], hi = each[each.length - 1];
    var billable = Math.max(0, hours - (c.included_hours || 0));
    return {
      total: dues + billable * lo.hr,
      high: dues + billable * hi.hr,
      model: lo.ac.model,
      highModel: hi.ac.model,
      approx: each.some(function (p) { return p.ac.rate_approx; }) || !!c.monthly_approx,
      fuelEst: each.some(function (p) { return p.fuel > 0; }),
      fuelMissing: each.some(function (p) { return p.ac.rate_basis === "dry" && !p.fuel; }),
      duesKnown: c.monthly_dues != null || !!c.annual_fee,
      included: c.included_hours || 0
    };
  }

  // Cheapest airplane per hour. A dry rate with a fuel estimate counts as wet.
  function cheapestHour(c) {
    var best = null;
    (c.aircraft || []).forEach(function (x) {
      if (x.rate == null || x.sim) return;
      var fuel = x.rate_basis === "dry" && x.gph_est;
      var p = { hr: x.rate + (fuel ? x.gph_est * D.fuel_price : 0), basis: fuel ? "wet, with estimated fuel" : x.rate_basis };
      if (!best || p.hr < best.hr) best = p;
    });
    return best;
  }

  // The three costs the wizard asks about. null = not known for this club.
  var COSTS = {
    join: function (c) { return c.join_fee != null ? c.join_fee + (c.application_fee || 0) : null; },
    dues: function (c, a) {
      if (a.exp === STUDENT && c.student_monthly_dues != null) return c.student_monthly_dues;
      if (c.monthly_dues != null) return c.monthly_dues;
      return c.annual_fee ? c.annual_fee / 12 : null;
    },
    // Cheapest airplane per hour, with estimated fuel added to dry rates.
    rate: function (c) { var p = cheapestHour(c); return p ? p.hr : null; }
  };
  var COST_WORDS = {
    join: { low: "One of the lowest costs to join", high: "One of the higher costs to join", none: "Cost to join not listed", fmt: function (v) { return usd(v); } },
    dues: { low: "Among the lowest monthly dues", high: "Among the higher monthly dues", none: "Monthly dues not listed", fmt: function (v) { return usd(v) + "/month"; } },
    rate: { low: "Among the cheapest to fly", high: "Among the more expensive to fly", none: "Hourly rates not listed", fmt: function (v, c) { var b = (cheapestHour(c) || {}).basis; return "from " + usd(v) + "/hr" + (b ? " " + b : ""); } }
  };

  function score(c, a, ranks) {
    var s = 0, why = [], but = [];
    var social = c.type === "social";
    var m = c.membership || {};

    if (a.want === "social" && !social) return null;
    if (a.want === "fly" && social) return null;
    if (c.gliders && (a.goals || []).indexOf("fun") === -1) return null;
    // Club-set limits (overrides.json): e.g. VARS is not for building time or 5+ hours a month.
    if ((c.not_for_goals || []).some(function (g) { return (a.goals || []).indexOf(g) !== -1; })) return null;
    if (c.max_monthly_hours && (a.hours || 3) > c.max_monthly_hours) return null;

    if (social) {
      s += a.want === "social" ? 4 : 2;
      why.push("Community: " + (c.yearly_dues ? usd(c.yearly_dues) + " a year" : "free to join"));
    }

    var hits = 0, misses = 0;
    (a.goals || []).forEach(function (g) {
      var lc = GOAL[g].label.charAt(0).toLowerCase() + GOAL[g].label.slice(1);
      if ((c.best_for || []).indexOf(g) !== -1) { hits++; s += 3; why.push("Good for " + lc); }
      else if (social) { misses++; but.push("Not for " + lc); }
    });

    if (!social) {
      // Each cost: rank 0 = cheapest of the clubs being compared, 1 = most expensive.
      ["join", "dues", "rate"].forEach(function (k) {
        var pref = a[k], r = ranks[k][c.slug], W = COST_WORDS[k];
        if (!pref || pref === "any") return;
        if (r == null) { but.push(W.none); return; }
        var w = pref === "tight" ? 2.5 : 1;
        s += w * (1 - 2 * r);
        var v = W.fmt(COSTS[k](c, a), c);
        if (r <= 0.25) why.push(W.low + " (" + v + ")");
        if (r >= 0.75) but.push(W.high + " (" + v + ")");
      });
    }

    var regions = c.regions || [];
    // "phoenix" covers all three Valley regions.
    var want = a.region === "phoenix" ? PHOENIX : [a.region];
    if (c.area === "statewide") { if (a.region && a.region !== "anywhere") s += 3; why.push("Open to pilots anywhere in Arizona"); }
    else if (a.region && a.region !== "anywhere" && c.area === "phoenix") {
      if (PHOENIX.indexOf(a.region) !== -1 || a.region === "phoenix") { s += 3; why.push("For pilots anywhere in the Phoenix area"); }
      else { s = -99; but.push("For Phoenix-area pilots"); }  // Phoenix-only: not a suggestion elsewhere
    } else if (a.region && a.region !== "anywhere" && regions.length) {
      if (regions.some(function (r) { return want.indexOf(r) !== -1; })) {
        s += 3;
        var local = (c.airports || []).filter(function (ap) { return D.airports[ap] && want.indexOf(D.airports[ap].region) !== -1; });
        why.push("In your area (" + local.join(", ") + ")");
      } else {
        s -= 3;
        but.push("Based at " + (c.airports || []).map(function (ap) { return D.airports[ap] ? D.airports[ap].name : ap; }).join(", "));
      }
    }

    if (!social && a.mexico === "yes") {
      // Club-wide rule, or failing that, what the aircraft notes say (Legacy varies by airplane).
      var some = (c.aircraft || []).some(function (x) { return /mexico allowed/i.test(x.notes || ""); });
      if (c.mexico === true) { s += 4; why.push("Mexico trips allowed"); }
      else if (c.mexico === false) { s -= 8; but.push("No Mexico trips"); }
      else if (some) { s += 3; why.push("Mexico trips allowed in some of its airplanes"); }
      else but.push("Ask the club about Mexico trips");
    }

    if (!social && a.size && a.size !== "either") {
      var planes = (c.aircraft || []).reduce(function (n, x) { return x.sim ? n : n + (x.count || 1); }, 0);
      var small = planes <= 1;
      if ((a.size === "small") === small) {
        s += 3;
        why.push(small ? "One airplane" + (m.cap ? ", up to " + m.cap + " members" : "") : planes + " aircraft to choose from");
      } else if (planes) {
        s -= 2;
        but.push(small ? "Only one airplane" : "A larger club (" + planes + " aircraft)");
      }
    }

    if (!social) {
      if (a.involve === "owner") {
        if (c.type === "traditional") { s += 3; why.push("Equity club: members vote, and no non-owned insurance"); }
        else { s -= 8; but.push("Not an equity club: the owners make the decisions"); }
      }
      if (a.involve === "renter" && c.type === "non-traditional") { s += 2; why.push("Book and fly; the owner runs the airplanes"); }
      if (c.non_owned_insurance === "required") but.push("You must carry your own non-owned insurance (add it to the cost)");
      if (c.non_owned_insurance === "recommended") but.push("Non-owned insurance recommended");
      if (a.exp === STUDENT && c.students === true) { s += 2; why.push("Accepts student pilots"); }
      if (a.exp === STUDENT && c.student_monthly_dues != null) why.push("Student pilots pay " + usd(c.student_monthly_dues) + " a month");
    }

    if (m.status === "waitlist") but.push("Wait list");
    if (m.status === "inactive") { s -= 3; but.push(m.status_note || "Currently inactive"); }
    if (m.status === "open") { s += 1; why.push(m.status_note || "Accepting new members"); }
    if ((c.flags || []).indexOf("rates_unconfirmed") !== -1) but.push("Rates are closely held and could not be confirmed");
    if ((c.flags || []).indexOf("rates_may_be_stale") !== -1) but.push("Rates may be out of date");

    // Experience gates: the wizard moves these to "Once you have more experience".
    var gate = "";
    if (!social) {
      if (c.min_hours && (a.exp || 0) < c.min_hours) gate = "Requires " + c.min_hours.toLocaleString() + " hours" + (c.commercial_required ? " and a commercial certificate" : "");
      else if (a.exp === STUDENT && (c.requires_ppl || c.students === false)) gate = "Requires a private pilot certificate";
      else if (c.commercial_required && a.exp < COMMERCIAL) gate = "Requires a commercial certificate";
    }

    // A club that does none of the things asked for isn't a suggestion.
    if ((a.goals || []).length && !hits) s = Math.min(s, 0);

    return { club: c, score: s, why: why, but: but, gate: gate, misses: misses, hits: hits };
  }

  function card(r, top, a) {
    var c = r.club, cost = c.type === "social" ? null : monthly(c, a);
    var costHtml = "";
    if (c.type !== "social") {
      if (cost) {
        var range = Math.round(cost.high) - Math.round(cost.total) >= 25;
        var note = [range ? cost.model + " to " + cost.highModel : cost.model];
        if (cost.included) note.push(cost.included + " hrs included in dues");
        if (cost.fuelEst) note.push("fuel estimated");
        if (!cost.duesKnown) note.push("dues not known");
        costHtml = '<p class="result__cost">About ' + usd(cost.total) + (range ? " to " + usd(cost.high) : "") + (cost.approx ? "?" : "") +
          " a month at " + (a.hours || 3) + " hrs" +
          (cost.fuelMissing ? " plus fuel" : "") + "<br><small>" + esc(note.join(", ")) + "</small></p>";
      } else {
        costHtml = '<p class="aside">Rates not listed.</p>';
      }
    }
    var lines = r.why.map(function (w) { return '<li class="why">' + esc(w) + "</li>"; }).join("") +
      r.but.map(function (b) { return '<li class="but">' + esc(b) + "</li>"; }).join("");
    return '<div class="result' + (top ? " result--top" : "") + '">' +
      '<h3><a href="clubs/' + c.slug + '.html">' + esc(c.name) + "</a></h3>" +
      '<p class="result__meta">' + esc(TYPE[c.type].short) + " club &middot; " + esc((c.airports || []).join(" / ")) + "</p>" +
      costHtml + "<ul>" + lines + "</ul></div>";
  }

  // Answers panel above the results, for tuning the wizard. Off unless the URL has ?debug=1.
  function debugAnswers(a) {
    var rows = active().map(function (s) {
      var v = a[s.id], t;
      if (s.kind === "range") t = (v || s.def) + " hrs";
      else {
        var opts = optsOf(s);
        t = [].concat(v == null ? [] : v).map(function (x) {
          var o = opts.filter(function (o) { return o.v === x; })[0];
          return o ? o.t : String(x);
        }).join("; ") || "(none)";
      }
      return "<li><strong>" + esc(s.q) + "</strong> " + esc(t) + "</li>";
    });
    return '<div class="aside" style="border:1px dashed currentColor;padding:.5em 1em;margin-bottom:1em"><p><strong>Your answers (debug)</strong></p><ul>' + rows.join("") + "</ul></div>";
  }

  function renderResults() {
    var a = answers;
    var pool = D.clubs.filter(function (c) {
      return a.want === "social" ? c.type === "social" : (a.want === "fly" ? c.type !== "social" : true);
    });
    // Rank the flying clubs on each cost so each cost answer can reward the cheaper ones.
    var ranks = {};
    Object.keys(COSTS).forEach(function (k) {
      var known = pool.filter(function (c) { return c.type !== "social" && COSTS[k](c, a) != null; })
        .sort(function (x, y) { return COSTS[k](x, a) - COSTS[k](y, a); });
      ranks[k] = {};
      var vals = known.map(function (c) { return COSTS[k](c, a); });
      known.forEach(function (c, i) {  // equal costs share a rank
        ranks[k][c.slug] = known.length > 1 ? vals.indexOf(vals[i]) / (known.length - 1) : 0;
      });
    });

    var scored = pool.map(function (c) { return score(c, a, ranks); }).filter(Boolean);
    var ok = scored.filter(function (r) { return !r.gate; }).sort(function (x, y) { return y.score - x.score; });
    // Social clubs: if any club does everything asked for, drop the ones that don't.
    if (a.want === "social" && ok.some(function (r) { return r.score > 0 && !r.misses; }))
      ok = ok.filter(function (r) { return !r.misses; });
    var later = scored.filter(function (r) { return r.gate && (r.hits || !(a.goals || []).length); });
    var top = ok.filter(function (r) { return r.score > 0; }).slice(0, 3);
    var rest = ok.filter(function (r) { return top.indexOf(r) === -1 && r.score > 0; }).slice(0, 4);
    var hidden = ok.length - top.length - rest.length;

    // The answers panel is for checking the wizard: add ?debug=1 to the URL to see it.
    var debug = /[?&]debug=1\b/.test(location.search);
    var html = (debug ? debugAnswers(a) : "") + '<h2 class="wiz__q">Your suggested clubs</h2>';
    if (!top.length && ok.length) {
      html += "<p>Nothing is a strong match for those answers. Here is everything that fits your experience; try widening the area or your goals.</p>";
      rest = ok;
      hidden = 0;
    }
    html += top.map(function (r, i) { return card(r, i === 0, a); }).join("");
    if (rest.length) html += "<h3>Also worth a look</h3>" + rest.map(function (r) { return card(r, false, a); }).join("");
    if (hidden > 0) html += '<p class="aside">' + hidden + " other club" + (hidden > 1 ? "s" : "") + " matched poorly and " + (hidden > 1 ? "are" : "is") +
      ' not shown. See them all on the <a href="choosing.html">Choosing a Club</a> page.</p>';
    if (later.length) {
      html += "<h3>Once you have more experience</h3>" + later.map(function (r) {
        r.but.unshift(r.gate);
        return card(r, false, a);
      }).join("");
    }
    if (a.want !== "social") {
      html += '<p class="aside">Cost estimates run from the cheapest to the most expensive airplane at each club, including monthly dues, and for dry rates a typical fuel burn at $' +
        D.fuel_price.toFixed(2) + "/gal. They leave out join fees, equity and non-owned insurance. Prices change; confirm with the club.</p>";
    }
    html += '<div class="wiz__nav"><button class="btn btn--ghost" id="wr2">Start over</button><a class="btn" href="choosing.html">Questions to ask a club</a></div>';
    root.innerHTML = html;
    document.getElementById("wr2").addEventListener("click", function () { answers = {}; idx = 0; renderStep(); });
  }

  renderStep();
})();
