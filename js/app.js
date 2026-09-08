/* ============================================================
   MUSIC LIFE · 音乐人生 RPG  —  Application
   ============================================================ */
(function(){
const D = window.ML_DATA;
const AE = window.AudioEngine;
const $ = id => document.getElementById(id);
const SAVE_KEY = "musiclife_save_v1";

/* ---------------- State ---------------- */
function defaultState(){
  const inst = {};
  D.INSTRUMENTS.forEach(i=> inst[i.id] = {level:0, detected:false});
  return {
    name:"音乐人", avatar:"🎧", talent:"piano",
    level:1, exp:0, expNext:500, sp:3,
    rep:0, income:0, works:0,worldDone:0, performances:0,
    skills:{piano:3, theory:3, ear:3, prod:1, perf:2, compose:2},
    skillNodes:{}, quests:[], questDate:"", portfolio:[],portfolioWorks:[],
    studioStep:0, instruments:inst, mentorLog:[],
    eventsDone:0, lastEvent:"", badges:[]
  };
}
let S = null;

function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{
    const r = localStorage.getItem(SAVE_KEY);
    if(r){
      // 合并到 defaultState()：兼容旧版本存档缺失新字段（mentorLog / skillNodes 等），避免返回用户直接崩溃
      S = Object.assign(defaultState(), JSON.parse(r));
    }
  }catch(e){ S = null; }
  if(!S || !S.name) S = defaultState();
}

/* ---------------- Utils ---------------- */
function toast(msg, em, kind){
  const layer = $("toast-layer");
  const t = document.createElement("div");
  t.className = "toast" + (kind?(" "+kind):"");
  t.innerHTML = (em?`<span class="te">${em}</span>`:"") + `<span>${msg}</span>`;
  layer.appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}
function xpFloat(amount, x, y){
  const f = document.createElement("div");
  f.className = "xp-float";
  f.textContent = "+"+amount+" EXP";
  f.style.left = (x||window.innerWidth/2-30)+"px";
  f.style.top = (y||120)+"px";
  document.body.appendChild(f);
  setTimeout(()=> f.remove(), 1300);
}
function levelUpBanner(lv){
  let b = document.querySelector(".lvlup");
  if(!b){
    b = document.createElement("div"); b.className="lvlup";
    b.innerHTML = `<div class="lu-card"><div class="lu-em">⭐</div>
      <div class="lu-t">LEVEL UP</div><div class="lu-s"></div></div>`;
    document.body.appendChild(b);
  }
  b.querySelector(".lu-s").textContent = "你升到了 LV."+lv+" · 获得 2 技能点";
  b.classList.add("show");
  setTimeout(()=> b.classList.remove("show"), 2200);
}
function addExp(amt, x, y){
  S.exp += amt;
  let up=false;
  while(S.exp >= S.expNext){
    S.exp -= S.expNext; S.level++; S.sp += 2;
    S.expNext = Math.round(500 + (S.level-1)*220); up=true;
  }
  if(up) levelUpBanner(S.level);
  xpFloat(amt, x, y);
  save(); renderShell();
}
function modal(html){
  const L = $("modal-layer");
  L.innerHTML = `<div class="modal">${html}</div>`;
  L.classList.add("show");
  L.onclick = e=>{ if(e.target===L) closeModal(); };
  return L;
}
function closeModal(){ const L=$("modal-layer"); L.classList.remove("show"); L.innerHTML=""; L.onclick=null; }

function stars(v){
  v = Math.max(0, Math.min(10, Math.round(v)));
  let s="";
  for(let i=0;i<10;i++) s += `<span class="${i<v?'on':'off'}">★</span>`;
  return `<span class="stars">${s}</span>`;
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

function derivedSkills(){
  const i = S.instruments;
  return [
    {nm:"钢琴", v:S.skills.piano},
    {nm:"视唱练耳", v:S.skills.ear},
    {nm:"和声", v:S.skills.theory},
    {nm:"即兴", v:clamp(Math.round((S.skills.piano+S.skills.perf)/2),0,10)},
    {nm:"编曲", v:S.skills.prod},
    {nm:"作曲", v:S.skills.compose},
    {nm:"吉他", v:i.guitar?i.guitar.level:0},
    {nm:"小提琴", v:i.violin?i.violin.level:0},
    {nm:"笙箫", v:Math.max(i.sheng?i.sheng.level:0, i.xiao?i.xiao.level:0)},
    {nm:"DAW制作", v:S.skills.prod}
  ];
}
function nodeCat(branchKey){
  return {PIANO:"piano",THEORY:"theory",EAR:"ear",PROD:"prod",PERF:"perf"}[branchKey];
}

/* ---------------- Shell ---------------- */
function renderShell(){
  // top-right: 紧凑 LV / EXP（降低 RPG 胶囊视觉权重）
  // 注意：ML.overall/onwer 由 learn.js 在 app.js 之后挂载，首屏（老用户直接进入主界面）渲染时可能尚未就绪，需做防御
  const dir = (window.ML && typeof window.ML.overall==="function" && D.LESSONS)? ((D.LESSONS.find(l=> window.ML.overall(l.id)<40)||{}).title || "自由探索") : "自由探索";
  $("topright-info").innerHTML = `
    <div class="lv-chip"><span class="lv-l">LV.${S.level}</span><span class="lv-t">${titleForLevel()}</span></div>
    <div class="exp-mini">EXP ${S.exp} / ${S.expNext}</div>`;

  // left column
  const ds = derivedSkills();
  let skillHTML = ds.map(d=>`
    <div class="skill-row">
      <div class="top"><span class="nm">${d.nm}</span><span class="vl">${Math.round(d.v)}/10</span></div>
      ${stars(d.v)}
    </div>`).join("");

  $("col-left").innerHTML = `
    <div class="char-card">
      <div class="avatar-big">${S.avatar}</div>
      <div class="char-name">${S.name}</div>
      <div class="char-lv">LV.${S.level} · ${titleForLevel()}</div>
      <div class="xp-wrap">
        <div class="xp-top"><span>EXP</span><span>${S.exp} / ${S.expNext}</span></div>
        <div class="xp-bar"><div class="xp-fill" style="width:${clamp(S.exp/S.expNext*100,0,100)}%"></div></div>
      </div>
      <div class="mini-stats">
        <div class="mini-stat"><div class="v">${S.sp}</div><div class="l">技能点</div></div>
        <div class="mini-stat"><div class="v">${S.rep}</div><div class="l">声望</div></div>
        <div class="mini-stat"><div class="v">${S.works}</div><div class="l">作品</div></div>
        <div class="mini-stat"><div class="v">${S.performances}</div><div class="l">演出</div></div>
        <div class="mini-stat"><div class="v">¥${S.income}</div><div class="l">收入</div></div>
        <div class="mini-stat"><div class="v">${S.level}</div><div class="l">等级</div></div>
      </div>
      <div class="char-dir">🎯 当前方向 · <b>${dir}</b></div>
    </div>
    <div class="block-title">🎯 能力</div>
    <div class="skill-list">${skillHTML}</div>
    <div class="block-title">⚡ 能量</div>
    <div class="skill-list">
      <div class="skill-row"><div class="top"><span class="nm">技能点 SP</span><span class="vl">${S.sp}</span></div></div>
    </div>`;
}
function titleForLevel(){
  const t=["初出茅庐的音乐毕业生","萌芽的音乐人","渐入佳境的乐手","小有名气的演奏者","风格初成的创作者",
    "独当一面的音乐人","受人瞩目的新星","职业音乐人","资深音乐人","传奇音乐人"];
  return t[Math.min(S.level-1, t.length-1)];
}

/* ---------------- Router ---------------- */
const VIEWS = {
  home:renderHome, world:renderWorld, practice:renderPractice,
  instruments:renderInstruments, studio:renderStudio, compose:renderCompose,
  ear:renderEar, career:renderCareer, portfolio:renderPortfolio
};
const NAV = [
  {id:"home",em:"🏠",nm:"首页"},{id:"world",em:"🗺",nm:"世界"},
  {id:"practice",em:"🎵",nm:"练习"},{id:"instruments",em:"🎹",nm:"乐器"},
  {id:"studio",em:"💻",nm:"工作室"},{id:"compose",em:"🎼",nm:"作曲"},
  {id:"ear",em:"👂",nm:"听力"},{id:"career",em:"🎓",nm:"职业"},
  {id:"portfolio",em:"📁",nm:"作品集"}
];
let currentView = "home";
function buildNav(){
  $("botnav").innerHTML = NAV.map(n=>
    `<button class="nav-item" data-view="${n.id}"><span class="em">${n.em}</span>${n.nm}</button>`).join("");
  $("botnav").querySelectorAll(".nav-item").forEach(b=>{
    b.onclick = ()=> showView(b.dataset.view);
  });
}
function buildTopMenu(){
  const items=[{t:"学习地图",v:"home"},{t:"练习",v:"practice"},{t:"作品",v:"portfolio"},{t:"舞台",v:"career"}];
  const m=$("topmenu");
  if(!m) return;
  m.innerHTML = items.map(it=>`<a data-v="${it.v}">${it.t}</a>`).join("");
  m.querySelectorAll("a").forEach(a=> a.onclick=()=> showView(a.dataset.v));
}
function showView(v){
  currentView = v;
  $("botnav").querySelectorAll(".nav-item").forEach(b=>
    b.classList.toggle("active", b.dataset.view===v));
  const tm=$("topmenu"); if(tm) tm.querySelectorAll("a").forEach(a=> a.classList.toggle("active", a.dataset.v===v));
  const fn = VIEWS[v]; if(fn) fn();
  $("view").scrollTop = 0;
}

/* ---------------- Home ---------------- */
function ensureDailyQuests(){
  if(S.questDate !== todayStr()){
    const pool = D.QUEST_TEMPLATES.slice();
    // shuffle
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    S.quests = pool.slice(0,5).map((q,i)=>({id:q.em+q.t, em:q.em, t:q.t, d:q.d, exp:q.exp, act:q.act, done:false, idx:i}));
    S.questDate = todayStr();
    save();
  }
}
function renderHome(){
  ensureDailyQuests();
  const ds = derivedSkills();
  // radar values
  const radar = ds.map(d=>({label:d.nm, val:d.v}));

  const quests = S.quests.map(q=>`
    <div class="quest-item ${q.done?'quest-done':''}" data-qid="${q.idx}">
      <div class="qem">${q.em}</div>
      <div class="qbody"><div class="qt">${q.t}</div><div class="qd">${q.d}</div></div>
      <div class="qexp">+${q.exp}</div>
    </div>`).join("");

  const schedule = [
    {tm:"08:30",tx:"🎹 Piano Practice"},{tm:"12:00",tx:"👂 Ear Training"},
    {tm:"15:00",tx:"💻 Producer Quest"},{tm:"19:00",tx:"🎼 Composition"},
    {tm:"21:00",tx:"🎧 Listening Mission"}
  ].map(s=>`<div class="today-line"><span class="tm">${s.tm}</span><span class="tx">${s.tx}</span></div>`).join("");

  // badges
  const earned = D.BADGES.filter(b=> b.cond(S));
  const badgeHTML = D.BADGES.map(b=>{
    const got = b.cond(S);
    if(got && !S.badges.includes(b.id)) S.badges.push(b.id);
    return `<span class="badge ${got?'':'locked'}">${b.em} ${b.nm}</span>`;
  }).join("");

  $("view").innerHTML = `
    <div class="kicker">MY MUSIC LIFE</div>
    <h1 class="section-title"><span class="em">🎼</span>我的音乐人生</h1>
    <p class="lead">今天不是来“学习”的——你上线是为了继续你的音乐人生。钢琴任务还没做？作曲技能快升级了？去把今天的 Quest 清了吧。</p>

    <div class="dash-grid">
      <div>
        <div class="panel">
          <h2>📅 TODAY'S QUEST</h2>
          <div class="sub">完成每日任务获得经验值，推进你的音乐人生。</div>
          ${quests}
          <button class="btn ghost sm" id="btn-plan">⏱ 按时间生成训练计划</button>
          <button class="btn ghost sm" id="btn-event" style="margin-left:6px">🎲 探索今日随机事件</button>
        </div>
        <div class="panel">
          <h2>🗺 今日音乐世界</h2>
          ${schedule}
        </div>
      </div>
      <div>
        <div class="panel radar-box">
          <h2>📊 音乐能力雷达</h2>
          <div class="sub">来自你的能力检测与成长。</div>
          <canvas id="radar" width="320" height="320"></canvas>
        </div>
        <div class="panel">
          <h2>🏅 成就徽章</h2>
          <div class="badge-row">${badgeHTML}</div>
        </div>
      </div>
    </div>`;

  drawRadar($("radar"), radar);

  // quest handlers
  $("view").querySelectorAll(".quest-item").forEach(it=>{
    it.onclick = ()=>{
      const idx = +it.dataset.qid; const q = S.quests[idx];
      if(q.done) return;
      q.done = true;
      // side effects
      if(q.act==="compose"){ S.works++; addPortfolio("compose","🎵 每日小作品", "日常创作练习", 40); }
      if(q.act==="studio"){ S.works++; }
      addExp(q.exp);
      S.works = q.act==="compose"? S.works : S.works;
      renderHome();
      toast("任务完成！+"+q.exp+" EXP", q.em, "xp");
    };
  });
  $("btn-plan").onclick = openPlanMaker;
  $("btn-event").onclick = ()=> triggerEvent();
  save();
}

function addPortfolio(type,title,note,exp){
  S.portfolio.unshift({
    type, title, date:todayStr(), skill:type, time:"—", exp:exp||0,
    ai:"继续打磨，你会发现自己的声音。", note:note||"", byUser:note||""
  });
  if(type==="compose") S.skills.compose = clamp(S.skills.compose+1,0,10);
  save();
}

function openPlanMaker(){
  modal(`
    <h3>⏱ 按时间生成训练计划</h3>
    <div class="msub">告诉我你今天有多少时间，我来生成一套音乐任务。</div>
    <div class="mrow">
      <input id="plan-min" type="number" min="10" max="600" value="30"
        style="background:#0d1424;border:1px solid var(--line);border-radius:10px;padding:10px;color:#e9e4d6;width:120px"/>
      <span style="color:#9aa3b8">分钟</span>
    </div>
    <div id="plan-out"></div>
    <div class="mrow" style="justify-content:flex-end">
      <button class="btn ghost" onclick="ML.closeM()">关闭</button>
      <button class="btn" id="plan-gen">生成</button>
    </div>`);
  $("plan-gen").onclick = ()=>{
    const min = clamp(+$("plan-min").value||30, 10, 600);
    const blocks = [];
    if(min<20){ blocks.push(["👂 听觉训练",10],["🎹 手指练习",Math.max(5,min-10)]); }
    else if(min<60){ blocks.push(["🎹 练习",20],["👂 听力",15],["🎼 和声/创作",min-35]); }
    else { blocks.push(["🎹 技术练习",30],["👂 听力",20],["💻 编曲",30],["🎼 作曲",min-80],["🎧 聆听分析",Math.min(30,min-80)]); }
    $("plan-out").innerHTML = `<div class="panel" style="margin:0">`+
      blocks.filter(b=>b[1]>0).map(b=>`<div class="today-line"><span class="tm">${b[1]}m</span><span class="tx">${b[0]}</span></div>`).join("")+
      `</div><p class="msub" style="margin-top:10px">短时高频比一次猛练更有效。去完成任务吧！</p>`;
  };
}

/* ---------------- Radar ---------------- */
function drawRadar(cv, data){
  const ctx = cv.getContext("2d");
  const W=cv.width, H=cv.height, cx=W/2, cy=H/2, R=120;
  const n = data.length;
  ctx.clearRect(0,0,W,H);
  // grid
  ctx.strokeStyle="rgba(157,78,221,.25)"; ctx.lineWidth=1;
  for(let r=1;r<=4;r++){
    ctx.beginPath();
    for(let i=0;i<=n;i++){
      const a = -Math.PI/2 + i*2*Math.PI/n;
      const rr = R*r/4;
      const x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  // axes + labels
  ctx.fillStyle="#cbbfa6"; ctx.font="11px Rajdhani, sans-serif";
  for(let i=0;i<n;i++){
    const a=-Math.PI/2 + i*2*Math.PI/n;
    const x=cx+R*Math.cos(a), y=cy+R*Math.sin(a);
    ctx.strokeStyle="rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke();
    const lx=cx+(R+16)*Math.cos(a), ly=cy+(R+16)*Math.sin(a);
    ctx.textAlign = Math.abs(Math.cos(a))<0.3?"center":(Math.cos(a)>0?"left":"right");
    ctx.textBaseline = Math.abs(Math.sin(a))<0.3?"middle":(Math.sin(a)>0?"top":"bottom");
    ctx.fillText(data[i].label, lx, ly);
  }
  // data polygon
  ctx.beginPath();
  for(let i=0;i<=n;i++){
    const idx=i%n;
    const a=-Math.PI/2 + idx*2*Math.PI/n;
    const rr=R*clamp(data[idx].val,0,10)/10;
    const x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle="rgba(0,245,212,.18)"; ctx.fill();
  ctx.strokeStyle="#00f5d4"; ctx.lineWidth=2; ctx.stroke();
  // points
  for(let i=0;i<n;i++){
    const a=-Math.PI/2 + i*2*Math.PI/n;
    const rr=R*clamp(data[i].val,0,10)/10;
    const x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
    ctx.beginPath(); ctx.arc(x,y,3,0,7); ctx.fillStyle="#f2c879"; ctx.fill();
  }
}

/* ---------------- World Map ---------------- */
/* ---------------- 音乐世界：每个区域都是真实可探索的知识区域 ---------------- */
const REGION_DETAIL = {
  classical:{nm:"古典之城",topics:[["cl-baroque","巴洛克"],["cl-classic","古典主义"],["cl-rom","浪漫主义"],["cl-imp","印象主义"]],
    works:[["平均律键盘曲集","J.S. Bach","48 首前奏曲与赋格，是复调与调性的百科全书"],["钢琴奏鸣曲 Op.49 No.2","Beethoven","奏鸣曲式的清晰范例"],["夜曲 Op.9 No.2","Chopin","歌唱性旋律与 rubato 的典范"]],
    audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:65,iv:[0,4,7]},{root:62,iv:[0,3,7]},{root:60,iv:[0,4,7]}],step:1.0,dur:0.9},
    task:"选一首 Bach 的《C 大调创意曲 BWV 772》，分三步：① 只弹右手；② 只弹左手；③ 合手但让右手稍响。录音检查能否听清两条线。"},
  harmony:{nm:"和声森林",topics:[["h-conn","和弦连接 / 四部和声"],["h-borrow","借用和弦"],["h-extend","延伸和弦"],["h-subst","替代和弦"],["h-modal","调式 / 爵士和声"]],
    works:[["Gott erhalte","Haydn","四部和声的教科书范例"],["《Bohemian Rhapsody》","Queen","♭VI–♭VII 借用和弦的流行范例"],["《Autumn Leaves》","Kosma","ii–V–I 的听觉标准"]],
    audio:{type:"prog",chords:[{root:62,iv:[0,3,7,10]},{root:55,iv:[0,4,7,10]},{root:60,iv:[0,4,7,11]}],step:1.0,dur:0.9},
    task:"在 C 大调弹出 I–vi–IV–V，然后把它改成 I–♭VI–♭VII–V（借用和弦版本），对比两种色彩：前者明亮叙事，后者沧桑有力。"},
  earcave:{nm:"练耳洞窟",topics:[["ear-int","音程听辨"],["ear-chord","和弦与色彩听辨"],["ear-prog","进行与功能听辨"],["ear-mode","调式判断"]],
    drill:"mixed",
    works:[["《小星星》","传统","大二度的记忆锚点"],["《婚礼进行曲》","Wagner","纯四度的记忆锚点"],["《星球大战》主题","Williams","纯五度的记忆锚点"]],
    audio:{type:"chord",root:60,iv:[0,4,7,10],dur:1.4},
    task:"做一轮 10 题音程听辨：只用参考曲记忆法（大二度=小星星、纯四度=婚礼进行曲、纯五度=星球大战），目标正确率 80% 以上。"},
  proddist:{nm:"制作人工坊",topics:[["dw-setup","工程搭建"],["dw-edit","编辑与量化"],["dw-mix","DAW 内混音"],["dw-master","导出与母带"]],
    works:[["《Billie Jean》","Michael Jackson","鼓组与贝斯 groove 的制作典范"],["《Get Lucky》","Daft Punk","clean guitar 与压缩的现代制作"],["《Blinding Lights》","The Weeknd","合成器音色与空间设计"]],
    audio:{type:"chord",root:57,iv:[0,3,7,10],dur:1.2},
    task:"在你的 DAW 里建立一个模板工程：标记好轨道颜色（鼓/贝斯/和声/旋律/人声）、设置好采样率（44.1k 或 48k）、预置一个总线与混响返回轨。"},
  guitar:{nm:"吉他街",instrument:"guitar",
    works:[["《Wonderwall》","Oasis","开放和弦 + 扫弦的入门必弹"],["《Hotel California》","Eagles","八小节循环与双吉他编配"],["《Blackbird》","The Beatles","指弹编配的典范"]],
    audio:{type:"chord",root:48,iv:[0,4,7,9],dur:1.4},
    task:"用 C–G–Am–F 做和弦转换练习（节拍器 60，每小节一换），逐弦检查有没有闷音；熟练后提速到 80。"},
  orchestra:{nm:"交响大厅",topics:[["or-string","弦乐组"],["or-wood","木管组"],["or-brass","铜管组"],["or-energy","力度与能量"]],
    works:[["《第五交响曲》","Beethoven","动机发展与配器能量的典范"],["《行星组曲·木星》","Holst","铜管与弦乐的能量构建"],["《春之声》","Strauss","木管的轻盈与圆舞曲律动"]],
    audio:{type:"prog",chords:[{root:48,iv:[0,7]},{root:53,iv:[0,7]},{root:60,iv:[0,4,7]},{root:55,iv:[0,4,7,10]}],step:1.1,dur:1.0},
    task:"为同一段 8 小节旋律做两次配器：① 只用弦乐（抒情、连贯）；② 加入铜管（辉煌、有冲击力）。对比能量差异，说明你用了什么手段。"},
  eastern:{nm:"东方乐村",topics:[["fk-mode","笙箫的音律与演奏"]],instrument:"xiao",
    works:[["《春江花月夜》","中国传统","五声调式与音色层次的典范"],["《二泉映月》","华彦钧","线性旋律与气息表达"],["《百鸟朝凤》","民间唢呐曲","模仿性音色与装饰技法"]],
    audio:{type:"seq",notes:[{m:60,d:0.5,gap:0.52},{m:62,d:0.5,gap:0.52},{m:64,d:0.5,gap:0.52},{m:67,d:0.5,gap:0.52},{m:69,d:0.9,gap:0.92}]},
    task:"用五声音阶（宫商角徵羽 = do re mi sol la）即兴一段旋律：只用这五个音，不做半音。你会立刻听到「中国风」的骨架。然后试着在句尾加一个下滑的装饰音。"},
  stage:{nm:"表演舞台",topics:[["ex-param","表达参数"],["ex-lab","表达实验"],["ac-follow","跟随歌手"]],
    works:[["《Bohemian Rhapsody》","Queen","段落对比与舞台能量的极端范例"],["《Someone Like You》","Adele","极简伴奏与声乐表情"],["《Imagine》","John Lennon","钢琴伴奏与人声的平衡"]],
    audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:57,iv:[0,3,7]},{root:53,iv:[0,4,7]},{root:55,iv:[0,4,7]}],step:1.1,dur:0.9},
    task:"同一段旋律录两个版本：A 无任何表情（严格按谱），B 加入速度弹性、力度起伏与乐句方向。让朋友盲听，问哪个更像「在说话」。"},
  film:{nm:"影视配乐棚",topics:[["fm-cue","配乐段落写作"],["fm-leit","主导动机"]],
    works:[["《星际穿越》","Hans Zimmer","管风琴音色与极简和声营造宏大时间感"],["《指环王》","Howard Shore","主导动机体系与角色绑定"],["《千与千寻》","久石让","钢琴与弦乐的简洁叙事"]],
    audio:{type:"prog",chords:[{root:53,iv:[0,4,7]},{root:60,iv:[0,4,7,11]},{root:57,iv:[0,3,7]}],step:1.6,dur:1.4},
    task:"为一段 30 秒的无声画面（自己找一段）写一段配乐：只用一个和弦循环 + 一个旋律动机，标出 3 个同步点（画面事件与音乐重音对齐）。"},
  game:{nm:"游戏音乐实验场",topics:[["gm-adapt","自适应与分层"],["gm-loop","循环音乐"]],
    works:[["《超级马力欧》主题","近藤浩治","可循环旋律与节奏驱动"],["《塞尔达传说》","近藤浩治","探索音乐与空间感"],["《Journey》","Austin Wintory","自适应音乐与情感曲线"]],
    audio:{type:"prog",chords:[{root:57,iv:[0,3,7]},{root:60,iv:[0,4,7]},{root:62,iv:[0,3,7]},{root:55,iv:[0,4,7]}],step:0.8,dur:0.7},
    task:"写一段 8 小节可无缝循环的战斗音乐：开头与结尾的和声要能接上（常用 V → I 回到循环起点），并且至少有两层（基础层 + 加鼓的强化层）。"},
  jazz:{nm:"爵士俱乐部",topics:[["jz-blues","Blues"],["jz-iivi","ii–V–I"],["jz-impro","爵士即兴"]],
    works:[["《So What》","Miles Davis","只有两个和弦的即兴，靠动机与空间"],["《Autumn Leaves》","Kosma","ii–V–I 的标准教材"],["《Take Five》","Desmond","5/4 拍与非常规曲式"]],
    audio:{type:"prog",chords:[{root:62,iv:[0,3,7,10]},{root:55,iv:[0,4,7,10]},{root:60,iv:[0,4,7,11]}],step:1.0,dur:0.9},
    task:"在 ii–V–I（Dm7–G7–Cmaj7）上做四轮即兴：① 只用和弦音；② 加经过音；③ 每句结尾用半音 enclosure 落到下一和弦的 3 音；④ 整体延后半拍起句。"},
  exp:{nm:"实验场",topics:[["im-free","自由即兴"],["st-fuse","风格融合"],["sd-synth","合成音色"]],
    works:[["《Music for Airports》","Brian Eno","ambient 与非目的性音乐"],["《The Köln Concert》","Keith Jarrett","自由即兴的结构与能量"],["《Revolution 9》","The Beatles","拼贴与声音实验"]],
    audio:{type:"chord",root:60,iv:[0,2,4,7,9],dur:2.0},
    task:"做一次 3 分钟自由即兴，唯一规则：只用 5 个音（五声音阶），且必须包含至少 3 次 4 秒以上的完全静默。录音后画出能量曲线，检查是否有起伏。"}
};
function renderWorld(){
  const regions = D.REGIONS.map(r=>{
    const D2 = REGION_DETAIL[r.id] || {nm:r.nm};
    return `<div class="region" data-id="${r.id}" style="background:${r.grad}">
      <span class="rg-em">${r.em}</span>
      <div class="rg-nm">${D2.nm||r.nm}</div><div class="rg-ds">${r.ds}</div>
    </div>`;
  }).join("");
  $("view").innerHTML = `
    <div class="kicker">WORLD OF MUSIC</div>
    <h1 class="section-title"><span class="em">🗺</span>音乐世界地图</h1>
    <p class="lead">每个区域都是一个真正可探索的知识世界：领域知识、经典作品、可播放的音乐例子、互动练习与实际任务。</p>
    <div class="map-grid">${regions}</div>`;
  $("view").querySelectorAll(".region").forEach(r=>{
    r.onclick=()=> openRegion(r.dataset.id);
  });
}
function openRegion(id){
  const reg = D.REGIONS.find(x=>x.id===id);
  const R = REGION_DETAIL[id];
  if(!R){ toast("这个区域正在建设","🚧"); return; }
  const topics = (R.topics||[]).map(t=>`<div class="kn-row" data-topic="${t[0]}">
      <span class="kn-em">📖</span><span class="kn-t">${t[1]}</span><span class="kn-s">进入 →</span></div>`).join("");
  const works = (R.works||[]).map(w=>`<div class="wk-row">
      <div class="wk-t">《${w[0]}》</div><div class="wk-c">${w[1]}</div><div class="wk-n">${w[2]}</div></div>`).join("");
  $("view").innerHTML = `
    <div class="kicker">${reg.em} ${R.nm}</div>
    <h1 class="section-title"><span class="em">${reg.em}</span>${R.nm}</h1>
    <div class="mrow"><button class="btn ghost sm" id="rg-back">← 返回世界地图</button></div>

    <div class="panel"><div class="sec-tag">① 领域知识</div>
      ${topics?`<div>${topics}</div>`:`<div class="lnote">这一区域以实践为主，直接进入下面的互动与任务。</div>`}
      ${R.instrument?`<div class="kn-row" data-inst="${R.instrument}"><span class="kn-em">🎸</span><span class="kn-t">进入乐器知识库</span><span class="kn-s">进入 →</span></div>`:""}
    </div>

    <div class="panel"><div class="sec-tag">② 经典作品</div>${works}</div>

    <div class="panel"><div class="sec-tag">③ 音乐例子</div>
      <div class="mrow"><button class="btn sm gold" id="rg-play">🔊 播放示例</button>
        <span class="lab-note">点一次听一遍，用来建立这个区域的听觉印象。</span></div>
    </div>

    <div class="panel"><div class="sec-tag">④ 互动内容</div>
      <div class="lnote">在键盘上试着弹出这个区域的和声与旋律；点「回放」听你刚弹的。</div>
      <div class="piano-wrap" id="rg-piano" style="margin-top:10px"></div>
      <div class="mrow"><button class="btn sm" id="rg-replay">↻ 回放</button><button class="btn ghost sm" id="rg-clear">清空</button></div>
      ${R.drill?`<div style="margin-top:12px"><button class="btn sm gold" id="rg-drill">🎧 开始一轮听辨训练</button></div><div id="rg-drillbox"></div>`:""}
    </div>

    <div class="panel"><div class="sec-tag">⑤ 实际任务</div>
      <div class="lnote">${R.task||""}</div>
      <div class="mrow"><button class="btn gold" id="rg-done">完成这个任务 (+25 EXP)</button></div>
    </div>`;
  $("rg-back").onclick=renderWorld;
  $("view").querySelectorAll("[data-topic]").forEach(b=>{
    b.onclick=()=>{ if(window.ML && ML.openLesson) ML.openLesson(b.dataset.topic); else { showView("learn"); toast("去知识地图找这一课","📚"); } };
  });
  $("view").querySelectorAll("[data-inst]").forEach(b=>{
    b.onclick=()=>{ showView("instruments"); setTimeout(()=>openInstrument(b.dataset.inst),0); };
  });
  $("rg-play").onclick=()=>{
    const a=R.audio; if(!a) return;
    if(a.type==="prog") a.chords.forEach((c,i)=> setTimeout(()=>AE.chord(c.iv,c.root,a.dur||0.9), i*(a.step||1)*1000));
    else if(a.type==="seq") AE.playMidi(a.notes);
    else AE.chord(a.iv,a.root,a.dur||1.2);
  };
  let rec=[];
  if(window.buildPiano) try{ window.buildPiano($("rg-piano"), m=>rec.push(m)); }catch(e){}
  $("rg-replay").onclick=()=>{ if(!rec.length){ toast("先在键盘上弹点什么","🎹"); return;} AE.playMidi(rec.map(m=>({m,d:0.4,gap:0.42}))); };
  $("rg-clear").onclick=()=>{ rec=[]; };
  if(R.drill) $("rg-drill").onclick=()=>{
    if(window.EAR && window.EAR.render){ window.EAR.render($("rg-drillbox"), {}); }
    else toast("听辨训练请到「练耳」课程","🎧");
  };
  $("rg-done").onclick=()=>{ addExp(25); S.worldDone=(S.worldDone||0)+1; save(); renderShell(); toast(R.nm+" 任务完成 +25 EXP","🎯","xp"); };
}

/* ---------------- Practice / Skill tree ---------------- */
function renderPractice(){
  const branches = D.SKILL_TREE.map(br=>{
    const nodes = br.nodes.map(nd=>{
      const unlocked = !nd.req || S.skillNodes[nd.req];
      const learned = S.skillNodes[nd.id];
      const canLearn = unlocked && !learned && S.level>=nd.lv && S.sp>=nd.lv;
      const cls = learned?"unlocked active":(unlocked?"":"locked");
      const tag = learned?`<span class="sn-tag done">✓</span>`:(unlocked&&S.level>=nd.lv?`<span class="sn-tag">可学</span>`:`<span class="sn-tag">LV.${nd.lv}</span>`);
      return `<div class="snode ${cls}" data-branch="${br.key}" data-id="${nd.id}" data-cost="${nd.lv}">
        ${tag}<div class="sn-em">${nd.em}</div>
        <div class="sn-nm">${nd.nm}</div>
        <div class="sn-lv">LV.${nd.lv}</div>
        <div class="sn-cost">💎 ${nd.lv} 技能点</div>
      </div>`;
    }).join("");
    return `<div class="tree-lane">
      <div class="lane-head"><span class="em">${br.em}</span>${br.name}<span class="bar"></span></div>
      <div class="node-grid">${nodes}</div>
    </div>`;
  }).join("");

  const bosses = [
    {em:"🎼",nm:"Harmony Boss",ds:"给一段旋律配四部和声"},
    {em:"🎹",nm:"Piano Boss",ds:"随机和弦，现场即兴"},
    {em:"💻",nm:"Producer Boss",ds:"钢琴+人声，30分钟编曲"},
    {em:"🎵",nm:"Composer Boss",ds:"指定情绪/调性/乐器完成作品"}
  ].map(b=>`<div class="quest-item" data-boss="${b.nm}"><div class="qem">${b.em}</div>
    <div class="qbody"><div class="qt">${b.nm}</div><div class="qd">${b.ds}</div></div>
    <div class="qexp">BOSS</div></div>`).join("");

  $("view").innerHTML = `
    <div class="kicker">SKILL TREE</div>
    <h1 class="section-title"><span class="em">🌳</span>音乐技能树</h1>
    <p class="lead">不是“看课程”，而是点亮技能节点。每个节点消耗技能点（升级获得），并从对应能力中提升你的角色属性。</p>
    <div class="panel" style="padding:10px 16px">
      <div class="tree-scroll">${branches}</div>
    </div>
    <div class="panel">
      <h2>🏆 BOSS 试炼</h2>
      <div class="sub">每个阶段的最终证明——通过即视为该路线 mastery。</div>
      ${bosses}
    </div>`;

  $("view").querySelectorAll(".snode").forEach(n=>{
    n.onclick = ()=>{
      const id=n.dataset.id, branch=n.dataset.branch, cost=+n.dataset.cost;
      const br = D.SKILL_TREE.find(x=>x.key===branch);
      const nd = br.nodes.find(x=>x.id===id);
      if(S.skillNodes[id]){ toast("已掌握："+nd.nm,"✅"); return; }
      if(nd.req && !S.skillNodes[nd.req]){ toast("需先掌握前置节点","🔒"); return; }
      if(S.level < nd.lv){ toast("需角色 LV."+nd.lv,"🔒"); return; }
      if(S.sp < cost){ toast("技能点不足（需 "+cost+"）","💎"); return; }
      S.sp -= cost; S.skillNodes[id]=true;
      const cat = nodeCat(branch);
      S.skills[cat] = clamp(S.skills[cat]+1,0,10);
      addExp(20);
      save(); renderShell(); renderPractice();
      toast("掌握 "+nd.nm+"！属性提升","✨");
    };
  });
  $("view").querySelectorAll("[data-boss]").forEach(b=>{
    b.onclick=()=>{ addExp(120); toast("Boss 试炼通过！+120 EXP","🏆","xp"); renderShell(); };
  });
}

/* ---------------- Instruments ---------------- */
/* ---------------- 乐器知识库：直接进入学习，无检测 / 无等级 / 无解锁 ---------------- */
function renderInstruments(){
  const lib = window.INSTRUMENT_LIB || {};
  const cards = D.INSTRUMENTS.map(i=>{
    const L = lib[i.id];
    const n = L? L.nodes.length : 0;
    const st = S.instruments[i.id] || {};
    const done = (st.done||[]).length;
    return `<div class="inst-card" data-id="${i.id}">
      <div class="iem">${i.em}</div>
      <div class="inm">${i.nm}</div>
      <div class="ild">${L? L.ds : i.ds}</div>
      <div class="ilv">${L? (n+" 节知识 · 已学 "+done) : "即将上线"}</div>
    </div>`;
  }).join("");
  $("view").innerHTML = `
    <div class="kicker">INSTRUMENT ACADEMY</div>
    <h1 class="section-title"><span class="em">🎹</span>乐器知识库</h1>
    <p class="lead">选一件乐器，直接进入它的专属知识体系。没有等级检测、没有解锁——每一节都有专业讲解、实际示范、音乐应用与操作练习。</p>
    <div class="inst-grid">${cards}</div>`;
  $("view").querySelectorAll(".inst-card").forEach(c=>{
    c.onclick=()=>{ const id=c.dataset.id;
      if(!lib[id]){ toast("这件乐器的知识库正在整理","🎼"); return; }
      openInstrument(id); };
  });
}
function openInstrument(id){
  const L = window.INSTRUMENT_LIB[id];
  if(!L) return;
  const i = D.INSTRUMENTS.find(x=>x.id===id);
  const st = S.instruments[id] || (S.instruments[id]={level:0,detected:true,done:[]});
  if(!st.done) st.done=[];
  st.detected = true;
  const groups = ["入门","进阶","高级"].map(g=>{
    const ns = L.nodes.map((n,k)=>({n,k})).filter(o=>(o.n.lv||"入门")===g);
    if(!ns.length) return "";
    const tag = g==="入门"?"①":g==="进阶"?"②":"③";
    return `<div class="panel">
      <div class="sec-tag">${tag} ${g}</div>
      ${ns.map(o=>`<div class="kn-row" data-k="${o.k}">
        <span class="kn-em">${o.n.em}</span>
        <span class="kn-t">${o.n.t}</span>
        <span class="kn-s">${st.done.indexOf(o.n.id)>=0?"✓ 已学":""}</span>
      </div>`).join("")}
    </div>`;
  }).join("");
  const pct = Math.round(st.done.length / L.nodes.length * 100);
  $("view").innerHTML = `
    <div class="kicker">${i.em} ${L.nm} LIBRARY</div>
    <h1 class="section-title"><span class="em">${i.em}</span>${L.nm}知识库</h1>
    <p class="lead">${L.intro}</p>
    <div class="panel">
      <div class="mrow">
        <button class="btn ghost sm" id="inst-back">← 返回乐器</button>
        <span class="lab-note" style="margin-left:auto">进度 ${st.done.length} / ${L.nodes.length} 节（${pct}%）</span>
      </div>
    </div>
    ${groups}`;
  $("inst-back").onclick=renderInstruments;
  $("view").querySelectorAll(".kn-row").forEach(r=>{
    r.onclick=()=> openInstNode(id, +r.dataset.k);
  });
}
function openInstNode(id, k){
  const L = window.INSTRUMENT_LIB[id];
  const n = L.nodes[k];
  const st = S.instruments[id]; if(!st.done) st.done=[];
  const isDone = st.done.indexOf(n.id)>=0;
  const isLast = k >= L.nodes.length-1;
  $("view").innerHTML = `
    <div class="kicker">${L.nm} · ${n.lv||"入门"}</div>
    <h1 class="section-title"><span class="em">${n.em}</span>${n.t}</h1>
    <div class="panel"><div class="sec-tag">① 专业讲解</div><div class="lnote">${n.explain}</div></div>
    <div class="panel"><div class="sec-tag">② 实际示范</div><div class="lnote">${n.demo}</div></div>
    <div class="panel"><div class="sec-tag">③ 音乐应用</div><div class="lnote">${n.apply}</div></div>
    <div class="panel"><div class="sec-tag">④ 操作练习</div><div class="lnote">${n.task}</div>
      <div class="piano-wrap" id="ik-piano" style="margin-top:10px"></div>
      <div class="mrow"><button class="btn sm" id="ik-replay">↻ 回放</button><button class="btn ghost sm" id="ik-clear">清空</button></div>
    </div>
    <div class="panel"><div class="sec-tag">⑤ 完成与继续</div>
      <div class="mrow">
        <button class="btn ghost" id="ik-back">← 返回目录</button>
        <button class="btn gold" id="ik-done">${isDone?(isLast?"✓ 已学 · 回到目录":"✓ 已学 · 下一节 →"):"完成这一节 →"}</button>
      </div>
    </div>`;
  let rec=[];
  if(window.buildPiano) try{ window.buildPiano($("ik-piano"), m=>rec.push(m)); }catch(e){}
  $("ik-replay").onclick=()=>{ if(!rec.length){ toast("先在键盘上弹点什么","🎹"); return;} AE.playMidi(rec.map(m=>({m,d:0.4,gap:0.42}))); };
  $("ik-clear").onclick=()=>{ rec=[]; };
  $("ik-back").onclick=()=> openInstrument(id);
  $("ik-done").onclick=()=>{
    if(st.done.indexOf(n.id)<0){ st.done.push(n.id); addExp(20); save(); toast("完成一节 +20 EXP","✨","xp"); }
    if(isLast){ toast(L.nm+" 知识库已学完","🎉"); renderShell(); openInstrument(id); }
    else openInstNode(id, k+1);
  };
}
function nodeCatFromInst(id){
  return {piano:"piano",guitar:"perf",violin:"perf",sheng:"perf",xiao:"perf",
    flute:"perf",cello:"perf",voice:"perf"}[id]||"perf";
}

/* ---------------- Studio (music production RPG) ---------------- */
const STUDIO_STEPS = [
  {t:"认识 DAW 是什么",d:"Digital Audio Workstation：你未来的音乐工作室核心。"},
  {t:"选择工作站",d:"Logic / Ableton / Cubase / FL Studio……先了解差异。"},
  {t:"安装需要的软件",d:"DAW + 必要插件（合成器、效果器）。"},
  {t:"设置音频设备",d:"声卡、缓冲大小、延迟——让声音不卡顿。"},
  {t:"连接 MIDI 键盘",d:"把控制器接上，让手指直接写音乐。"},
  {t:"建立第一条 MIDI Track",d:"新建轨道，准备录入旋律。"},
  {t:"加载第一个乐器",d:"选择一架钢琴或合成音色。"},
  {t:"录入四小节旋律",d:"在 Piano Roll 里写下你的动机。"},
  {t:"加入鼓",d:"Kick / Snare / Hi-hat 建立律动。"},
  {t:"加入 Bass",d:"给和声一个稳定的根音地基。"},
  {t:"加入和弦",d:"铺一层和声织体，音乐立起来了。"},
  {t:"🎉 你的第一首作品诞生了",d:"导出、命名、收藏进作品集。"}
];
function renderStudio(){
  const step = S.studioStep;
  const chain = STUDIO_STEPS.map((s,i)=>{
    const cls = i<step?"done":(i===step?"cur":"locked");
    const dot = i<step?"✓":(i===step?"▶":(i+1));
    return `<div class="chain-step ${cls}">
      <div class="chain-dot">${dot}</div>
      <div class="chain-body"><div class="ct">${s.t}</div><div class="cd">${s.d}</div>
      ${i===step?`<button class="btn sm gold" id="step-do">完成这一步</button>`:""}
      </div></div>`;
  }).join("");
  const done = step>=STUDIO_STEPS.length;
  $("view").innerHTML = `
    <div class="kicker">MY MUSIC STUDIO</div>
    <h1 class="section-title"><span class="em">💻</span>我的音乐工作室</h1>
    <p class="lead">像 RPG 新手任务一样，从一台空白电脑开始，真正“做出来”你的第一首电脑音乐。</p>
    <div class="panel">
      <h2>📋 任务 001：建立你的音乐工作室</h2>
      <div class="sub">进度 ${Math.min(step,STUDIO_STEPS.length)} / ${STUDIO_STEPS.length}</div>
      <div class="quest-chain">${chain}</div>
      ${done?`<div class="feedback show">🏆 工作室已建成！你可以随时回到这里回顾，或前往 COMPOSE 创作完整作品。</div>`:""}
    </div>`;
  const btn = $("step-do");
  if(btn) btn.onclick = ()=>{
    S.studioStep++;
    const last = S.studioStep>=STUDIO_STEPS.length;
    addExp(last?200:30);
    if(last){ S.works++; addPortfolio("studio","💻 第一首电脑音乐","在工作室任务中完成的第一段编曲",200); }
    save(); renderShell(); renderStudio();
    toast(last?"工作室建成！+200 EXP":"步骤完成 +30 EXP","💻","xp");
  };
}

/* ---------------- Compose ---------------- */
function renderCompose(){
  const N = 8;
  let grid = Array(N).fill(0);
  $("view").innerHTML = `
    <div class="kicker">COMPOSER'S ROOM</div>
    <h1 class="section-title"><span class="em">🎼</span>作曲室</h1>
    <p class="lead">写下你的旋律。导师不会替你写完——它只在你需要时给方向。点击格子写音符，试听，再保存进作品集。</p>
    <div class="panel">
      <h2>✍️ 8 小节旋律草图</h2>
      <div class="compose-grid" id="cgrid">
        ${Array(N*3).fill(0).map((_,k)=>{
          const col=Math.floor(k/3), row=k%3;
          return `<div class="ckey" data-col="${col}" data-row="${row}">${["·","●","◆"][row]}</div>`;
        }).join("")}
      </div>
      <div class="mrow">
        <button class="btn" id="c-play">▶ 试听</button>
        <button class="btn gold" id="c-save">💾 保存为作品</button>
        <button class="btn ghost" id="c-clear">清空</button>
      </div>
      <div class="feedback" id="c-fb"></div>
    </div>`;
  const rootMidi = 60;
  function refresh(){
    $("cgrid").querySelectorAll(".ckey").forEach(k=>{
      const col=+k.dataset.col, row=+k.dataset.row;
      k.classList.toggle("on", grid[col]===row+1);
    });
  }
  $("cgrid").querySelectorAll(".ckey").forEach(k=>{
    k.onclick=()=>{
      const col=+k.dataset.col, row=+k.dataset.row;
      grid[col] = grid[col]===row+1 ? 0 : row+1;
      refresh();
    };
  });
  $("c-play").onclick=()=>{
    const seq=[]; grid.forEach((g,i)=>{ if(g) seq.push({m:rootMidi+(g-1)*3, d:0.35, gap:0.4}); });
    if(seq.length===0){ toast("先写几个音符吧","✍️"); return; }
    AE.playMidi(seq);
    const fb=$("c-fb"); fb.className="feedback show";
    fb.innerHTML = `🎓 导师：你写了 ${seq.length} 个音。注意乐句长短与呼吸——如果全是一个长度会偏平。试试让某一小节留白。`;
  };
  $("c-clear").onclick=()=>{ grid=Array(N).fill(0); refresh(); };
  $("c-save").onclick=()=>{
    const cnt = grid.filter(g=>g).length;
    if(cnt===0){ toast("空旋律无法保存","⚠️"); return; }
    S.works++; addPortfolio("compose","🎵 我的原创片段","在作曲室写下的旋律",80);
    addExp(80); save(); renderShell();
    toast("作品已存入作品集 +80 EXP","🎵","xp");
  };
}

/* ---------------- Ear training game ---------------- */
function renderEar(){
  $("view").innerHTML = `
    <div class="kicker">EAR TRAINING</div>
    <h1 class="section-title"><span class="em">👂</span>听力训练</h1>
    <p class="lead">真实音频听辨，参考音乐学院视唱练耳题型：音程 / 和弦 / 调式 / 和弦连接。每次随机出题，答对积累经验，提升你的听觉属性。</p>
    <div class="panel">
      <h2>🎯 Ear Battle</h2>
      <div class="game-meta"><span>得分 <b id="ear-score">0</b></span><span>连对 <b id="ear-combo">0</b></span><span>回合 <b id="ear-round">0</b></span></div>
      <div class="game-stage" id="ear-stage">
        <div class="big-play" id="ear-play">🔊</div>
        <div id="ear-q" style="margin:8px 0;color:#cbbfa6">点击播放，听辨后作答。</div>
        <div class="opt-grid" id="ear-opts"></div>
        <div class="feedback" id="ear-fb"></div>
      </div>
      <button class="btn ghost sm" id="ear-next" style="display:none">下一题 →</button>
    </div>`;
  let score=0, combo=0, round=0, cur=null, answered=false;
  const TYPES=["interval","chord","mode","prog"];
  function nextQ(){
    answered=false; round++;
    $("ear-round").textContent=round;
    $("ear-next").style.display="none";
    const q = EAR.makeQuestion(TYPES[Math.floor(Math.random()*TYPES.length)]);
    cur=q;
    const fb=$("ear-fb"); if(fb){ fb.className="feedback"; fb.innerHTML=""; }
    $("ear-q").textContent=q.question;
    const opts=$("ear-opts"); opts.innerHTML="";
    q.options.forEach((label,i)=>{
      const b=document.createElement("button"); b.className="opt-btn"; b.textContent=label;
      b.onclick=()=>{
        if(answered) return; answered=true;
        const correct = i===q.answer;
        if(correct){ b.classList.add("correct"); score+=10; combo++; S.skills.ear=clamp(S.skills.ear+0.2,0,10); addExp(8); toast("答对！","✅"); }
        else { b.classList.add("wrong"); combo=0;
          opts.querySelectorAll(".opt-btn").forEach(x=>{ if(x.textContent===q.options[q.answer]) x.classList.add("correct"); });
          toast("再听一次试试","🎧"); }
        $("ear-score").textContent=score; $("ear-combo").textContent=combo;
        const f=$("ear-fb"); if(f){ f.className="feedback show"; f.innerHTML=(correct?"✓ 正确。":"✗ 正确答案："+q.options[q.answer]+"。")+" <span style='color:#cbbfa6'>"+q.explain+"</span>"; }
        $("ear-next").style.display="inline-block";
      };
      opts.appendChild(b);
    });
  }
  $("ear-next").onclick=nextQ;
  $("ear-play").onclick=()=>{ if(cur) cur.play(); };
  nextQ();
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

/* ---------------- Harmony Lab ---------------- */
function renderHarmony(){
  const SLOTS=7;
  const chords=[{n:"I",iv:[0,4,7]},{n:"ii",iv:[0,3,7]},{n:"iii",iv:[0,4,7]},{n:"IV",iv:[0,5,9]},
    {n:"V",iv:[0,4,7]},{n:"vi",iv:[0,4,9]},{n:"vii°",iv:[0,3,6]}];
  let slots = Array(SLOTS).fill(null);
  $("view").innerHTML = `
    <div class="kicker">HARMONY LAB</div>
    <h1 class="section-title"><span class="em">🧪</span>和声实验室</h1>
    <p class="lead">旋律在中央，把和弦拖（点）进轨道。好听就 ✨+EXP；声部进行不好，导师会提示并可问“为什么”。</p>
    <div class="panel">
      <h2>🎵 为这段旋律配和声</h2>
      <div class="game-stage">
        <div style="color:#cbbfa6;font-size:13px">旋律：C – E – G – E – F – A – G – E（C 大调）</div>
        <div class="harmony-track" id="htrack">
          ${Array(SLOTS).fill(0).map((_,i)=>`<div class="hslot" data-i="${i}">${i+1}</div>`).join("")}
        </div>
        <button class="btn sm" id="h-play">▶ 播放</button>
      </div>
      <div class="chord-tray" id="htray">
        ${chords.map(c=>`<div class="chord-chip" data-n="${c.n}">${c.n}</div>`).join("")}
      </div>
      <div class="feedback" id="h-fb"></div>
      <div class="mrow">
        <button class="btn gold" id="h-validate">✨ 验证和声</button>
        <button class="btn ghost" id="h-why" style="display:none">❓ 为什么？</button>
        <button class="btn ghost sm" id="h-clear">清空</button>
      </div>
    </div>`;
  const rootMidi=60;
  const melody=[60,64,67,64,65,69,67,64];
  let selectedChip=null;
  $("htray").querySelectorAll(".chord-chip").forEach(c=> c.onclick=()=>{
    selectedChip = c.dataset.n;
    $("htray").querySelectorAll(".chord-chip").forEach(x=>x.style.borderColor="");
    c.style.borderColor="var(--gold-bright)";
  });
  $("htrack").querySelectorAll(".hslot").forEach(s=>{
    s.onclick=()=>{
      if(!selectedChip){ toast("先在下方选择和弦","🎯"); return; }
      const i=+s.dataset.i; slots[i]=selectedChip;
      s.textContent=selectedChip; s.classList.add("filled");
    };
  });
  $("h-play").onclick=()=>{
    // play melody + chords
    const seq=[];
    for(let i=0;i<8;i++){
      seq.push({m:melody[i], d:0.3, gap:0.35, type:"sine"});
      const ch = slots[i]; if(ch){ const c=chords.find(x=>x.n===ch);
        c.iv.forEach(iv=> seq.push({m:rootMidi+iv-12, d:0.3, gap:0.0, type:"triangle"})); }
    }
    AE.playMidi(seq);
  };
  $("h-clear").onclick=()=>{ slots=Array(SLOTS).fill(null);
    $("htrack").querySelectorAll(".hslot").forEach(s=>{s.textContent=(+s.dataset.i+1);s.classList.remove("filled");});
    $("h-fb").className="feedback"; $("h-why").style.display="none"; };
  $("h-validate").onclick=()=>{
    const filled = slots.filter(Boolean).length;
    const fb=$("h-fb");
    if(filled<3){ fb.className="feedback show"; fb.innerHTML="先至少填 3 个和弦再验证。"; $("h-why").style.display="none"; return; }
    // simple scoring: reward V before I, penalize parallel
    let good=true, reason="";
    const idx = slots.map(s=> s?chords.findIndex(c=>c.n===s):-1);
    for(let i=0;i<slots.length-1;i++){
      if(slots[i]==="V" && slots[i+1]==="I"){ /* good resolution */ }
      if(slots[i]==="I" && slots[i+1]==="vii°"){ good=false; reason="I 之后接 vii° 容易让低音跳进不自然，通常发生在你没给出明确倾向时。"; }
    }
    if(slots[slots.length-1]!=="I" && slots[slots.length-1]!=="vi"){ reason="结尾最好落在 I 或 vi，给耳朵‘回家’的感觉。"; good=false; }
    if(good){ fb.className="feedback show";
      fb.innerHTML=`✨ Harmony +EXP！你的和声进行通顺、有方向感。低音线条平稳，听起来舒服。`;
      addExp(40); S.skills.theory=clamp(S.skills.theory+0.5,0,10); renderShell();
      $("h-why").style.display="none"; toast("和声通过 +40 EXP","✨","xp");
    } else {
      fb.className="feedback show";
      fb.innerHTML=`🎓 导师：${reason} 你可以点“为什么？”听简单解释，然后修改低音声部。`;
      $("h-why").style.display="inline-block"; addExp(10); renderShell();
    }
  };
  $("h-why").onclick=()=>{
    const fb=$("h-fb");
    fb.className="feedback show";
    fb.innerHTML=`🎓 为什么：在功能和声里，<b>低音（Bass）</b>决定“方向”。两个声部若出现超过三度的跳进、或同向进入不协和音，耳朵会觉得“别扭”。让低音级进（比如 V 的根音到 I 的根音只差两度）最自然。试试把结尾改成 V → I。`;
  };
}

/* ---------------- Career & Income ---------------- */
function currentCareer(){
  // pick the highest-progress path loosely; default indie
  return S.level>=6?"indie":(S.skills.prod>=4?"producer":(S.skills.compose>=4?"composer":"pianist"));
}
function renderCareer(){
  const c = D.CAREERS.find(x=>x.id===currentCareer()) || D.CAREERS[0];
  const reached = clamp(Math.floor(S.level/2),0,c.nodes.length-1);
  const tree = c.nodes.map((n,i)=>{
    const cls = i<reached?"reached":(i===reached?"current":"");
    return `<div class="career-node ${cls}"><div class="cn-nm">${n.nm}</div><div class="cn-ds">${n.ds}</div></div>`+
      (i<c.nodes.length-1?`<div class="career-link ${i<reached?'reached':''}"></div>`:"");
  }).join("");

  // income simulation
  const base = 800 + S.level*420 + S.rep*60 + S.skills.prod*120 + S.skills.compose*100;
  const wave = Math.round(base * (0.6 + Math.random()*0.8)); // fluctuation
  const downSeason = Math.random()<0.35;
  const failChance = Math.max(2, 30 - S.level*2 - S.rep);
  const cmpRows = D.CAREER_ROWS.map(r=>{
    const st = D.CAREER_STATS[r.name];
    const star = v=>Array(5).fill(0).map((_,i)=>`<span class="${i<v?'':'off'}">★</span>`).join("");
    return `<tr><td>${r.name}</td><td class="star-mini">${star(st.income)}</td><td class="star-mini">${star(st.stable)}</td>
      <td class="star-mini">${star(st.free)}</td><td class="star-mini">${star(st.create)}</td><td class="star-mini">${star(st.perf)}</td></tr>`;
  }).join("");

  $("view").innerHTML = `
    <div class="kicker">CAREER TREE</div>
    <h1 class="section-title"><span class="em">🎓</span>职业之路</h1>
    <p class="lead">不是单调升级，而是发展成不同类型的音乐职业。每条路线属性不同——没有唯一“最成功”。</p>
    <div class="panel">
      <h2>🧭 当前路线：${c.name} ${c.em}</h2>
      <div class="career-tree" style="margin-top:12px">${tree}</div>
      <p class="msub" style="margin-top:12px">其它路线也可在等级提升后自然交叉（综合音乐人）。</p>
    </div>
    <div class="panel">
      <h2>💰 收入模拟</h2>
      <div class="sub">游戏模拟数据，不代表现实职业收入保证。含波动、淡季、项目失败风险。</div>
      <div class="income-grid">
        <div class="income-card"><div class="ic-l">本月预估收入</div><div class="ic-v">¥${wave}</div>
          <div class="income-bar"><i style="width:${clamp(wave/ (base*1.6)*100,5,100)}%"></i></div></div>
        <div class="income-card"><div class="ic-l">声望</div><div class="ic-v">${S.rep}</div></div>
        <div class="income-card"><div class="ic-l">作品</div><div class="ic-v">${S.works}</div></div>
        <div class="income-card"><div class="ic-l">演出</div><div class="ic-v">${S.performances}</div></div>
        <div class="income-card"><div class="ic-l">${downSeason?'🌧 淡季':'☀️ 旺季'}</div><div class="ic-v">${downSeason?'-30%':'正常'}</div></div>
        <div class="income-card"><div class="ic-l">项目失败率</div><div class="ic-v">${failChance}%</div></div>
      </div>
      <p class="msub" style="margin-top:12px">真实音乐收入高度不稳定：有淡季、客户取消、设备/软件支出与练习时间成本。这里只是“人生模拟”的乐趣。</p>
    </div>
    <div class="panel">
      <h2>📊 职业属性对比（模拟值）</h2>
      <table class="career-cmp"><thead><tr><th>职业</th><th>收入</th><th>稳定</th><th>自由</th><th>创作</th><th>演出</th></tr></thead>
      <tbody>${cmpRows}</tbody></table>
    </div>`;
}

/* ---------------- Portfolio ---------------- */
/* ---------------- 作品集：直接创建，保存真正做出来的东西 ---------------- */
const WORK_TYPES = ["作曲","编曲","录音","练耳成果","钢琴作品","DAW 项目","乐谱","音频","视频","创作笔记","演出","其他"];
const WORK_DIRS  = ["古典","爵士","流行","影视","游戏","中国传统","电子 / 实验","民谣","摇滚","R&B / 灵魂","其他"];
function pfWorks(){ if(!S.portfolioWorks) S.portfolioWorks=[]; return S.portfolioWorks; }
function renderPortfolio(){
  const items = pfWorks();
  const cards = items.map(p=>{
    const n = (p.contents||[]).length;
    return `<div class="pf-card" data-id="${p.id}">
      <div class="pf-em">${p.type==="录音"||p.type==="音频"?"🎧":p.type==="钢琴作品"?"🎹":p.type==="DAW 项目"?"💻":p.type==="练耳成果"?"👂":p.type==="视频"?"🎬":"🎵"}</div>
      <div class="pf-t">${p.title}</div>
      <div class="pf-m">${p.type} · ${p.dir||"未标注方向"} · ${p.date}</div>
      <div class="pf-n">${p.intro? p.intro : ""}</div>
      <div class="pf-c">${n} 项内容</div>
    </div>`;
  }).join("");
  $("view").innerHTML = `
    <div class="kicker">MY PORTFOLIO</div>
    <h1 class="section-title"><span class="em">📁</span>我的作品集</h1>
    <p class="lead">这里只放你真正做出来的东西——作曲、编曲、录音、练耳成果、乐谱、音频、视频、创作笔记。</p>
    <div class="pf-grid">
      <div class="pf-add" id="pf-add">
        <div class="pf-plus">+</div>
        <div class="pf-add-t">创建作品</div>
      </div>
      ${cards}
    </div>
    ${items.length?"":`<div class="empty-hint">还没有作品。点上面的 + 创建第一个。</div>`}`;
  $("pf-add").onclick=()=> openWorkForm();
  $("view").querySelectorAll(".pf-card").forEach(c=> c.onclick=()=> openWork(c.dataset.id));
}
function openWorkForm(){
  const today = new Date().toISOString().slice(0,10);
  modal(`
    <h3>➕ 创建新作品</h3>
    <div class="msub">填写基本信息，之后可以随时往里面添加乐谱、音频、笔记等内容。</div>
    <div class="panel" style="margin:0">
      <div class="fld"><label>作品名称</label><input id="wf-title" placeholder="例如：夜色练习曲 No.1"></div>
      <div class="fld"><label>类型</label><select id="wf-type">${WORK_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="fld"><label>创作方向</label><select id="wf-dir">${WORK_DIRS.map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="fld"><label>日期</label><input id="wf-date" type="date" value="${today}"></div>
      <div class="fld"><label>简介</label><textarea id="wf-intro" rows="3" placeholder="它是什么？你为什么做它？现在到哪一步了？"></textarea></div>
    </div>
    <div class="mrow" style="justify-content:flex-end;margin-top:14px">
      <button class="btn ghost" onclick="ML.closeM()">取消</button>
      <button class="btn gold" id="wf-go">创建</button>
    </div>`);
  $("wf-go").onclick=()=>{
    const t=($("wf-title").value||"").trim();
    if(!t){ toast("先给作品起个名字","✍️"); return; }
    const w={ id:"w"+Date.now(), title:t, type:$("wf-type").value, dir:$("wf-dir").value,
      date:$("wf-date").value||today, intro:($("wf-intro").value||"").trim(), contents:[] };
    pfWorks().unshift(w); save(); closeModal(); toast("作品已创建","📁"); openWork(w.id);
  };
}
function openWork(id){
  const w = pfWorks().find(x=>x.id===id);
  if(!w){ renderPortfolio(); return; }
  const items = (w.contents||[]).map(c=>`
    <div class="pf-item">
      <div class="pf-i-t">${c.kind} · ${c.title}</div>
      <div class="pf-i-c">${c.text||""}</div>
      <div class="pf-i-d">${c.date}</div>
    </div>`).join("");
  $("view").innerHTML = `
    <div class="kicker">${w.type} · ${w.dir}</div>
    <h1 class="section-title"><span class="em">📁</span>${w.title}</h1>
    <p class="lead">${w.intro? w.intro : "（还没有简介）"}</p>
    <div class="mrow">
      <button class="btn ghost sm" id="w-back">← 返回作品集</button>
      <button class="btn ghost sm" id="w-add">+ 添加内容</button>
      <button class="btn ghost sm" id="w-del">删除作品</button>
    </div>
    <div class="panel"><div class="sec-tag">作品内容</div>
      ${items || `<div class="empty-hint">还没有内容。点「+ 添加内容」记录你的乐谱、音频链接、创作笔记或练耳成果。</div>`}
    </div>`;
  $("w-back").onclick=renderPortfolio;
  $("w-add").onclick=()=>{
    const today = new Date().toISOString().slice(0,10);
    modal(`
      <h3>➕ 添加内容</h3>
      <div class="msub">记录你真正做出来的东西：一段乐谱、一个音频链接、一次练耳成绩、一条创作笔记。</div>
      <div class="panel" style="margin:0">
        <div class="fld"><label>内容类型</label><select id="wc-kind">
          ${["乐谱","音频","视频","创作笔记","DAW 项目","练耳成果","录音","演出记录","其他"].map(t=>`<option>${t}</option>`).join("")}
        </select></div>
        <div class="fld"><label>标题</label><input id="wc-title" placeholder="例如：A 段八小节定稿"></div>
        <div class="fld"><label>内容 / 链接 / 笔记</label><textarea id="wc-text" rows="4" placeholder="粘贴链接，或写下你的想法与过程"></textarea></div>
      </div>
      <div class="mrow" style="justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" onclick="ML.closeM()">取消</button>
        <button class="btn gold" id="wc-go">保存</button>
      </div>`);
    $("wc-go").onclick=()=>{
      const t=($("wc-title").value||"").trim();
      if(!t){ toast("先写个标题","✍️"); return; }
      w.contents = w.contents||[];
      w.contents.unshift({kind:$("wc-kind").value,title:t,text:($("wc-text").value||"").trim(),date:today});
      save(); addExp(10); closeModal(); toast("已保存 +10 EXP","💾","xp"); openWork(id);
    };
  };
  $("w-del").onclick=()=>{
    modal(`<h3>删除作品</h3><div class="msub">确定删除《${w.title}》？此操作不可撤销。</div>
      <div class="mrow" style="justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" onclick="ML.closeM()">取消</button>
        <button class="btn" id="wd-ok">确认删除</button></div>`);
    $("wd-ok").onclick=()=>{
      S.portfolioWorks = pfWorks().filter(x=>x.id!==id);
      save(); closeModal(); toast("已删除","🗑"); renderPortfolio();
    };
  };
}

/* ---------------- Events ---------------- */
function triggerEvent(){
  const ev = D.EVENTS[Math.floor(Math.random()*D.EVENTS.length)];
  const opts = ev.opts.map((o,i)=>{
    let ok=true, reason="";
    if(o.need){
      for(const k in o.need){
        const cat = {piano:"piano",theory:"theory",ear:"ear",prod:"prod",compose:"compose",perf:"perf",guitar:"perf",violin:"perf"}[k]||k;
        const val = k==="guitar"||k==="violin"||k==="sheng"||k==="xiao" ? (S.instruments[k]?S.instruments[k].level:0) : (S.skills[cat]||0);
        if(val < o.need[k]){ ok=false; reason=`需 ${skillName(k)} ≥ ${o.need[k]}`; }
      }
    }
    return `<button class="event-opt" data-i="${i}" ${ok?"":'data-lock="1"'}>
      <div class="eo-t">${o.t} ${ok?"":'🔒'}</div>
      <div style="font-size:11px;color:#9aa3b8;margin-top:3px">${ok?'可尝试':reason}</div>
    </button>`;
  }).join("");
  modal(`
    <h3>${ev.em} EVENT</h3>
    <div class="msub"><b>${ev.title}</b><br>${ev.desc}</div>
    <div class="mrow" style="flex-direction:column;align-items:stretch">${opts}</div>`);
  $("modal-layer").querySelectorAll(".event-opt").forEach(b=>{
    b.onclick=()=>{
      const o = ev.opts[+b.dataset.i];
      if(b.dataset.lock){
        const need=O=>{let r=[];for(const k in O.need)r.push(skillName(k)+"≥"+O.need[k]);return r.join("，");};
        toast("能力未达标："+need(o),"🔒"); return;
      }
      S.income += o.gold||0; if(o.gold>0) S.works = S.works; 
      if(o.exp) addExp(o.exp);
      if(o.rep) S.rep += o.rep;
      if(o.port){ S.works++; addPortfolio("event", o.port, "随机事件中获得", o.exp||0); }
      if(o.gold<0) toast("支出 ¥"+Math.abs(o.gold),"💸");
      else if(o.gold>0) toast("获得 ¥"+o.gold,"💰");
      S.eventsDone++; save(); renderShell();
      closeModal();
      modal(`<h3>${ev.em} 结果</h3><div class="msub">${o.ok}</div>
        <div class="mrow" style="justify-content:flex-end"><button class="btn" onclick="ML.closeM()">好的</button></div>`);
    };
  });
}
function skillName(k){
  return {piano:"钢琴",theory:"乐理",ear:"听觉",prod:"制作",compose:"作曲",perf:"演出",
    guitar:"吉他",violin:"小提琴",sheng:"笙",xiao:"箫"}[k]||k;
}

/* ---------------- Assessment (intro overlay) ---------------- */
function startAssessment(){
  modal(`<h3>🎧 音乐能力检测</h3>
    <div class="msub">系统通过互动测试判断你的真实水平，而不是让你自己填。约 3 分钟，请打开声音。</div>
    <div class="panel" style="margin:0">
      <div class="today-line"><span class="tm">①</span><span class="tx">👂 听觉：音程、和弦、调式</span></div>
      <div class="today-line"><span class="tm">②</span><span class="tx">🥁 节奏：听打节拍</span></div>
      <div class="today-line"><span class="tm">③</span><span class="tx">🎼 理论与创作自测</span></div>
    </div>
    <div class="mrow" style="justify-content:flex-end;margin-top:14px">
      <button class="btn ghost" onclick="ML.closeM()">稍后</button>
      <button class="btn gold" id="as-go">▶ 开始检测</button>
    </div>`);
  $("as-go").onclick = ()=> runAssessment();
}
function runAssessment(){
  let score = {interval:0,chord:0,mode:0,rhythm:0,theory:0};
  let total = {interval:3,chord:3,mode:3,rhythm:1,theory:3};
  let step = 0;
  const rootMidi = 60;
  function showStep(){
    if(step===0){ intervalQ(); }
    else if(step===1){ chordQ(); }
    else if(step===2){ modeQ(); }
    else if(step===3){ rhythmQ(); }
    else if(step===4){ theoryQ(); }
    else { finish(); }
  }
  function header(t,d){ return `<h3>${t}</h3><div class="msub">${d}</div>
    <div class="game-stage"><div class="big-play" id="a-play">🔊</div>
    <div id="a-q" style="margin:8px 0;color:#cbbfa6"></div>
    <div class="opt-grid" id="a-opts"></div></div>
    <div class="mrow" style="justify-content:flex-end"><button class="btn gold" id="a-next" style="display:none">下一步 →</button></div>`; }
  function mkOpt(label, correct){
    window.__lastCorrect = false;
    const b=document.createElement("button"); b.className="opt-btn"; b.textContent=label;
    b.onclick=()=>{ if(b.disabled) return;
      $("a-opts").querySelectorAll(".opt-btn").forEach(x=>x.disabled=true);
      window.__lastCorrect = correct;
      if(correct) b.classList.add("correct"); else { b.classList.add("wrong");
        $("a-opts").querySelectorAll(".opt-btn").forEach(x=>{ if(x.dataset.c==="1") x.classList.add("correct"); }); }
      $("a-next").style.display="inline-block";
    };
    if(correct) b.dataset.c="1";
    $("a-opts").appendChild(b);
  }
  // ① 音程 x3
  let sIdx=0;
  function intervalQ(){
    modal(header("① 听觉 · 音程","听两个音（低→高），判断音程。"));
    const ivs=D.ASSESS.intervals; const iv=ivs[Math.floor(Math.random()*ivs.length)];
    $("a-q").textContent=`第 ${sIdx+1}/3 题：判断音程`;
    $("a-play").onclick=()=> AE.interval(iv.semi, rootMidi, 0.45);
    const ch=[iv]; while(ch.length<4){const c=ivs[Math.floor(Math.random()*ivs.length)]; if(!ch.includes(c))ch.push(c);}
    shuffle(ch).forEach(c=> mkOpt(c.name, c.name===iv.name));
    $("a-next").onclick=()=>{ if(window.__lastCorrect) score.interval++; sIdx++; if(sIdx<3) intervalQ(); else { step=1; showStep(); } };
  }
  // ② 和弦 x3
  let cIdx=0;
  function chordQ(){
    modal(header("② 听觉 · 和弦","听和弦，判断性质。"));
    const chs=D.ASSESS.chords; const ch=chs[Math.floor(Math.random()*chs.length)];
    $("a-q").textContent=`第 ${cIdx+1}/3 题：判断和弦性质`;
    $("a-play").onclick=()=> AE.chord(ch.iv, rootMidi, 1.2);
    const ch2=[ch]; while(ch2.length<4){const c=chs[Math.floor(Math.random()*chs.length)]; if(!ch2.includes(c))ch2.push(c);}
    shuffle(ch2).forEach(c=> mkOpt(c.name, c.name===ch.name));
    $("a-next").onclick=()=>{ if(window.__lastCorrect) score.chord++; cIdx++; if(cIdx<3) chordQ(); else { step=2; showStep(); } };
  }
  // ③ 调式 x3（参考音乐学院视唱练耳题型）
  let mIdx=0;
  function modeQ(){
    modal(header("③ 听觉 · 调式判断","听一段音阶，判断它属于哪种调式。"));
    const q = EAR.makeQuestion("mode");
    $("a-q").textContent=`第 ${mIdx+1}/3 题：判断调式`;
    $("a-play").onclick=()=> q.play();
    q.options.forEach((label,i)=> mkOpt(label, i===q.answer));
    $("a-next").onclick=()=>{ if(window.__lastCorrect) score.mode++; mIdx++; if(mIdx<3) modeQ(); else { step=3; showStep(); } };
  }
  // ④ rhythm
  function rhythmQ(){
    modal(header("④ 节奏 · 听打","听一段 4 拍节奏，选择你听到的型态。"));
    const pats=[[1,0,1,1],[1,1,0,1],[1,0,1,0],[1,1,1,1]];
    const target=pats[Math.floor(Math.random()*pats.length)];
    $("a-q").textContent="听 4 拍，选择对应的节奏型（●=有音 ○=无）";
    $("a-play").onclick=()=> AE.rhythm(target, 90);
    const opts = pats.map(p=>{
      const label = p.map(x=>x?"●":"○").join(" ");
      return {label, correct: p.join()===target.join()};
    });
    opts.forEach(o=> mkOpt(o.label, o.correct));
    $("a-next").onclick=()=>{ if(window.__lastCorrect) score.rhythm++; step=4; showStep(); };
  }
  // ⑤ theory
  let tIdx=0;
  const tqs=[
    {q:"大三和弦由哪些音程构成？",o:["大三+小三","小三+大三","纯五"],a:0},
    {q:"C 大调的属七和弦根音是？",o:["C","G","F"],a:1},
    {q:"I–V–I 进行中，V 到 I 给人什么感觉？",o:["悬而未决","解决/回家","无变化"],a:1}
  ];
  function theoryQ(){
    modal(header("⑤ 乐理 / 创作自测", tqs[tIdx].q));
    $("a-q").textContent=`第 ${tIdx+1}/${tqs.length} 题`;
    tqs[tIdx].o.forEach((o,i)=> mkOpt(o, i===tqs[tIdx].a));
    $("a-next").onclick=()=>{ if(window.__lastCorrect) score.theory++; tIdx++; if(tIdx<tqs.length) theoryQ(); else { step=5; showStep(); } };
  }

  function finish(){
    const earAvg = (score.interval/3 + score.chord/3 + score.mode/3 + score.rhythm/1)/4;
    const ear = clamp(Math.round(earAvg*10),0,10);
    const theory = clamp(Math.round(score.theory/3*10),2,10);
    // talents give a boost
    const tboost = {piano:{piano:6},theory:{theory:6},ear:{ear:6},prod:{prod:5,compose:3},compose:{compose:6},perf:{perf:5}}[S.talent]||{};
    S.skills.ear = ear;
    S.skills.theory = theory;
    S.skills.piano = clamp((tboost.piano||4),0,10);
    S.skills.prod = clamp((tboost.prod||2),0,10);
    S.skills.compose = clamp((tboost.compose||3),0,10);
    S.skills.perf = clamp((tboost.perf||2),0,10);
    S.skills.theory = clamp(Math.max(S.skills.theory, tboost.theory||0),0,10);
    S.skills.ear = clamp(Math.max(S.skills.ear, tboost.ear||0),0,10);
    // initial portfolio note
    save();
    const ds = derivedSkills();
    const radar = ds.map(d=>({label:d.nm,val:d.v}));
    modal(`<h3>📊 你的音乐能力雷达</h3>
      <div class="msub">检测完成！系统已据此设定你的初始属性与起点技能树。</div>
      <div style="text-align:center"><canvas id="aradar" width="320" height="320"></canvas></div>
      <div class="panel" style="margin:10px 0">
        ${ds.map(d=>`<div class="skill-row"><div class="top"><span class="nm">${d.nm}</span><span class="vl">${Math.round(d.v)}/10</span></div>${stars(d.v)}</div>`).join("")}
      </div>
      <div class="mrow" style="justify-content:flex-end">
        <button class="btn gold" id="a-enter">🚪 进入我的音乐人生</button>
      </div>`);
    setTimeout(()=>{ const c=$("aradar"); if(c) drawRadar(c, radar); },50);
    $("a-enter").onclick=()=>{ closeModal(); toast("欢迎来到音乐人生！","🎉"); showView("home"); };
  }

  showStep();
}

/* ---------------- Boot ---------------- */
function buildIntro(){
  const avatars=["🎧","🎹","🎻","🎤","🎼","🪕","🎷","🌟"];
  $("avatar-pick").innerHTML = avatars.map((a,i)=>
    `<div class="avatar-opt ${i===0?'sel':''}" data-a="${a}"><span class="em">${a}</span><span class="nm">形象${i+1}</span></div>`).join("");
  const talents=[{k:"piano",em:"🎹",nm:"钢琴"},
    {k:"theory",em:"🎼",nm:"乐理"},{k:"ear",em:"👂",nm:"听觉"},
    {k:"prod",em:"💻",nm:"制作"},{k:"compose",em:"🎵",nm:"作曲"},{k:"perf",em:"🎤",nm:"演出"}];
  $("talent-pick").innerHTML = talents.map((t,i)=>
    `<div class="talent-opt ${i===0?'sel':''}" data-t="${t.k}"><span class="em">${t.em}</span><span class="nm">${t.nm}</span></div>`).join("");
  $("avatar-pick").querySelectorAll(".avatar-opt").forEach(o=> o.onclick=()=>{
    $("avatar-pick").querySelectorAll(".avatar-opt").forEach(x=>x.classList.remove("sel")); o.classList.add("sel"); });
  $("talent-pick").querySelectorAll(".talent-opt").forEach(o=> o.onclick=()=>{
    $("talent-pick").querySelectorAll(".talent-opt").forEach(x=>x.classList.remove("sel")); o.classList.add("sel"); });

  $("btn-start").onclick=()=>{
    AE.ensure();
    const name = ($("inp-name").value||"").trim() || "音乐人";
    S = defaultState();
    S.name = name.slice(0,12);
    S.avatar = ($("avatar-pick").querySelector(".sel")||{}).dataset?.a || "🎧";
    S.talent = ($("talent-pick").querySelector(".sel")||{}).dataset?.t || "piano";
    save();
    enterApp();
    startAssessment();
  };
}
function enterApp(){
  $("screen-intro").classList.remove("active");
  $("app").style.display="grid";
  window.__mlEntered = true; // 标记应用已进入；learn.js 挂载完进度函数后会据此刷新外壳
  renderShell(); buildNav(); buildTopMenu();
  showView("home");
}
function maybeIntro(){
  if(S && S.name && S.name!=="音乐人" && localStorage.getItem(SAVE_KEY)){
    // returning user with save
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if(saved && saved.name){ enterApp(); return; }
  }
  $("screen-intro").classList.add("active");
  buildIntro();
}

/* global helpers for inline onclick + module extension API */
window.ML = {
  closeM: closeModal,
  getState: ()=>S,
  save, renderShell, showView, buildNav,
  VIEWS, NAV,
  D, AE, toast, modal, stars, clamp, drawRadar, derivedSkills, addExp,
  titleForLevel
};

/* ---------------- Init ---------------- */
load();
maybeIntro();

$("btn-reset").onclick = ()=>{
  if(confirm("确定要重置存档、从头开始你的音乐人生吗？")){
    localStorage.removeItem(SAVE_KEY);
    S = defaultState();
    location.reload();
  }
};

})();
