const REL = {
  M: [
    ["husband", "Husband"],
    ["son", "Son"],
    ["ss", "Son's Son"],
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
const $ = (s) => document.querySelector(s),
  board = $("#board"),
  svg = $("#svg"),
  dec = $("#dec");
let blocks = [],
  uid = 0;

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
  const dm = $("#dg").value == "M";
  return (
    '<option value="">Relationship…</option>' +
    REL[b.g]
      .filter(([k]) => !(dm && k == "husband") && !(!dm && k == "wife"))
      .map(
        ([k, v]) =>
          `<option value="${k}"${b.rel == k ? " selected" : ""}>${v}</option>`,
      )
      .join("")
  );
}
function addBlock(g, x, y) {
  const b = { id: ++uid, g, rel: "", name: "" },
    el = document.createElement("div");
  el.className = "blk " + g;
  el.innerHTML = `<div class="hd"><span>${g == "M" ? "Male" : "Female"}</span><b title="Remove">×</b></div>
  <div class="bd"><input placeholder="Name"><select></select><div class="out"></div></div>`;
  b.el = el;
  b.out = el.querySelector(".out");
  const sel = el.querySelector("select");
  sel.innerHTML = relOptions(b);
  sel.onchange = () => {
    b.rel = sel.value;
    draw();
  };
  el.querySelector("input").oninput = (e) => (b.name = e.target.value);
  el.querySelector("b").onclick = () => {
    el.remove();
    blocks = blocks.filter((z) => z !== b);
    draw();
  };
  const r = board.getBoundingClientRect();
  el.style.left = Math.max(0, Math.min(x, r.width - 170)) + "px";
  el.style.top = Math.max(70, Math.min(y, r.height - 150)) + "px";
  // drag on board
  const hd = el.querySelector(".hd");
  hd.onpointerdown = (e) => {
    if (e.target.tagName == "B") return;
    hd.setPointerCapture(e.pointerId);
    const ox = e.clientX - el.offsetLeft,
      oy = e.clientY - el.offsetTop;
    hd.onpointermove = (m) => {
      const R = board.getBoundingClientRect();
      el.style.left =
        Math.max(0, Math.min(m.clientX - ox, R.width - el.offsetWidth)) + "px";
      el.style.top =
        Math.max(0, Math.min(m.clientY - oy, R.height - el.offsetHeight)) +
        "px";
      draw();
    };
    hd.onpointerup = () => {
      hd.onpointermove = null;
    };
  };
  board.appendChild(el);
  blocks.push(b);
  b.sel = sel;
  draw();
}
function draw() {
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
    h += `<line x1="${dx}" y1="${dy}" x2="${x}" y2="${y}"/><text x="${(dx + x) / 2}" y="${(dy + y) / 2}">${LBL[b.rel]}</text>`;
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
  draw();
};
window.addEventListener("resize", draw);

// ---------- calculate ----------
$("#calc").onclick = () => {
  const total = +$("#tot").value || 0,
    unit = $("#unit").value,
    out = $("#res");
  const used = blocks.filter((b) => b.rel);
  blocks.forEach((b) => (b.out.textContent = ""));
  if (!used.length) {
    out.innerHTML =
      '<span class="warn">Add at least one block and choose its relationship.</span>';
    return;
  }
  const c = {};
  used.forEach((b) => (c[b.rel] = (c[b.rel] || 0) + 1));
  const warns = [];
  if (c.husband > 1)
    warns.push("A woman can have only one husband; please check the blocks.");
  const { sh, notes } = compute(c);
  let rows = "",
    sum = 0;
  used.forEach((b, i) => {
    const g = sh[b.rel],
      p = g ? div(g, fr(c[b.rel])) : Z,
      amt = val(p) * total;
    sum += amt;
    b.out.textContent = p.n
      ? `${txt(p)} • ${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
      : "Excluded (0)";
    rows += `<tr><td>${b.name || "Unnamed " + (i + 1)}</td><td>${LBL[b.rel]}</td><td>${txt(p)}</td><td>${(val(p) * 100).toFixed(2)}%</td><td>${amt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}</td></tr>`;
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
};
