/* ============================================================
   MUSIC LIFE · 知识图解引擎（Knowledge Comic Engine）
   把抽象乐理 / 制作流程画成「看得懂的讲解图」。
   纯 SVG 字符串生成，零依赖，随 learn.js 一起加载。
   ============================================================ */
(function () {
  "use strict";
  const W = 760;                 // 画板基准宽
  const C = {
    cream: "#f3ead6", dim: "#9aa3b8", gold: "#e0a96d", gold2: "#f2c879",
    violet: "#9d4edd", violet2: "#c77dff", neon: "#00f5d4", pink: "#ff5d8f",
    good: "#3ddc97", bad: "#ff5d6c", line: "#2c2650", deep: "#1a2440"
  };
  const F = "Rajdhani,'Noto Serif SC','PingFang SC','Microsoft YaHei',sans-serif";

  /* ---------------- 基础工具 ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function T(x, y, s, o) {
    o = o || {};
    let extra = "";
    if (o.op) extra += ` opacity="${o.op}"`;
    if (o.ls) extra += ` letter-spacing="${o.ls}"`;
    if (o.r) extra += ` transform="rotate(${o.r} ${x} ${y})"`;
    return `<text x="${x}" y="${y}" fill="${o.c || C.cream}" font-size="${o.fs || 14}"
      font-family="${o.f || F}" font-weight="${o.w || 500}" text-anchor="${o.a || "start"}"
      dominant-baseline="${o.b || "auto"}"${extra}>${esc(s)}</text>`;
  }
  function rr(x, y, w, h, r, fill, stroke, sw) {
    const rr2 = Math.min(r, w / 2, h / 2);
    return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${Math.max(0, h)}" rx="${rr2}"
      fill="${fill}" stroke="${stroke || "none"}" stroke-width="${sw || 0}"/>`;
  }
  function line(x1, y1, x2, y2, stroke, sw, dash) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 1}"
      stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  }
  function circ(x, y, r, fill, stroke, sw) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke || "none"}" stroke-width="${sw || 0}"/>`;
  }
  // 按像素宽度折行（中日韩按字宽、拉丁按词）
  function wrapTo(str, width, fs) {
    const per = Math.max(2, Math.floor(width / (fs * 0.98)));
    const s = String(str || "");
    const toks = s.match(/[A-Za-z0-9'’\.\-–—%°+/#♭♯]+|\s+|[^\s]/g) || [];
    const out = []; let cur = "";
    for (const tk of toks) {
      if (/^\s+$/.test(tk)) { if (cur) { if (cur.length + 1 > per) { out.push(cur); cur = ""; } else cur += tk; } continue; }
      if (cur.length + tk.length > per) { if (cur) out.push(cur); cur = tk; }
      else cur += tk;
      while (cur.length > per) { out.push(cur.slice(0, per)); cur = cur.slice(per); }
    }
    if (cur.trim()) out.push(cur.trim());
    return out.length ? out : [""];
  }
  function para(x, y, s, o) {
    o = o || {};
    const fs = o.fs || 13, lh = o.lh || (fs + 5), w = o.w || 200;
    const lines = wrapTo(s, w, fs);
    return lines.map((l, i) => T(x, y + i * lh, l, { fs, c: o.c, a: o.a, b: o.b, w: o.w2 })).join("");
  }
  // 漫画式旁白气泡
  function bubble(x, y, s, o) {
    o = o || {};
    const fs = o.fs || 13, maxw = o.w || 190;
    const lines = wrapTo(s, maxw, fs);
    const h = lines.length * (fs + 5) + 16;
    const wSec = lines.reduce((m, l) => Math.max(m, l.length), 0) * fs * 0.98 + 22;
    const wd = Math.min(maxw + 22, Math.max(wSec, 60));
    let g = `<g><rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="12" fill="rgba(224,169,109,.10)"
      stroke="${o.c || C.gold}" stroke-width="1.2" stroke-dasharray="${o.dash ? "5 4" : "0"}"/>`;
    if (o.tail) {
      const tx = o.tail === "left" ? x : o.tail === "right" ? x + wd : x + wd / 2;
      g += `<path d="M${tx - 7},${y + h} L${tx},${y + h + 11} L${tx + 7},${y + h} Z" fill="rgba(224,169,109,.10)"
        stroke="${o.c || C.gold}" stroke-width="1.2"/>`;
    }
    g += lines.map((l, i) => T(x + 11, y + 19 + i * (fs + 5), l, { fs, c: o.tc || C.cream, w: o.tw })).join("");
    return g + `</g>`;
  }
  function col(c) { return C[c] || c || C.gold; }

  /* ---------------- 画布包装 ---------------- */
  function svg(h, body) {
    return `<svg class="cmc-svg" viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg" role="img">
<defs>
<marker id="cmcA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="${C.gold}"/></marker>
<marker id="cmcAv" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="${C.violet2}"/></marker>
<marker id="cmcAn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="${C.neon}"/></marker>
<linearGradient id="cmcBg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#111c33"/><stop offset="1" stop-color="#0a1120"/></linearGradient>
<linearGradient id="cmcArea" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="rgba(224,169,109,.45)"/><stop offset="1" stop-color="rgba(224,169,109,.02)"/></linearGradient>
</defs>
<rect x="0" y="0" width="${W}" height="${h}" rx="14" fill="url(#cmcBg)"/>
${body}</svg>`;
  }
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  /* ============================================================
     1. keys · 钢琴键盘（音 / 指法 / 跨度标注）
     {lo,hi, marks:[{m,f,lb,c}], spans:[{a,b,lb,c}], noNames}
     ============================================================ */
  function rKeys(p) {
    const lo = p.lo == null ? 60 : p.lo, hi = p.hi == null ? 72 : p.hi;
    const sharps = [1, 3, 6, 8, 10];
    const whites = [], blacks = [];
    for (let m = lo; m <= hi; m++) { (sharps.indexOf(((m % 12) + 12) % 12) >= 0 ? blacks : whites).push(m); }
    const pad = 26, bw = (W - pad * 2) / whites.length;
    const top = p.top == null ? 84 : p.top, kh = p.kh || 104, bkh = kh * 0.62;
    const isB = m => sharps.indexOf(((m % 12) + 12) % 12) >= 0;
    const cx = m => isB(m) ? pad + whites.filter(w => w < m).length * bw : pad + whites.indexOf(m) * bw + bw / 2;
    let g = "";
    // 跨度弧线（在键盘上方）
    (p.spans || []).forEach(sp => {
      const x1 = cx(sp.a), x2 = cx(sp.b), y0 = top - 16 - (sp.dy || 0);
      const mx = (x1 + x2) / 2, arc = Math.min(34, Math.abs(x2 - x1) * 0.42 + 12);
      g += `<path d="M${x1},${y0} Q${mx},${y0 - arc * 2} ${x2},${y0}" fill="none" stroke="${col(sp.c)}"
        stroke-width="2" marker-end="url(#cmcA)" marker-start="url(#cmcA)"/>`;
      g += T(mx, y0 - arc - 6, sp.lb, { fs: 12, c: col(sp.c), a: "middle" });
    });
    // 白键
    whites.forEach((m, i) => {
      g += `<rect x="${pad + i * bw}" y="${top}" width="${bw - 1.5}" height="${kh}" rx="4"
        fill="#e9e2cf" stroke="#0a1120" stroke-width=".8"/>`;
    });
    // 黑键
    blacks.forEach(m => {
      const i = whites.filter(w => w < m).length;
      g += `<rect x="${pad + i * bw - bw * 0.30}" y="${top}" width="${bw * 0.60}" height="${bkh}" rx="3"
        fill="#141d33" stroke="#070b14" stroke-width=".8"/>`;
    });
    // 白键音名
    if (!p.noNames) whites.forEach((m, i) => {
      g += T(pad + i * bw + bw / 2, top + kh + 18, NAMES[m % 12], { fs: 11, c: "#7f8aa3", a: "middle" });
    });
    // 标记点（音 + 指法）
    (p.marks || []).forEach(mk => {
      const x = cx(mk.m), onB = isB(mk.m);
      const cy2 = onB ? top + bkh - 26 : top + kh - 34;
      g += circ(x, cy2, 13, col(mk.c || "gold"), "rgba(7,11,20,.6)", 1.4);
      g += T(x, cy2 + 1, mk.f != null ? mk.f : NAMES[mk.m % 12],
        { fs: mk.f != null ? 13 : 11, c: "#0b1120", a: "middle", b: "middle", w: 700 });
      if (mk.lb) {
        const lp = wrapTo(mk.lb, Math.max(46, bw * 2.6), 11);
        lp.forEach((l, i) => { g += T(x, top + kh + 36 + i * 14, l, { fs: 11, c: col(mk.c || "gold"), a: "middle" }); });
      }
    });
    const extra = (p.marks || []).some(m => m.lb) ? 30 : 0;
    return svg(top + kh + 52 + extra, g);
  }

  /* ============================================================
     2. staff · 五线谱（音名 + 唱名 + 度数）
     {clef:'treble'|'bass', notes:[{n:'C4',lb:'do',sb:'主音',acc:'#',c:'gold'}], cap}
     ============================================================ */
  const LTR = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  function dia(n) {
    const m = /^([A-G])([#b♯♭]?)(-?\d)$/.exec(String(n || "").trim());
    return m ? 7 * parseInt(m[3], 10) + LTR[m[1]] : null;
  }
  function pcName(n) { return (String(n || "").match(/^[A-G][#b♯♭]?/) || [""])[0]; }
  function rStaff(p) {
    const top = p.top == null ? 62 : p.top, gap = p.gap || 26;
    const baseY = top + gap * 4;                       // 第一线 (pos 0)
    const yOf = pos => baseY - pos * (gap / 2);
    const baseD = p.clef === "bass" ? dia("G2") : dia("E4");
    const lineNames = p.clef === "bass" ? ["G2", "B2", "D3", "F3", "A3"] : ["E4", "G4", "B4", "D5", "F5"];
    let g = "";
    for (let i = 0; i < 5; i++) g += line(38, yOf(i * 2), W - 40, yOf(i * 2), "#3b4670", 1.1);
    lineNames.forEach((nm, i) => { g += T(28, yOf(i * 2) + 4, pcName(nm), { fs: 11, c: "#7f8aa3", a: "end" }); });
    const notes = p.notes || [];
    if (notes.length) {
      const x0 = 108, x1 = W - 56;
      const step = notes.length > 1 ? (x1 - x0) / (notes.length - 1) : 0;
      notes.forEach((nt, i) => {
        const x = notes.length > 1 ? x0 + i * step : W / 2;
        const d = dia(nt.n); if (d == null) return;
        const pos = d - baseD, y = yOf(pos);
        // 加线
        const evens = [];
        for (let e = -2; e >= -8; e -= 2) evens.push(e);
        for (let e = 10; e <= 14; e += 2) evens.push(e);
        evens.forEach(e => {
          if ((pos <= e && e < 0) || (pos >= e && e > 8)) g += line(x - 17, yOf(e), x + 17, yOf(e), "#3b4670", 1.1);
        });
        const c = col(nt.c || (notes.length === 1 ? "gold" : "cream"));
        if (nt.acc) g += T(x - 21, y + 5, nt.acc === "#" ? "♯" : "♭", { fs: 17, c: C.gold, a: "middle" });
        g += `<ellipse cx="${x}" cy="${y}" rx="10.5" ry="7.6" fill="${c}" stroke="rgba(7,11,20,.5)"
          stroke-width=".8" transform="rotate(-14 ${x} ${y})"/>`;
        const up = pos < 4;
        g += line(x + (up ? 9.5 : -9.5), y, x + (up ? 9.5 : -9.5), y + (up ? -34 : 34), c, 1.8);
        if (nt.lb) g += T(x, y + (up ? 46 : -30), nt.lb, { fs: 13, c: C.gold2, a: "middle", w: 700 });
        if (nt.sb) g += T(x, y + (up ? 62 : -46), nt.sb, { fs: 11, c: C.dim, a: "middle" });
      });
    }
    if (p.cap) g += T(W / 2, baseY + 44, p.cap, { fs: 12, c: C.dim, a: "middle" });
    return svg(baseY + (p.cap ? 60 : 40), g);
  }

  /* ============================================================
     3. stack · 纵向堆叠（音程 / 和弦构成）
     {items:[[{n,r,sb,c}]...] 每列自底向上, titles:[], caps:[], spans:[{ci,i,j,lb,c}]}
     ============================================================ */
  function rStack(p) {
    let cols = p.items || [];
    if (!Array.isArray(cols[0])) cols = [cols];
    const nC = cols.length;
    const maxLen = cols.reduce((m, c) => Math.max(m, c.length), 1);
    const boxH = 54, vgap = p.gap == null ? 30 : p.gap;
    const boxW = p.boxW || (nC >= 3 ? 124 : 158);
    const pad = 64, colW = (W - pad * 2) / nC;
    const top = p.top == null ? 58 : p.top;
    const bottomY = top + maxLen * boxH + (maxLen - 1) * vgap;
    let g = "";
    (p.titles || []).forEach((t, i) => {
      if (t) g += T(pad + colW * (i + 0.5), top - 22, t, { fs: 14, c: C.gold2, a: "middle", w: 700 });
    });
    cols.forEach((column, ci) => {
      const midX = pad + colW * (ci + 0.5);
      const x = midX - boxW / 2;
      column.forEach((it, i) => {
        const y = bottomY - (i + 1) * boxH - i * vgap;
        const c = col(it.c || (i === 0 ? "gold" : "violet2"));
        g += rr(x, y, boxW, boxH, 12, i === 0 ? "rgba(224,169,109,.16)" : "rgba(157,78,221,.12)", c, i === 0 ? 2 : 1.3);
        if (it.r) g += T(x + 12, y + 16, it.r, { fs: 11, c: c, w: 700 });
        const lines = wrapTo(it.n || "", boxW - 26, 17);
        lines.forEach((l, k) => {
          g += T(midX, y + (it.sb ? 32 : 35) + k * 19 - (lines.length - 1) * 9, l, { fs: 17, c: C.cream, a: "middle", w: 700 });
        });
        if (it.sb) g += T(midX, y + 49, it.sb, { fs: 11, c: C.dim, a: "middle" });
        if (i > 0) {
          const yLowTop = bottomY - i * boxH - (i - 1) * vgap;
          const myTop = y + boxH;
          const my = (myTop + yLowTop) / 2;
          const lb = column[i].gapLb || column[i].iv;
          if (lb) {
            g += line(x - 7, myTop, x - 7, yLowTop, "#4b4266", 1.2, "4 3");
            const wMax = Math.max(60, x - 30);
            const ls = wrapTo(lb, wMax, 11);
            ls.forEach((l, k) => { g += T(x - 13, my + k * 13 - (ls.length - 1) * 6, l, { fs: 11, c: C.neon, a: "end" }); });
          }
        }
      });
      if (p.caps && p.caps[ci]) {
        const cs = wrapTo(p.caps[ci], colW - 16, 11.5);
        cs.forEach((l, k) => { g += T(midX, bottomY + 24 + k * 15, l, { fs: 11.5, c: C.dim, a: "middle" }); });
      }
    });
    const capLines = cols.reduce((m, c2, i) => Math.max(m, (p.caps && p.caps[i]) ? wrapTo(p.caps[i], colW - 16, 11.5).length : 0), 0);
    return svg(bottomY + (capLines ? 20 + capLines * 15 : 26), g);
  }

  /* ============================================================
     4. steps · 阶梯（音阶 / 层级 / 递进）
     {items:[{n,lb,sb}], hl:[i], curve:bool}
     ============================================================ */
  function rSteps(p) {
    const items = p.items || [], n = items.length;
    if (!n) return svg(80, "");
    const gapx = 9, x0 = 42, avail = W - 84;
    const bw = (avail - gapx * (n - 1)) / n;
    const top = 56, maxH = p.maxH || 104, minH = 32;
    const baseY = top + maxH + 12;
    let g = "";
    const tops = [];
    items.forEach((it, i) => {
      const h = n > 1 ? minH + (maxH - minH) * (i / (n - 1)) : maxH;
      const x = x0 + i * (bw + gapx), y = baseY - h;
      tops.push({ x: x + bw / 2, y });
      const hl = (p.hl || []).indexOf(i) >= 0;
      g += rr(x, y, bw, h, 9, hl ? "rgba(224,169,109,.20)" : "rgba(157,78,221,.12)",
        hl ? C.gold : "#4b3f70", hl ? 2 : 1.2);
      const ls = wrapTo(it.n || "", bw - 12, 15);
      ls.forEach((l, k) => { g += T(x + bw / 2, y + 20 + k * 17, l, { fs: 15, c: hl ? C.gold2 : C.cream, a: "middle", w: 700 }); });
      if (it.sb) { const s2 = wrapTo(it.sb, bw - 8, 10.5); s2.forEach((l, k) => { g += T(x + bw / 2, y + h - 10 - (s2.length - 1 - k) * 12, l, { fs: 10.5, c: C.dim, a: "middle" }); }); }
    });
    if (p.curve) {
      let d = "";
      tops.forEach((t, i) => { d += (i ? ` L${t.x},${t.y}` : `M${t.x},${t.y}`); });
      g += `<path d="${d}" fill="none" stroke="${C.neon}" stroke-width="1.6" stroke-dasharray="6 4" opacity=".8"/>`;
    }
    items.forEach((it, i) => {
      if (!it.lb) return;
      const ls = wrapTo(it.lb, Math.max(30, bw + 2), 11.5);
      ls.forEach((l, k) => { g += T(x0 + i * (bw + gapx) + bw / 2, baseY + 20 + k * 14, l, { fs: 11.5, c: C.dim, a: "middle" }); });
    });
    const lab = items.some(i => i.lb) ? 44 : 18;
    return svg(baseY + lab, g);
  }

  /* ============================================================
     5. flow · 流程链（自动换行 + 折返箭头）
     {items:[{t,s,c,tag}], cols, loop, title}
     ============================================================ */
  function rFlow(p) {
    const items = p.items || [], n = items.length;
    if (!n) return svg(80, "");
    const cols = p.cols || (n <= 4 ? n : n <= 6 ? 3 : n <= 8 ? 4 : 5);
    const rows = Math.ceil(n / cols);
    const gapx = 16, gapy = p.gapy || 26, pad = 34;
    const bw = (W - pad * 2 - gapx * (cols - 1)) / cols;
    // 预先计算每行行高
    const rowH = [], rowItems = [];
    for (let r = 0; r < rows; r++) {
      const seg = items.slice(r * cols, r * cols + cols);
      rowItems.push(seg);
      let h = 46;
      seg.forEach(it => {
        const tls = wrapTo(it.t || "", bw - 22, 14.5).length;
        const sls = it.s ? wrapTo(it.s, bw - 22, 11.5).length : 0;
        h = Math.max(h, 16 + tls * 19 + sls * 15 + (it.tag ? 18 : 0));
      });
      rowH.push(h);
    }
    let y = p.top == null ? 44 : p.top, g = "";
    const boxGeo = [];
    rowItems.forEach((seg, r) => {
      const reverse = r % 2 === 1 && rows > 1;   // 蛇形
      const ord = seg.map((v, i) => i);
      const list = reverse ? ord.slice().reverse() : ord;
      list.forEach(k => {
        const it = seg[k];
        const x = pad + k * (bw + gapx);
        boxGeo.push({ r, k, x, y, w: bw, h: rowH[r] });
        const c = col(it.c || (r % 2 ? "violet2" : "gold"));
        g += rr(x, y, bw, rowH[r], 12, it.c ? "rgba(255,255,255,.05)" : (r % 2 ? "rgba(157,78,221,.12)" : "rgba(224,169,109,.10)"), c, it.hl ? 2.2 : 1.2);
        let cy = y + 22;
        wrapTo(it.t || "", bw - 22, 14.5).forEach(l => { g += T(x + bw / 2, cy, l, { fs: 14.5, c: C.cream, a: "middle", w: 700 }); cy += 19; });
        if (it.s) { cy += 1; wrapTo(it.s, bw - 22, 11.5).forEach(l => { g += T(x + bw / 2, cy, l, { fs: 11.5, c: C.dim, a: "middle" }); cy += 15; }); }
        if (it.tag) g += T(x + bw / 2, y + rowH[r] - 8, it.tag, { fs: 10.5, c: c, a: "middle", w: 700 });
      });
      y += rowH[r] + gapy;
    });
    // 箭头
    for (let i = 0; i < n - 1; i++) {
      const a = boxGeo[i], b = boxGeo[i + 1];
      const mk = "url(#cmcA)";
      if (a.r === b.r) {
        const dir = b.x > a.x ? 1 : -1;
        const yy = a.y + a.h / 2;
        const x1 = dir > 0 ? a.x + a.w + 3 : a.x - 3, x2 = dir > 0 ? b.x - 4 : b.x + b.w + 4;
        g += line(x1, yy, x2, yy, C.gold, 1.8) + `<line x1="${x1}" y1="${yy}" x2="${x2}" y2="${yy}" stroke="${C.gold}" stroke-width="1.8" marker-end="${mk}"/>`;
      } else {
        const yy = a.y + a.h / 2, x1 = a.x + a.w + 3;
        const midY = (a.y + a.h + b.y) / 2, x2 = b.x - 4;
        g += `<path d="M${x1},${yy} H${W - 16} V${b.y + b.h / 2} H${x2}" fill="none" stroke="${C.gold}"
          stroke-width="1.8" stroke-linejoin="round" marker-end="${mk}"/>`;
      }
    }
    if (p.loop) {
      const first = boxGeo[0], last = boxGeo[n - 1];
      g += `<path d="M${first.x + first.w / 2},${first.y - 6} V${first.y - 24} H${last.x + last.w / 2} V${last.y - 6}"
        fill="none" stroke="${C.violet2}" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#cmcAv)"/>`;
      if (p.loopLb) g += T((first.x + last.x) / 2, first.y - 30, p.loopLb, { fs: 11, c: C.violet2, a: "middle" });
      return svg(y + 16, g);
    }
    return svg(y - (p.gapy || 26) + 16, g);
  }

  /* ============================================================
     6. compare · 左右对比（✗ 常见做法 / ✓ 更好的做法）
     {l:{t,s,items:[]}, r:{t,s,items:[]}, mid, note}
     ============================================================ */
  function rCompare(p) {
    const L = p.l || {}, R = p.r || {};
    const pad = 30, midW = 76;
    const cw = (W - pad * 2 - midW) / 2;
    const fs = 12.5, lh = fs + 6;
    const linesOf = it => {
      const arr = wrapTo(typeof it === "string" ? it : it.t, cw - 34, fs);
      const sub = (it && it.s) ? wrapTo(it.s, cw - 44, 11) : [];
      return { arr, sub, h: arr.length * lh + sub.length * 14 };
    };
    const buildSide = (S, x, head, good) => {
      let g = "", y = 78;
      g += rr(x, 34, cw, 34, 10, good ? "rgba(61,220,151,.12)" : "rgba(255,93,108,.12)",
        good ? C.good : C.bad, 1.4);
      g += T(x + 14, 56, head, { fs: 14, c: good ? C.good : C.bad, w: 700 });
      if (S.s) { y = 80; wrapTo(S.s, cw - 20, 11.5).forEach(l => { g += T(x + 10, y, l, { fs: 11.5, c: C.dim }); y += 15; }); y += 12; }
      (S.items || []).forEach(it => {
        const q = linesOf(it);
        g += circ(x + 12, y + 3, 3.2, good ? C.good : C.bad);
        q.arr.forEach((l, i) => { g += T(x + 24, y + 6 + i * lh, l, { fs, c: C.cream }); });
        let yy = y + 6 + q.arr.length * lh;
        q.sub.forEach((l, i) => { g += T(x + 24, yy + i * 14, l, { fs: 11, c: C.dim }); });
        y += q.h + 12;
      });
      return { g, y };
    };
    const A = buildSide(L, pad, L.t || "❌ 常见做法", false);
    const B = buildSide(R, pad + cw + midW, R.t || "✅ 更好的做法", true);
    let g = A.g + B.g;
    const bottom = Math.max(A.y, B.y);
    g += line(pad + cw + midW / 2, 40, pad + cw + midW / 2, bottom - 10, "#3a3358", 1.2, "5 5");
    g += T(pad + cw + midW / 2, bottom / 2 + 6, p.mid || "vs", { fs: 15, c: C.gold2, a: "middle", w: 700, b: "middle" });
    if (p.note) {
      g += rr(pad, bottom + 6, W - pad * 2, 40, 10, "rgba(0,245,212,.08)", C.neon, 1.2);
      const ls = wrapTo(p.note, W - pad * 2 - 28, 12.5);
      ls.forEach((l, i) => { g += T(pad + 14, bottom + (ls.length > 1 ? 22 : 27) + i * 17, l, { fs: 12.5, c: C.neon }); });
      return svg(bottom + 6 + 40 + 16 + (ls.length - 1) * 8, g);
    }
    return svg(bottom + 12, g);
  }

  /* ============================================================
     7. cycle · 圆环（五度圈 / 循环关系）
     {items:[{t,s,c}], center, arrow}
     ============================================================ */
  function rCycle(p) {
    const items = p.items || [], n = items.length;
    const cx = W / 2, r = p.r || (n > 8 ? 158 : 128), cy = r + (p.top == null ? 54 : p.top);
    let g = circ(cx, cy, r, "none", "#3a3358", 1.4, "6 5");
    const chip = n > 8 ? 21 : 27;
    items.forEach((it, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      const c = col(it.c || (i % 3 === 0 ? "gold" : i % 3 === 1 ? "violet2" : "neon"));
      g += circ(x, y, chip, "rgba(10,17,32,.92)", c, 2);
      const ls = wrapTo(it.t || "", chip * 1.7, 13);
      ls.forEach((l, k) => { g += T(x, y + (ls.length > 1 ? -2 + k * 14 : 5) - (ls.length - 1) * 7, l, { fs: 13, c: C.cream, a: "middle", w: 700 }); });
      if (it.s) {
        const ox = cx + Math.cos(ang) * (r + chip + (n > 8 ? 20 : 16));
        const oy = cy + Math.sin(ang) * (r + chip + (n > 8 ? 20 : 16));
        g += T(ox, oy + 4, it.s, { fs: 11, c: C.dim, a: "middle" });
      }
      if (p.arrow !== false && n > 1) {
        const nx = cx + Math.cos(ang + 2 * Math.PI / n) * r, ny = cy + Math.sin(ang + 2 * Math.PI / n) * r;
        const mx = (x + nx) / 2, my = (y + ny) / 2;
        const taper = 0.70;
        const sx = x + (mx - x) * (1 - taper), sy = y + (my - y) * (1 - taper);
        const ex = nx + (mx - nx) * (1 - taper), ey = ny + (my - ny) * (1 - taper);
        g += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${C.gold}" stroke-width="1.6"
          marker-end="url(#cmcA)" opacity=".85"/>`;
      }
    });
    const centerLines = wrapTo(p.center || "", p.cw || 150, p.cfs || 15);
    if (p.center) {
      g += circ(cx, cy, Math.max(46, r * 0.42), "rgba(7,11,20,.86)", C.violet, 1.4);
      centerLines.forEach((l, i) => {
        g += T(cx, cy + 6 + (i - (centerLines.length - 1) / 2) * (p.clh || 21), l, { fs: p.cfs || 15, c: C.gold2, a: "middle", w: 700 });
      });
    }
    return svg(cy + r + (p.pad || 48), g);
  }

  /* ============================================================
     8. bars · 横向条形（比例 / 强度 / 完成度）
     {rows:[{lb,v,c,s}], title, unit, max}
     ============================================================ */
  function rBars(p) {
    const rows = p.rows || [];
    const lbW = p.lbW || 168, x0 = 30 + lbW, avail = W - x0 - 84;
    const rh = p.rh || 38, top = p.top == null ? 52 : p.top;
    let g = "";
    if (p.title) g += T(30, top - 18, p.title, { fs: 13, c: C.gold2, w: 700 });
    rows.forEach((r0, i) => {
      const y = top + i * rh, max = p.max || 100;
      const frac = Math.max(0, Math.min(1, (r0.v || 0) / max));
      g += rr(x0, y, avail, 20, 10, "rgba(255,255,255,.05)", "#332c50", 1);
      const c = col(r0.c || "gold");
      if (frac > 0) g += rr(x0, y, Math.max(6, avail * frac), 20, 10, c, "none", 0);
      g += T(30, y + 15, r0.lb, { fs: 13, c: C.cream, w: 600 });
      if (r0.s) g += T(30, y + 30, r0.s, { fs: 10.5, c: C.dim });
      g += T(W - 28, y + 15, (r0.tx != null ? r0.tx : (Math.round(r0.v) + (p.unit || ""))), { fs: 12.5, c: c, a: "end", w: 700 });
    });
    return svg(top + rows.length * rh + 16, g);
  }

  /* ============================================================
     9. env · 曲线 / 包络（ADSR、能量曲线）
     {stages:[{x,y,lb,c}], y0,y1 fill}
     ============================================================ */
  function rEnv(p) {
    const top = 44, H = p.h || 168, left = 56, right = W - 40;
    const base = top + H, pw = right - left;
    const px = u => left + pw * u, py = v => base - H * v;
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const yy = top + (H / 4) * i;
      g += line(left, yy, right, yy, i === 4 ? "#4b4266" : "#262048", 1, i === 4 ? "" : "4 6");
    }
    g += line(left, top, left, base, "#4b4266", 1.4);
    const st = p.stages || [];
    if (st.length > 1) {
      let d = "", area = "";
      st.forEach((s2, i) => {
        const X = px(s2.x), Y = py(s2.y);
        d += (i ? ` L${X},${Y}` : `M${X},${Y}`);
        area += (i ? ` L${X},${Y}` : `M${X},${Y}`);
      });
      area += ` L${px(st[st.length - 1].x)},${base} L${px(st[0].x)},${base} Z`;
      if (p.fill !== false) g += `<path d="${area}" fill="url(#cmcArea)"/>`;
      g += `<path d="${d}" fill="none" stroke="${C.gold}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
      // 分段标签
      st.forEach((s2, i) => {
        const X = px(s2.x), Y = py(s2.y);
        g += circ(X, Y, 4.6, "#0b1220", C.gold2, 2);
        if (s2.lb) {
          const nx = st[i + 1];
          const mx = nx ? (px(s2.x) + px(nx.x)) / 2 : X + 26;
          const my = nx ? (py(s2.y) + py(nx.y)) / 2 : Y - 6;
          g += T(Math.min(mx, W - 50), my - 10, s2.lb, { fs: 12, c: C.neon, a: "middle" });
        }
        if (s2.ax) g += T(X, base + 18, s2.ax, { fs: 11, c: C.dim, a: "middle" });
      });
    }
    if (p.y1) g += T(left - 8, top + 4, p.y1, { fs: 11, c: C.dim, a: "end" });
    if (p.y0) g += T(left - 8, base + 4, p.y0, { fs: 11, c: C.dim, a: "end" });
    return svg(base + 34, g);
  }

  /* ============================================================
     10. spectrum · 频谱 / EQ 曲线
     {bands:[{f,v,lb,c}], lo,hi}
     ============================================================ */
  function rSpectrum(p) {
    const bands = p.bands || [];
    const top = 40, H = p.h || 150, left = 56, right = W - 40, base = top + H;
    const lo = Math.log(p.lo || 40), hi = Math.log(p.hi || 16000);
    const X = f => left + (Math.log(Math.max(f, 1)) - lo) / (hi - lo) * (right - left);
    const marks = [100, 1000, 10000];
    let g = "";
    [0, 1, 2, 3].forEach(i => {
      const yy = top + (H / 3) * i;
      g += line(left, yy, right, yy, i === 3 ? "#4b4266" : "#262048", 1, i === 3 ? "" : "4 6");
    });
    marks.forEach(f => {
      g += line(X(f), top, X(f), base, "#2c2650", 1, "3 5");
      g += T(X(f), base + 17, f >= 1000 ? (f / 1000) + "k" : f + "", { fs: 10.5, c: C.dim, a: "middle" });
    });
    g += T(left - 8, top + 4, p.y1 || "+", { fs: 11, c: C.dim, a: "end" });
    g += T(left - 8, base + 4, p.y0 || "−", { fs: 11, c: C.dim, a: "end" });
    if (bands.length > 1) {
      const pts = bands.map(b => ({ x: X(b.f), y: base - H * Math.max(0, Math.min(1, (b.v + 1) / 2)), b }));
      let d = `M${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], c2 = pts[i], mx = (a.x + c2.x) / 2;
        d += ` C${mx},${a.y} ${mx},${c2.y} ${c2.x},${c2.y}`;
      }
      g += `<path d="${d}" fill="none" stroke="${C.neon}" stroke-width="2.4" stroke-linecap="round"/>`;
      pts.forEach(pt => {
        const c = col(pt.b.c || "neon");
        g += circ(pt.x, pt.y, 4.2, "#0b1220", c, 2);
        if (pt.b.lb) g += T(pt.x, pt.y - 12, pt.b.lb, { fs: 11.5, c: c, a: "middle", w: 600 });
      });
    }
    if (p.note) g += T((left + right) / 2, base + 34, p.note, { fs: 11.5, c: C.dim, a: "middle" });
    return svg(base + (p.note ? 48 : 30), g);
  }

  /* ============================================================
     11. timeline · 历史 / 流程时间轴
     {items:[{t,lb,s,c}], zig}
     ============================================================ */
  function rTimeline(p) {
    const items = p.items || [], n = items.length;
    if (!n) return svg(80, "");
    const pad = p.pad || 46, avail = W - pad * 2;
    const step = n > 1 ? avail / (n - 1) : 0;
    const base = p.base || 176, topPad = 58;
    let g = line(pad, base, W - pad, base, "#4b4266", 1.6);
    items.forEach((it, i) => {
      const x = n > 1 ? pad + i * step : W / 2;
      const up = p.zig === false ? true : i % 2 === 0;
      const tipY = up ? topPad : base + 74;
      g += circ(x, base, 6.5, col(it.c || "gold"), "#0b1120", 2);
      g += line(x, base, x, tipY, "#3a3358", 1.3, "3 4");
      const last = i === n - 1;
      const anchor = last ? "end" : "start";
      const tx = last ? x - 9 : x + 9;
      const maxW = Math.min(190, n > 1 ? step * 0.92 : 240);
      const ty = tipY + (up ? -8 : 16);
      g += T(tx, ty, it.t, { fs: 14, c: col(it.c || "gold2"), w: 700, a: anchor });
      const ls = wrapTo(it.lb || "", maxW, 12);
      ls.forEach((l, k) => { g += T(tx, ty + 17 + k * 15, l, { fs: 12, c: C.cream, a: anchor }); });
      if (it.s) {
        const s2 = wrapTo(it.s, maxW - 10, 10.5);
        s2.forEach((l, k) => { g += T(tx, ty + 17 + ls.length * 15 + k * 13, l, { fs: 10.5, c: C.dim, a: anchor }); });
      }
      if (i < n - 1 && i % 2 === 0 && p.zig !== false) {
        g += `<path d="M${x + 4},${base} q${step / 2},${-16} ${step - 8},0" fill="none" stroke="${C.gold}"
          stroke-width="1.4" marker-end="url(#cmcA)" opacity=".7"/>`;
      }
    });
    return svg(base + (p.zig === false ? 50 : 118), g);
  }

  /* ============================================================
     12. prog · 和弦进行（罗马数字 + 功能）
     {bars:[{ch,r,fn,beats,c}], note}
     ============================================================ */
  function rProg(p) {
    const bars = p.bars || [];
    if (!bars.length) return svg(80, "");
    const pad = 30, top = 66, h = p.h || 62;
    const totalBeats = p.beats ? bars.reduce((s2, b) => s2 + (b.beats || 4), 0) : 0;
    const gapx = 8;
    let x = pad;
    const availW = W - pad * 2 - gapx * (bars.length - 1);
    let g = "";
    bars.forEach((b, i) => {
      const bw = p.beats ? availW * ((b.beats || 4) / totalBeats) : availW / bars.length;
      const c = col(b.c || (b.fn === "D" ? "pink" : b.fn === "S" ? "violet2" : b.fn === "T" ? "gold" : "gold"));
      g += rr(x, top, bw, h, 11, "rgba(255,255,255,.04)", c, 1.6);
      g += `<rect x="${x}" y="${top}" width="${bw}" height="${h}" rx="11" fill="${c}" opacity=".10"/>`;
      const cls = wrapTo(b.ch || "", bw - 18, b.fs || 16);
      cls.forEach((l, k) => {
        g += T(x + bw / 2, top + (b.fn ? 26 : h / 2 + 6) + k * (b.flh || 19) - (cls.length - 1) * 9, l,
          { fs: b.fs || 16, c: C.cream, a: "middle", w: 700 });
      });
      if (b.fn) {
        g += T(x + bw / 2, top + 16, b.fnLabel || b.fn, { fs: 11, c: c, a: "middle", w: 700 });
        g += T(x + bw / 2, top + h - 9, b.r || "", { fs: 12.5, c: C.dim, a: "middle" });
      } else if (b.r) {
        g += T(x + bw / 2, top + h + 18, b.r, { fs: 12.5, c: C.dim, a: "middle" });
      }
      if (i < bars.length - 1) g += `<path d="M${x + bw + 2},${top + h / 2} h${gapx - 4}" stroke="${C.gold}"
        stroke-width="1.6" marker-end="url(#cmcA)"/>`;
      x += bw + gapx;
    });
    if (p.note) g += para(pad, top + h + 40, p.note, { fs: 12, c: C.dim, w: W - pad * 2, lh: 17 });
    return svg(top + h + (p.note ? 58 : 34), g);
  }

  /* ============================================================
     13. fret · 吉他指板
     {frets, dots:[{s,f,lb,c}], root:{s,f}, capo}
     ============================================================ */
  function rFret(p) {
    const nf = p.frets || 5, strings = p.strings || 6;
    const left = 58, right = W - 40, top = 60, sh = 22;
    const bw = (right - left) / nf;
    const theight = (strings - 1) * sh;
    let g = "";
    for (let s2 = 0; s2 < strings; s2++) {
      const y = top + s2 * sh;
      g += line(left, y, right, y, s2 === 0 || s2 === strings - 1 ? "#6c6a55" : "#8a8365", s2 === 0 ? 1 : 1 + (strings - s2) * 0.18);
    }
    for (let f = 0; f <= nf; f++) {
      const x = left + f * bw;
      g += line(x, top - 8, x, top + theight + 8, f === 0 ? "#cbbfa6" : "#4b4266", f === 0 ? 4 : 1.2);
      if (f > 0 && (!p.nums === false)) g += T(x - bw / 2, top + theight + 26, f, { fs: 11, c: C.dim, a: "middle" });
    }
    const names = p.tuning || ["E", "B", "G", "D", "A", "E"];
    for (let s2 = 0; s2 < strings; s2++) g += T(left - 12, top + s2 * sh + 4, names[s2] || "", { fs: 11.5, c: C.gold, a: "end" });
    const sx = f => Math.max(left + 12, Math.min(left + (f === 0 ? 18 : (f - 0.5) * bw), right - 12));
    const sy = s2 => top + s2 * sh;
    (p.dots || []).forEach(d => {
      const x = sx(d.f), y = sy(d.s - 1), c = col(d.c || (p.root && d.s === p.root.s && d.f === p.root.f ? "gold" : "violet2"));
      g += circ(x, y, 10.5, "#0c1426", c, 2.2);
      g += T(x, y + 4, d.lb != null ? d.lb : "", { fs: 11.5, c: C.cream, a: "middle", w: 700 });
    });
    if (p.note) g += para(left, top + theight + 46, p.note, { fs: 12, c: C.dim, w: right - left, lh: 17 });
    return svg(top + theight + (p.note ? 62 : 42), g);
  }

  /* ============================================================
     14. stage · 平面布置图（管弦乐座位 / 舞台 / 制作链路拓扑）
     {h, blocks:[{x,y,w,h,t,c,s}], conductor:{x,y,lb}}
     坐标用 0–100 的百分比
     ============================================================ */
  function rStage(p) {
    const H = p.H || 250, pad = 40;
    const ax = pad, ay = 44, aw = W - pad * 2, ah = H - pad - 34;
    const X = u => ax + aw * u / 100, Y = v => ay + ah * v / 100;
    let g = rr(ax, ay, aw, ah, 14, "rgba(0,0,0,.22)", "#332c50", 1.2);
    if (p.grid !== false) {
      for (let i = 1; i < 6; i++) { g += line(ax + aw * i / 6, ay, ax + aw * i / 6, ay + ah, "#241f3d", 1, "3 6"); }
    }
    if (p.conductor) {
      g += circ(X(p.conductor.x), Y(p.conductor.y), 15, "rgba(224,169,109,.18)", C.gold, 2);
      g += T(X(p.conductor.x), Y(p.conductor.y) + 5, "指挥", { fs: 11, c: C.gold2, a: "middle", w: 700 });
    }
    (p.blocks || []).forEach(b => {
      const x = X(b.x), y = Y(b.y), w = X(b.x + b.w) - x, h = Y(b.y + b.h) - y;
      const c = col(b.c || "violet2");
      g += rr(x, y, w, h, 9, c, "none", 0);
      g += rr(x + 1.5, y + 1.5, Math.max(0, w - 3), Math.max(0, h - 3), 8, hexA(c, .18), c, 1.3);
      const ls = wrapTo(b.t || "", w - 10, 12.5);
      ls.forEach((l, k) => {
        g += T(x + w / 2, y + h / 2 + (b.s ? -2 : 5) + (k - (ls.length - 1) / 2) * 15, l, { fs: 12.5, c: C.cream, a: "middle", w: 700 });
      });
      if (b.s) { const s2 = wrapTo(b.s, w - 8, 10.5); s2.forEach((l, k) => { g += T(x + w / 2, y + h / 2 + 15 + (k - (s2.length - 1) / 2) * 12, l, { fs: 10.5, c: C.dim, a: "middle" }); }); }
    });
    return svg(H, g);
  }
  function hexA(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace("#", ""));
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
  }

  /* ============================================================
     15. axes · 二维坐标（情绪 → 参数）
     {xl0,xl1,yl0,yl1, points:[{x,y,lb,c}], xName,yName}
     ============================================================ */
  function rAxes(p) {
    const H = p.H || 236, pad = 52;
    const ax = pad, ay = 34, aw = W - pad * 2, ah = H - pad - 30;
    const X = u => ax + aw * u, Y = v => ay + ah * (1 - v);
    let g = rr(ax, ay, aw, ah, 8, "rgba(0,0,0,.18)", "#332c50", 1);
    for (let i = 1; i < 4; i++) {
      g += line(ax + aw * i / 4, ay, ax + aw * i / 4, ay + ah, "#241f3d", 1, "3 6");
      g += line(ax, ay + ah * i / 4, ax + aw, ay + ah * i / 4, "#241f3d", 1, "3 6");
    }
    g += line(ax, ay + ah / 2, ax + aw, ay + ah / 2, "#4b4266", 1.4);
    g += line(ax + aw / 2, ay, ax + aw / 2, ay + ah, "#4b4266", 1.4);
    if (p.xName) g += T(ax + aw / 2, ay + ah + 24, p.xName, { fs: 11.5, c: C.dim, a: "middle" });
    if (p.yName) g += T(ax - 12, ay + ah / 2, p.yName, { fs: 11.5, c: C.dim, a: "middle", r: -90 });
    if (p.xl0) g += T(ax + 6, ay + ah + 22, p.xl0, { fs: 11, c: C.dim, a: "start" });
    if (p.xl1) g += T(ax + aw - 6, ay + ah + 22, p.xl1, { fs: 11, c: C.dim, a: "end" });
    if (p.yl0) g += T(ax - 8, ay + ah - 4, p.yl0, { fs: 11, c: C.dim, a: "end" });
    if (p.yl1) g += T(ax - 8, ay + 12, p.yl1, { fs: 11, c: C.dim, a: "end" });
    (p.points || []).forEach(pt => {
      const x = X(pt.x), y = Y(pt.y), c = col(pt.c || "gold");
      g += circ(x, y, pt.r || 16, hexA(c, .22), c, 1.8);
      const ls = wrapTo(pt.lb || "", (pt.r || 16) * 3.4, 12);
      ls.forEach((l, k) => { g += T(x, y + 4 + (k - (ls.length - 1) / 2) * 14, l, { fs: 12, c: C.cream, a: "middle", w: 600 }); });
    });
    return svg(H, g);
  }

  /* ============================================================
     16. tracks · 编曲轨视图（时间 × 声部）
     {total, tracks:[{n, blocks:[{x,w,t,c}]}], marks:[{x,lb}]}
     ============================================================ */
  function rTracks(p) {
    const total = p.total || 16, tracks = p.tracks || [];
    const left = 92, right = W - 34, top = 56, rh = p.rh || 30, gapY = 8;
    const pw = right - left, bw = pw / total;
    let g = "";
    for (let i = 0; i <= total; i += (p.rulerStep || 4)) {
      const x = left + bw * i;
      g += line(x, top - 12, x, top + tracks.length * (rh + gapY) - gapY + 6, "#241f3d", 1);
      g += T(x, top - 18, (i + 1), { fs: 10.5, c: C.dim, a: "middle" });
    }
    tracks.forEach((tr, i) => {
      const y = top + i * (rh + gapY);
      g += T(left - 10, y + rh / 2 + 4, tr.n, { fs: 12, c: C.gold2, a: "end", w: 700 });
      g += rr(left, y, pw, rh, 7, "rgba(255,255,255,.035)", "#2c2650", 1);
      (tr.blocks || []).forEach(b => {
        const x = left + bw * b.x, w = Math.max(bw * 0.5, bw * b.w - 3);
        const c = col(b.c || "violet2");
        g += rr(x, y + 4, w, rh - 8, 6, hexA(c, .35), c, 1.2);
        const ls = wrapTo(b.t || "", w - 8, 11);
        ls.forEach((l, k) => { g += T(x + w / 2, y + rh / 2 + (k - (ls.length - 1) / 2) * 13 + 1, l, { fs: 11, c: C.cream, a: "middle", w: 600 }); });
      });
    });
    const bottom = top + tracks.length * (rh + gapY) - gapY;
    (p.marks || []).forEach(m => {
      const x = Math.max(left + 6, Math.min(left + bw * m.x, W - 62));
      g += line(left + bw * m.x, bottom + 6, left + bw * m.x, bottom + 26, C.neon, 1.4, "3 3");
      g += T(x, bottom + 38, m.lb, { fs: 11, c: C.neon, a: "middle" });
    });
    return svg(bottom + (p.marks && p.marks.length ? 48 : 22), g);
  }

  /* ============================================================
     17. wave · 波形对照（揉弦 / 量化 / 抖动）
     {rows:[{lb,amp,cy,c,note}]}
     ============================================================ */
  function rWave(p) {
    const rows = p.rows || [];
    const left = p.lbW || 122, x0 = left, x1 = W - 40;
    const rh = p.rh || 62, top = 46;
    let g = "";
    rows.forEach((r0, i) => {
      const cy = top + i * rh + rh / 2 - 6;
      const amp = (r0.amp == null ? 1 : r0.amp) * (rh * 0.30);
      const cycles = r0.cy == null ? 3 : r0.cy;
      const c = col(r0.c || "gold");
      g += line(x0, cy, x1, cy, "#2c2650", 1, "3 5");
      let d = "";
      const steps = Math.max(60, Math.floor((x1 - x0) / 3));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, x = x0 + (x1 - x0) * t;
        const y = cy - Math.sin(t * Math.PI * 2 * cycles) * amp * (r0.decay ? Math.exp(-t * 1.6) : 1);
        d += (k ? ` L${x},${y}` : `M${x},${y}`);
      }
      g += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
      g += T(x0 - 12, cy + 4, r0.lb, { fs: 12.5, c: C.cream, a: "end", w: 600 });
      if (r0.s) g += T(x0 - 12, cy + 19, r0.s, { fs: 10.5, c: C.dim, a: "end" });
    });
    if (p.note) {
      const y = top + rows.length * rh + 4;
      const ls = wrapTo(p.note, W - 60, 12);
      ls.forEach((l, k) => { g += T(30, y + k * 17, l, { fs: 12, c: C.dim }); });
      return svg(y + ls.length * 17 + 8, g);
    }
    return svg(top + rows.length * rh + 10, g);
  }

  /* ============================================================
     18. note · 文字提示条（当一张图反而更啰嗦时）
     ============================================================ */
  function rNote(p) {
    const items = p.items || [];
    const pad = 30, w = W - pad * 2, top = 40;
    let g = rr(pad, top, w, 24 + items.length * 24, 12, "rgba(0,245,212,.06)", C.neon, 1.2);
    g += T(pad + 16, top + 22, p.title || "记住这三点", { fs: 13.5, c: C.neon, w: 700 });
    items.forEach((it, i) => {
      const y = top + 46 + i * 24;
      g += circ(pad + 18, y - 4, 3.2, C.gold);
      const ls = wrapTo(it.t || it, w - 52, 12.5);
      ls.forEach((l, k) => { g += T(pad + 30, y + k * 16, l, { fs: 12.5, c: C.cream }); });
    });
    return svg(top + 24 + items.length * 24 + 22, g);
  }

  /* ============================================================
     19. daw · DAW 界面布局图（窗口 chrome + 轨道区 + 标注）
     {title, topbar:[{t,c}], tracks:[{n, blocks:[{x,w,t,c}]}], notes:[{x,y,lb,c,tail}], total}
     ============================================================ */
  function rDaw(p) {
    const pad = 42, top = 46, winW = W - pad * 2;
    const headH = 34, rowH = p.rh || 27, gapY = 6, nameW = 84;
    const headPad = 8;
    let g = "";
    // 窗口外框
    g += rr(pad, top, winW, 30, 10, "#16203a", "#3a3358", 1.2);
    // 交通灯
    ["#ff5d6c", "#f2c879", "#3ddc97"].forEach((c, i) => { g += circ(pad + 16 + i * 15, top + 15, 5, c); });
    g += T(pad + 62, top + 20, p.title || "DAW 工程窗口", { fs: 12.5, c: C.cream, w: 600 });
    (p.topbar || []).forEach((b, i) => {
      g += T(pad + winW - 12 - i * 78, top + 20, b, { fs: 11, c: C.dim, a: "end" });
    });
    let y = top + 30 + 6;
    // 轨道区底板
    const list = p.tracks || [];
    const bodyH = list.length * (rowH + gapY) + 16;
    g += rr(pad, y, winW, bodyH, 12, "#0b1220", "#2c2650", 1.2);
    // 轨道头与格子
    const contentX = pad + nameW, contentW = winW - nameW - 12;
    const total = p.total || 16;
    const totalUnits = p.beats || total;
    list.forEach((tr, i) => {
      const ty = y + 8 + i * (rowH + gapY);
      g += rr(pad + 6, ty, nameW - 12, rowH, 6, "rgba(157,78,221,.14)", "#3a3358", 1);
      g += T(pad + 12, ty + rowH / 2 + 4, tr.n, { fs: 11.5, c: C.gold2, w: 700 });
      if (tr.r) g += T(pad + nameW - 18, ty + rowH / 2 + 4, tr.r, { fs: 10, c: C.dim, a: "end" });
      g += rr(contentX, ty, contentW, rowH, 6, "rgba(255,255,255,.035)", "#241f3d", 1);
      for (let k = 1; k < totalUnits; k++) {
        g += line(contentX + contentW * k / totalUnits, ty, contentX + contentW * k / totalUnits, ty + rowH, "#1d1836", 1);
      }
      (tr.blocks || []).forEach(b => {
        const bx = contentX + contentW * b.x / totalUnits;
        const bw2 = Math.max(8, contentW * b.w / totalUnits - 2);
        const c = col(b.c || "violet2");
        g += rr(bx, ty + 3, bw2, rowH - 6, 5, hexA(c, .38), c, 1.1);
        const ls = wrapTo(b.t || "", bw2 - 6, 10.5);
        ls.forEach((l, k) => {
          g += T(bx + bw2 / 2, ty + rowH / 2 + (k - (ls.length - 1) / 2) * 12 + 1, l, { fs: 10.5, c: C.cream, a: "middle", w: 600 });
        });
      });
    });
    const bottom = y + bodyH;
    // 标注气泡（y 为内容区比例 0–1）
    const noteExtra = 30;
    (p.notes || []).forEach(nt => {
      const nx = pad + winW * Math.max(0, Math.min(1, nt.x));
      const ny = (top + 36) + bodyH * Math.max(0, Math.min(1, nt.y));
      g += bubble(Math.max(pad - 6, Math.min(nx, pad + winW - 212)), ny, nt.lb,
        { w: nt.bw || 168, fs: 11, tail: nt.tail || "left", c: col(nt.c || "gold") });
    });
    return svg(bottom + 18 + noteExtra, g);
  }

  /* ============================================================
     20. roll · 钢琴卷帘（Piano Roll）
     {title, rows:[{n,black}], notes:[{r,x,w,t,c}], step,len}
     ============================================================ */
  function rRoll(p) {
    const rows = p.rows || ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3", "A3"];
    const len = p.len || 8, keypadW = 52, pad = 30, top = 66;
    const gridX = pad + keypadW, gridW = W - pad * 2 - keypadW;
    const rh = Math.min(22, Math.max(15, (p.h || 210) / rows.length));
    const cw = gridW / len;
    let g = "";
    if (p.title) g += T(pad, top - 24, p.title, { fs: 13, c: C.gold2, w: 700 });
    // 横向宫格（音高）
    rows.forEach((r0, i) => {
      const y = top + i * rh, nm = typeof r0 === "string" ? r0 : r0.n;
      const black = typeof r0 === "string" ? /[#♯]/.test(nm) : !!r0.black;
      const pc = (nm.match(/^[A-G]/) || [""])[0];
      const blackRow = black || ["B", "A", "G", "F", "E", "D"].indexOf(pc) >= 0 && /[#♯]/.test(nm);
      g += rr(gridX, y, gridW, rh - 1, 0, !/[#♯]/.test(nm) ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.018)");
      // 左侧迷你键盘
      g += rr(pad, y, keypadW - 6, rh - 1, 3, /[#♯]/.test(nm) ? "#141d33" : "#ddd6c4", "#241f3d", .8);
      g += T(pad + keypadW - 12, y + rh / 2 + 3.5, nm, { fs: 10, c: /[#♯]/.test(nm) ? C.dim : "#3a3358", a: "end", w: 600 });
    });
    // 纵向拍线（每拍）
    for (let k = 0; k <= len; k++) {
      const x = gridX + cw * k, strong = k % 4 === 0;
      g += line(x, top, x, top + rows.length * rh, strong ? "#4b4266" : "#241f3d", strong ? 1.3 : 1);
      if (strong && k < len) g += T(x + cw * 2, top - 8, (k / 4 + 1), { fs: 10.5, c: C.dim, a: "middle" });
    }
    // 音符块
    (p.notes || []).forEach(nt => {
      const r0 = Math.max(0, Math.min(rows.length - 1, nt.r));
      const y = top + r0 * rh + 2;
      const x = gridX + cw * nt.x, wgt = Math.max(cw * 0.6, cw * (nt.w || 1) - 3);
      const c = col(nt.c || "violet2");
      g += rr(x, y, wgt, rh - 4, 4, hexA(c, .62), c, 1.1);
      const ls = wrapTo(nt.t || "", wgt - 6, 10);
      ls.forEach((l, k) => { g += T(x + wgt / 2, y + rh / 2 - 4 + (k - (ls.length - 1) / 2) * 11, l, { fs: 10, c: "#0d1424", a: "middle", w: 700 }); });
      // 力度条
      const vel = nt.v == null ? 0.8 : nt.v;
      if (wgt > 22) g += rr(x + 3, y + rh - 8, (wgt - 6) * vel, 2.6, 1.3, "rgba(13,20,36,.45)");
    });
    const bottom = top + rows.length * rh;
    if (p.note) {
      const ls = wrapTo(p.note, W - 60, 12);
      ls.forEach((l, k) => { g += T(pad, bottom + 22 + k * 17, l, { fs: 12, c: C.dim }); });
      return svg(bottom + 20 + ls.length * 17, g);
    }
    return svg(bottom + 18, g);
  }

  /* ============================================================
     渲染入口 renderPanel(spec) -> HTML 字符串
     ============================================================ */
  const R = {
    keys: rKeys, staff: rStaff, stack: rStack, steps: rSteps, flow: rFlow,
    compare: rCompare, cycle: rCycle, bars: rBars, env: rEnv, spectrum: rSpectrum,
    timeline: rTimeline, prog: rProg, fret: rFret, stage: rStage, axes: rAxes,
    tracks: rTracks, wave: rWave, note: rNote, daw: rDaw, roll: rRoll
  };
  function renderPanel(spec) {
    const fn = R[spec && spec.type];
    if (!fn) return "";
    try { return fn(spec); } catch (e) { return ""; }
  }
  /* strip: [{n,t,type,...,cap}] -> 完整 HTML */
  function renderStrip(list) {
    if (!list || !list.length) return "";
    return `<div class="cmc">` + list.map((sp, i) => {
      const inner = renderPanel(sp);
      if (!inner) return "";
      return `<figure class="cmc-p">
      <div class="cmc-h"><i>${sp.n || (i + 1)}</i><span>${esc(sp.t || "")}</span></div>
      <div class="cmc-img">${inner}</div>
      ${sp.cap ? `<figcaption>${esc(sp.cap)}</figcaption>` : ""}
    </figure>`;
    }).join("") + `</div>`;
  }

  window.MLDIAG = { renderPanel, renderStrip, R, C, esc, T, rr, wrapTo };
})();
