/* ============================================================
   MUSIC LIFE · 乐器专用图解渲染器（挂载到 MLDIAG.R）
   这些图必须「结构与演奏方式绝对准确」——五线谱可以在 caption 里说明，
   但 88 键键盘 / 47 弦竖琴踏板 / 四槌握法 / 手碟音区这类结构一旦画错就是硬伤，
   所以全部用确定性几何绘制，不用 AI 生成。
   ============================================================ */
(function () {
  "use strict";
  const M = window.MLDIAG;
  if (!M) { console.warn("diagrams.js 未加载，MLDIAG.R 扩展跳过"); return; }
  const C = M.C, W = 760;
  const T = M.T, rr = M.rr, wrapTo = M.wrapTo, esc = M.esc;
  const ANCH = "#070b14";
  // MLDIAG 只导出了 T / rr / wrapTo / esc，其余基础图元在这里本地实现
  function line(x1, y1, x2, y2, stroke, sw, dash) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 1}"
      stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  }
  function circ(x, y, r, fill, stroke, sw) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke || "none"}" stroke-width="${sw || 0}"/>`;
  }

  const BLACK = [1, 3, 6, 8, 10];               // 半音 pitch class
  const isBlack = pc => BLACK.indexOf(pc) >= 0;
  const NM = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const midiName = m => NM[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  function svg(h, g, title, cap) {
    return `<figure class="cmc-p"><svg viewBox="0 0 ${W} ${h}" role="img"
      xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
      <rect width="100%" height="100%" fill="${ANCH}"/>${g}</svg>
      ${(title || cap) ? `<figcaption><b>${esc(title || "")}</b>${cap ? " — " + esc(cap) : ""}</figcaption>` : ""}
    </figure>`;
  }
  function head(title, sub) {
    let g = `<rect x="0" y="0" width="${W}" height="44" fill="rgba(157,78,221,.10)"/>`;
    g += T(24, 28, title, { fs: 17, c: C.gold2, w: 700 });
    if (sub) g += T(W - 24, 28, sub, { fs: 11.5, c: C.dim, a: "end" });
    return g;
  }

  /* ==========================================================
     1. range — 乐器音域对照图（真实 88 键键盘做标尺）
     p:{title,sub,cap,ranges:[{nm,from,to,c,em}]}
     ========================================================== */
  function rRange(p) {
    const left = 44, right = W - 44, bw = right - left;
    const LO = 21, HI = 108;                       // A0 – C8
    const nWhite = [];                             // 白键序号表
    for (let m = LO; m <= HI; m++) if (!isBlack(m % 12)) nWhite.push(m);
    const wk = bw / nWhite.length;
    const xOfMidi = m => {
      const idx = nWhite.filter(x => x <= m).length - 1;
      if (!isBlack(m % 12)) return left + idx * wk;
      return left + idx * wk + wk;                  // 黑键落在后一个白键左缘向右半格
    };
    let top = 44, kbY = 74, kbH = 34;
    let g = head(p.title, p.sub);
    // 键盘本体
    g += rr(left - 3, kbY - 3, bw + 6, kbH + 6, 5, "rgba(255,255,255,.05)", "#3a3358", 1);
    nWhite.forEach((m, i) => {
      const x = left + i * wk;
      g += rr(x, kbY, wk - 0.6, kbH, 2, "rgba(243,234,214,.90)", "rgba(0,0,0,.35)", 0.6);
    });
    for (let m = LO; m <= HI; m++) {
      if (!isBlack(m % 12)) continue;
      const x = left + nWhite.filter(x => x < m).length * wk - wk * 0.32;
      g += rr(x, kbY, wk * 0.64, kbH * 0.62, 2, "#10182c", "rgba(255,255,255,.18)", 0.6);
    }
    // 八度刻度
    for (let m = 24; m <= 108; m += 12) {
      const x = xOfMidi(m);
      g += line(x, kbY + kbH, x, kbY + kbH + 7, "#3a3358", 1);
      if (m % 24 === 0) g += T(x, kbY + kbH + 20, "C" + (m / 12 - 1), { fs: 10, c: C.dim, a: "middle" });
    }
    let y = kbY + kbH + 34;
    const rows = p.ranges || [];
    const rowH = rows.length > 5 ? 30 : 36;
    rows.forEach((r, i) => {
      const yy = y + i * (rowH + 12);
      const x1 = xOfMidi(Math.max(LO, Math.min(HI, r.from)));
      const x2 = xOfMidi(Math.max(LO, Math.min(HI, r.to)));
      const c = r.c === "pink" ? C.pink : r.c === "good" ? C.good : r.c === "neon" ? C.neon :
        r.c === "violet" ? C.violet2 : C.gold;
      g += line(left, yy + rowH / 2, right, yy + rowH / 2, "rgba(255,255,255,.05)", rowH - 4);
      g += rr(x1, yy + 4, Math.max(6, x2 - x1), rowH - 8, 6, c + "33", c, 1.4);
      g += T(left - 8, yy + rowH / 2 + 5, (r.em || "") + (r.nm || ""), { fs: 12.5, c: c, a: "end", w: 700 });
      const ns = midiName(r.from) + " – " + midiName(r.to);
      const inside = (x2 - x1) > 88;
      g += T(inside ? x1 + 10 : x2 + 8, yy + rowH / 2 + 5, ns,
        { fs: 11.5, c: inside ? C.cream : c, a: inside ? "middle" : "start", w: 600 });
      if (inside) { /* 居中文字已够 */ }
      else if (x2 + 8 + ns.length * 7 > W - 20) g += "";
    });
    y = y + rows.length * (rowH + 12);
    if (p.note) g += para2(24, y + 6, p.note, bw, 12, C.dim);
    return svg(y + (p.note ? 40 : 16), g);
  }

  function para2(x, y, s, w, fs, c) {
    const lines = wrapTo(s, w, fs);
    return lines.map((l, i) => T(x, y + i * (fs + 5), l, { fs: fs, c: c || C.cream })).join("");
  }

  /* ==========================================================
     2. mallet — 键盘打击乐音板排列（平面俯视）
     木琴 / 马林巴都是「自然音一排 + 变化音升高的后排」，
     后排必须真的高一档、位置错开——这是视奏时的关键参照。
     p:{title,sub,cap,from,to,zones:[{a,b,lb}],note}
     ========================================================== */
  function rMallet(p) {
    const left = 52, right = W - 40;
    let g = head(p.title, p.sub);
    const from = p.from == null ? 60 : p.from, to = p.to == null ? 96 : p.to;
    const nat = [], acc = [];
    for (let m = from; m <= to; m++) (isBlack(m % 12) ? acc : nat).push(m);
    const slotW = Math.min(26, (right - left) / Math.max(nat.length, 1));
    const natY = 96, natH = 46, accY = 66, accH = 40;

    // 后排（变化音，升高）
    acc.forEach(m => {
      const x = left + nat.filter(n => n < m).length * slotW - slotW * 0.5;
      g += rr(x + 1.5, accY, slotW - 3, accH, 3, "rgba(0,245,212,.16)", C.neon, 1.1);
    });
    // 前排（自然音）
    nat.forEach((m, i) => {
      const isC = m % 12 === 0;
      g += rr(left + i * slotW + 1, natY, slotW - 2, natH, 3,
        isC ? "rgba(224,169,109,.22)" : "rgba(243,234,214,.14)",
        isC ? C.gold : "#4b4266", isC ? 1.4 : 0.8);
      if (isC) g += T(left + i * slotW + slotW / 2, natY + natH + 18, "C" + (Math.floor(m / 12) - 1),
        { fs: 11, c: C.gold2, a: "middle", w: 700 });
    });
    let y = natY + natH + 34;
    // 左右方向指示
    g += T(left, natY - 12, "低音 ◀", { fs: 11.5, c: C.dim });
    g += T(right, natY - 12, "▶ 高音", { fs: 11.5, c: C.dim, a: "end" });
    // 分区标注
    (p.zones || []).forEach(z => {
      const i1 = nat.indexOf(z.a), i2 = nat.indexOf(z.b);
      if (i1 < 0 || i2 < 0) return;
      const x1 = left + i1 * slotW, x2 = left + i2 * slotW + slotW;
      const yy = y + 6;
      g += line(x1, yy - 4, x1, yy + 6, C.neon, 1.3);
      g += line(x2, yy - 4, x2, yy + 6, C.neon, 1.3);
      g += line(x1, yy + 6, x2, yy + 6, C.neon, 1.1, "4 3");
      g += T((x1 + x2) / 2, yy + 22, z.lb, { fs: 12, c: C.neon, a: "middle", w: 600 });
      y += 34;
    });
    if (p.note) g += para2(left, y + 12, p.note, right - left, 12.5, C.cream);
    return svg(y + (p.note ? 44 : 20), g);
  }

  /* ==========================================================
     3. grip — 槌挝握法（双槌 / 四槌  Burton / 四槌 traditional）
     抽象几何：手掌椭圆 + 指卷 + 交叉的槌杆 + 编号
     p:{title,sub,cap,views:[{nm,twy:'two'|'four',note}]}
     ========================================================== */
  function rGrip(p) {
    let g = head(p.title, p.sub);
    const views = p.views || [];
    const colW = (W - 60) / views.length;
    const baseY = 200;
    views.forEach((v, i) => {
      const cx = 50 + i * colW + colW / 2 - 20;
      // 手掌
      g += `<ellipse cx="${cx}" cy="${baseY}" rx="42" ry="34" fill="rgba(242,200,121,.13)"
        stroke="${C.gold}" stroke-width="1.4"/>`;
      g += `<ellipse cx="${cx}" cy="${baseY + 6}" rx="26" ry="20" fill="rgba(255,255,255,.04)"
        stroke="rgba(243,234,214,.25)" stroke-width="1"/>`;
      // 手指卷
      [-1, 0, 1, 2].forEach(k => {
        g += circ(cx + k * 12, baseY + 26, 5.5, "rgba(243,234,214,.10)", "rgba(243,234,214,.35)", 1);
      });
      // 槌杆
      const mkBar = (a1, a2, col, no) => {
        const len = 128;
        const x1 = cx + Math.cos(a1) * len, y1 = baseY + Math.sin(a1) * len;
        const x2 = cx + Math.cos(a2) * len, y2 = baseY + Math.sin(a2) * len;
        g += line(x1, y1, x2, y2, col, 4);
        g += circ(Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2), 9, col, "#070b14", 1.4);
        g += T((x1 + x2) / 2, (y1 + y2) / 2 + 4, String(no), { fs: 11, c: "#070b14", a: "middle", w: 700 });
      };
      if (v.twy === "two") {
        mkBar(Math.PI * 1.18, Math.PI * 1.82, C.gold, 1);
        mkBar(Math.PI * 0.18, Math.PI * 0.82, C.gold2, 2);
      } else if (v.twy === "cross") {           // Burton：交叉握法，内侧两槌共用交点
        mkBar(Math.PI * 1.22, Math.PI * 1.78, C.neon, 1);
        mkBar(Math.PI * 0.22, Math.PI * 0.78, C.neon, 2);
        mkBar(Math.PI * 1.10, Math.PI * 1.66, C.violet2, 3);
        mkBar(Math.PI * 0.34, Math.PI * 0.90, C.violet2, 4);
      } else {                                   // traditional：外两槌夹在指间
        mkBar(Math.PI * 1.14, Math.PI * 1.70, C.pink, 1);
        mkBar(Math.PI * 0.30, Math.PI * 0.86, C.pink, 2);
        mkBar(Math.PI * 1.02, Math.PI * 1.58, C.gold2, 3);
        mkBar(Math.PI * 0.42, Math.PI * 0.98, C.gold2, 4);
      }
      g += T(cx, baseY - 52, v.nm, { fs: 14, c: C.gold2, a: "middle", w: 700 });
      if (v.note) {
        const ls = wrapTo(v.note, colW - 20, 11.5);
        ls.forEach((l, k) => g += T(cx, baseY + 56 + k * 16, l, { fs: 11.5, c: C.dim, a: "middle" }));
      }
    });
    const bottom = 300;
    if (p.note) g += para2(40, bottom, p.note, W - 80, 12.5, C.cream);
    return svg(bottom + (p.note ? 40 : 16), g);
  }

  /* ==========================================================
     4. handpan — 手碟音面布局（俯视）
     真实结构：中央 Ding（基音）+ 环绕的 7～9 个音区 + 侧面 Gu 出音孔
     p:{title,sub,cap,ding,fields:[{n,lb}],gu}
     ========================================================== */
  function rHandpan(p) {
    let g = head(p.title, p.sub);
    const cx = 300, cy = 210, R = 138;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.86}" fill="rgba(157,78,221,.09)"
      stroke="${C.violet2}" stroke-width="1.6"/>`;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${R - 16}" ry="${(R - 16) * 0.86}" fill="none"
      stroke="rgba(157,78,221,.30)" stroke-width="1" stroke-dasharray="4 4"/>`;
    // 中央 Ding
    g += `<ellipse cx="${cx}" cy="${cy}" rx="42" ry="36" fill="rgba(224,169,109,.22)"
      stroke="${C.gold}" stroke-width="2"/>`;
    g += T(cx, cy + 5, p.ding || "Ding", { fs: 15, c: C.gold2, a: "middle", w: 700 });
    g += T(cx, cy + 22, "中央基音", { fs: 10.5, c: C.dim, a: "middle" });
    // 环绕音区
    const fs = p.fields || [];
    const rRing = R * 0.58;
    fs.forEach((f, i) => {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / fs.length);
      const x = cx + Math.cos(a) * rRing, y = cy + Math.sin(a) * rRing * 0.86;
      const c = i % 2 ? C.neon : C.good;
      g += `<ellipse cx="${x}" cy="${y}" rx="27" ry="23" fill="${c}22" stroke="${c}" stroke-width="1.3"/>`;
      g += T(x, y + 4, f.n, { fs: 12.5, c: c, a: "middle", w: 700 });
      // 外侧引线标注
      const ox = cx + Math.cos(a) * (R + 4), oy = cy + Math.sin(a) * (R + 4) * 0.86;
      const tx = cx + Math.cos(a) * (R + 46), ty = cy + Math.sin(a) * (R + 46) * 0.86;
      g += line(ox, oy, tx, ty, "rgba(255,255,255,.22)", 1, "3 3");
      if (f.lb) {
        const anchor = Math.cos(a) > 0.25 ? "start" : Math.cos(a) < -0.25 ? "end" : "middle";
        g += T(tx, ty + (Math.sin(a) > 0 ? 12 : -4), f.lb, { fs: 11.5, c: C.cream, a: anchor });
      }
    });
    // Gu 孔
    g += `<ellipse cx="${cx + R - 4}" cy="${cy - R * 0.86 + 4}" rx="17" ry="13"
      fill="rgba(0,0,0,.55)" stroke="${C.dim}" stroke-width="1.2"/>`;
    g += T(cx + R - 4, cy - R * 0.86 + 8, "Gu", { fs: 11, c: C.dim, a: "middle", w: 700 });
    g += T(cx + R + 26, cy - R * 0.86 + 8, "侧面出音孔", { fs: 11, c: C.dim, a: "start" });
    // 说明面板
    const bx = 560;
    g += rr(bx, 90, 178, 210, 12, "rgba(255,255,255,.04)", "#2c2650", 1);
    const notes = p.notes || [];
    g += T(bx + 14, 112, "怎么读这张图", { fs: 12.5, c: C.gold2, w: 700 });
    notes.slice(0, 7).forEach((t, i) => {
      const ls = wrapTo(t, 152, 11);
      ls.forEach((l, k) => g += T(bx + 14, 134 + i * 24 + k * 14, l, { fs: 11, c: C.cream }));
    });
    const h = 380;
    return svg(h, g);
  }

  /* ==========================================================
     5. harp — 竖琴踏板系统（7 个踏板 × 3 档，真实音名与弦色）
     真琴规定：C 弦染红、F 弦染黑（或蓝），是读谱找弦的唯一路标。
     p:{title,sub,cap,pos:[{pn,state:'b'|'n'|'s'}],note}
     ========================================================== */
  function rHarp(p) {
    let g = head(p.title, p.sub);
    const names = ["D", "C", "B", "E", "F", "G", "A"];
    const colorOf = n => n === "C" ? "#ff5d6c" : n === "F" ? "#4b4266" : C.gold;
    const left = 66, top = 84;
    const colW = (W - left - 60) / 7;
    // 立柱与琴颈（示意）
    g += line(left - 26, top - 26, left - 26, top + 150, "#3a3358", 3);
    g += `<path d="M${left - 26},${top - 26} Q${W / 2},${top - 66} ${W - 40},${top - 16}"
      fill="none" stroke="#3a3358" stroke-width="3"/>`;
    names.forEach((n, i) => {
      const x = left + i * colW + colW / 2;
      const st = (p.pos && p.pos[i] && p.pos[i].state) || "n";
      const cc = colorOf(n);
      // 弦
      g += line(x, top - 6, x, top + 128, cc, st === "n" ? 2.2 : 2.8);
      g += circ(x, top - 6, 4.5, cc, "#070b14", 1);
      g += T(x, top - 14, n, { fs: 12.5, c: cc, a: "middle", w: 700 });
      // 踏板槽（三档）
      const px = x - 15, py = top + 148;
      g += rr(px, py, 30, 62, 7, "rgba(255,255,255,.05)", "#4b4266", 1);
      ["♭", "♮", "♯"].forEach((s, k) => {
        const yy = py + 14 + k * 18;
        const at = (k === 0 && st === "b") || (k === 1 && st === "n") || (k === 2 && st === "s");
        g += T(px + 15, yy + 4, s, { fs: 12, c: at ? C.gold2 : "#5a5480", a: "middle", w: at ? 700 : 400 });
        if (at) g += rr(px + 3, yy - 10, 24, 18, 5, "rgba(224,169,109,.22)", C.gold, 1.2);
      });
      const lb = (p.pos && p.pos[i] && p.pos[i].lb) || "";
      if (lb) g += T(x, py + 78, lb, { fs: 10.5, c: C.dim, a: "middle" });
    });
    let y = top + 232;
    const note = p.note || "每个踏板控制全琴所有同名弦：踩到底该音降半音，回到中槽为还原，踩到顶升高半音。谱面调号要先排踏板再弹。";
    const ls = wrapTo(note, W - 120, 12.5);
    ls.forEach((l, k) => g += T(60, y + k * 18, l, { fs: 12.5, c: C.cream }));
    return svg(y + ls.length * 18 + 20, g);
  }

  /* ==========================================================
     6. bowzone — 弦乐发音三变量 + 弓段划分
     p:{title,sub,cap,zones:[{a,b,lb,c}],bow:[{a,b,lb}],note}
     ========================================================== */
  function rBowzone(p) {
    let g = head(p.title, p.sub);
    const left = 60, right = W - 60;
    // ① 接触点：一条弦（指板 ← → 琴码）
    const y1 = 110;
    g += line(left, y1, right, y1, C.gold, 3);
    const total = right - left;
    (p.zones || []).forEach(z => {
      const x1 = left + total * z.a, x2 = left + total * z.b;
      const c = z.c === "neon" ? C.neon : z.c === "pink" ? C.pink : C.gold;
      g += rr(x1, y1 - 22, x2 - x1, 44, 8, c + "22", c, 1.2);
      g += T((x1 + x2) / 2, y1 - 32, z.lb, { fs: 12, c: c, a: "middle", w: 700 });
    });
    g += T(left, y1 + 40, "← 靠近指板（朦胧、泛音多）", { fs: 11.5, c: C.dim });
    g += T(right, y1 + 40, "靠近琴码（明亮、阻力大）→", { fs: 11.5, c: C.dim, a: "end" });
    // ② 弓段
    const y2 = 210, bh = 26;
    g += rr(left, y2, total, bh, 5, "rgba(255,255,255,.05)", "#4b4266", 1);
    (p.bow || []).forEach((b, i) => {
      const x1 = left + total * b.a, x2 = left + total * b.b;
      const c = [C.gold, C.gold2, C.neon, C.pink, C.violet2][i % 5];
      g += rr(x1, y2 + 2, x2 - x1 - 2, bh - 4, 4, c + "26", c, 1);
      g += T((x1 + x2) / 2, y2 + bh / 2 + 4, b.lb, { fs: 11, c: c, a: "middle", w: 700 });
    });
    g += T(left, y2 - 12, "弓根 Frog", { fs: 11.5, c: C.gold, w: 700 });
    g += T(right, y2 - 12, "弓尖 Tip", { fs: 11.5, c: C.violet2, w: 700, a: "end" });
    g += T(left, y2 + bh + 20, "下弓 ↓", { fs: 11, c: C.dim });
    g += T(right, y2 + bh + 20, "↑ 上弓", { fs: 11, c: C.dim, a: "end" });
    // ③ 三变量
    const y3 = 288;
    [["弓速", "快=明亮外放 / 慢=内敛"], ["弓压", "大=厚实 / 小=轻盈"], ["接触点", "靠码=亮 / 靠指板=暗"]]
      .forEach((t, i) => {
        const x = left + i * (total / 3);
        g += rr(x, y3, total / 3 - 12, 52, 10, "rgba(255,255,255,.04)", "#2c2650", 1);
        g += T(x + 12, y3 + 22, t[0], { fs: 13, c: C.gold2, w: 700 });
        g += T(x + 12, y3 + 40, t[1], { fs: 11, c: C.dim });
      });
    let y = y3 + 72;
    const note = p.note || "发音 = 速度 × 压力 × 接触点。三者必须互相补偿：接触点越靠琴码，速度要越快、压力要越小。";
    const ls = wrapTo(note, W - 120, 12.5);
    ls.forEach((l, k) => g += T(left, y + k * 18, l, { fs: 12.5, c: C.cream }));
    return svg(y + ls.length * 18 + 20, g);
  }

  /* ==========================================================
     7. pipes — 竖管乐器的管身与指孔立面图（箫 / 笛）
     p:{title,sub,cap,holes:[{n,lb,st:'o'|'x'|'h',note}],bottom}
     st: o=开 x=闭 h=半开
     ========================================================== */
  function rPipes(p) {
    let g = head(p.title, p.sub);
    const x = 250, top = 82, bot = 300;
    const holes = p.holes || [];
    const step = (bot - top) / Math.max(holes.length + 1, 1);
    // 管身
    g += rr(x - 20, top, 40, bot - top, 14, "rgba(243,234,214,.06)", "#4b4266", 1.4);
    g += `<ellipse cx="${x}" cy="${top}" rx="20" ry="7" fill="rgba(224,169,109,.18)" stroke="${C.gold}" stroke-width="1.4"/>`;
    g += T(x, top - 12, "吹口（边棱发声）", { fs: 11.5, c: C.gold2, a: "middle", w: 700 });
    let maxLabel = 0;
    holes.forEach((h, i) => {
      const y = top + step * (i + 1);
      const open = h.st !== "x";
      const c = h.st === "x" ? C.bad : h.st === "h" ? C.pink : C.good;
      g += circ(x, y, 9, open ? c + "33" : "rgba(255,93,108,.30)", c, 1.6);
      if (h.st === "h") g += `<circle cx="${x}" cy="${y}" r="9" fill="url(#none)" />`;
      g += T(x - 22, y + 4, h.n, { fs: 12.5, c: C.gold2, a: "end", w: 700 });
      const lbLines = wrapTo(h.lb || "", 150, 11.5);
      lbLines.forEach((l, k) => g += T(x + 24, y - 2 + k * 15, l, { fs: 11.5, c: C.cream }));
      maxLabel += lbLines.length * 15;
    });
    g += T(x, bot + 24, p.bottom || "", { fs: 11.5, c: C.dim, a: "middle" });
    const y = Math.max(bot + 44, top + step * (holes.length + 1) + 10, 300);
    return svg(y, g);
  }

  /* ==========================================================
     8. shengpipes — 笙斗上的笙管排布（俯视，传统十七管）
     p:{title,sub,cap,rows:[[{n,lb,c}]],center,note}
     ========================================================== */
  function rSheng(p) {
    let g = head(p.title, p.sub);
    const cx = 300, cy = 210, R = 120;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${R + 14}" ry="${(R + 14) * 0.82}"
      fill="rgba(224,169,109,.08)" stroke="#4b4266" stroke-width="1.4"/>`;
    const groups = p.groups || [];
    const stepA = Math.PI * 2 / Math.max(groups.reduce((s, x) => s + x.items.length, 0), 1);
    let idx = 0, total = groups.reduce((s, x) => s + x.items.length, 0);
    groups.forEach(gp => {
      gp.items.forEach(it => {
        const a = -Math.PI / 2 + idx * stepA;
        const r = R * (gp.r || 1);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.82;
        const c = it.c === "gold" ? C.gold : it.c === "neon" ? C.neon : it.c === "pink" ? C.pink : C.violet2;
        g += circ(x, y, 13, c + "33", c, 1.3);
        g += T(x, y + 4, it.n, { fs: 10.5, c: c, a: "middle", w: 700 });
        idx++;
      });
    });
    g += T(cx, cy + 4, p.center || "笙斗", { fs: 13, c: C.gold2, a: "middle", w: 700 });
    const bx = 540;
    g += rr(bx, 92, 190, 220, 12, "rgba(255,255,255,.04)", "#2c2650", 1);
    g += T(bx + 14, 114, "读图要点", { fs: 12.5, c: C.gold2, w: 700 });
    (p.notes || []).slice(0, 8).forEach((t, i) => {
      const ls = wrapTo(t, 164, 11);
      ls.forEach((l, k) => g += T(bx + 14, 136 + i * 22 + k * 14, l, { fs: 11, c: C.cream }));
    });
    return svg(340, g);
  }

  /* ==========================================================
     9. fretboard — 吉他指板 / 弦乐指板定位图
     p:{title,sub,cap,root,marks:[{s,f,lb,col}],frets,strings:[{n}]}
     s=弦号(0=最低), f=品位
     ========================================================== */
  function rFretPos(p) {
    let g = head(p.title, p.sub);
    const left = 84, top = 88, right = W - 56;
    const frets = p.frets || 12;
    const strings = p.strings || [{ n: "E" }, { n: "A" }, { n: "D" }, { n: "G" }, { n: "B" }, { n: "e" }];
    const rowH = 34, h = strings.length * rowH;
    const bw = right - left;
    // 品位线
    for (let f = 0; f <= frets; f++) {
      const x = left + bw * f / frets;
      g += line(x, top, x, top + h, f === 0 ? C.gold2 : "#3a3358", f === 0 ? 3 : 1);
      if (f > 0) g += T(x, top - 10, f, { fs: 10, c: C.dim, a: "middle" });
    }
    // 弦
    strings.forEach((s, i) => {
      const y = top + rowH * i + rowH / 2;
      g += line(left, y, right, y, "#4b4266", 1.2 + i * 0.15);
      g += T(left - 30, y + 4, s.n, { fs: 12, c: C.gold2, a: "end", w: 700 });
    });
    // 标记点
    (p.marks || []).forEach(m => {
      const x = left + bw * (m.f + 0.5) / frets;
      const y = top + rowH * (m.s) + rowH / 2;
      const c = m.col === "gold" ? C.gold : m.col === "neon" ? C.neon : m.col === "pink" ? C.pink : C.violet2;
      g += circ(x, y, 11, c + "33", c, 1.4);
      g += T(x, y + 4, m.lb, { fs: 10.5, c: c, a: "middle", w: 700 });
    });
    let ytop = top + h + 40;
    if (p.note) {
      const ls = wrapTo(p.note, W - 120, 12.5);
      ls.forEach((l, k) => g += T(left, top + h + 26 + k * 18, l, { fs: 12.5, c: C.cream }));
      ytop = top + h + 26 + ls.length * 18 + 16;
    }
    return svg(ytop, g);
  }

  /* ==========================================================
     10. spec — 乐器参数信息卡（音域/记谱/家族/声部 一屏看完）
     p:{title,cap,rows:[[k,v]]}
     ========================================================== */
  function rSpec(p) {
    let g = head(p.title, p.sub);
    const rows = p.rows || [];
    const left = 44, right = W - 44, w = right - left;
    rows.forEach((r, i) => {
      const y = 78 + i * 40;
      g += rr(left, y, w, 34, 8, i % 2 ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.06)", "#2c2650", 0.8);
      g += T(left + 14, y + 22, r[0], { fs: 12.5, c: C.gold2, w: 700 });
      g += T(left + 132, y + 22, r[1], { fs: 12.5, c: C.cream });
    });
    return svg(78 + rows.length * 40 + 16, g);
  }

  Object.assign(M.R, {
    range: rRange, mallet: rMallet, grip: rGrip, handpan: rHandpan,
    harp: rHarp, bowzone: rBowzone, pipes: rPipes, sheng: rSheng,
    fretpos: rFretPos, spec: rSpec
  });
})();
