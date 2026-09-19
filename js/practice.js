/* ============================================================
   MUSIC LIFE · 音乐实践中心
   —— 8 个实践模块，每项都有「怎么做 / 自检标准 / 建议时长」
   —— 练完记一次：次数、正确数、用时、薄弱点
   —— 不再有「点亮」：进度用真实记录说话
   注意：正文强调一律用中文引号，不得出现 ASCII 双引号做强调。
   ============================================================ */
window.MLPRACTICE = (function () {
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function todayStr() { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function ST() { return (window.ML && window.ML.getState) ? window.ML.getState() : null; }

  /* ---------------- 八个实践模块 ---------------- */
  const MODULES = [
    { id:"today", em:"☀️", nm:"今日练习", ds:"每天先做的三件事：热身、基本功、慢速曲目。不追新，先把身体和耳朵打开。",
      items:[
        { id:"warm", t:"热身：长音与呼吸", min:5,
          how:"① 用你最舒服的音区发一个长音（声乐用「啊」，乐器用最容易响的那个音），保持 8 拍；② 做三次，每次检查起音是否干净、尾音是否稳定；③ 再做三次渐强渐弱（弱—强—弱），要求全程音准不漂。",
          check:"录下来回听：三次长音的音量与音色是否一致，渐强的峰值有没有破音或挤。" },
        { id:"scale", t:"基本功：音阶与琶音", min:10,
          how:"① 选一个调（建议先从 C 大调或 a 小调开始），节拍器 60，一拍一音上下行；② 同调的主三和弦琶音，一拍一音；③ 熟练后把节拍器提到 80、100，但要求每个音都一样清楚。",
          check:"不看指法/键盘能流畅走完；录一遍，检查有没有某一个音总是抢拍或拖拍。" },
        { id:"slow", t:"曲目：慢速完整走一遍", min:15,
          how:"① 把正在练的曲子用原速的一半完整走一遍，允许看谱；② 只挑其中卡住的 2 小节，单拿出来各慢练 5 遍；③ 最后用原速走一遍开头 8 小节。",
          check:"慢速那一遍能不能不断；卡住的两小节在慢练后有没有比第一遍顺。" }
      ] },
    { id:"ear", em:"👂", nm:"练耳", ds:"耳朵是所有技术的验收标准。这里可以直接做题，系统自动判分并记录。",
      items:[
        { id:"iv", t:"音程听辨（在线做题）", min:5,
          how:"点下面的「开始一组」，听两个先后响起的音，判断它们之间是哪个音程。一组 8 题，做完自动记录正确率。",
          check:"正确率低于 70% 时，把错的那一类单独练：先唱出来（用「小星星」「婚礼进行曲」这类熟悉的旋律做锚点），再回到听辨。" },
        { id:"chord", t:"和弦性质听辨", min:8,
          how:"① 让同伴或软件随机弹大三、小三、属七、减三；② 先只判断「明亮还是暗」（大/小），再加一层判断「有没有紧张感」（属七/减三）；③ 每种各听 5 个。",
          check:"能稳定分出大三与小三之后，再练属七；把总答错的那一类写在薄弱点里。" },
        { id:"rhythm", t:"节奏模仿", min:5,
          how:"① 听一小节节奏（拍手或打击乐），立即用手或嘴重复出来；② 从两拍开始，逐步加到四拍；③ 加入切分与附点。",
          check:"重复时重音位置是否和原节奏一致；能不能不看谱就把节奏型说出来。" },
        { id:"melody", t:"旋律听写（短句）", min:10,
          how:"① 听一句 4 小节的简单旋律；② 先只写节奏；③ 再补音高（先确定第一个音与最后一个音）；④ 对照原谱修改。",
          check:"音高错得多是音程问题，节奏错得多是拍感问题——把具体错在哪写在薄弱点里。" }
      ] },
    { id:"instrument", em:"🎹", nm:"乐器练习", ds:"按你现在的主乐器走：音阶、练习曲、曲目三段式。想换乐器，去乐器库挑。",
      items:[
        { id:"tech", t:"技术：音阶 / 琶音 / 把位", min:12,
          how:"① 主乐器的常用调音阶，节拍器 70，连奏与断奏各两遍；② 同调琶音两遍；③ 换把/换位的衔接单独练 5 遍（弦乐、吉他尤要注意）。",
          check:"换把处有没有杂音或断音；连奏的每一音是否等长。" },
        { id:"etude", t:"练习曲：一段针对性短曲", min:12,
          how:"① 挑一首针对当前弱点的练习曲（如手指独立、运弓均匀、气息连贯）；② 分句练：每句 3 遍，再两句连起来；③ 最后整段慢速 1 遍、原速 1 遍。",
          check:"能不能边弹/边吹边听自己，而不是只顾着把音按完。" },
        { id:"rep", t:"曲目：处理而不是弹完", min:20,
          how:"① 把全曲分成 3–4 段，每段定一个表达目标（如「这段要轻」「这段要往前推」）；② 每段按目标单独练；③ 最后连起来，检查段与段之间的呼吸。",
          check:"录音后问自己：听得出哪里是高潮、哪里是收吗？" },
        { id:"tone", t:"音色：同一句换三种声音", min:8,
          how:"① 取一个乐句，分别用「亮 / 暗 / 柔」三种方式演奏（改变触键、接触点、口风或槌头）；② 录三遍；③ 挑最适合这首曲子的一种。",
          check:"三种是不是真的听得出差别；如果听不出，说明变化做得还不够极端。" }
      ] },
    { id:"harmony", em:"🎼", nm:"和声与理论", ds:"把和声从「知道名字」变成「手和耳朵都会」。",
      items:[
        { id:"prog", t:"和弦连接：I–V–vi–IV 与变体", min:10,
          how:"① 在三个调上弹 I–V–vi–IV；② 改成 I–♭VI–♭VII–V（借用和弦），对比色彩；③ 每到一个和弦，唱出它的三音。",
          check:"耳朵能不能听出两种进行的情绪差别；手能不能不看图弹出来。" },
        { id:"four", t:"四部和声：写一个终止式", min:15,
          how:"① 在 C 大调写 I–IV–V–I 的四部和声；② 检查平行五度与平行八度；③ 在键盘上弹出来，逐声部唱一遍。",
          check:"四个声部各自唱起来是否通顺（尤其是内声部）；有没有出现平行五八度。" },
        { id:"bass", t:"低音写作：让进行站得住", min:10,
          how:"① 给一段和弦进行只写低音；② 检查低音与旋律是否形成反向或斜向进行；③ 加上经过音与邻接音。",
          check:"只听低音与旋律两条线，是否仍然成立；低音走得太跳就退回级进，再试一次。" }
      ] },
    { id:"improv", em:"🎷", nm:"即兴", ds:"即兴不是凭空乱弹，是在限制里做选择。每条练习都有限制。",
      items:[
        { id:"target", t:"目标音练习：只落在和弦音上", min:10,
          how:"① 循环 ii–V–I；② 每小节只允许落在当前和弦的三音上（第 1 拍）；③ 其余音用音阶音连接。",
          check:"听录音，第一拍的音是不是每次都「落得稳」。" },
        { id:"limit", t:"限制练习：只用三个音", min:8,
          how:"① 整段即兴只用该和弦的 1、3、5 三个音；② 只靠节奏变化做出 4 个不同的句子；③ 再加一个经过音。",
          check:"三个音能不能说出四种不同的话；如果听起来都一样，是节奏太单一。" },
        { id:"motive", t:"动机发展：一个短句变四句", min:12,
          how:"① 即兴想出一个两小节的动机；② 分别做：重复、移位（上二度）、倒影、扩展（加音）；③ 把它们接成一段八小节。",
          check:"四句是否都能听出是「同一家人」；连接处有没有留呼吸。" },
        { id:"call", t:"对话练习：问与答", min:8,
          how:"① 弹一个「问句」（两小节，停在未解决的和弦音上）；② 弹一个「答句」（两小节，解决到主音）；③ 连续做四组。",
          check:"问句听起来是不是真的「没说完」；答句有没有真的「落地」。" }
      ] },
    { id:"arrange", em:"🎛️", nm:"编曲与配器", ds:"把一段旋律做成可以演出的版本：先决定谁在说话，再决定怎么伴奏。",
      items:[
        { id:"accomp", t:"给旋律配伴奏（三步）", min:20,
          how:"① 先只写低音（每小节 1–2 个音）；② 加中层的和声垫（长音或缓慢节奏型）；③ 最后加节奏层（分解和弦或固定音型）。",
          check:"把旋律单独关掉，伴奏是否仍然成立；旋律加回来后有没有被盖住。" },
        { id:"restyle", t:"同一段旋律换风格", min:20,
          how:"① 取一段 8 小节旋律；② 分别做成三种风格（如抒情 ballad、律动 funk、古典弦乐）；③ 每种只改三件事：速度、节奏型、音色。",
          check:"三种版本是不是真的听得出是不同曲子；如果差别不大，说明改得不够彻底。" },
        { id:"reduce", t:"缩谱训练：把四行压成两行", min:15,
          how:"① 找一段四声部（或钢琴）谱；② 压缩成「旋律 + 低音」两行；③ 再压缩成只写低音与和弦标记。",
          check:"只弹压缩版，是否还能认出原曲；被删掉的音是否真的不重要。" }
      ] },
    { id:"daw", em:"💻", nm:"DAW 与制作", ds:"在软件里完成一首歌的技术部分：对拍、剪、平衡、自动化。",
      items:[
        { id:"grid", t:"对拍与剪辑：先做干净", min:15,
          how:"① 把一段录音对齐网格（或手动修）；② 剪掉气口与噪声；③ 检查每个音符的起音是否切干净。",
          check:"放大波形看：每个击点是否落在拍上；淡入淡出有没有爆音。" },
        { id:"balance", t:"音量平衡：先推子后插件", min:15,
          how:"① 全部推子拉到 -∞；② 按重要性依次推上来：主唱 → 节奏 → 低音 → 垫底 → 装饰；③ 只调音量，不加任何效果。",
          check:"只用推子做出的混音是否已经有层次；如果必须靠插件才听得清，说明平衡没做好。" },
        { id:"eq", t:"EQ 与频段分配", min:12,
          how:"① 给每件乐器找一个「自己的频段」；② 在冲突的频段做互补削减（如给吉他切低频、给贝斯切中频）；③ 对比 A/B。",
          check:"单独听每件乐器是否变薄，合起来是否变清楚。" },
        { id:"auto", t:"自动化：让音乐动起来", min:10,
          how:"① 给主唱或主奏画音量自动化（每句 +1–2dB）；② 给混响发送量画自动化（副歌多一点）；③ 记录整段情绪起伏曲线。",
          check:"关掉所有自动化再听一遍，差异是否明显；如果听不出差别，说明自动化幅度画得太小或画错了对象。" }
      ] },
    { id:"analysis", em:"🔍", nm:"分析与聆听", ds:"听懂别人是怎么做的，是最便宜的进步方式。",
      items:[
        { id:"form", t:"曲式分析：画一张结构图", min:15,
          how:"① 听一首歌，按段落记时间点（前奏/主歌/预副/副歌/间奏）；② 标出每段的乐器数量与力度；③ 看副歌是靠什么变强的。",
          check:"结构图能不能解释「为什么副歌更爽」；如果解释不了，再听一遍找答案。" },
        { id:"harm", t:"和声分析：写出进行", min:15,
          how:"① 听出一段的和弦进行；② 用级数记下来（如 I–V–vi–IV）；③ 标出任何意外的和弦（借用、副属）。",
          check:"意外和弦出现在哪一句，它制造了什么情绪。" },
        { id:"orch", t:"配器分析：谁在说话", min:12,
          how:"① 听一段管弦或乐队音乐，每 4 小节记一次「主角音色是谁」；② 标出音色叠加与撤走的位置；③ 找出全奏前 musicians 是怎么铺垫的。",
          check:"主角切换是否都有理由（旋律进入、情绪转折、段落边界）。" },
        { id:"ref", t:"参考曲对比：找出三个差距", min:10,
          how:"① 选一首专业作品当参考；② 把自己的作品与它 A/B 对比；③ 只写三个具体差距（如「低频不够」「副歌密度不足」「人声太靠后」）。",
          check:"三个差距必须具体到可以明天就改，例如「副歌弦乐密度不够」而不是「整体还不够好」。" }
      ] }
  ];

  /* ---------------- 记录 ---------------- */
  function logRec(m, itemId, total, correct, seconds, weak) {
    const st = ST(); if (!st) return;
    st.practiceLog = st.practiceLog || [];
    st.practiceWeak = st.practiceWeak || {};
    st.practiceLog.push({
      d: todayStr(), m: m, i: itemId,
      n: Math.max(0, +total || 0),
      c: Math.max(0, +correct || 0),
      s: Math.max(0, +seconds || 0),
      w: String(weak || "").trim()
    });
    String(weak || "").split(/[,，、;；\s]+/).filter(Boolean).forEach(w => {
      st.practiceWeak[w] = (st.practiceWeak[w] || 0) + 1;
    });
    if (window.ML) {
      window.ML.save();
      if (window.ML.addExp) window.ML.addExp(8);
      if (window.ML.renderShell) window.ML.renderShell();
    }
  }

  function stats() {
    const st = ST(); if (!st) return null;
    const log = st.practiceLog || [];
    const since = new Date(Date.now() - 6 * 864e5);
    const key = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const cutoff = key(since);
    const week = log.filter(r => r.d >= cutoff);
    const totalN = week.reduce((a, r) => a + (r.n || 0), 0);
    const totalC = week.reduce((a, r) => a + (r.c || 0), 0);
    const totalS = week.reduce((a, r) => a + (r.s || 0), 0);
    const weak = Object.keys(st.practiceWeak || {})
      .sort((a, b) => st.practiceWeak[b] - st.practiceWeak[a]).slice(0, 5);
    const byModule = {};
    week.forEach(r => { byModule[r.m] = (byModule[r.m] || 0) + 1; });
    return {
      sessions: week.length, all: log.length,
      totalN, totalC, totalS,
      acc: totalN ? Math.round(totalC / totalN * 100) : 0,
      weak, byModule
    };
  }

  /* ---------------- 在线练耳题 ---------------- */
  const IVS = [
    { s: 2, nm: "大二度" }, { s: 3, nm: "小三度" }, { s: 4, nm: "大三度" },
    { s: 5, nm: "纯四度" }, { s: 7, nm: "纯五度" }, { s: 9, nm: "大六度" },
    { s: 11, nm: "大七度" }, { s: 12, nm: "纯八度" }
  ];
  let ear = null; // {list, i, ok, start}
  function earStart() {
    const list = [];
    for (let k = 0; k < 8; k++) list.push(IVS[Math.floor(Math.random() * IVS.length)]);
    ear = { list, i: 0, ok: 0, start: Date.now(), answered: false, picked: null };
    earPlay();
    return earHTML();
  }
  function earPlay() {
    const AE = window.AudioEngine || (window.ML && window.ML.AE);
    if (!AE || !ear) return;
    const it = ear.list[ear.i];
    const root = 60 + Math.floor(Math.random() * 5);
    AE.ensure && AE.ensure();
    AE.interval(it.s, root, 0.7, 0);
  }
  function earPick(semi) {
    if (!ear || ear.answered) return;
    const it = ear.list[ear.i];
    ear.answered = true;
    ear.picked = semi;
    if (semi === it.s) ear.ok++;
    return;
  }
  function earNext() {
    if (!ear) return;
    ear.i++; ear.answered = false; ear.picked = null;
    if (ear.i >= ear.list.length) {
      const sec = Math.round((Date.now() - ear.start) / 1000);
      logRec("ear", "iv", ear.list.length, ear.ok, sec, ear.ok < 6 ? "音程听辨" : "");
      const ok = ear.ok; ear = null;
      return { done: true, ok };
    }
    earPlay();
    return { done: false };
  }
  function earHTML() {
    if (!ear) return `<div class="lnote">点「开始一组」听 8 个音程，做完自动记一次。</div>`;
    const it = ear.list[ear.i];
    const opts = IVS.map(v => {
      const cls = ear.answered ? (v.s === it.s ? "correct" : (v.s === ear.picked ? "wrong" : "")) : "";
      return `<button class="opt-btn ${cls}" data-iv="${v.s}">${v.nm}</button>`;
    }).join("");
    const tail = ear.answered
      ? (ear.picked === it.s ? `<div class="lab-note">✓ 正确（${it.nm}）</div>` : `<div class="lab-note">✗ 正确答案是 ${it.nm}</div>`)
      : `<div class="lab-note">第 ${ear.i + 1} / ${ear.list.length} 题</div>`;
    return `<div class="pc-ear">
      <div class="mrow">
        <button class="btn sm gold" id="pc-ear-play">🔊 再听一次</button>
        ${ear.answered ? `<button class="btn sm" id="pc-ear-next">${ear.i + 1 >= ear.list.length ? "完成并记录" : "下一题"}</button>` : ""}
        <span class="lab-note">${ear.ok} / ${ear.i + (ear.answered ? 1 : 0)} 正确</span>
      </div>
      <div class="opt-grid">${opts}</div>
      ${tail}
    </div>`;
  }

  /* ---------------- 渲染 ---------------- */
  let cur = "today";

  function moduleTabs() {
    return MODULES.map(m => `<button class="itab${m.id === cur ? " on" : ""}" data-pm="${m.id}">
      <i>${m.em}</i>${m.nm}</button>`).join("");
  }

  function itemHTML(m, it) {
    const st = ST();
    const done = ((st && st.practiceLog) || []).filter(r => r.m === m.id && r.i === it.id);
    const last = done.length ? done[done.length - 1] : null;
    const lastTxt = last ? `上次：${last.d} · 练 ${last.n} 次 / 对 ${last.c} · ${Math.round(last.s / 60)} 分钟${last.w ? " · 薄弱：" + esc(last.w) : ""}` : "还没有记录";
    return `<div class="pc-item">
      <div class="pc-t">${esc(it.t)}<span class="pc-min">建议 ${it.min} 分钟</span></div>
      <div class="pc-how"><b>怎么做</b><br>${esc(it.how)}</div>
      <div class="pc-check"><b>自检</b><br>${esc(it.check)}</div>
      <div class="pc-last">${esc(lastTxt)}</div>
      <div class="mrow">
        <button class="btn sm gold" data-log="${m.id}|${it.id}">记一次</button>
        <button class="btn sm" data-timer="${m.id}|${it.id}">计时开始</button>
      </div>
      <div class="pc-form" id="pf-${m.id}-${it.id}" style="display:none">
        <div class="pf-row"><label>练了几次</label><input type="number" min="1" value="1" id="n-${m.id}-${it.id}"></div>
        <div class="pf-row"><label>做对几次</label><input type="number" min="0" value="1" id="c-${m.id}-${it.id}"></div>
        <div class="pf-row"><label>用时（分钟）</label><input type="number" min="1" value="${it.min}" id="s-${m.id}-${it.id}"></div>
        <div class="pf-row"><label>薄弱点</label><input type="text" placeholder="例：换把、附点节奏、属七听辨" id="w-${m.id}-${it.id}"></div>
        <button class="btn sm gold" data-save="${m.id}|${it.id}">保存记录</button>
      </div>
    </div>`;
  }

  function statsHTML() {
    const s = stats(); if (!s) return "";
    const mm = Math.round(s.totalS / 60);
    const dist = MODULES.filter(m => s.byModule[m.id])
      .map(m => `${m.em}${m.nm} ${s.byModule[m.id]} 次`).join(" · ");
    return `<div class="pc-stats">
      <div class="pc-s"><span>本周记录</span><b>${s.sessions}</b></div>
      <div class="pc-s"><span>练习次数</span><b>${s.totalN}</b></div>
      <div class="pc-s"><span>正确率</span><b>${s.acc}%</b></div>
      <div class="pc-s"><span>累计时长</span><b>${mm} 分钟</b></div>
    </div>
    ${dist ? `<div class="lnote">本周分布：${esc(dist)}</div>` : ""}
    ${s.weak.length ? `<div class="pc-weak"><b>常出现的薄弱点</b><br>${s.weak.map(w => `<span class="wk-chip">${esc(w)} ×${(ST().practiceWeak || {})[w]}</span>`).join(" ")}</div>` : ""}`;
  }

  function render() {
    const m = MODULES.find(x => x.id === cur) || MODULES[0];
    const items = m.items.map(it => itemHTML(m, it)).join("");
    const earBox = (m.id === "ear") ? `<div class="panel">
      <div class="sec-tag">在线做题</div>
      <div id="pc-ear-box">${earHTML()}</div>
      <div class="mrow"><button class="btn sm" id="pc-ear-start">开始一组（8 题）</button></div>
    </div>` : "";
    return `
    <div class="kicker">PRACTICE CENTER</div>
    <h1 class="section-title"><span class="em">🎵</span>音乐实践中心</h1>
    <p class="lead">不点亮任何东西。练完记一次：练了几次、对了几次、用了多久、哪里最弱。记录会变成下面的统计。</p>
    <div class="panel">${statsHTML()}</div>
    <div class="itabs">${moduleTabs()}</div>
    <div class="panel">
      <div class="sec-tag">${m.em} ${esc(m.nm)}</div>
      <div class="lnote">${esc(m.ds)}</div>
      ${items}
    </div>
    ${earBox}`;
  }

  /* ---------------- 绑定 ---------------- */
  const timers = {};
  function bind() {
    const view = document.getElementById("view");
    if (!view) return;
    view.querySelectorAll(".itab[data-pm]").forEach(b => {
      b.onclick = () => { cur = b.dataset.pm; rerender(); };
    });
    view.querySelectorAll("[data-log]").forEach(b => {
      b.onclick = () => {
        const [m, i] = b.dataset.log.split("|");
        const f = document.getElementById("pf-" + m + "-" + i);
        if (f) f.style.display = f.style.display === "none" ? "" : "none";
      };
    });
    view.querySelectorAll("[data-timer]").forEach(b => {
      b.onclick = () => {
        const key = b.dataset.timer;
        if (timers[key]) {
          clearInterval(timers[key]); timers[key] = null; b.textContent = "计时开始";
        } else {
          const t0 = Date.now();
          b.textContent = "计时中 0:00";
          timers[key] = setInterval(() => {
            const s = Math.round((Date.now() - t0) / 1000);
            b.textContent = "计时中 " + Math.floor(s / 60) + ":" + pad(s % 60);
          }, 1000);
        }
      };
    });
    view.querySelectorAll("[data-save]").forEach(b => {
      b.onclick = () => {
        const [m, i] = b.dataset.save.split("|");
        const n = document.getElementById("n-" + m + "-" + i).value;
        const c = document.getElementById("c-" + m + "-" + i).value;
        const s = document.getElementById("s-" + m + "-" + i).value;
        const w = document.getElementById("w-" + m + "-" + i).value;
        logRec(m, i, n, c, Math.round((+s || 0) * 60), w);
        if (window.ML && window.ML.toast) window.ML.toast("已记录", "✅");
        rerender();
      };
    });
    const bs = document.getElementById("pc-ear-start");
    if (bs) bs.onclick = () => { earStart(); rerender(); };
    const bp = document.getElementById("pc-ear-play");
    if (bp) bp.onclick = () => earPlay();
    view.querySelectorAll("[data-iv]").forEach(b => {
      b.onclick = () => { earPick(+b.dataset.iv); rerender(); };
    });
    const bn = document.getElementById("pc-ear-next");
    if (bn) bn.onclick = () => {
      const r = earNext();
      if (r && r.done) { if (window.ML && window.ML.toast) window.ML.toast("一组完成：" + r.ok + " / 8", "🎧"); }
      rerender();
    };
  }

  function rerender() {
    const view = document.getElementById("view");
    if (!view) return;
    view.innerHTML = render();
    bind();
  }

  return { MODULES, render, bind, rerender, logRec, stats };
})();
