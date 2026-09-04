/* ============================================================
   MUSIC LIFE · 编曲实验室 (67) + 配器实验室 (68)
   通过 window.ML 扩展 API 挂载到 LEARN 教学系统
   ============================================================ */
(function(){
const ML = window.ML;
const AE = ML.AE;
const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- 掌握度（复用 learn.js 暴露的存储结构） ---------- */
function mast(id){
  const S = ML.getState(); S.lessons = S.lessons || {};
  if(!S.lessons[id]) S.lessons[id] = {know:0,hear:0,play:0,apply:0,create:0};
  return S.lessons[id];
}
function overall(id){ const m=mast(id); return Math.round((m.know+m.hear+m.play+m.apply+m.create)/5); }
function bump(id,key,amt){ const m=mast(id); m[key]=clamp(m[key]+amt,0,100); ML.save(); }
function masteryBar(id){
  const m=mast(id);
  const row=(k,v)=>`<div class="skill-row"><div class="top"><span class="nm">${k}</span><span class="vl">${v}%</span></div><div class="xp-bar"><div class="xp-fill" style="width:${v}%"></div></div></div>`;
  return `<div style="margin:8px 0 2px">${row("KNOW",m.know)}${row("HEAR",m.hear)}${row("PLAY",m.play)}${row("APPLY",m.apply)}${row("CREATE",m.create)}</div>
    <div class="sub" style="margin-top:6px">Overall：<b style="color:var(--gold-bright)">${overall(id)}%</b></div>`;
}

/* ---------- 共享“种子”：同一段和声 + 旋律，用来对比不同编曲 ---------- */
const SEED = {
  chords:[{root:60,iv:[0,4,7]},{root:67,iv:[0,4,7]},{root:57,iv:[0,3,7]},{root:65,iv:[0,4,7]}],
  melody:[67,69,71,72,71,69,67,69]   // G A B C B A G A（C 大调）
};

/* 用 AE.tone 的绝对 when 调度（playMidi 只用 gap 顺序，不支持绝对时刻） */
function playPerf(notes){
  AE.ensure && AE.ensure();
  notes.forEach(n=> AE.tone(n.m, n.d||0.4, {when:n.when||0, type:n.type||"triangle", gain:(n.gain!=null?n.gain:0.7)}));
}

/* ---------- 编曲风格生成器：把种子渲染成不同“编曲” ---------- */
function arrangePerf(s){
  const notes=[]; let t=0; const beat=60/s.tempo; const barBeats=s.barBeats||4; const dur=beat*barBeats;
  s.chords.forEach((c,i)=>{
    let iv=c.iv.slice(); if(s.ext) iv.push(s.ext);
    // 和声层
    if(s.harmony==="pad"){
      iv.forEach(k=> notes.push({m:c.root+k+(s.reg||0),d:dur*0.96,when:t,type:s.wave,gain:0.42*(s.gain||1)}));
    } else if(s.harmony==="arp"){
      const step=dur/iv.length;
      iv.forEach((k,j)=> notes.push({m:c.root+k+(s.reg||0),d:step*0.9,when:t+j*step,type:s.wave,gain:0.5*(s.gain||1)}));
    } else if(s.harmony==="stab"){
      for(let b=0;b<barBeats;b++){ iv.forEach(k=> notes.push({m:c.root+k+(s.reg||0),d:beat*0.32,when:t+b*beat,type:s.wave,gain:0.45*(s.gain||1)})); }
    } else if(s.harmony==="strum"){
      iv.forEach((k,j)=> notes.push({m:c.root+k+(s.reg||0),d:dur*0.7,when:t+j*0.045,type:s.wave,gain:0.45*(s.gain||1)}));
    }
    // 低音层
    if(s.bass){
      const bw=s.bassWave||"sine"; const br=c.root+(s.bassReg!=null?s.bassReg:-12);
      notes.push({m:br,d:beat*0.95,when:t,type:bw,gain:0.7*(s.gain||1)});
      if(s.bassDouble) notes.push({m:br,d:beat*0.95,when:t+beat,type:bw,gain:0.7*(s.gain||1)});
    }
    // 旋律层
    if(s.melody){
      const m=SEED.melody[i%SEED.melody.length]+(s.reg||0);
      const md = s.swing? beat*0.66 : beat*0.82;
      notes.push({m,d:md,when:t,type:s.wave,gain:0.7*(s.gain||1)});
    }
    // 律动 / 打击层
    if(s.beat){
      const pat=s.beatPat||[1,0,1,0,1,0,1,0];
      for(let b=0;b<8;b++){ if(pat[b]){ const hi=s.beatHigh&&(b%4===0); notes.push({m:hi?50:36,d:beat*0.18,when:t+b*(beat/2),type:"sine",gain:0.9*(s.gain||1)}); } }
    }
    t+=dur;
  });
  notes.sort((a,b)=>(a.when||0)-(b.when||0));
  return notes;
}

/* ---------- 10 种编曲风格 ---------- */
const STYLES = [
  {id:"ballad",nm:"流行抒情 Ballad",em:"🎤",tempo:70,wave:"triangle",reg:0,harmony:"pad",bass:true,bassWave:"sine",bassReg:-12,melody:true,
    desc:"钢琴+弦乐长音垫底，慢速、大量留白，把空间留给‘人声旋律’。这是最常见也最容易被忽略的编曲思路：少即是多。"},
  {id:"rock",nm:"摇滚 Rock",em:"🎸",tempo:140,wave:"sawtooth",reg:0,harmony:"stab",bass:true,bassWave:"square",bassReg:-12,bassDouble:true,beat:true,beatPat:[1,0,1,0,1,0,1,0],
    desc:"失真锯齿波强力和弦（根+五度）+ 八分音符驱动鼓点 + 根音贝斯。能量高、推进感强，靠‘密度与速度’拉满情绪。"},
  {id:"edm",nm:"电子 EDM",em:"🔊",tempo:128,wave:"square",reg:12,harmony:"arp",bass:true,bassWave:"sine",bassReg:-24,beat:true,beatPat:[1,0,1,0,1,0,1,0],beatHigh:true,
    desc:"方波 pluck 琶音 + 四踩底鼓 + 极低音贝斯。律动机械、明亮、‘跳动’，是舞曲的能量来源。"},
  {id:"jazz",nm:"爵士 Jazz",em:"🎷",tempo:110,wave:"triangle",reg:0,harmony:"stab",ext:10,melody:true,swing:true,bass:true,bassWave:"sine",bassReg:-12,
    desc:"摇摆(swing)节奏 + 七和弦(instead of 三和弦) + 行走贝斯。松弛而复杂，靠‘和声色彩与节奏弹性’而非能量。"},
  {id:"classical",nm:"古典弦乐 Classical",em:"🎻",tempo:90,wave:"sine",reg:0,harmony:"pad",bass:true,bassWave:"sine",bassReg:-12,melody:true,
    desc:"持续正弦长音‘弦乐’+ 分解旋律，典雅、完全无鼓。靠‘音色纯净与线条’取胜。"},
  {id:"folk",nm:"民谣 Folk",em:"🪕",tempo:100,wave:"triangle",reg:0,harmony:"strum",bass:true,bassWave:"triangle",bassReg:-12,melody:true,
    desc:"尼龙吉他式扫弦 + 简单贝斯。朴素、亲切、无修饰，突出‘人声与歌词’。"},
  {id:"funk",nm:"放克 Funk",em:"🕺",tempo:115,wave:"sawtooth",reg:0,harmony:"stab",bass:true,bassWave:"square",bassReg:-12,beat:true,beatPat:[1,0,1,1,0,1,0,1],
    desc:"切分短促和弦 + 跳跃贝斯 + ghost 鼓点。groove 优先——音符少但‘卡在反拍上’才是灵魂。"},
  {id:"hiphop",nm:"嘻哈 Hip-Hop",em:"🎧",tempo:90,wave:"triangle",reg:0,harmony:"pad",bass:true,bassWave:"sine",bassReg:-12,beat:true,beatPat:[1,0,0,1,0,1,0,0],
    desc:"boom-bap 鼓(底鼓+军鼓错落) + 低频贝斯 + 暗色垫底，旋律大量留白。‘氛围与节奏’比旋律更重要。"},
  {id:"latin",nm:"拉丁 Latin",em:"🌴",tempo:120,wave:"square",reg:0,harmony:"arp",bass:true,bassWave:"triangle",bassReg:-12,beat:true,beatPat:[1,1,0,1,1,0,1,1],beatHigh:true,
    desc:"明亮方波琶音 + clave 节奏型 + 牛铃般高音。热情、切分、有‘跳舞的冲动’。"},
  {id:"ambient",nm:"氛围 Ambient",em:"🌌",tempo:60,wave:"sine",reg:0,harmony:"pad",bass:false,melody:false,
    desc:"极长持续音垫 + 几乎无节奏 + 高音区零星闪烁。催眠、空间感强，靠‘留白与音色’而非旋律。"}
];
const STYLE_BY_ID = {}; STYLES.forEach(s=> STYLE_BY_ID[s.id]=s);

/* ============================================================
   编曲实验室 HUB
   ============================================================ */
function renderArrangeHub(body){
  body.innerHTML = `
    <div class="panel">
      <div class="kicker">ARRANGEMENT LAB · 编曲实验室</div>
      <h2>🎚 同一段音乐，十种编曲</h2>
      <div class="sub">编曲 = 把同样的“和声 + 旋律”，用不同的 <b>乐器音色 / 织体密度 / 速度 / 音区 / 留白</b> 重新包装。<b>写歌靠动机，编曲决定它听起来像什么。</b>下面先用同一个种子，听 10 种风格的差别。</div>
    </div>
    <div class="panel">
      <h2>① 十种风格画廊（点开即听）</h2>
      <div class="sub">每个风格都用同一段 C–G–Am–F 进行 + 同一句旋律。请专注听：它用了什么音色？密还是疏？快还是慢？有没有鼓？</div>
      <div class="style-grid" id="style-grid"></div>
    </div>
    <div class="panel">
      <h2>② A / B 对比实验室</h2>
      <div class="sub">选一对对比强烈的风格，分别听 A 与 B，再回答“它们最大的差别来自哪里”。建立‘听感 → 编曲手段’的对应。</div>
      <div id="ab-box"></div>
    </div>
    <div class="panel">
      <h2>③ 应用挑战（Apply）</h2>
      <div class="sub">不看名字，只听特征，判断是哪种风格 / 哪种编曲手段。</div>
      <div id="arr-quiz"></div>
    </div>
    <div class="panel">
      <h2>📊 编曲掌握度</h2>
      ${masteryBar("arrange")}
    </div>`;

  // ① 画廊
  $("style-grid").innerHTML = STYLES.map(s=>`<div class="style-card" data-id="${s.id}">
    <div class="sc-em">${s.em}</div>
    <div class="sc-nm">${s.nm}</div>
    <div class="sc-desc">${s.desc}</div>
    <button class="btn sm gold sc-play">▶ 听这段编曲</button>
  </div>`).join("");
  $("style-grid").querySelectorAll(".style-card").forEach(c=>{
    const s = STYLE_BY_ID[c.dataset.id];
    c.querySelector(".sc-play").onclick = ()=>{
      playPerf(arrangePerf(s));
      bump("arrange","hear",6);
      ML.toast("正在播放："+s.nm,"🎚","xp");
    };
  });

  // ② A/B
  renderAB($("ab-box"), 0);

  // ③ quiz
  renderArrQuiz($("arr-quiz"));
}

/* ---------- A/B 对比 ---------- */
const CONTRASTS = [
  {a:"ballad",b:"rock",q:"抒情芭乐 vs 摇滚，给你的‘能量感’差别最大，主要来自？",
    ans:"更快的速度 + 强力和弦 + 持续鼓点把能量拉满",
    explain:"芭乐慢速、留白、突出人声；摇滚用快速度、强力和弦与持续鼓点把能量推满。差别主要在‘速度与织体密度’，而非音高。"},
  {a:"classical",b:"edm",q:"古典弦乐 vs 电子 EDM，最本质的不同在于？",
    ans:"音色（纯净正弦长音 vs 方波琶音）与律动（无鼓 vs 四踩）",
    explain:"两者都能很‘美’，但古典靠音色纯净与线条，EDM 靠机械律动与明亮方波。差别主要在‘音色与节奏型’。"},
  {a:"jazz",b:"funk",q:"爵士与放克都‘复杂摇摆’，听感差别主要来自？",
    ans:"节奏切分方式（摇摆三连感 vs 反拍短促切分）",
    explain:"爵士是松弛的 swing，放克是卡在反拍上的短促切分。同样复杂，但‘节奏的性格’完全不同。"},
  {a:"folk",b:"ambient",q:"民谣 vs 氛围，最明显的差别是？",
    ans:"氛围几乎无节奏、长音垫底、大量留白",
    explain:"民谣仍有清晰扫弦与拍点；氛围去掉了几乎所有节奏，靠长音与空间感。差别在‘节奏密度与留白’。"},
  {a:"hiphop",b:"latin",q:"嘻哈 vs 拉丁，差别主要来自？",
    ans:"节奏型（boom-bap 错落 vs clave 切分）与明亮感",
    explain:"嘻哈低频、暗色、慵懒；拉丁明亮、切分、有跳舞冲动。差别在‘节奏型与音色亮度’。"}
];
function renderAB(box, idx){
  const c = CONTRASTS[idx]; const sa = STYLE_BY_ID[c.a], sb = STYLE_BY_ID[c.b];
  box.innerHTML = `
    <div class="ab-cards">
      <div class="ab-card"><div class="ab-tag">A</div><div class="ab-em">${sa.em}</div><div class="ab-nm">${sa.nm}</div>
        <button class="btn sm" data-p="a">▶ 听 A</button></div>
      <div class="ab-vs">VS</div>
      <div class="ab-card"><div class="ab-tag b">B</div><div class="ab-em">${sb.em}</div><div class="ab-nm">${sb.nm}</div>
        <button class="btn sm" data-p="b">▶ 听 B</button></div>
    </div>
    <div class="feedback" id="ab-fb" style="margin-top:10px">先分别听 A 与 B，再回答下面的问题。</div>
    <div class="qt" style="margin-top:10px;color:#f3ead6">${c.q}</div>
    <div class="opt-grid" id="ab-opt"></div>
    <div class="mrow" style="margin-top:8px">
      <button class="btn ghost sm" id="ab-prev" ${idx===0?"disabled":""}>← 上一对</button>
      <button class="btn ghost sm" id="ab-next" ${idx===CONTRASTS.length-1?"disabled":""}>下一对 →</button>
    </div>`;
  box.querySelectorAll("[data-p]").forEach(btn=>{
    btn.onclick = ()=> playPerf(arrangePerf(btn.dataset.p==="a"?sa:sb));
  });
  const opts = [
    {t:c.ans, ok:true},
    {t:"只是音调高低不同（音区）", ok:false},
    {t:"只是旋律不同", ok:false}
  ];
  // 洗牌但保证正确项位置稳定显示
  $("ab-opt").innerHTML = opts.map((o,i)=>`<button class="opt-btn" data-i="${i}" data-ok="${o.ok}">${o.t}</button>`).join("");
  $("ab-opt").querySelectorAll(".opt-btn").forEach(b=> b.onclick=()=>{
    if(b.disabled) return;
    $("ab-opt").querySelectorAll(".opt-btn").forEach(x=>x.disabled=true);
    const ok = b.dataset.ok==="true";
    b.classList.add(ok?"correct":"wrong");
    if(!ok) $("ab-opt").querySelectorAll(".opt-btn").forEach(x=>{ if(x.dataset.ok==="true") x.classList.add("correct"); });
    const fb=$("ab-fb"); fb.className="feedback show";
    fb.innerHTML = (ok?"✓ 你抓住了关键维度！":"✗ 不是这个。") + "<br><b>讲解：</b>"+c.explain;
    bump("arrange", ok?"know":("know"), ok?14:4);
    bump("arrange","hear",4);
  });
  box.querySelector("#ab-prev").onclick = ()=> renderAB(box, idx-1);
  box.querySelector("#ab-next").onclick = ()=> renderAB(box, idx+1);
}

/* ---------- 应用挑战 quiz ---------- */
const ARR_QUIZ = [
  {q:"哪种编曲会用‘持续长音弦乐、几乎无鼓、慢速’来营造空间感？",opts:["氛围 Ambient","摇滚 Rock","电子 EDM","放克 Funk"],a:0},
  {q:"想让同一段和声‘能量拉满、有推进感’，最有效的编曲手段是？",opts:["加快速度 + 加鼓点 + 强力和弦","把旋律移高八度","换成纯正弦音色","去掉所有低音"],a:0},
  {q:"爵士听起来‘松弛复杂’，关键在于？",opts:["摇摆节奏 + 七和弦 + 行走贝斯","四踩底鼓 + 方波","大量留白无旋律","失真强力和弦"],a:0},
  {q:"放克的 groove 主要来自？",opts:["反拍上的短促切分","持续长音垫","快速琶音","高音区闪烁"],a:0}
];
function renderArrQuiz(box){
  let idx=0, correct=0;
  function render(){
    if(idx>=ARR_QUIZ.length){ finish(); return; }
    const q=ARR_QUIZ[idx];
    box.innerHTML = `<div class="quest-item" style="cursor:default"><div class="qem">${idx+1}</div>
      <div class="qbody"><div class="qt">${q.q}</div></div></div>
      <div class="opt-grid" id="q-opt"></div>
      <div class="feedback" id="q-fb"></div>
      <div class="mrow"><button class="btn ghost sm" id="q-next" style="display:none">下一题 →</button></div>`;
    $("q-opt").innerHTML = q.opts.map((o,i)=>`<button class="opt-btn" data-i="${i}">${o}</button>`).join("");
    $("q-opt").querySelectorAll(".opt-btn").forEach(b=> b.onclick=()=>{
      if(b.disabled) return;
      $("q-opt").querySelectorAll(".opt-btn").forEach(x=>x.disabled=true);
      const ok = +b.dataset.i===q.a;
      b.classList.add(ok?"correct":"wrong");
      if(!ok) $("q-opt").querySelectorAll(".opt-btn").forEach(x=>{ if(+x.dataset.i===q.a) x.classList.add("correct"); });
      const fb=$("q-fb"); fb.className="feedback show";
      fb.innerHTML = ok? "✓ 正确！":"✗ 再想想编曲手段与听感的对应。";
      if(ok){ correct++; bump("arrange","apply",12); bump("arrange","know",4); }
      $("q-next").style.display="inline-block";
    });
    $("q-next").onclick = ()=>{ idx++; render(); };
  }
  function finish(){
    box.innerHTML = `<div class="feedback show">🎉 编曲应用挑战完成！正确 ${correct}/${ARR_QUIZ.length}。${correct>=3?"你已能把‘听感’对应到具体编曲手段。":"多回去听听十种风格画廊，建立听觉词典。"}</div>`;
    bump("arrange","apply",8);
  }
  render();
}

/* ============================================================
   配器实验室 HUB（拖拽乐器到声部）
   ============================================================ */
const INSTRUMENTS = [
  {id:"strings",nm:"弦乐组",em:"🎻",wave:"sine",reg:0,gain:0.7,color:"#e8a0c0"},
  {id:"brass",nm:"铜管",em:"🎺",wave:"sawtooth",reg:-12,gain:0.7,color:"#f0a84b"},
  {id:"wood",nm:"木管",em:"🎶",wave:"triangle",reg:12,gain:0.6,color:"#9fd98a"},
  {id:"piano",nm:"钢琴",em:"🎹",wave:"triangle",reg:0,gain:0.85,color:"#c9d4e8"},
  {id:"synth",nm:"合成垫",em:"🌫",wave:"sine",reg:0,gain:0.6,color:"#8fb8ff"},
  {id:"bass",nm:"贝斯",em:"🎸",wave:"square",reg:-24,gain:0.85,color:"#caa06a"},
  {id:"perc",nm:"打击乐",em:"🥁",wave:"sine",reg:-36,gain:0.9,color:"#d98a8a"},
  {id:"vocal",nm:"人声垫",em:"🎤",wave:"triangle",reg:0,gain:0.6,color:"#d6a8e8"}
];
const INST_BY_ID = {}; INSTRUMENTS.forEach(i=> INST_BY_ID[i.id]=i);

/* 五个声部，各自决定“音符形态” */
const VOICES = {
  lead:{nm:"主旋律",desc:"旋律线条，中高音区、短促清晰",build(inst){
    const notes=[]; let t=0; const beat=0.5;
    SEED.melody.forEach(m=>{ notes.push({m:m+12+(inst.reg||0),d:beat*0.8,when:t,type:inst.wave,gain:0.7*(inst.gain||1)}); t+=beat; });
    return notes; }},
  harmony:{nm:"和声",desc:"填充和弦音，中音区",build(inst){
    const notes=[]; let t=0; const beat=0.5;
    SEED.chords.forEach(c=>{ c.iv.forEach(k=> notes.push({m:c.root+k+(inst.reg||0),d:beat*0.9,when:t,type:inst.wave,gain:0.4*(inst.gain||1)})); t+=beat; });
    return notes; }},
  bass:{nm:"低音",desc:"托底根音，低音区",build(inst){
    const notes=[]; let t=0; const beat=0.5;
    SEED.chords.forEach(c=>{ notes.push({m:c.root-12+(inst.reg||0),d:beat*0.95,when:t,type:inst.wave,gain:0.85*(inst.gain||1)}); t+=beat; });
    return notes; }},
  rhythm:{nm:"律动",desc:"短促敲击，节奏驱动",build(inst){
    const notes=[]; const beat=0.25;
    for(let i=0;i<16;i++){ if(i%2===0) notes.push({m:48+(inst.reg||0),d:beat*0.4,when:i*beat,type:inst.wave,gain:0.6*(inst.gain||1)}); }
    return notes; }},
  bed:{nm:"铺底",desc:"持续长音垫，营造空间",build(inst){
    const notes=[]; let t=0; const beat=0.5;
    SEED.chords.forEach(c=>{ c.iv.forEach(k=> notes.push({m:c.root+k+(inst.reg||0),d:beat*1.7,when:t,type:inst.wave,gain:0.32*(inst.gain||1)})); t+=beat; });
    return notes; }}
};
const VOICE_KEYS = Object.keys(VOICES);

/* 挑战：给定目标情绪/风格，评估配器方案 */
const ORCH_CHALLENGES = [
  {nm:"🎬 电影悬念感",hint:"用弦乐铺底营造紧张空间，低音托底，稀疏打击点缀；避免明亮方波与厚重铜管。",
    score(a){ let s=0; const r=[];
      if(a.bed==="strings"){s++;r.push("✅ 铺底用弦乐——很有电影感");} else if(a.bed){r.push("⚠️ 铺底建议换成弦乐（现在是"+INST_BY_ID[a.bed].nm+"）");} else r.push("⚠️ 缺少铺底，空间感不足");
      if(a.bass){s++;r.push("✅ 有低音托底");} else r.push("⚠️ 缺少低音");
      if(a.rhythm==="perc"){s++;r.push("✅ 用打击乐做稀疏点缀");}
      if(a.harmony==="brass"){r.push("⚠️ 和声用了厚重铜管，会偏‘辉煌’而非‘悬念’，可改弦乐/钢琴");} else if(a.harmony){s++;}
      return {s,max:4,r}; }},
  {nm:"☀️ 轻快明亮",hint:"用木管/钢琴做主旋律与分解和声，避免沉重铜管与过低音区。",
    score(a){ let s=0; const r=[];
      if(a.lead==="wood"||a.lead==="piano"){s++;r.push("✅ 主旋律用了明亮木管/钢琴");} else if(a.lead){r.push("⚠️ 主旋律建议用木管或钢琴（现在是"+INST_BY_ID[a.lead].nm+"）");} else r.push("⚠️ 缺少主旋律");
      if(a.harmony==="piano"||a.harmony==="wood"){s++;r.push("✅ 和声用钢琴/木管，轻盈");} else if(a.harmony==="brass"){r.push("⚠️ 铜管偏厚重，会压暗轻快感");}
      if(!a.bass||a.bass==="bass"){s++;r.push("✅ 低音克制");} 
      if(a.bed==="synth"||a.bed==="strings"){s++;r.push("✅ 铺底柔和");}
      return {s,max:4,r}; }},
  {nm:"🔥 热血摇滚",hint:"用锯齿波做强力和弦（铜管/合成），加上鼓点律动与贝斯。",
    score(a){ let s=0; const r=[];
      if(a.harmony==="brass"||a.harmony==="synth"){s++;r.push("✅ 和声用了锯齿波强力和弦感");} else if(a.harmony){r.push("⚠️ 和声建议用铜管/合成（锯齿波）而非"+INST_BY_ID[a.harmony].nm);} else r.push("⚠️ 缺少和声层");
      if(a.rhythm==="perc"){s++;r.push("✅ 有鼓点律动");} else r.push("⚠️ 缺少打击乐，能量不足");
      if(a.bass){s++;r.push("✅ 有贝斯托底");} else r.push("⚠️ 缺少贝斯");
      if(a.lead){s++;r.push("✅ 有主旋律线条");}
      return {s,max:4,r}; }}
];

function renderOrchLab(body){
  body.innerHTML = `
    <div class="panel">
      <div class="kicker">ORCHESTRATION LAB · 配器实验室</div>
      <h2>🎻 把乐器拖进声部，听织体变化</h2>
      <div class="sub">配器 = 决定“哪种乐器演奏哪个声部”。同一段和声，换成不同乐器组合，听感天差地别。<b>拖拽</b>乐器芯片到下方声部（移动端也可：先点乐器，再点声部）。每次改动都会实时重听织体。</div>
    </div>
    <div class="panel">
      <h2>乐器盘</h2>
      <div class="inst-palette" id="inst-palette"></div>
      <div class="lab-note">提示：先点一个乐器“拿起”，再点声部放下；或直接拖拽。</div>
    </div>
    <div class="panel">
      <h2>声部（把乐器放进来）</h2>
      <div class="orch-slots" id="orch-slots"></div>
      <div class="mrow" style="margin-top:10px">
        <button class="btn sm gold" id="orch-play">▶ 试听当前织体</button>
        <button class="btn ghost sm" id="orch-clear">清空所有</button>
      </div>
      <div class="feedback" id="orch-fb"></div>
    </div>
    <div class="panel">
      <h2>🎯 配器挑战</h2>
      <div class="sub">给定目标情绪，配出合适织体，再点“评估”。</div>
      <div id="orch-challenges"></div>
    </div>
    <div class="panel">
      <h2>📊 配器掌握度</h2>
      ${masteryBar("orch")}
    </div>`;

  const assign = {lead:null,harmony:null,bass:null,rhythm:null,bed:null};
  let held = null; // 点击拿起的乐器 id

  function paintPalette(){
    $("inst-palette").innerHTML = INSTRUMENTS.map(i=>`
      <div class="inst-chip ${held===i.id?"held":""}" draggable="true" data-id="${i.id}" style="--c:${i.color}">
        <span class="ic-em">${i.em}</span><span class="ic-nm">${i.nm}</span>
      </div>`).join("");
    $("inst-palette").querySelectorAll(".inst-chip").forEach(ch=>{
      const id=ch.dataset.id;
      ch.onclick = ()=>{ held = (held===id? null : id); paintPalette(); };
      ch.ondragstart = (e)=>{ e.dataTransfer.setData("text/plain", id); };
    });
  }

  function paintSlots(){
    $("orch-slots").innerHTML = VOICE_KEYS.map(k=>{
      const inst = assign[k]? INST_BY_ID[assign[k]] : null;
      return `<div class="slot ${inst?"filled":""}" data-v="${k}" style="${inst?("--c:"+inst.color):""}">
        <div class="slot-head">${VOICES[k].nm}</div>
        <div class="slot-desc">${VOICES[k].desc}</div>
        <div class="slot-inst">${inst? (inst.em+" "+inst.nm) : "（空）拖/点乐器放入"}</div>
      </div>`;
    }).join("");
    $("orch-slots").querySelectorAll(".slot").forEach(sl=>{
      const v=sl.dataset.v;
      sl.onclick = ()=>{
        if(held){ assign[v]=held; held=null; paintPalette(); paintSlots(); livePlay(); }
        else if(assign[v]){ assign[v]=null; paintSlots(); livePlay(); }
      };
      sl.ondragover = (e)=>{ e.preventDefault(); sl.classList.add("dragover"); };
      sl.ondragleave = ()=> sl.classList.remove("dragover");
      sl.ondrop = (e)=>{ e.preventDefault(); sl.classList.remove("dragover"); const id=e.dataTransfer.getData("text/plain"); if(id){ assign[v]=id; paintSlots(); livePlay(); } };
    });
  }

  function buildTexture(){
    let notes=[];
    VOICE_KEYS.forEach(v=>{ if(assign[v]){ notes = notes.concat(VOICES[v].build(INST_BY_ID[assign[v]])); } });
    notes.sort((a,b)=>(a.when||0)-(b.when||0));
    return notes;
  }
  function livePlay(){
    const n=buildTexture();
    if(!n.length){ return; }
    playPerf(n);
    const cnt=VOICE_KEYS.filter(v=>assign[v]).length;
    bump("orch","hear",3); bump("orch","play",2);
    const fb=$("orch-fb"); if(fb){ fb.className="feedback show"; fb.innerHTML="🔊 实时试听（已分配 "+cnt+"/5 个声部）。注意音色与音区叠加出来的‘厚度’变化。"; }
  }

  $("orch-play").onclick = ()=>{ const n=buildTexture(); if(!n.length){ ML.toast("先把乐器放进声部","🎻"); return; } playPerf(n); bump("orch","play",6); ML.toast("试听织体","🎻","xp"); };
  $("orch-clear").onclick = ()=>{ VOICE_KEYS.forEach(v=>assign[v]=null); held=null; paintPalette(); paintSlots(); const fb=$("orch-fb"); if(fb){fb.className="feedback";fb.innerHTML="";} };

  // 挑战
  $("orch-challenges").innerHTML = ORCH_CHALLENGES.map((c,i)=>`
    <div class="quest-item" style="cursor:default;margin-bottom:10px">
      <div class="qem">🎯</div>
      <div class="qbody">
        <div class="qt">${c.nm}</div>
        <div class="qd">${c.hint}</div>
        <div class="mrow" style="margin-top:6px"><button class="btn sm" data-c="${i}">评估我的配器</button></div>
        <div class="feedback" data-fb="${i}"></div>
      </div>
    </div>`).join("");
  $("orch-challenges").querySelectorAll("[data-c]").forEach(b=>{
    b.onclick = ()=>{
      const c = ORCH_CHALLENGES[+b.dataset.c];
      const res = c.score(assign);
      const fb = $("orch-challenges").querySelector(`[data-fb="${b.dataset.c}"]`);
      fb.className = "feedback show";
      fb.innerHTML = `评估 ${res.s}/${res.max}：<br>` + res.r.join("<br>") +
        (res.s>=3? "<br>🏆 很好的配器选择！": "<br>💡 按提示调整乐器与声部的对应，再试一次。");
      bump("orch","apply", res.s>=3?15:6); bump("orch","create", res.s>=3?10:3);
    };
  });

  paintPalette();
  paintSlots();
  // 默认给一个“电影感”起始方案，方便立刻听到
  assign.bed="strings"; assign.bass="bass"; assign.rhythm="perc"; assign.harmony="piano"; assign.lead="strings";
  paintSlots();
}

/* ============================================================
   Register 两个 Tab
   ============================================================ */
ML.registerLearnTab({id:"arrange",em:"🎚",nm:"编曲实验室"}, renderArrangeHub);
ML.registerLearnTab({id:"orch",em:"🎻",nm:"配器实验室"}, renderOrchLab);

})();
