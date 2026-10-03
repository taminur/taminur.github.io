const REL = {
  M: [
    ["husband", "Husband"],
    ["son", "Son"],
    ["ss", "Son's Son"],
    ["psS", "Grandson via predeceased son"],
    ["pdS", "Grandson via predeceased daughter"],
    ["f", "Father"],
    ["gf", "Grandfather (paternal)"],
    ["fb", "Full Brother"],
    ["cb", "Consanguine Brother"],
    ["ub", "Uterine Brother"],
    ["fn", "Full Nephew"],
    ["cn", "Paternal Nephew"],
    ["fu", "Full Uncle"],
    ["cu", "Paternal Uncle"],
  ],
  F: [
    ["wife", "Wife"],
    ["dau", "Daughter"],
    ["sd", "Son's Daughter"],
    ["psD", "Granddaughter via predeceased son"],
    ["pdD", "Granddaughter via predeceased daughter"],
    ["m", "Mother"],
    ["pgm", "Paternal Grandmother"],
    ["mgm", "Maternal Grandmother"],
    ["fs", "Full Sister"],
    ["cs", "Consanguine Sister"],
    ["us", "Uterine Sister"],
  ],
};
const LBL = {};
Object.values(REL)
  .flat()
  .forEach(([k, v]) => (LBL[k] = v));
const REP = {
  psS: { p: "son", w: 2 },
  psD: { p: "son", w: 1 },
  pdS: { p: "dau", w: 2 },
  pdD: { p: "dau", w: 1 },
};
const relName = (b) =>
  (LBL[b.rel] || "Unassigned") + (REP[b.rel] ? ` (#${b.line})` : "");
const $ = (s) => document.querySelector(s),
  board = $("#board"),
  svg = $("#svg"),
  dec = $("#dec");
let blocks = [],
  uid = 0,
  org = false,
  orgHtml = "",
  hist = [],
  hi = -1,
  last = null,
  geo = null;
const EMPTY = '<span class="note">Results will appear here.</span>';
function place(b, x, y) {
  b.x = x;
  b.y = y;
  b.el.style.left = x + "px";
  b.el.style.top = y + "px";
}

// ---------- fractions ----------
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const fr = (n, d = 1) => {
  const k = gcd(Math.abs(n), d) || 1;
  return { n: n / k, d: d / k };
};
const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d),
  sub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => fr(a.n * b.n, a.d * b.d),
  div = (a, b) => fr(a.n * b.d, a.d * b.n),
  Z = fr(0);
const val = (f) => f.n / f.d,
  txt = (f) => (f.n ? (f.d == 1 ? "1" : f.n + "/" + f.d) : "0");

// ---------- inheritance engine ----------
function compute(c) {
  const n = (k) => c[k] || 0,
    sh = {},
    res = {},
    notes = [];
  const set = (k, f) => {
    if (f.n) sh[k] = f;
  };
  const S = n("son"),
    D = n("dau"),
    SS = n("ss"),
    SD = n("sd"),
    F = n("f"),
    M = n("m"),
    GF = F ? 0 : n("gf");
  const maleDesc = S + SS > 0,
    desc = S + D + SS + SD > 0,
    femDesc = D + SD > 0 && !maleDesc;
  // spouses
  let sp = Z;
  if (n("husband")) {
    sp = desc ? fr(1, 4) : fr(1, 2);
    set("husband", sp);
  }
  if (n("wife")) {
    sp = desc ? fr(1, 8) : fr(1, 4);
    set("wife", sp);
  }
  // children & son's children
  if (S) {
    res.son = 2 * S;
    if (D) res.dau = D;
  } else if (D) set("dau", D == 1 ? fr(1, 2) : fr(2, 3));
  if (!S) {
    if (SS) {
      res.ss = 2 * SS;
      if (SD) res.sd = SD;
    } else if (SD && D < 2)
      set("sd", D == 1 ? fr(1, 6) : SD == 1 ? fr(1, 2) : fr(2, 3));
  }
  // father / grandfather
  const fa = F ? "f" : GF ? "gf" : null;
  if (fa) {
    if (maleDesc) set(fa, fr(1, 6));
    else if (desc) {
      set(fa, fr(1, 6));
      res[fa] = 1;
    } else res[fa] = 1;
  }
  // mother
  const sibs = ["fb", "fs", "cb", "cs", "ub", "us"].reduce(
    (a, k) => a + n(k),
    0,
  );
  if (M) {
    if (desc || sibs >= 2) set("m", fr(1, 6));
    else if ((n("husband") || n("wife")) && F)
      set("m", mul(sub(fr(1), sp), fr(1, 3)));
    else set("m", fr(1, 3));
  }
  // grandmothers (1/6 shared)
  const gms = ["pgm", "mgm"].filter(
    (k) => n(k) && !(k == "pgm" && (M || F)) && !(k == "mgm" && M),
  );
  gms.forEach((k) => set(k, fr(1, 6 * gms.length)));
  // siblings
  const sibEx = maleDesc || F || GF,
    uEx = desc || F || GF;
  const fb = sibEx ? 0 : n("fb"),
    fs = sibEx ? 0 : n("fs");
  let cb = sibEx ? 0 : n("cb"),
    cs = sibEx ? 0 : n("cs");
  let fsRes = false;
  if (fb) {
    res.fb = 2 * fb;
    if (fs) res.fs = fs;
  } else if (fs) {
    if (femDesc) {
      res.fs = fs;
      fsRes = true;
    } else set("fs", fs == 1 ? fr(1, 2) : fr(2, 3));
  }
  if (fb || fsRes) cb = cs = 0;
  else if (cb) {
    res.cb = 2 * cb;
    if (cs) res.cs = cs;
  } else if (cs) {
    if (fs >= 2) cs = 0;
    else if (fs == 1) set("cs", fr(1, 6));
    else if (femDesc) res.cs = cs;
    else set("cs", cs == 1 ? fr(1, 2) : fr(2, 3));
  }
  const ub = uEx ? 0 : n("ub"),
    us = uEx ? 0 : n("us"),
    u = ub + us;
  if (u) {
    const t = u == 1 ? fr(1, 6) : fr(1, 3);
    if (ub) set("ub", mul(t, fr(ub, u)));
    if (us) set("us", mul(t, fr(us, u)));
  }
  // nephews, uncles
  const top =
    maleDesc ||
    F ||
    GF ||
    res.fb ||
    res.cb ||
    res.fs ||
    res.cs ||
    n("fb") ||
    n("cb");
  if (!top) {
    if (n("fn")) res.fn = n("fn");
    else if (n("cn")) res.cn = n("cn");
  }
  if (!top && !n("fn") && !n("cn")) {
    if (n("fu")) res.fu = n("fu");
    else if (n("cu")) res.cu = n("cu");
  }
  // totals: Awl / residue / Radd
  let T = Z;
  Object.values(sh).forEach((f) => (T = add(T, f)));
  if (T.n > T.d) {
    notes.push(
      "Awl applied: fixed shares exceeded the whole, so all were reduced proportionally.",
    );
    for (const k in sh) sh[k] = div(sh[k], T);
  } else {
    const R = sub(fr(1), T);
    if (R.n > 0) {
      const cls = [
        ["son", "dau", "ss", "sd"],
        ["f", "gf"],
        ["fb", "fs", "cb", "cs"],
        ["fn", "cn"],
        ["fu", "cu"],
      ];
      const cl = cls.find((g) => g.some((k) => res[k]));
      if (cl) {
        const W = cl.reduce((a, k) => a + (res[k] || 0), 0);
        cl.forEach((k) => {
          if (res[k]) sh[k] = add(sh[k] || Z, mul(R, fr(res[k], W)));
        });
        notes.push(
          "Remainder distributed to residuary heirs (male gets double the female).",
        );
      } else {
        const keys = Object.keys(sh),
          oth = keys.filter((k) => k != "husband" && k != "wife");
        if (!keys.length)
          notes.push(
            "No eligible heirs: the estate would pass to the state (Bait-ul-Mal).",
          );
        else if (!oth.length) {
          keys.forEach((k) => (sh[k] = fr(1)));
          notes.push(
            "Radd applied: spouse receives the remainder as there are no other heirs.",
          );
        } else {
          let B = Z;
          oth.forEach((k) => (B = add(B, sh[k])));
          const room = sub(fr(1), sp);
          oth.forEach((k) => (sh[k] = mul(div(sh[k], B), room)));
          notes.push(
            "Radd applied: surplus returned to non-spouse sharers proportionally.",
          );
        }
      }
    }
  }
  return { sh, notes };
}

// ---------- UI ----------
function relOptions(b) {
  const dm = $("#dg").value == "M",
    mf = $("#mflo").checked;
  return (
    '<option value="">Relationship…</option>' +
    REL[b.g]
      .filter(
        ([k]) =>
          !(dm && k == "husband") &&
          !(!dm && k == "wife") &&
          !(mf && (k == "ss" || k == "sd")) &&
          !(!mf && REP[k]),
      )
      .map(
        ([k, v]) =>
          `<option value="${k}"${b.rel == k ? " selected" : ""}>${v}</option>`,
      )
      .join("")
  );
}
function addBlock(g, x, y, d) {
  const b = {
      id: ++uid,
      g,
      rel: d ? d.rel : "",
      name: d ? d.name : "",
      line: (d && d.line) || 1,
    },
    el = document.createElement("div");
  el.className = "blk " + g;
  el.innerHTML = `<div class="hd"><span>${g == "M" ? "Male" : "Female"}</span><b title="Remove">×</b></div>
  <div class="bd"><input placeholder="Name"><select></select><select class="ln" title="Which predeceased child they descend from"></select><div class="out"></div></div>`;
  b.el = el;
  b.out = el.querySelector(".out");
  const sel = el.querySelector("select"),
    ln = el.querySelector(".ln");
  sel.innerHTML = relOptions(b);
  ln.innerHTML = [1, 2, 3, 4, 5]
    .map((i) => `<option value="${i}">Child of predeceased #${i}</option>`)
    .join("");
  ln.value = b.line;
  b.showLn = () => {
    ln.style.display = REP[b.rel] ? "" : "none";
  };
  b.showLn();
  ln.onchange = () => {
    b.line = +ln.value;
    org = false;
    draw();
    commit();
  };
  sel.onchange = () => {
    b.rel = sel.value;
    b.showLn();
    org = false;
    draw();
    commit();
  };
  const inp = el.querySelector("input");
  inp.value = b.name;
  inp.oninput = (e) => (b.name = e.target.value);
  inp.onchange = () => commit();
  el.querySelector("b").onclick = () => {
    el.remove();
    blocks = blocks.filter((z) => z !== b);
    org = false;
    draw();
    commit();
  };
  const r = board.getBoundingClientRect();
  d
    ? place(b, x, y)
    : place(
        b,
        Math.max(0, Math.min(x, r.width - 170)),
        Math.max(70, Math.min(y, r.height - 150)),
      );
  // drag on board
  const hd = el.querySelector(".hd");
  hd.onpointerdown = (e) => {
    if (e.target.tagName == "B") return;
    hd.setPointerCapture(e.pointerId);
    const ox = e.clientX - el.offsetLeft,
      oy = e.clientY - el.offsetTop;
    hd.onpointermove = (m) => {
      org = false;
      const R = board.getBoundingClientRect();
      place(
        b,
        Math.max(0, Math.min(m.clientX - ox, R.width - el.offsetWidth)),
        Math.max(0, Math.min(m.clientY - oy, R.height - el.offsetHeight)),
      );
      draw();
    };
    hd.onpointerup = () => {
      hd.onpointermove = null;
      commit();
    };
  };
  board.appendChild(el);
  blocks.push(b);
  b.sel = sel;
  org = false;
  draw();
  if (!d) commit();
}
function draw() {
  if (org) {
    svg.innerHTML = orgHtml;
    return;
  }
  const R = board.getBoundingClientRect(),
    d = dec.getBoundingClientRect();
  const dx = d.left + d.width / 2 - R.left,
    dy = d.top + d.height / 2 - R.top;
  let h = "";
  blocks.forEach((b) => {
    if (!b.rel) return;
    const r = b.el.getBoundingClientRect(),
      x = r.left + r.width / 2 - R.left,
      y = r.top + r.height / 2 - R.top;
    h += `<line x1="${dx}" y1="${dy}" x2="${x}" y2="${y}"/><text x="${(dx + x) / 2}" y="${(dy + y) / 2}">${relName(b)}</text>`;
  });
  svg.innerHTML = h;
}
// palette: drag-and-drop + tap to add
document.querySelectorAll(".chip").forEach((c) => {
  c.ondragstart = (e) => e.dataTransfer.setData("text/plain", c.dataset.g);
  c.onclick = () => {
    const k = blocks.length;
    addBlock(
      c.dataset.g,
      12 + ((k * 37) % Math.max(60, board.clientWidth - 190)),
      110 + ((k * 53) % Math.max(60, board.clientHeight - 260)),
    );
  };
});
board.ondragover = (e) => {
  e.preventDefault();
  board.classList.add("over");
};
board.ondragleave = () => board.classList.remove("over");
board.ondrop = (e) => {
  e.preventDefault();
  board.classList.remove("over");
  const g = e.dataTransfer.getData("text/plain");
  if (g != "M" && g != "F") return;
  const R = board.getBoundingClientRect();
  addBlock(g, e.clientX - R.left - 84, e.clientY - R.top - 20);
};
$("#dg").onchange = () => {
  blocks.forEach((b) => {
    if (b.rel == "husband" || b.rel == "wife") b.rel = "";
    b.sel.innerHTML = relOptions(b);
  });
  org = false;
  draw();
  commit();
};
window.addEventListener("resize", () => (org ? arrange(true) : draw()));

// ---------- history ----------
const snap = () =>
  JSON.stringify({
    dg: $("#dg").value,
    mf: $("#mflo").checked,
    b: blocks.map((b) => ({
      g: b.g,
      rel: b.rel,
      name: b.name,
      line: b.line,
      x: b.x,
      y: b.y,
    })),
  });
function upd() {
  $("#undo").disabled = hi < 1;
  $("#redo").disabled = hi >= hist.length - 1;
}
function commit() {
  const s = snap();
  if (s === hist[hi]) return;
  hist.splice(hi + 1);
  hist.push(s);
  hi++;
  upd();
}
function fit() {
  board.style.height =
    Math.max(560, ...blocks.map((b) => b.y + b.el.offsetHeight + 20)) + "px";
}
function restore(s) {
  const o = JSON.parse(s);
  blocks.forEach((b) => b.el.remove());
  blocks = [];
  $("#dg").value = o.dg;
  $("#mflo").checked = o.mf !== false;
  o.b.forEach((d) => addBlock(d.g, d.x, d.y, d));
  org = false;
  fit();
  draw();
  $("#res").innerHTML = EMPTY;
  upd();
}
$("#mflo").onchange = () => {
  const on = $("#mflo").checked;
  blocks.forEach((b) => {
    if (on) {
      if (b.rel == "ss") {
        b.rel = "psS";
        b.line = 1;
      } else if (b.rel == "sd") {
        b.rel = "psD";
        b.line = 1;
      }
    } else {
      if (b.rel == "psS") b.rel = "ss";
      else if (b.rel == "psD") b.rel = "sd";
      else if (REP[b.rel]) b.rel = "";
    }
    b.sel.innerHTML = relOptions(b);
    b.showLn();
  });
  org = false;
  draw();
  commit();
};
$("#undo").onclick = () => {
  if (hi > 0) restore(hist[--hi]);
};
$("#redo").onclick = () => {
  if (hi < hist.length - 1) restore(hist[++hi]);
};
$("#reset").onclick = () => {
  blocks.forEach((b) => b.el.remove());
  blocks = [];
  org = false;
  fit();
  draw();
  $("#res").innerHTML = EMPTY;
  commit();
};

// ---------- organogram layout ----------
const ROWS = [
  ["Spouse", ["husband", "wife"]],
  ["Parents & ancestors", ["f", "m", "gf", "pgm", "mgm"]],
  ["Descendants", ["son", "dau", "ss", "sd", "psS", "psD", "pdS", "pdD"]],
  ["Siblings", ["fb", "fs", "cb", "cs", "ub", "us"]],
  ["Extended relatives", ["fn", "cn", "fu", "cu"]],
  ["Unassigned", [""]],
];
function arrange(quiet) {
  const W = board.clientWidth,
    cx = W / 2,
    BW = 168,
    G = 12,
    per = Math.max(1, Math.floor((W - 16 + G) / (BW + G)));
  const dB = dec.offsetTop + dec.offsetHeight;
  let y = dB + 34,
    h = "",
    lastBus = dB;
  const GL = [],
    GT = [];
  if (!quiet) {
    board.classList.add("anim");
    setTimeout(() => board.classList.remove("anim"), 450);
  }
  ROWS.forEach(([label, keys]) => {
    const bs = blocks
      .filter((b) => keys.includes(b.rel))
      .sort(
        (a, b) => keys.indexOf(a.rel) - keys.indexOf(b.rel) || a.line - b.line,
      );
    for (let i = 0; i < bs.length; i += per) {
      const ch = bs.slice(i, i + per),
        w = ch.length * BW + (ch.length - 1) * G,
        x0 = Math.max(8, cx - w / 2),
        top = y + 16;
      const xs = ch.map((b, j) => x0 + j * (BW + G) + BW / 2);
      h += `<line x1="${Math.min(cx, ...xs)}" y1="${y}" x2="${Math.max(cx, ...xs)}" y2="${y}"/>`;
      GL.push([Math.min(cx, ...xs), y, Math.max(cx, ...xs), y]);
      if (i == 0) {
        h += `<text x="8" y="${y - 5}" style="text-anchor:start">${label}</text>`;
        GT.push([8, y - 5, label]);
      }
      ch.forEach((b, j) => {
        place(b, x0 + j * (BW + G), top);
        h += `<line x1="${xs[j]}" y1="${y}" x2="${xs[j]}" y2="${top}"/>`;
        GL.push([xs[j], y, xs[j], top]);
      });
      lastBus = y;
      y = top + Math.max(...ch.map((b) => b.el.offsetHeight)) + 30;
    }
  });
  orgHtml = `<line x1="${cx}" y1="${dB}" x2="${cx}" y2="${lastBus}"/>` + h;
  board.style.height = Math.max(560, y) + "px";
  org = true;
  draw();
  GL.push([cx, dB, cx, lastBus]);
  geo = {
    W,
    H: Math.max(560, y),
    dec: {
      x: cx - dec.offsetWidth / 2,
      y: dec.offsetTop,
      w: dec.offsetWidth,
      h: dec.offsetHeight,
    },
    GL,
    GT,
    B: blocks.map((b) => ({
      x: b.x,
      y: b.y,
      h: b.el.offsetHeight,
      g: b.g,
      name: b.name || "Unnamed",
      rel: relName(b),
      out: b.out.textContent,
    })),
  };
}
hist = [snap()];
hi = 0;
upd();

// ---------- calculate ----------
$("#calc").onclick = () => {
  const total = +$("#tot").value || 0,
    unit = $("#unit").value,
    out = $("#res");
  const used = blocks.filter((b) => b.rel);
  last = null;
  blocks.forEach((b) => (b.out.textContent = ""));
  if (!used.length) {
    out.innerHTML =
      '<span class="warn">Add at least one block and choose its relationship.</span>';
    return;
  }
  const c = {},
    ln = {};
  used.forEach((b) => {
    const R = REP[b.rel];
    if (R) {
      const k = R.p + b.line;
      (ln[k] = ln[k] || { p: R.p, w: 0 }).w += R.w;
    } else c[b.rel] = (c[b.rel] || 0) + 1;
  });
  Object.values(ln).forEach((l) => (c[l.p] = (c[l.p] || 0) + 1)); // each predeceased child counts as a virtual son/daughter
  const warns = [];
  if (c.husband > 1)
    warns.push("A woman can have only one husband; please check the blocks.");
  const { sh, notes } = compute(c);
  if (Object.keys(ln).length)
    notes.push(
      "MFLO 1961 s.4: children of a predeceased son/daughter take, between them, the share their parent would have received (sons double the daughters).",
    );
  let rows = "",
    sum = 0;
  const L = [];
  used.forEach((b, i) => {
    const R = REP[b.rel],
      g = sh[R ? R.p : b.rel];
    const p = !g
        ? Z
        : R
          ? mul(div(g, fr(c[R.p])), fr(R.w, ln[R.p + b.line].w))
          : div(g, fr(c[b.rel])),
      amt = val(p) * total;
    sum += amt;
    b.out.textContent = p.n
      ? `${txt(p)} • ${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
      : "Excluded (0)";
    L.push([
      b.name || "Unnamed " + (i + 1),
      relName(b),
      txt(p),
      (val(p) * 100).toFixed(2) + "%",
      amt.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + unit,
    ]);
    rows += `<tr><td>${b.name || "Unnamed " + (i + 1)}</td><td>${relName(b)}</td><td>${txt(p)}</td><td>${(val(p) * 100).toFixed(2)}%</td><td>${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}</td></tr>`;
  });
  const skipped = blocks.length - used.length;
  out.innerHTML =
    `<table><tr><th>Name</th><th>Relation</th><th>Share</th><th>%</th><th>Amount</th></tr>${rows}
  <tr><td colspan="4"><b>Total distributed</b></td><td><b>${sum.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}</b></td></tr></table>` +
    warns.map((w) => `<p class="note warn">${w}</p>`).join("") +
    notes.map((w) => `<p class="note">${w}</p>`).join("") +
    (skipped
      ? `<p class="note warn">${skipped} block(s) without a relationship were ignored.</p>`
      : "");
  last = { L, total, unit, notes, sum, dg: $("#dg").value };
  arrange();
  commit();
};

// ---------- PDF ----------
function buildPdf() {
  const { jsPDF } = window.jspdf,
    doc = new jsPDF({ unit: "mm", format: "a4" }),
    PW = 210,
    M = 10;
  const clean = (t) => String(t).replace(/•/g, "-");
  const ink = () => {
    doc.setDrawColor(0);
    doc.setTextColor(0);
    doc.setLineDashPattern([], 0);
  };
  ink();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Inheritance Distribution", M, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Deceased: ${last.dg == "M" ? "Male" : "Female"}   |   Total property: ${last.total.toLocaleString()} ${last.unit}   |   Date: ${new Date().toLocaleDateString()}`,
    M,
    21,
  );
  doc.setFontSize(7);
  doc.text("Solid border = male heir, dashed border = female heir", M, 25);
  const s = Math.min((PW - 2 * M) / geo.W, 250 / geo.H),
    X = (v) => M + v * s,
    Y = (v) => 30 + v * s;
  doc.setLineWidth(0.3);
  geo.GL.forEach((l) => doc.line(X(l[0]), Y(l[1]), X(l[2]), Y(l[3])));
  doc.setFontSize(6);
  geo.GT.forEach((t) => doc.text(t[2], X(t[0]), Y(t[1])));
  const d = geo.dec;
  doc.setLineWidth(0.7);
  doc.rect(X(d.x), Y(d.y), d.w * s, d.h * s, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Deceased", X(d.x + d.w / 2), Y(d.y + d.h / 2) + 1, {
    align: "center",
  });
  geo.B.forEach((b) => {
    const w = 168 * s,
      h = b.h * s,
      x = X(b.x),
      y = Y(b.y),
      fs = Math.max(4, Math.min(8, h * 0.3));
    doc.setLineWidth(0.4);
    doc.setLineDashPattern(b.g == "F" ? [1.2, 0.8] : [], 0);
    doc.rect(x, y, w, h, "S");
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(0.2);
    doc.line(x, y + h * 0.27, x + w, y + h * 0.27);
    doc.setFontSize(fs);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(b.rel, w - 2)[0], x + w / 2, y + h * 0.19, {
      align: "center",
    });
    doc.text(doc.splitTextToSize(b.name, w - 2)[0], x + w / 2, y + h * 0.52, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.text(
      doc.splitTextToSize(clean(b.out), w - 2)[0],
      x + w / 2,
      y + h * 0.8,
      { align: "center" },
    );
  });
  // table
  doc.addPage();
  ink();
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Distribution table", M, y);
  y += 7;
  const cols = [
    ["#", 8],
    ["Name", 52],
    ["Relation", 48],
    ["Share", 22],
    ["%", 24],
    ["Amount", 36],
  ];
  const head = () => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = M;
    cols.forEach(([t, w]) => {
      doc.text(t, x + 2, y + 5);
      x += w;
    });
    doc.setLineWidth(0.5);
    doc.line(M, y + 7, M + 190, y + 7);
    y += 7;
  };
  head();
  last.L.forEach((r, i) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
      head();
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let x = M;
    [i + 1, ...r.slice(0, 5)].forEach((t, k) => {
      doc.text(doc.splitTextToSize(clean(t), cols[k][1] - 3)[0], x + 2, y + 5);
      x += cols[k][1];
    });
    doc.setLineWidth(0.15);
    doc.line(M, y + 7, M + 190, y + 7);
    y += 7;
  });
  if (y > 265) {
    doc.addPage();
    y = 15;
  }
  doc.setLineWidth(0.5);
  doc.line(M, y + 1, M + 190, y + 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Total distributed", M + 2, y + 7);
  doc.text(
    clean(
      last.sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
        " " +
        last.unit,
    ),
    M + 156,
    y + 7,
  );
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  last.notes
    .concat([
      "Generated by Inheritance Calculator using Hanafi-style rules summarised at uttoradhikar.gov.bd. For guidance only; consult a qualified scholar or lawyer.",
    ])
    .forEach((n) => {
      const ls = doc.splitTextToSize(n, 190);
      if (y + ls.length * 4 > 285) {
        doc.addPage();
        y = 15;
      }
      doc.text(ls, M, y);
      y += ls.length * 4 + 2;
    });
  // DRAFT watermark on every page (light, diagonal)
  const fs = 100,
    a = (45 * Math.PI) / 180,
    dx = Math.cos(a),
    dy = -Math.sin(a),
    ux = -Math.sin(a),
    uy = -Math.cos(a);
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs);
    doc.setTextColor(0);
    const w = doc.getTextWidth("DRAFT"),
      h = (fs * 0.72) / 2.835;
    doc.text(
      "DRAFT",
      105 - (w / 2) * dx - (h / 2) * ux,
      148.5 - (w / 2) * dy - (h / 2) * uy,
      { angle: 45 },
    );
    doc.restoreGraphicsState();
  }
  return doc;
}
$("#print").onclick = async () => {
  $("#calc").onclick(); // recalculate + re-arrange so the PDF matches the board
  if (!last || !geo) return;
  if (!window.jspdf) {
    alert("The PDF library could not be loaded.");
    return;
  }
  const doc = buildPdf(),
    fn = "inheritance-distribution.pdf";
  let dl = null;
  try {
    dl = window.claude && (await claude.use("downloads"));
  } catch (e) {}
  if (dl) {
    try {
      await dl.save({ filename: fn, data: doc.output("blob") });
    } catch (e) {
      if (e.code != "declined")
        alert("Could not save the PDF (" + (e.code || "error") + ").");
    }
  } else doc.save(fn);
};
