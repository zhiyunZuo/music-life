/* ============================================================
   TODAY'S QUEST · 问卷驱动的每日训练清单
   流程：先问「练什么乐器 / 想学什么 / 什么水平 / 有多少时间」
        再据此生成当天可执行的清单
   ============================================================ */
(function () {
  const ML = window.ML;
  const $ = id => document.getElementById(id);
  function todayStr() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  /* ---------------- 问卷选项 ---------------- */
  const INSTRUMENTS = [
    { id: "piano", em: "🎹", nm: "钢琴 / 键盘", d: "古典、流行、即兴伴奏都算" },
    { id: "guitar", em: "🎸", nm: "吉他 / 尤克里里", d: "弹唱、指弹、即兴" },
    { id: "violin", em: "🎻", nm: "弦乐（小/中/大提琴）", d: "音准、运弓、揉弦" },
    { id: "folk", em: "🎋", nm: "笙 / 箫 / 竹笛", d: "气息、指法、民族调式" },
    { id: "voice", em: "🎤", nm: "声乐 / 唱歌", d: "呼吸、音准、咬字" },
    { id: "daw", em: "💻", nm: "电脑音乐 / DAW", d: "Logic / Cubase / Ableton 等" },
    { id: "none", em: "🎧", nm: "暂时不练乐器", d: "只想看懂、听懂、分析" }
  ];

  const GOALS = [
    { id: "harmony", em: "🎼", nm: "听懂和看懂和声", d: "功能和声、和弦连接、副属与借用和弦", nodes: ["h-triad", "h-dom7", "h-conn", "h-secdom", "h-borrow"] },
    { id: "accomp", em: "🎹", nm: "能伴奏 / 弹唱", d: "伴奏织体、跟着歌手、临时应变", nodes: ["p-acc", "ac-detect", "ac-follow", "ac-emerg"] },
    { id: "improv", em: "🌀", nm: "会即兴", d: "限制即兴、动机发展、跟着和声走", nodes: ["im-limit", "im-motif", "im-harm", "im-mel"] },
    { id: "compose", em: "✍️", nm: "写自己的曲子", d: "动机、发展与变奏、曲式结构", nodes: ["co-motif", "co-dev", "co-form"] },
    { id: "arrange", em: "🎧", nm: "会编曲", d: "旋律骨架、Groove、织体层次", nodes: ["ar-mel", "ar-groove", "ar-texture"] },
    { id: "daw", em: "💻", nm: "做出能发出去的成品", d: "工程搭建、MIDI 编辑、混音导出", nodes: ["dw-setup", "dw-edit", "dw-mix", "dw-master"] },
    { id: "mix", em: "🎚", nm: "混音 / 母带", d: "平衡声像、EQ 与压缩、响度宽度", nodes: ["mx-balance", "mx-fx", "ms-loud"] },
    { id: "ear", em: "👂", nm: "练出一副好耳朵", d: "音程、和弦色彩、调式、功能听辨", nodes: ["ear-int", "ear-chord", "ear-mode", "ear-prog"] },
    { id: "orch", em: "🎻", nm: "配器与乐队写作", d: "弦乐木管铜管写法、能量曲线", nodes: ["or-string", "or-wood", "or-brass", "or-energy"] },
    { id: "analysis", em: "📖", nm: "会分析一首作品", d: "拆解真实曲目、和声与曲式", nodes: ["an-deconstruct", "an-harm", "an-form"] },
    { id: "jazz", em: "🎷", nm: "爵士语言", d: "Blues、II-V-I、爵士即兴", nodes: ["jz-blues", "jz-iivi", "jz-impro"] },
    { id: "pop", em: "🎤", nm: "流行音乐制作", d: "流行进行、流行音色与制作习惯", nodes: ["pp-prog", "pp-prod"] },
    { id: "film", em: "🎬", nm: "影视配乐", d: "情绪 Cue、主题动机", nodes: ["fm-cue", "fm-leit"] },
    { id: "game", em: "🎮", nm: "游戏音乐", d: "自适应音乐、无缝 Loop", nodes: ["gm-loop", "gm-adapt"] },
    { id: "sound", em: "🎛", nm: "音色与声音设计", d: "合成基础、空间与混响", nodes: ["sd-synth", "sd-space"] },
    { id: "classical", em: "🎼", nm: "古典音乐脉络", d: "巴洛克到印象主义", nodes: ["cl-baroque", "cl-classic", "cl-rom"] },
    { id: "folk", em: "🎋", nm: "中国传统音乐", d: "五声调式、民族调式", nodes: ["fk-pent", "fk-mode"] },
    { id: "style", em: "🎭", nm: "风格研究与融合", d: "抓风格特征、做风格混血", nodes: ["st-lab", "st-fuse"] },
    { id: "expr", em: "🎨", nm: "把情绪弹出来", d: "情绪到参数、速度力度与触键", nodes: ["ex-param", "ex-lab"] }
  ];

  const LEVELS = [
    { id: "zero", nm: "零基础", d: "几乎没碰过，刚开始" },
    { id: "basic", nm: "入门", d: "会一点点，能弹/唱简单的" },
    { id: "mid", nm: "进阶", d: "能完整弹下一首，有基本功" },
    { id: "adv", nm: "高级", d: "能独立完成较完整的作品" }
  ];

  const TIMES = [
    { v: 15, nm: "15 分钟", d: "碎片时间，保持手感" },
    { v: 30, nm: "30 分钟", d: "标准的一练" },
    { v: 45, nm: "45 分钟", d: "能拆两块内容" },
    { v: 60, nm: "1 小时", d: "技术 + 曲目 + 听力" },
    { v: 120, nm: "2 小时以上", d: "完整的一次深度练习" }
  ];

  /* 节点中文名（用于生成具体任务标题） */
  const NODE_NAME = {
    "h-triad": "三和弦", "h-dom7": "属七和弦", "h-conn": "和弦连接", "h-secdom": "副属和弦", "h-borrow": "借用和弦",
    "h-cad": "终止式", "h-rhythm": "和声节奏", "h-extend": "延伸和弦", "h-modal": "调式爵士和声", "h-modern": "现代电影和声",
    "h-subst": "替代和弦", "h-personal": "个人和声语言", "h-majmin": "大/小三和弦",
    "p-acc": "伴奏型", "p-sight": "视奏", "p-pop": "流行钢琴", "p-impro": "钢琴即兴伴奏",
    "im-limit": "限制条件即兴", "im-motif": "动机即兴", "im-harm": "和声即兴", "im-mel": "旋律即兴",
    "ac-detect": "听调性与和声", "ac-follow": "跟随歌手", "ac-emerg": "突发情况处理",
    "co-motif": "动机与乐句", "co-dev": "发展与变奏", "co-form": "曲式与结构",
    "ar-mel": "旋律与和声骨架", "ar-groove": "节奏 Groove", "ar-texture": "织体与配器决策",
    "dw-setup": "工程与 MIDI", "dw-edit": "编辑量化力度", "dw-mix": "混音基础", "dw-master": "母带与导出",
    "mx-balance": "平衡与声像", "mx-fx": "EQ 与压缩", "ms-loud": "响度与宽度",
    "ear-int": "音程听辨", "ear-chord": "和弦色彩听辨", "ear-mode": "调式判断", "ear-prog": "和弦连接听辨",
    "or-string": "弦乐写法", "or-wood": "木管写法", "or-brass": "铜管写法", "or-energy": "能量曲线",
    "an-deconstruct": "作品拆解", "an-harm": "和声分析", "an-form": "曲式分析",
    "jz-blues": "Blues", "jz-iivi": "II-V-I", "jz-impro": "爵士即兴",
    "pp-prog": "流行进行", "pp-prod": "流行制作",
    "fm-cue": "情绪 Cue", "fm-leit": "主题动机",
    "gm-loop": "无缝 Loop", "gm-adapt": "自适应音乐",
    "sd-synth": "合成基础", "sd-space": "空间与混响",
    "cl-baroque": "巴洛克", "cl-classic": "古典主义", "cl-rom": "浪漫主义",
    "fk-pent": "五声调式", "fk-mode": "民族调式",
    "st-lab": "风格实验室", "st-fuse": "风格融合",
    "ex-param": "情绪→参数", "ex-lab": "表达实验室",
    "gt-chord": "和弦与扫弦", "gt-impro": "吉他即兴",
    "vl-bow": "运弓与揉弦"
  };
  const nodeName = id => NODE_NAME[id] || id;

  /* 每种乐器的热身任务 */
  const WARMUP = {
    piano: [
      { em: "🪑", t: "慢速音阶（钢琴）", d: "一个调的大调音阶，节拍器 60，分手各两遍，重点听每个音是否均匀", to: { lesson: "p-sight" } },
      { em: "🎹", t: "五指位置慢练", d: "C-G-D-A-E 五个调的五指位置，每个位置来回两次，手腕放松", to: { lesson: "p-sight" } },
      { em: "🔺", t: "和弦转位连接", d: "C-E-G 三个音弹出六种排列，手指不需要离开琴键", to: { lesson: "h-triad" } }
    ],
    guitar: [
      { em: "🎸", t: "和弦转换慢练", d: "选两个常用和弦来回切，每切换一次停一秒检查有没有闷音", to: { lesson: "gt-chord" } },
      { em: "🥁", t: "右手扫弦稳定", d: "下扫 × 4 拍哑音练习，让右手先固定节奏再出声", to: { lesson: "gt-chord" } },
      { em: "🎯", t: "单音爬格子", d: "1-2-3-4 指法在一条弦上爬上行下行，节拍器 60", to: { lesson: "gt-impro" } }
    ],
    violin: [
      { em: "🎻", t: "空弦长弓", d: "四条弦各拉四个慢弓，听音色是否从头到尾一致", to: { lesson: "vl-bow" } },
      { em: "🎯", t: "一个八度音阶", d: "D 大调一个八度，分弓，注意半音关系的两个手指靠拢", to: { lesson: "vl-bow" } }
    ],
    folk: [
      { em: "💨", t: "长音与气息", d: "一个音吹满 8 拍，尽量让音量平稳不起伏", to: { lesson: "fk-pent" } },
      { em: "🎋", t: "五声音阶走句", d: "do-re-mi-sol-la 上下行，检查每个音是否干净无杂音", to: { lesson: "fk-pent" } }
    ],
    voice: [
      { em: "🌬", t: "呼吸支持", d: "吸气 4 拍、呼气 8 拍，手放在肋骨两侧感受打开", to: { lesson: "ex-param" } },
      { em: "🎤", t: "哼鸣音阶", d: "闭口哼一个五声音阶，让声音落在面罩位置不压喉", to: { lesson: "ear-int" } }
    ],
    daw: [
      { em: "💻", t: "打开工程先听一遍", d: "什么都不改，从开头完整听一遍今天要改的那段", to: { v: "studio" } },
      { em: "🎛", t: "整理轨道", d: "给每条轨道命名、上色，删掉没用的旧轨", to: { v: "studio" } }
    ],
    none: [
      { em: "🎧", t: "完整听一首曲子", d: "不看手机，安静地从头到尾听一遍，之后写下你印象最深的一句", to: { lesson: "an-deconstruct" } },
      { em: "📖", t: "读一小段教材 / 课程", d: "挑一个没学过的节点读进去，遇到听不懂的词先记下来", to: { v: "learn" } }
    ]
  };

  /* 每个目标对应的学习任务模板（按水平给不同的切入方式） */
  const STUDY = {
    harmony: {
      zero: id => ({ em: "🎼", t: "认识 " + nodeName(id), d: "打开这一课，先把「概念」和「图解讲解」看完，不必强求一次记牢" }),
      basic: id => ({ em: "🎼", t: "学 " + nodeName(id), d: "看完讲解后，弹一遍课里的例证音，用耳朵确认自己听到的色彩" }),
      mid: id => ({ em: "🎼", t: "练 " + nodeName(id), d: "在 C 大调上把这一课的和弦连接走一遍，换两个调再来一次" }),
      adv: id => ({ em: "🎼", t: "深挖 " + nodeName(id), d: "挑一首你正在练的曲子，找出里面用到这一课的地方并标出来" })
    }
  };
  const GENERIC_STUDY = {
    zero: id => ({ em: "📘", t: "初识 " + nodeName(id), d: "打开这一课，只看「讲解」和「图解讲解」，先建立画面感" }),
    basic: id => ({ em: "📘", t: "读懂 " + nodeName(id), d: "看完讲解，再听/弹一遍课里的音乐例，把文字和声音对上" }),
    mid: id => ({ em: "📘", t: "练 " + nodeName(id), d: "按课里的「实践」环节真正做一次，做完标记掌握度" }),
    adv: id => ({ em: "📘", t: "用出来：" + nodeName(id), d: "把这一课的方法套到你手上的曲子 / 工程里，做一段可以直接用的东西" })
  };
  function studyItem(goalId, nodeId, level) {
    const g = STUDY[goalId] || GENERIC_STUDY;
    const mk = g[level] || g.basic;
    const o = mk(nodeId);
    o.to = { lesson: nodeId };
    o.act = "learn";
    return o;
  }

  /* 听力任务 */
  const EAR_DRILL = [
    { em: "👂", t: "音程听辨 10 题", d: "先别想理论，只回答「大还是小、几度」，做完再对答案", act: "ear", exp: 20, to: { lesson: "ear-int" } },
    { em: "👂", t: "和弦色彩听辨", d: "大 / 小 / 属七 三类，先唱出来再确认", act: "ear", exp: 25, to: { lesson: "ear-chord" } },
    { em: "👂", t: "调式判断练习", d: "大调 / 自然小调 / 多利亚 / 五声，注意那个「有味道的音」", act: "ear", exp: 25, to: { lesson: "ear-mode" } },
    { em: "👂", t: "和弦连接听辨", d: "听出 I–V–vi–IV 这类走向，先从四和弦循环开始", act: "ear", exp: 30, to: { lesson: "ear-prog" } }
  ];

  /* 产出任务 */
  const OUTPUT = [
    { em: "🎬", t: "录 30 秒并回听", d: "手机录一段今天练的东西，回听时只找一个问题明天改", act: "studio", exp: 40, to: { v: "studio" } },
    { em: "📁", t: "登记一件小作品", d: "把今天做的片段写进作品集，附上「下次要改的一点」", act: "portfolio", exp: 30, to: { v: "portfolio" } },
    { em: "✍️", t: "写 8 小节动机", d: "用今天学到的东西写一个能哼出来的乐句，不长也没关系", act: "compose", exp: 60, to: { v: "learn" } },
    { em: "🔁", t: "同一段做两版", d: "同一素材做「安静版」和「推进版」，对比哪种更适合它", act: "arrange", exp: 50, to: { v: "learn" } }
  ];

  /* ---------------- 生成算法 ---------------- */
  function pick(arr, n, seed) {
    const a = arr.slice(), out = [];
    let s = seed;
    while (out.length < n && a.length) {
      s = (s * 1103515245 + 12345) % 2147483648;
      out.push(a.splice(s % a.length, 1)[0]);
    }
    return out;
  }
  function hashDate() {
    const d = new Date();
    return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  }
  /* 种子随「日期 + 你的选择」变化：同一天同样的选择得到同一份清单，
     换一次偏好（或第二天）就会换一批具体的练习。 */
  function planSeed(plan) {
    const key = [plan.instruments || [], plan.goals || [], plan.level, plan.minutes].join("|");
    let h = hashDate();
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 2147483647;
    return (h % 100000) + 7;
  }

  function buildPlan(plan) {
    const seed = planSeed(plan);
    const instr = (plan.instruments || []).filter(i => INSTRUMENTS.some(x => x.id === i));
    const goals = (plan.goals || []).filter(g => GOALS.some(x => x.id === g));
    const lv = plan.level || "basic";
    const min = plan.minutes || 30;
    const items = [];
    const usedNode = {};                       // 同一个节点一天里只出现一次
    const mark = it => { if (it && it.to && it.to.lesson) usedNode[it.to.lesson] = 1; };

    // ① 热身：按选中乐器轮换（多个乐器就轮换着给）
    const instrPool = instr.length ? instr : ["none"];
    instrPool.forEach((ins, k) => {
      if (k > 1) return;                       // 最多两个乐器的热身
      const pool = WARMUP[ins] || WARMUP.none;
      let candidates = pool.filter(p => !usedNode[p.to && p.to.lesson]);
      if (!candidates.length) candidates = pool;
      const it = Object.assign({}, candidates[(seed + k) % candidates.length]);
      it.exp = 25; it.act = ins;
      items.push(it); mark(it);
    });

    // ② 主学习：来自用户选的目标，按日期轮换到不同的节点
    const gp = goals.length ? goals : ["analysis"];
    const order = [];
    for (let i = 0; i < 4; i++) gp.forEach(g => order.push(g));   // 轮流取，避免总学同一个目标
    let gi = 0;
    order.forEach(g => {
      if (items.length >= 1 + studyCount(min)) return;
      const def = GOALS.find(x => x.id === g); if (!def) return;
      const nodes = def.nodes.filter(n => !usedNode[n]);
      if (!nodes.length) return;
      const nodeId = nodes[(seed + gi) % nodes.length];
      const it = studyItem(g, nodeId, lv);
      it.exp = 40; it.act = "learn"; it.goal = g;
      items.push(it); mark(it);
      gi++;
    });

    // ③ 听力：每天都有一条，且避开今天已经排进去的节点
    let drills = EAR_DRILL.filter(e => e.to && !usedNode[e.to.lesson]);
    if (!drills.length) drills = EAR_DRILL;
    const drill = Object.assign({}, drills[(seed + 1) % drills.length]);
    items.push(drill); mark(drill);

    // ④ 产出：时间够才有
    if (min >= 45) {
      const out = Object.assign({}, OUTPUT[(seed + 2) % OUTPUT.length]);
      items.push(out);
    }

    return items.slice(0, questCount(min)).map((q, i) => ({
      id: (plan.date || "") + "|" + i + "|" + q.t,
      em: q.em, t: q.t, d: q.d, exp: q.exp || 30,
      act: q.act || "learn", to: q.to || null,
      done: false, idx: i
    }));
  }
  function questCount(min) { return min <= 15 ? 3 : min <= 30 ? 4 : min <= 60 ? 5 : 6; }
  function studyCount(min) { return min <= 15 ? 1 : min <= 30 ? 2 : min <= 60 ? 3 : 4; }

  /* ---------------- 生成当天清单并写入存档 ---------------- */
  function generateToday() {
    const S = ML.getState();
    if (!S.plan) return;
    S.plan.date = todayStr();
    S.quests = buildPlan(S.plan);
    S.questDate = todayStr();
    ML.save();
  }

  /* ---------------- 问卷弹窗 ---------------- */
  let draft = null;
  function ensureDraft() {
    const S = ML.getState();
    if (S.plan) draft = JSON.parse(JSON.stringify(S.plan));
    else draft = { instruments: [], goals: [], level: "basic", minutes: 30, date: "" };
    return draft;
  }

  function chips(list, sel, key, multi, limit) {
    return list.map(o => {
      const on = sel.includes(o.id);
      return `<button class="qz-chip ${on ? "on" : ""}" data-k="${key}" data-v="${o.id}">
        <span class="qz-em">${o.em || ""}</span>
        <span class="qz-nm">${o.nm}</span>
        <span class="qz-d">${o.d}</span>
      </button>`;
    }).join("");
  }

  function wizardBody(step) {
    const total = 3;
    const dots = [1, 2, 3].map(i => `<i class="${i === step ? "on" : (i < step ? "ok" : "")}"></i>`).join("");
    let body = "";
    if (step === 1) {
      body = `
        <div class="qz-sect">
          <div class="qz-lb">今天会摸到哪件乐器？<span class="qz-hint">可以多选，最多 2 件会进清单</span></div>
          <div class="qz-chips" id="qz-inst">${chips(INSTRUMENTS, draft.instruments, "instruments", true)}</div>
        </div>`;
    } else if (step === 2) {
      body = `
        <div class="qz-sect">
          <div class="qz-lb">现在最想攻哪一块？<span class="qz-hint">建议 1–2 个，贪多选不完</span></div>
          <div class="qz-chips" id="qz-goal">${chips(GOALS, draft.goals, "goals", true)}</div>
        </div>`;
    } else {
      body = `
        <div class="qz-sect">
          <div class="qz-lb">你觉得自己现在在哪个阶段？</div>
          <div class="qz-chips" id="qz-lv">${chips(LEVELS, [draft.level], "level", false)}</div>
        </div>
        <div class="qz-sect">
          <div class="qz-lb">今天能拿出多少时间？</div>
          <div class="qz-chips" id="qz-time">${chips(
            TIMES.map(t => ({ id: String(t.v), nm: t.nm, d: t.d, em: "" })),
            [String(draft.minutes)], "minutes", false)}</div>
        </div>
        <div class="qz-preview">会生成 ${questCount(draft.minutes)} 条：热身 + 主学习 + 听力${draft.minutes >= 45 ? " + 产出" : ""}。每天零点自动重排。</div>`;
    }
    return `
      <h3>🎯 今天的练习怎么排？</h3>
      <div class="msub">回答 ${total} 个小问题，我按你的乐器、目标和时间排出今天的清单。</div>
      <div class="qz-dots">${dots}</div>
      ${body}
      <div class="mrow" style="justify-content:space-between;margin-top:14px">
        <div>${step > 1 ? `<button class="btn ghost sm" id="qz-back">← 上一步</button>` : `<button class="btn ghost sm" id="qz-close">取消</button>`}</div>
        <div>${step < total
          ? `<button class="btn gold" id="qz-next">下一步 →</button>`
          : `<button class="btn gold" id="qz-do">生成今日清单 ✨</button>`}</div>
      </div>`;
  }

  function bindWizard(step) {
    const L = $("modal-layer");
    L.querySelectorAll(".qz-chip").forEach(b => {
      b.onclick = () => {
        const k = b.dataset.k, v = b.dataset.v;
        if (k === "level") draft.level = v;
        else if (k === "minutes") draft.minutes = +v;
        else {
          const arr = draft[k];
          const i = arr.indexOf(v);
          if (i >= 0) arr.splice(i, 1); else arr.push(v);
        }
        ML.modal(wizardBody(step));
        bindWizard(step);
      };
    });
    const back = $("qz-back"); if (back) back.onclick = () => { ML.modal(wizardBody(step - 1)); bindWizard(step - 1); };
    const close = $("qz-close"); if (close) close.onclick = () => ML.closeM();
    const next = $("qz-next");
    if (next) next.onclick = () => {
      if (step === 1 && draft.instruments.length === 0) { ML.toast("至少选一件，或选「暂时不练乐器」", "🎯"); return; }
      if (step === 2 && draft.goals.length === 0) { ML.toast("至少挑一个想学的方向", "📘"); return; }
      ML.modal(wizardBody(step + 1)); bindWizard(step + 1);
    };
    const go = $("qz-do");
    if (go) go.onclick = () => {
      const S = ML.getState();
      draft.date = todayStr();
      S.plan = JSON.parse(JSON.stringify(draft));
      if (S.plan.goals.length > 3) S.plan.goals = S.plan.goals.slice(0, 3);
      generateToday();
      ML.closeM();
      ML.renderShell();
      ML.showView("home");
      ML.toast("今日清单已生成 · " + S.quests.length + " 条", "🎯", "xp");
    };
  }

  function openPlanWizard() {
    ensureDraft();
    ML.modal(wizardBody(1));
    bindWizard(1);
  }

  /* ---------------- 首页区块：没计划就先问，有计划才列清单 ---------------- */
  function questSectionHTML() {
    const S = ML.getState();
    const plannedToday = S.plan && S.plan.date === todayStr() && S.quests && S.quests.length;
    if (!plannedToday) {
      const hasProfile = !!(S.plan && S.plan.instruments && S.plan.instruments.length);
      return `
        <div class="qz-empty">
          <div class="qz-empty-em">${hasProfile ? "🌅" : "🎯"}</div>
          <div class="qz-empty-t">${hasProfile ? "今天是新的一天，重新排一份清单" : "今天的清单还没排"}</div>
          <div class="qz-empty-d">${hasProfile
            ? "沿用你上次的乐器与偏好，按今天的情况再生成一次。"
            : "先告诉我你练什么乐器、想学什么，我再给你排今日任务——不会凭空塞几个通用任务给你。"}</div>
          <button class="btn gold" id="btn-quest-plan">${hasProfile ? "✨ 一键生成今日清单" : "📝 花 20 秒回答，生成今日清单"}</button>
        </div>`;
    }
    const instrNM = S.plan.instruments.map(i => (INSTRUMENTS.find(x => x.id === i) || {}).nm).filter(Boolean).join("、") || "暂不练乐器";
    const goalNM = S.plan.goals.map(g => (GOALS.find(x => x.id === g) || {}).nm).filter(Boolean).join("、") || "综合";
    const lvNM = (LEVELS.find(x => x.id === S.plan.level) || {}).nm || "入门";
    const done = S.quests.filter(q => q.done).length;
    const pct = Math.round(done / S.quests.length * 100);

    const list = S.quests.map(q => `
      <div class="quest-item ${q.done ? "quest-done" : ""}">
        <button class="qtick ${q.done ? "on" : ""}" data-tick="${q.idx}" title="标记完成">${q.done ? "✓" : ""}</button>
        <div class="qem">${q.em}</div>
        <div class="qbody" data-go="${q.idx}">
          <div class="qt">${q.t}</div>
          <div class="qd">${q.d}</div>
          ${q.to ? `<div class="qgo">${goLabel(q.to)} →</div>` : ""}
        </div>
        <div class="qexp">+${q.exp}</div>
      </div>`).join("");

    return `
      <div class="qz-head">
        <span class="qz-tag">🎹 ${instrNM}</span>
        <span class="qz-tag">📘 ${goalNM}</span>
        <span class="qz-tag">⏱ ${S.plan.minutes} 分钟 · ${lvNM}</span>
      </div>
      <div class="qz-bar"><i style="width:${pct}%"></i></div>
      <div class="sub" style="margin:6px 0 10px">今日进度 ${done} / ${S.quests.length} · 点正文去做，做完点左边的圈打勾。</div>
      ${list}
      <div class="mrow" style="margin-top:10px">
        <button class="btn ghost sm" id="btn-replan">🔁 重新规划</button>
        <button class="btn ghost sm" id="btn-plan">⏱ 按时间微调</button>
      </div>`;
  }
  function goLabel(to) {
    if (to.lesson) return "📘 打开课程";
    if (to.v === "studio") return "💻 去工作室";
    if (to.v === "ear") return "👂 去练耳";
    if (to.v === "portfolio") return "📁 去作品集";
    if (to.v === "learn") return "📚 去学习中心";
    return "🚀 去练习";
  }

  function bindQuestSection() {
    const S = ML.getState();
    const start = $("btn-quest-plan");
    if (start) start.onclick = () => openPlanWizard();
    const re = $("btn-replan");
    if (re) re.onclick = () => openPlanWizard();
    const plan = $("btn-plan");
    if (plan) plan.onclick = ML.openPlanMaker || (() => openPlanWizard());

    const view = $("view");
    view.querySelectorAll(".qtick[data-tick]").forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const idx = +b.dataset.tick, q = S.quests[idx];
        if (!q) return;
        if (q.done) { q.done = false; ML.save(); ML.showView("home"); return; }
        q.done = true;
        ML.addExp(q.exp);
        if (q.act === "compose" || q.act === "portfolio") S.works++;
        ML.save();
        const allDone = S.quests.every(x => x.done);
        ML.toast(allDone ? "今日清单全部完成！漂亮 +" + q.exp + " EXP" : "完成 +" + q.exp + " EXP", q.em, "xp");
        ML.renderShell(); ML.showView("home");
      };
    });
    view.querySelectorAll(".qbody[data-go]").forEach(el => {
      el.onclick = () => goto(S.quests[+el.dataset.go]);
    });
  }

  function goto(q) {
    const to = q.to;
    if (to && to.lesson && ML.openLesson) { ML.openLesson(to.lesson); return; }
    const v = to && to.v;
    if (v === "studio" || v === "ear" || v === "portfolio") { ML.showView(v); return; }
    if (v === "learn") { ML.showView("learn"); return; }
    // 默认：乐器类去练习页
    ML.showView(q.act && ML.VIEWS && ML.VIEWS[q.act] ? q.act : "practice");
  }

  /* 完成某条任务：由 home 的「完成」按钮调用 */
  function completeQuest(idx) {
    const S = ML.getState();
    const q = S.quests[idx];
    if (!q || q.done) return false;
    q.done = true;
    ML.addExp(q.exp);
    if (q.act === "compose" || q.act === "portfolio") S.works++;
    ML.save();
    return true;
  }

  window.MLQUEST = {
    INSTRUMENTS, GOALS, LEVELS, TIMES,
    openPlanWizard, generateToday, buildPlan,
    questSectionHTML, bindQuestSection, goto, todayStr
  };

  /* app.js 在 quest.js 之前加载：老用户直接进主界面时首页已渲染过一次，
     那时 MLQUEST 还不存在，这里补一次刷新。 */
  if (window.__mlEntered) {
    try { ML.renderShell(); ML.showView("home"); } catch (e) { console.warn("quest post-load refresh:", e); }
  }
})();
