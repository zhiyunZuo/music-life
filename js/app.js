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
    rep:0, income:0, works:0, performances:0,
    skills:{piano:3, theory:3, ear:3, prod:1, perf:2, compose:2},
    skillNodes:{}, quests:[], questDate:"", portfolio:[],
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
  {id:"mentor",em:"🤖",nm:"AI导师"},{id:"portfolio",em:"📁",nm:"作品集"}
];
let currentView = "home";
function buildNav(){
  $("botnav").innerHTML = NAV.map(n=>
    `<button class="nav-item" data-view="${n.id}"><span class="em">${n.em}</span>${n.nm}</button>`).join("");
  $("botnav").querySelectorAll(".nav-item").forEach(b=>{
    b.onclick = ()=>{
      const v = b.dataset.view;
      if(v==="mentor"){ openMentor(); return; }
      showView(v);
    };
  });
}
function buildTopMenu(){
  const items=[{t:"学习地图",v:"home"},{t:"练习",v:"practice"},{t:"作品",v:"portfolio"},{t:"舞台",v:"career"},{t:"AI导师",v:"mentor"}];
  const m=$("topmenu");
  if(!m) return;
  m.innerHTML = items.map(it=>`<a data-v="${it.v}">${it.t}</a>`).join("");
  m.querySelectorAll("a").forEach(a=> a.onclick=()=>{
    const v=a.dataset.v;
    if(v==="mentor"){ openMentor(); return; }
    showView(v);
  });
}
function showView(v){
  currentView = v;
  $("botnav").querySelectorAll(".nav-item").forEach(b=>
    b.classList.toggle("active", b.dataset.view===v));
  const tm=$("topmenu"); if(tm) tm.querySelectorAll("a").forEach(a=> a.classList.toggle("active", a.dataset.v===v));
  const fn = VIEWS[v]; if(fn) fn();
  $("view").scrollTop = 0;
}
function openMentor(){
  if(window.innerWidth <= 1080){
    // mobile: render mentor in center
    $("view").innerHTML = `<div class="section-title"><span class="em">🤖</span>AI 音乐导师</div>
      <div class="lead">随时提问任何音乐问题，导师会结合你的等级、练习与作品来回答。</div>
      <div id="m-mobile" style="height:62vh;display:flex;flex-direction:column"></div>`;
    buildMentor($("m-mobile"));
    $("botnav").querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view==="mentor"));
    currentView="mentor";
  } else {
    const r = $("col-right"); r.style.transition="box-shadow .3s"; r.style.boxShadow="0 0 0 2px var(--gold-bright)";
    r.scrollIntoView({behavior:"smooth"});
    setTimeout(()=> r.style.boxShadow="", 1200);
    const inp = r.querySelector(".mentor-input input");
    if(inp) inp.focus();
  }
}

/* ---------------- Mentor ---------------- */
function buildMentor(container){
  S.mentorLog = S.mentorLog || [];
  const log = S.mentorLog;
  if(log.length===0){
    log.push({role:"ai",text:"你好，"+S.name+"！我是你的 AI 音乐导师 🎓。你可以问我任何音乐问题——为什么这个和弦忧伤、怎么给旋律配和弦、不会即兴怎么办……我都会结合你现在的_level "+S.level+" 与练习来回答。"});
  }
  const chips = ["为什么这个和弦听起来忧伤？","我不会即兴怎么办？","怎么给这段旋律配和弦？","为什么我的编曲听起来很空？","今天的练习计划？"];
  container.innerHTML = `
    <div class="mentor-head"><span class="em">🎓</span>
      <div><div class="mt">AI MUSIC MENTOR</div><div class="ms">结合你的等级 · 练习 · 作品作答</div></div></div>
    <div class="mentor-body" id="m-body"></div>
    <div class="mentor-chips">${chips.map(c=>`<span class="mchip">${c}</span>`).join("")}</div>
    <div class="mentor-input"><input id="m-in" placeholder="问导师任何音乐问题…" />
      <button id="m-send">发送</button></div>`;
  const body = container.querySelector("#m-body");
  function paint(){
    body.innerHTML = log.slice(-30).map(m=>
      `<div class="msg ${m.role}"><div class="who">${m.role==="ai"?"🎓 导师":"🙂 你"}</div>${m.text}</div>`).join("");
    body.scrollTop = body.scrollHeight;
  }
  paint();
  function ask(text){
    text = text.trim(); if(!text) return;
    log.push({role:"me",text}); paint();
    container.querySelector("#m-in").value="";
    const typing = document.createElement("div");
    typing.className="typing"; typing.textContent="导师正在思考…"; body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    setTimeout(()=>{
      typing.remove();
      const ans = mentorAnswer(text);
      log.push({role:"ai",text:ans}); paint(); save();
    }, 520);
  }
  container.querySelector("#m-send").onclick = ()=> ask(container.querySelector("#m-in").value);
  container.querySelector("#m-in").onkeydown = e=>{ if(e.key==="Enter") ask(container.querySelector("#m-in").value); };
  container.querySelectorAll(".mchip").forEach(c=> c.onclick=()=> ask(c.textContent));
  window.ML.mentorAsk = ask;
  window.ML.mentorPaint = paint;
  window.ML._defaultChipsHTML = container.querySelector(".mentor-chips").innerHTML;
}

/* 让右侧 AI 导师绑定到当前选中的知识节点 */
function rebindMentorChips(box){
  box.querySelectorAll(".mchip").forEach(c=> c.onclick=()=>{ if(window.ML.mentorAsk) window.ML.mentorAsk(c.textContent); });
}
function mentorRecs(id){
  const map = {
    triad:["三和弦由哪几个音构成？","为什么三度堆叠最稳定？","在钢琴上怎么弹出 C 大三和弦？","给我一个听辨练习"],
    majmin:["为什么大三和弦听起来明亮？","小三和弦一般用在什么情绪里？","怎么在钢琴上构成小三和弦？","测试我是否真的听辨得出"],
    dom7:["属七和弦为什么想‘回家’？","听一次 G7 解决到 C","怎么构建属七和弦？","给我一个听辨练习"],
    secdom:["什么是副属和弦？","听一次 V/V 解决到 V","副属和弦在流行歌里怎么用？","测试我对离调的理解"],
    cadence:["终止式为什么像标点符号？","V→I 和 I→V 区别在哪？","写歌时怎么用半终止吊胃口？","测试我是否分得清"],
    fivescale:["五声音阶为什么‘怎么弹都和谐’？","五声音阶和七声大调区别？","在钢琴上弹出 C 五声","测试我的听觉"]
  };
  return map[id] || ["这个概念的核心是什么？","在钢琴上怎么弹？","给我一个听辨练习","测试我是否真的理解"];
}
function bindMentor(lessonId){
  const headMs = document.querySelector(".mentor-head .ms");
  const chipsBox = document.querySelector(".mentor-chips");
  if(!headMs || !chipsBox) return; // 导师尚未构建（如移动端未打开）→ 安全跳过
  S.mentorLog = S.mentorLog || [];
  const log = S.mentorLog;
  if(!lessonId){
    headMs.textContent = "结合你的等级 · 练习 · 作品作答";
    chipsBox.innerHTML = window.ML._defaultChipsHTML || "";
    rebindMentorChips(chipsBox);
    window.ML._mentorCtx = null;
    return;
  }
  const l = D.LESSONS.find(x=>x.id===lessonId); if(!l) return;
  headMs.textContent = "当前课程：" + l.title;
  const recs = mentorRecs(l.id);
  chipsBox.innerHTML = recs.map(c=>`<span class="mchip">${c}</span>`).join("");
  rebindMentorChips(chipsBox);
  if(window.ML._mentorCtx !== lessonId){
    window.ML._mentorCtx = lessonId;
    log.push({role:"ai", text:`你正在学习：「${l.title}」。` + (l.concept? l.concept.simple : "") + ` 有任何不懂的，点下面的推荐问题，或直接问我。`});
    if(window.ML.mentorPaint) window.ML.mentorPaint();
    save();
  }
}
function mentorAnswer(text){
  const t = text.toLowerCase();
  for(const item of D.MENTOR_KB){
    if(item.k.some(k=> text.includes(k) || t.includes(k.toLowerCase()))) return item.a;
  }
  // contextual fallback
  const ds = derivedSkills();
  const top = ds.slice().sort((a,b)=>b.v-a.v)[0];
  const weak = ds.slice().sort((a,b)=>a.v-b.v)[0];
  return `好问题。结合你现在 LV.${S.level}、最擅长「${top.nm}」、相对薄弱的是「${weak.nm}」，`+
    `我建议：先把基础概念弄清楚，再在对应区域（技能树 / 和声实验室 / 听力洞窟）里反复‘玩’出来。`+
    `你可以问我更具体的，例如某个和弦、某位作曲家、或你的练习安排。`;
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
function renderWorld(){
  const regions = D.REGIONS.map(r=>{
    const locked = S.level < r.unlock;
    return `<div class="region ${locked?'locked':''}" data-id="${r.id}" style="background:${r.grad}">
      ${locked?`<span class="rg-lk">🔒 LV.${r.unlock}</span>`:`<span class="rg-lk" style="color:#3ddc97">✓ 已解锁</span>`}
      <span class="rg-em">${r.em}</span>
      <div class="rg-nm">${r.nm}</div><div class="rg-ds">${r.ds}</div>
    </div>`;
  }).join("");
  $("view").innerHTML = `
    <div class="kicker">WORLD OF MUSIC</div>
    <h1 class="section-title"><span class="em">🗺</span>音乐世界地图</h1>
    <p class="lead">随着等级提升，更多区域逐渐解锁。点击已解锁区域前往对应的练习与试炼。</p>
    <div class="map-grid">${regions}</div>`;
  $("view").querySelectorAll(".region").forEach(r=>{
    r.onclick = ()=>{
      const id=r.dataset.id; const reg=D.REGIONS.find(x=>x.id===id);
      if(S.level < reg.unlock){ toast("尚未解锁，需 LV."+reg.unlock,"🔒"); return; }
      const map = {classical:"practice",harmony:"practice",earcave:"ear",proddist:"studio",
        guitar:"instruments",orchestra:"instruments",eastern:"instruments",stage:"practice",
        film:"compose",game:"compose",jazz:"practice",exp:"compose"};
      toast("前往 "+reg.nm,"🚪");
      showView(map[id]||"practice");
    };
  });
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
function renderInstruments(){
  const cards = D.INSTRUMENTS.map(i=>{
    const lv = S.instruments[i.id]?S.instruments[i.id].level:0;
    const det = S.instruments[i.id]&&S.instruments[i.id].detected;
    return `<div class="inst-card" data-id="${i.id}">
      <div class="iem">${i.em}</div>
      <div class="inm">${i.nm}</div>
      <div class="ild">${i.ds}</div>
      <div class="ilv">${det?("LV."+lv+" · "+i.mentor):"未检测 →"}</div>
    </div>`;
  }).join("");
  $("view").innerHTML = `
    <div class="kicker">INSTRUMENT ACADEMY</div>
    <h1 class="section-title"><span class="em">🎹</span>乐器学院</h1>
    <p class="lead">每种乐器都走“检测 → 学习 → 游戏 → 实战”。已会弹琴的人不会从“认识弦”重新开始。</p>
    <div class="inst-grid">${cards}</div>`;
  $("view").querySelectorAll(".inst-card").forEach(c=>{
    c.onclick=()=> openInstrument(c.dataset.id);
  });
}
function openInstrument(id){
  const i = D.INSTRUMENTS.find(x=>x.id===id);
  const inst = S.instruments[id];
  if(!inst.detected){
    // detection
    const qa = [
      {q:"你是否能认出它的基本音/弦？",o:["完全不会","大概知道","很熟悉"]},
      {q:"你是否做过基础练习（音阶/空弦/长音）？",o:["没练过","偶尔","系统练习"]},
      {q:"你能否演奏一首完整小品？",o:["不能","一点点","可以"]},
      {q:"你是否了解记谱/指法体系？",o:["不了解","知道一些","熟悉"]}
    ];
    modal(`
      <h3>🔍 检测你的${i.nm}水平</h3>
      <div class="msub">系统通过几个问题判断你的真实起点，从对应节点开始。</div>
      <div id="det-box"></div>
      <div class="mrow" style="justify-content:flex-end">
        <button class="btn ghost" onclick="ML.closeM()">取消</button>
        <button class="btn" id="det-go">开始检测</button>
      </div>`);
    let step=0;
    const box=$("det-box");
    function renderDet(){
      if(step<qa.length){
        box.innerHTML = `<div class="panel" style="margin:0">
          <div class="qt" style="color:#f3ead6;font-size:14px;margin-bottom:8px">${step+1}. ${qa[step].q}</div>
          ${qa[step].o.map((o,k)=>`<button class="event-opt" data-k="${k}" style="width:100%;margin-bottom:6px">${["🔴","🟡","🟢"][k]} ${o}</button>`).join("")}
        </div>`;
        box.querySelectorAll(".event-opt").forEach(b=> b.onclick=()=>{ step++; renderDet(); });
      } else {
        const lv = 3; // baseline derived; could randomize
        const level = 2 + Math.floor(Math.random()*3); // 2-4
        inst.detected=true; inst.level=level;
        S.skills[nodeCatFromInst(id)] = clamp(S.skills[nodeCatFromInst(id)] || level, 0, 10);
        addExp(30);
        save(); renderShell();
        box.innerHTML = `<div class="panel" style="margin:0;text-align:center">
          <div class="lu-em" style="font-size:54px">${i.em}</div>
          <h3 style="margin:8px 0">${i.nm} Level ${level}</h3>
          <div class="msub">检测完成！从对应节点开始你的${i.nm}之旅。导师：${i.mentor}</div>
          <button class="btn gold" id="det-ok">进入学习</button></div>`;
        $("det-ok").onclick=()=>{ closeModal(); renderInstruments(); toast(i.nm+" 检测完成 LV."+level,"✨"); };
      }
    }
    renderDet();
    $("det-go").onclick=()=>{ step=0; renderDet(); };
  } else {
    modal(`
      <h3>${i.em} ${i.nm} · LV.${inst.level}</h3>
      <div class="msub">导师：${i.mentor}。当前路线包含：基础 → 技术 → 乐曲 → 表现。</div>
      <div class="panel" style="margin:0">
        <div class="today-line"><span class="tm">L1</span><span class="tx">基础指法 / 音准</span></div>
        <div class="today-line"><span class="tm">L2</span><span class="tx">技术练习（音阶/弓法/和弦）</span></div>
        <div class="today-line"><span class="tm">L3</span><span class="tx">乐曲演奏</span></div>
        <div class="today-line"><span class="tm">L4+</span><span class="tx">音乐表现与风格</span></div>
      </div>
      <div class="mrow" style="justify-content:flex-end;margin-top:14px">
        <button class="btn ghost" onclick="ML.closeM()">关闭</button>
        <button class="btn gold" id="inst-prac">完成一次练习 (+25 EXP)</button>
      </div>`);
    $("inst-prac").onclick=()=>{ addExp(25); inst.level=clamp(inst.level+ (Math.random()>0.6?1:0),0,10);
      save(); renderShell(); closeModal(); toast(i.nm+" 练习完成","🎯","xp"); };
  }
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
function renderPortfolio(){
  const items = S.portfolio;
  const html = items.length? items.map(p=>`
    <div class="port-item">
      <div class="pem">${p.type==="compose"?"🎵":p.type==="studio"?"💻":p.type==="piano"?"🎹":p.type==="event"?"🎤":"🎼"}</div>
      <div class="pbody">
        <div class="pt">${p.title}</div>
        <div class="pm">📅 ${p.date} · ⏱ ${p.time} · +${p.exp} EXP</div>
        <div>${p.note?`<span class="tag">备注</span>${p.note}`:""}</div>
        ${p.ai?`<div class="pb">🎓 导师点评：${p.ai}</div>`:""}
      </div>
    </div>`).join("")
    : `<div class="empty-hint">还没有作品。去完成你的第一次创作、演出或接单，<br>这里会慢慢积累成一份真正的音乐人履历。</div>`;
  $("view").innerHTML = `
    <div class="kicker">MY PORTFOLIO</div>
    <h1 class="section-title"><span class="em">📁</span>我的作品集</h1>
    <p class="lead">记录人生中完成的一切：第一首作品、第一场演出、第一笔收入……最终形成你的音乐人履历。</p>
    <div class="panel">${html}</div>`;
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
  renderShell(); buildNav(); buildTopMenu(); buildMentor($("col-right"));
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
  openMentor, titleForLevel, bindMentor
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
