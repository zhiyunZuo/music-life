/* ============================================================
   MUSIC LIFE · 教学系统扩展模块（知识节点 → 完整教学）
   ============================================================ */
(function(){
const ML = window.ML;
const D = ML.D, AE = ML.AE;
const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- helpers ---------- */
const PC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function midiName(m){ return PC[m%12] + (Math.floor(m/12)-1); }
function playSpec(s){
  if(!s) return;
  if(s.type==="chord") AE.chord(s.iv, s.root, s.dur||1.2);
  else if(s.type==="seq") AE.playMidi(s.notes);
  else if(s.type==="prog"){
    let t=0; (s.chords||[]).forEach(c=>{
      (c.iv||[]).forEach(iv=> AE.tone((c.root||s.root)+iv, s.dur||0.8, {when:t}));
      t += (s.step||0.9);
    });
  }
}
function mastery(id){
  const S = ML.getState();
  S.lessons = S.lessons || {};
  if(!S.lessons[id]) S.lessons[id] = {know:0,hear:0,play:0,apply:0,create:0};
  return S.lessons[id];
}
function overall(id){
  const m = mastery(id);
  return Math.round((m.know+m.hear+m.play+m.apply+m.create)/5);
}
function bump(id, key, amt){
  const m = mastery(id); m[key] = clamp(m[key]+amt,0,100); ML.save();
}
function reqMet(lesson){
  if(!lesson.prereq || !lesson.prereq.length) return true;
  return lesson.prereq.every(p=> overall(p) >= 40);
}

/* ---------- 课程解析：真实课程 or 路线图节点（轻量合成课程） ----------
   所有节点（含原“路线图”节点）都可被课程页直接打开，不区分开放/未开放。 */
function synLesson(node){
  const c = (typeof NODE_CONTENT!=="undefined" && NODE_CONTENT[node.id]) || {};
  const desc = node.desc || node.blurb || node.zh;
  const simple = c.simple || desc;
  const pro = c.pro || simple;
  const realWork = c.realWork || "";
  return {
    id: node.id, title: node.zh, en: node.en, emoji: node.em,
    path: "探索方向", tier: "开放", synthetic: true,
    concept: { simple, pro, realWork, diagram: c.diagram || null },
    phenomenon: null, interact: null, practices: [], challenge: null,
    application: c.application || "",
    practice: c.practice || "",
    exampleAudio: c.audio || null,
    earDrill: (typeof EAR_DRILL_CFG!=="undefined" && EAR_DRILL_CFG[node.id]) || c.earDrill || null
  };
}
function resolveLesson(id){
  const real = D.LESSONS.find(x=>x.id===id);
  if(real) return real;
  const node = nodeById(id);
  if(node) return synLesson(node);
  return null;
}

/* ---------- 本地化：内部字段 → 中文 ---------- */
const TIER_CN = {Beginner:"入门", University:"进阶", Advanced:"高阶", Master:"大师"};
const PATH_CN = {"Harmony I":"基础和声", "Harmony II":"离调与副属", "Eastern":"东方音乐"};
function zhTier(t){ return TIER_CN[t]||t; }
function zhPath(p){ return PATH_CN[p]||p; }

/* ---------- virtual piano ---------- */
function buildPiano(container, onNote){
  const low=48, high=72;
  const whitePCs=[0,2,4,5,7,9,11], blackPCs=[1,3,6,8,10];
  let whites=[]; for(let m=low;m<=high;m++) if(whitePCs.includes(m%12)) whites.push(m);
  const nW=whites.length;
  let html='<div class="piano" style="--nw:'+nW+'">';
  whites.forEach((m,i)=>{ html+=`<div class="pkey w" data-m="${m}" style="left:${(i*100/nW).toFixed(3)}%;width:${(100/nW).toFixed(3)}%"></div>`; });
  let blacks=[]; for(let m=low;m<=high;m++) if(blackPCs.includes(m%12)) blacks.push(m);
  blacks.forEach(m=>{
    const cnt=whites.filter(w=>w<m).length;
    const left=cnt*100/nW;
    html+=`<div class="pkey b" data-m="${m}" style="left:calc(${left}% - ${(100/nW/2).toFixed(2)}%);width:${(100/nW*0.62).toFixed(2)}%"></div>`;
  });
  html+='</div>';
  container.innerHTML=html;
  container.querySelectorAll('.pkey').forEach(k=>{
    k.onclick=()=>{ const m=+k.dataset.m; AE.tone(m,0.6,{type:'triangle'});
      k.classList.add('hit'); setTimeout(()=>k.classList.remove('hit'),200);
      if(onNote) onNote(m,k); };
  });
  return { clear:()=>container.querySelectorAll('.pkey').forEach(k=>{k.classList.remove('hit');k.classList.remove('sel');}) };
}
function highlightChord(container, root, iv){
  container.querySelectorAll('.pkey').forEach(k=>{
    const m=+k.dataset.m; k.classList.toggle('sel', iv.includes(m-root));
  });
}

/* ---------- chord builder interaction ---------- */
function chordBuilder(container, target, hint, onResult, onSuccess){
  container.innerHTML = `
    <div class="lab-note">${hint||""}</div>
    <div class="piano-wrap cb-piano"></div>
    <div class="mrow">
      <button class="btn sm cb-check">✓ 检查</button>
      <button class="btn ghost sm cb-clear">清空</button>
      <button class="btn ghost sm cb-show">👁 看答案</button>
    </div>
    <div class="feedback cb-fb"></div>`;
  const sel = new Set();
  const pianoEl = container.querySelector(".cb-piano");
  const fb = container.querySelector(".cb-fb");
  const piano = buildPiano(pianoEl, (m,k)=>{
    if(sel.has(m)){ sel.delete(m); k.classList.remove('sel'); }
    else { sel.add(m); k.classList.add('sel'); }
  });
  container.querySelector(".cb-clear").onclick=()=>{ sel.clear(); piano.clear(); fb.className="feedback"; };
  container.querySelector(".cb-show").onclick=()=>{ const root=Math.min(...target); highlightChord(pianoEl, root, target.map(t=>t-root)); };
  container.querySelector(".cb-check").onclick=()=>{
    const got = Array.from(sel).sort((a,b)=>a-b);
    const tg = target.slice().sort((a,b)=>a-b);
    fb.className="feedback show";
    let ok=false;
    if(got.length===tg.length && got.every((v,i)=>v===tg[i])){
      ok=true;
      fb.innerHTML=`✓ <b>Correct!</b> 你构建的是 ${tg.map(midiName).join(" – ")}。`;
      if(onResult) onResult(true);
    } else {
      const wantNames = tg.map(midiName).join(" – ");
      const gotNames = got.length? got.map(midiName).join(" – ") : "（空）";
      fb.innerHTML = `✗ 还不完整。<br><b>你的答案：</b>${gotNames}<br><b>正确答案：</b>${wantNames}<br>
        <b>为什么？</b> 和弦要求这些音同时存在；少一个或错一个音，性质就变了（例如把 E 降到 E♭，C 大三和弦就变成了 C 小三和弦）。<br>再试一次 →`;
      if(onResult) onResult(false);
    }
    if(ok && onSuccess) onSuccess();
  };
}

/* ---------- draw simple staff ---------- */
function staffSVG(midis){
  const lines=[24,44,64,84,104];
  let s=`<svg viewBox="0 0 260 130" class="staff">`;
  lines.forEach(y=> s+=`<line x1="10" y1="${y}" x2="250" y2="${y}" stroke="rgba(243,234,214,.35)" stroke-width="1"/>`);
  midis.forEach((m,i)=>{
    const x=30+i*32; const y=clamp(120-(m-48)*4.6, 8, 120);
    s+=`<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="#f2c879" transform="rotate(-18 ${x} ${y})"/>`;
    if(y<lines[0]||y>lines[lines.length-1]) s+=`<line x1="${x-10}" y1="${y}" x2="${x+10}" y2="${y}" stroke="rgba(243,234,214,.5)" stroke-width="1"/>`;
  });
  s+=`</svg>`;
  return s;
}

/* ============================================================
   HUB
   ============================================================ */
const TABS = [
  {id:"map",em:"🗺",nm:"知识地图"},
  {id:"book",em:"📚",nm:"教材路径"},
  {id:"vocab",em:"🎨",nm:"音乐词典"}
];
const LEARN_RENDERERS = {};
let hubTab="map";
function renderLearnHub(){
  $("view").innerHTML = `
    <div class="kicker">TEACHING SYSTEM</div>
    <h1 class="section-title"><span class="em">📚</span>音乐教学系统</h1>
    <p class="lead">知识地图只是入口。点击任意知识节点，进入「听见现象 → 理解 → 看/听/弹 → 练习 → 应用 → 掌握度」的完整教学。</p>
    <div class="tabbar" id="learn-tabs"></div>
    <div id="learn-body"></div>`;
  const tabs=$("learn-tabs");
  tabs.innerHTML = TABS.map(t=>`<button class="tab ${t.id===hubTab?'active':''}" data-t="${t.id}"><span>${t.em}</span>${t.nm}</button>`).join("");
  tabs.querySelectorAll(".tab").forEach(b=> b.onclick=()=>{ hubTab=b.dataset.t; renderLearnHub(); });
  const body=$("learn-body");
  if(hubTab==="map"){ renderKnowledgeMap(body); }
  else if(hubTab==="book") renderTextbook(body);
  else if(hubTab==="lab") renderMusicLab(body);
  else if(hubTab==="feel") renderFeeling(body);
  else if(hubTab==="vocab") renderVocab(body);
  else if(hubTab==="improv") renderImprov(body);
  else if(hubTab==="compose") renderComposition(body);
  else if(LEARN_RENDERERS[hubTab]) LEARN_RENDERERS[hubTab](body);
}

/* ---------- Knowledge Map · 思维导图 ---------- */
/* ============================================================
   LIVING MUSIC MAP · 音乐能力宇宙
   一级领域（domains）是“音乐能力宇宙”的星系；每个领域下嵌套二级 / 三级节点。
   基础乐理不再作为独立课程，而是藏在领域内部作为「工具 / 前置」（tool）节点；
   真正的课程是以「听 → 弹 → 分析 → 修改 → 创造」为结构的实践任务（lesson）。
   所有一级 / 二级节点（含原“路线图”方向）都可被课程页直接打开，不区分开放 / 未开放；
   尚未深化的方向会打开一堂轻量课程（用节点自身说明作为讲解），随你自由探索。
   ============================================================ */
const DOMAINS = [
  { id:"piano", zh:"钢琴应用", en:"Piano Application", em:"🎹",
    blurb:"把钢琴技术直接变成音乐：伴奏型、弹唱、视奏、即兴伴奏。",
    children:[
      {id:"p-acc",zh:"伴奏型",en:"Accompaniment Patterns",em:"🎹",roadmap:true,desc:"分解 / 柱式 / 琶音 / Ostinato 等常用伴奏织体。"},
      {id:"p-sight",zh:"视奏",en:"Sight-reading",em:"📖",roadmap:true},
      {id:"p-pop",zh:"流行钢琴",en:"Pop Piano",em:"🎤",roadmap:true},
      {id:"p-impro",zh:"钢琴即兴伴奏",en:"Improv Accompaniment",em:"✨",roadmap:true}
    ]},
  { id:"harmony", zh:"和声", en:"Harmony Universe", em:"🎼",
    blurb:"从功能和声到现代和声——学会听、弹、分析、修改、创造。这是系统的核心脊柱。",
    children:[
      { id:"h-tool", zh:"基础功能和声（工具）", en:"Functional Harmony · Tools", em:"🧰", tool:true, children:[
        {id:"h-triad",zh:"三和弦",en:"Triad",em:"🔺",tool:true,lesson:"triad"},
        {id:"h-majmin",zh:"大 / 小三和弦",en:"Major / Minor",em:"🌗",tool:true,lesson:"majmin"},
        {id:"h-dom7",zh:"属七和弦",en:"Dominant 7th",em:"🔻",tool:true,lesson:"dom7"},
        {id:"h-cad",zh:"终止式",en:"Cadence",em:"🔚",tool:true,lesson:"cadence"}
      ]},
      {id:"h-conn",zh:"和弦连接 / 四部和声",en:"Voice Leading",em:"🔗",roadmap:true,desc:"声部平滑进行、避免平行五八度。"},
      {id:"h-secdom",zh:"副属和弦",en:"Secondary Dominant",em:"🧭",lesson:"secdom"},
      {id:"h-borrow",zh:"借用和弦（♭VII / ♭VI / ♭III）",en:"Modal Interchange",em:"🪞",roadmap:true,desc:"从关系调 / 平行调借用和弦，瞬间改变色彩（如 ♭VI 大三和弦）。"},
      {id:"h-extend",zh:"延伸和弦（9 / 11 / 13）",en:"Extended Chords",em:"🌟",roadmap:true,desc:"在七和弦上叠加九、十一、十三音，得到更柔和 / 更复杂的色彩。"},
      {id:"h-subst",zh:"替代和弦（三全音 / 五度）",en:"Substitution",em:"🔄",roadmap:true,desc:"用三全音替代或五度替代，让进行更顺滑或更出人意料。"},
      {id:"h-rhythm",zh:"和声节奏",en:"Harmonic Rhythm",em:"⏱",roadmap:true,desc:"和弦变换的快慢如何制造张力与呼吸。"},
      {id:"h-modal",zh:"调式 / 爵士和声",en:"Modal & Jazz Harmony",em:"🎷",roadmap:true,desc:"多利亚 / 混合利底亚等调式与 II-V-I 爵士语汇。"},
      {id:"h-modern",zh:"现代 / 电影和声",en:"Modern & Film",em:"🎬",roadmap:true},
      {id:"h-personal",zh:"个人和声语言",en:"Personal Language",em:"🖋",roadmap:true}
    ]},
  { id:"improv", zh:"即兴", en:"Improvisation", em:"🎤",
    blurb:"模仿 → 限制 → 动机 → 和声 → 节奏 → 旋律 → 调式 → 风格 → 自由。听觉 → 预判 → 反应 → 创造。",
    children:[
      {id:"im-mimic",zh:"模仿",en:"Imitation",em:"👂",roadmap:true},
      {id:"im-limit",zh:"限制条件即兴",en:"Constrained",em:"🚧",roadmap:true},
      {id:"im-motif",zh:"动机即兴",en:"Motivic",em:"💡",roadmap:true},
      {id:"im-harm",zh:"和声即兴",en:"Harmonic",em:"🎼",roadmap:true},
      {id:"im-mel",zh:"旋律即兴",en:"Melodic",em:"🎶",roadmap:true},
      {id:"im-free",zh:"自由即兴",en:"Free",em:"🌀",roadmap:true}
    ]},
  { id:"impropiano", zh:"即兴钢琴", en:"Improv Piano", em:"🎹",
    blurb:"为高水平钢琴手设计：不给基础，直接进入 Dm7 → G7 → Cmaj7 的层层进阶。",
    children:[
      {id:"ip-detect",zh:"水平自检",en:"Level Check",em:"📊",roadmap:true,desc:"检测你的钢琴水平，跳过基础。"},
      {id:"ip-adv",zh:"高级即兴路线",en:"Advanced Improv",em:"🚀",roadmap:true},
      {id:"ip-pianist",zh:"不会即兴的钢琴家",en:"Pianist Who Can't Improv",em:"🧗",roadmap:true,desc:"识别「技术强但缺实时音乐语言」，专项训练。"}
    ]},
  { id:"accomp", zh:"即兴伴奏", en:"Live Accompaniment", em:"🎤",
    blurb:"真实场景：听调性 → 判断和声 → 找和弦 → 跟随歌手 → 处理停顿 / 呼吸 / 变速 / 转调 / 唱错。",
    children:[
      {id:"ac-detect",zh:"听调性与和声",en:"Hear Key & Harmony",em:"👂",roadmap:true},
      {id:"ac-follow",zh:"跟随歌手",en:"Follow Singer",em:"🎙",roadmap:true},
      {id:"ac-emerg",zh:"突发情况模拟",en:"Emergencies",em:"⚡",roadmap:true,desc:"提前进入 / 延长 / 停顿 / 变速 / 升调 / 唱错。"}
    ]},
  { id:"compose", zh:"作曲", en:"Composition", em:"✍️",
    blurb:"动机 → 乐句 → 发展 → 对比 → 张力 → 高潮 → 结构 → 叙事。给限制、做分析，不直接代写。",
    children:[
      {id:"co-motif",zh:"动机与乐句",en:"Motif & Phrase",em:"💡",roadmap:true},
      {id:"co-dev",zh:"发展与变奏",en:"Development",em:"🔁",roadmap:true},
      {id:"co-form",zh:"曲式与结构",en:"Form",em:"🏛",roadmap:true},
      {id:"co-emotion",zh:"情绪与叙事",en:"Emotion & Narrative",em:"🎭",roadmap:true}
    ]},
  { id:"arrange", zh:"编曲", en:"Arrangement", em:"🎧",
    blurb:"一条旋律 → 和声 → Bass → 鼓 → Pad → Piano → Guitar → Strings → 对位 → 织体 → 结构 → 高潮。",
    children:[
      {id:"ar-mel",zh:"旋律与和声骨架",en:"Melody & Harmony",em:"🎼",roadmap:true},
      {id:"ar-groove",zh:"节奏与 Groove",en:"Groove",em:"🥁",roadmap:true},
      {id:"ar-texture",zh:"织体与配器决策",en:"Texture",em:"🎛",roadmap:true,desc:"为什么加这个乐器？为什么这里留白？"},
      {id:"ar-versions",zh:"同一旋律多种版本",en:"One Melody Many Arr.",em:"🔀",roadmap:true}
    ]},
  { id:"daw", zh:"DAW / 音乐制作", en:"Music Production", em:"💻",
    blurb:"从零做一首：工程 → MIDI → 量化 → 力度 → Bass → 鼓 → 合成 → 自动化 → EQ → 压缩 → 混响 → 混音 → 母带 → 导出。",
    children:[
      {id:"dw-setup",zh:"工程与 MIDI",en:"Project & MIDI",em:"🖥",roadmap:true},
      {id:"dw-edit",zh:"编辑 / 量化 / 力度",en:"Edit & Velocity",em:"✂️",roadmap:true},
      {id:"dw-mix",zh:"混音基础",en:"Mixing",em:"🎚",roadmap:true},
      {id:"dw-master",zh:"母带与导出",en:"Mastering",em:"📀",roadmap:true}
    ]},
  { id:"orch", zh:"配器", en:"Orchestration", em:"🎻",
    blurb:"木管 / 铜管 / 弦乐 / 打击 / 钢琴 / 吉他 / 民族 / 电子——试听、音域、音色、写法、组合。",
    children:[
      {id:"or-string",zh:"弦乐写法",en:"Strings",em:"🎻",roadmap:true},
      {id:"or-wood",zh:"木管写法",en:"Woodwinds",em:"🪈",roadmap:true},
      {id:"or-brass",zh:"铜管写法",en:"Brass",em:"🎺",roadmap:true},
      {id:"or-energy",zh:"能量曲线设计",en:"Energy Curve",em:"⚡",roadmap:true,desc:"从安静到宏大的配器进入顺序。"}
    ]},
  { id:"ear", zh:"练耳", en:"Ear Training", em:"👂",
    blurb:"音程 / 和弦 / 调式 / 和弦连接 听辨——参考音乐学院视唱练耳题型，建立「音 → 功能」的直觉。",
    children:[
      {id:"ear-int",zh:"音程听辨",en:"Intervals",em:"📏",roadmap:true},
      {id:"ear-chord",zh:"和弦与色彩听辨",en:"Chords",em:"🎼",roadmap:true},
      {id:"ear-mode",zh:"调式判断",en:"Modes",em:"🎭",roadmap:true},
      {id:"ear-prog",zh:"和弦连接 / 功能听辨",en:"Progressions",em:"🔁",roadmap:true}
    ]},
  { id:"analysis", zh:"音乐分析", en:"Analysis", em:"📖",
    blurb:"拆解真实作品：结构 → 调性 → 和声 → 旋律 → 节奏 → 编曲 → 声音 → 表达。",
    children:[
      {id:"an-deconstruct",zh:"真实作品拆解",en:"Deconstruct",em:"🔬",roadmap:true,desc:"九层拆解 + REBUILD 重新制作。"},
      {id:"an-form",zh:"曲式分析",en:"Formal",em:"🏛",roadmap:true},
      {id:"an-harm",zh:"和声分析",en:"Harmonic",em:"🎼",roadmap:true}
    ]},
  { id:"classical", zh:"古典音乐", en:"Classical", em:"🎼",
    blurb:"巴洛克 / 古典 / 浪漫 / 印象——不只是历史，而是学会每一种语言。",
    children:[
      {id:"cl-baroque",zh:"巴洛克",en:"Baroque",em:"⛪",roadmap:true},
      {id:"cl-classic",zh:"古典主义",en:"Classical",em:"🏛",roadmap:true},
      {id:"cl-rom",zh:"浪漫主义",en:"Romantic",em:"🌹",roadmap:true},
      {id:"cl-imp",zh:"印象主义",en:"Impressionism",em:"🌊",roadmap:true}
    ]},
  { id:"jazz", zh:"爵士", en:"Jazz", em:"🎷",
    blurb:"Swing / Blues / II-V-I / 音阶 / 替代 / 即兴——听、拆、模仿、融合。",
    children:[
      {id:"jz-blues",zh:"Blues",en:"Blues",em:"🎸",roadmap:true},
      {id:"jz-iivi",zh:"II-V-I",en:"II-V-I",em:"🔗",roadmap:true},
      {id:"jz-impro",zh:"爵士即兴",en:"Jazz Improv",em:"🎺",roadmap:true}
    ]},
  { id:"pop", zh:"流行音乐", en:"Pop", em:"🎤",
    blurb:"和弦进行 / 编曲 / 制作 / 人声 / 歌曲结构——做成能上口的音乐。",
    children:[
      {id:"pp-prog",zh:"流行进行",en:"Pop Progressions",em:"🔁",roadmap:true},
      {id:"pp-prod",zh:"流行制作",en:"Pop Production",em:"🎧",roadmap:true}
    ]},
  { id:"film", zh:"影视音乐", en:"Film Music", em:"🎬",
    blurb:"cue / 情绪 / 节奏对位 / 主题动机（Leitmotif）——为画面服务。",
    children:[
      {id:"fm-cue",zh:"Cue 与情绪",en:"Cue & Mood",em:"🎬",roadmap:true},
      {id:"fm-leit",zh:"主题动机",en:"Leitmotif",em:"🎯",roadmap:true}
    ]},
  { id:"game", zh:"游戏音乐", en:"Game Music", em:"🎮",
    blurb:"自适应音乐 / looping / 状态切换 / 互动配乐。",
    children:[
      {id:"gm-adapt",zh:"自适应音乐",en:"Adaptive",em:"🔄",roadmap:true},
      {id:"gm-loop",zh:"无缝 Loop",en:"Seamless Loop",em:"🔁",roadmap:true}
    ]},
  { id:"sound", zh:"音色与声音设计", en:"Sound Design", em:"🎛",
    blurb:"合成 / 采样 / 空间 / 效果——让声音成为表达的一部分。",
    children:[
      {id:"sd-synth",zh:"合成基础",en:"Synthesis",em:"🎛",roadmap:true},
      {id:"sd-space",zh:"空间与混响",en:"Space & Reverb",em:"🌌",roadmap:true}
    ]},
  { id:"mix", zh:"混音", en:"Mixing", em:"🎚",
    blurb:"平衡 / 声像 / EQ / 压缩 / 空间 / 自动化——让作品清楚且有冲击力。",
    children:[
      {id:"mx-balance",zh:"平衡与声像",en:"Balance & Pan",em:"🎚",roadmap:true},
      {id:"mx-fx",zh:"EQ / 压缩 / 空间",en:"EQ/Comp/Space",em:"🎛",roadmap:true}
    ]},
  { id:"master", zh:"母带", en:"Mastering", em:"📀",
    blurb:"最终响度 / 宽度 / 能量——交付级别的成品。",
    children:[
      {id:"ms-loud",zh:"响度与宽度",en:"Loudness & Width",em:"📀",roadmap:true}
    ]},
  { id:"guitar", zh:"吉他", en:"Guitar", em:"🎸",
    blurb:"和弦 / 扫弦 / 指弹 / 即兴 / 伴奏——流行与摇滚的核心。",
    children:[
      {id:"gt-chord",zh:"和弦与扫弦",en:"Chords & Strum",em:"🎸",roadmap:true},
      {id:"gt-impro",zh:"吉他即兴",en:"Guitar Improv",em:"🎶",roadmap:true}
    ]},
  { id:"violin", zh:"小提琴", en:"Violin", em:"🎻",
    blurb:"运弓 / 揉弦 / 双音 / 音色——旋律乐器的表达。",
    children:[
      {id:"vl-bow",zh:"运弓与揉弦",en:"Bow & Vibrato",em:"🎻",roadmap:true}
    ]},
  { id:"folk", zh:"民族乐器（笙 / 箫）", en:"Chinese Instruments", em:"🎵",
    blurb:"五声 / 调式 / 气声 / 留白——东方音乐的语言。",
    children:[
      {id:"fk-pent",zh:"五声调式",en:"Pentatonic",em:"🎋",lesson:"fivescale"},
      {id:"fk-mode",zh:"民族调式",en:"Folk Modes",em:"🎶",roadmap:true}
    ]},
  { id:"history", zh:"音乐史", en:"Music History", em:"📚",
    blurb:"不是年代背诵，而是理解每个时代「为什么这样写」。",
    children:[
      {id:"hi-era",zh:"时代与语境",en:"Eras",em:"📚",roadmap:true}
    ]},
  { id:"aesthetic", zh:"音乐审美", en:"Aesthetics", em:"🧠",
    blurb:"判断力：什么是好？为什么？建立自己的耳朵标准。",
    children:[
      {id:"ae-judge",zh:"审美判断",en:"Judgement",em:"🧠",roadmap:true}
    ]},
  { id:"expression", zh:"音乐表达", en:"Expression", em:"🎨",
    blurb:"把「孤独 / 温柔 / 紧张」拆成音域 / 速度 / 和声 / 节奏 / 密度 / 留白 / 音色，再自己选。",
    children:[
      {id:"ex-param",zh:"情绪 → 参数",en:"Emotion → Param",em:"🎨",roadmap:true},
      {id:"ex-lab",zh:"表达实验室",en:"Expression Lab",em:"🧪",roadmap:true}
    ]},
  { id:"style", zh:"风格研究", en:"Style Lab", em:"🎭",
    blurb:"听 → 拆 → 分析 → 模仿 → 改造 → 融合 → 创作。覆盖古典 / 爵士 / 流行 / 电子 / 民谣 / 游戏等。",
    children:[
      {id:"st-lab",zh:"风格实验室",en:"Style Lab",em:"🎭",roadmap:true},
      {id:"st-fuse",zh:"风格融合",en:"Fusion",em:"🔀",roadmap:true}
    ]}
];

/* ============================================================
   NODE_CONTENT · 每个知识点的真实教学内容
   字段：simple(知识讲解) / pro(专业解释) / realWork(音乐例子)
        / application(实际应用) / practice(小练习)
        / diagram(可看谱和弦 {root,iv}) / audio(可播放示例 playSpec)
   真实课程(triad/majmin/dom7/secdom/cadence/fivescale)只补 application/practice。
   ============================================================ */
const NODE_CONTENT = {
  "p-acc": {
    simple: "伴奏型是你用来托住旋律的固定音型，它决定一首歌的呼吸与能量：柱式和弦（几个音同时弹）稳重，分解和弦（依次弹）流动，琶音轻盈，Ostinato（固定音型循环）律动感强。学它的意义在于——绝大多数弹唱、现场、教会司琴都不是在弹独奏，而是在用合适的音型把旋律托住。选错音型比弹错音更致命：抒情的慢歌用密集琶音会显得慌张，快歌用柱式会显得笨重。",
    pro: "常见伴奏音型：① Block（柱式）——和弦音同时发声，适合颂歌、抒情高潮、节奏明确的流行；② Broken（分解）——按顺序依次弹奏和弦音，最通用的弹唱织体；③ Arpeggio（琶音）——跨越一个八度以上的上行或下行，营造流动与空灵；④ Alberti bass（阿尔贝蒂低音）——低–高–中–高的循环，古典时期左手的标准织体；⑤ Ostinato（固定音型）——两小节以内的固定节奏型反复循环，是 Latin、Gospel、电子舞曲的基础；⑥ Waltz（圆舞曲型）——低音在第 1 拍，和弦在第 2、3 拍。选择依据是速度、情绪与织体密度：速度越快音型应越简单，情绪越柔音型应越连贯。",
    realWork: "The Beatles《Let It Be》几乎全程柱式和弦，营造庄严与坚定；莫扎特钢琴奏鸣曲的阿尔贝蒂低音让左手既流动又不抢旋律；Gospel 音乐大量使用右手 Ostinato 制造循环推动力；Adele《Someone Like You》的钢琴是标准的分解和弦加延音踏板，简单却极有支撑力；久石让《Summer》用快速的十六分音符分解织体制造奔跑感。",
    application: "弹唱实操：① 先确定和弦进行，再选一个音型反复，不要每小节换花样；② 慢歌（60–80 BPM）用分解或琶音，中速（90–120）用八分音符分解，快歌（130+）用柱式或短 Ostinato；③ 乐句之间留白——人声吸气时你停一拍，比填满更有呼吸感；④ 人声唱长音时，在第 3、4 拍加一个上行或下行的 fill 音（和弦内音的连接），这是让伴奏「活起来」最省力的技巧；⑤ 段落切换时换音型——verse 用分解，chorus 换柱式，能量立刻提升一档。",
    practice: "用 C–Am–F–G 这个进行做三种音型对比：① 柱式——每和弦弹一次，四拍；② 八分音符分解——C E G E / A C E C / F A C A / G B D B；③ 琶音——C E G C（上行）后下行回来。各弹两遍，注意听：柱式最稳、分解最流动、琶音最轻盈。然后试着在每小节第 4 拍加一个 fill 音（例如 C 到 Am 之间加一个 B 音）。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "p-sight": {
    simple: "视奏是「第一次看到谱就能弹下来」的能力，它不要求弹得好，要求弹得不断。职业钢琴手与业余爱好者的分水岭往往就在这里：同样一首新歌，有人要练一周，有人十分钟就能跟下来。视奏的本质不是眼快，而是「预判」——眼睛永远比手提前一小节，并且你能在不看手的情况下找到位置。",
    pro: "视奏的技术要点：① 先扫谱十秒——看调号、拍号、速度、最高最低音、有无转调或反复，在脑中建立地图；② 眼睛始终领先手至少一个单位（一小节或一拍），手弹当前小节时眼睛已经在看下一小节；③ 不要看手——用键盘的空间记忆（黑键组作为坐标）定位；④ 优先保证节奏与低音线，旋律音可以省略或简化，宁可丢音不要停；⑤ 识别模式而非单个音符——看到分解和弦形状立刻识别为「C 分解」，而不是 C–E–G–C 四个音；⑥ 练习时用比舒适速度慢 30% 的速度，配合节拍器，每天十分钟。",
    realWork: "职业 session 钢琴手（录音室乐手）的核心能力就是视奏与即兴伴奏，他们常常在录音当天才拿到谱。古典领域，巴赫的众赞歌、莫扎特的奏鸣曲、以及各类视唱练耳教材（如《Hanon》《Beyer》）都是标准训练材料。爵士乐手的 Real Book（假想谱）只有旋律与和弦符号，视奏与即兴几乎是一回事。",
    application: "训练计划：① 每天十分钟，用比你能驾驭的简单一个等级的谱子（太难会养成停下来的习惯）；② 用节拍器设定一个你绝不会停的速度，宁慢勿断；③ 每次视奏只弹一遍，不回头改错——视奏训练的是「持续向前」；④ 建立「形状库」：把常见音型（音阶跑动、分解和弦、八度、三度）练成整体识别单位；⑤ 从四小节短句开始，逐步扩展到完整乐段。三个月每天十分钟，视奏能力会有质的变化。",
    practice: "找一个你从没弹过的简单谱子（或只用和弦符号）。设定节拍器 60 BPM，打开谱子先扫十秒：调号是什么、拍号是什么、最高音在哪、最低音在哪。然后开始弹，规则只有一条——绝对不能停。弹错继续往下走，右手跟不上就先保左手根音。弹完后记录：你在哪里卡住了？那个地方就是你需要补的模式。"
  },
  "p-pop": {
    simple: "流行钢琴的核心不是技巧难度，而是「用最少的音撑起一首歌」。流行钢琴手的日常工作是：拿到一首歌，快速判断调性与和声，选择织体，在正确的位置加装饰与 fill，并在段落之间做出层次变化。它要求的是判断力与稳定性，而不是跑动速度。很多古典出身的人弹流行反而僵硬，问题往往出在节奏感与留白，而不是手上的技术。",
    pro: "流行钢琴的四个技术支柱：① 和声快速定位——听到或看到旋律就能判断 I–V–vi–IV 之类的进行；② 织体层次——verse 稀疏（单音或简单分解）、pre-chorus 加密、chorus 饱满（八度或加厚和弦）；③ 节奏精准——流行音乐对节奏的要求远高于古典，尤其是与鼓组配合时的拍点；④ 装饰与 fill——在乐句尾音处加入经过音、邻音、五声跑动或八度填充。此外，流行钢琴大量使用延音踏板与和弦转位来减少手部跳动，让演奏看起来轻松。",
    realWork: "Elton John《Your Song》的钢琴前奏是分解和弦加旋律性低音的典范；Billy Joel《Piano Man》用口琴与钢琴的呼应建立酒吧氛围；Alicia Keys《Fallin'》把古典式的琶音织体与 R&B 节奏结合；周杰伦《安静》的钢琴是典型的流行 ballad 织体——左手分解、右手旋律加装饰音，副歌用八度加厚。",
    application: "把一首歌快速上手的标准流程：① 听三遍，第一遍找调性（最后一个和弦通常是主），第二遍找和声进行（用 I/V/vi/IV 试），第三遍找结构（verse/chorus/bridge 分别在哪）；② 定织体——verse 用分解，chorus 用柱式加八度；③ 加低音运动——不要让根音一直重复，尝试在低音上走 1–5–6–5 之类的线条；④ 加 fill——每个乐句结尾的空拍处加一个短的上行或下行；⑤ 最后处理层次——第二遍 verse 比第一遍多一层（加八度或加密节奏）。",
    practice: "挑一首你熟悉的流行歌，不用谱。① 先听出它的最后一个和弦，确定调性（假设是 C）；② 用 C、G、Am、F 四个和弦试着跟一遍主歌，不匹配的地方微调；③ 配上分解织体弹一遍；④ 在每句结尾的空拍加一个 fill 音。完成后你会发现——大多数流行歌真的只有四个和弦，差别全在织体与节奏。"
  },
  "p-impro": {
    simple: "钢琴即兴伴奏是「没有谱也能弹得像回事」的综合能力：听到一段旋律或一个人声，立刻判断调性与和声，选择合适的织体，在正确的位置加装饰，并随时准备应对变速、停顿与转调。它是前面所有能力的汇合点——和声判断、织体选择、位置感、听觉反应，缺一不可。好消息是，它可以通过固定的训练路径在几个月内建立起来。",
    pro: "即兴伴奏的技术构成：① 和声判断——通过旋律音与低音判断当前和弦，方法是看强拍音与长音（长音通常是和弦内音）；② 转位与 voicing——用转位让手在键盘上最小移动（C→Am 时把 C–E–G 变成 E–A–C，只动两个音）；③ 织体库——准备三到四种可随时调用的织体（柱式、八分分解、琶音、Ostinato）；④ 装饰系统——经过音、邻音、五声跑动、八度填充；⑤ 应急处理——歌手忘词或拖拍时持续循环当前和弦，歌手提前进入时立刻切到下一和弦，歌手转调时跟随其最后一个长音找到新调。",
    realWork: "教堂司琴（Gospel pianist）是即兴伴奏的极致——他们几乎不看谱，全靠听觉与人声配合。Elton John、Billy Joel 的现场演出大量即兴调整速度与织体。录音室 session 钢琴手更是需要在几分钟内为一段旋律找到合适的伴奏。华语方面，陈奕迅演唱会的钢琴伴奏常在间奏处即兴扩充和声色彩。",
    application: "六周训练路径：第 1–2 周，练熟五个常用调（C/G/D/A/F）的 I–V–vi–IV，配合柱式与分解两种织体；第 3 周，练转位连接，目标是从任何和弦到任何和弦，手移动不超过三度；第 4 周，练装饰——在每个乐句结尾加 fill，用五声音阶跑动；第 5 周，跟着真实的歌弹，允许错，但不允许停；第 6 周，故意制造意外——随机变速、随机停顿，训练应变。关键是第 5 周：必须跟真实的音乐练，而不是练习曲。",
    practice: "现在练最实用的一招——转位连接。右手弹 C 和弦的 E–G–C，接下来接 Am 时不要跳到 A–C–E，而是弹 E–A–C（Am 第一转位）：E 和 C 都不动，只有 G 移到 A。再接 F 时弹 C–F–A（F 第一转位）：C 不动，E 移到 F，A 保持。最后接 G 时弹 B–D–G。把 C–Am–F–G 用这套转位走一遍，手几乎不离开同一个键盘区域，声音却完全正确。"
  },
  "h-conn": {
    simple: "和弦连接关心的不是「用什么和弦」，而是「声部怎么走」。同样两个和弦，声部走得平滑就优美，跳来跳去就笨拙。核心原则是：能不动的音就不动，必须动的音走最小的距离。这背后的听觉原理是——人耳追踪的是线条，如果每个声部都是一条流畅的旋律，整体听起来就自然；如果声部各自乱跳，听起来就散。",
    pro: "四部和声（女高 S、女中 A、男高 T、男低 B）的基本法则：① 共同音保持在同一声部；② 其余声部作级进（二度）进行，避免不必要的跳进；③ 避免平行五度与平行八度——两声部同时以五度或八度同向移动会让声部独立性消失，音响变空；④ 避免隐伏五八度（两外声部同向跳进到达五度或八度）；⑤ 导音必须上行解决到主音，七音必须下行解决；⑥ 上三声部之间音距不超过八度。这些规则源于文艺复兴对位实践，是功能和声写作的技术基础。",
    realWork: "巴赫的四声部众赞歌（Chorale）是学习和弦连接最标准的教材——371 首，每首都是声部进行的范本。比如《Jesu, meine Freude》的开句，四个声部同时在唱歌，任何一声部单独拿出来都是完整旋律。爵士四重奏的 comping 也遵循同样逻辑：和弦voicing 的内声部级进移动，制造平滑的低音与内声部线条。",
    application: "钢琴上实践：① 左手弹根音，右手只弹和弦的三音与七音（如 C 的 E、G，换到 Am 时 E 保持不动，G 移到 A）——这就是最小移动的声部进行；② 练 C–Am–Dm–G 时，保持某些音不变，只移动必要的音；③ 弹唱伴奏时用转位减少手的跳动：C 用 C–E–G，接 Am 时改成 E–A–C（第一转位附近），手几乎不用移动。这个技巧叫「声部经济」，是流畅伴奏的关键。",
    practice: "右手弹 C 和弦的 E–G 两个音，左手弹 C 根音。接 Am 时：E 保持不动，G 移到 A，左手移到 A——只有两个音在动。再接 Dm：A 保持，E 移到 D，C 移到 F？注意这里要让移动最小，正确做法是右手保持 A、把上方的音移到 D。用这个方式把 C–Am–Dm–G 走一遍，听声部是否像几条平滑的线在移动。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[4,7]},{"root":57,"iv":[3,7]},{"root":62,"iv":[0,5]},{"root":55,"iv":[4,7]}],"step":1.1,"dur":1}
  },
  "h-borrow": {
    simple: "借用和弦是从「同主音的另一调式」借来和弦用。比如 C 大调里突然出现一个降 B 大三和弦（♭VII）或降 A 大三和弦（♭VI），它们不属于 C 大调，但听上去不别扭，反而特别有味道——因为它们来自 C 小调。这种手法能在瞬间改变色彩，从明亮切到苍凉，或者制造一种「豁然开朗」的英雄感，是现代流行与电影音乐最常用的色彩手段之一。",
    pro: "调式互换（modal interchange）指从同主音的平行调式借用和弦。C 大调可借用 C 小调的：♭III（E♭）、♭VI（A♭）、♭VII（B♭）、iv（Fm）。其中最常用的是 ♭VI 与 ♭VII：♭VI 含降 6 音，色彩苍凉开阔；♭VII 是混合利底亚的标志，带有摇滚的硬朗感。经典用法包括：I–♭VI–♭VII–I（英雄式上行）、I–♭VII–IV（混合利底亚摇滚进行）、vi–♭VI–V（悲壮的半音下行低音）。借用和弦不会破坏调性，因为它解决回主和弦时仍遵循功能逻辑。",
    realWork: "Queen《Bohemian Rhapsody》的『I see a little silhouetto of a man』处使用 ♭VI，瞬间把场景推入戏剧性；The Beatles《Something》的副歌用 ♭VII 制造开阔感；Coldplay《Clocks》的钢琴循环在 ♭VI 与 I 之间摇摆，形成标志性的忧郁色彩；电影《星球大战》主旋律配和声时大量使用 ♭VI 制造史诗感。",
    application: "在 C 大调上试这三组：① I–♭VI–♭VII–I（C–A♭–B♭–C），这是最常见也最好用的一组，适合副歌结尾推向高潮；② I–♭VII–IV–I（C–B♭–F–C），摇滚味道，适合前奏或间奏；③ vi–♭VI–V（Am–A♭–G），低音半音下行，悲壮而有力。使用时注意：借用和弦每首歌用一到两个就够，用多了调性会散。写法上，低音线条要清晰——借用和弦的魅力一半来自低音的半音或大跳进行。",
    practice: "在 C 大调弹 C–A♭–B♭–C（I–♭VI–♭VII–I），注意 A♭ 和 B♭ 是大三和弦而不是小三和弦——这正是借用小调之外的听觉冲击。然后弹 C–B♭–F–C，听摇滚感。最后把两组混起来：C–A♭–B♭–C 接 C–B♭–F–C，体会同样的主和弦被不同色彩和弦环绕时的情绪差异。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":56,"iv":[0,4,7]},{"root":58,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]}],"step":1,"dur":1}
  },
  "h-extend": {
    simple: "延伸和弦是在七和弦之上继续按三度叠加：九音、十一音、十三音。它们不改变和弦的功能，但显著改变色彩——同样是 C 和弦，Cmaj7 温柔，Cmaj9 更空灵，Cmaj13 则慵懒复杂。延伸音的意义在于给和声「加一层空气」：在抒情 ballad、爵士、R&B、City Pop 中，延伸和弦几乎是默认语言，去掉它们音乐立刻变得干硬。",
    pro: "九音（9）等于二度音的高八度，十一音（11）等于四度，十三音（13）等于六度。关键规则：① 十一音在大三和弦上会与三音形成小九度冲突（如 Cmaj11 的 F 与 E），因此大调十一和弦通常避免使用或改为 #11（升十一，即利底亚色彩）；② 属七和弦可自由叠加 9、13，甚至 b9、#9、b13 等变化音，这些变化音制造强烈张力，是爵士属和弦的核心；③ 十三和弦理论上含七个音，实际演奏会省略五音或十一音，只保留根、三、七与延伸音——这叫「取舍 voicing」。",
    realWork: "Stevie Wonder《Isn't She Lovely》大量使用 maj9 与 13 和弦，营造温暖明亮的色彩；Bill Evans 的爵士钢琴 voicing 几乎全由 9、13 构成，他极少弹完整的三和弦；日本 City Pop（如山下达郎）用 maj9、m11 制造都市的慵懒感。古典方面，德彪西《亚麻色头发的少女》全曲建立在九和弦与平行和弦之上，是印象主义和声的教科书。",
    application: "钢琴/键盘实践：① 把常用的 C–Am–F–G 全部升级为 Cmaj7–Am7–Fmaj7–G7，先习惯七和弦的柔和感；② 再升级为 Cmaj9–Am9–Fmaj9–G13，注意右手只弹 3、7、9、13 这几个音（省略根音与五音），因为根音交给左手；③ 爵士 voicing 口诀：「根音左手，色彩右手」——右手集中在 3–7–9–13 区间，声音立刻专业。创作时用延伸音增加层次，但注意：副歌高潮处往往回到简单三和弦更有力，延伸音适合 verse 与过门。",
    practice: "右手只弹 Cmaj7 的 E–B（三音与七音），左手弹 C。然后右手加 D（九音）变成 E–B–D，听色彩是否立刻开阔。用同样方式把 Am7 变成 Am9（G–C–B），Fmaj7 变成 Fmaj9（A–E–G），G7 变成 G13（B–F–E）。最后把四个和弦连起来弹一遍——这就是标准爵士 ballad 的声音。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[4,11,14]},{"root":57,"iv":[3,10,14]},{"root":53,"iv":[4,11,14]},{"root":55,"iv":[4,10,16]}],"step":1.1,"dur":1.1}
  },
  "h-subst": {
    simple: "替代和弦是用另一个和弦替换原本的和弦，让进行更顺滑或更出人意料。最著名的是三全音替代：G7 可以换成 D♭7，因为两者共享同一个三全音（B–F 与 F–B 其实是同一组音），所以它们有几乎相同的「想解决」的推力，但低音走了半音，听上去就高级得多。这是爵士的招牌手法，也是让流行进行摆脱俗套的捷径。",
    pro: "三全音替代（tritone substitution）：属七和弦 G7（G–B–D–F）与 D♭7（D♭–F–A♭–C♭）的三音与七音互换（B ≡ C♭，F ≡ F），构成同一个三全音。因此 D♭7 可替代 G7 解决到 C。经典进行 Dm7–D♭7–Cmaj7 的低音是 D–D♭–C，完美的半音下行，这是爵士最常见的终止式之一。另一种是五度替代（用上方五度的属和弦替代，如用 D7 替代 G7，构成 II–V 的循环），以及三级替代（用 iii 替代 I，制造柔和的悬停）。替代的判断标准是：替代和弦必须包含原和弦的关键张力音（三音与七音）。",
    realWork: "爵士标准曲《Autumn Leaves》的终止常用 D♭7 替代 G7；《Giant Steps》中 Coltrane 用三度循环的替代和弦制造和声的急速流转。流行方面，Stevie Wonder《Sir Duke》、Michael Jackson 的许多曲目在转调处使用替代和弦。电影配乐中，John Williams 常用三全音替代制造不安定感。",
    application: "把常用的 ii–V–I 改成 ii–♭II7–I：在 C 大调就是 Dm7–D♭7–Cmaj7，低音 D–D♭–C 半音下行，这是立刻能让伴奏听起来「很爵士」的一招。另一招：在 I–vi–ii–V 中把 V 换成 ♭II7（C–Am–Dm–D♭7），结尾的低音下行非常有说服力。注意替代和弦要用在解决点上，不要随便替换进行中间的和弦——它的价值在于制造低音的半音线条。",
    practice: "在 C 大调弹 Dm7–G7–Cmaj7，记住这个声音。然后弹 Dm7–D♭7–Cmaj7，注意低音从 D 到 D♭ 只差半音，听低音线条是不是像一条滑下去的线。最后比较两个版本的解决感——两者都解决到 C，但后者明显更「有设计感」。",
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":61,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]}],"step":1,"dur":1}
  },
  "h-rhythm": {
    simple: "和声节奏是「和弦变换的快慢」。同样四个和弦，每小节换一个和每两拍换一个，情绪完全不同：换得慢，音乐从容、宽广、有呼吸；换得快，音乐紧张、推动、不安。很多人的编曲听起来「平」，不是和弦选错了，而是和声节奏从头到尾没有变化——全程匀速，听众就没有起伏可抓。",
    pro: "和声节奏（harmonic rhythm）指和弦持续时值的组织方式。设计原则：① 段落开头通常放慢（两拍或一小节一个和弦），让听众建立调性；② 段落结尾放慢，给解决留出空间；③ 中段加快（一拍甚至半拍一个和弦），制造推动力；④ 高潮前的最后一个和弦拉长（延留），是最有效的张力手法。常见错误是把进行写得太密（每拍一个和弦），导致和声听不清、旋律被淹没。判断标准：如果听众记不住你的和声，通常就是换得太快了。",
    realWork: "Beethoven《命运交响曲》开头四个音就用一个和弦，极慢的和声节奏制造压迫感；而 Chopin 的夜曲左手分解和弦虽密集，但和声本身每小节只换一次，所以听起来流动而不杂乱。流行方面，Adele《Someone Like You》全曲钢琴每小节一个和弦，极简的和声节奏让旋律与人声完全占据中心；相反，Queen《Bohemian Rhapsody》的歌剧段落和弦密集变化，制造戏剧性的不安。",
    application: "编曲实操：① 先把整首歌的和声节奏设计为「慢—快—慢」的弧线，verse 慢（每小节 1–2 个和弦），pre-chorus 加快（每两拍一个），chorus 回到中速但更宽（让和声饱满），bridge 再变化；② 高潮前用一个长和弦（或只剩鼓与 pad）制造「吸气」的感觉；③ 弹唱伴奏时，人声长音处不要换和弦，让人声先呼吸完；④ 若想制造紧迫感，就在最后一小节把和声节奏加倍。",
    practice: "用 C–Am–F–G 四个和弦做三次实验：第一次每小节一个和弦（慢）；第二次每两拍一个（中）；第三次每拍一个（快）。分别弹一遍并体会：慢速版本听起来从容，快速版本听起来焦虑。然后在最后一遍的结尾，把 G 拉长到四拍不解决——这就是最基础的和声节奏设计练习。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":0.45,"dur":0.42}
  },
  "h-modal": {
    simple: "调式和声不再以「回家」为目标，而是以「色彩」为中心。多利亚小调听起来忧郁但不沉重（因为有自然大六度），混合利底亚听起来明亮但带点野性（因为有降七度）。爵士乐手在 ii–V–I 上使用多利亚、混合利底亚、伊奥尼亚等调式的音阶即兴，正是为了让旋律贴着每个和弦的色彩走，而不是用一个音阶通用全曲。",
    pro: "七个教会调式按亮度排列：利底亚（#4，最亮）、伊奥尼亚（大调）、混合利底亚（b7，属和弦的调式）、多利亚（b3、b6 但自然 6，小调中最亮）、爱奥利亚（自然小调）、弗里几亚（b2，阴郁，西班牙风）、洛克里亚（b2、b5，不稳定，少用）。爵士即兴的对应规则：ii 和弦用多利亚，V7 用混合利底亚（或变化音阶），Imaj7 用伊奥尼亚（或利底亚）。调式和声的写作要点：避免传统的 V–I 功能解决，改用平行和弦、持续低音（pedal point）与调式特征音的反复强调。",
    realWork: "Miles Davis《So What》是调式爵士的宣言——整曲只有 Dm 与 Ebm 两个多利亚和弦，靠 voicing 与旋律制造变化；Santana《Oye Como Va》用多利亚调式营造拉丁摇滚的标志性色彩。古典方面，德彪西《牧神午后前奏曲》用利底亚与全音阶彻底摆脱功能性。中国民乐《茉莉花》的旋律骨架则是五声调式的典型。",
    application: "实践路径：① 在钢琴上只用白键，分别以 D 为主音（多利亚）与 G 为主音（混合利底亚）弹音阶，听两种「同样白键、不同中心」的色彩差异；② 用 Dm7–G7 两和弦循环（不加 Cmaj7，避免功能解决），在多利亚与混合利底亚上即兴；③ 编曲时想制造「悬浮感」就用调式和声：不让和弦解决，而是平行移动。记住调式和声的敌人是 V–I——一旦解决，调式色彩就消失了。",
    practice: "左手持续弹 D 音作为 pedal（持续低音），右手在 D 多利亚音阶（D E F G A B C）上自由弹。然后左手保持不变，右手改用 D 自然小调（D E F G A B♭ C），听 b6 音带来的明显更暗的色彩。这一个小二度之差，就是多利亚与自然小调的全部区别。"
  },
  "h-modern": {
    simple: "现代电影与当代古典的和声不再依赖传统的「紧张—解决」，而是把和声当作色彩与情绪的直接工具：用不解决的悬置制造悬念，用平行移动制造流动，用极简的反复制造催眠感，用突然的半音变化制造惊吓。理解现代和声，关键是放弃「必须解决」的执念，转而问「这个音响本身给听众什么身体感受」。",
    pro: "现代和声的常用手法：① 平行和声（planing）——和弦整体平行移动，德彪西与电影配乐大量使用；② 四度叠置与二度音簇——摆脱三度堆叠，制造空旷或紧张；③ 极简主义（Minimalism）——短小音型反复并缓慢变化，Reich、Glass、Nyman 的语言，也是 Hans Zimmer 的基础；④ 悬置和弦（sus4、sus2）——不解决，制造开放与未定；⑤ 半音中音关系（chromatic mediant）——两个相隔三度且不同性质的和弦直接并置（如 C 与 E♭），是电影音乐制造「惊奇」与「升华」的标准手法；⑥ 泛音列启发的上行叠加。",
    realWork: "Hans Zimmer《Interstellar》的管风琴用极简的反复与缓慢的和声变化制造时间的压迫感；《Time》用循环的和声加上弦乐的层层叠加，是极简主义配乐的典范。John Williams《E.T.》用半音中音关系制造飞行的惊奇感。Philip Glass 的《Metamorphosis》是极简和声的纯粹展示。坂本龙一《Merry Christmas Mr. Lawrence》用五声与悬置和弦营造东方的留白。",
    application: "写作实操：① 想制造「悬念」时，用 sus4 和弦或只留根音与五音（去掉三音，大小不明）；② 想制造「升华」时，用半音中音关系——C 直接跳到 E♭ 或 A♭，不经过过渡；③ 想制造「推进」时，用极简音型反复并每隔四小节加一件乐器或提高八度；④ 想制造「时间感」时，把和声节奏放到极慢（每两小节一个和弦）。这些方法都不需要复杂和弦，关键是克制与层次。",
    practice: "用钢琴弹 C 与 E♭ 两个大三和弦，直接并置，不经过任何过渡和弦——听这个「跳」带来的惊奇感。然后试 C 到 A♭（半音中音关系的另一种）。最后把两个进行各重复四遍，每遍加一个八度上的音，体会「层次叠加」如何把同样的两个和弦推成高潮。这就是电影配乐最常用的能量累积法。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,7,16]},{"root":63,"iv":[0,7,16]},{"root":56,"iv":[0,7,16]}],"step":1.4,"dur":1.3}
  },
  "h-personal": {
    simple: "个人和声语言是你反复使用、别人一听就能认出的那套和声习惯。它可能是一个你特别偏爱的和弦（比如总是用 maj9），一种低音走向（比如总做半音下行），或一种解决的回避方式（比如永远不解决到主和弦）。建立它需要两步：先大量吸收，再刻意做减法——把常用的几十种手法收缩成三到五个你自己的签名动作。",
    pro: "建立个人和声语言的方法论：① 逆向工程——挑三到五位你最想靠近的作曲家/制作人，把他们作品的和声逐一扒出来，找出共同点；② 提取「签名动作」——例如 Bill Evans 的 3–7–9 voicing、Radiohead 的悬置与调式互换、坂本龙一的留白与五声；③ 强制限制——给自己设定规则（例如「本曲只用三个和弦」「禁止使用 V–I」「低音必须半音下行」），限制会逼出创意；④ 反复验证——把同一段旋律用你的签名手法重写五遍，直到它稳定；⑤ 最终做减法，保留最有效的三到五个手法，删掉其余。风格的本质是选择，而选择的本质是说不。",
    realWork: "Bill Evans 的标志是根音省略的 3–7–9 voicing 与内声部半音线条；Radiohead 的 Jonny Greenwood 常用调式互换与不解决的悬置；久石让偏好 I–V–vi–IV 的变体加上四度叠置的空灵色彩；坂本龙一则在极简反复与东方五声之间建立张力。四人风格迥异，但都可以被归纳为三到五个可描述的技术动作。",
    application: "三个月建立个人语言的练习计划：第 1 个月，每周扒一首你喜欢的歌的和声，记录它最打动你的那一个和弦或进行；第 2 个月，把你记录的进行全部转到你常用的调上，挑出出现频率最高的三种手法；第 3 个月，只用这三种手法写五首短曲（每首 16 小节）。完成后你会拥有一套可描述、可复现、带个人印记的和声工具箱。注意：不要追求「独特」，追求「一致」——一致听久了就是独特。",
    practice: "现在就做第一步：挑一首你最近单曲循环的歌，只用耳朵找出它的和声进行，写在纸上（不需要绝对准确）。然后标出其中最打动你的那一个和弦——它多半是借用和弦、延伸和弦，或者一个意外的替代。把这个和弦记下来，它就是你的个人和声语言的第一块砖。"
  },
  "im-mimic": {
    simple: "模仿（转录 / transcribe）是即兴能力增长最快的方式，没有之一。做法是把大师的一段独奏用耳朵扒下来，唱出来，在乐器上弹出来，然后分析它为什么这样。你扒下的每一句，都会变成你自己的语言库存。区别在于：学音阶只是拿到「字母表」，而扒句子拿到的是「词汇和语法」——你知道大师在什么和声上、什么节奏位置、用了什么手法。绝大多数即兴听起来「像练习」而不像音乐，正是因为只积累了音阶，没有积累句子。",
    pro: "转录的标准流程：① 选 4～8 小节、速度不要太快的独奏；② 先只跟唱，不看乐器，唱准为止；③ 判断和声框架（写出和弦符号）；④ 逐音扒出乐句，标注每个音相对和弦的性质（1/3/5/7/9/#11/13 还是 b9/#9 等变化音）；⑤ 归类手法：这是琶音？是音阶跑动？是 enclosure？是引句（quotation）？是动机重复？⑥ 移调到全部 12 个调；⑦ 把原句拆成零件，用自己的方式重组。关键判断标准是「这个音为什么在这里」——如果答案是「因为指型刚好在这里」，那就是没理解；如果答案是「因为它要半音解决到 G7 的 3 音」，那就是真学会了。",
    realWork: "Charlie Parker 的《Now's the Time》布鲁斯独奏被无数教材引用，第二小节那个下行 enclosure 落到 F7 的 3 音（A）是教科书级的目标音写法。Bill Evans 在《Autumn Leaves》中把一个简单的下行四音动机重复、移位、倒影，构成整段即兴的骨架。John Coltrane 在《Giant Steps》中用「Coltrane changes」（Bmaj7–D7–Gmaj7–B♭7–E♭maj7）的快速调性移动，乐句完全跟随调性中心跳跃，是「和声即兴」的极限范例。",
    application: "每周扒一句，具体操作：第 1 天只听与唱（至少唱 20 遍）；第 2 天在乐器上找到音；第 3 天写出和弦并标注每个音的性质；第 4 天移调到 3 个调；第 5 天用自己的节奏重组这个句子。选句原则：选你能唱下来的，不要选最快的。速度慢但音乐性强的句子（如 Miles Davis 的短句）比快速琶音更有学习价值，因为它逼你面对「音为什么在这」的问题。",
    practice: "扒《Now's the Time》主题旋律的前 4 小节（全部是四分与八分音符，无复杂和声）。步骤：① 不看谱跟唱到能背；② 在钢琴上弹出；③ 标出每个音相对 F 布鲁斯的和声性质；④ 移到 G 调与 B♭ 调各弹一遍。完成后你会拥有一句真实可用的布鲁斯语言。",
    audio: {"type":"seq","notes":[{"m":65,"d":0.3,"gap":0.32},{"m":67,"d":0.3,"gap":0.32},{"m":70,"d":0.3,"gap":0.32},{"m":69,"d":0.3,"gap":0.32},{"m":65,"d":0.6,"gap":0.62}]}
  },
  "im-limit": {
    simple: "给即兴加限制，是突破瓶颈最有效的手段。当你什么都能弹时，往往弹的是手指习惯而不是音乐；当你被迫只用两个音时，你必须用节奏、力度、空间来制造变化，反而会弹出真正有想法的东西。这不是玄学——限制把注意力从「弹什么音」转移到「怎么说这句话」，而后者才是音乐表达的核心。很多即兴高手的练习法都是自设限制：只用五声音阶、只用黑键、每句不超过 3 个音、全程只用四分音符。",
    pro: "有效的限制维度有五个：① 音高数量（只用 2～3 个音 / 只用五声 / 只用和弦音）；② 节奏（只用八分音符 / 每句必须留 2 拍空白 / 全程切分）；③ 方向（每句必须单向进行 / 必须做拱形）；④ 密度（每小节最多 4 个音 / 必须连续 16 分音符）；⑤ 时间（每个音区只能停留 4 小节）。技术要点：限制越严，越依赖节奏与 articulation 制造变化，这正是大多数人的短板。练习时建议一次只限一个维度，全部维度同时限制会导致无从下手。",
    realWork: "Miles Davis 在《Kind of Blue》中大量使用极其稀疏的短句与长休止，实质是「密度限制」的典范——他的句子常只有两三个音，但落点极准。Thelonious Monk 用大量不寻常的节奏位移与留白，把简单的音变成强烈的个人语言。Keith Jarrett 的慢速段落常长时间停留在同一音区做重复音型，靠力度与触键变化推进，是「音高限制 + 表达无限」的示范。",
    application: "三轮限制练习法：第 1 轮限制音高（在 Cmaj7–A7–Dm7–G7 上，每小节只允许用 3 个音，且必须包含当前和弦的 3 音）；第 2 轮限制节奏（每小节最多 4 个音，全部落在正拍，禁止弱起，体会留白）；第 3 轮限制方向（每句必须是一个不间断的上下行，感受长线条）。每轮 4 分钟，录下来对比：你会明显听出第 2 轮虽然音最少，却最有音乐性。",
    practice: "设定限制：在 Dm7–G7 两和弦循环上，每小节只允许弹 2 个音，连续 8 小节不许重复同样的节奏型。要求：两个音中必须有一个是和弦的 3 音或 7 音。做完后再允许自己弹 5 个音，你会发现「能弹很多音」反而变成了一种奢侈的选择。",
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]}],"step":1.1,"dur":0.9}
  },
  "im-motif": {
    simple: "动机即兴的核心，是用一个 2～4 音的「细胞」统整整段独奏。听者记住的不是你弹了多少音，而是那个反复出现的短小形状——它会变成你的签名。做法很简单：先想出一个短动机，然后在不同和弦上重复它、移高移低、倒过来、拉长、压缩。这样即使和声很复杂，听众也能感到「这是一个人在讲一个完整的故事」，而不是一串随机的音阶跑动。",
    pro: "动机发展的六种手法：重复（repetition，原样再来一次）、移位（sequence，整体移高或移低某个音程）、倒影（inversion，把上行变下行、音程距离不变）、逆行（retrograde，从尾弹到头）、扩展（augmentation，时值拉长或增加音符）、压缩（diminution，时值缩短或删减音符）。技术关键：动机必须包含明确的音程特征（如「小三度 + 大二度」），这样移位后仍能被认出；动机在和声变化时通常要做「调整」以保持与和弦吻合（把动机的某个音改成新和弦的特征音），这叫动机适配。不适配会显得「跑调」，过度适配会让动机消失。",
    realWork: "Beethoven 第五交响曲开头四个音（G-G-G-E♭）是全曲唯一的动机来源，后面所有主题都是它的移位、倒影与压缩——这是动机发展最著名的范例。Bill Evans 在《Autumn Leaves》中用一个下行的四音动机贯穿整段即兴，每次出现都微调以适配当前和弦。John Coltrane 在《Blue Train》主题中用短小的上下行动机做反复模进，是爵士里动机写作的教科书。",
    application: "练习顺序：① 定一个 3 音动机，例如 G–A–C（小二度 + 小三度）；② 原样重复一次；③ 移高纯五度变成 D–E–G；④ 做倒影变成 G–F–D；⑤ 扩展成 5 音 G–A–C–A–G；⑥ 压缩成两个 16 分音符快速重复。然后在 ii–V–I 上跑这六种形态，注意每次换和弦时把动机的落点音改成新和弦的 3 音或 7 音（动机适配）。最后完整录一段，检查动机是否清晰可辨。",
    practice: "动机定为 G–A–C。在 Dm7–G7–Cmaj7 上依次做：原样（G-A-C）、移高五度（D-E-G）、倒影（G-F-D）、扩展（G-A-C-A-G）。每个形态占一小节，四小节一轮，循环 4 轮。第 3 轮开始每句末尾留一拍空白。录音回听，让完全不懂音乐的朋友听——如果他也能哼出那个动机，说明你做到了。",
    audio: {"type":"seq","notes":[{"m":67,"d":0.3,"gap":0.32},{"m":69,"d":0.3,"gap":0.32},{"m":72,"d":0.4,"gap":0.42},{"m":62,"d":0.3,"gap":0.32},{"m":64,"d":0.3,"gap":0.32},{"m":67,"d":0.4,"gap":0.42}]}
  },
  "im-harm": {
    simple: "和声即兴，是让每一个音都「解释」当前正在响的和弦。它的核心是特征音：3 音决定大小，7 音决定是属七还是大七，9/11/13 提供色彩。当你在 Dm7 上弹 F（3 音）和 C（7 音），听者立刻听到小七的忧郁；弹到 G7 时换成 B（3 音）和 F（b7），紧张感立刻上升；解决到 Cmaj7 的 E（3 音）和 B（7 音），张力释放。和声即兴不追求音多，而追求每个转折点的音都落在能说明和声性质的位置上。",
    pro: "操作规则：① 骨架音优先——乐句的重拍（尤其每小节第 1 拍和第 3 拍）落和弦音，最好是 3 音或 7 音；② 弱拍填充——用经过音、邻近音、音阶音填满弱拍；③ 目标音思维——每个和弦的最后一音应导向下一个和弦的某个骨架音，最有效的是半音解决（G7 的 F → Cmaj7 的 E，或 G7 的 B → Cmaj7 的 C）；④ 变化音——属和弦上可用 b9/#9/b13 增加张力，但必须解决；⑤ 避免音——大七和弦上刻意避开 11 音（会与 3 音冲突），小七和弦上避开大六度（会产生多利亚误会，除非你要这个效果）。",
    realWork: "Charlie Parker《Confirmation》的和声每两拍一换，他的乐句以八分音符琶音贯穿，每次和弦变化都精确落在 3 音或 7 音上，是和声即兴的标准示范。Bill Evans 在《Blue in Green》中对每个和弦只挑 2～3 个特征音，用极简的骨架勾勒和声色彩。McCoy Tyner 在《Passion Dance》中用四度堆叠的和声即兴，把特征音替换成四度音程，形成完全不同的和声暗示。",
    application: "四步训练：① 在 ii–V–I 上只弹骨架音，找到最顺畅的一条声部进行（Dm7 的 F → G7 的 F → Cmaj7 的 E，注意 F 保持不动然后半音下行到 E，这就是最强的 voice leading）；② 加上 7 音（C → F → B）；③ 在每个和弦的最后一拍加一个半音邻近音导向下一个和弦的目标音；④ 最后才允许加入 9/13 等色彩音。每步都要先唱再弹。判断标准：关掉伴奏，单听你的旋律，能否听出和弦在变化？",
    practice: "在 Dm7–G7–Cmaj7 上，用「骨架 + 半音解决」弹 8 轮：Dm7 弹 F-C，G7 弹 F-B，Cmaj7 弹 E-B。然后加入半音邻近音：G7 前加 F#（解决到 F），Cmaj7 前加 F（解决到 E）。录下来，检查是否每个和弦切换处都能听出明确的音色变化。",
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]}],"step":1,"dur":0.9}
  },
  "im-mel": {
    simple: "旋律即兴关心的是「线条」，而不只是「音对不对」。一条好听的旋律有起伏方向、有高点、有呼吸、有张弛。最常见的毛病是音符平均分布、没有方向、没有高潮——听起来像练习曲。改善很简单：给每一句设定一个目标（这一句要走到全曲最高的那个音），然后围绕它设计上行路径；句子之间留空白，让上一句被消化；重复时做变化而不是照抄。",
    pro: "旋律构建的技术要素：① 轮廓（contour）——每句应有明确方向（上行 / 下行 / 拱形 / 反拱形）；② 高点（climax）——一个段落应有唯一最高音，通常出现在后 1/3 处，高点前后应有铺垫与回落；③ 呼吸（phrasing）——句与句之间留 1～2 拍或更多，留白本身是旋律的一部分；④ 张弛（tension & release）——通过音程大小（大跳 = 张力）、节奏密度（密集 = 张力）、和声紧张度（属和弦 = 张力）三者叠加或对比来控制；⑤ 重复与变化——重复动机建立识别度，第二句做变化（改结尾、改节奏、改音区）避免呆板。",
    realWork: "《Over the Rainbow》的主题是拱形轮廓的典范：第一句上行大跳到高点（八度跳进），随后级进回落，张弛一目了然。Charlie Parker 的句子常以长串八分音符推向高点，然后用长音收尾，是「密集 → 留白」的标准模型。Miles Davis 在《Freddie Freeloader》中的独奏以极简的短句与大量休止构成，靠留白制造张力。",
    application: "练习「一句一高点」：① 设定这一句要用 4 小节走到音区最高点；② 前两小节用级进铺垫（可以用重复音型），第 3 小节用跳进冲高；③ 高点后立刻留至少 2 拍空白；④ 下一句从低音区重新开始，形成对比。然后尝试「轮廓模仿」：选一首你喜欢的旋律，只保留它的轮廓（上行/下行/平的走向），换上自己的音，感受轮廓对可听性的影响。",
    practice: "在 Cmaj7–Am7–Dm7–G7 上，弹 4 句，每句 2 小节 + 2 拍休止。要求：第 1 句低音区拱形；第 2 句上行走向高点；第 3 句高点（全曲最高音，至少到 G5 以上）后立刻留 4 拍；第 4 句下行回落收尾。录音回听，检查是否能用手指在空中划出一条有起伏的线。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7,11]},{"root":57,"iv":[0,3,7,10]},{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]}],"step":0.9,"dur":0.8}
  },
  "im-free": {
    simple: "自由即兴是没有预设和声、没有预设曲式的即兴。它不是「随便弹」，恰恰相反——因为失去了和声这个外部骨架，你必须用别的东西来维持结构：动机、音色、空间、密度、能量曲线。自由即兴最容易犯的错是「持续输出」，弹满全程。真正的自由即兴靠对比活着：响与静、密与疏、高与低、紧张与松弛。当你不知道该弹什么时，最好的答案往往是停下来听。",
    pro: "自由即兴的结构手段：① 动机锚点——即使无和声，也要有一个反复出现的音程或音型作为身份标识；② 密度曲线——把 5 分钟设计成「疏 → 密 → 极密 → 突然静 → 缓起」的能量走向，而不是平铺；③ 音区规划——把高、中、低三个音区当作调色板，每次换音区都是一次结构事件；④ 时间感——在极慢（长音、留白）与极快（密集跑动）之间切换，速度对比比音高对比更有冲击力；⑤ 音色手段——在钢琴上可用踏板、触键、预置；在其他乐器上可用泛音、气声、弓压变化。判断标准：如果关掉声音看波形，能量是否有起伏？",
    realWork: "Keith Jarrett 的 solo concert 全部是自由即兴，他的核心手段是持续的左手音型（ostinato）提供隐形结构，右手在其上做密度变化。Cecil Taylor 用极高密度与 percussive 触键构建能量场。在流行语境中，Radiohead 的《Exit Music (For a Film)》结尾与大量 ambient 作品使用无和声的织体即兴，靠音色与空间推进。",
    application: "给自由即兴装一个「隐形骨架」：① 开始前先决定一个动机（2～3 个音）与一个能量曲线（例如 4 分钟：静 1 分钟 → 中层渐密 1 分钟 → 高点 30 秒 → 突然静默 20 秒 → 缓起收尾 1 分钟）；② 全程只用一个音区不超过 60 秒；③ 每次想不出下一句时，强制休止而不是继续弹；④ 结束后立刻回听，标记出能量曲线与你的计划是否一致。这个「先规划再即兴」的方式，是自由即兴从混乱走向表达的关键。",
    practice: "做一次 3 分钟自由即兴，唯一规则：全程只用 5 个音（例如 C-D-E-G-A，五声音阶），并且必须包含至少 3 次 4 秒以上的完全静默。录音后画出能量曲线（横轴时间，纵轴密度），检查是否有明显起伏。如果曲线是平的，说明你在持续输出而不是在表达。",
    audio: {"type":"chord","root":60,"iv":[0,2,4,7,9],"dur":2}
  },
  "ip-detect": {
    simple: "即兴钢琴的第一步不是练音阶，而是先弄清楚自己在键盘上的「盲区」在哪里。你可以在三十秒内自测：随便挑一个调（比如 E 大调），不看手能否直接弹出它的 I–IV–V？再挑一段你熟悉的旋律，能否不用试错就配出和弦？如果前者卡住了，你的问题在位置感；如果后者卡住了，问题在和声判断。定位清楚，才知道该练什么——大多数人的瓶颈都在这两处，而不是手指不够快。",
    pro: "三个快速自测维度：① 位置感——在十二个调上弹 I–IV–V，记录哪些调需要想（通常是带多个升号的 B、F#、C# 大调）；② 和声判断——听一段简单的流行歌，能否在两遍内说出它的进行；③ 织体执行——能否在听到「分解和弦」的描述后立刻在任意调上弹出来。三项都过，说明你具备即兴的基础条件，可以直接进入音阶与动机训练；任一项卡住，就先补那一项。注意：这不是等级考试，没有通过与否，只有「下一步该练什么」。",
    realWork: "职业爵士钢琴手在练习前也会做类似的自我诊断——Barry Harris 的教学体系就强调先确认学生在哪些调上真正「自由」，而不是假定所有调都一样熟练。许多古典出身的钢琴手在 C、G、D 上很稳，一到 Db、Gb 就完全失速，这正是位置感不完整的表现。",
    application: "用十分钟做完整自测：① 依次在 C、G、D、A、E、F、Bb、Eb、Ab、Db、Gb、B 十二个调上弹 I–IV–V，把卡住的调记下来（这是你的补强清单）；② 播放一首你熟悉的流行歌，暂停后说出它的和弦进行，重复三首；③ 任选一个调，用分解、柱式、琶音三种织体各弹一遍 I–V–vi–IV。三项做完，你就有了明确的训练重点——通常是从最卡的三个调开始，每天练十分钟。",
    practice: "现在就做：闭眼（或不看手），在 E 大调上直接弹出 E–A–B 三个和弦。如果你需要找一下位置，说明 E 大调是你的盲区——把它加入每日练习。然后试 Bb 大调（Bb–Eb–F）和 Db 大调（Db–Gb–Ab）。这三个调是流行与爵士中最常遇到的「困难调」，练熟它们，你的即兴自由度会立刻扩大一圈。"
  },
  "ip-adv": {
    simple: "高级即兴不再是「弹什么音」的问题，而是「怎么组织时间」的问题。到了这个阶段，你需要的不是更多音阶，而是：如何在一个和弦上发展完整的乐句（而不只是跑音阶）、如何在段落之间做出起伏、如何用节奏制造张力、以及最重要的——什么时候停下来。高级即兴的标志是听众能跟着你的句子呼吸，而不是被密集的音符淹没。",
    pro: "高级即兴的五个维度：① 动机发展——用 2–4 个音的细胞做重复、移位、倒影、逆行、扩展、压缩，让即兴有统一性；② 节奏位移——同一个乐句提前半拍或延后半拍进入，制造与律动的张力，这是比音符选择更有效的手段；③ 和声外音（side-slipping）——暂时在半音上方或下方的和弦上弹，再回到原和弦，制造「出走—回归」的效果；④ 密度与留白——把乐句设计成「密集—稀疏—密集」的呼吸曲线；⑤ 和声重配（reharmonization）——在即兴时临时替换和弦（如插入三全音替代或 ii–V），改变音乐的方向。这些手段的共同点是：它们都是结构性的，而不是音符性的。",
    realWork: "John Coltrane 的《Giant Steps》展示了极端的和声重配与调式循环；Bill Evans 的《Peace Piece》证明了留白与和声色彩比音符密度更有力量；Keith Jarrett 的独奏会用长达数分钟的时间只做动机发展与织体变化。McCoy Tyner 则用四度叠置与五声音阶的块状语汇建立了完全不同的即兴语言。",
    application: "练习路线（每条练两周）：① 动机发展——只用三个音，在 ii–V–I 上把这组音做重复、移位（移高五度）、倒影、扩展（变成五个音），共弹八个乐句；② 节奏位移——把同一个乐句分别放在正拍、反拍、提前半拍、延后半拍各弹一遍，体会节奏带来的变化；③ side-slipping——在 G7 上先弹半音上方的 Ab7 音型一小节，再回到 G7，制造张力；④ 留白训练——即兴时强制每两小节停一拍，坚持到它成为习惯；⑤ 重配练习——把 C–Am–Dm–G 改成 C–A7–Dm–G7（插入副属），立刻改变色彩。",
    practice: "做一个完整的动机发展练习：动机定为 G–A–C（三个音）。① 原样弹一遍；② 移高五度（D–E–G）弹一遍；③ 倒影（以 G 为轴，变成 G–F–D）弹一遍；④ 扩展成五个音（G–A–C–A–G）弹一遍；⑤ 缩成两个音（G–A）快速重复四遍。把这五种变化串成一个完整的八小节乐句。这就是专业即兴者脑子里真正在做的事——不是想音阶，而是变形机。"
  },
  "ip-pianist": {
    simple: "很多能把李斯特弹得飞快的人，一被要求「随便弹点什么」就完全僵住。这不是技术问题，而是训练路径造成的：传统的曲目训练只教「复现别人写好的东西」，从不训练「实时生成」。结果就是听觉与手指之间缺了一条直接的连线——你能读谱，却不能把听到的东西变成手上的动作。好消息是这条线可以补建，而且方法很明确。",
    pro: "症结与对策：① 症状——只能在有谱的情况下演奏，离开谱就不知道弹什么。对策：从「背奏」开始，把一首熟曲不看谱弹下来，再逐步改动它（换织体、换调）。② 症状——知道和弦名称但手指找不到。对策：练位置感，把 I–IV–V–vi 在十二个调上弹到不用想。③ 症状——弹出来的句子没有方向。对策：练动机发展，用 2–4 个音的细胞做变形，而不是跑音阶。④ 症状——弹得又快又密但不好听。对策：强制留白练习，每两小节停一拍。⑤ 症状——害怕弹错音。对策：先用五声音阶即兴，五声几乎不会出错，先建立「敢弹」的信心。这五个对策按顺序练，通常两到三个月能看到明显改变。",
    realWork: "许多古典钢琴专业的学生在爵士即兴课上会经历同样的困境——Jaén 音乐学院的即兴教学研究发现，古典训练者的主要障碍不是理论，而是「听觉—动作」的延迟。Keith Jarrett、Chick Corea 都是古典出身却成功转向即兴的例子，他们的共同经验是：先用大量时间模仿与转录（transcribe）大师的乐句，把这些句子内化成自己的语言，再开始自由即兴。",
    application: "给「不会即兴的钢琴手」的十二周方案：第 1–3 周，每天十分钟，在五个常用调上练 I–IV–V–vi 与 ii–V–I 的转位连接；第 4–6 周，每天转录（扒）两小节你喜欢的一段钢琴即兴，弹到能背下来；第 7–9 周，用五声音阶在简单的两和弦循环上自由弹，规则只有一个——不许停；第 10–12 周，在你熟悉的歌上做即兴伴奏，允许简单，但要求有留白与乐句感。关键在第 7 周：必须先建立「敢弹」，再谈「弹好」。",
    practice: "今天的一小步：放下所有谱子。在 C 大调上只用黑键（F# G# A# C# D#，即五声音阶）自由弹两分钟。规则只有两条：一、不许停；二、随便弹什么都可以。因为黑键之间怎么弹都不会难听，你不可能出错。这听起来简单，但对「害怕弹错」的人来说，这两分钟可能是最重要的一课——它让你第一次体验到「我在创造，而不是在复现」。"
  },
  "ac-detect": {
    simple: "听调性与和声，是指只用耳朵判断一首歌在哪一个调、每小节是什么和弦。这不是天赋，而是可以训练的反射。核心技巧有两个：一是听结束音（绝大多数歌曲最后一个音是主音），二是听低音走向（低音几乎总是和弦根音，跟着低音走就能抓到和弦）。配合首调听觉（把听到的旋律唱成 do re mi），你能在几十秒内锁定一首歌的调。",
    pro: "具体方法：① 定主音——听全曲最后一个和弦的根音，或旋律的结束音；② 判大小——听主和弦的 3 音是大三度（明亮）还是小三度（忧郁）；③ 抓低音——用耳朵追随最低声部，低音变化的地方就是和弦变化的地方；④ 用功能判断——C 大调中最常出现的四个和弦是 C（I）、Am（vi）、F（IV）、G（V），先在这四个里选；如果听到低音是 D 且色彩是小七，大概率是 Dm7（ii）；如果听到属七的紧张感（含三全音），就是 G7（V7）；⑤ 常见进行模式——I–V–vi–IV（万能进行）、vi–IV–I–V、I–vi–IV–V、ii–V–I（爵士）、I–♭VII–♭VI–♭VII（摇滚）。熟记这些模式后，判断速度会成倍提升。",
    realWork: "《Let It Be》是 I–V/vii–vi–IV（C–G/B–Am–F）的教科书；无数流行歌共用 I–V–vi–IV（如《Don't Stop Believin'》的副歌）。卡农进行 I–V–vi–iii–IV–I–IV–V 出现在从 Pachelbel 到现代流行的大量作品中。ii–V–I 是爵士的通用语法，几乎每首 standard 都充满它。",
    application: "训练阶梯：① 先只练「听主音」——放一首歌，跟唱到结束，然后唱出 do，用乐器验证；② 练「听大小调」——只判断明亮还是忧郁；③ 练「抓低音」——播放时只关注最低声部，用哼唱描出低音线；④ 练「四选一」——在 I / IV / V / vi 四个和弦里判断每个乐句是哪个（先不细分七和弦）；⑤ 最后加七和弦与离调。每天 10 分钟，坚持两周会有质变。关键：一定要唱出来，只靠内心听觉进展很慢。",
    practice: "用《Let It Be》前 8 小节：① 唱出主音（C）；② 跟着低音哼出 C–B–A–F 的下行线；③ 判断每小节和弦（C、G/B、Am、F...）；④ 用钢琴在 C 大调上弹出验证。然后换一首没听过的流行歌，限时 60 秒判断调与前 4 个和弦。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":59,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]}],"step":0.9,"dur":0.8}
  },
  "ac-follow": {
    simple: "跟随歌手，是伴奏最难也最重要的一环。歌手不是节拍器——他会拖、会抢、会临时加长某个音、会突然变轻。伴奏者的职责是让听众觉得「这首歌本来就该这样」，所以你必须跟着他的呼吸走，而不是照谱弹完。核心原则：气口留白（他换气时你填补或留空，不要抢），力度跟随（他轻你轻），情绪同步（副歌他上扬你也上扬）。",
    pro: "具体配合技术：① 呼吸同步——观察或预判歌手的吸气，在吸气处做填充（fill）或完全留白，切忌在歌手换气时加重；② 长音处理——歌手拖长音时，伴奏可以做渐强、加装饰音或上行的 filler 支撑，不要静止不动；③ 力度镜像——歌手 mp 时伴奏必须降到 p～mp，歌手 ff 时伴奏可到 mf（永远不要让伴奏超过人声）；④ 节奏弹性（rubato）——抒情段落歌手常做自由速度，伴奏要跟住他的速度变化，方法是听他的元音起点而不是预判拍点；⑤ 进入与收尾——前奏结束后给一个清晰的气口（休止或上行音阶）提示歌手进入，结尾处与歌手同时做渐慢（ritardando）。",
    realWork: "Elton John 为《Candle in the Wind》的伴奏在歌手长音处做上行琶音填充，是 filler 的经典用法。Nathan East 与众多录音室乐手在 ballad 中刻意把伴奏力度压到极低，让人声完全占据前景。在现场表演中，钢琴伴奏者常在歌手即兴延长时重复和弦循环（vamp），等待歌手给出下一个段落的信号。",
    application: "三步练习：① 无伴奏跟唱——只唱歌手的部分，找到他所有的换气点，在谱上标出来；② 只弹骨架——在换气点处强制留白，其余地方只弹根音 + 一个和弦音，感受「跟着呼吸」的感觉；③ 加 filler——只在超过 2 拍的长音或换气处加一句上行或下行的填充音，且力度不超过 mp。全程录音，检查：能否听到歌手每个换气点？伴奏有没有盖住人声？",
    practice: "选一首慢歌，做「留白练习」：全程只弹每小节第 1 拍的和弦（柱式，力度 p），其余全部休止。然后第二遍：只在歌手长音（超过 2 拍）后的半拍加一个轻柔的上行 filler。对比两遍，你会发现少弹反而更专业。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":1.2,"dur":1}
  },
  "ac-emerg": {
    simple: "现场伴奏一定会出意外：歌手提前进入、拖长、忘词、转调、突然结束、甚至唱错。应急能力不是靠运气，而是靠预先准备好的「处理套路」。核心思路是：无论发生什么，保持调性中心与速度框架不崩，然后用最简洁的手段把音乐带回轨道。慌乱的表现是突然停下或猛然加速——这两件事永远不要做。",
    pro: "常见突发情况与处理：① 歌手提前进入——立刻跳到最近的乐句起点或最近的 I 和弦，不要补完前奏；② 歌手延长某个音——进入 vamp（在当前和弦上循环，通常是 I 或 V），等他给出信号再继续；③ 歌手忘词/停顿——继续和声循环，加一个清晰的 filler 给他提示下一个入口；④ 临时转调——听他新唱的第一个音，判断相对原调的音程关系（常见是升 1～2 个半音或升全音），用 I 或 V 和弦接住，然后在新调上继续；⑤ 突然变速——跟住歌手，伴奏做简化（只弹根音），等稳定后再恢复织体；⑥ 突然结束——听到结束意图后，一起做 ritardando 并落到 I 和弦，必要时加一个终止式（IV–V–I 或直接 V–I）。通用原则：简化 > 复杂，稳定 > 花哨。",
    realWork: "现场演出中，伴奏乐手常用「vamp 等待」处理歌手的即兴延长——例如在一首歌的结尾反复弹奏 IV–V 直到歌手给出收尾信号。教堂与婚礼钢琴师经常需要在歌手进错拍时用 V 和弦「接住」并重新建立拍点。爵士乐手中，vamp 与 turnaround 是标准应急语言，几乎所有 standard 的结尾都可以无限循环 turnaround 等待结束信号。",
    application: "准备你的应急工具箱（4 个必备）：① 一个可无限循环的和声 vamp（如 I–vi 或 I–V/vii）；② 一个通用终止式（IV–V–I，可在任何时刻收尾）；③ 一个转调接法（听新音 → 当作新调的 5 音或 1 音 → 用 I 或 V 接住）；④ 一个简化模式（只弹根音 + 3 音，任何织体都可瞬间降到此模式）。练法：让朋友随机喊「停 / 延长 / 快一点 / 升一个调」，你在伴奏中立刻响应，每次都保持音乐不中断。",
    practice: "边弹《Let It Be》伴奏，边让朋友（或录音）随机发出指令：①「延长」→ 立刻在 C 和弦上 vamp；②「升调」→ 转到 D 大调继续；③「结束」→ 用 F–G–C 终止式收尾；④「变慢」→ 简化为根音 + 和弦音并跟随减速。每个指令要求 2 秒内响应，全程音乐不断。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]}],"step":0.8,"dur":0.7}
  },
  "co-motif": {
    simple: "动机是作品中最小的、有意义的音乐细胞，通常 2～4 个音。乐句是动机组织成的完整「一句话」，通常 4 小节，有自己的起伏和结束感。这两者的关系是：动机提供身份（听众记住的是它），乐句提供呼吸（听众感受到的是它）。写作的关键在于动机必须短到能被记住，同时必须有足够的特征（独特的音程或节奏）能被辨认——「do re mi」不是好动机，「短短短长」这样的节奏型才可能是。",
    pro: "动机的两个维度：① 音程特征——如小三度上行、纯四度跳进、半音下行；② 节奏特征——如附点、切分、三连音。真正能被记住的动机，往往节奏特征强于音程特征（Beethoven 第五就是典型：音程只是下行大三度，节奏「三短一长」才是身份）。乐句的技术要素：长度（4 小节最常见，但也有 2、6、8 小节的不对称乐句）、终止（半终止停在 V 制造未完感，完全终止 V–I 制造结束感）、呼吸（乐句之间留 1～2 拍或用长音分隔）。乐句组合的标准形式：a（问句）+ a'（答句，变化结尾）构成 8 小节 period；a + b（对比句）构成对比乐段。",
    realWork: "Beethoven《第五交响曲》的「G-G-G-E♭」：音程是下行大三度，但身份来自三个短音加一个长音的节奏。Mozart《第 40 交响曲》第一乐章主题的动机是一个简短的下行二度叹息，通过模进与展开撑起整个乐章。Chopin《革命练习曲》左手是连续的十六分音符音型动机，右手在其上做旋律，是「伴奏型动机」的经典。",
    application: "写动机的实操步骤：① 先写节奏，不写音高——在 4 拍内敲出一个有意思的节奏型（必须有一个长音或休止）；② 给它配上最简单的音高（只用 2～3 个音，强调一个特征音程）；③ 测试可辨识性：把这个动机唱给朋友，看他能不能复述；④ 发展成乐句：重复一次（建立记忆），第二次改变结尾（半终止或完全终止）；⑤ 检查：如果去掉任何一个音，动机是否还成立？如果成立，说明音太多，删掉。",
    practice: "写一个只有 3 个音的动机，节奏必须是「短短长」（两个八分 + 一个四分）。然后用这 3 个音做：原样重复 → 移高纯四度 → 倒影 → 扩展成 5 个音。挑出 3 个最好的形态，拼成一个 4 小节乐句，最后用 V–I 终止收尾。要求：全程只用 3 个音，不许加新音。",
    audio: {"type":"seq","notes":[{"m":60,"d":0.25,"gap":0.27},{"m":60,"d":0.25,"gap":0.27},{"m":60,"d":0.5,"gap":0.52},{"m":56,"d":0.9,"gap":0.92}]}
  },
  "co-dev": {
    simple: "发展，是把已有的材料变得「既熟悉又新鲜」。听众需要熟悉感（否则跟不上），也需要新鲜感（否则无聊）。变奏的全部艺术，就在这两者的比例上。常见手法有：模进（整体移高移低）、加装饰（保持骨架音符，在中间加花）、改变织体（旋律不变但伴奏变）、改变和声（旋律不变但配不同和弦）、转调（整体搬到另一个调）、对位（加一个独立的对旋律）。",
    pro: "六类发展手法的技术细节：① 模进（sequence）——把动机整体移到另一个音高级，注意严格模进会脱离调性，实际写作常用调内模进（根据音阶度数调整音程）；② 装饰变奏（ornamentation）——保留骨架音（通常是强拍音），在弱拍加经过音、回音、颤音；③ 织体变奏——同一旋律从单声部变为和声式、对位式、或分散到不同乐器；④ 和声变奏（reharmonization）——同一旋律配不同和弦，可改变情绪而不改变旋律（例如把大三换成小三可让旋律变忧郁）；⑤ 展开（fragmentation）——取动机的前 2 个音反复，逐渐缩小到 1 个音，是制造高潮前紧张感的利器；⑥ 对位——加一条独立旋律，注意与主题的节奏互补（你动我静）与音程协和度控制。",
    realWork: "Bach 的《Goldberg Variations》是变奏艺术的顶峰：30 个变奏全部建立在同一个低音线条（和声骨架）之上，而旋律、织体、风格完全各异。Beethoven《钢琴奏鸣曲 Op.109》第三乐章的主题与六个变奏，展示了速度、织体、节奏密度如何彻底改变同一旋律的性格。爵士乐手中的 reharmonization 是和声变奏的日常实践——同一首 standard 可以配上完全不同的和弦进行。",
    application: "拿到一段 8 小节旋律后，依次做这五种变奏并对比效果：① 织体变奏——旋律不变，伴奏从柱式改为分解、再改为对位；② 和声变奏——把其中两小节的和弦替换（大三改小三、加七音、用副属和弦），注意只改和弦不改旋律；③ 装饰变奏——在长音处加经过音与回音，把 4 分音符变成 8 分或 16 分；④ 调式变奏——把旋律放到关系小调或多利亚调式上；⑤ 展开——取最后 2 个音反复 4 次，每次缩小，然后接高潮。每种变奏都要问：改变了什么？情绪变化了吗？",
    practice: "取《小星星》前 8 小节（C-C-G-G-A-A-G），做三次变奏：① 装饰变奏（每个长音加经过音）；② 和声变奏（第 3 小节改用 Am 而非 C，第 4 小节改用 F）；③ 调式变奏（改成 A 小调或 D 多利亚）。弹出来对比——同一段旋律会呈现完全不同的情绪。",
    audio: {"type":"seq","notes":[{"m":60,"d":0.4,"gap":0.42},{"m":60,"d":0.4,"gap":0.42},{"m":67,"d":0.4,"gap":0.42},{"m":67,"d":0.4,"gap":0.42},{"m":69,"d":0.4,"gap":0.42},{"m":69,"d":0.4,"gap":0.42},{"m":67,"d":0.8,"gap":0.82}]}
  },
  "co-form": {
    simple: "曲式是音乐的时间建筑——它决定听众在什么时候期待什么。没有结构的音乐即使旋律动听，也会让人觉得「不知道在听什么」。最基础的单位是乐句（4 小节），乐句组成乐段（8 小节或 16 小节），乐段组成曲式。选择哪种曲式，取决于你想让听众经历什么样的旅程：是简单的 ABA（去一趟再回来），还是不断推进的奏鸣式（冲突与解决）。",
    pro: "常见曲式与适用场景：① 二部曲式（AB，8+8 小节）——最短的完整结构，A 段建立调性并停在属，B 段转调后回归；② 三部曲式（ABA）——A 呈示，B 对比（转调或换情绪），A' 再现（可加装饰），是最常用的小型曲式；③ 回旋曲式（ABACA）——主题反复出现，间插对比段，适合轻快、舞蹈性作品；④ 变奏曲式（A A' A'' A'''…）——主题加一系列变奏，适合展示同一材料的多面性；⑤ 奏鸣曲式（呈示部 - 展开部 - 再现部）——呈示部给两个对比主题（主调与属调），展开部把动机拆解重组并不断转调制造不稳定，再现部让两个主题同在主调出现，完成调性冲突的解决；⑥ 流行歌曲结构（Verse–Pre-Chorus–Chorus–Bridge）——本质是 ABA 的变体，靠编配密度而非旋律变化制造对比。",
    realWork: "Mozart 的钢琴奏鸣曲大量使用奏鸣曲式，主题对比与调性布局清晰可听。Chopin 的夜曲多为三部曲式（ABA），B 段常转到关系大调或远关系调制造强烈对比。The Beatles 的《Yesterday》是标准的 AABA 流行结构，bridge 提供唯一的对比。Ravel 的《Boléro》是极端的变奏曲式：旋律与和声几乎不变，全靠配器与力度的持续渐强构建九分钟的结构。",
    application: "写一首作品前先定曲式框架（而不是先写旋律）：① 决定段落数与长度（如 ABA，各 8 小节，共 24 小节）；② 为每段定功能——A 建立（主调、中等密度）、B 对比（转调到属调或关系小调、改变织体或音区）、A' 再现（回主调，可加装饰或加厚）；③ 定每段的终止式：A 段停半终止（V）制造未完感，B 段停在属准备回归，A' 段用完全终止（V–I）结束；④ 最后才填旋律与和声。用这个顺序写，作品几乎不会散。",
    practice: "用 ABA 三部曲式写一首 24 小节小曲：A 段（C 大调，8 小节，停在 G7 半终止）；B 段（转到 A 小调或 G 大调，8 小节，改变织体——如从分解改为柱式，或移到高音区）；A' 段（回 C 大调，8 小节，旋律与 A 相同但加装饰音，用 V–I 完全终止）。核心检查：B 段是否真的有对比？如果 B 段和 A 段听起来差不多，说明对比不足。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":55,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]}],"step":0.9,"dur":0.8}
  },
  "co-emotion": {
    simple: "音乐之所以能打动人，不是因为它「好听」，而是因为它制造了情绪的变化过程——从平静到激动、从紧张到释放、从期待到满足。这些情绪效果是可以技术化控制的：你想让听众紧张，就加快和声节奏、提高音区、增加不协和音、制造未解决的期待；你想让听众放松，就放慢和声、回到主和弦、降低音区、留白。作曲家的工作，本质是设计一条情绪曲线。",
    pro: "情绪的六个可控参数：① 和声节奏（和弦变换频率）——变换越快张力越强，长和弦 = 平静；② 不协和度——加入七和弦、九和弦、半音、三全音会提高张力，解决到协和低点即释放；③ 音区——高音区紧张明亮，低音区沉重安定；④ 密度——音符密集 = 激动，稀疏 = 平静；⑤ 力度与音色——渐强 + 加厚织体 = 情绪上扬；⑥ 调式与调性——大调明亮、小调忧郁，转调（尤其是远关系调或突然转调）制造转折感，回归主调制造归属感。叙事的关键技术：延迟满足（把期待的和弦推后出现）、对比（极静与极响相邻）、回归（结尾再现开头材料，形成闭环的时间感）。",
    realWork: "Wagner 的《Tristan und Isolde》前奏曲用延后的解决（Tristan 和弦）把紧张维持整首，是「延迟满足」的极致范例。Chopin 的《革命练习曲》用左手持续的十六分音符密度 + 右手强烈的旋律，制造持续的激动。电影配乐中，Hans Zimmer 常用的「缓慢渐强 + 持续低音 + 逐步加入乐器层」是情绪推进的标准手法（如《Time》）。",
    application: "给作品设计情绪曲线：① 先画一条时间轴，标出你要的情绪点（如 0:00 平静 → 0:30 渐起 → 1:00 高潮 → 1:20 突然静默 → 1:40 缓慢回归 → 2:00 收尾）；② 为每个点指定技术手段（平静：长和弦 + 低音区 + 稀疏；高潮：和声节奏加快到每拍一换 + 高音区 + 密集 + 力度 ff）；③ 特别设计「静默点」——高潮后突然的极弱段落，比持续的高潮更有冲击力；④ 最后设计回归：让开头材料在结尾以不同方式出现（如开头是钢琴单声部，结尾是弦乐全奏），形成「旅程完成」的闭环感。",
    practice: "用同一段 8 小节和声（如 C–Am–F–G），写三个版本：① 平静版（长和弦、低音区、每小节一个和弦、力度 p）；② 激动版（每拍换和弦、高音区、十六分音符密度、力度 f）；③ 起伏版（前 4 小节平静，第 5～6 小节渐强到高点，第 7 小节突然 pp，第 8 小节缓收）。对比三者——和声完全相同，情绪完全不同，这证明情绪来自处理而非材料。"
  },
  "ar-mel": {
    simple: "主旋律编配解决旋律由谁奏、怎么加厚的问题。四种基本手法：齐奏 unison（多件乐器同奏同一音高）、八度叠加（同一旋律在 C4 与 C5 同时出现）、三六度加厚（在旋律下方加三度或六度音）、对位（另写一条独立的副旋律）。选择依据是音区与音色：人声在 A3–E5 时，弦乐适合在其上方八度做 C5–G5 的叠加，铜管适合在中低音区做对位。加厚会提升厚度但牺牲清晰度，所以副歌常用八度叠加，主歌保持单线条。",
    pro: "具体规则：八度叠加要避免声部交叉，主旋律在 C5–G5 时，下方八度声部不要低于 C4，否则与中提琴、大提琴的 G3–C4 区打架。三度加厚需检查是否产生和弦外音冲突：旋律音 E5、和弦 Cmaj7 时，加下方三度 C5 安全（C 是根音），加 G4 则要确认和弦含五音。六度加厚色彩更柔，适合弦乐与木管。对位旋律写作要点：与主旋律节奏互补（主旋律长音时对位走八分音符）、音程以三度六度为主、避免平行五度八度、句尾落回和弦音。常见配置：主歌 solo 人声，预副歌加长笛八度叠加，副歌弦乐 f 力度八度齐奏加小号在下方三度。",
    realWork: "久石让在《天空之城》主题曲中把主旋律交给多件乐器交接：主题第一句由双簧管 solo 呈示（D 大调，起音 A4），第二句弦乐组在 C5–A5 以八度叠加接手，钢琴走十六分音符琶音铺底；尾声转为弦乐高把位（D6 附近）独奏。同一条旋律用三件乐器接力，音色由暖到亮、密度由薄到厚，是旋律分配与加厚的标准示范。",
    application: "① 先把主旋律单独导出一条 MIDI，确认音域（例：G4–D6）。② 只在副歌长音处加厚，不要整段都加。③ 八度叠加：复制一条 MIDI，移低 12 个半音，换成弦乐音色，音量比主旋律低 3–6dB。④ 三度加厚：在长音处手动写入下方三度音，且必须属于当前和弦（Cmaj7 时可用 E、G、B）。⑤ 写对位：挑主旋律的空白小节（长音或休止处）写二至四小节短句，节奏用八分音符。⑥ 戴耳机检查：若听不清歌词，说明加厚过度，先删掉对位层再听。",
    practice: "用 C 大调、92 BPM 工程写 8 小节主旋律（音域 C5–A5），和声 C–Am–F–G。做三个版本对比：原旋律 solo（钢琴）、八度叠加（加弦乐低八度）、对位版（在第 5–6 小节长音处加一条八分音符副旋律）。导出后比较响度差与清晰度差异。",
    audio: {"type":"chord","root":60,"iv":[0,4,7],"dur":1.2}
  },
  "ar-groove": {
    simple: "Groove 是节奏组（鼓、贝斯、钢琴或吉他）在时间轴上咬合出来的稳定推进感。建立 groove 靠三件事：kick 与贝斯落点一致（或刻意互补）、hi-hat 与 shaker 提供十六分音符的细分脉冲、snare 在 2、4 拍给出参照。律动的松紧由 swing 量与量化强度决定：八分 swing 50% 是平直，55–62% 是松弛的 R&B 感；量化 100% 偏机械，50–70% 保留人味。判断标准很简单：关掉所有旋律与和声，只留鼓与贝斯，如果仍然让人想点头，groove 就成立。",
    pro: "具体参数：流行摇滚常用 kick 在 1、3 拍，snare 在 2、4 拍，hi-hat 八分，BPM 90–120。R&B 与 Neo-soul 用八分 swing 55–62%，BPM 70–85，hi-hat 十六分带力度起伏（重拍 velocity 110、弱拍 70）。Funk 强调十六分切分：kick 落在 1 与后面的 &，snare 加 ghost note，velocity 40–60。贝斯与 kick 有两类关系：同点（都在 1、3，力量感强）与互补（kick 1、3，贝斯走八分切分，律动感强）。踩镲力度包络直接决定呼吸感，建议把每四个十六分音符写成 100/60/80/60 的 velocity 循环，而不是用同一个力度值。",
    realWork: "Bruno Mars《Uptown Funk》由 The Smeezingtons（Philip Lawrence、Ari Levine、Brody Brown）与 Jeff Bhasker 共同制作：BPM 约 115，鼓组用十六分 hi-hat 加大量 ghost note，贝斯走 E 小调的十六分切分 riff，与 kick 形成互补落点；副歌加入大号与合成器 stab。可自己做对照实验：把 hi-hat 全部换成平直八分，律动感会立刻塌陷。",
    application: "① 定 BPM（R&B 用 78，Funk 用 112，摇滚用 120）。② 先做最简 groove：kick 1、3，snare 2、4，hi-hat 八分，循环 4 小节听是否稳。③ 加贝斯：先只弹根音跟 kick 同点，听两分钟后改成八分切分，对比哪种更推。④ 调 swing：把八分 swing 从 50% 拉到 58%，再拉到 65%，找到风格临界点。⑤ 做 velocity 曲线：hi-hat 十六分按 100/62/84/62 排列，snare ghost note 设 45。⑥ 最后静音所有和声与旋律，只留鼓与贝斯试听。",
    practice: "建 78 BPM、E 小调、8 小节的循环工程。分别用 swing 50%、58%、66% 三档做同一段 hi-hat 加贝斯的 groove 并导出。再做一个 kick 与贝斯同点版、一个互补版，盲听记录哪个更像 R&B、哪个更像 Funk，并写下判断依据。",
    diagram: {"root":52,"iv":[0,3,7]}
  },
  "ar-texture": {
    simple: "织体 texture 指同一时刻并存的声音线条数量与关系。四种基本型：单声部（只有一条线，如无伴奏清唱）、主调（旋律加伴奏和声，流行歌九成以上的形态）、复调（两条以上独立旋律同时进行，如赋格）、齐奏（多件乐器奏同一线条，只是音色变厚）。层次好坏的判断标准不是乐器多，而是每个频段是否只有一件乐器在说话：低音区归贝斯、中音区归和声、高音区归旋律与装饰。声部越多，每件乐器就要写得越简单。",
    pro: "密度与频段分配规则：任意时刻同时发声的声部控制在 3–4 层。低频 40–250Hz 只留 kick 与贝斯，其他乐器用高通切掉 100Hz 以下。中低频 250–800Hz 最容易糊，钢琴、吉他、中提琴不要在此堆叠，吉他可挂 200Hz 高通并在 400Hz 衰减 2–3dB。中高频 2–5kHz 留给人声与 lead，高频 8–12kHz 给 hi-hat 与 shaker。织体变化手法：主歌用主调织体（人声加分解和弦），预副歌加持续长音 pad 形成垫层，副歌用齐奏（弦乐与吉他同奏旋律）加厚，桥段抽空只剩单声部加 pad 制造反差。复调写法：两声部音程以三度六度为主，避免平行五八度，节奏互补。",
    realWork: "坂本龙一《Merry Christmas Mr. Lawrence》的钢琴版是典型主调织体：右手旋律在 C4–G5，左手是持续低音与分解和弦。而在弦乐改编版中，主旋律由弦乐高声部奏出，钢琴转为十六分音符的伴奏织体，并加入一条大提琴的对位低音线。织体从旋律加伴奏升级为旋律加伴奏加对位，同一作品两种织体，情绪厚度完全不同。",
    application: "① 给工程分层命名：LOW（贝斯、kick）、MID（钢琴、吉他、pad）、HIGH（lead、hi-hat）。② 用滤波检查：给 MID 层挂高通 120Hz，给 pad 挂低通 6kHz，立刻变干净。③ 副歌加厚不要只加音量，改用齐奏：复制旋律 MIDI 给弦乐与吉他同奏，各降 4dB。④ 桥段做织体减法：只保留人声加一件 pad，其余静音 4 小节。⑤ 想加复调时，先写 2 小节对位句放在主旋律长音处，节奏用八分音符，音程控制在三度与六度。⑥ 每次改完做 A/B 对比，确认加层后歌词仍清晰。",
    practice: "用 C 大调、72 BPM、16 小节工程写四段织体：1–4 小节单声部（只有钢琴旋律）；5–8 小节主调（加分解和弦）；9–12 小节齐奏（弦乐与钢琴同奏旋律）；13–16 小节复调（加一条大提琴对位）。导出并在标记轨注明每段的声部数与主要频段占用。",
    diagram: {"root":60,"iv":[0,4,7]}
  },
  "ar-versions": {
    simple: "同一首歌的不同段落需要不同的编配能量，否则副歌会起不来。手法分五类：加法（副歌增加乐器层次）、减法（桥段抽掉鼓与贝斯）、音区变化（主歌贝斯在 C2，副歌改走八分并把旋律移高八度）、密度变化（主歌四分音符，副歌十六分音符）、音色变化（主歌电钢琴，副歌加失真吉他）。常用能量曲线：主歌 50%、预副歌 65%、副歌 100%、第二段主歌 70%、桥段 40%、最后副歌 110%。低点做得越低，高点才越高。",
    pro: "具体配置（C 大调，96 BPM）：主歌——贝斯根音四分音符（C2–G2）、hi-hat 八分、钢琴柱式和弦每小节一次，织体 2 层；预副歌——贝斯改八分、加入 tom fill 与弦乐长音 pad（G3–D5），最后 2 小节用 snare roll 或 reverse crash 推进；副歌——kick 与贝斯同点、加十六分 shaker、弦乐 f 力度八度齐奏旋律、吉他扫弦，织体 4–5 层，整体比主歌高 2–3dB；桥段——只留人声加 pad，和声改 vi–IV–I–V 制造悬置，最后一小节全体休止再进最后副歌。关键规则：每次段落切换至少有两项参数同时变化（密度加音区，或力度加音色）。",
    realWork: "皇后乐队《Bohemian Rhapsody》（Freddie Mercury 创作，Roy Thomas Baker 制作）是段落编配的极端案例：无鼓的 a cappella 主歌，到钢琴加贝斯的叙事段，到多轨人声叠加的歌剧段（复调织体加鼓进入），再到硬摇滚段（失真吉他加双轨主音，力度 ff），最后回落到钢琴尾奏。每一段都靠织体与配器的彻底替换完成转场，而非靠旋律变化。",
    application: "① 先画段落能量表（主歌 50、预副歌 65、副歌 100、桥段 40）。② 为每个段落建立轨道静音自动化（mute automation），不要手动删音符。③ 副歌升级至少做两件事：把旋律复制一层移高八度、把 hi-hat 从八分改成十六分。④ 预副歌末尾加 2 小节推进素材：snare 十六分 roll 渐强，或反向镲片 reverse crash。⑤ 桥段做减法：静音鼓与贝斯，保留 pad，人声加一层高八度和声。⑥ 每次改完连续播放主歌接副歌，若听感提升不足，就再加一层或提高 1–2dB。",
    practice: "用 C 大调、96 BPM、32 小节工程（8 小节主歌、8 预副歌、8 副歌、8 桥段）。按能量表为每个段落写不同的鼓密度、贝斯节奏型与织体层数。导出后测量各段 RMS 电平，确认主歌与副歌相差 2–3dB，且桥段为最低值。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "dw-setup": {
    simple: "工程搭建决定后面所有工作的效率。四件事必须先定：采样率与位深、轨道结构与命名、颜色与分组、模板工程。采样率 48kHz/24bit 是通用选择（44.1kHz 用于纯音频发行，48kHz 用于视频），24bit 提供约 144dB 动态余量，录人声不必贴着零电平冒险。轨道命名要一眼看懂（DRM_Kick、BS_DI、GTR_Amp、VOX_Lead），颜色按乐器族分组。把这些存成模板，以后每次开工直接调用，省下的是每次十分钟的重复劳动。",
    pro: "参数细节：缓冲区在录音时设 128–256 samples、混音时 1024；开启 32bit float 内部处理可避免总线过载削波。轨道组织建议：① 鼓分轨（Kick、Snare、Hat、Tom、Overhead）汇入 Drum Bus；② 贝斯（DI 加 Amp 两轨）；③ 和声（钢琴、吉他、Pad、弦乐）汇入 Music Bus；④ 人声（Lead、Dbl、Harm、Adlib）汇入 Vocal Bus；⑤ FX send（Plate 混响 1.8–2.4s、Delay 1/8 dotted）。每条轨道除 kick 与贝斯外一律插入 80–120Hz 高通作为默认起点。标记轨按段落打点：Intro、Verse1、Pre、Chorus1、Verse2、Bridge、Chorus2、Outro，方便后期快速定位与导出分轨。",
    realWork: "Hans Zimmer 的配乐工程（常见于 Cubase 与 Logic）以庞大著称，做法是按组分层：弦乐按声部（Vln I、Vln II、Vla、Vc、Cb）各占多轨，打击乐单独成组，并预先规划 stem 导出结构（弦乐组、铜管组、打击组、合成组、人声组），方便导演要求不同版本时快速切换。这套先规划导出结构再动手写歌的思维，同样适用于流行歌制作。",
    application: "① 新建工程，采样率 48kHz、位深 24bit、缓冲区 256。② 建轨道：DRM_Kick、DRM_Snare、DRM_Hat、BS_DI、BS_Amp、PNO、GTR、PAD、STR、VOX_Lead、VOX_Harm、FX_Rev、FX_Dly。③ 颜色：鼓红、贝斯紫、和声蓝、人声黄、弦乐绿、FX 灰。④ 建总线 Drum Bus、Music Bus、Vocal Bus 汇入 Mix Bus，FX 用 send。⑤ 除 kick 与贝斯外每条轨挂 100Hz 高通。⑥ 打段落标记。⑦ 另存为模板文件并设为默认模板。",
    practice: "建一个可复用模板工程并命名 POP_TEMPLATE_48k。要求：12 条命名轨、3 条总线、2 条 send 轨、颜色分组、段落标记齐全、每条非低频轨挂 100Hz 高通。用它写一段 8 小节循环，测试从新建工程到出声能否在 5 分钟内完成。"
  },
  "dw-edit": {
    simple: "编辑是把原始演奏素材变成可用素材的过程。四件核心工作：量化（把音符吸附到网格，纠正提前或滞后）、人性化管理（量化后加回随机偏移与力度波动，避免机械感）、comping（同一句录多遍，挑最好片段拼成一条）、时间伸缩（拉伸音频而不改音高）。量化强度不是越高越好：100% 会让鼓组僵硬，鼓常用 60–80%，贝斯 70–90%，钢琴 50–70%，人声基本不量化，只做手动修整。判断标准是听不出被修过。",
    pro: "参数与规则：量化网格选 1/16 时容易吃掉 swing，带 swing 的素材应先按八分 swing 量化，或引用参考轨的律动模板（Logic 的量化可调用 groove 模板）。人性化管理：量化后给音符加 ±5–15ms 的随机时间偏移与 ±5–10 的 velocity 波动，或使用 humanize 功能。Comping 流程：录 3–5 遍 take，以乐句（通常 2 小节）为单位选段，交叉淡化设 5–15ms 防止爆音。时间伸缩用 Logic 的 Flex Time、Ableton 的 Warp、Cubase 的 AudioWarp；人声音高修正用 Melodyne 或 Auto-Tune，retune speed 设 20–40 保持自然，只修偏离超过 30 cents 的音。注意 hi-hat 建议保留原始 timing，过度量化会直接破坏 groove。",
    realWork: "现代流行人声几乎全部经过 comping 与音高修正。以 Taylor Swift 的制作流程为例（多由 Jack Antonoff 与 Max Martin 团队操刀），主唱会录多遍 take，工程师用 comping 逐句拼出最好的版本，再用 Melodyne 修正个别字的音高与颤音，最后清理气口与齿音。听感上一遍录成的演唱，实际往往由十几个片段构成。",
    application: "① 录 3 遍人声 take，全部对齐到网格。② 做 comping：以 2 小节为单位逐句听，选最好片段，交叉淡化 10ms。③ 音高修正：挂 Melodyne，先看整体音高曲线，只修偏离超过 30 cents 的音，不要把每个音都拉到正中。④ 鼓组量化：网格 1/16、强度 75%，量化后手动把 hi-hat 的几处音符拖回原位保留人味。⑤ 人性化：给量化后的 MIDI 加 ±10ms 随机时间与 ±8 的 velocity 波动。⑥ 逐段试听所有剪辑点，检查有无咔哒爆音。",
    practice: "录或导入一段 8 小节人声与一段 8 小节鼓。完成三件事：① 用 3 个 take 做 comping 拼出一条主唱；② 给鼓做 1/16 网格 75% 量化，并与 100% 量化版对比听感差异；③ 给量化后的 MIDI 加 ±10ms 随机偏移。导出两版对比文件并写下结论。"
  },
  "dw-mix": {
    simple: "混音的目的是让每一样乐器都听得见、且位置合理。四件事按重要性排序：电平（谁大声谁小声）、声像（谁在左谁在右）、EQ（谁占哪段频率）、动态（压缩控制波动）。正确顺序是先做静态混音：只推推子，把人声固定在 -6 到 -3dBFS 峰值，贝斯与 kick 定好，其他乐器往后让；再处理频率冲突；最后才加压缩与混响。经验法则：八成的混音问题只靠推子和声像就能解决，插件用得越多越容易出问题。",
    pro: "具体参数：电平起点——kick 峰值 -10dBFS，snare -10，贝斯 -12，和声乐器 -16 到 -20，人声 -6 到 -3，Mix Bus 峰值留 -6dBFS 给母带。声像——kick、snare、bass、lead vocal 居中，hi-hat 略右 15–20%，overhead 左右 60–80%，和声吉他左 30 与右 30，delay 回声放在声源相反方向。EQ——非低频乐器一律高通 80–120Hz；人声在 200–400Hz 衰减 2–3dB 去浑浊，3–5kHz 提升 2dB 增清晰；贝斯在 60–100Hz 提升，200–400Hz 衰减。压缩——人声 ratio 3:1 到 4:1，attack 10–30ms，release 100–200ms，gain reduction 3–6dB；总线压缩 ratio 2:1，GR 1–2dB。",
    realWork: "Daft Punk《Get Lucky》（Thomas Bangalter 与 Guy-Manuel de Homem-Christo 制作，Nile Rodgers 吉他，Mick Guzauski 混音）的混音关键，是让干净吉他与合成器贝斯共存：吉他做高通并压低 200Hz 以下，突出 2–4kHz 的拨弦质感；贝斯基频占 60–120Hz；两者在频段上完全错开。鼓组则用压缩与房间混响营造统一的 70 年代 disco 空间感。",
    application: "① 先把所有推子拉到最低，按重要性依次推起：人声、kick、snare、贝斯、和声、装饰。② 定声像：低频与中心元素居中，其余按 30 与 60 度展开。③ 做高通：除 kick 与贝斯外所有轨道挂 80–120Hz 高通。④ 处理冲突：人声与吉他挤在 2–4kHz 时，给吉他衰减 2dB 该频段，而不是提人声。⑤ 挂压缩：人声 4:1、attack 20ms、release 150ms、GR 4dB 左右。⑥ 混响用 send，plate 混响 1.8s，人声 send 量约 -18dB。⑦ 在大中小三个音量档位各试听一遍。",
    practice: "打开一个已完成的 12 轨工程做粗混：① 只推推子定电平；② 全部非低频轨加 100Hz 高通；③ 给人声加 4:1 压缩（attack 20ms、release 150ms、GR 4dB）；④ 用 send 挂 1.8s plate 混响。导出粗混版本，与未处理版对比响度与清晰度，记录每步带来的变化。"
  },
  "dw-master": {
    simple: "导出与母带是把混音变成可发行成品的最后一步。导出设置：WAV 或 AIFF，采样率与工程一致，24bit 用于母带交付，16bit/44.1kHz 用于 CD，流媒体提交 24bit 版本。响度标准：Spotify 与 Apple Music 的目标约 -14 到 -16 LUFS integrated，真峰值控制在 -1.0 dBTP 以下；CD 发行常见 -9 到 -11 LUFS。母带阶段通常只做三件事：EQ 微调、多段压缩或限幅提升响度、立体声宽度与格式转换，目标是适配发行渠道而非追求极端响度。",
    pro: "技术细节：真峰值限制设 -1.0 dBTP 可避免 MP3 与 AAC 编码后的采样间削波；响度用 LUFS integrated 测量，短时看 LUFS short-term（3 秒窗）。平台会做归一化：Spotify 约 -14 LUFS、Apple Music 约 -16 LUFS、YouTube 约 -14 LUFS，过响的母带会被自动拉低，所以不必硬推。母带链路参考：线性相位 EQ（切掉 30Hz 以下，2–4kHz 提升 0.5–1dB）→ 多段压缩（低频段 ratio 2:1）→ 立体声 imager（100Hz 以下收成单声道，宽度不超过 100%）→ 限幅器（ceiling -1.0 dBTP，gain reduction 不超过 3–4dB）。同时要交付 stems、instrumental 与 a cappella 版本。",
    realWork: "Abbey Road Studios 的母带工程师（如 Miles Showell）会为不同介质分别处理：黑胶母带需控制低频能量与侧边信息（低频转单声道、限制立体声宽度），数字母带则按流媒体响度标准处理。流行专辑通常同时交付 -14 LUFS 的流媒体版与更响的电台版，这证明母带不是一味求响，而是按发行渠道定制。",
    application: "① 混音完成后先检查 Mix Bus 峰值是否留有 -6dB 余量，不够就整体拉低推子。② 导出：WAV、48kHz/24bit，后续还要处理时关闭 dither，最终出 16bit 时再开启。③ 用响度表测 LUFS，目标是流媒体 -14 LUFS，差距大再挂限幅器。④ 限幅器 ceiling 设 -1.0 dBTP，缓慢提升输入直到 GR 达 2–4dB。⑤ 用 EQ 只做 0.5–1dB 的整体微调，不要大动。⑥ 导出三种：24bit 母带版、16bit/44.1kHz 版、instrumental 版。⑦ 在手机、耳机、车载各听一遍。",
    practice: "拿一个粗混工程导出 48kHz/24bit WAV。新建母带工程：挂线性相位 EQ（切除 30Hz 以下）→ 多段压缩 → 限幅器（ceiling -1.0 dBTP）。用响度表测到 -14 LUFS integrated 与 -1.0 dBTP，再导出 16bit/44.1kHz 版本与 instrumental 版本，在手机扬声器与耳机上各听一遍并记录差异。"
  },
  "or-string": {
    simple: "弦乐组是管弦乐的基础：第一小提琴奏旋律（G3–A7）、第二小提琴奏和声或旋律下方、中提琴管内声部（C3–E6）、大提琴管低音与抒情旋律（C2–A5）、低音提琴提供低八度支撑（E1–G4）。四种常用手法：齐奏（全体奏同一旋律，同度或八度）、分奏 divisi（一个声部分成两三个音，用于和弦）、持续长音 pad、拨奏 pizzicato（轻快节奏）。奏法记号直接决定性格：arco 拉奏、pizz 拨奏、spiccato 跳弓、tremolo 震音制造紧张、sul ponticello 靠琴马金属感、con sordino 弱音器朦胧。",
    pro: "具体配置：弦乐和弦按四声部从上往下排——Vln I 最高音、Vln II 次高、Vla 三音、Vc 根音，Cb 低八度重复 Vc。分奏时每谱台再分 a 与 b 两部，谱面标 div. a 2 或 divisi。八度叠加法则：旋律交给 Vln I 与 Vc 相隔两个八度齐奏（Vln I 在 C5–G5，Vc 在 C3–G3），音响极厚实。弓法与奏法：f 长音需换弓，每 2–4 拍标一次弓法；tremolo 在音符上加三条斜线；pizzicato 后恢复拉奏要标 arco。音区性格：小提琴 G 弦（G3–D4）厚重，E 弦高把位（A6 以上）尖锐紧张；大提琴 A 弦（A3–C5）最适合抒情旋律；中提琴 C 弦（C3–G3）偏暗，注意别与大提琴撞区。",
    realWork: "柴可夫斯基《弦乐小夜曲》Op.48 第一乐章：主题由弦乐全组 ff 齐奏呈示，Vln I 奏旋律，Vln II 与 Vla 走内声部，Vc 与 Cb 奏根音与低音；对比段转为大提琴独奏抒情旋律（C 大调，音域 C3–G4），小提琴用 pp 的 tremolo 铺背景。同一支乐团仅靠分配方式的变化就完成能量对比，是弦乐写作的教科书。",
    application: "① 先写四声部和声（SATB），确认无平行五八度。② 分配：最高音给 Vln I，次高给 Vln II，三音给 Vla，根音给 Vc，Cb 低八度重复 Vc。③ 需要厚音响时做八度齐奏：Vln I 与 Vc 相隔两个八度同奏旋律。④ 长音持续超过 4 拍要标换弓或改用分奏。⑤ 用 MIDI 弦乐试听时，给 Vln I 加 3dB、Vla 减 2dB、Vc 保持 0dB，模拟真实乐团平衡。⑥ 紧张段用 tremolo 并标 trem.，轻快段用 pizzicato，抒情段交给 solo Vc 或 solo Vln。",
    practice: "用 C 大调写 16 小节弦乐片段：1–4 小节全组 ff 齐奏；5–8 小节大提琴独奏旋律（C3–G4）加小提琴 tremolo 背景；9–12 小节 pizzicato 节奏型；13–16 小节用 divisi 铺四音和弦。导出 MIDI 试听，并逐声部检查音域是否越界。"
  },
  "or-wood": {
    simple: "木管组四件核心乐器性格分明：长笛（C4–C7）高音区明亮飘逸，低音区 C4–G4 气声重、适合忧郁；双簧管（Bb3–G6）鼻音浓、穿透力强，常用于独奏与乐队校音（全团用它对 A4）；单簧管（E3–C7）音域最宽，低音区 chalumeau（E3–G4）温暖浑厚，高音区清亮；巴松（Bb1–E5）是低音木管，可幽默可阴沉，高音区 C4–E5 紧张苍白。常见编制为长笛 2–3 支、双簧管 2 支、单簧管 2 支、巴松 2 支。",
    pro: "移调与音域细节：单簧管是 Bb 调移调乐器，记谱比实际音高大二度（记 C4 实为 Bb3），可用音域 E3–C7，其中 E3–G4 的 chalumeau 区最有特色；长笛最低音 C4（B 尾管可到 B3），C5–C6 最甜美，C6 以上穿透但易尖锐；双簧管 Bb3–G6，A4–D6 最有表现力，F6 以上难控制；巴松 Bb1–E5，常用区 Bb1–F4。组合用法：长笛与双簧管相隔八度奏旋律是经典搭配（长笛在上）；单簧管与巴松相隔八度可获得厚实的低中音层；同族三支乐器奏三和弦音响最均衡；木管与弦乐做混合音色（长笛加第一小提琴八度齐奏）最为常用。",
    realWork: "贝多芬《第六交响曲田园》Op.68 第二乐章末尾的鸟鸣段，长笛、双簧管、单簧管分别模仿夜莺、鹌鹑与布谷鸟的叫声，是木管色彩性用法的早期经典。德彪西《牧神午后前奏曲》开端的无伴奏长笛独奏（音域 C5–E6，半音下行），则确立了长笛慵懒、朦胧的音色语汇，影响了整个二十世纪的木管写作。",
    application: "① 先确定旋律音区再选乐器：C5–G6 用长笛，A4–D6 用双簧管，G4–C6 用单簧管，C3–F4 用巴松或单簧管低音区。② 需要更厚时做混合音色：长笛加第一小提琴八度齐奏，或单簧管与中提琴同度。③ 写木管和弦按音高顺序分配（高音给长笛，依次往下），同族三支乐器奏三和弦最均衡。④ 独奏句要留气口：长笛与双簧管连续演奏不超过 4–6 小节。⑤ MIDI 制作时给木管加 2–4 的力度起伏与 10–20ms 的音头时间差，模拟真实合奏的呼吸。",
    practice: "用 F 大调写 16 小节木管片段：1–4 小节长笛独奏旋律（C5–F6）；5–8 小节长笛与双簧管八度齐奏；9–12 小节单簧管与巴松八度奏低中音层；13–16 小节四件乐器按音高顺序奏 F 大调三和弦。完成后检查单簧管的移调记谱是否正确。"
  },
  "or-brass": {
    simple: "铜管组提供能量与辉煌：圆号（F2–C5）柔和善融合，既能当铜管也能当木管用；小号（E3–C6）明亮锐利，是旋律与号角性乐句的主力；长号（E2–D5）庄重厚实，常奏和声支撑；大号（D1–F4）提供最低音基础。铜管的关键限制是体力：长时值 ff 演奏会疲劳，需要交替与休止。力度上，铜管要到 mf 以上才有金属光泽，pp 时圆号最可靠，小号的高音 pp 极难控制，写作时要慎重。",
    pro: "移调与音域：圆号是 F 调移调乐器（记谱比实际高纯五度），常用音域 F2–C5，最佳区 C3–G4；小号常用 Bb 调（记谱比实际音高大二度），音域 E3–C6，最佳区 G3–C6；长号为 C 调非移调，音域 E2–D5，最佳区 G2–F4；大号音域 D1–F4。标准编制：圆号 4 支、小号 2–3 支、长号 3 支（2 支次中音加 1 支低音）、大号 1 支。和声排列用上密下疏原则：上方声部（小号）音程较密（三度、四度），下方（长号、大号）间隔较宽（五度、八度）。力度写作：不要给铜管写超过 8–12 小节的连续 ff，需留 2–4 小节休止；弱音器可改变音色，straight mute 尖锐、cup mute 柔化、harmon mute 哇音效果。",
    realWork: "理查·施特劳斯《查拉图斯特拉如是说》Op.30 开头的日出：铜管从最低的 C（大号与低音长号）向上铺展到小号的 C6，配合定音鼓的 C–G–C 敲击与管风琴，是全奏铜管能量积累的极致范例。另一例科普兰《Fanfare for the Common Man》只用铜管与打击乐，靠开放五度与缓慢节奏制造庄严感，证明铜管不需要密集音符也能撑住场面。",
    application: "① 先写四声部和声，按上密下疏排列：小号奏上方两声部（间隔三度或四度），长号奏三音，大号奏根音。② 圆号可与小号同度奏旋律加厚，或单独奏内声部长音（最佳区 C3–G4）。③ 力度规划：全曲高潮才给 ff，且前面要留 4 小节的渐强与铜管的休止恢复。④ 写号角性乐句多用开放音程（纯五度、八度、大三度），少用密集半音。⑤ MIDI 制作要做力度包络：起音 30–60ms，长音加 2–3dB 渐强，避免平板。⑥ 检查移调：Bb 小号记谱比实际高大二度。",
    practice: "用 C 大调写 16 小节铜管片段：1–4 小节小号奏 fanfare（G4–C6，以开放五度与八度为主）；5–8 小节圆号四部和声（C3–G4）；9–12 小节长号与大号奏庄重和弦（C2–G3）；13–16 小节全组 ff 齐奏，最后 2 小节做渐强。完成后核对每件的移调记谱是否正确。",
    diagram: {"root":60,"iv":[0,4,7,12]}
  },
  "or-energy": {
    simple: "力度与能量是编曲的油门。它不只看音量标记（pp 到 ff），而是四个变量的合力：参与发声的乐器数量（密度）、音区的高低（高音区更紧张）、节奏的疏密（十六分比四分紧张）、以及实际电平（dB）。最高能量的全奏 tutti 意味着所有声部同时发声、旋律在高音区、节奏密集、力度 ff。能量曲线的设计比任何单一手法都重要：一首歌必须先有低点，副歌的高点才有意义，全程 ff 等于全程平淡。",
    pro: "具体做法（C 大调，100 BPM），能量分四级：① 低（pp–mp）——2–3 层，贝斯加钢琴加人声，音区集中 C3–C5，节奏以四分与八分为主，电平约 -18dBFS；② 中（mf）——4 层，加鼓组与弦乐 pad，hi-hat 十六分，电平 -12dBFS；③ 高（f）——5–6 层，全鼓加铜管或失真吉他，旋律移到高八度 C5–A5，电平 -8dBFS；④ 全奏（ff）——所有声部齐奏，加 crash、定音鼓或 riser，旋律在最高音区，电平 -6dBFS。渐强手法：crescendo、snare roll、tom fill、reverse crash、riser 音效、弦乐 tremolo、hi-hat 由八分加速到十六分。规则：每次能量跃迁至少改变两个变量，且副歌前必须有 2–4 小节的推进。",
    realWork: "皇后乐队《We Will Rock You》与《Bohemian Rhapsody》分别展示两种能量控制：前者只用跺脚、跺脚、拍手的节奏与最后 4 小节的吉他 solo 爆发，靠密度与音区制造高潮；后者以 ff 全奏的硬摇滚段接在无伴奏歌剧段之后，靠极端反差制造冲击。久石让为《菊次郎的夏天》所作的《Summer》则用持续的八分音符跑动与弦乐渐强，在同一力度框架下靠密度累积能量。",
    application: "① 先画能量曲线表：Intro 30、Verse 50、Pre 65、Chorus 100、Verse2 70、Bridge 40、Chorus2 110、Outro 60。② 为每段定量：层数、音区、节奏密度、目标电平。③ 段落切换做双变量变化：预副歌进副歌时，同时加弦乐层（密度）并把贝斯从四分改成八分（节奏）。④ 副歌前 2–4 小节加推进素材（snare roll 渐强或 reverse crash）。⑤ 最后副歌再加一层：八度叠加的旋律或 adlib。⑥ 用响度表核对各段 RMS 是否达到 2–3dB 的差值。",
    practice: "用 C 大调、100 BPM、32 小节工程，按能量曲线表为 8 个段落设定不同的层数、音区与节奏密度。导出后用响度表测每段 RMS，确认主歌与副歌相差 2–3dB、桥段为最低值，并在标记轨写明每次跃迁改变了哪两个变量。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "ear-int": {
    simple: "同一个音程有两种听法：先后响叫旋律音程，同时响叫和声音程。旋律音程靠距离感，你听过上千条旋律，脑里存着每个音程的运动模板；和声音程靠融合感，两音一起响时泛音会重叠，纯五度、八度几乎化成一体，三全音则互相打架所以要分开练，先旋律后和声。听辨有三个抓手：一是参考曲，二是唱名（把下方音当 do 唱上去），三是数半音，只用来校验不用来猜。最有效的捷径是转位法——大六度、小六度、大七度、小七度这类宽音程，把下方音翻高八度，就变成小三度、大三度、小二度、大二度，判断准确率立刻翻倍。易混点集中在三组：大三度对小三度、大六度对小六度、纯五度对三全音。",
    pro: "音程的定量定义是半音数：m2=1、M2=2、m3=3、M3=4、P4=5、三全音=6、P5=7、m6=8、M6=9、m7=10、M7=11、P8=12。转位规律是二者相加为 9，性质上大变小、小变大、纯变纯、增变减，所以 M6（C-A）转位是 m3（A-C），m7（C-B♭）转位是 M2（B♭-C）。听辨顺序：先判远近（二、三度为窄，六、七度为宽），宽音程一律翻成窄音程再判；再判明暗（大三、大六、大七偏亮，小三、小六、小七偏暗）；最后用半音数校验。和声音程有额外线索：不协和音程有明显的粗糙拍频（如 m2 在 C4 附近的拍频约 16 赫兹），完全协和音程几乎无拍频。训练法是二声部听写：教师弹两个声部，学生分别写出上、下声部，再标出每对音的音程，这是把单音程能力迁移到实际音乐的唯一途径。",
    realWork: "真曲锚点：大二度用《生日快乐歌》前两音 C–C–D，级进最容易辩识；纯五度用莫扎特《小星星变奏曲》K.265 的第二音到第三音；大三度下行用贝多芬《第五交响曲》Op.67 开头的 G–G–G–E♭，同一动机在《第九交响曲》Op.125 第四乐章《欢乐颂》主题中以 E–E–F–G 的级进方式反向出现；小六度上行用约翰·威廉姆斯《星球大战》主题（Main Title）第二音到第三音的跳进；三全音用伯恩斯坦《西区故事》Maria 的开头；大七度用《Over the Rainbow》Somewhere 之后的旋律落点。把这些曲子按半音数排序做成一个音程库，听到陌生音程时先还原成库中曲子再判，是专业院校通用的做法。",
    application: "训练分三段。第一段·单音程速判：每天选两个相邻性质的音程（如 M3 与 m3），各弹 15 次，先口头报性质再对答案，要求 20 秒内完成一轮；错一题就唱三遍。第二段·转位迁移：弹宽音程时强制自己把下方音翻上八度，在小三度或大二度上确认，再回原音程复核，练十天可脱离翻唱。第三段·二声部听写：用巴赫《安娜·玛格达莱娜笔记本》中的《G 大调小步舞曲 BWV Anh.114》前八小节，先写出上声部，再写下声部，最后标每拍的音程。全部做完后再跟原谱逐音核对，重点看错在性质还是错在远近——错在性质说明明暗感没建立，错在远近说明需要重练转位。",
    practice: "打开任意虚拟钢琴，用 C4=60 起做三件事：① 弹 60-62-64-65-67-69-71-72 上行，边弹边报性质（M2、M2、m2... 注意 64-65 是小二度）；② 只弹首尾两音共 10 组（如 60/68、60/71、60/66），用翻上八度法判性质；③ 弹 60 与 65 同时响，再弹 60 与 66 同时响，体会协和与三全音的刺耳差别，各听五遍。全程录音，回听时检查有没有把大小性质说反。",
    audio: {"type":"seq","notes":[{"m":60,"d":0.4,"gap":0.45},{"m":62,"d":0.4,"gap":0.45},{"m":64,"d":0.4,"gap":0.45},{"m":65,"d":0.4,"gap":0.45},{"m":67,"d":0.4,"gap":0.45}]}
  },
  "ear-chord": {
    simple: "和弦听辨先分性质再分转位。性质的差别主要在中音：大三和弦的 C-E-G 明亮稳定，小三和弦的 C-E♭-G 暗而柔和，减三和弦 C-E♭-G♭ 明显向内收缩、有压迫感，增和弦 C-E-G♯ 向外扩张、悬而未决。七和弦在色彩上加一层：大七 C-E-G-B 是慵懒的爵士抒情色，属七 C-E-G-B♭ 带明确的不稳定与解决欲，小七 C-E♭-G-B♭ 温和偏中性，半减七 C-E♭-G♭-B♭ 尖锐暗淡，减七 C-E♭-G♭-A 极度紧张且四个转位听起来一样。转位决定低音位置：和弦音里谁在最底下，就是第几转位。听的时候按三遍法——第一遍只看大小明暗，第二遍找有没有七音与它的紧张度，第三遍把注意力降到最低音定转位。",
    pro: "性质判定的技术顺序：先听三音（大三度或小三度），再听五音（纯五、减五、增五），最后听七音。C 上九种常用性质的音程结构为：M=[0,4,7]、m=[0,3,7]、dim=[0,3,6]、aug=[0,4,8]、M7=[0,4,7,11]、7=[0,4,7,10]、m7=[0,3,7,10]、m7♭5=[0,3,6,10]、dim7=[0,3,6,9]。减七和弦由四个连续小三度堆叠，每 3 个半音重复一次结构，所以听不出转位，只能靠解决方向判断。转位判定靠外框音程：第一转位是低音到最高音的六度，且下方是三度、上方是四度（如 E-G-C，E-G 为小三度，G-C 为纯四度）；第二转位同样是六度，但下方四度、上方三度（G-C-E）；七和弦第三转位的外框是二度（B-C 在 C7/B 中）。训练法：在固定低音 C 上依次弹九种性质做横向对比，再把根音移到 F、G 各弹一遍，消除对具体音高的依赖。",
    realWork: "真曲里的和弦色彩：贝多芬《升 c 小调第十四钢琴奏鸣曲》（月光）Op.27 No.2 第一乐章，右手三连音琶音铺开的始终是小三与减三交替的暗色，主和弦上不出现任何明亮的大三度，这是小调色彩的教科书；肖邦《e 小调前奏曲》Op.28 No.4 每小节换一个和弦，属七之后接半减七与大七，色彩一节比一节收缩，最后停在同名大调的 E 大三和弦上（皮卡迪三度）；德彪西《月光》（Suite Bergamasque 第三首）大量使用大九和弦与平行和弦进行，没有功能解决，靠音色本身制造明暗；披头士 Let It Be（1970）的 C-G-Am-F 是四种常用色彩的并置，副歌前那句 And when the night is cloudy 的 Am 是所有色彩中最暗的一块。",
    application: "训练分三步走。第一步·明暗二选：只弹大三与小三，各 20 次随机，闭眼举手示意，目标正确率 95% 以上，做不到就跟着唱 do-mi 与 do-me 各十遍。第二步·九宫格对比：在 C 上依次弹 M、m、dim、aug、M7、7、m7、m7♭5、dim7，每个弹三遍，边弹边口述结构（如大七：大三加纯五加大七），用语言固化听觉。第三步·转位专项：弹 C-E-G、E-G-C、G-C-E 三种排列各十次，先说出低音音名再说转位；接着用属七做同样练习，注意第三转位外框是二度，最容易漏听。每天二十分钟，两周后拿任意流行歌的前四个和弦做听写，判性质与转位，再与网上的和弦谱对照。",
    practice: "今天在 C4 基准上做三组：① 弹 [60,64,67]、[60,63,67]、[60,63,66]、[60,64,68]，判断大、小、减、增；② 弹 [60,64,67,71]、[60,64,67,70]、[60,63,67,70]，判断大七、属七、小七；③ 弹 [64,67,72]、[67,72,76]，说出低音音名与转位。每组打乱顺序弹五轮，先说答案再看屏幕。最后打开肖邦《e 小调前奏曲》Op.28 No.4 的录音，跟着数出前八个小节的色彩变化。",
    diagram: {"root":60,"iv":[0,4,7,10]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":60,"iv":[0,3,7]},{"root":60,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]}],"step":1.1,"dur":1}
  },
  "ear-prog": {
    simple: "和弦连起来才有语法。调里每个和弦有固定身份：I、vi、iii 是稳定的主功能，IV、ii 是离开家的下属功能，V、vii° 是急着回家解决的属功能。听进行不看单个和弦好不好听，而看它在句子里的位置：开头的 I 建立中心，中间的 IV 或 ii 制造离开感，V 制造紧张，回到 I 才算收束。最常见的三条套路必须听到就能报出来——I–V–vi–IV（小调情歌万能进行）、ii–V–I（爵士最基本的收束语汇）、I–vi–IV–V（五十年代流行）。判断的低阶技巧是盯低音：低音连续下行或做四度上跳，进行的性质基本就确定了；高阶技巧是听属七里的三全音，G7 中的 B 与 F 互相拉扯，它一旦解决到 C 的 E，你就听到了属到主的整个过程。",
    pro: "功能体系为 T（I、vi、iii）、S（IV、ii、vi 在特定位置）、D（V、vii°、V7），标准运动方向是 T–S–D–T，反向 S–T 与 D–S 都属特殊。常用进行的罗马数字与低音走向：I–V–vi–IV 在 C 大调为 C-G-Am-F，低音 C-G-A-F，第三级下行加一个四度上跳；ii–V–I 为 Dm-G-C，低音 D-G-C 是两个连续四度上跳，属七中的三全音（F 与 B）解决到 C 与 E，是听感上最明确的收束；五十年代进行 I–vi–IV–V 低音 C-A-F-G。终止式四类：完全正格终止 IV–V–I（或 ii6–V–I）、变格终止 IV–I（阿门终止）、半终止以 V 收尾（前句几乎必然是半终止）、阻碍终止 V–vi（制造意外延长）。听辨训练法：先只写低音，再补罗马数字，最后标终止式，三步分开做，禁止边听边猜和弦。",
    realWork: "进行听辨的四段必听素材：披头士 Let It Be（ Lennon-McCartney，1970 年专辑 Let It Be）副歌为 C-G-Am-F，是最清晰的 I–V–vi–IV；爵士标准《Autumn Leaves》（Joseph Kosma 作曲，法文词 Jacques Prévert）通篇是 ii–V–I 的循环，Cannonball Adderley 1958 年版本中的钢琴前四小节即可听到连续的小七—属七—大七；科恩 Hallelujah（1984 年专辑 Various Positions）主歌为 I–IV–V–vi 的变形，用 IV 与 V 交替推迟主和弦出现；终止式用莫扎特《C 大调钢琴奏鸣曲》K.545 第一乐章呈示部结尾，G 大调上的完全正格终止把调性钉死，而展开部开头用半终止停在属和弦上制造悬疑。",
    application: "练习分三阶段，每阶段三天。阶段一·低音先行：任意选一首 C 大调流行歌，只听低音，用唱名写出根音走向，不看和弦；这个动作能建立功能感，因为 90% 的流行进行靠低音就能定下来。阶段二·罗马数字化：把同一首转成罗马数字（如 C-G-Am-F 写成 I-V-vi-IV），再移到 G 大调弹一遍确认听感一致，说明你听到的是功能而不是固定音高。阶段三·终止式识别：找十首歌的乐句尾，判断是全终止、半终止还是阻碍终止，特别注意阻碍终止——它听起来像被骗了一下，情绪延长，是作曲家最常用的拖延手段。全程用手机录下自己的答案再回放核对，别凭印象记对错。",
    practice: "以 C 大调做四组对比听写：① C-G-Am-F；② Dm-G-C；③ C-Am-F-G；④ F-G-C-G-Dm-G-C。每组弹三遍，第一遍只写低音音名，第二遍补罗马数字，第三遍标出终止式类型（全终止、半终止、阻碍终止）。全部写完对照分析：第 ④ 组前四音是变格终止加半终止，后四音是完全正格终止。接着打开 Let It Be 原曲，在副歌处跟着唱出根音走向 do-sol-la-fa。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "ear-mode": {
    simple: "调式判断分三步：先找主音，再看主音上方的三度，最后看特征音。找主音有四个线索——全曲最后一个音、最长的音、反复出现的音、低音的落点，四个线索重合时基本没错。三度决定明暗族：主音上方是大三度，属于大调族；是小三度，属于小调族。特征音决定是哪一种：自然大调没有变化音；和声小调升了第七级，会听到导音往主音挤，并且第六级到第七级之间出现刺耳的增二度；旋律小调上行把六级七级都升高；多利亚调式是小调但六级是大六度，听起来不那么苦；弗里几亚调式主音上方是小二度，有浓重的异域感；利底亚调式是升四级，亮得发飘；混合利底亚是降七级，像大调却总不落地。五声调式最简单——全曲没有半音，也没有三全音。",
    pro: "七种中古调式以白键排列说明：伊奥尼亚 C-D-E-F-G-A-B（同大调）、多利亚 D-E-F-G-A-B-C（小三度＋大六度，特征音 B）、弗里几亚 E-F-G-A-B-C-D（小三度＋小二度，特征音 F）、利底亚 F-G-A-B-C-D-E（大三度＋增四度，特征音 B）、混合利底亚 G-A-B-C-D-E-F（大三度＋小七度，特征音 F）、爱奥利亚 A-B-C-D-E-F-G（同自然小调）、洛克里亚 B-C-D-E-F-G-A（减五度，主和弦为减三和弦，几乎不能建立中心）。小调的三种形态：自然小调 A-B-C-D-E-F-G；和声小调 A-B-C-D-E-F-G♯，F–G♯ 为增二度（3 个半音），导音 G♯ 上行小二度解决到 A；旋律小调上行 A-B-C-D-E-F♯-G♯，下行还原。五声调式宫商角徵羽在 C 上分别为 C-D-E-G-A、D-E-G-A-C 等，结构为两个大二度加一个小三度，没有小二度与三全音，所以听感平缓。判断流程：定主音 → 听主音上方三度 → 找唯一的变化音 → 对照特征音表定名。",
    realWork: "真实曲目是最好的调式教材：《Scarborough Fair》英国民谣（Simon & Garfunkel 1966 年录音）为多利亚调式，小调底色却因大六度而不阴暗；《What Shall We Do with the Drunken Sailor》同为多利亚，是这种调式最典型的行进感；德彪西《亚麻色头发的少女》（Préludes 第一集第八首）用五声音阶写成，通篇无半音，是全音与五声色彩的代表；中国民歌《茉莉花》为五声徵调式，骨干音 do-re-mi-sol-la 缺四级七级；巴赫《d 小调托卡塔与赋格 BWV 565》开头用和声小调的增二度与导音制造哥特式紧张；柴可夫斯基《第六交响曲 悲怆》Op.74 第一乐章副部主题转入大调，可对照听同一部作品内大小调式的色彩落差。",
    application: "训练法分四步。第一步·主音定位：听任何旋律先哼出最后一个音，再哼最长音，二者一致即主音，用十首民谣练到十秒内定位。第二步·三度定性：主音确定后，在键盘上找主音上方的大三度与小三度，判断旋律里出现的是哪一个，定出大调族或小调族。第三步·找变化音：把旋律的音级按音阶排出来，找出唯一那个不对劲的音——升高七级是和声小调，升高四级是利底亚，降低七级是混合利底亚，降二级是弗里几亚。第四步·五声速判：如果全曲听不到任何半音关系，直接判五声，再按主音定宫商角徵羽。每日用两首风格差异大的曲子做四步流程，一周后可稳定分辨多利亚、和声小调与五声调式。建议用手机录下自己的判断理由，回放时检查是否靠猜。",
    practice: "今天任务：在键盘上依次弹出并听辨五条音阶——C-D-E-F-G-A-B-C（伊奥尼亚）、D-E-F-G-A-B-C-D（多利亚，注意 B 这个大六度）、E-F-G-A-B-C-D-E（弗里几亚，注意 F 这个小二度）、F-G-A-B-C-D-E-F（利底亚，注意 B 这个增四度）、G-A-B-C-D-E-F-G（混合利底亚，注意 F 这个小七度）。每条弹两遍，第二遍后说出调式名与特征音。然后打开《Scarborough Fair》与《茉莉花》，写出各自调式与主音音名。",
    audio: {"type":"seq","notes":[{"m":62,"d":0.35,"gap":0.38},{"m":64,"d":0.35,"gap":0.38},{"m":65,"d":0.35,"gap":0.38},{"m":67,"d":0.35,"gap":0.38},{"m":69,"d":0.35,"gap":0.38},{"m":71,"d":0.35,"gap":0.38},{"m":72,"d":0.35,"gap":0.38},{"m":74,"d":0.7,"gap":0.75}]}
  },
  "an-deconstruct": {
    simple: "解构一首曲子是把它当成多层录音逐层剥离：先只听低音层，再只听旋律层，再听中间填充的和声层，然后听节奏层，最后听音色层。每层单独听三遍，你会发现平时混在一起的东西其实各有各的走向。织体是最先要判定的——只有一条旋律加伴奏的是主调织体（绝大多数流行歌），几条旋律同时平等进行的是复调（巴赫的赋格），只有一个声部的是单声部（无伴奏的格里高利圣咏）。接着看和声多久换一次（一个和弦铺四小节与每拍换和弦是完全不同的速度感），看旋律的音程型（级进为主还是跳进为主），看节奏的密度与重音位置，看配器把旋律交给谁（人声、小提琴还是钢琴）。五层信息全部拿到，这首曲子在你耳朵里就从一团声音变成了一张图纸。",
    pro: "标准解构模板按六层记录。织体层：判定类型（单声、主调、复调、支声、齐奏），记下伴奏音型名称（阿尔贝蒂低音、柱式、分解琶音、walking bass、持续音、固定音型 ostinato）。和声层：标罗马数字，计算和弦节奏（每小节几个和弦），找出终止式与主持续音位置。旋律层：提取动机细胞，记录音程型（级进、跳进、琶音比例）、音域、高点位置（通常在黄金分割点或句尾前一小节）、旋律线走向（拱形、阶梯、下坠）。节奏层：记下基本律动、切分位置、单位拍内细分、多节奏或赫米奥拉。配器与音色层：记旋律由什么乐器承担、有无重叠八度、力度布局、踏板与残响。空间与制作层（录音作品）：声像、层次前后、混响量。输出格式统一为一段两百字左右的层析笔记，每层一句，结论一句。",
    realWork: "用三首作品练分层听。贝多芬《升 c 小调第十四钢琴奏鸣曲（月光）》Op.27 No.2 第一乐章：右手三连音分解和弦（织体层）＋最上方的旋律音（旋律层）＋低音的持续根音（和声层），速度缓慢到几乎听不到拍点，是最容易分层的入门材料。拉威尔《波莱罗》：全曲只有两个旋律与一个不变的固定节奏型，配器每一段换一组乐器，是练习配器层的绝佳样本。皇后乐队 Bohemian Rhapsody（1975，A Night at the Opera）：民谣段、歌剧段、硬摇滚段、收束段四段拼贴，各段织体与和声速度截然不同，适合练段落层的划分与整体结构的理解。",
    application: "实操六步。① 准备可分段播放的音频与同步谱子，选八到十六小节范围，不要一次分析全曲。② 第一遍只跟最低音，用唱名哼出低音线。③ 第二遍只跟最高音，同样哼出来。④ 第三遍听中间的填充声部，数出一个单位拍里有几个音。⑤ 第四遍关掉谱子，只描述声音的明暗与远近（是干的还是湿的、靠前还是靠后）。⑥ 把五遍的记录写成分层笔记，每层不超过两句话，最后写一句结论：这首曲子最核心的一层是什么。想要快速提升，就坚持每次只分析十六小节但做满六步，比通篇泛听有效十倍。分层笔记可以统一存成一个表格，横向是作品，纵向是六个层，逐渐积累自己的听觉数据库。",
    practice: "选肖邦《降 E 大调夜曲》Op.9 No.2 的前八小节，开音频反复听五遍，每遍只盯一层，分别写出：低音走向的音名、旋律的音程走向（级进或跳进）、伴奏的节奏型、和声更换频率、音色的明暗与 pedal 使用感受。写完后打开谱子逐项核对，看哪一层的记录偏差最大，那一层就是你听觉上的薄弱环节，接下来三天专门练这一层的单独听辨。",
    diagram: {"root":63,"iv":[0,3,7]}
  },
  "an-form": {
    simple: "结构分析的本质是回答一个问题：这段音乐从哪里到哪里是一块，凭什么这么划。划分依据有五条，按可靠程度排序：一是终止式，全终止落 I 是块结束的最强信号，半终止落 V 是中间停顿；二是织体变化，伴奏音型一换基本就是新段；三是材料关系，出现全新旋律是新段，原旋律加花变奏是同一段；四是调性，转调或离调的边界常常就是段落边界；五是长度比例，古典风格里四小节一句、八小节一段、十六小节一个乐段是默认的呼吸单位。最常用的单位是乐句——通常四小节，像一句话有起有收；两个乐句组成乐段，前者停在不稳定的属，后者停在稳定的主，形成问与答。把一首曲子划成 a、b、c 并标上重复与变化，曲式名就自然出来了。",
    pro: "乐句判定的技术标志：长度多为 4 或 8 小节；结尾有呼吸（休止、长音、织体变薄）；两句之间常构成平行（a+a′，后句同头换尾）、对比（a+b）、模进（a 在另一高度重现）。乐段由两句组成，前句落半终止或 I6，后句落全终止。常见曲式：一部曲式（单乐段）、二部曲式（A-B，巴洛克舞曲常见，B 段末尾常回头再现 A 的材料）、三部曲式（A-B-A，B 段为对比中段）、回旋曲式（A-B-A-C-A，主题至少出现三次）、变奏曲式（A-A1-A2-A3，骨架不变，装饰、织体、调式逐次变化）、奏鸣曲式（呈示部—展开部—再现部，呈示部内含主部与副部的调性对立，再现部把副部拉回主调）。分析时先划句，再定段，最后定曲式；所有边界必须能在谱面上指到小节号并说明依据，禁止凭感觉划线。",
    realWork: "四首标准样本：莫扎特《C 大调钢琴奏鸣曲》K.545 第一乐章是奏鸣曲式的最小样本，主部 C 大调八小节，连接部推向属调，副部在 G 大调，展开部以主部材料在下属方向游走，再现部把副部拉回 C 大调。贝多芬《致爱丽丝》（Für Elise, WoO 59）为回旋曲式 A-B-A-C-A，主题每次原样回来，两个插部性格鲜明。巴赫《G 大调小步舞曲 BWV Anh.114》是标准二部曲式，每段八小节且各自重复。舒曼《童年情景》第七首《梦幻曲》（Träumerei）为带再现的三部曲式，中段转入 F 大调与 g 小调形成色彩对比，最后回到 C 大调的第一句。四首覆盖了古典四种最常用曲式，逐一拆过一遍后，听到新曲子基本能在一分钟内报出结构。",
    application: "练习按四步。① 拿谱不看分析，先按呼吸划竖线，只凭听觉把谱子切成若干四到八小节的块，每块标一个字母。② 逐块看终止式，把落 V 的标半终止、落 I 的标全终止，检查你的竖线是否落在终止点上，落不上的说明划错了。③ 比较各块的开头两小节，材料相同标同一字母加撇号，完全不同的换字母。④ 把字母串成公式（如 A-B-A 或 A-A′-B-A″），再对照教科书曲式表定名。提速技巧：先听全曲记下主题出现几次、每次在几分几秒，这个时间轴就是结构骨架，再回谱上找对应小节。每天拆一首短曲（一到两分钟），连续两周，听到任何作品都能在两遍之内说出它的结构公式。",
    practice: "任务：拆莫扎特 K.545 第一乐章呈示部（第 1 至 28 小节）。具体做：① 在第 1-4、5-8、9-12、13 小节起划出乐句边界并说明理由；② 标出第 8 小节与第 12 小节分别落在什么和弦上（半终止还是全终止）；③ 找出第 13 小节之后的副部主题，写出它的调性与主部主题的调性关系；④ 用字母公式写出呈示部结构。做完对照任一版本的奏鸣曲式分析图检查，重点看你有没有把连接部误当成副部。",
    diagram: {"root":60,"iv":[0,4,7]}
  },
  "an-harm": {
    simple: "和声分析是把每个和弦翻译成罗马数字，让你看出它们之间的功能关系，而不是一堆孤立的音响。规则很简单：以调式音级为根音建和弦，大三和弦用大写罗马数字（I、IV、V），小三和弦用小写（ii、iii、vi），减三和弦加一个圈（vii°）。转位用数字标记：三音在低音写 6，五音在低音写 6/4，七和弦分别写 7、6/5、4/3、4/2。做完标注后看功能圈：主（I、vi）稳定，下属（IV、ii）离开，属（V、vii°）紧张并需要解决，标准线路是 I–IV–V–I 或 I–ii–V–I。离调是分析里最常见的难点——出现一个不属于本调的和弦时，先问它是不是某个临时主和弦的属，比如 D-F♯-A 在 C 大调里是 V/V，意思是 G 大调的属，下一个和弦八成是 G。能认出离调，你的分析才真正进入专业层面。",
    pro: "罗马数字分析的技术要点：先定调（看调号与实际出现的变音，小调要区分自然、和声、旋律三种形态），再定级（看和弦根音在音阶的第几级），最后定结构与转位（看各音之间的音程与低音位置）。功能体系（德国功能理论）记号为 T、S、D，大调用大写、小调用小写，如 t、s、d；副属和弦记为 D 到某个临时中心，如 V/V（D→D）、V/vi、V/ii，重属 DD 即 V/V，常以 DD7 与 DD6/5 出现；那不勒斯和弦为降二级大三和弦（♭II，小调中记 N6，多用第一转位）。离调识别流程：遇到含变音的和弦 → 找出它的临时属音目标（向上纯四度或向下纯五度的那个音）→ 确认后一和弦是否落在该目标 → 若是则标 V/x。持续音（主持续、属持续）上方的和弦照常分析，不要被低音干扰。所有标注要同时写出罗马数字与功能记号两套，互相校验。",
    realWork: "四段经典分析材料：巴赫《平均律键盘曲集》第一册 C 大调前奏曲 BWV 846，表面是分解琶音，实际每半小节一个和弦，从 I 出发经过大量离调与属持续回到主，是练习透过音型看骨架的最佳材料；莫扎特 K.545 第一乐章连接部的 V/V–V–I 是最清晰的离调链路；肖邦《c 小调前奏曲》Op.28 No.20（葬礼进行曲式的和弦进行）通篇是主与属的拉锯，最后以皮卡迪三度结束，适合看功能极端简化时音乐如何靠织体维持张力；舒曼《梦幻曲》开头四小节是 I–V/V–V–I 的标准句型，第二句出现 V/vi 与阻碍终止，是把离调与终止式结合起来的标准范例。",
    application: "五步练成。① 先背熟大调七个自然音级和弦的性质：I 大、ii 小、iii 小、IV 大、V 大、vi 小、vii° 减，小调为 i 小、ii° 减、♭III 大、iv 小、v 小（或和声小调的 V 大）、♭VI 大、♭VII 大。② 拿巴赫众赞歌（371 首四声部众赞歌）做标注练习，每首只标罗马数字，一天一首，这是最经典的教材。③ 遇到含变音的和弦，一律先试离调解释（V/x），试不通再考虑借用和弦或那不勒斯。④ 标完检查和声进行是否落在功能圈路径上，出现连续两个属功能或反功能就要复查。⑤ 最后做减谱：把所有转位与非和弦音删掉，只留每小节的和弦骨架，用钢琴弹出来，看是否还像原曲——这是验证分析对错的终极测试。",
    practice: "今天在 C 大调上做三组标注练习：① 弹并写出 C-Dm-Em-F-G-Am-Bdim-C 的罗马数字；② 弹 C-D-F♯dim-G7-C，写出离调标记（第二个和弦应为 V/V）；③ 弹 Am-E7-Am 判断它是不是 C 大调的离调（结论是 vi 的临时属 V/vi）。每组弹三遍，边弹边说功能和声名。然后打开巴赫 BWV 846 前奏曲的谱子，标出前四小节的罗马数字，注意所有音都是琶音，要先还原成柱式和弦再判断。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":62,"iv":[0,4,7,10]},{"root":55,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]}],"step":1.1,"dur":1}
  },
  "cl-baroque": {
    simple: "巴洛克（约1600—1750）的音响建筑方式可以概括为一句话：低音决定和声，上方声部负责编织。通奏低音由一件低音乐器（大提琴、大管）加一件和声乐器（管风琴、羽管键琴）组成，作曲家只在低音下方写数字，6表示六和弦、6/5表示五六和弦，演奏者现场把和弦填出来，所以同一乐句每次演出的和弦排列都可能不同。旋律不是一条，而是几条地位相当的线互相模仿追逐，这就是对位；把这种模仿做成严密程序的是赋格：主题先单独陈述，答题在上方五度进入，其余声部以对题伴随，中间经过调性游走的间插段，最后回到主调。装饰音不是点缀而是语法，倚音、回音、颤音解决的是和声紧张度。组曲则把阿勒芒德、库朗特、萨拉班德、吉格串起来，用同一调性统一。",
    pro: "巴洛克的技术核心是调性对位与数字低音。规则层面：不协和音必须作为经过音、倚音或延留音出现在弱拍并级进解决，如V7的七音（C大调中的F）下行解决到E；终止式以低音下行五度（或上行四度）的V—I为正格终止，那不勒斯乐派常用的bII6—V带来弗里几亚半音色彩。赋格的结构要素是主题（Dux）与答题（Comes），答题常在属调作真实答题或守调答题（主题含C—G五度跳进时改为C—F以保持调性），间插段多用主题碎片作模进，密接和应在结尾前压缩声部进入的间距。舞曲组曲有固定模板：阿勒芒德4/4弱起流动十六分；库朗特3/4或3/8；萨拉班德3/4、重音常在第二拍、两段体；吉格6/8或12/8、常以模仿开始。数字低音标记4—3、6—5表示延留音的解决，这是辨认巴洛克的关键听觉线索。",
    realWork: "巴赫《d小调恰空》BWV1004（1720）第1—8小节：低音主题D—C#—Bb—A这个下行四音在随后两百多小节里被连续变奏三十次，第9小节起进入分解和弦织体，第121小节前后转入D大调形成全曲亮度顶点。赋格看《平均律》第一卷《c小调赋格》BWV847：主题为C—Eb—G—F—Eb—D—C，答题在g小调，第14—21小节出现密接和应。组曲听巴赫《法国组曲》BWV816或亨德尔《水上音乐》(1717)。",
    application: "把巴洛克手法用起来分四步。第一步建骨架：写一条八小节低音线，只用I、IV、V、vi四个和弦，让低音尽量走四度上下行（如C—G—a—E—F—C—F—G），再在上方补一条简单对位旋律，逐个音程检查有没有平行五度。第二步改成二声部模仿：让第二声部在第2小节用上五度重复第一声部前两小节，形成赋格式的追逐感。第三步加装饰：在旋律长音前插入倚音并级进解决，在终止处加颤音，回音写在下行三度处。第四步节奏化：把这段旋律改写为6/8的吉格，或改写为重音落在第二拍的3/4萨拉班德。",
    practice: "动手任务：在d小调用通奏低音思维写八小节，低音只写音名不写和弦，然后自己把和弦弹出来；再听巴赫BWV847赋格前20小节，边听边用铅笔在谱上标出主题出现的四个声部位置。第二天把BWV1004恰空第1—16小节移到大调重弹，比较色彩差异。",
    diagram: {"root":62,"iv":[0,3,7]},
    audio: {"type":"seq","notes":[{"m":50,"d":0.7,"gap":0.75},{"m":49,"d":0.7,"gap":0.75},{"m":46,"d":0.7,"gap":0.75},{"m":45,"d":0.9,"gap":0.95}]}
  },
  "cl-classic": {
    simple: "古典主义（约1750—1820）追求的是听得懂的复杂。一句两小节的动机，通过模进、倒影、分裂、扩大，可以撑起一个十分钟的乐章——这种靠材料自身生长而非不断更换旋律的写作叫动机发展，海顿把它变成主力手段。句法被标准化：两小节乐节加两小节乐节组成四小节乐句，两句一问一答组成八小节乐段，问答之间用半终止（属和弦）与全终止（主和弦）区分。和声节奏被大幅放慢，一个和弦往往持续整整一小节甚至两小节，块面清晰、方向明确。奏鸣曲式把这些装进戏剧框架：呈示部给出主调与属调两个对比主题群，展开部把材料拆碎并在多个调之间游走，再现部让两个主题重新统一到主调，尾声作最终确认。",
    pro: "技术规格：和声节奏通常为每小节或每两小节一个和弦，终止式公式化——半终止为V（常以K46装饰），完全正格终止为K46—V7—I，阻碍终止V—vi用于延长。呈示部主部在主调，连接部通过共同和弦转调并在属调上作V的延长（属准备，常占8—16小节），副部在属调，小调作品通常在III级关系大调（如贝多芬《第五交响曲》c小调第一乐章副部在bE大调）；展开部调性游走以三度下行链为常见（C—a—F—d—Bb—g），再现部副部回归主调，这就是调性和解的技术定义。动机发展四大手法为模进、分裂（取动机后两音反复）、倒影、增值与减值。莫扎特K.545第一乐章第1—4小节的阿尔贝蒂低音（C—G—E—G）是古典伴奏织体的标准件。",
    realWork: "莫扎特《C大调钢琴奏鸣曲》K.545（1788）第一乐章：第1—4小节主部主题配阿尔贝蒂低音，第5—8小节模进，第13—14小节出现G大调半终止，副部自第15小节起在G大调，展开部第29小节起进入g小调、a小调，再现部第42小节回主调。贝多芬《第五交响曲》Op.67（1808）第一乐章：第1—2小节的三短一长动机G—G—G—Eb，第6小节模进，第21小节分裂为两音反复，第63小节起的展开部几乎只用这一个动机。",
    application: "练习按三步推进。第一，先把和声节奏放慢：写一个八小节乐句，规定每小节只能用一个和弦，顺序固定为I—I—V—V—I—IV—V—I，逼自己用节奏与织体而不是换和弦来制造变化。第二，造一个两音或三音的动机（如C—Eb—F），在接下来的八小节里依次做模进、倒影、只取后两音反复，不允许引入任何新的旋律材料。第三，搭奏鸣曲骨架：主部8小节C大调，连接部8小节以G大调属和弦延长收束，副部8小节G大调，展开部取主动机在a小调、F大调各走8小节，再现部把副部整段移回C大调。",
    practice: "任务：用C大调按I—I—V—V—I—IV—V—I写八小节旋律，只准使用一个两音动机；完成后听莫扎特K.545第一乐章前12小节，标出每小节的和弦，验证和声节奏是否真的一小节一个。再听贝多芬《第五交响曲》第一乐章第1—21小节，数出动机一共出现几次、分别作了什么变形。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]}],"step":0.8,"dur":0.75}
  },
  "cl-rom": {
    simple: "浪漫主义（约1820—1900）做的一件事是把古典时期被压住的个人情绪与不稳定音响全部释放。和声上半音被大量使用，一个调里的十二个半音都可以临时借用，转调不再局限近关系，常常几小节之内滑到远关系调，主和弦被一拖再拖，听感上永远在路上、永不落地。结构上奏鸣曲式被撑大，也出现了单乐章的标题交响诗、加合唱的交响曲、以及几十首短曲组成的钢琴套曲。文学、绘画、民间传说直接进入音乐，柏辽兹《幻想交响曲》带着明确的故事与人物，李斯特《前奏曲》以拉马丁的诗为题。演奏技术被推到极限：帕格尼尼的小提琴、李斯特的钢琴、后来的拉赫玛尼诺夫，把乐器性能本身当作表达手段，炫技成为内容而不是装饰。",
    pro: "浪漫语汇是可列的：借自同主音小调的bIII、bVI、bVII（C大调中为Eb、Ab、Bb）；那不勒斯六和弦bII6（C大调为F—Ab—Db）；三种增六和弦——意大利增六（Ab—C—F#）、法国增六（Ab—C—D—F#）、德国增六（Ab—C—Eb—F#），共同点是低音Ab与其上方小二度音F#向外扩张到八度并解决到V；等音转换（把德国增六Ab—C—Eb—F#改写为Ab—C—D#—F#）可在两小节内从C大调进入E大调；三度关系的调性布局（C—E—Ab）取代古典的五度关系。曲式上出现奏鸣曲式与套曲的混合（李斯特交响诗）与循环形式（柏辽兹《幻想交响曲》的固定乐思在五个乐章反复变形）。",
    realWork: "瓦格纳《特里斯坦与伊索尔德》前奏曲（1865）第1—3小节的特里斯坦和弦F—B—D#—G#，功能上指向E的属，却解决到另一个不协和的B7，全曲直到结尾才落到B大调，是调性被无限延宕的教科书。肖邦《c小调前奏曲》Op.28 No.20（1839）只有13小节，和弦密度极高，第5小节出现阻碍解决。李斯特《前奏曲》（1854）第1—4小节的C大调三音动机，后面变形为抒情主题与进行曲。",
    application: "要写出浪漫色彩，不必堆音符，关键是改三处。第一，把属和弦替换成增六：在去属和弦之前插入Ab—C—F#（C大调），让低音Ab下行到G、F#上行到G，立刻获得瓦格纳式的张力。第二，用同主音小调借和弦改写终止：把V—I换成bVI—V—I（Ab—G—C），或bII6—V—I（F—Ab—Db 接 G—B—D），色彩立刻变暗。第三，做等音转调：把目标调的德国增六当作当前调的属七，两小节完成远关系转调。第四，结构上让同一主题在三个场景变形出现——慢速抒情、快速炫技、进行曲各一次，音程骨架不变而节奏织体全换。",
    practice: "任务：在C大调写出V—I终止，然后分别改写为bVI—V—I、bII6—V—I、以及Ab—C—F#增六接V—I三种版本，逐个弹出来并按紧张度排序；再听瓦格纳《特里斯坦》前奏曲前三十秒，记录主和弦第一次明确出现是在第几秒。用手机录音自测并回听。",
    diagram: {"root":57,"iv":[0,3,7]},
    audio: {"type":"chord","root":53,"iv":[0,6,10,15],"dur":2.4}
  },
  "cl-imp": {
    simple: "印象主义（约1890—1915，以德彪西为中心）处理的是功能失效之后还能靠什么组织音乐，答案是用色彩替代引力：和弦不再靠属到主的倾向推动，而靠音色与音程本身的明暗排列。全音阶把八度均分为六个全音（C—D—E—F#—G#—A#），因为音程全都一样，就没有导音，也就没有必须解决的方向感；平行和弦让一串和弦保持相同结构整体平移，像同一块颜色被刷过去；五声音阶与中古调式（多利亚、利底亚）被大量借用，以避开大调小调的习惯听感。旋律被拆成短小碎片而不是长线条，配器上用弱奏、泛音、竖琴滑奏、木管独奏制造朦胧光晕，节奏上刻意避免重音，让拍点变得模糊。",
    pro: "技术清单：全音阶无半音、无导音、无纯五度（只有三全音），因此无法建立调中心，德彪西用它作瞬间的色彩漂浮。平行进行：九和弦、十一和弦整体平行移动，被学院规则禁止的平行五度在此成为正当音响（德彪西《沉没的教堂》第1—13小节）。调式上利底亚升四度（C—F#—G）、多利亚大六度（C—E—A）。和声大量使用附加音和弦（加六、加九，如C—E—G—A—D）、不解决的九和弦、三全音的直接并置。曲式避免奏鸣曲式的冲突逻辑，倾向ABA或拼贴式并置；终止式用主和弦加二度或九音（C—D—E—G）替代V—I。节奏上弱起、模糊节拍、复合拍（5/4、15/8）常见，拉威尔《帕凡舞曲》可作对照。",
    realWork: "德彪西《牧神午后前奏曲》（1894）第1—4小节：长笛独奏的半音下行主题C#—C—B—Bb—A，落在E大调与模糊调式之间，第11—13小节出现加九和弦的平行进行，全曲没有一次明确的V—I终止。德彪西《前奏曲》第一集《帆》（1910）除第42—46小节外几乎全用全音阶，低音持续在Bb上作持续音。拉威尔《帕凡舞曲》（1899）第1—8小节用G大调七和弦的平行链。三首并置听，可以清楚感到没有解决也照样成立的美学。",
    application: "四个可操作手法。第一，做平行链：写一个大九和弦（C—E—G—B—D），让整块音型在半音或全音上平移六次，不做任何解决，这是印象派最标志性的声音。第二，用全音阶写旋律：从C出发只用C—D—E—F#—G#—A#，注意不要出现小二度，配和弦时用增三和弦（C—E—G#）。第三，改终止式：把V—I换成I加九音（C—E—G—D）或bVII—I（Bb—D—F 到 C—E—G），避免导音出现。第四，音色优先：把旋律放在长笛或竖琴音区，用弱奏、延音踏板与长混响，让和声边界彼此模糊。",
    practice: "任务：在C上用全音阶写八小节旋律，和声只用增三和弦作平行移动；再写一段大九和弦平行链并录下来。然后听德彪西《帆》前三十秒，判断哪些段落是全音阶段落、第42—46小节为何突然出现半音，并把这个半音片段在钢琴上找出来。",
    diagram: {"root":60,"iv":[0,4,7,11]},
    audio: {"type":"seq","notes":[{"m":60,"d":0.9,"gap":0.95},{"m":62,"d":0.9,"gap":0.95},{"m":64,"d":0.9,"gap":0.95},{"m":66,"d":0.9,"gap":0.95},{"m":68,"d":0.9,"gap":0.95},{"m":70,"d":1.2,"gap":1.25}]}
  },
  "jz-blues": {
    simple: "布鲁斯是爵士与摇滚的共同母语，有三层固定结构。和声上是12小节循环：I和弦四小节，IV两小节回到I两小节，然后V—IV—I—V各一小节，F调即F7四小节、Bb7两小节、F7两小节、C7—Bb7—F7—C7。旋律音阶上是布鲁斯音阶：在小调五声音阶里插入一个降五度，F调为F—Ab—Bb—B（降五）—C—Eb，那个降五音是最关键的蓝音，它的张力来自与属七和弦七音的半音摩擦。形式上是三句歌词结构：第一句陈述，第二句重复，第三句回答。实际演奏中还有大量变体，爵士布鲁斯会加入ii—V、三全音替代与小调布鲁斯，让12小节变成和声密度极高的赛场。",
    pro: "以F调规范表述：第1—4小节F7，第5—6小节Bb7，第7—8小节F7，第9小节C7，第10小节Bb7，第11小节F7，第12小节C7作turnaround（常改为Gm7—C7或D7—Gm7—C7）。变体三层：简单变体把第2小节改为Bb7、第9—10小节改为Gm7—C7；爵士布鲁斯把第7—8小节改为Fmaj7—F#dim7—Fmaj7—Am7—D7，第10小节改为Abm7—Db7形成连续三全音替代下行；小调布鲁斯以i7与iv7为主（Fm7—Bbm7），常加入bVI7（Db7）。蓝音的微观机制：降五音（C调为Gb）与五音G形成半音，降三音与三音、降七音与六音同理，演唱与演奏中常用滑音与推弦在半音区间内游走而不是固定在某个音高上。",
    realWork: "Charlie Parker《Blues for Alice》（1951）是爵士布鲁斯教科书：第1小节Fmaj7，第2小节Em7—A7，第3小节Dm7—G7，第4小节Cm7—F7，第5—6小节Bb7，第7—8小节Fmaj7—F#dim7—Fmaj7—Am7—D7，第9小节Gm7—C7。对照 B.B. King《The Thrill Is Gone》(1969)：F小调，第5小节Bbm7与第9小节Db7是标准小调语汇，吉他推弦落在F与Gb之间。再听 Miles Davis《All Blues》（1959）6/8拍的G7循环。",
    application: "四步把布鲁斯用起来。第一，把12小节的根音走向背到能不看谱弹出（F调为F F F F / Bb Bb F F / C Bb F C）。第二，旋律只用布鲁斯音阶的五个音，重点练降五到五、降三到三这两个半音滑音，每个乐句必须以蓝音结束或至少经过蓝音。第三，加和声密度：把第9小节的C7换成Gm7—C7，第10小节换成C#7作三全音替代，第12小节换成D7—Gm7—C7的turnaround。第四，按AAB结构造句：一句说两遍再作回答，第三句落在turnaround上，为下一位独奏者让出空间。",
    practice: "任务：F调12小节布鲁斯，右手只用布鲁斯音阶五个音，强制每个乐句至少用一次降五音；第二遍把第9—12小节按ii—V与三全音替代改写。听《Blues for Alice》前12小节逐小节写下和弦符号；再听《The Thrill Is Gone》第1—8小节，确认小调布鲁斯的i与iv出现在哪些小节。",
    diagram: {"root":53,"iv":[0,4,7,10]},
    audio: {"type":"prog","chords":[{"root":53,"iv":[0,4,7,10]},{"root":46,"iv":[0,4,7,10]},{"root":53,"iv":[0,4,7,10]},{"root":48,"iv":[0,4,7,10]}],"step":1,"dur":0.9}
  },
  "jz-iivi": {
    simple: "ii—V—I 是爵士中出现频率最高的三和弦组合，在C大调就是Dm7—G7—Cmaj7。它的力量来自低音的纯四度上行（或五度下行）：D—G—C，这是调性音乐中最强的方向感。同时三个和弦之间有两个半音牵引：G7的三音B与七音F构成三全音，F下行半音解决到Cmaj7的三音E，B上行半音解决到主音C；加上G7的七音F与Dm7的五音A构成共同音，声部连接可以极其平滑。掌握ii—V—I等于掌握一把钥匙：爵士标准曲里大量段落不过是这条进行在各调上的串联，独奏时只要能在任何调上立刻弹出ii—V—I的琶音，就能跟上任何一首曲子。",
    pro: "声部连接的标准做法是抓住三音与七音的骨架。以C大调为例，Dm7（D—F—A—C）到G7（G—B—D—F）时保留F不动使其成为G7的七音，C下行半音到B，A下行到G；再由G7到Cmaj7时F下行半音到E，B保持成为主和弦的七音或上行到C，D下行到C。常见变化：小调中把ii改为m7b5、V改为b9或b13（Bm7b5—E7b9—Am）；把V改为bII7作三全音替代（Db7替代G7，低音Db半音下行到C）；把I改为Imaj7、I6，或延伸成iii7—vi7—ii7—V7的下行五度链。小调ii—V中V7常取b9、#9、b13，对应音阶为和声小调第五调式（E—F—G#—A—B—C—D）。练习调序按五度圈在12个调上跑完一轮。",
    realWork: "Miles Davis《Tune Up》（《Cookin' with the Miles Davis Quintet》, 1956）全曲就是连续ii—V—I：A段第1—4小节Dm7—G7—Cmaj7—Cmaj7，第5—8小节Dm7—G7—Cmaj7—A7，第9—12小节回到Dm7—G7—Cmaj7。Jerome Kern《All the Things You Are》(1939) 第1—8小节的Fm7—Bbm7—Eb7—Abmaj7—Dbmaj7—Gm7—C7—Fmaj7，是四度上行的ii—V—I嵌套。",
    application: "训练按四步推进。第一，12个调的ii—V—I琶音：双手弹根—三—五—七，上行到七音后反向到九音，按五度圈C—F—Bb—Eb—Ab—Db—Gb—B—E—A—D—G练完一轮。第二，三音七音骨架：只弹Dm7的F—C、G7的F—B、Cmaj7的E—B，体会七音F如何保持再下行到E。第三，加变化：把V7改为G7b9（G—B—D—F—Ab），把ii改为m7b5做小调版。第四，即兴造句：第一小节用Dm7琶音上行，第二小节用G7的三音—降九—三音—降七环绕，第三小节落在Cmaj7的九音D再回主音C。",
    practice: "任务：按五度圈在12个调上弹ii—V—I的三音七音骨架，每天两轮，要求不看谱；再听《Tune Up》前八小节，写出Dm7—G7—Cmaj7出现的所有位置。第三天把每个V7换成三全音替代（Db7、Gb7），检查低音是否形成半音下行链，并在钢琴上弹出来验证。",
    diagram: {"root":62,"iv":[0,3,7,10]},
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]}],"step":1.2,"dur":1.1}
  },
  "jz-impro": {
    simple: "比波普（bebop，1940年代）把即兴从装饰旋律变成和声上的高速论述，语言有几个可识别特征。一是速度：常见200以上的快板，句子被拉长成不间断的八分音符流，只在和弦转换处换气。二是音阶：在音阶里插入一个半音经过音形成比波普音阶，大调音阶加一个升五度（C—D—E—F—G—G#—A—B），属七音阶加一个经过的七音，这样一串八分音符刚好能让和弦音落在正拍上。三是包围：不直接走向目标音，而是从上方半音、下方半音包抄过去，制造延迟解决的快感。四是引句：在独奏中突然嵌入其他曲子的旋律片段，作为与听众和乐手的玩笑。",
    pro: "具体规格：Bebop大调音阶为1—2—3—4—5—升5—6—7—8（C—D—E—F—G—G#—A—B—C），升五度作经过音使和弦音C—E—G—B稳定落在强拍；Bebop属七音阶为1—2—3—4—5—6—降7—7—8（G—A—B—C—D—E—F—F#—G），F#作经过音使下一拍回到根音G；属七b9上常用半音与全音交替的八音音阶（1—b2—#2—3—#4—5—6—b7）。句法上包围有三种形式：上方半音加目标音、下方半音加目标音、上下两端环绕（目标为G时可走A—F—G或F—A—G）；叠置指在Cmaj7上演奏A小三和弦琶音，等于弹出C6/9的九、十一、十三音；侧滑指在ii—V上临时以半音上方或下方的ii—V演奏再滑回。1945年前后 Charlie Parker 与 Dizzy Gillespie 在纽约52街确立这套语汇。",
    realWork: "Charlie Parker《Koko》（1945年11月26日 Savoy 录音，和声取自《Cherokee》）前八小节独奏即以连续八分音符流展开，第3—4小节在Bb7上可听到Cb—D—Db环绕Db音的包围；中段第17—20小节使用八音音阶片段。Sonny Rollins《Blue 7》（《Saxophone Colossus》, 1956）第1—2小节给出一个两音动机，随后十几个chorus都在对它作节奏位移与装饰，是动机即兴的范本。",
    application: "训练分三项练熟再合并。第一，比波普音阶：用C—D—E—F—G—G#—A—B—C上下行，节拍器从80起步，重点是让C、E、G、B四个和弦音落在每拍正拍上，速度提到140仍不跑偏。第二，包围：在ii—V—I的每个和弦三音上做包围，目标为D就弹Eb—C#—D，目标为C就弹Db—B—C，每天用三个调各练十次。第三，短句库：背三个两小节bebop短句（一个属七下行、一个ii的琶音上行、一个iii—VI—II—V循环），然后在12小节布鲁斯第9—10小节强制插入。最后合并：录一轮12小节，回放检查每小节强拍是否落在和弦音上。",
    practice: "任务：用C调把Bebop大调音阶以八分音符上下行弹三轮并录音，检查强拍是否落在C—E—G—B；再练包围，在Dm7—G7—Cmaj7上分别对F、B、E三个目标音做上下半音包抄。听《Koko》第1—8小节Parker的独奏，数出八分音符流中出现的琶音片段。",
    diagram: {"root":60,"iv":[0,4,7,11]},
    audio: {"type":"seq","notes":[{"m":60,"d":0.24,"gap":0.26},{"m":62,"d":0.24,"gap":0.26},{"m":64,"d":0.24,"gap":0.26},{"m":65,"d":0.24,"gap":0.26},{"m":67,"d":0.24,"gap":0.26},{"m":68,"d":0.24,"gap":0.26},{"m":69,"d":0.24,"gap":0.26},{"m":71,"d":0.24,"gap":0.26},{"m":72,"d":0.6,"gap":0.62}]}
  },
  "pp-prog": {
    simple: "流行歌的和声高度集中，几种循环覆盖了大部分金曲。最著名的万能进行是1—5—6—4（C—G—Am—F），它同时满足三个条件：低音有下行级进感（C—B—A—F）、相邻和弦之间都有共同音可平滑连接、主歌与副歌都能通用。它有三个常见变体：6—4—1—5（Am—F—C—G，情绪更暗更悲）、4—5—6—3（F—G—Em—Am，日系常用）、以及被称为六四一的1—6—4—5（C—Am—F—G）。另一条主线是卡农进行1—5—6—3—4—1—4—5（C—G—Am—Em—F—C—F—G），低音严格下行，天生带有推进感。此外还有来自五十年代的1—6—4—5，以及小调常用的6—7—1（Am—B—C）。",
    pro: "编号体系以C大调为参照：1=C、2=Dm、3=Em、4=F、5=G、6=Am、7=Bdim。1—5—6—4的连接优势：C（C—E—G）到G（G—B—D）保留G；G到Am（A—C—E）时D级进到E、B级进到C；Am到F（F—A—C）保留A与C。把起点改到6得到Am—F—C—G，音符一个没改，听感却由明亮转忧郁——循环的起点决定听者把哪个和弦当主和弦，这是一种功能错觉。卡农进行的低音为C—B—A—G—F—E—D—G，实际是下行音阶加终止四度，原型见帕赫贝尔《卡农》（约1680年代）。日系六四一常写作4—5—3—6—2—5—1（F—G—Em—Am—Dm—G—C），倒数第二小节的G7含导音B，是明确的属准备。",
    realWork: "卡农进行最清晰的现代例子是 Vitamin C《Graduation (Friends Forever)》(1999)，全曲即F—C—Dm—Am—Bb—F—C的循环；原型听帕赫贝尔《D大调卡农与吉格》（约1680—1706）第1—8小节低音D—A—Bm—F#m—G—D—G—A。万能进行听 Journey《Don't Stop Believin'》(1981) 副歌的E—B—C#m—A。六四一型听 久石让《Summer》（1999）与 RADWIMPS《前前前世》(2016) 副歌的4—5—3—6。",
    application: "三步把进行用活。第一，先按1—5—6—4写八小节，每和弦两小节，用分解和弦织体；然后只把起点改成6（Am—F—C—G）、一个音符都不改，录下来对比情绪差异，这是理解循环起点决定调性感知最快的实验。第二，加属化：把5改为V7（G—B—D—F），把6改为7（B—D#—F#—A）作为指向Am的临时属，制造小调色彩。第三，套卡农：用低音C—B—A—G—F—E—D—G每音配一个三和弦，得到1—5—6—3—4—1—4—5，再把最后一格改为属七（G7）强化回到1。第四，换织体不改和声：同一进行分别用钢琴分解、吉他扫弦、合成器铺底三种编法。",
    practice: "任务：用C大调写出1—5—6—4、6—4—1—5、1—6—4—5三条循环各八小节，分别标出相邻和弦的共同音与低音走向并录音对比；再听《Graduation (Friends Forever)》前十六小节，逐小节写下和弦编号，与帕赫贝尔《卡农》前八小节对照，标出被替换掉的那一格和弦。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":52,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":60,"iv":[0,4,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7,10]}],"step":0.9,"dur":0.85}
  },
  "pp-prod": {
    simple: "同一首歌的demo与成品之间的差距，几乎全部由制作决定。第一是音色选择：每个频段要有人负责，低频给贝斯与底鼓，中低频给铺底与吉他，中高频给人声与旋律乐器，高频给镲片与空气感；如果两件乐器抢同一频段，声音就会浑浊不清。第二是编曲密度：现代流行按段落增减乐器，主歌只用底鼓、贝斯与一轨铺底，预副歌加入节奏吉他，副歌全开并叠加和声，桥段全部撤掉只留人声与钢琴——密度的起伏往往比旋律本身更决定记忆点。第三是人声处理：主唱通常双录两遍加厚，配压缩控制动态、延迟与混响制造空间，并把延迟时值与歌曲速度同步。",
    pro: "可量化的制作参数：八分音符延迟为60000除以BPM再除以2毫秒（112 BPM时约268毫秒），附点四分延迟约402毫秒；人声压缩常用3比1到6比1，启动10—30毫秒、释放100—300毫秒，增益衰减3—6分贝；人声均衡在80—100赫兹高通切除低频噪声，2.5—5千赫提升2—3分贝增加存在感，8—10千赫加空气感，必要时在300—500赫兹衰减2分贝去浑浊；混响预延迟20—40毫秒、衰减1.5—2.5秒。响度方面流媒体目标约为负14 LUFS，真峰值不超过负1 dBTP。音色叠加用三层法：底层为超低频与底鼓，中层为铺底、吉他与钢琴，顶层为旋律、人声与打击乐，并用侧链压缩让铺底在底鼓处下压2—4分贝制造呼吸感。",
    realWork: "Billie Eilish《bad guy》(2019) 第1—8小节只有贝斯、808底鼓与手指响，第25小节前后的副歌才加入人声和声与打击乐，全曲约100 BPM，低频侧链明显。Daft Punk《Get Lucky》(2013) 第1小节的clean吉他占据中频，第9小节前后加入古钢琴与四四拍背拍，人声做 talkbox 处理。The Weeknd《Blinding Lights》(2019) 第1—4小节只有合成器铺底与鼓机，第17小节前后才加入弦乐式合成层。",
    application: "按四步做一次完整制作。第一，先做减法：把demo的乐器全部静音，只留人声与钢琴，确认和声与旋律本身成立。第二，按频段补件：加超低频贝斯（走根音、八分音符）与底鼓；加铺底铺中频并用低通滤波切掉与贝斯重叠的部分；加旋律乐器填补中高频；加踩镲与沙锤提供高频。第三，做密度曲线：主歌只开贝斯、底鼓与铺底，预副歌加入踩镲与节奏吉他，副歌全开并加人声和声（三度与五度各一轨），桥段撤到只剩人声与钢琴。第四，处理人声：双录两遍并对齐，加3比1压缩、与速度同步的八分延迟、100赫兹高通、2.5千赫提升2分贝，最后用侧链让铺底在底鼓处下压3分贝。",
    practice: "任务：选一段自己写的八小节副歌，按主歌三件乐器、副歌全开做两版编曲并导出对比；再听《bad guy》第1—8小节与第25—32小节，列出两个段落出现的乐器轨数差异。第二天用同一套和声换成《Get Lucky》式的clean吉他动机加古钢琴编法，验证织体替换对风格的影响。",
    diagram: {"root":60,"iv":[0,4,7,11]},
    audio: {"type":"chord","root":60,"iv":[0,4,7,11,14],"dur":2}
  },
  "fm-cue": {
    simple: "cue 是配乐的最小交付单位，长度由画面决定而不是由乐句决定。写 cue 有两种找点方式：踩点（mickey-mousing，音乐动作与画面动作一一对应）与写意（音乐跟随整体情绪而不追画面细节）。踩点适合动作喜剧与动画，写意适合剧情与抒情段落；混用时通常在一个段落内保持同一种逻辑，频繁切换会让观众失去稳定预期。情绪点（hit point）是画面上必须被音乐强调的瞬间：门开、转身、爆炸、台词落点。同步点通常用镲片、低音重击、弦乐重音或铜管突强标记。留白同样重要：一场戏里 30%~50% 的时间没有音乐，音乐才有价值。cue 结尾常见三种处理：淡出、解决到和弦、突然切断（hard cut），分别对应情绪延续、段落结束、事件被打断。",
    pro: "cue 写作在 DAW 中锁定视频，帧率与项目一致（29.97 与 30fps 的 drop-frame 差异必须提前确认）。hit point 精度：动作类 ±2 帧，抒情类可放宽到 ±6 帧。常用手法是在 hit 之前放一个「预备音」——reverse cymbal、上行 glissando 或短促吸气声，长度 1/2~1 拍，让真正的重音落在下一小节的强拍上，冲击力会显著增强。段落长度经验值：紧张段 15~40 秒，抒情段 45~90 秒，转场 5~15 秒。BPM 可由画面剪辑节奏推导：数 8 秒内的剪辑次数 n，BPM ≈ n×7.5。和声节奏要慢于剪辑节奏，通常每 2~4 拍一个和弦，否则听感会碎。cue 结尾若需衔接下一场，预留 12 帧以上的尾音或混响释放空间，避免切断混响尾巴产生突兀感。",
    realWork: "《Jurassic Park》(1993，John Williams)「Welcome to Jurassic Park」：主题在恐龙首次完整现身处进入，用圆号与弦乐的宽音程上行，重音精确落在镜头推近的瞬间；此前的接近过程只用持续低音与打击点，靠长时间不解决来积攒期待，这是 cue 结构中「压抑—释放」的标准范例。Hans Zimmer 在《The Dark Knight》(2008) 为 Joker 写的 cue 则相反：单音持续加弦乐滑音与逐渐提速的打击，把混乱做成可听的物理压力，几乎没有旋律，属于纯粹的织体写作。",
    application: "1) 框定 cue 的入点与出点时码，写进项目标记；2) 先确定一个核心事件——这场戏到底发生了什么，音乐只服务这一件事，贪多会让 cue 失去焦点；3) 用 3~5 个 hit point 搭出骨架，其余音符围绕骨架填充；4) 选择进入方式：冷开（直接进主题，适合转场与片头）或渐入（从氛围垫进入，适合情绪戏）；5) hit 结束后留 1~2 秒清场再写下一个 cue，避免音乐连绵不断导致情绪麻木；6) 导出 48kHz/24bit WAV，文件名包含 reel 号、cue 号与版本号，便于剪辑与终混追溯。",
    practice: "任选一段 60 秒追车或潜行片段，数出剪辑点数量并算出建议 BPM，写一支 45 秒的 cue，至少设置 3 个精确 hit point，其中 1 个必须带反拍预备音。完成后把整条 cue 推迟 6 帧导出第二版，两版对照播放，体会同步精度对观感的影响；再导出一个「无打击版」对比，检查骨架是否仍然成立。",
    audio: {"type":"chord","root":48,"iv":[0,7,12]}
  },
  "fm-leit": {
    simple: "主导动机是用一段可辨认的短旋律（通常 4~12 个音）绑定角色、地点、物件或概念。它有效是因为观众记不住剧情细节但记得声音：动机一响，相关信息自动被唤起。动机的力量来自变形——同一组音程在悲剧场景用低音区小调慢速，在胜利场景用铜管大调快速，听众仍能认出。辨别维度只有三个：音程轮廓、节奏型、配器音色。改其中一个维度，听感会「似是而非」；同时改两个以上，观众就需要重新学习，等于动机失效。因此变形的正确做法是保留节奏型与音程轮廓，只动调式、配器与速度，这样既新鲜又不丢失身份。",
    pro: "构造动机时优先设计音程骨架而非调性：纯四度上行接大二度为开阔的英雄型，小二度摩擦制造不安，三全音制造悬置。变形的四种手段：① 音程缩放（大三度缩为小三度，明亮转阴郁）；② 节奏型保留而音高改写（识别度最高，最安全）；③ 调式切换（同主音大小调、多利亚与自然小调互换）；④ 配器迁移（双簧管到圆号再到独奏大提琴）。工程上给每个动机固定音区与乐器，避免不同 cue 之间音色漂移导致识别失败，例如固定为「独奏大提琴 G3~G4」而非「弦乐组」。回归（recapitulation）通常安排在影片后 2/3 处，首次完整奏响往往保留到终场；出现频率建议控制在全片 3~6 次，过于频繁会贬值。",
    realWork: "《The Lord of the Rings》(Howard Shore)：Shire 主题是 D 大调纯五度跳跃的民谣风，用锡哨与弦乐；Isengard 主题用 5/4 拍、三全音与重金属打击。Shore 建立了 60 多个动机并规划了调性地图，使三部曲在和声层面成为整体。John Williams 在《Star Wars》中为 Darth Vader 写的「The Imperial March」用小调下行、附点节奏与低音铜管，与 Luke 主题的大调上行三度形成对位；《Return of the Jedi》终场把两者并置，等于用音乐直接交代了父子关系的结局。",
    application: "1) 列出需要动机的角色或概念，建议不超过 5 个，超过观众记不住；2) 为每个动机写 4~8 音的骨架，两两之间的音程轮廓必须明显不同（一个用跳进、一个用级进）；3) 指定专属乐器与音区，写进音色模板；4) 每个动机做 3 个变形版本：中性、阴暗、胜利，只改调式与配器，不改节奏型；5) 在剧本时间线上标出动机出现点，第一次必须单独、完整地呈示，不被对白与音效覆盖；6) 终场安排一次完整回归并加厚配器，形成闭环。",
    practice: "为一个三角色短片写 3 个动机（各 4~8 音），每个做 3 种变形，共 9 段 8 小节片段，存为同一工程的不同轨道。导出后请人盲听配对角色：识别率低于 70% 说明区分度不足，需要拉开音程轮廓或节奏型的差异。Logic 或 Cubase 均可，模板中给每个动机建专属轨道与音色预设，确保跨 cue 一致性。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,3,7]}],"step":1,"dur":0.9}
  },
  "gm-adapt": {
    simple: "自适应音乐指音乐根据游戏状态实时改变。三种主流机制：① 垂直分层（vertical layering），在同一和声循环上叠加或抽掉声部，玩家血量低时抽掉旋律只留低音与打击，紧张时加铜管；② 水平重排（horizontal resequencing），按小节把不同段落重新排序，玩家突破后跳到胜利段；③ 参数化，用连续变量（距离、速度、时间）实时控制滤波器截止频率、混响湿度与音量。选择依据是变化方式：状态频繁突变用垂直分层，剧情推进用水平重排，物理量连续变化用参数化。三者常组合使用，例如底层用垂直分层、段落衔接用水平重排。",
    pro: "垂直分层实现要点：所有层共用同一 BPM、调性与长度，层间相位必须样本级对齐——用同一段 MIDI 渲染全部层，禁止各层单独手弹，否则叠加后会出现梳状滤波。典型分层为 L1 低音加鼓、L2 和声垫、L3 琶音、L4 主旋律、L5 装饰。音量过渡用 0.3~1.5 秒的 ramp，避免阶跃产生 zipper noise；滤波过渡用 automation 曲线而非跳变。水平重排要求素材在小节网格上对齐，跳转设为下一小节，并对旋律允许 1~2 秒的 release 让尾音自然释放。参数化常用映射：低通 200Hz~8kHz 映射敌人距离、混响 wet 15%~45% 映射室内外、BPM 用 time-stretch 微调（±10% 内无 artifacts）。此外应加 transition 素材（riser、downlifter、impact）掩盖切换瞬间。",
    realWork: "《Journey》(2012，Austin Wintory)：音乐随玩法进程连续变化，用同一主题的多层编排让玩家行为影响声部进出，其终曲「Nascence」完全由游戏内事件驱动强弱与织体，是垂直分层与参数化结合的代表。《Red Dead Redemption 2》(2018，Woody Jackson)：任务音乐用大量分层与采样拼接，玩家靠近目标点时打击与弦乐逐层加入，不同乐器层对应不同紧张等级，由脚本按任务阶段触发激活。",
    application: "1) 先写完整版（full mix，对应最激烈状态）作为参考基准；2) 从完整版倒着减：抽掉装饰得 L4，抽掉旋律得 L3，抽掉琶音得 L2，只留低音与鼓得 L1；3) 所有层用同一工程渲染，统一起点与长度（如 100BPM 下 8 小节 = 19.2 秒）；4) 在中间件里给每层一个音量推子，用 RTPC 驱动（血量低于 30% 时 L1 保持、L4 在 1.5 秒内淡出）；5) 设置 crossfade 曲线并逐层实测，检查相位与音量跳变；6) 为每种状态切换录制 30 秒实测视频存档，便于版本对比与回归测试。",
    practice: "用 Ableton Live 建 5 轨（低音、鼓、垫、琶音、旋律），同一 8 小节循环 @100BPM，全部渲染为等长 WAV 导入 FMOD；用 hp 参数（0~100）做两条 automation：hp 低于 50 时旋律层降 12dB，hp 低于 20 时垫层加 800Hz 低通。手动拉动参数 20 次，检查音量是否出现跳变、层间是否有相位抵消，并录制一段演示视频。",
    audio: {"type":"prog","chords":[{"root":57,"iv":[0,3,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,3,7]},{"root":55,"iv":[0,3,7]}],"step":1,"dur":0.9}
  },
  "gm-loop": {
    simple: "游戏循环音乐有两个硬性指标：无缝（听不出接缝）与耐听（听 20 分钟不烦）。无缝的关键是尾部的声音要能叠回开头，常见做法是把最后一小节的混响与延迟尾巴单独渲染出来叠到文件开头，称为 tail wrap。耐听靠信息密度管理：主旋律每 4~8 小节出现一次而不是持续存在，中间用变奏、加花与换音色填充；避免高频持续音，一直响的 hi-hat 与 shaker 最容易造成刺痛与疲劳。循环长度建议 32~64 小节（约 1~2 分钟），太短会明显听出周期，太长则占用内存与制作成本。留白在这类音乐里不是缺陷，而是延长耐听度的核心手段。",
    pro: "无缝循环实现：① 把末尾 1~2 小节的 reverb tail 与 delay 回授单独渲染，长度等于混响 RT60（通常 1.5~3 秒），叠加到文件开头；② 交叉淡化版本需在首尾各留 0.5~1 拍的低能量区做 crossfade；③ 打击乐避免在最后一拍留白，通常用 fill 接回第一拍，保持律动连续。耐听设计：主旋律重复周期不小于 32 小节，或采用 A-A-B-A 结构（8 小节一句，第三句变奏）；高频能量控制在整体 -18dBFS 以下，持续的 shaker 或 hi-hat 每 4 小节至少留一个八分音符的空隙。常用长度：8 小节（120BPM 下 16 秒，用于战斗过渡）、16~32 小节（探索）、64 小节以上（城镇与菜单）。导出后检查首末样本电平是否连续，避免产生 click。",
    realWork: "《Super Mario Bros.》(1985，近藤浩治)：地面关主题的核心动机只有数秒，靠强节奏型与清晰的旋律轮廓，使极短循环在反复游玩中仍保持辨识度而不显冗余，是「短循环靠节奏与轮廓取胜」的范例。《Minecraft》的「Calm」系列（C418）：钢琴与环境音的极简循环，旋律音极稀疏（每 2~4 小节一个音），留白极大，因此可支持数小时连续播放而不疲劳，是低信息密度循环的教科书。",
    application: "1) 确定 BPM 与循环小节数，建议 16 或 32 小节；2) 写好全曲后专门设计接缝：把最后一小节做成 fill，或去掉明确的和声落点；3) 渲染时开启 tail（长度等于混响 RT60），把 tail 叠回文件开头；4) 在 DAW 里把素材复制三份首尾相接播放，戴耳机专门监听接缝位置；5) 做耐听测试：挂机循环播放 15 分钟，记录第一次感到厌烦的时间点，低于 8 分钟说明信息密度过高或变化过少；6) 导出前确认首样本与末样本电平连续，无 click 与相位突变。",
    practice: "制作一段 16 小节 @96BPM 的探索循环，包含低音、和声垫与一件旋律乐器。要求：主旋律每 8 小节出现一次，不使用持续 hi-hat。渲染带 2.5 秒 tail 并叠回开头，在三份相接的轨道上用耳机检查接缝；然后实际挂机播放 15 分钟，记录厌烦出现的确切时间，并据此删减或增加一层素材后重测。",
    audio: {"type":"prog","chords":[{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,3,7]},{"root":60,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "sd-synth": {
    simple: "减法合成是最常用的路径：从谐波丰富的波形（锯齿、方波、噪声）出发，用滤波器削掉不需要的部分。四个必须理解的模块：振荡器决定谐波原料，滤波器决定频谱形状，包络决定时间形状，LFO 决定变化。加法合成反过来，从正弦叠加出目标频谱，适合风琴、钟琴类音色。FM 合成用一个振荡器调制另一个的频率，擅长金属、电钢与玻璃质感。选择依据：需要厚实用减法（多振荡器 detune），需要金属或清脆用 FM，需要精确频谱用加法。无论哪种方法，最终判断标准是音色放进混音后是否还能被听见，而不是 solo 时是否惊艳。",
    pro: "减法合成实操：2~3 个 saw 振荡器 detune ±7~20 cents（超过 30 cents 会听成两个音），送入 lowpass，cutoff 400Hz~3kHz，resonance(Q) 2~8（Q 大于 6 有自激风险）。滤波器包络：A=5~20ms、D=200~400ms、S=30~60%、R=200~500ms；音量包络：A=2~10ms（bass）、D=200ms、S=70%、R=150ms。经典 bass 配方：saw 加 lowpass，cutoff 由包络调制（env amount 30~60%），叠一个低八度或低两个八度的正弦 sub，末级饱和提升 2~4kHz。加法合成做钟琴用非整数倍分音（比例约 1 : 2.76 : 5.40）。FM 比例：1:1 得方波感，1:2 得钟琴，1:1.41 这类非整数比得金属噪声；modulation index 0~10，越大越亮越脏，超过 8 通常出现过度的边频噪声。",
    realWork: "《Stranger Things》主标题（Kyle Dixon 与 Michael Stein）：用 Prophet-5 与 Roland 合成器的琶音，两个振荡器 detune 加慢速 LFO 调制 filter cutoff，制造出 80 年代阴郁的辨识音色；低频持续音则用 saw 加 lowpass 与长 release 做 pad。Vangelis 在《Blade Runner》(1982) 用 Yamaha CS-80：双振荡器配合 ribbon controller 做实时滤波与 pitch bend，其 pad 音色的核心是极低 cutoff 的 lowpass、长 release 与内置 chorus。",
    application: "1) 先确定目标音色的三个参数：音区、亮度（cutoff 大致位置）与动态属性（是 pluck 还是 pad）；2) 初始化：saw 或 square 振荡器到 lowpass 到 amp，包络全部设中等值；3) 调滤波器：关掉所有效果，只动 cutoff 与 resonance 找到对的位置并记下数值；4) 写包络：先做音量包络决定 pluck 或 pad 属性，再做滤波包络决定「哇」感强度；5) 加运动：LFO 调制 cutoff（rate 0.2~5Hz，depth 5~20%）或 pitch（depth 3~8 cents）；6) 最后加效果，顺序为 saturation 到 chorus 到 reverb，注意先失真后空间，顺序反了会得到完全不同的结果。",
    practice: "用免费合成器（Vital 或 Surge XT）从 init patch 做起，做三个音色：① pluck bass（cutoff 由包络调制，decay 200ms）；② 宽 pad（3 振荡器 detune，慢 LFO，混响 wet 35%）；③ FM 钟声（ratio 1:3.5，index 6）。每个音色只用一台合成器完成，导出 8 秒音频并记录全部参数，之后凭记录重做一遍，验证参数是否可复现。",
    audio: {"type":"chord","root":45,"iv":[0,7,12]}
  },
  "sd-space": {
    simple: "空间感由四类线索构成：直达声与反射声的比例（干湿比）、早期反射的到达时间（判断房间大小）、混响尾巴的长度（RT60）、以及高低频的衰减差（大空间高频衰减更快）。塑造空间的基本工具是混响与延迟：混响给房间，延迟给距离与节奏。氛围（ambience）则是空间的具体内容——风声、房间底噪、远处人群，没有氛围的空间是空的。最常见的错误是混响过量：混响越大，声音越远也越不清晰，当主体需要贴近听众时（人声主唱、主旋律），wet 必须控制在 20% 以下。判断方法很简单：关掉混响后如果主体反而更清晰有力，说明刚才加多了。",
    pro: "混响参数：pre-delay 决定距离感，10~25ms 为小房间，30~60ms 为大厅，超过 80ms 会让声音脱离主体（常用于人声增厚而不破坏清晰度）；RT60：小房间 0.4~0.8 秒，客厅 1.0~1.5 秒，教堂 3~6 秒；高频衰减（damping）在大空间要更快，4kHz 以上设为 0.5~1.5 秒。混响返回通道必须做 EQ：highpass 150~300Hz、lowpass 6~10kHz，否则低频浑浊、高频刺耳。延迟类型：slap delay 60~120ms 用于增厚，ping-pong 用八分音符制造宽度，长延迟用四分音符或附点八分音符做节奏回声。时间算法：四分音符延迟(ms) = 60000/BPM，附点八分 = 45000/BPM。宽度处理：混响返回做 M/S，Side 提升 2~3dB 可拓宽，但要检查相关性表保持在 0 以上以确保单声道兼容。",
    realWork: "Brian Eno 在《Apollo》(1983) 等环境作品中用长混响与长延迟构建无墙空间，做法是把短素材（如人声片段）送入 RT60 超过 5 秒的混响与磁带延迟，让原始素材变成空间中的漂浮物。《Interstellar》(2014)「No Time for Caution」把管风琴录制于伦敦 Temple Church（自然 RT60 约 3~4 秒），靠真实空间而非插件获得宏大感，同时用近距离麦克风保留瞬态清晰度，是真实空间与近场拾音互补的范例。",
    application: "1) 先决定这个声音在哪里——给出具体空间（小木屋、地铁站、峡谷），而不是抽象地加个混响；2) 用 pre-delay 定距离，用 RT60 定房间大小，最后用 damping 定材质（硬墙偏亮，软装偏暗）；3) 混响一律放在 send 返回通道而非插入音轨，便于统一控制与统一 EQ；4) 对返回通道做 highpass 200Hz、lowpass 8kHz；5) 用延迟补充节奏感，附点八分音符（45000/BPM 毫秒）是最安全的选择；6) 加一层极低的房间底噪（-40~-35dBFS）会让空间真实很多，但要注意不要堆积低频。",
    practice: "对一个干声（人声或乐器录音）做三个版本：① 小房间（pre-delay 12ms，RT60 0.6 秒，highpass 250Hz）；② 大厅（pre-delay 45ms，RT60 3.2 秒，高频衰减 1.2 秒）；③ 峡谷（pre-delay 90ms 加附点八分延迟，RT60 4.5 秒）。三版导入同一工程做 A/B/C 切换试听，写下各自适合的画面场景，并检查切到单声道后是否都还能成立。",
    audio: {"type":"chord","root":48,"iv":[0,7,16]}
  },
  "mx-balance": {
    simple: "平衡不是把音量调成一样，而是按重要性排序：主角最响，配角在它之下 3~6dB，装饰层再低 6~10dB。判断平衡是否正确的可靠方法是换系统听——手机上、小音量下（约 60dB SPL）、车里各听一遍；小音量下听不清的元素说明它还不够突出，因为人耳在小音量时对低频与高频的感知会显著下降。声像（pan）的作用是腾出中间的位置：中间留给 kick、bass、snare、人声与主旋律，其余（和声、吉他、打击、混响返回）分到两侧。极左极右会损失能量与单声道兼容性，常用 L30~L70。立体声宽度靠对比产生：正是因为有硬 pan 的宽元素，居中的窄元素才显得有力。",
    pro: "电平参考（以主唱为 0dB）：bass -2~-4dB，kick -1~-3dB，snare -2~-4dB，hi-hat -12~-16dB，节奏吉他 -6~-10dB，pad -12~-18dB，和声 -8~-12dB。频段冲突的处理：两件乐器同时抢 200~400Hz 会浑浊，同时抢 2~5kHz 会刺耳，解决方式是让其中一方用窄 Q 衰减 3dB，而不是两边都提升。声像规则：kick、snare、bass、lead vocal 居中；overhead 与 room 居中或轻微偏移；双轨吉他 L60/R60；toms 按鼓手视角从 L40 递减到 R40；hi-hat L20~L40；混响返回与主体反向或同向 10~20%。单声道检查：切到 mono 后若某元素衰减超过 6dB，说明存在相位问题，多半来自立体声 widening 或双麦克风录音的相位差。参考曲目用法：导入工程后做响度匹配，用频谱仪对比 100Hz、1kHz、10kHz 三点能量差。",
    realWork: "Alan Meyerson 混《Dunkirk》(2017) 时，把 30~60Hz 的持续低频作为压力层，与对白和引擎音效争夺同一频段，通过严格分配与自动化让音乐与音效在不同时刻交替占据低频，避免互相掩蔽。Bruce Swedien 混 Michael Jackson《Thriller》(1982)：主唱几乎全部居中且偏干，背景人声与合成器硬 pan 到两侧，把中间位置完全留给主唱，形成极强的聚焦感，这是「用声像制造重要性」的经典案例。",
    application: "1) 列出所有音轨并按重要性排序，明确前三名主角；2) 关掉所有效果，只用推子做一版静态平衡，主唱或主旋律定为 0，其余按 -3、-6、-12 三档排布；3) 用 EQ 解决掩蔽：找出主角所在频段（人声 2~5kHz），在竞争音轨上衰减 2~4dB；4) 摆声像：先放四件居中元素（kick、snare、bass、lead），再按对称性分配其余，注意左右能量均衡，避免一侧过满；5) 切到单声道听一遍，明显变弱或消失的元素要收回中间；6) 导入参考曲做 loudness-matched 的 A/B 对比，每 8 秒切换一次。",
    practice: "取一个 12 轨以上的工程，先只做推子与声像版本（禁止插入任何插件）导出；再导入同风格参考曲，两者都归一化到 -14 LUFS-I，每 8 秒切换对比一次，记录你的混音在哪些频段比参考曲多或少能量；然后只允许动推子与 pan 继续调整，直到差异最小。这个练习能直接暴露你对平衡的判断偏差在哪里。",
    audio: {"type":"chord","root":57,"iv":[0,3,7,10]}
  },
  "mx-fx": {
    simple: "效果器不是让声音变好听的装饰，每个都有明确任务。EQ 解决掩蔽与音色，减法优先；压缩控制动态让元素稳定；混响与延迟建立空间；饱和与失真增加谐波，使声音在小音量下也能被听见。使用顺序非常重要：同一个压缩器放在失真前和失真后结果完全不同——放前面会先压平再被失真放大，得到更脏更稳的结果；放后面则把失真压平，更可控但更平淡。最常见的错误是效果过量：压缩 GR 超过 8dB 会失去活力，混响 wet 超过 30% 会让主体后退。判断标准很直接：绕过该效果，如果听不出明显差别，就该删掉或减小用量。",
    pro: "EQ：人声 highpass 80~100Hz（男声可到 120Hz），吉他 80Hz，钢琴 40Hz；问题频段用 Q=6~10 扫频寻找并衰减 3~6dB；提升用宽 Q（0.7~1.5）提升 2~4dB。压缩：1176 风格人声 attack 3~7（快）、release 5~7、GR 4~6dB；LA-2A 风格 attack 10ms、release 100~300ms、GR 3~5dB；bass ratio 4:1、attack 30ms、release 100ms、GR 4dB；snare attack 设 10~20ms 让瞬态通过；总线 SSL 风格 attack 30ms、release 0.1~0.3 秒、ratio 2:1~4:1、GR 1~3dB。混响：plate 用于人声与军鼓（RT60 0.8~2 秒，pre-delay 20~40ms），room 用于鼓组（0.4~0.8 秒）。延迟：附点八分 = 45000/BPM 毫秒，feedback 25~40%，返回通道 highpass 400Hz、lowpass 6kHz。饱和：磁带饱和驱动 +2~4dB，电子管用于 bass 与人声增加二三次谐波，之后需补偿 1~2dB 输出电平。",
    realWork: "Andrew Scheps 在 Red Hot Chili Peppers《Californication》(1999) 等作品中把鼓组总线过饱和与失真，主动牺牲部分清晰度换取冲击力，并常把整首混音再过一次压缩以粘住素材。Chris Lord-Alge 的人声链是经典范式：1176（快 attack，GR 5~8dB）到 LA-2A（GR 3dB）到 EQ 提升 8~10kHz 增加空气感，再送 plate 混响与四分音符延迟，形成明亮、贴耳、始终位于最前的人声音色。",
    application: "1) EQ 第一步永远是 highpass：除 kick、bass 与低音弦乐外，全部切掉 80~120Hz 以下；2) 减法扫频：用一个 Q=8、增益 +9dB 的带通扫过 200Hz~8kHz，找到最难听的频率后衰减 3~6dB；3) 压缩先设 release 再设 attack——release 调到呼吸自然，attack 决定瞬态是否保留；4) GR 控制在 3~6dB（人声可到 8dB），超过就串联两个压缩器各压一半；5) 混响与延迟一律走 send 返回，返回通道做 highpass 200~400Hz、lowpass 6~8kHz；6) 饱和放在链末端、压缩之后，并补偿输出电平使 bypass 前后响度一致，否则你的判断会被音量变化欺骗。",
    practice: "对一轨人声做完整链路：highpass 90Hz、减法 EQ（找出 2 个问题频段各衰减 4dB）、1176 风格压缩（attack 5、release 5、GR 5dB）、3kHz 提升 2dB、plate 混响 send（wet 15%）、磁带饱和（+3dB）。导出处理前与处理后两版，做响度匹配后 A/B，写下每个环节贡献了什么；然后逐个 bypass，验证是否有环节其实无效可以删除。",
    audio: {"type":"chord","root":60,"iv":[0,4,7,10]}
  },
  "ms-loud": {
    simple: "响度（LUFS）是人耳感觉到的平均音量，动态范围（PLR、DR）是最响与最安静的差。流媒体平台会把所有歌曲归一化到同一目标响度（Spotify 与 Apple 约 -14 LUFS-I，YouTube 约 -13~-14），这意味着把歌做得更响毫无意义——超过目标只会被自动调低，还白白损失动态。真正需要决定的是动态预算：流行与电子需要小而密的动态（动态范围 8~12LU）以获得持续能量；爵士、古典与配乐需要大动态（14~20LU）以保留起伏。判断方法是看 LUFS-S（短时响度）在主歌与副歌的差值，流行乐 1.5~3LU 比较合适，超过 4LU 说明段落之间落差过大，小音量下主歌会听不清。",
    pro: "关键指标：Integrated LUFS（整首平均）、Short-term LUFS-S（3 秒窗）、Momentary LUFS-M（400ms）、True Peak（dBTP，建议不超过 -1.0dBTP，因为有损编码会引入 0.5~1.5dB 的 overshoot）、LRA（响度范围，流行 4~8LU，电影配乐可达 15~20LU）、PLR（峰值与响度比，流行 2~4，动态音乐 6~10）。平台目标：Spotify -14 LUFS-I、Apple Music 约 -16 LUFS-I（Sound Check）、YouTube -13~-14、广播 EBU R128 = -23 LUFS-I、电影母版 -27 LUFS（±2，配合对白归一化）。实现顺序：先在混音阶段用自动化做出段落差（1.5~3LU），再在母带用限幅器精修；如果 GR 超过 6dB 仍达不到目标响度，说明混音瞬态过尖，应在混音阶段用压缩与饱和削峰，而不是在母带硬压。",
    realWork: "Daft Punk《Random Access Memories》（母带 Bob Ludwig）保持约 -11~-12 LUFS-I 与较大的动态，是宁可保留动态也不追响度的代表。电影方面，《Interstellar》(2014) 的影院混音遵循电影母版标准（约 -27 LUFS，峰值余量充足），因此爆裂的低频与极静的太空段落之间能保留巨大落差；而在流媒体上线的原声专辑版本会按平台目标重新处理，听感与影院版明显不同——这是响度标准直接影响艺术表达的最直观例子。",
    application: "1) 在母带末链插入响度表（Youlean、NUGEN 或 Insight），全程监测；2) 先定目标：流媒体单曲 -14 LUFS-I、True Peak -1dBTP；影视 -24~-27 LUFS-I 且保留 -2dBTP 以上余量；3) 测量混音现状：若 Integrated 已是 -16 而需要 8dB 的 GR 才能到 -14，说明要先削瞬态（总线饱和加快 attack 压缩）；4) 用 clipper 处理峰值尖刺（比限幅器更透明），再用限幅器收尾，GR 控制在 1~3dB；5) 检查 LRA 与 PLR 是否符合风格预期；6) 导出后用平台归一化模拟（如 Spotify 的 Normal 模式预览）验证最终听感。",
    practice: "取自己的一首混音，导出三个版本：A（-14 LUFS-I，ceiling -1dBTP）、B（-11 LUFS-I）、C（-17 LUFS-I）。用 Youlean Loudness Meter 记录每版的 LUFS-I、LRA、PLR 与 True Peak，然后把三版都归一化到 -14 后盲听，判断哪一版听起来更有力——结果通常会否定你盲目追求高响度的直觉，并让你直观理解动态预算的价值。",
    audio: {"type":"chord","root":62,"iv":[0,3,7]}
  },
  "gt-chord": {
    simple: "开放和弦（C、A、G、E、D、Am、Em）借空弦发声，音色亮、共鸣好，但只有这几个调能用；横按用一个食指横压六根或五根弦，把E型或A型指法整体平移，于是任何调都能拿到大和弦与小和弦。转换和弦时不要逐指挪动，而要找出两个和弦的「共同指」当轴，其余手指围着它重新落位。voice leading（声部进行）在吉他上就是：让高声部尽量不动或走小二度，低声部走根音。比如C到Am时2弦1品的C可以完全保留，只把4弦的E移到F、5弦的C移到空弦A，听感就平滑；如果每次都整把抬起重按，伴奏会一跳一跳。",
    pro: "E型横按以6弦根音定位，A型以5弦根音定位：F大和弦是1品的E型（6弦1品F、5弦3品C、4弦3品F、3弦2品A、2弦1品C、1弦1品F），Bb是1品的A型（5弦1品Bb、4弦3品D、3弦3品F、2弦3品Bb、1弦1品F）。共同指举例：C（x32010）到Am（x02210）保留2弦1品；G（320003）到Em（022000）保留5弦2品与6弦3品，只动4弦。voice leading的物理化做法：把C弹成A型第3把（5弦3品C、4弦5品G、3弦5品C、2弦5品E、1弦3品G），G弹成E型第3把（6弦3品G、5弦2品B、4弦G空弦、3弦空弦G、2弦3品D、1弦3品G），两个和弦的G与C都留在同一根弦上，另外几声部走级进或保留。四音drop2排列通常放在4-3-2-1弦，避免6-5弦的低音与和弦音互相糊。",
    realWork: "披头士《Let It Be》的C-G-Am-F 走向，转到吉他上就是C（x32010）、G（320003）、Am（x02210）、F（133211）：Am到F时保留2弦1品的C与1弦空弦E两个共同音，只移动3弦与4弦，所以听起来极其顺滑。John Mayer在《Neon》里用第5把的A型D和弦（5弦5品D、4弦7品A、3弦7品D、2弦7品F#），靠小指加1弦5品的E（9音）变成Dadd9，并让内声部以E-Eb-D半音下行连接D9与Dm9，这就是把voice leading做在指板上的范例。",
    application: "①先确认每个和弦的按弦手指一次性落下：按好后逐弦拨一遍，有闷音就调整手指立起角度。②列出你常用的十个和弦，两两配对找出共同指，专门练「只动该动的手指」。③练横按：食指横压1品六根弦，拨每一根都要响，然后每天上移一品，直到第5品。④练声部进行：选C-Am-F-G，为每个和弦找两种按法（开放与横按），要求相邻两个和弦至少保留一个共同音。⑤用节拍器60，每小节换一个和弦，先分解后扫弦。全程录音，重点听转换瞬间是否有断拍与杂音。",
    practice: "以C大调为准：①C、Am、F、G（或G7）循环，节拍器60，每小节一个和弦，先分解5321再扫弦，连做四遍无断拍。②F横按专项：1品F大和弦保持六根弦全响，保持20秒，重复五次，随后与C交替转换十次。③C到Am、G到Em、Am到F三组转换，每组十次，要求共同指不离开指板。④写出C-Am-F-G的一条voice leading路线，标出每个声部的走向并弹奏。",
    diagram: {"root":60,"iv":[0,4,7,11]},
    audio: {"type":"chord","root":60,"iv":[0,4,7,11],"dur":1.4}
  },
  "gt-impro": {
    simple: "即兴不是乱弹，而是在和弦音之上用音阶与琶音造句。最常用的是小调五声音阶（1、b3、4、5、b7），它去掉了最容易冲突的半音关系，几乎在任何和弦上都不刺耳；blues音阶再加一个b5，就是那个「苦味」的来源。五个指型把位覆盖整个指板，练熟后可以整体平移到任意调。技术上，推弦要把音高推到目标音（通常是推全音到和弦音），揉弦靠手腕带动而不是手指抠弦，琶音用来「跟着和弦走」，让solo与伴奏严丝合缝。音色则完全由右手拨弦位置、拨片角度与音量旋钮决定。",
    pro: "A小调五声第一指型：5弦5品A、5弦8品C，4弦5品D、4弦7品E，3弦5品G、3弦7品A，2弦5品C、2弦8品E，1弦5品A、1弦8品C；每弦两音，1指管5品、3指管7品、4指管8品。A blues音阶再在4弦6品与3弦6品加b5（Eb），常用1指从5品滑到6品，或推1/4音做「中性音」。推弦规则：推全音（两个半音）时用两三指并拢借力，推之前先按住目标音听一遍（如2弦15品推到17品，等于3弦12品的音高）。揉弦以左手掌根为支点、手腕上下摆动，频率由慢到快。琶音跟和弦：A7取5弦5品A、4弦6品C#、3弦9品E、2弦8品G，D7与E7在同把位平移即可，这是十二小节blues里最经济的做法。",
    realWork: "B.B. King《The Thrill Is Gone》是B小调：他先唱一句，再用吉他在B小调五声第1指型（7品起）「回答」，配合大幅揉弦与推到b3（D）后回落，做出叹息的语气。Eric Clapton在《Crossroads》用E blues（E、G、A、Bb、B、D），开头riff是6弦空弦E、3弦1品的G、2弦推弦到2品，右手靠近琴桥配合音箱过载。John Mayer《Gravity》里2弦15品推到17品的慢速全音推弦，配合音量旋钮由弱渐强，起音像人声一样慢慢进入。",
    application: "①先唱：把你要弹的句子用嘴唱出来，唱不出就弹不出。②选一个小调五声指型，只用它即兴，限制反而出句子。③在一个和弦上只练琶音：上下行、三度模进、隔弦跳进，弹到不用想。④加入「目标音」思维：每个乐句结束的音必须是当前和弦的3音、5音或根音，最好提前半音趋近。⑤推弦前先弹目标音，再弹起点音，最后练推；用调音器检查推弦到位。⑥录音回放，数一数有多少个音落在和弦音上，低于一半说明你在绕圈。⑦每次只加一种技巧，不要同时上推弦、扫拨与点弦。",
    practice: "用A小调与E blues两种材料：①12小节E blues进行（E7-A7-B7），只用E小调五声第1指型即兴，节拍器80，连弹三遍，句子之间留四拍空白。②A7-D7-E7的琶音，按5弦5品A、4弦6品C#、3弦9品E、2弦8品G的型平移，每和弦两遍。③慢速全音推弦专项：2弦15品推到17品，调音器验证，十次全对。④一首曲子里只用五声加一个推弦加一个揉弦，录下来听是否成句。",
    diagram: {"root":57,"iv":[0,3,5,7,10]},
    audio: {"type":"seq","notes":[{"m":57,"d":0.3,"gap":0.32},{"m":60,"d":0.3,"gap":0.32},{"m":62,"d":0.3,"gap":0.32},{"m":64,"d":0.3,"gap":0.32},{"m":67,"d":0.3,"gap":0.32},{"m":69,"d":0.5,"gap":0.52}]}
  },
  "vl-bow": {
    simple: "弓就是呼吸。弓段分配决定句子的形状：起奏多用下半弓，长音走全弓，快速分弓只用中弓一小截。发音靠三要素——弓压、弓速、接触点，任何一项失衡都会出现破音或空洞。分弓是每音一弓、方向交替；连弓是一弓多音；跳弓（spiccato）靠弓杆自然弹性在中弓轻弹，断弓（martelé）靠每个音之前的加压起奏。音色控制还包括接触点在琴码与指板之间来回移动，以及用靠近弓尖或弓根的位置来调节重量。真正的变化不在音量，而在弓速曲线的安排。",
    pro: "弓根到弓尖划分为全弓、二分之一、四分之一等弓段。核心规则：音量与弓速成正比，可用压力与弓速成反比——弓走得越快，能加的压力越大；在弓尖小指要加压补偿杠杆损失，在弓根小指要减压防止压死。接触点方面，f时靠近琴码，p时靠近指板；把位越高弦越短，接触点要相应向琴码方向微调才能保持音质。A弦上的分弓一般用四到六厘米弓长，每个音都是「停-走」的清晰起音；连弓换音时弓速必须保持不变，换弦靠右手手腕画一个小弧，提前把弓靠到下一条弦。spiccato：在中弓、弓杆离弦一到两厘米，靠前臂轻微横向摆动让弓自然弹起；速度更快时转为sautillé，几乎只靠弓毛弹性。长音处理：先平直起音，一拍后加揉弦，句尾收揉并稍微收弓速。",
    realWork: "圣-桑《引子与回旋随想曲》的回旋段要求极快的spiccato，米尔斯坦把弓段控制在中弓约五厘米，减小弓杆高度换来清晰的颗粒。柴可夫斯基《D大调小提琴协奏曲》第一乐章副部主题用宽广的全弓连弓，每句从弓根起、到弓尖收，配合揉弦渐强推出高点。巴赫《E大调第三组曲·前奏曲》则靠跨弦连弓维持连绵不断，每次换弦手腕画弧、弓速不减。海顿的弦乐四重奏分弓段落常用「上弓起、下弓落」的编排，让重音自然落在句头。",
    application: "①空弦长弓：节拍器60，四拍下弓四拍上弓，用手机录音后看音量是否恒定，弓尖变轻就补小指压力。②弓段标记：把一首练习曲的每个音标上弓段与方向，严格按照标记拉，不临时改。③分弓与连弓交替：同一段音型先全分弓，再两音一弓、四音一弓，体会弓速如何重新分配。④换弦练习：在两根相邻空弦上做慢速连弓换弦，只动手腕，胳膊保持不动，做到听不出换弦的断点。⑤spiccato从中弓的落弹开始：先让弓自然落下弹起，找到弹性点后再加节奏。⑥录音对比，检查每个音头是否清晰、弓尖是否发虚。",
    practice: "①四根空弦全弓各八拍，录音检查音量曲线是否平直，尤其是弓尖与弓根。②塞夫契克或开塞的一条分弓练习，用中弓四厘米弓长、节拍器从60到100，每音起音清晰。③spiccato专项：A弦中弓，先自由弹跳十次，再按四分音符、八分音符、十六分音符依次加快。④自选一个抒情乐句，标出每弓的弓段与接触点变化，用pp在指板附近、f在琴码附近各拉一遍。",
    diagram: {"root":62,"iv":[0,4,7]},
    audio: {"type":"seq","notes":[{"m":62,"d":0.5,"gap":0.52},{"m":66,"d":0.5,"gap":0.52},{"m":69,"d":0.5,"gap":0.52},{"m":74,"d":1,"gap":1.05}]}
  },
  "fk-mode": {
    simple: "笙的音位不是按音阶顺序排的，而是传统的「相和」配置：按下一个按指会同时接通几支笙苗，发出主音加五度、八度的和音，所以笙的音律思维是先有和音、后有单音。现代改良笙（24簧、36簧、加键笙）才逐步做到半音齐全、可以自由转调。箫的音律介于纯律与平均律之间，靠口风微调：气急音偏高，气缓音偏低。筒音是全按所得的最低音，也是定调与校音的基准。颤音方面，箫主要用腹部控制的气颤，一般在长音后半段加入，先平直后颤动，切忌从头颤到尾。",
    pro: "传统17簧笙以「相和」为原则配置音位，民间称之为和音、老配：一个按指对应一组固定音程关系，因此旋律与和声是同时产生的，转调需要换笙或改用单音加按，现代笙通过加键实现十二半音齐全。演奏上，和音的手指必须同时落齐，气息要平稳才能让多个簧片同时起振；常用技法有呼舌（舌在口腔内前后抽动形成气流脉冲）、花舌、打音与倚音。箫的前五后一六孔，筒音作5时依次抬孔得6、7、1、2、3、4（首调），高八度靠超吹：风门收紧、气流加速，筒音超吹即得上方八度。音准修正：筒音偏低可略开尾端调音孔或抬高风门；某孔偏高则下唇前推减小气流角，偏低则加大气速或用半孔。气颤靠膈肌每秒五到六次轻微起伏，幅度控制在十几音分；指颤只在开孔上方约一厘米处扇动，避免过度影响音准。",
    realWork: "笙：阎海登《晋调》取材山西民间音调，用传统和音铺底，快速段落以双吐与呼舌交替，把地方戏曲的语气移植到笙上；他的和音用法始终保留五度与八度的骨架。箫：张维良演奏的《春江花月夜》引子（柳尧章改编）用G调洞箫筒音作5吹出散板长句，靠气口分句、句尾加气颤，音量由弱渐强再收回，示范了箫的气息与音准控制。两者合奏时，笙的和音托住箫的长音，箫的留白又给笙让出空间。",
    application: "①把笙的和音关系背下来：每个按指对应哪几个音，用笔画成表格贴在谱台。②和音起振练习：慢速按下、保持、放松，听几个簧是否同时响，有先后就调整落指。③箫的音准表：用调音器逐个测筒音到高八度的每个音，记录偏差，标出需要用口风或半孔修正的音。④颤音分阶段：前两拍平直，第三拍起颤，句尾收颤并回到中心音高。⑤把一段旋律分别用「全程颤」与「后半颤」各吹一遍，对比哪种更耐听。⑥录音后统计：整段里有多少音偏离超过十五音分。",
    practice: "①笙：三个和音按指各保持四拍，连做三组；再用呼舌连续吹奏十秒不断。②箫：G调洞箫筒音作5，筒音到上方八度的音阶逐音校对，每个音四拍，偏差超过十音分的音标红并单独重练。③长音颤音：筒音八拍，前四拍平直、后四拍加气颤，重复五次。④选一段五声旋律，全程只用气颤与缓吹渐强，不用任何指颤，录一遍听是否自然。",
    diagram: {"root":60,"iv":[0,7,12]},
    audio: {"type":"chord","root":60,"iv":[0,7,12],"dur":1.8}
  },
  "hi-era": {
    simple: "每个时代的音乐有可听的指纹，抓住五秒就能分辨。巴洛克：几条旋律平等地缠在一起（复调），底下有通奏低音持续铺着，力度像台阶一样整块整块地变，没有渐强渐弱。古典：一条清晰的旋律配上规整的伴奏，四小节一句像说话一样对称，和声换得慢，整体干净均衡。浪漫：和声半音化、乐队庞大、速度随情绪起伏（弹性速度），情绪幅度极大。印象：功能和声消失，色彩靠平行和弦与全音阶，声音朦胧。二十世纪：不协和不再需要解决，节奏复杂甚至多节拍并存，音色本身成为主题。当代流行：循环段落、音色与制作主导，和声简化到四五个和弦。把这六条指纹分别配一首代表曲反复听，几天之内就能建立时代直觉。",
    pro: "听觉指纹的技术成因。巴洛克：数字低音 + 模仿对位，力度为阶梯式（terraced dynamics）因羽管键琴无法做渐强；装饰音体系（trill、appoggiatura）是演奏者的即兴空间。古典：功能和声成熟，和声节奏以小节甚至乐句为单位；乐句结构方整（4+4、8+8）；阿尔贝蒂低音；曼海姆渐强成为新武器；奏鸣曲式提供戏剧结构。浪漫：半音化与远关系转调、扩展的属功能（属九、属十三）、等音转调、皮卡迪三度；rubato 与 tempo rubato 记谱化；标题音乐与主导动机。印象：全音阶、五声音阶、平行九和弦、无解决的七和弦与九和弦、功能和声让位于色彩；踏板与泛音成为结构因素。二十世纪：无调性与十二音、多调性、复合和弦、附加节奏与赫米奥拉、序列主义、音色旋律；斯特拉文斯基的节奏错位；爵士的和声扩展（十一、十三、替代和弦）。当代：loop 结构、音色设计、侧链、量化与微调音高、响度战争与流媒体母带标准。",
    realWork: "六个时代各一首锚点曲：巴赫《勃兰登堡协奏曲第三号》BWV 1048 第一乐章（复调与数字低音）；莫扎特《第 40 号交响曲》K.550 第一乐章（古典的方整乐句与半音化的浪漫预兆）；肖邦《降 E 大调夜曲》Op.9 No.2（浪漫的 rubato 与加花旋律）；德彪西《牧神午后前奏曲》（印象派的无功能色彩）；斯特拉文斯基《春之祭》第一部分（二十世纪的节奏暴力）；约翰·威廉姆斯为《星球大战》写的 Main Title（当代管弦与功能回归）。另外必听瓦格纳《特里斯坦与伊索尔德》前奏曲，它处在浪漫与二十世纪的断裂点上，那个不肯解决的属和弦是整部现代音乐史的入口。",
    application: "建立时代直觉的四步训练。① 每首锚点曲只听开头十五秒，写下三个词描述听感（如复调、透明、无渐强），做成一个六格表。② 打乱顺序盲听三十秒，凭印象填时代，错了回去重听并补一句为什么错。③ 做两两对比：巴赫对莫扎特（织体）、莫扎特对肖邦（演奏自由度与和声密度）、肖邦对德彪西（功能有无）、德彪西对斯特拉文斯基（节奏与协和观）、斯特拉文斯基对威廉姆斯（不协和是否回归功能）。④ 每周挑一首陌生作品盲测，把判断依据写成三行：织体特征、和声特征、节奏与音色特征。训练目标是听到任何作品能在二十秒内说出时代与理由，而不是只说好不好听。",
    practice: "今天做盲听测试：准备六段十五秒音频（巴赫 BWV 1048、莫扎特 K.550、肖邦 Op.9 No.2、德彪西《牧神午后》、斯特拉文斯基《春之祭》、威廉姆斯《星球大战》Main Title），打乱顺序播放，每段写下时代名称与两条判断依据（织体、和声、节奏、音色任选其二）。全部答完再核对，把判断依据错误的一栏抄写三遍。接着挑其中两首，写出它们在力度处理上的具体差别：巴赫是整块切换，肖邦是连续的渐强渐弱与弹性速度。",
    diagram: {"root":60,"iv":[0,3,7]}
  },
  "ae-judge": {
    simple: "说一首曲子好或坏，必须能给出可论证的理由，否则只是偏好陈述。可论证的标准有六条：一是材料的经济性，一个动机是否被充分发展，而不是不断换新材料掩盖贫乏；二是内部一致性，风格、织体、和声语言前后是否自洽，半途换一套语法通常意味着失控；三是比例与平衡，高潮是否出现在合适位置、留白是否足够、段落长度是否失衡；四是技术的完备性，声部进行是否干净、织体是否有层次、和声节奏是否合理；五是意图与实现，想表达的东西是否真的通过技术手段达成，还是只靠标题或歌词暗示；六是语境，放在它所属的时代与体裁里看，它提供了什么新东西。这六条不能互相替代，也不能拿其中一条去否定另一条——用交响曲的发展逻辑批评一首电子舞曲，本身就不是判断而是错位。",
    pro: "把审美判断标准落到可检验的技术项上。材料经济性：统计全曲出现多少个不同的动机，若超过三个且彼此无派生关系，说明材料松散；检查动机是否经过移位、倒影、逆行、扩大、缩小、截断六种变形中的至少三种。内部一致性：和声语言是否统一（不能前一半功能、后一半无调性而没有过渡）、织体切换是否有动机性理由。比例：用小节数算高潮位置，古典与浪漫作品的高峰多落在全长的 0.6 至 0.75 处；检查各段长度比是否接近简单整数比（1:1、2:1、3:2）。技术完备：声部进行是否避免平行五八度，非和弦音是否被正确处理，织体是否避免中音区堵塞。意图实现：力度曲线是否有整体方向而非原地起伏，句法呼吸是否清晰。语境：找出作品在体裁谱系中的前两代作品，比较它新增了什么语法。逐项打一到五分，加权得出判断，过程可复现。",
    realWork: "用《欢乐颂》主题示范可论证的评价：贝多芬《第九交响曲》Op.125 第四乐章主题共十六小节，核心材料只有 E-E-F-G 四个音，随后通过模进（依次移到 D 上）、倒影与截断发展出整段，材料经济性极高；和声是 I–V–I 的朴素骨架，句尾落在完全正格终止，内部一致性完整；旋律高点在第八小节，正好是全长的黄金分割附近；四小节一句、八小节一段的比例严格对称。相应的反面例子是大量短视频配乐：四小节内换三个动机、和声每拍一换、靠加大音量制造高潮，六条标准中至少三条不合格。这两者的差距不是主观喜好，而是可以从谱面上逐条指出的客观差异。",
    application: "把判断变成流程，五步走。① 先做事实记录，不听感觉只记数据：全曲多长、分几段、用了几个动机、和声换了多少次、高潮在第几秒。② 逐项对照六条标准打分，每项必须写一句谱面依据（如材料经济性 2 分：第 5 小节引入全新动机且后续不再出现）。③ 明确你的评价立场属于哪个维度，若为表现维度就不要用工艺标准去扣分。④ 找一个支持方观点与一个反方观点，各写三句话，看哪一方证据更强。⑤ 隔两周重听并复核，若改判就写明原因。关键纪律：永远先说依据再说结论，禁止先说好听或难听再找理由。养成这个顺序，你的判断会越来越难被反驳，也会越来越诚实。",
    practice: "任务：给一首自己最近喜欢的流行歌做一份完整审美评估。具体做：① 数出全曲使用的不同动机数量与每种变形手法出现的次数；② 算出高潮位置在全曲时长的百分之几；③ 检查段落长度比是否为简单整数比；④ 对照六条标准各写一句评价与一句谱面或音频依据；⑤ 最后写一段结论，说明它好在哪一类标准上、在哪一类标准上并不出色。全部写完放两周后重听复核，用另一种颜色标出改判的地方，并说明为什么改。",
    diagram: {"root":64,"iv":[0,4,7]}
  },
  "ex-param": {
    simple: "表达可以被拆成六个可调参数，每一个都有具体的操作范围。速度：不只是快或慢，而是基准速度加局部弹性，慢曲容易拖，快曲容易赶。力度：要设计层级而不是随手加大，通常三到四个层级就够（如 pp、mf、f），太多层级反而听不出差别。触键：同一力度可以用重而慢或轻而快两种方式弹，前者厚、后者亮，这是音色的秘密。呼吸：句与句之间留一个气口，通常四分之一拍到半拍，不留气口就会糊成一片。音色：靠触键速度、踏板与音区选择共同决定，明亮与暗淡是可以设计的。时值偏离：把重要音稍微拉长（时值重音），把经过音稍微缩短，这是让旋律说话的关键。六个参数各调一点点，声音立刻从学生变成音乐家。",
    pro: "六项参数的技术取值与规则。速度与 rubato：基准 BPM 依体裁定（如肖邦夜曲主题 ♩=60 至 69），rubato 幅度控制在 ±10% 以内，且遵循借贷守恒——一句中拉长的部分必须在后续补回；原则是旋律方向上行可加速、高点可放宽、句尾可减速，避免在每个音上摇摆。力度：设计四级（pp、p、mf、f）而非连续无级变化，相邻层级差约 8 至 10 分贝；力度曲线以乐句为单位做拱形或阶梯，整曲做更大拱形。触键：重量（手臂重量比例）与速度（触键瞬间速度）两个变量决定音色，高重量低速度得到厚暖音，低重量高速度得到明亮颗粒音；legato 靠重量在指间转移，staccato 靠指尖反弹速度。呼吸：句间气口 0.2 至 0.4 秒，句尾音缩短 10% 至 20%。音色：踏板深度与换踏点按和声更换，弱音踏板改变频谱而非仅音量；音区选择提升或降低明亮度。时值偏离：重音音延长 5% 至 15%，经过音缩短 5% 至 10%，长音后的短音可稍晚进入以制造期待。",
    realWork: "参数效果在真曲里最清楚。肖邦《降 E 大调夜曲》Op.9 No.2 的主题：旋律每句都从弱起拍进入，若把弱起音与正拍音弹成等长，句子就死板；所有优秀录音都把弱起音缩短并把正拍音稍延长（时值重音），这就是分句感的技术来源。鲁宾斯坦 1965 年版在第 4 小节的第一拍之前留了近半拍的气口，把呼吸变成表情。德彪西《亚麻色头发的少女》靠大量使用弱音踏板与极慢触键速度制造朦胧音色，同一力度改用快速触键就立刻变成莫扎特。古尔德 1981 年版《哥德堡变奏曲》咏叹调把 ♩=60 左右的速度与极清晰的断奏结合，证明慢速加颗粒感可以产生冥想气质。把这些录音按参数拆开听，是学习表达最快的方式。",
    application: "练习方法是单参数实验，一次只动一个变量。① 速度实验：同一段用 ♩=60、72、84 三个速度各弹一遍，录音，判断哪个速度让旋律线条最清楚——多数抒情旋律在中等偏慢时最清晰，快速时细节丢失。② 力度实验：先用全程 mf 弹一遍，再加三级力度弹一遍，比较段落感是否出现。③ 触键实验：同一段分别用极连奏与半断奏弹，体会音色由柔到亮的变化，注意保持力度不变才能确认变化来自触键。④ 时值实验：把每句的第一个音延长百分之十、句尾音缩短百分之十，再与原样对比，体会呼吸感。⑤ 踏板实验：一拍一换与两拍一换对比，看清晰度与共鸣如何消长。每次实验必须录音并写下听到的差别，凭记忆判断几乎总是错的。",
    practice: "任务：选肖邦《降 E 大调夜曲》Op.9 No.2 开头八小节（或八小节自编旋律），做四次单参数录音：① 全程 mf 无 rubato；② 只加速度变化（句首紧、高点放宽、句尾缓，幅度控制在 10% 内）；③ 只加力度（弱起 p、正拍 mf、高点 f、句尾回 p）；④ 只加时值偏离（句首音缩短 10%、重音音延长 10%）。四次录音连续回放，写下每次带来的变化分别对应段落感、线条感、呼吸感中的哪一项。最后合成一次全部处理，检查是否因为叠加过多而失去清晰度。",
    audio: {"type":"seq","notes":[{"m":63,"d":0.5,"gap":0.52},{"m":67,"d":0.5,"gap":0.55},{"m":70,"d":0.5,"gap":0.52},{"m":67,"d":0.9,"gap":0.95}]}
  },
  "ex-lab": {
    simple: "表达实验是最有效的训练方式：同一段音乐用不同的处理方案演奏，录音并对比，你会亲耳听到每个决定带来的后果。实验要遵守单变量原则——一次只改一个参数，否则不知道效果是谁造成的。标准实验有五组：严格节拍对弹性速度；平力度对拱形力度；断奏对连奏；多踏板对少踏板；三个不同速度横向比较。每组录 A、B 两条，间隔不超过五分钟，回听时写下三句话描述差异。做完五组你会得到一个属于自己的参数库：知道在抒情段落拉长句尾有效，在快速经过句上做 rubato 会拖垮线条。这个库比任何老师的口头描述都可靠，因为它是你自己听出来的。",
    pro: "实验设计的技术规范。变量控制：每次只改一项，其余严格固定（用节拍器锁定速度、用固定力度档位锁定音量）。A/B 对比：两条录音长度一致、录音设备与位置一致，间隔不超过五分钟以保证状态稳定。观察指标量化：段落感（能否听出乐句边界）、线条感（旋律是否连续成句）、清晰度（内声部是否可辨）、说服力（是否产生情绪倾向）。五组标准实验的具体设置：速度组取 ♩=60、72、88 三档；rubato 组为严格节拍对 ±10% 弹性；力度组为恒定 mf 对 pp-mf-f 三级拱形；触键组为全连奏对半断奏；踏板组为每和弦一换对每两小节一换。每组听完打分（一到五分）并写一句原因，五组做完把结果汇总成表，找出对你所弹曲目最有效的两项处理，写进以后的固定方案里。",
    realWork: "最著名的现成实验是格伦·古尔德两次录制的巴赫《哥德堡变奏曲》BWV 988：1955 年哥伦比亚首版速度飞快、断奏锋利、装饰音一气呵成；1981 年版整体放慢近三分之一，声部层次加厚，咏叹调被弹成一首长呼吸的祷歌。同一套音符，两个方案，两种美学，谁都不能说服对方——这正说明表达是选择而非对错。另一个可做的现成对照是肖邦《降 E 大调夜曲》Op.9 No.2 的鲁宾斯坦版（rubato 幅度大，旋律像即兴说话）与波利尼版（速度稳定，靠声部平衡与音色变化说话）。再一个是阿尔弗雷德·科尔托的肖邦录音，错音不少却句法极强，说明说服力可以独立于技术精度存在。",
    application: "完整的实验流程共六步。① 选一段八到十六小节、技术上完全可控的音乐，太难的材料会让注意力全用在手指上。② 录基线：严格按节拍器、固定力度、无踏板，保存为 A。③ 设计实验组 B：只改一个参数，写下具体数值（如速度 ♩=72 改为 ♩=84）。④ 录 B，紧接着回听 A 与 B，写下三到五句差异描述，禁止用好或坏，只描述听到的现象。⑤ 打分：段落感、线条感、清晰度、说服力各一到五分。⑥ 把结果填入一张表，行是实验组别，列是四项指标，累计做满二十组实验。二十组之后，你会清楚知道每种体裁、每种织体下哪两个参数最有效，演奏决策从犹豫变成确定。",
    practice: "任务：选《小星星变奏曲》（莫扎特 K.265）主题八小节，用手机录音做三组 A/B 实验。A 组统一为严格节拍 ♩=96、全程 mf、连奏。B1 改为 ♩=76；B2 改为力度拱形（弱起 p—高点 f—句尾 p）；B3 改为半断奏。三次都录下来，与 A 连续回放，每项写下段落感、线条感、清晰度、说服力四项一到五分，并各写一句听到的具体现象（如 B1 的句子边界更清楚但推进力下降）。最后挑出得分最高的一组，写一句它为什么适合这段音乐。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "st-lab": {
    simple: "把同一段旋律或同一组和弦用不同风格重做，是检验你是否真的掌握风格的唯一办法。做法是固定一个八小节的骨架（比如I-vi-IV-V或十二小节布鲁斯），只改变节奏、音色与装饰，其他一律不动。这样你会清楚看到哪些要素真正决定风格：同样是C-Am-F-G，用八拍摇滚扫弦、用bossa nova的切分指弹、用圆舞曲的蹦-恰恰、用funk的十六分断奏，听感完全不同。每次实验都要录音对比，并写下造成差异的三个变量，否则只是换了个伴奏型，什么也没学到。",
    pro: "以C大调的C-Am-F-G为材料做四版。版本一民谣分解：p-i-m-a依次拨5-3-2-1弦，八分音符循环，低音走根音C-A-F-G。版本二Bossa nova：和弦换成Cmaj9-Am9-Fmaj7-G13，低音用根音与五音交替，右手四指指弹并强调反拍切分，节奏参考两小节的clave律动。版本三Funk：全部用十六分音符的九和弦短音，右手手掌闷音，只在每小节第一拍与「第二拍后半」放开，加入9到1的装饰音。版本四Swing：和声ii-V-I化（Am7-D7-G7-Cmaj7），八分音符按三连音1-3摇摆，和弦用4-3-2-1弦的drop2排列。原则是一次只改一个维度，才能确定差异归属。",
    realWork: "迈尔斯·戴维斯在专辑《Round About Midnight》里把Thelonious Monk的《'Round Midnight》从bebop曲目改成冷爵士叙事：加上Harmon弱音器、放慢速度、大量留白，和声被拉长成块状；而Monk本人的版本充满不规则重音与密集半音和声。同一个主题、两种处理，是最直观的风格实验教材。另一个方向：披头士《Yesterday》的古典尼龙弦分解被无数人改成雷鬼（和弦只落在第二、四拍的反拍上）与波萨诺瓦，骨架不变而风格全变。",
    application: "①固定材料：选八小节、速度80、和声进行写死，不许改。②列变量清单：节奏型、和弦色彩（是否用七九音）、音色（清音/失真/尼龙弦）、装饰音、低音走向。③每次只改一项，录一版，命名标清楚改了什么。④三版之后做盲听测试：隔一天再听，能一秒认出风格说明变量有效，认不出说明改得不够或改错了维度。⑤把有效的变量组合起来做第五版，形成你自己的混血版本。⑥为每版写三行笔记：哪个变量贡献最大、哪个变量无效、下次怎么改。",
    practice: "①用C大调的C-Am-F-G，做四个版本：民谣分解、波萨诺瓦切分、funk十六分闷音、摇摆八分，节拍器全部80。②每个版本录一轨两分钟，文件名写清变量。③盲听测试：把四段打乱播放，记录你能否立刻辨认，写下判据（比如「反拍和弦+清音=波萨诺瓦」）。④挑出判据最弱的一版，加大该变量（如把切分密度加倍）重录，直到一秒可辨。⑤写一段一百字的实验总结。",
    diagram: {"root":60,"iv":[0,4,7,11]},
    audio: {"type":"seq","notes":[{"m":60,"d":0.35,"gap":0.37},{"m":64,"d":0.35,"gap":0.37},{"m":67,"d":0.35,"gap":0.37},{"m":69,"d":0.35,"gap":0.37},{"m":67,"d":0.35,"gap":0.37},{"m":64,"d":0.6,"gap":0.65}]}
  },
  "st-fuse": {
    simple: "融合不是把两种风格各放一半，而是找到它们共享的接口：共同的和声基础、共同的节拍骨架，或共同的音色逻辑。可行做法是让一种风格提供结构、另一种提供装饰与音色——比如用布鲁斯的十二小节框架，装进爵士的ii-V和声与摇摆节奏；或用摇滚的节奏组，装进弗拉门戈的Phrygian旋律。失败多半来自节拍冲突（4/4直拍对 clave 的三二律动）或和声语汇冲突（一个要持续低音、一个要频繁转位），只要底层打架，表面再花哨也站不住。",
    pro: "三个可操作的接口。其一，和声接口：保留布鲁斯的I7-IV7-V7骨架，把V7替换成ii-V（Gm7-C7），得到布鲁斯结构加爵士色彩；或把安达卢西亚终止Am-G-F-E放在4/4摇滚鼓点上，主音E上弹E Phrygian（E-F-G-A-B-C-D），b2的F就是风格标识音。其二，节奏接口：把funk的十六分切分放在爵士和声（如Cm9-F13）上，鼓保持直十六分、贝斯锁根音、和弦用短促闷音，这就是fusion；若两边都强调切分会互相抵消，需要一方（通常是鼓）回归基本拍。其三，音色接口：失真吉他与笙或箫叠加时，让吹管负责长音与留白、吉他负责节奏颗粒，并把吉他中频2到4kHz适度衰减，给吹管的基频区让路。",
    realWork: "Weather Report的《Birdland》（Joe Zawinul作曲）：4/4的funk摇滚鼓点加爵士和声（F7与Bb的交替），Jaco Pastorius用十六分音符的funk律动与和弦音走贝斯，铜管与合成器铺和声，是「爵士和声加摇滚节奏」的教科书。另一个例子是Rodrigo y Gabriela用尼龙弦吉他翻奏《Stairway to Heaven》：保留弗拉门戈的rasgueado、golpe与Am调色彩，把摇滚的结构与riff嫁接到弗拉门戈技法上，两种语法各司其职而不打架。",
    application: "①先定「结构方」与「装饰方」：结构方给框架（小节数、和声级数、鼓型），装饰方给音色与旋律语汇，不要两边都改。②检查底层是否冲突：把两边的节奏骨架单独打出来对拍，冲突就让一方简化。③和声对齐：写出两种风格各自的核心和弦，找公共子集（比如都用小七和弦），从公共子集出发再逐步加各自的特征音。④编配避让：列出两件乐器的频段与节奏密度，让它们在不同频段、不同拍点上出现。⑤小样试听：先只录节奏组与一件旋律乐器，确认骨架站得住再加声部。⑥请一个不懂编曲的人听，若他能说出两种风格的名字，融合才算成功。",
    practice: "①做一段十二小节布鲁斯（E调或A调）：保留I7-IV7-V7骨架，把第9到10小节的V7替换成ii-V（如A调中的Bm7-E7），用摇摆八分弹，录一版。②再做一版：同样的骨架，鼓与贝斯改成直十六分funk，和弦只弹九和弦短音，对比两版差异。③编配实验：用吉他（或键盘）负责节奏颗粒，另一个声部用长音铺底，分别在2到4kHz做衰减与提升，录两版对比是否浑浊。④写一段一百字说明你的融合选择了哪个接口、放弃了什么。",
    diagram: {"root":52,"iv":[0,1,3,5,7,8,10]},
    audio: {"type":"seq","notes":[{"m":52,"d":0.3,"gap":0.32},{"m":53,"d":0.3,"gap":0.32},{"m":55,"d":0.3,"gap":0.32},{"m":57,"d":0.3,"gap":0.32},{"m":59,"d":0.3,"gap":0.32},{"m":60,"d":0.5,"gap":0.55},{"m":64,"d":0.8,"gap":0.85}]}
  },
  "triad": {
    application: "任何歌曲的柱式和弦就是三和弦。先能在键盘上一眼看出一个和弦的 1/3/5，再练转位让低音更顺——比如 C 大三和弦的第一转位（E-G-C）让低音离下一个和弦更近。写歌时三和弦是 90% 进行的基础。",
    practice: "给一段简单旋律，用最基础的大/小三和弦为每个重拍配一个和声；再把这些和弦都弹成‘根音在最低音’和‘第一转位’两种，听低音线条的差异。"
  },
  "majmin": {
    application: "想让段落‘亮/暗’切换，就互换大三/小三。副歌用大三提能量，桥段用小三制造低落或悬念。先听熟两者差别（大三的 3 音更‘开’，小三的 3 音更‘收’）再用于写作。",
    practice: "同一旋律分别配大调和小调和弦，听情绪变化；再试在主歌用小三、副歌用大三，体会‘暗→亮’的释放。"
  },
  "dom7": {
    application: "任何‘想回家’的位置用属七。它含导音与下属音两个推力，解决到主和弦极自然。先练 G7→C 的解决手感（导音 B→C，F→E），再扩展到其他调与移调。",
    practice: "在终止处用 V7 替代 V，体会更强的解决推力；再在键盘上把 G7→C 连弹十遍，让手和耳都记住‘回家’的倾向。"
  },
  "secdom": {
    application: "想让进行‘拐个弯’更有推动，插入 V/V（如 C 大调里的 D7，它解决到 G）。它在本调是临时出现的‘外地属和弦’，解决到 V 后就‘回归’。写歌副歌前用它制造离调推力很常用。",
    practice: "在 I–V–I 里插入 D7→G（即 C 大调的 V/V→V），听临时离调的推力；再试在一段进行中连续用两个副属和弦制造更长的‘绕路’。"
  },
  "cadence": {
    application: "写歌时副歌前用半终止（停在 V，‘逗号’）吊胃口，段落结束用完全终止（V–I，‘句号’）。不同终止式决定音乐的‘标点’。想‘意犹未尽’就用半终止收句。",
    practice: "给一段旋律设计终止：哪里用半终止（停在属和弦）、哪里用完全终止（V–I）；再对比两种收尾带来的‘停’与‘不停’感。"
  },
  "fivescale": {
    application: "写国风/游戏旋律直接用五声，怎么弹都不撞（没有导音和小二度碰撞）。先练在五声里即兴，再试着加一个变宫（7）制造色彩变化或‘现代国风’感。",
    practice: "用五声音阶即兴一段，再试着加一个变宫（7）制造色彩变化；再用五声写一条 4 小节旋律，检查是否‘怎么弹都和谐’。"
  },
  "harmony": {
    simple: "和声研究的是「几个音同时响」，以及「和弦之间怎么走」。它不是和弦表的背诵，而是一套关于张力与解决的语言：稳定和弦（主）让人想停留，不稳定和弦（属、导）产生非往前走不可的推力，音乐就在这两者之间来回拉扯。掌握和声，你能听懂为什么一段进行让人想哭或想跳，能在钢琴上随手为旋律配出和弦，能把别人的曲子拆出骨架，也能主动设计和声去制造你想要的情绪。",
    pro: "功能和声把音级分为三大功能：主功能 T（I、vi，提供稳定与归属）、属功能 D（V、vii°，含导音，制造向主的强烈倾向）、下属功能 S（IV、ii，离开主但不紧张，为属做准备）。完整的张力循环是 T–S–D–T。一个和弦的功能由它在调内的音级与所含倾向音决定：导音 7 强烈上行到 1，四级音 4 倾向下行到 3，这两个半音倾向是整个调性音乐的动力来源。四部和声写作还需遵守：避免平行五度与八度、导音上行解决、七音下行解决、内声部尽量级进。",
    realWork: "巴赫《平均律键盘曲集》C 大调前奏曲 BWV 846，整首表面是琶音练习，实质是 I–ii7–V–I 等功能的连续展开，低音线条就是一条清晰的功能骨架。贝多芬《月光》第一乐章把升 c 小调的单一和声色彩用三连音织体拉满整首，证明织体本身也能承担和声表达。周杰伦《晴天》主歌 C–G–Am–F 是流行音乐最常用的 I–V–vi–IV，四个和弦撑起整首歌。",
    application: "拿到一首想弹的歌，不必先找谱：① 听最后一个和弦，它通常就是主和弦，据此确定调性；② 用 I、V、vi、IV 四个和弦试配旋律，绝大多数流行歌够用；③ 判断规则——旋律长音落在 1 配 I，落在 5 配 V，落在 4 或 6 配 IV 或 ii，落在 3 配 I 或 iii；④ 想更煽情把 I 换成 vi，想更开阔把 vi 换成 IV，想推向高潮用 V 或 V7。配完后整体听一遍，只调整一到两处，不要全部推翻重来。",
    practice: "在 C 大调上弹 C–Am–F–G，每和弦两拍，循环四遍，先把左手根音走顺。然后只改一个地方：把最后的 G 换成 G7（加 F 音），听结尾是否多出强烈的「想回家」感。再把开头的 C 换成 Cmaj7（加 B 音），听色彩是否立刻变柔。这两次改动，就是功能和声与色彩和声的分界线。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "h-tool": {
    simple: "基础功能和声是一套最小可用工具箱：四个功能和弦（I、IV、V、vi）加上它们的七和弦版本，就足以应对绝大多数流行、民谣、摇滚的伴奏与创作。这组工具的意义不在「记住和弦」，而在于理解每个和弦的「性格」——I 是家，IV 是离家但安全，V 是急着回家，vi 是家的忧伤版本。理解性格，你才能主动选择，而不是碰运气。",
    pro: "大调中的四个核心和弦：I（大三，最稳定）、IV（大三，下属，含 4 音倾向下行到 3）、V（大三，属，含导音 7 倾向上行到 1）、vi（小三，主功能的替代，色彩忧伤）。加上各自的七和弦：Imaj7（柔和明亮）、IVmaj7（开阔）、V7（属七，含三全音 B–F，强烈倾向解决）、vi7（忧郁）。小调中对应为 i、iv、V（需升高导音）、VI。判断一个和弦能否用的标准不是「好不好听」，而是它承担什么功能、处在进行的哪个位置。",
    realWork: "The Beatles《Let It Be》全曲 C–G–Am–F，只用四个和弦；Bob Dylan《Blowin in the Wind》同样是 C–G–Am–F 的变体；Taylor Swift《Love Story》C–G–Am–F 贯穿。三首风格完全不同的歌，用的是同一套工具箱——差别在织体、速度与配器，而不在和弦复杂度。这正说明基础功能和声的承载力。",
    application: "练习路线：① 先在 C、G、D、A 四个常用调上把 I–IV–V–I 弹熟，直到不用想就能找到位置；② 加入 vi，练 I–V–vi–IV 与 I–vi–IV–V 两种最常见的流行进行；③ 把 V 升级为 V7，感受解决的推力；④ 用固定节奏型（柱式或分解）把这组进行跑通，再开始换织体。切忌一开始就追求九和弦、十三和弦——那是色彩，不是地基。",
    practice: "在 C 大调上用柱式和弦弹 I–IV–V–I（C–F–G–C），每和弦一拍，循环八遍直到手不用想。然后改成 I–V–vi–IV（C–G–Am–F），同样跑八遍。最后试着在两个进行之间切换：前两遍用前者，后两遍用后者，听情绪从「坚定」变成「叙事」的瞬间差别。"
  },
  "piano": {
    simple: "钢琴应用关心的不是「把一首曲子弹下来」，而是「把钢琴变成随时可用的表达工具」：听到一首歌能大致跟上，拿到一段旋律能配出和弦，陌生的谱子能视奏下来，歌手想唱什么调你都能弹。这些能力有一个共同的地基——你必须在键盘上「看得见和声」：任何一个和弦，不用想就能找到它的根音、三音、七音，并且知道它在十二个调上分别在哪里。",
    pro: "钢琴应用能力分四个层次：① 位置感——十二个大调的 I–IV–V–vi 及常用七和弦能不假思索弹出；② 织体感——柱式、分解、琶音、Alberti、Ostinato、walking bass 等伴奏音型形成肌肉记忆；③ 听觉—手指直连——听到一个进行，手能直接跟上，中间不经过「想和弦名」的步骤；④ 实时决策——跟人声时能处理变速、停顿、临时转调。训练的核心手段是移调：把同一段进行在十二个调上弹熟，直到「调性」不再构成障碍。大多数人的瓶颈在第①层，位置感没过关就直接练曲目，结果每首歌都要重新背指法。",
    realWork: "莫扎特 K.545 第一乐章的左手阿尔贝蒂低音，是伴奏织体最标准的教材；肖邦《夜曲 Op.9 No.2》左手大跨度分解和弦配合右手自由速度（rubato），展示了织体如何承担表情；Bill Evans 的爵士钢琴 trio 演奏里，左手 voicing 与右手旋律几乎是两个独立的即兴声部。Elton John 的弹唱则证明：柱式和弦加简单装饰，足以支撑一整场演出。",
    application: "建立位置感的训练顺序：① 先在 C、G、D、A、F 五个常用调上练 I–IV–V–I，每调弹到不用看手；② 加 vi 练 I–V–vi–IV；③ 练各调的 ii–V–I（这是所有和声进行的通用模块）；④ 把每一组进行移调到全部十二个调；⑤ 最后加织体——同一组进行分别用柱式、分解、琶音弹。每天 15 分钟移调练习，一个月后调性不再是障碍。切忌一上来就练完整曲目，那是背谱不是能力。",
    practice: "今天就能开始的练习：在 C 大调弹 C–F–G–C，确认手位。然后整体移到 G 大调（G–C–D–G）、D 大调（D–G–A–D）、A 大调（A–D–E–A）。这四个调涵盖了绝大多数流行歌曲。每调弹三遍，第三遍不看手。做完你会发现，同样四个手指形状，换个位置就是另一个调——这就是位置感的起点。"
  },
  "impropiano": {
    simple: "即兴钢琴是为你已经会弹琴、但还不会「自己造句子」的人准备的。它的核心难题不是手指，而是语言：你需要在听到和声的瞬间，脑子里有可用的音型素材，手上能立刻执行。训练路径是从限制开始——先只允许五个音，再逐步放开音、节奏与和声，直到你能在任何进行上自由说话。会即兴的钢琴手，听到任何和弦进行都能在几秒内加入。",
    pro: "即兴钢琴的训练分五个阶段：① 音阶与和弦的音Material——先掌握大调五声、小调五声、大小调音阶、以及各和弦对应的音阶（ii 用多利亚、V7 用混合利底亚、I 用伊奥尼亚）；② 限制即兴——只用五声音阶即兴，因为五声几乎不产生刺耳的音，能建立「敢弹」的信心；③ 动机发展——用 2–4 个音的动机做重复、移位、倒影、扩展，这是让即兴有逻辑的关键；④ 和声即兴——跟着 ii–V–I 弹，在每个和弦上强调其特征音（3、7、9）；⑤ 节奏与留白——即兴的高级标志不是弹得多，而是知道什么时候停。大多数人的问题在跳过第②③步直接追求「弹得像大师」。",
    realWork: "Keith Jarrett 的《The Köln Concert》是钢琴即兴的巅峰——整场音乐会完全即兴，却有着完整的叙事结构。Bill Evans 的即兴以细腻的 voicing 与内声部线条著称。Chick Corea 则融合了拉丁节奏与古典和声。华语方面，顾忠山的爵士钢琴与陈奂仁的即兴都展示了如何将和声语言转化为个人表达。",
    application: "立即可用的即兴方法：① 在 C 大调的 ii–V–I（Dm7–G7–Cmaj7）上，Dm7 用 D 多利亚（D E F G A B C），G7 用 G 混合利底亚（G A B C D E F），Cmaj7 用 C 大调；② 每个和弦只弹三到五个音，不要试图弹满；③ 右手即兴时左手弹根音与七音（如 Dm7 弹 D 与 C），让你随时知道自己在哪；④ 用一个动机（例如 G–A–C 三个音）贯穿整段即兴，在三个和弦上分别做移位；⑤ 强制留白——每弹两个小节，停一拍。留白会让你的即兴听起来成熟十倍。",
    practice: "在 Dm7–G7–Cmaj7 循环上做这个练习：第一遍，每个和弦只弹它的根音、三音、五音（三个音），听和声的骨架；第二遍，每个和弦多弹一个九音（Dm7 加 E、G7 加 A、Cmaj7 加 D）；第三遍，用这三个九音（E–A–D）做成动机，在每个和弦上重复这个动机。这就是从「弹对音」到「说出话」的转变。",
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]}],"step":1.1,"dur":1}
  },
  "improv": {
    simple: "即兴不是凭空乱弹，而是「你脑子里已经有的东西，在手指上实时发生」。它有一条清晰的能力链：先能听（听出和弦变化、听出别人弹了什么），再能预判（知道下一个和弦大概率是什么），然后能反应（在和弦响起的瞬间找到可用的音），最后才是创造（在正确的基础上做出有意思的选择）。绝大多数人即兴卡住，不是因为「没天赋」，而是卡在第一环——耳朵还没建立「音 → 功能」的反射，所以手指不知道该往哪走。因此即兴训练的第一步永远是听和模仿，而不是学和阶指型。",
    pro: "即兴的决策层只有三个问题：① 此刻的和声是什么（和弦性质 + 功能位置）；② 这个和弦的特征音是什么（3 音定大小、7 音定属/大七、9/11/13 提供色彩）；③ 我要把音引向哪里（下一个和弦的哪个音，即 target note）。技术上，一条即兴乐句由「骨架音（chord tone）+ 经过音（passing tone）+ 邻近音（enclosure / neighbor）+ 节奏位置」构成。骨架音落在重拍保证和声清晰，经过音与半音邻近音填满弱拍制造倾向性。节奏的「早进 / 晚进」（anticipation / delay）比音高选择更决定风格：比波普大量使用弱起与延后，而 funk 强调正拍 landing。",
    realWork: "Miles Davis《Kind of Blue》中《So What》全曲只有 Dm7 与 E♭m7 两个和弦，Bill Evans 与 John Coltrane 的即兴完全靠动机发展与节奏错位制造变化，证明即兴的信息量不来自和弦复杂度。Keith Jarrett 的《The Köln Concert》开场在 A 大调上用持续的五声跑动，实质是在极其有限的和声上做密度与起伏的文章。Charlie Parker《Confirmation》的和声每两拍换一次，他的乐句以八分音符琶音贯穿，用半音 enclosure 精确落在每个和弦的 3 音或 7 音上。",
    application: "训练顺序（严格按此推进）：① 选一首只有 2～3 个和弦的曲子（如《So What》），先只用每个和弦的 1-3-5-7 四个音即兴，全部落在正拍；② 加入一个八分音符的经过音，形成「骨架 + 经过」的两音组合；③ 引入邻近音：目标音的前一拍用上下半音夹击（enclosure）；④ 引入节奏变化：把乐句起点延后半拍，或在和弦变换前提前半拍进入；⑤ 只用 2～3 个音做动机发展（重复、移位、倒影），限制越严，创意越真。每一步都要唱出来再弹，唱不出来说明耳朵还没建立。",
    practice: "在 Dm7–G7–Cmaj7 上做 4 轮，每轮 8 小节：第 1 轮只用和弦音（D-F-A-C / G-B-D-F / C-E-G-B）；第 2 轮每两拍加一个音阶经过音；第 3 轮每个乐句结尾用半音 enclosure 落到下一和弦的 3 音；第 4 轮整体延后半拍起句。录音回听，检查是否每个和弦变换处都能清晰听出 3 音或 7 音。",
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]}],"step":1,"dur":0.9}
  },
  "accomp": {
    simple: "即兴伴奏是指：拿到一首没听过的歌，当场用耳朵判断调性与和弦，立刻配上合适的织体，并且跟着歌手的变化走。它需要三项能力叠加——耳朵（听出和声）、手（有现成的织体库）、配合（跟着人呼吸）。和独奏不同，伴奏的首要目标不是表现自己，而是让歌手唱得舒服：你要给出清晰的调性中心、稳定的速度、合适的力度，以及最重要的——留白。",
    pro: "伴奏的完整流程：① 定调——听旋律的结束音（多数歌曲结束在主音）或用首调听觉判断 do 在哪；② 定和声——先抓骨干（主、下属、属三个功能），用罗马数字思维判断每个乐句是 I / IV / V / vi 中的哪个，再补细节；③ 选织体——根据歌曲风格与段落选：抒情用分解和弦（八分或十六分琶音），节奏型歌曲用柱式 + 切分，民谣用扫弦型分解；④ 分配频段——左手低音（根音 + 五音，避免与贝斯打架），中音区和弦（3、7 音为主，省略 5 音），右手可加旋律性填充；⑤ 跟人——看 singers 的呼吸，气口处留白，情绪上扬时加密度。",
    realWork: "《Let It Be》的钢琴伴奏是分解和弦织体的标准范例（C–G/B–Am–F 的低音下行线配合八分琶音）。Elton John 的《Your Song》用流动的十六分分解 + 左手根音跳跃，是「伴奏即织体」的典范。在华语流行中，大量抒情歌的钢琴伴奏使用「根音 + 上行琶音 + 右手和弦」的三层结构，副歌改为八度加厚的柱式以提能量。",
    application: "建立你的织体库（至少 4 套，能覆盖 80% 的歌）：① 抒情八分分解（左手根音，右手 1-5-3-5 琶音）；② 十六分流动（左手根音 + 五音交替，右手连续琶音）；③ 柱式切分（正拍休止，反拍和弦，适合节奏型歌曲）；④ 半分解（低音 - 和弦 - 低音 - 和弦的圆舞曲感或 ballad 感）。练法：用同一首歌（如《Let It Be》）把四套织体各弹一遍，感受不同织体如何改变歌曲性格。然后听一首新歌，30 秒内判断该用哪套。",
    practice: "选一首你没弹过的慢歌，做「30 秒上手」练习：前 15 秒听出调性与前 4 小节和弦（只判断 I/IV/V/vi），后 15 秒选定织体并直接跟上。允许和弦判断错误，但不允许停下来。完成后回听，检查低音是否清晰、力度是否盖过人声。",
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]}],"step":0.9,"dur":0.8}
  },
  "compose": {
    simple: "作曲是把一个小小的乐思，发展成一首有开头、有发展、有结尾的完整作品。它和即兴的区别在于：即兴是当下的选择，作曲是可以反复修改的选择。作曲的完整链条是：动机（一个短小的音乐细胞）→ 乐句（有呼吸的完整一句话）→ 发展（重复、变奏、对比）→ 结构（把乐句组织成段落）→ 叙事（让听众在时间中经历一段情绪旅程）。绝大多数初学者的问题不是不会写旋律，而是写了一句好旋律后不知道接下来做什么。",
    pro: "作曲的技术支柱：① 动机的可发展性——好的动机有清晰的音程特征与节奏特征（如 Beethoven 第五的「三短一长」），能被拆开重组；② 乐句的呼吸——标准乐句 4 小节，常见结构是「问句（停在属）+ 答句（停在主）」的 8 小节 period；③ 发展手法——模进（sequence，整体移位）、展开（fragmentation，取动机片段反复）、变奏（保持骨架改装饰）、对位（加一个独立声部）；④ 和声支撑——和声节奏（和弦变换频率）要与旋律密度匹配，高潮处和声节奏加快；⑤ 结构功能——呈示（给材料）→ 对比（转调/换织体/换情绪）→ 再现（回归并升华）。核心判断标准：去掉任何一小节，音乐是否变得不完整？如果是，说明结构紧密。",
    realWork: "Beethoven《第五交响曲》第一乐章全曲建立在一个四音动机上，是最极端的动机发展范例。Chopin 的《降 E 大调夜曲 Op.9 No.2》用一个下行旋律加装饰变奏，展示「旋律不变而表情变化」的变奏思维。The Beatles 的《Yesterday》用极其简洁的旋律 + 弦乐四重奏配器，证明了结构与配器对作品完整性的贡献。",
    application: "从零写一首 32 小节作品的流程：① 写一个 2 小节的动机（只要 3～5 个音，必须有明确节奏特征）；② 用「问句 + 答句」扩展成 8 小节乐段（答句前 4 小节与问句相同，后 4 小节改变结尾落到主音）；③ 写对比段 B（换调——常见是转到属调或关系小调，或换织体/换音区）；④ 再现 A 段并做变化（加厚、加装饰、或提高八度）；⑤ 加 2～4 小节 coda 收尾。全程只用 3～4 个和弦，逼自己靠动机而不是和声撑起作品。",
    practice: "写一个 4 音动机，例如「C–E–G–E」（上行大三 + 小三 + 回落）。然后：① 原样重复；② 移高五度；③ 倒影；④ 压缩成八分音符快速重复；⑤ 取前两音展开成 4 小节旋律。把其中最好的两个形态拼成 8 小节乐段，配上 I–vi–IV–V 的和声。你会得到一首真正属于自己的小曲。",
    audio: {"type":"seq","notes":[{"m":60,"d":0.4,"gap":0.42},{"m":64,"d":0.4,"gap":0.42},{"m":67,"d":0.4,"gap":0.42},{"m":64,"d":0.6,"gap":0.62}]}
  },
  "arrange": {
    simple: "编曲是把只有人声与和弦骨架的 demo，变成有层次、有起伏的完整作品。核心动作只有四类：分配音区（谁在低音、谁在中音、谁在高音）、分配节奏密度（谁稳定、谁活跃）、分配音色（谁暖、谁亮）、分配段落能量（哪里薄、哪里厚）。标准流程是先搭骨架：确定 BPM 与和声走向，铺好贝斯与鼓，再放主旋律与和声垫，最后加装饰层（琶音、对位、音效）。检验方法很实在：单独听每一层都能听清，合在一起不打架；关掉任一层，你都能说出它存在的理由。",
    pro: "编曲以功能分层：低频层 40–250Hz（kick、贝斯）、和声层 150Hz–2kHz（钢琴、吉他、弦乐 pad）、旋律层 500Hz–5kHz（人声、lead）、装饰层 3k–12kHz（shaker、琶音、delay 回声）。先做频率预算：同一时刻发声的乐器必须占据不同频段，例如贝斯走根音 C2–G2，钢琴在 C4–G5 弹和弦，弦乐在 G3–C6 铺 pad，避免全部挤在 C4–C5。节奏密度同理：八分稳定层＋十六分活跃层＋长音持续层，三层错开。和声上先定走向（如 I–V–vi–IV），再给每层分配音级：贝斯根音、内声部三音七音、顶层九音或十一音。副歌常把旋律复制一层移高八度，或让弦乐与吉他同奏形成齐奏织体。",
    realWork: "钟兴民为周杰伦《七里香》的编曲是加法编曲的教科书：前奏以木吉他分解和弦（Capo 3，实际音响 Eb 大调）＋弦乐长音 G3–D5 铺底；主歌只保留吉他与轻踩的 kick/snare，hi-hat 退到八分；预副歌加入弦乐持续音并做 4 小节 crescendo；副歌全套鼓＋贝斯八分音符＋弦乐 f 力度齐奏。同一段和声 I–V–vi–IV，仅靠乐器进出与密度变化就拉开了情绪差。",
    application: "拿一段只有人声加和弦的 demo 实操：① 定 BPM 与调（如 84 BPM、C 大调），在标记轨写好段落表。② 铺低频：贝斯跟和弦根音走八分音符，音区 C2–G2。③ 加节奏组：kick 在 1、3 拍，snare 在 2、4 拍，hi-hat 八分。④ 铺和声层：钢琴中音区 C4–G5 弹柱式或分解。⑤ 确认主旋律不与和声层同音区，冲突时把旋律移高八度。⑥ 做减法检查：逐层 solo，看去掉哪一层最不影响歌曲，那层就要重写。⑦ 副歌加一层（弦乐 pad 或八度叠加旋律），桥段反过来减到只剩两层。",
    practice: "在 DAW 新建 84 BPM、C 大调、16 小节工程，和声固定 I–V–vi–IV（C–G–Am–F）。做三版：A 版只有贝斯加鼓；B 版加钢琴柱式和弦；C 版再加弦乐 pad 与八度叠加旋律。分别导出并盲听，记录哪一版在副歌起不来，同时用频谱记下每层占用的主要频段。",
    diagram: {"root":60,"iv":[0,4,7]}
  },
  "daw": {
    simple: "DAW（数字音频工作站）是把创作、编辑、混音、母带串成一条线的工作台。完整流程五步：工程搭建（采样率、轨道结构、模板）、录音与 MIDI 输入、编辑（剪辑、量化、comping）、混音（电平、声像、EQ、压缩、混响）、导出与母带准备。核心概念是无损编辑：DAW 里的剪切、移动、音量调整大多不改原始文件，随时可回退，所以要养成建版本（Save As 加日期）与导出分轨 stems 的习惯。常见软件有 Ableton Live、Logic Pro、FL Studio、Cubase、Studio One、Pro Tools。",
    pro: "技术要点：采样率 44.1kHz 用于 CD，48kHz 用于视频配乐，制作阶段建议 48kHz/24bit，内部用 32bit float 处理避免总线削波。延迟管理：录音时缓冲区设 128–256 samples（约 6–12ms），混音时切到 1024。工程组织：轨道命名统一（DRM_Kick、BS_DI、VOX_Lead），颜色按乐器族分组（鼓红、贝斯紫、人声黄、和声蓝、弦乐绿）。总线结构：所有鼓先进 Drum Bus，再进 Mix Bus；混响与延迟用发送轨 send 而非插入。推荐流程：先粗混（只调推子与声像），再做编辑清理，最后才处理 EQ 与压缩，避免在错误的编辑基础上调音色。",
    realWork: "Billie Eilish《bad guy》由哥哥 Finneas 在 Logic Pro 中于卧室完成：工程以极简轨道构成（低音合成器、鼓机采样、数十轨人声叠加），人声大量使用 comping 拼出最佳句，并靠剪辑与音高修正塑造咬字与气口。最终混音由 Rob Kinelski 完成，母带由 John Greenham 处理。这说明工程组织与编辑质量，直接决定后期混音能达到的上限。",
    application: "① 新建工程立刻设定 48kHz/24bit，缓冲区 256 samples。② 建轨道模板：鼓组、贝斯、和声、旋律、人声、FX，并配好颜色。③ 建总线：Drum Bus、Music Bus、Vocal Bus 全部汇入 Mix Bus。④ 混响与延迟用两条 send 轨（Plate 混响衰减 1.8s；Ping-Pong 延迟 1/8 音符）。⑤ 每完成一个阶段就 Save As 新版本（如 Song_v03_edit）。⑥ 导出前整理：删除无用轨道、清空未用音频片段，避免工程膨胀。⑦ 随时用响度表看峰值是否留有 -6dB 余量。",
    practice: "打开你的 DAW，从零建一个含 12 轨的模板工程（48kHz/24bit），含 3 条总线与 2 条 FX send 轨，完成颜色分组与命名。用它做出一段 16 小节的鼓加贝斯加和声循环，最后导出 24bit/48kHz 的 WAV 与一份分轨 stems 压缩包。"
  },
  "orch": {
    simple: "配器是为每个音乐想法挑选由谁来说这句话的学问，建立在三个基础上：音域（每件乐器能舒服演奏的范围，超出会吃力或失真）、音色（明亮、温暖、紧张，由泛音结构决定）、力度（同一乐器在 p 与 ff 下音色完全不同）。配器时要同时经营四个声部层：旋律层、和声内声部层、低音层、色彩层。写之前先在钢琴上把骨架弹清楚，再决定哪条线交给哪件乐器。配器不是往上加装饰，而是把已存在的线条分配给最合适的音色。",
    pro: "管弦乐总谱标准排列自上而下：木管（Flute、Oboe、Clarinet、Bassoon）→ 铜管（Horn、Trumpet、Trombone、Tuba）→ 打击乐 → 人声与独奏 → 弦乐（Vln I、Vln II、Viola、Cello、Contrabass）。音域速记：长笛 C4–C7，双簧管 Bb3–G6，单簧管 E3–C7（Bb 调移调，实际音低大二度），巴松 Bb1–E5，圆号 F2–C5（F 调移调），小号 E3–C6（Bb 调，实际音低大二度），长号 E2–D5，大号 D1–F4，小提琴 G3–A7，中提琴 C3–E6，大提琴 C2–A5，低音提琴 E1–G4。力度标记 pp、p、mp、mf、f、ff：铜管要 mf 以上才显辉煌，pp 时木管与弦乐更可靠。",
    realWork: "约翰·威廉姆斯为《Star Wars》的配器是铜管主导的典范：Main Title 以铜管齐奏（小号与圆号在 C 大调，高音区 C5–G5）奏出主题，弦乐以十六分音符跑动提供能量，定音鼓与大号撑住低音。对比他为《Harry Potter》写的 Hedwig's Theme，改用钢片琴与弦乐，同一位作曲家因音色选择不同，情绪色彩彻底改变。",
    application: "① 先在钢琴上写出完整的四层骨架（旋律、内声部、低音、节奏）。② 标出每条线的音域范围，对照乐器音域表选择。③ 分配：旋律给独奏木管或第一小提琴，内声部给圆号或中提琴，低音给大提琴、巴松与大号。④ 力度检查：铜管不要长时间停在 f 以上，弦乐长音要注意换弓与呼吸。⑤ 关键句用混合音色（长笛加小提琴八度齐奏），可获得既亮又暖的第三音色。⑥ 用 MIDI 回放检查平衡，重点听内声部是否被旋律埋掉。",
    practice: "用 C 大调写 16 小节管弦片段：1–8 小节弦乐组（Vln I 旋律 C5–A5，Vln II 与 Vla 内声部，Vc 与 Cb 低音）；9–16 小节加入木管与圆号。导出 MIDI 并用频谱检查各声部频段是否重叠，同时标注每件乐器的音域是否越界。",
    diagram: {"root":60,"iv":[0,4,7,11]}
  },
  "ear": {
    simple: "练耳是四层递进的听觉解码能力：先听两个音的距离（音程），再听几个音叠起来的性质（和弦），然后判断这些和弦在调里的身份（功能与进行），最后判断整段的调中心与调式色彩。顺序不能颠倒——音程是和弦的零件，和弦是进行的单词，进行是调式的句子。多数人练不出来的原因，是跳过音程直接练和弦，结果只能靠猜，练十年也不进步。有效做法是给每个音程绑一首固定参考曲：大二度绑《小星星变奏曲》的级进，纯四度绑瓦格纳《婚礼进行曲》，大三度绑贝多芬第五交响曲开头，三全音绑《西区故事》的 Maria，八度绑《Over the Rainbow》的第一跳。听到音程先在心里唱参考曲，比对是否吻合再写答案。每天十分钟，只练两个音程的上行、下行、同时响三种形态，两周可覆盖全部十二种。",
    pro: "练耳体系按对象分四条线，各有技术规则。音程：先练旋律音程（先后响）后练和声音程（同时响），后者更难，因为两音同时响会产生拍频与泛音融合，掩盖个别音高；八度内十二种按协和度分三组——极完全协和（P1、P5、P8）、不完全协和（M3、m3、M6、m6）、不协和（M2、m2、M7、m7、P4、三全音）。和弦：先判性质（M、m、dim、aug、M7、7、m7、m7♭5、dim7），再判转位，判转位的规则是听低音与外框——第一转位下方三度上方四度，第二转位下方四度上方三度，七和弦第三转位外框二度。进行：按 T（I、vi、iii）、S（IV、ii）、D（V、vii°）三功能归类。调式：先看主音上方三度（大三度为大调族，小三度为小调族），再看特征音级（♯4 利底亚、♭7 混合利底亚、♭2 弗里几亚、大六度多利亚）。训练法：固定调与首调并行，固定调锁音高，首调锁功能；每日做性质—转位—功能三步听写，例如 C 大调 I–V6–vi–IV，先写 M（C-E-G），再据低音 E 判 I6，最后标 T。构唱与模唱是核心动作，先给根音唱出上方大三度再听，比被动听记牢得多。",
    realWork: "训练素材直接用真曲，效率远高于随机音高。大二度与纯五度用莫扎特《小星星变奏曲》（Ah! vous dirai-je, maman, K.265）主题 C–C–G–G–A–A–G：第二音到第三音是上行纯五度，G–A 与 A–G 是大二度；纯四度用瓦格纳歌剧《罗恩格林》第三幕《婚礼进行曲》（Bridal Chorus）首句上行 C–F；大三度下行用贝多芬《第五交响曲》Op.67 开头 G–G–G–E♭；三全音用伯恩斯坦《西区故事》Maria 首句 C–F♯；小三度用英国民谣《绿袖子》首句 A–C；八度用阿伦（Harold Arlen）为《绿野仙踪》写的 Over the Rainbow 的第一跳 Some–where。把这些截成六秒片段随机播放，先唱参考曲再判音程，是音乐学院视唱练耳课的标准锚定训练。",
    application: "四周计划：第 1 周只练自然音程（大小二、大小三、纯四、纯五、大小六），每天十分钟，用参考曲—模唱—听写三步，上行、下行、和声三种形态各弹十次；第 2 周加三全音与大小七度，用半音邻音法校验——先找到纯八度或纯五度再数差几个半音；第 3 周进和弦性质，只分大、小、属七、减三四种；第 4 周把和弦放进 C 大调 I–IV–V–vi 练听功能。每次练习固定结构：弹参考曲并跟唱一分钟，随机弹目标二十次先判后对答案五分钟，错题全部重新构唱三分钟。关键规则是错题必须唱出来，只听不唱进步极慢。工具用钢琴或任意虚拟键盘，手机录音回听自查。",
    practice: "今天任务：以 C4（中央 C，MIDI 60）为基准，在键盘上依次弹出 60/62、60/64、60/65、60/67、60/69 五组，每组先先后响、再同时响各一次，闭眼写下音程性质（大二、大三、纯四、纯五、大六），全部弹完再对答案。正确率低于 80% 就把错题跟唱三遍，并用《小星星变奏曲》与贝多芬《第五交响曲》开头核对纯五度与大三度。最后用这五个音随意弹一条八音旋律，立刻模唱出来。",
    diagram: {"root":60,"iv":[0,4,7]}
  },
  "analysis": {
    simple: "音乐分析是把听到的东西拆成可命名的层，再解释这些层为什么这样安排。标准的拆解顺序是：先抓结构（这段音乐分几块、块与块之间是重复还是对比），再抓和声（和弦是什么、功能怎么走、终止在哪），然后抓旋律（动机怎么来的、怎么变的），接着抓节奏织体（哪个层在动、哪个层在铺底），最后看配器与音色（谁在说话、声音是亮是暗）。这个顺序不能反，因为结构是骨架，和声是血肉，旋律与节奏是表情，配器是衣服。分析的目的不是贴标签，而是回答一个具体问题：作曲家在这里为什么要这么写，换成别的方式会失去什么。能回答这个问题，才算真的听懂了。",
    pro: "分析的技术工具箱包含五套记号系统：罗马数字和声分析（大写为大三、小写为小三、加 ° 为减三、加 7 为七和弦，转位用 6、6/4、6/5 等数字低音标记）、曲式字母标记（a、a′、b、A、B、A′、coda）、申克式简化分析（把作品还原为背景—中景—前景三层，找出基本线条 Urlinie 通常是 3-2-1 或 5-4-3-2-1 的下行）、动机与音程细胞分析（找出最小可辨认的材料单位并追踪其变形：移位、倒影、逆行、扩大、缩小、截断）、节奏与织体分析（单声、主调、复调、齐奏、阿尔贝蒂低音、持续音）。分析流程：先分段（靠终止式与织体变化定界），再和声标注，然后提取动机做变形追踪，最后写成一句话结论——这段音乐的核心手法是什么，它造成了什么听感效果。所有结论必须能指向谱面上的具体小节号。",
    realWork: "入门分析用三部作品最有效。莫扎特《C 大调钢琴奏鸣曲》K.545 第一乐章：呈示部主部在 C 大调，第 13 小节起经过句推向 G 大调属和弦，副部落在 G 大调，结构、调性布局与终止式一目了然，是奏鸣曲式的最小样本。肖邦《降 E 大调夜曲》Op.9 No.2：一个八小节的旋律在三次出现中被不断加花，和声却始终是 I–V–I 的框架，适合练旋律变形与和声骨架分离。德彪西《亚麻色头发的少女》：和声失去功能，全靠平行和弦与五声音阶推进，传统罗马数字失效，适合理解为何分析工具要随风格更换。三首分属古典、浪漫、印象三个时代，正好覆盖三种分析思路。",
    application: "拿到一首新曲按六步走。① 盲听三遍，第一遍只记段落边界（哪里明显换了气质），第二遍记重复（哪一段又出现了），第三遍记高点（情绪最高在第几秒）。② 拿到谱子，按听感划段并标字母，与听感不一致的地方重点检查。③ 逐小节标罗马数字，遇到不确定的先查声部进行，别猜。④ 圈出最小的动机材料（通常两到四个音），在全曲找它出现过几次、每次怎么变。⑤ 看织体：哪一层是旋律，哪一层是伴奏，伴奏的节奏型有没有贯穿全曲。⑥ 用一句话写结论，必须包含曲式名、调性布局、核心手法、听感效果四项。做不到第六步说明前面有环节是糊的，回去重做。每次分析控制在四十分钟内，写满一页纸。",
    practice: "选莫扎特 K.545 第一乐章前 32 小节做完整拆解：① 划出主部、连接、副部、结束句，标上起止小节；② 标出所有终止式类型；③ 写出主部材料的四个动机细胞；④ 描述左手阿尔贝蒂低音的节奏型与它在全曲中的贯穿情况。全部写完后，用自己的话回答：如果副部不转到 G 大调而留在 C 大调，这段音乐会失去什么？答案要具体到和声与听感两个层面，不少于五句话。",
    diagram: {"root":60,"iv":[0,4,7]}
  },
  "history": {
    simple: "音乐史表面是风格更替，背后的真正推手是技术与制度。记谱法成熟后音乐才能被保存与传播；十二平均律的普及让二十四个调都能自由使用，直接催生了巴赫《平均律键盘曲集》与古典时期的转调狂潮；钢琴的击弦机与铸铁架让它能弹出交响乐级别的力度幅度，浪漫派的宏大音响才有可能；瓦格纳的半音化和声把调性的边界推到极限，后人只能另起炉灶，于是有了无调性；录音与广播把音乐从现场变成可复制的商品，演奏家的个性被放大又被规范；电子乐器与音序器、数字音频工作站让编曲与制作成为作曲本身。理解这条技术线，你会发现每个时代的风格都不是谁突发奇想，而是当时可用工具的自然结果。",
    pro: "按技术—制度线索重排历史：中世纪靠纽姆谱与口传，产生格里高利圣咏与早期复调（奥尔加农）；文艺复兴有印刷术与五线谱定型，帕莱斯特里那的模仿复调成为范式；巴洛克有通奏低音、大小调体系确立、提琴家族定型，产生赋格、协奏曲、歌剧；古典时期有十二平均律与近代钢琴，和声节奏简化、乐句方整、奏鸣曲式成型；浪漫时期有钢琴铸铁架、双键盘、现代管弦乐编制与圆号活塞，出现半音化和声、标题音乐、交响诗；十九世纪末十二音与无调性（勋伯格《五首管弦乐小品》Op.16、Op.21），二十世纪又有序列音乐、具体音乐（舍费尔）、电子音乐（斯托克豪森）、简约主义（赖希《为十八位音乐家而作》）；当代是 DAW、采样与流媒体主导，loop 与音色设计成为作曲核心。每个阶段都要能说出三项技术条件与两项代表体裁。",
    realWork: "用作品串成一条可听的线索：帕莱斯特里那《教皇马尔切利弥撒》（Missa Papae Marcelli, 1562）代表文艺复兴复调的均衡；巴赫《平均律键盘曲集》第一册 BWV 846-869（1722）是平均律理论的实践证明；海顿《第 94 号交响曲 惊愕》（1791）确立古典交响曲四乐章与海顿式幽默；贝多芬《第三交响曲 英雄》Op.55（1804）把奏鸣曲式扩张到交响尺度，是浪漫的开端；瓦格纳《特里斯坦与伊索尔德》前奏曲（1865）用不停解决的属和弦把调性撑到极限；德彪西《牧神午后前奏曲》（1894）动摇功能；勋伯格《月光下的皮埃罗》Op.21（1912）进入无调性；斯特拉文斯基《春之祭》（1913）用节奏暴力重构时间；赖希《为十八位音乐家而作》（1976）确立简约主义;当代可听 Billie Eilish 的 bury a friend（2019），制作与音色即作曲。",
    application: "学音乐史的可操作方式：按技术线做时间轴，而不是背年代。① 做一张表，每行一个时代，列出记谱、律制、乐器、演出场所、赞助制度五项，逐格填。② 每个时代挑三首作品，按上表里的技术条件解释它为什么长这样（如贝多芬的英雄为什么要用那么长的展开部：因为钢琴与乐队已能支撑大幅度力度对比与远关系转调）。③ 做听觉对照训练：把同体裁不同时代的两首并列听（如海顿第 94 与贝多芬第三的第一乐章），写出五条听感差异并逐条归到技术原因。④ 每季度更新一次时间轴，把新听到的作品挂上去。坚持半年，你听到陌生作品就能凭织体、和声与音色判断大致年代，这是音乐史真正有用的部分。",
    practice: "任务：做一张八行时间轴（中世纪、文艺复兴、巴洛克、古典、浪漫、印象与二十世纪前期、战后先锋、当代），每行写出一条核心技术条件与一首代表作品（含作曲家与年份）。完成后挑相邻两行做听觉对比：例如巴赫《勃兰登堡协奏曲第三号》BWV 1048 与莫扎特《第 40 号交响曲》K.550 第一乐章各听两分钟，写出织体（复调对主调）、力度（阶梯式对渐强渐弱）、和声节奏（快对慢）三点差异并说明技术原因。",
    diagram: {"root":60,"iv":[0,4,7]}
  },
  "aesthetic": {
    simple: "审美判断力不是天赋，是听觉样本量、分析能力与价值框架三者相乘的结果。样本量决定你知道有多少种可能性——只听过流行歌的人无法评价赋格，因为不知道对位可以有多精密。分析能力决定你能不能说出好在哪里：感觉好听只是信号，能指出是第三小节的阻碍终止延长了情绪才是判断。价值框架决定你用什么标准衡量：是追求结构的严谨、情感的真挚、音色的新颖，还是传播的效力？不同的目的对应不同的标准，混用标准就会得出荒谬结论（用交响曲的标准批评一首电子舞曲缺乏发展，本身就是错的）。建立审美力的路径很具体：大量听、成对比较、写下理由、对照专业分析修正、定期重听旧判断。三年之后，你的判断会自己变得稳定。",
    pro: "审美的三大维度与可操作的评价项。一、工艺维度：材料的经济性（动机是否被充分发展而非堆砌）、内部逻辑一致性（风格、织体、和声语言是否自洽）、比例与平衡（段落长度与黄金分割、高潮位置、留白）、技法完备性（声部进行是否干净、织体是否有层次、配器是否平衡）。二、表现维度：意图是否清晰并被实现（欢愉、哀悼、戏谑、崇高）、情感是否通过具体技术手段达成而非靠标题暗示、细节是否支撑整体（力度曲线、句法呼吸、音色选择）。三、语境维度：相对所处时代的原创性（是否提供了新语法）、对既有传统的回应方式（继承、反叛、融合）、在体裁谱系中的位置。把这三项写成一张评分表，每项给一到五分并附一句谱面依据，就是一份可论证的审美判断，而不是一句我觉得好听。",
    realWork: "用三组成对比较来校准审美：贝多芬《第九交响曲》Op.125 第四乐章《欢乐颂》主题与一首普通广告配乐的旋律对照，前者用四个音的细胞做模进与倒影，后者靠重复与堆力度；肖邦《降 E 大调夜曲》Op.9 No.2 与电影配乐中常见的同类抒情段落对照，前者在一个不变的和声骨架上做三次加花，后者靠换和弦制造变化；格伦·古尔德 1955 年与 1981 年两次录制的《哥德堡变奏曲》BWV 988 相互对照，同样的音符，速度、分句、声部清晰度完全不同，却都成立——这一组最能说明审美判断的对象是处理方案而非音符本身。三组听完各写一段一百字评价，必须引用具体小节或时间点的做法作为理由。",
    application: "建立判断力的具体做法。① 每天做一次成对比较：选两首同体裁、同时代的作品（或同一作品的两个录音版本），各听三分钟，写出三条差异并判断哪一条更成功，理由必须落在具体手法上。② 建一个判断日志：日期、作品、版本、一句话判断、三条依据、一个月后是否改判。改判率是你的审美稳定度指标，半年内应从百分之五十降到百分之二十以下。③ 每月读一份专业分析（乐评、节目单说明、学术文章），对照自己的判断，看漏了哪一层。④ 每季度重听年初的判断，标出改判项并写下原因。⑤ 主动拓展样本：每月至少听一个完全陌生的风格或时代，防止审美标准被单一经验绑架。",
    practice: "任务：做一次完整的成对比较。选肖邦《降 E 大调夜曲》Op.9 No.2，找阿图尔·鲁宾斯坦（Arthur Rubinstein, 1965 年录音）与毛里奇奥·波利尼（Maurizio Pollini, 2005 年录音）两个版本，各听主题的前十六小节。记录三项：速度（用手机秒表测主题一遍的时长）、rubato 幅度（哪些音被明显拉长）、声部层次（伴奏是否压过旋律）。然后写一百字判断并给出三条依据，最后说明你的判断标准属于工艺、表现还是语境维度。",
    diagram: {"root":63,"iv":[0,3,7]}
  },
  "expression": {
    simple: "把谱面变成有说服力的声音，靠的是一系列具体决策，而不是所谓的感觉。谱子只记录音高与时值，其余全部要演奏者补上：多快、多响、怎么连、哪里呼吸、什么音色、哪里稍快或稍慢。这些决策分三层：结构层决定大方向——整首的速度基准、力度总曲线、高潮位置；句法层决定分句——哪里起、哪里收、句与句之间留多少气口；细节层决定质感——每个音的触键重量、重音程度、时值的微小伸缩。三层必须一致：如果结构层要做一个大的渐强，句法层却每四小节收一次，细节层的重音就会互相打架。判断表达是否成功有个简单标准：关掉谱子只听声音，能不能听出段落、句法与高潮在哪里——听得出就是有表达，听不出就是音符堆砌。",
    pro: "表达的技术实现依赖三组可控变量。时间与速度：选定基准 BPM，再用 rubato 做局部偏移，标准做法是主题音与和声变化点稍放宽（+3% 至 +8%），经过句与连接句稍紧（-3% 至 -5%），整句的总时值保持守恒（借与还必须平衡）。力度与重音：先设计层级（如 p-mf-f 三级各对应不同段落），再在句内做拱形或阶梯曲线；重音分四类——力度重音（加力）、时值重音（agogic，拉长该音）、音区重音（跳到高音）、和声重音（落在紧张和弦上）。触键与发音：连奏靠重量转移而非手指压，断奏靠反弹速度而非敲打，重量与速度两个变量决定音色——同一力度下，慢速触键更柔、快速触键更亮；踏板按和声更换，碎踏板用于保留清晰度。分句：句尾音缩短或减轻，句间留四分之一拍至半拍的气口。所有处理都要能说出目标效果，不能凭手感。",
    realWork: "最有说服力的表达材料是同一作品的多个录音版本。格伦·古尔德 1955 年与 1981 年两次录制巴赫《哥德堡变奏曲》BWV 988：1955 年版本速度极快、断奏清晰、装饰音利落，把作品做成一台精密机器；1981 年版本整体放慢、声部层次加厚、咏叹调主题慢到近乎冥想，同一套音符呈现出完全不同的精神气质。另一个经典对照是肖邦《降 E 大调夜曲》Op.9 No.2 的鲁宾斯坦版与波利尼版：前者 rubato 幅度大、旋律自由如即兴，后者几乎严守拍速、靠音色与声部平衡说话。还有一个反向例子是阿尔弗雷德·科尔托（Alfred Cortot）的肖邦录音，技术上失误不少，但句法方向感极强，说明表达判断力可以与手指精度分离。",
    application: "把表达训练具体化，四步。① 先做无表达基线：用节拍器以中速把全曲严格按谱子弹（或唱）三遍，录音。这是你的参照点，没有它就无法知道自己的处理偏离了多少。② 定结构方案：写出一句总设计（如从 pp 开始，在第 12 小节推到 f，结尾回到 pp），标出高潮位置与总速度曲线。③ 定句法方案：给每个乐句标起音与收尾的处理（句尾缩短还是渐弱、句间留几拍气口），用铅笔在谱上画出弧线。④ 定细节方案：圈出三个要强调的音，说明各自用哪种重音（力度、时值、音区、和声）。⑤ 按方案演奏并录音，与基线对比，检查三件事：能不能听出段落、能不能听出句法、高潮是否明确。有一项听不出就改方案重录，直到三项都成立。",
    practice: "任务：选莫扎特《C 大调钢琴奏鸣曲》K.545 第一乐章主部（第 1 至 12 小节，或任意你能弹的简化版本），做三次录音对比。第一次严格按节拍器（♩=120）无处理；第二次加入句法：第 4 小节句尾减轻并留半拍气口，第 8 小节半终止稍作延长；第三次加入结构力度：第 1-4 小节 mf，第 5-8 小节渐强到 f，第 9-12 小节回 mf。三次录音依次回听，写下三次在段落感、句法清晰度、高潮明确度上的差别，标出你最喜欢的一次并说明理由。",
    audio: {"type":"seq","notes":[{"m":60,"d":0.4,"gap":0.45},{"m":62,"d":0.4,"gap":0.45},{"m":64,"d":0.4,"gap":0.45},{"m":65,"d":0.7,"gap":0.8},{"m":67,"d":0.4,"gap":0.45},{"m":65,"d":0.4,"gap":0.45},{"m":64,"d":0.7,"gap":0.8}]}
  },
  "classical": {
    simple: "古典音乐不是一种曲风，而是一条用技术不断改写听觉规则的历史。1600年前后歌剧在佛罗伦萨诞生，为了让歌词听得清，作曲家把多声部复调压缩成旋律加通奏低音，主调织体由此确立；1722年拉莫出版《和声学》，把和弦归纳为主、属、下属三种功能，此后两百年西方音乐都在这个引力场上运行。1750年前后奏鸣曲式让器乐能像戏剧一样展开冲突与和解，海顿、莫扎特把四乐章交响曲定型。19世纪作曲家不断给功能和声加压：半音化、远关系转调、标题音乐，到瓦格纳《特里斯坦》(1865) 主和弦迟迟不出现，调性开始摇晃；20世纪初勋伯格取消中心音，建立十二音体系。听这条脉络抓三个指标：低音是否在走功能、织体是复调还是主调、不协和音需不需要解决。",
    pro: "共性写作时期（约1650—1900）的核心是可量化的规则：禁止平行五度与平行八度，七和弦的七音必须级进下行解决，导音（C大调的B）在小二度内解决到主音C。巴洛克以数字低音标记和弦（6、6/5、4/3），和声节奏多为每小节一至两个和弦；古典主义把和声节奏拉长到每两小节甚至四小节一个和弦，用I—IV—V—I的整块功能推进，句法上出现八小节乐段与4+4的问答结构。浪漫主义把三度中介和弦、那不勒斯六和弦（bII6）、增六和弦（意大利增六Ab—C—F#）变为常规语汇，等音转调让C大调可在两小节内滑向E大调。分辨时期最可靠的抓手是终止式：巴洛克常用V—i配下行四度低音，古典爱用K46—V7—I，浪漫则用bVI—V或阻碍终止V—vi拖延解决。",
    realWork: "对比三个开头即可听出范式转移。巴赫《C大调前奏曲》BWV846（1722）第1小节C、第2小节Am/C、第3小节F/C，低音持续在C上，靠和弦音变化而非旋律推动。莫扎特《g小调第40交响曲》K.550（1788）第一乐章第1—8小节是八小节方正乐句，和声I—V—I—vi，第20小节后才明确转调。贝多芬《第三交响曲》Op.55（1804）第一乐章第1—2小节以Eb主和弦两次强奏开场，第43—45小节出现突兀的升C。同一把尺子量三首曲子，调性从稳定到被撑破一目了然。",
    application: "把这条脉络变成分析能力，按四步走。第一，听任何曲子先画低音线：只记每小节低音音名，看它走四度上下行（功能性）还是半音级进（色彩性），前者多属古典以前，后者多属浪漫以后。第二，标和声节奏：数每个和弦持续几小节，巴洛克一小节两三个，古典一小节一个，浪漫常夹带变化音并拉长。第三，找终止式：在每段最后四小节标出K46、V7、I的位置，判断是正格、变格还是阻碍终止。第四，做对比实验：把同一段和声分别按巴洛克（加经过音与延留音）、古典（阿尔贝蒂低音）、浪漫（加增六与bVI）三种方式各弹一遍。",
    practice: "具体任务：打印巴赫BWV846第1—8小节、莫扎特K.550第一乐章第1—12小节、贝多芬Op.55第一乐章第1—8小节三份谱，分别标出低音音名与每小节和弦数，写成一张三行对照表。然后任选其一，用钢琴把和声骨架单独弹出来，检查去掉装饰后是否仍能听出所属时期。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]}],"step":1.2,"dur":1.1}
  },
  "jazz": {
    simple: "爵士不是一种和声体系，而是一套对待现成材料的态度：拿一首歌的和声骨架，现场重新组织节奏、重配和弦、并在上面即兴。三个最基础的听辨点。一是摇摆感：八分音符不均分而前长后短，大致接近三连音比例，加上贝斯的四拍行走与鼓上叮叮镲的三点节奏，形成向前推进的律动。二是即兴：独奏者不是随便吹，而是在和弦音与延伸音（九、十一、十三）之上用音阶与琶音组织句子，句子之间有呼应和重复。三是替换与重配：C—Am—Dm—G7可以改成C—A7—Dm—G7，甚至整段三度下行的和弦链。再加上乐队内部的对话，独奏与鼓的呼应、贝斯与钢琴的互补，爵士的现场性就建立起来了。",
    pro: "爵士的底层是旋律与和声的双层结构。核心术语：ii—V—I（如Dm7—G7—Cmaj7）是调性运动的基本单元；和弦延伸音到十三音（Cmaj7 = C—E—G—B，C6/9 = C—E—A—D，G7b9 = G—B—D—F—Ab）；和弦替代包括三全音替代（把G7换成Db7，因为G7的B与F恰好是Db7的三音与七音）与三度替换（用bIII7、bVI7、bII7构成下行链替代一个属和弦）；和声重配则把I换成iii7或vi7以延长停留。节奏层：swing八分的比例在中等速度下约为二比一，速度加快后趋向均分；鼓的ride基本型为一、二、二后半拍的三点模式。曲式上绝大多数标准曲是32小节AABA或12小节布鲁斯，即兴以一轮chorus为单位循环。",
    realWork: "Miles Davis《So What》（《Kind of Blue》, 1959）：AABA的32小节，第1—8小节Dm11、第9—16小节Ebm11、第17—24回Dm，全曲无功能和声运动，靠调式与贝斯动机推进。对照 Charlie Parker《Confirmation》(1946)：同样AABA 32小节，却全是高速ii—V—I链，第1—4小节即F大调的Gm7—C7—Fmaj7。",
    application: "上手分五步。第一，选12小节布鲁斯，把根音走向（I—IV—I—V—IV—I，F调即F—Bb—F—C—Bb—F）用贝斯弹熟，右手只弹属七和弦的三音与七音（F7的A与Eb），听这两个半音如何互相牵引。第二，加九音与十三音：把F7弹成F—A—C—Eb—G—D。第三，练swing：把八分音符按三连音的前后两音关系弹，配合ride的三点模式。第四，重配：把第9—10小节的V换成bII7（Gb7）作三全音替代。第五，每轮chorus只用一个两小节短句，重复并变形三次。",
    practice: "任务：用F调布鲁斯，左手弹walking bass，右手只用F7、Bb7、C7的三音与七音，完整走一轮12小节并录音；再听《So What》第1—16小节，写出Dm与Ebm两调的音阶音。第三遍听《Confirmation》前八小节，逐个记下和弦符号，核对是否全部是ii—V—I。",
    diagram: {"root":62,"iv":[0,3,7,10]},
    audio: {"type":"prog","chords":[{"root":62,"iv":[0,3,7,10]},{"root":55,"iv":[0,4,7,10]},{"root":60,"iv":[0,4,7,11]},{"root":57,"iv":[0,3,7,10]}],"step":1.1,"dur":1}
  },
  "pop": {
    simple: "流行音乐的组织单位不是乐章，而是hook与结构。一首歌通常在三到四分钟内完成多次重复加变化的循环：主歌铺陈，预副歌提升张力，副歌以最高音区与最密集的织体重现同一句核心旋律，这个核心旋律就是hook。结构上最主流的是主歌—预副歌—副歌—主歌—预副歌—副歌—桥段—副歌，且副歌第一次出现一般不晚于60秒。听觉习惯由制作决定：4/4拍、落在二四拍的军鼓、鼓机与合成器的音色，以及人声的处理方式（双录、压缩、混响），都直接影响歌曲的辨识度。流行与古典在技术上最大的差异是：流行靠循环与层叠制造变化，古典靠展开与对比。",
    pro: "技术参数：速度集中在90—128 BPM，舞曲流行常在118—124；调性多为大调或自然小调，最后一次副歌常作真转调（升半音或全音，如C到Db或D），或借用bVI—bVII—I的英雄进行（C—Ab—Bb—C）。结构时间轴：前奏4—8小节，主歌8小节，预副歌4小节，副歌8小节，第二段主歌8小节，桥段8小节（常在IV级或vi级上作对比），最后副歌加转调，尾奏。和声以四和弦循环为基础（I—V—vi—IV、vi—IV—I—V、I—vi—IV—V的卡农型），和声节奏多为两小节或四小节一个和弦，低音常保持根音不动以稳定律动。hook的技术构成为音程上跳（四度、五度、八度）加节奏切分加重复三次以上。",
    realWork: "The Beatles《Let It Be》(1970)：C大调，主歌I—V—vi—IV，第1—8小节钢琴分解和弦；副歌（第17小节前后起）和声不变仍是C—G—Am—F，但音区提高、织体加厚并加入双录人声。Michael Jackson《Billie Jean》(1982)：升f小调，全曲几乎只有一个四小节低音循环F#—C#—E—B，第1小节起的贝斯动机与鼓机背拍构成全部hook。Adele《Someone Like You》(2011) 的A—E—F#m—D，末段副歌不作转调而靠织体加厚推进。",
    application: "按时间轴倒推写歌。第一，定速度112 BPM、C大调，把和声循环定为I—V—vi—IV，每和弦两小节，低音保持根音。第二，写hook：在副歌第1小节用一个上行四度或五度的跳进（如G—C），配一个切分节奏，并在八小节内重复三次以上，副歌音区比主歌高五度左右。第三，配结构：前奏四小节只用hook的伴奏型；主歌八小节低音区与稀疏织体；预副歌四小节把和声节奏加密到每小节一个和弦，第四小节用V制造悬念；副歌八小节全织体；桥段八小节转到vi级作对比。第四，制作检查：背拍落在二四拍，副歌加入双录与延迟混响。",
    practice: "任务：用C大调I—V—vi—IV写一段八小节副歌，要求hook在开头两小节出现并在段内重复三次，速度设112 BPM；再听《Let It Be》第1—16小节与第17—24小节，写出两个段落的和声、音区、人声层数与鼓的加入点差异。第二天把副歌移调到大三度上方（E大调），比较明亮度变化。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":55,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]}],"step":1.1,"dur":1}
  },
  "film": {
    simple: "配乐在影片里承担四种具体工作：说明情绪、划分结构、交代时空、预告事件。同一段画面配上不同音乐，观众对角色的判断会完全相反——音乐其实在替导演告诉观众「该怎么看这一段」。入点与出点最关键：音乐在角色做出决定前 1~2 秒进入，观众会感到动机来自角色内心；在动作发生之后才进入，音乐就变成对事件的评论。影视音乐分三类：画内有源音乐（source，如收音机、酒吧乐队）、画外配乐（score）、歌曲（song），三者在混录中的响度与频段占位完全不同。配乐还有一个常被忽略的功能是掩盖剪辑瑕疵：音乐跨过剪辑点可以让镜头切换显得连贯。判断是否该上音乐的简单方法，是先把全片静音看一遍，凡是静音下仍然成立的地方，往往不需要音乐。",
    pro: "影视配乐的技术坐标是时间码而非小节。写作以 SMPTE 时码为基准，1 秒 = 24/25/30 帧，情绪点（hit point）通常精确到帧。对白的核心频段是 300Hz~3.5kHz，配乐必须在此让位：弦乐中提、钢琴中音区在 1~3kHz 衰减 3~5dB，避免掩蔽对白。配乐整体留 -6~-3dBFS 峰值余量，终混时音乐通常比对白低 8~12dB。常见结构：单个 cue 时长 20~90 秒，一场戏内 2~4 个 cue，全片音乐覆盖率 40%~70%（惊悚片高、剧情片低）。工程上以分轨 stem 交付（弦乐/铜管/打击/合成/独奏各一组），便于终混按剧情抽掉某一层；同时提供 alt 版本（无打击版、无旋律版）供剪辑临时调整。采样率统一 48kHz/24bit，与画面帧率严格对应。",
    realWork: "《Star Wars: A New Hope》(1977，John Williams) 的「Binary Sunset」：Luke 望向双日落时，主题先由独奏圆号呈示再交给全弦乐，靠配器加厚完成「从个人情绪到命运感」的放大，音乐进入点落在镜头推近之前，使情绪看起来源于角色。《Inception》(2010，Hans Zimmer)「Time」：全曲几乎只有一个和声循环，靠钢琴分解和弦密度递增、弦乐分层叠加与渐强制造「折叠感」，证明不换和声也能推进情绪；「Dream Is Collapsing」则把 Edith Piaf 的歌曲素材减速、重配器为铜管动机。",
    application: "1) 拉片并分场，标出每场的「决定点」——这场戏里人物做了什么选择；2) 与导演确认音乐从谁的主观视角出发，这直接决定配器：弦乐=个人情感，铜管=权力与命运，电子脉冲=悬疑与科技，独奏钢琴=回忆；3) 用 temp track 定情绪，但最终必须重写，避免与参考曲雷同；4) 在精确到帧的 hit point 上做标记，重音用镲片、低音重击、铜管突强标出；5) 先在无音乐状态完整看一遍，确认哪些地方真的需要音乐，留白本身就是配乐手段；6) 按 stem 分组导出，并额外提供无旋律、无打击两个 alt 版本供终混调用。",
    practice: "选《WALL·E》开场 3 分钟（几乎无对白），先静音播放并在时间线上标出所有情绪转折点，然后写一段 60~75 秒的 cue，要求入点与出点严格对齐画面剪辑点，导出后与原片对轨播放检查。随后把音乐整体音量降 6dB 再听一遍：若情绪依然成立，说明写作有效而非靠音量硬撑。工程建议 48kHz/24bit，视频帧率与素材一致。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"prog","chords":[{"root":60,"iv":[0,4,7]},{"root":57,"iv":[0,3,7]},{"root":53,"iv":[0,4,7]},{"root":55,"iv":[0,3,7]}],"step":1.2,"dur":1.1}
  },
  "game": {
    simple: "游戏音乐与影视音乐最大的差别是时长不确定。电影 cue 有固定长度，游戏音乐必须能在同一状态里停留 3 分钟或 30 分钟，还要在玩家做出动作的数秒内完成切换。因此游戏音乐按状态组织而非按时间线：探索、战斗、潜行、危险、胜利、菜单，每个状态是一段可循环的素材，状态之间靠过渡连接。交互性带来三个硬约束：循环必须无缝、切换必须快速、长时间播放不能疲劳。此外音乐需要与音效分层——脚步、技能、UI 提示大量集中在 2~5kHz，音乐必须在这个窗口留出空间，否则玩家会听不清关键反馈音。",
    pro: "游戏音频以中间件（Wwise / FMOD）为枢纽，音乐以片段为单位导入，通过 RTPC 参数（血量、敌人数、距离、时间）驱动状态机。常用 BPM：探索 70~90，战斗 130~160。两种主流实现：垂直分层（同一和声下增减声部）与水平重排（按小节切换段落），切换点通常限制在小节线或拍点，因此素材必须 BPM 一致、网格对齐（如 120BPM 下 4 小节 = 8 秒）。交付格式多为 Vorbis（.ogg，质量 4~6）或中间件内部编码，采样率 48kHz。预算方面：主机游戏音乐常限 20~60MB，Switch 与移动端更紧，需要区分流音频（stream）与内存常驻（in-memory）素材；同时计算 voices 上限，避免分层过多导致爆音。",
    realWork: "《The Legend of Zelda: Breath of the Wild》(2017，永松亮、片岡真實等)：探索音乐极度稀疏，几乎只有钢琴单音与环境音，战斗时才分层加入打击与铜管；这种「留白加极简」的设计支撑了上百小时游玩而不疲劳，是低密度循环的范例。《Hades》(2020，Darren Korb)：战斗用摇滚编制（电吉他、鼓、合成贝斯），每个区域（Tartarus、Asphodel、Elysium）有独立主题与调式，靠 tempo 与配器区分空间，并随房间清怪进度做 state 切换。",
    application: "1) 先列出全部音乐状态并画出状态转换图，明确哪些状态之间允许跳转；2) 统一各状态的 BPM 与调性关系（如战斗等于探索的同主音小调），否则无法在拍点切换；3) 每个状态做 2 分钟以上可循环素材，外加 4~8 小节的过渡素材；4) 在 FMOD 或 Wwise 中搭状态机，把 transition 设为「下一小节线」或「下一拍」；5) 进引擎实测：反复进出战斗 20 次，听切换是否突兀、是否有叠加噪声；6) 与音频程序员确认内存、CPU 与 voices 预算，据此决定编码与流/常驻分配。",
    practice: "在 FMOD Studio（免费）中建一个三状态工程：Explore(80BPM, Am)、Combat(140BPM, Am)、Menu(80BPM, C)。为 Explore 与 Combat 各写 8 小节循环，用 transition 到小节线切换，并加一个 1 小节的 riser 掩盖 tempo 差异用于进入战斗。循环播放 15 分钟，记录你开始感到厌烦的分钟数，据此调整素材密度与旋律重复周期。",
    audio: {"type":"prog","chords":[{"root":57,"iv":[0,3,7]},{"root":55,"iv":[0,4,7]}],"step":1,"dur":0.9}
  },
  "sound": {
    simple: "音色（timbre）是「音高与响度都相同，仍能区分两个声音」的那个属性。物理上它由频谱包络与时间包络决定：频谱决定亮、暗、薄、厚，时间包络决定软、硬、快、慢。声音设计就是有意识地调控这两者。塑造音色的四条基本路径：选音源（乐器或振荡器波形）、改频谱（滤波与 EQ）、改时间（包络与压缩）、加空间（混响与延迟）。判断音色有三个可训练维度：起振瞬态的软硬、谐波的分布（奇偶次谐波比例）、以及随时间的变化（是否有动态演化）。一个实用的自检方法是把声音加上 200ms 的 attack 再听：如果立刻认不出来，说明辨识信息主要在瞬态里。",
    pro: "频谱层面：锯齿波含全部整数次谐波（约 -6dB/oct），方波仅奇次谐波，三角波仅奇次且衰减更快（-12dB/oct），正弦无谐波。人耳在 2~5kHz 最敏感（等响曲线在 3~4kHz 有峰），因此「明亮」多指 2~6kHz 的能量，「温暖」指 200~500Hz 适度提升，「浑浊」通常是 200~400Hz 堆积，「刺耳」多落在 3~5kHz。时间包络：attack 0~5ms 产生打击感，20~80ms 产生拨弦感，200ms~1s 属于垫底音色；ADSR 中对辨识度影响最大的是 attack 与 decay。实用的分析流程是先做减法：降低 1~2 个八度并加 300Hz 低通，会剥离音高信息暴露出材质；再把声音反转，可以判断瞬态与衰减各自的贡献。",
    realWork: "Ben Burtt 为《Star Wars》(1977) 设计光剑声：把投影仪马达的电磁嗡鸣与电视显像管受干扰的高频啸叫叠加，再随画面中剑的移动做 pitch bend 与声像移动，使声音跟着物体运动，这是「运动赋予音色生命」的经典。Darth Vader 的呼吸声来自水肺呼吸器录音加工，成为角色音色的一部分。Hans Zimmer 在《Inception》(2010) 的「BRAAAM」：极低音铜管拉长、加失真与长混响，成为 2010 年代预告片的标准音色范式。",
    application: "1) 先明确这个音色要解决的叙事问题——提示危险、表现科技感还是表达回忆，目标不同手段完全不同；2) 选一段真实录音作为基源（哪怕最终只占 20%），纯合成音色容易显得廉价；3) 用频谱仪分析基源的主峰与噪声成分，用包络观察判断瞬态占比；4) 先做减法：用 EQ 砍掉不需要的频段，再考虑叠加其他层；5) 加运动——LFO、滤波扫频、pitch drift，静止的声音最容易被听觉忽略；6) 做 A/B 对比时必须放进实际项目里判断，solo 试听几乎总会高估音色的存在感。",
    practice: "用一段日常录音（敲击金属杯、开关门）作为基源，在 Ableton 或 Logic 中做三个版本：① 只改包络（反转、拉长 attack 到 400ms）；② 只改频谱（降 1~2 个八度加 400Hz 低通）；③ 加空间（卷积混响 RT60=3.5 秒加延迟）。导出三版并写下各自适合表现什么情绪，再与原始录音做盲听对比，检验改造是否真的改变了叙事含义。",
    audio: {"type":"chord","root":60,"iv":[0,7,14]}
  },
  "mix": {
    simple: "混音的目标按顺序排列：先让每个声音被听见（清晰），再让它们不互相打架（平衡），最后才谈情绪与风格。工作顺序固定：增益结构、单轨处理（EQ 与压缩）、空间（混响与延迟）、自动化、总线处理。混音中最重要的决定不是插件而是谁占哪个频段、谁在哪个位置。人耳同时只能追踪 3~4 个声音对象，超过就会产生信息过载，因此每首作品必须明确主角——通常是人声或主旋律，其他一切为它让路。一个可靠的判断标准是：把混音放到手机扬声器上小音量播放，如果仍能听清主旋律与歌词，说明平衡成立；如果只剩一片模糊的噪声，说明中频分配出了问题。",
    pro: "增益结构：每个音轨峰值控制在 -18~-12dBFS（模拟表 0VU 约等于 -18dBFS），总线保留 -6dBFS 余量。频段分配：kick 主体 40~80Hz，与 bass 在 60~100Hz 分频，一方提升另一方就衰减 2~3dB；人声主体 300Hz~3.5kHz，清晰度 2~5kHz，齿音 5~8kHz；底鼓穿透靠 2~4kHz 的 attack；军鼓 body 在 180~250Hz、crack 在 1.5~3kHz。压缩参考：人声 ratio 3:1~4:1、attack 10~30ms、release 100~300ms、GR 3~6dB；bass ratio 4:1、attack 20~30ms、release 200ms；总线 ratio 2:1~4:1、attack 30ms、release 200ms 或自动、GR 1~3dB。检查手段：相关性表保持在 0 到 +1，频谱斜率约 -4.5dB/oct（以 1kHz 为基准），低频 40Hz 以下做 highpass 控干净。",
    realWork: "Serban Ghenea（Taylor Swift、Bruno Mars）：以人声绝对优先，用大量自动化把人声固定在最前，伴奏在副歌用动态 EQ 做频段让位，成品在手机扬声器上人声依然清晰。Andrew Scheps（Red Hot Chili Peppers、Adele）主张少 EQ、多推子，先把静态平衡做对再插插件，并常把整个混音过一次压缩来「粘」住素材。配乐方面，Alan Meyerson 混 Hans Zimmer 的作品时用分轨 stem 分层平衡，让上百轨管弦乐在极低频与极高频留出空间，避免与对白和音效冲突。",
    application: "1) 增益结构：所有推子归零后逐轨调整，使峰值落在 -12dBFS 左右；2) 静音清理：每轨单独听，除 kick 与 bass 外全部 highpass 80~120Hz；3) 先做减法 EQ 再做加法，找问题频段用窄 Q（6~10）衰减 3~6dB；4) 建立空间：统一 2~3 个混响返回，按前、中、后三层分配湿度；5) 动态：先压单轨（GR 3~6dB），再压总线（GR 1~3dB）；6) 自动化：副歌人声提升 1~2dB，第二段主歌打击提升 1dB，制造推进感；7) 用三套系统检查——耳机、近场音箱、手机扬声器，并额外用单声道检查相位。",
    practice: "取一个 16 轨以上的多轨工程（Cambridge Music Technology 等网站提供免费素材），完成一版混音并导出，检查三项指标：峰值不超过 -3dBFS、整体响度 -16~-14 LUFS-S、主歌与副歌响度差至少 1.5LU。然后把成品与同风格参考曲做 loudness match 后 A/B 对比 30 秒，写下三条具体差距（例如低频多 3dB、人声少 2dB），再针对性修改一版。",
    audio: {"type":"chord","root":60,"iv":[0,4,7,11]}
  },
  "master": {
    simple: "母带是交付前的最后一步，任务不是把歌变好听（那是混音的事），而是三件事：让一批作品在响度、音色与动态上保持一致；让成品在各种播放系统上都能正常工作；生成符合发行要求的格式与元数据。母带工程师听的是整首歌与整张专辑的关系，因此处理必须极其克制——典型的母带 EQ 调整量在 1~2dB 以内，如果母带阶段需要大改，说明问题出在混音，应该退回重混。母带链的典型顺序是：线性相位 EQ 到多段压缩到立体声处理到限幅到抖动与格式转换。另外，母带还要检查整张专辑的曲目间隔、淡入淡出与电平衔接，这是单曲混音阶段无法完成的工作。",
    pro: "交付规范：混音交给母带时应为 24bit、48kHz 或更高，峰值不超过 -3dBFS（理想 -6dBFS），且母线不挂限幅器。母带链参数：线性相位 EQ 高通 20~30Hz（Q 0.7），问题频段调整不超过 2dB；多段压缩通常 3~4 段（小于 120Hz、120~500Hz、500Hz~4kHz、大于 4kHz），ratio 1.2:1~2:1，每段 GR 1~2dB；立体声处理用 M/S，200Hz 以下的 Side 必须衰减（低频要单声道），2kHz 以上可提升 1~2dB；限幅器 ceiling 设 -1.0dBTP，release 100~500ms，GR 通常 1~4dB（超过 6dB 会出现明显抽吸）。响度目标：流媒体 -14 LUFS-I，电子与摇滚常见 -9~-11 LUFS-I，古典与爵士 -14~-16 LUFS-I。交付格式：WAV 24bit/44.1 或 48kHz，CD 用 DDP，另附 MP3 320 或 AAC 256 作为参考。",
    realWork: "Daft Punk《Random Access Memories》(2013，母带 Bob Ludwig)：保持了极高的动态与模拟暖度，成品响度远低于同期电子舞曲（约 -11~-12 LUFS-I），靠编曲与音色而非限幅取胜，是母带服务于音乐而非响度的范例。反面教材是 1990~2000 年代的 Loudness War，典型如 Metallica《Death Magnetic》(2008)，把 GR 推到极端导致动态被压平、可听失真明显，成为教学中反复引用的反例。",
    application: "1) 收到混音先检查：峰值不超过 -3dBFS、无削波、母线无残留限幅、头尾有干净静音；2) 插入 2~3 首同风格参考曲，做响度匹配后对比音色与低频量；3) 只做极小的音色修正——高通 25Hz，问题频段调整 ±1~2dB；4) 用多段压缩处理特定频段的不稳定（如低频忽大忽小），每段 GR 不超过 2dB；5) 立体声整形：低频收单声道，检查相关性表大于 0；6) 限幅到目标响度（流媒体 -14 LUFS-I，ceiling -1dBTP）；7) 导出后复检 true peak、LUFS-S、频谱斜率与单声道兼容性。",
    practice: "取自己混好的 3 首歌做伪母带：统一高通 25Hz，用同一个限幅器把三首都做到 -14 LUFS-I、-1dBTP，导出后按顺序连播，检查三首之间响度与音色是否连贯——这正是母带的核心任务。再用 Youlean Loudness Meter 读取每首的 LUFS-S 与 PLR（峰值与响度比），流行乐目标 PLR 约 2~4，古典与爵士 6~10，超出范围说明动态处理不当。",
    audio: {"type":"chord","root":60,"iv":[0,4,7,12]}
  },
  "guitar": {
    simple: "第一道门槛是把六根弦调准：从第6弦到第1弦依次为E2、A2、D3、G3、B3、E4，除2-3弦是大三度外相邻两弦都是纯四度，所以用「5品对空弦」调，但3弦要按4品去对2弦空弦。左手按弦要贴住品丝后缘、拇指落在琴颈中线，右手拨弦让指甲与指肉同时触弦。和弦追求一次性成型而不是逐指挪；扫弦靠手腕小幅旋转，角度别大；分解和弦固定用p-i-m-a分配，节奏靠右手锁定一小节里的强弱拍。指弹是拇指管低音、其余手指管旋律，音阶要记成五个把位的指型而不是零散的音，即兴站在和弦音上造句，伴奏则在根音、和弦音与色彩音之间做取舍。",
    pro: "标准调弦EADGBE下同一个音有多处位置：3弦空弦G3、4弦5品、5弦10品、6弦15品都是G。C大调Mi型（第一指型）开放把位的排布是6弦3品G、5品A，5弦3品C、5品D，4弦2品E、3品F，3弦空弦G、2品A，2弦1品C、3品D，1弦空弦E、3品G——之所以出现「两品一指」，是因为全音阶里E-F与B-C是半音，必须让1指与2指紧靠、2指与3指分开一格。扫弦时右手接触点在音孔后缘到琴桥之间滑动，越靠琴桥越亮越硬；拨片与弦约成30度角，用小臂带动而不是整条胳膊。分解和弦中p负责6-5-4弦、i负责3弦、m负责2弦、a负责1弦，前面的手指按完不松，就是保持音伴奏。横按时用食指侧面而非正面压弦，拇指对准食指第二关节形成夹力。",
    realWork: "桑塔纳在《Europa》里把B小调音阶放在第7到第9把位，食指横按配合小指伸展，并把旋律音大量用击弦（7品击到9品）连接，右手拨弦点靠近琴桥、配合大量揉弦与延音，得到长音泣诉的效果；他的音阶走向始终盯着Bm与E和弦的和弦音。伴奏层面，James Taylor《Fire and Rain》用Cmaj7到Am7的分解：p指弹5弦A，i-m-a依次拨3-2-1弦，每拍两个八分音符循环，低音在C与A之间交替走动，让两小节的和声听起来有前进感。",
    application: "第一步，用「5品对空弦」调完后，再弹一遍空弦的E-A-D-G-B-E与12品泛音核对，12品泛音必须与12品实按音同高。第二步，每天固定练一条单弦上的全音阶（如6弦5-7-8品），用1-2-4指、每音一拍，节拍器60。第三步，把C、A、G、E、D、Am、Em七个开放和弦两两配对，找出共同指，只动需要动的手指。第四步，用5321或6321的分解型配一个八拍节奏，右手全程不中断。第五步，用同一套和弦练扫弦：下-下上-上下上，先把右手空挥熟练再加左手。每步都要录音，听是否有闷音、断拍与杂音。",
    practice: "本周任务：C大调。①6弦5品A到1弦8品C的Mi型音阶，节拍器60，上下行各三遍，要求每个音清晰无闷音。②C-Am-F-G四个和弦循环，先用分解5321弹八遍，再用「下 下上 上下上」扫八遍，转换在两拍内完成。③用C大调音阶在第5把位弹一条自己写的四小节旋律，结尾落在C音。全部录音，检查换和弦时是否有空弦杂音与右手停顿。",
    diagram: {"root":60,"iv":[0,4,7]},
    audio: {"type":"chord","root":60,"iv":[0,4,7],"dur":1.6}
  },
  "violin": {
    simple: "小提琴没有品，音准全靠左手指距与耳朵。持琴用左下颌与锁骨夹住，左手虎口轻托琴颈，拇指自然弯曲贴在琴颈左侧；按弦时前面的手指要保留不放，用来维持手型框架。持弓时右手拇指弯曲顶住弓根，小指搭在弓杆上充当杠杆。发音来自弓毛摩擦琴弦，弓速、弓压与接触点三者要配合：靠近琴码音量大而亮，靠近指板柔而轻。换把是整只手沿琴颈滑动，靠拇指与食指根引导；揉弦是手指在弦上前后滚动造成音高微幅起伏；运弓分分弓、连弓、跳弓等；乐队里小提琴分第一、第二声部，常担任旋律；表现力来自弓速变化、揉弦幅度与乐句的呼吸安排。",
    pro: "四根空弦G3、D4、A4、E4相隔纯五度。第一把位在A弦上：1指B4、2指C#5、3指D5、4指E5，1-2与2-3是全音、3-4是半音；出现半音时1-2指要紧靠（如A弦上的B-C），需要伸张时1-4指跨八度甚至十度。第三把位时1指在A弦上落到D5，整只手前移一个全音。换把用导指：从第一把位1指的B滑向第三把位的D，途中拇指放松、手型提前成形，滑动不带重音。弓段分配：全弓分上半、下半与中弓，音头多在下半弓起，长句用中弓匀速，到弓尖要补一点压力否则音量塌陷。pp时接触点靠近指板，ff时靠近琴码；弓速快而压力小得柔和音色，弓速慢而压力大则发刺。揉弦以手指第一关节在弦上朝琴头与琴码方向滚动，幅度不超过四分之一音，频率约每秒四到六次，句尾必须回到音准中心。",
    realWork: "帕格尼尼《第24首随想曲》（E小调）的主题在A弦与E弦上快速换把，并要求1指到4指跨十度的伸张，配合连顿弓与跳弓；海菲茨的录音把弓段压缩在中弓偏下，牺牲一点音量换取颗粒清晰。巴赫《d小调第二组曲·恰空》则相反：D小调上靠持续的和弦音与揉弦把单件乐器的多声部撑住，换把时用保留指维持共鸣。门德尔松《e小调协奏曲》开篇主题在E弦上，用全弓长句加渐强揉弦，把换把藏在弓速最均匀的瞬间。",
    application: "①先不揉弦：用空弦练全弓，弓速均匀、从弓根到弓尖音量一致，对着镜子看弓是否与琴码平行。②建立手型：在D大调音阶上练保留指，1指按下后不抬，直到4指落完再一起放开。③换把用导指练：先在慢速里滑，听到滑音说明手指压力太大，要放松但保持指形。④揉弦分三步：先练手指前后滚动（不带弓），再加空弦辅助，最后落在音上，起音平直、一拍后加揉。⑤每天用 drones（持续音）校音准，长音与双音都要对着共鸣听是否纯净。⑥录音，重点听换把处的杂音与弓尖是否变虚。",
    practice: "本周用D大调与G大调：①两个八度的D大调音阶，节拍器60，一弓四音，练保留指与换把（第一到第三把）。②全弓空弦练习：每根弦四拍下弓四拍上弓，要求全程音量不变、弓走直线。③揉弦专项：A弦2指C#5，先平直两拍再揉两拍，重复十次，幅度由小到大再收回。④巴赫或维瓦尔第的一个慢乐章片段，用中弓连弓，每句标出弓段与呼吸点。全部录音复查音准与弓尖音量。",
    diagram: {"root":55,"iv":[0,7,14,21]},
    audio: {"type":"chord","root":55,"iv":[0,7,14,21],"dur":1.5}
  },
  "folk": {
    simple: "笙属于簧管乐器，由笙斗（铜或木制的共鸣腔）、铜制自由簧片与若干竹制笙苗组成，吹气与吸气都能发音，按住笙苗上的按孔即通气发声。它最特别的地方是能同时发好几个音：传统上常以四度、五度、八度叠置成和音，所以在乐队里既吹旋律又垫和声。箫是竖吹的竹制边棱音笛，没有簧片，靠气流冲击吹口边缘振动管内空气柱发声，音高由指孔开闭与气息共同决定。箫的音色低沉含蓄，适合悠长的旋律与留白；笙的音色明亮，是吹管组里的「和声胶水」，也是连接弦乐与弹拨声部的中介。",
    pro: "传统笙有17簧、21簧等形制，笙苗按律吕与「相和」关系排列，并非按音阶顺序从左到右；按下一个按指往往会同时接通两三支笙苗，得到主音加五度、加八度的和音。自由簧吸吹皆响，因此可以用一口气完成长句，循环换气在此用途极大。箫多为G调或F调洞箫，前五后一共六孔（另有底孔与调音孔），全按所得的筒音是基准音，超吹可得上方八度。口风：下唇遮住吹口约三分之一到二分之一，气流以约45度切入边棱；风门小、气更急则音偏高，风门大、气缓则音偏低。指法上自下而上依次抬孔得音阶，需要半音时用按半孔或叉指。颤音多用气颤，靠腹部与膈肌使气流强弱周期性变化，也有在开孔上方轻扇的指颤。",
    realWork: "笙：胡天泉首演的《凤凰展翅》用传统和音块推动段落，配合呼舌与装饰音，充分展示笙「旋律与和声一体」的双重身份，快速段落靠双吐与手指整齐落指完成。箫：张维良在《梅花三弄》（古曲改编）中用G调洞箫、筒音作5，靠缓慢的气颤与渐强渐弱把泛音段落吹得空灵。合奏上，江南丝竹《中花六板》里笙以五度八度和音垫底，箫与笛交替奏旋律，三者构成「点、线、面」的织体层次。",
    application: "①先建立音位表：把笙的每一个按指对应发出的音（含和音）写下来，反复默背再上手。②笙的落指要「齐」：和音的几根手指必须同时落下，慢练时用耳朵听几个簧是否同时起振。③箫先只练筒音与超吹：把筒音吹稳、吹直、吹长，再练超吹得八度，这是定调与音准的基准。④口风用「吹蜡烛」的比喻找角度：气流细而集中打在边棱上，不要用大气量硬吹。⑤用调音器监控每个音的音准，记录哪个孔偏高偏低，形成自己的修正表。⑥录下长音，检查是否有晃动、漏气与噪声。",
    practice: "①笙：任选三个按指，练和音的整齐起振，每个音保持四拍，重复十次；再练呼舌十秒不断。②箫：G调洞箫筒音作5，从筒音开始依次抬孔吹出完整的五声音阶（sol-la-do-re-mi），每个音四拍，调音器逐个核对音准。③长音：筒音一口气吹满八拍，要求音量不抖、音色干净，连做五次。④把《中花六板》或一个简单五声旋律用箫完整吹一遍，只在句尾加气颤。",
    diagram: {"root":62,"iv":[0,2,4,7,9]},
    audio: {"type":"seq","notes":[{"m":62,"d":0.6,"gap":0.62},{"m":64,"d":0.6,"gap":0.62},{"m":67,"d":0.6,"gap":0.62},{"m":69,"d":0.6,"gap":0.62},{"m":71,"d":0.9,"gap":0.95}]}
  },
  "style": {
    simple: "学会一种风格不是记住它的名字，而是找到它的语法：常用的和声进行、节奏型、音色与装饰音。方法先做减法——把「像不像」拆成可检验的清单：节拍是直的还是摇摆的、和弦是三和弦还是七九和弦、旋律装饰是滑音还是倚音、低音是走动还是持续。然后大量听、跟着唱、扒带，并把自己弹的录下来与原曲对照。最关键的是找出该风格的代表句式与禁忌音：哪些音一弹就跑味，哪些音一出现就立刻地道。判断标准越具体，学习越快。",
    pro: "以摇摆爵士为例：八分音符按三连音的1-3比例摇摆，和声以ii-V-I为基础并大量使用属七的b9、#11变化音，伴奏用根音-五音-九音的走动低音或drop2排列，旋律进入多用半音趋近与包围音（enclosure，如上-下-目标的三个音）。布鲁斯则是12小节的I-IV-V、属七和弦贯穿，旋律用小调五声叠在大调I7上，b3与b5制造苦味。弗拉门戈用Phrygian音阶（E-F-G-A-B-C-D）与安达卢西亚终止（Am-G-F-E），配rasgueado扫弦与golpe敲板。做风格研究时固定四个维度：节奏（swing/straight/clave）、和声（级数与扩展音）、旋律装饰（弯音、倚音、滑音、颤音）、音色与力度包络，然后用同一段简单旋律逐维切换，检验它是否还能被辨识。",
    realWork: "迈尔斯·戴维斯《So What》确立Dorian调式爵士：全曲只有Dm与Ebm两个调式、半音转调，和声是Bill Evans的So What和弦（四度堆叠，如D-G-C-F-A），鼓手Jimmy Cobb用「ding-ding-da-ding」的摇摆ride型与走动贝斯定住风格。对照聆听Charlie Parker《Confirmation》：bebop的密集ii-V-I与半音趋近，同样是小调色彩但语汇完全不同。把《So What》的主题改用布鲁斯音阶再弹一遍，调式感会立刻消失，这正说明音阶选择才是风格的骨架。",
    application: "①选一种风格，先只听不听谱，写出你能分辨的五个特征（速度、鼓型、和弦色彩、装饰音、音色）。②扒一段八小节的伴奏，逐音写到谱上，标出和弦级数与扩展音。③找出该风格的三到五个代表句式（lick），背下来并在三个调上弹熟。④找出禁忌音：把你认为不属于该风格的音强行放进去，确认它确实破坏味道，从此记住。⑤用同一段和声，严格按四个维度（节奏、和声、装饰、音色）各录一版，对比差异来自哪里。⑥每学一种风格，做一页「风格卡片」，以后做融合时直接调用。",
    practice: "①选摇摆爵士与布鲁斯两种风格，各扒八小节伴奏，写出和弦级数与鼓/低音型。②把《So What》的Dm与Ebm两个Dorian音阶在乐器上弹熟（D-E-F-G-A-B-C 与 Eb-F-Gb-Ab-Bb-C-Db），并各写四小节旋律。③同一段C大调旋律用三种方式弹：直八分、摇摆八分、带半音趋近的摇摆。④录三版音频，写一百字说明每版差异来自哪个维度。",
    diagram: {"root":62,"iv":[0,3,7,10,14]},
    audio: {"type":"chord","root":62,"iv":[0,3,7,10,14],"dur":1.6}
  }
};


/* ---- 森林遍历工具（跨领域） ---- */
function forestWalk(fn){ DOMAINS.forEach(d=> (function w(n){ fn(n); (n.children||[]).forEach(w); })(d)); }
function nodeById(id){ let r=null; forestWalk(n=>{ if(n.id===id) r=n; }); return r; }
function mapFlatten(){ const out=[]; forestWalk(n=>{ if(n.lesson) out.push(n.lesson); }); return out; }
function mapAll(){ const out=[]; forestWalk(n=>{ if(n.id) out.push(n); }); return out; }
function nextLessonId(id){ const ord=mapFlatten(); const i=ord.indexOf(id); return (i>=0 && i<ord.length-1)? ord[i+1]:null; }
function recommendLessonId(){ const ord=mapFlatten(); for(const id of ord){ if(overall(id)<40) return id; } return ord[0]; }
function countLessons(node){ let c=0; (function w(n){ if(n.lesson) c++; (n.children||[]).forEach(w); })(node); return c; }
function countNodes(node){ let c=0; (function w(n){ c++; (n.children||[]).forEach(w); })(node); return c; }
let galaxySel=null;
function renderKnowledgeMap(body){
  if(galaxySel){ const d=DOMAINS.find(x=>x.id===galaxySel); if(d){ renderDomainTree(body,d); return; } galaxySel=null; }
  renderGalaxy(body);
}
function renderGalaxy(body){
  body.innerHTML = `
    <div class="panel">
      <h2>🌌 LIVING MUSIC MAP · 音乐能力宇宙</h2>
      <div class="sub">一张可以不断探索的「音乐能力宇宙」。基础乐理藏在各个领域内部作为 🧰 工具 / 前置。
      点开任意领域，进入它的知识子树；树里<b>每个节点都可以直接点进去学习</b>，没有解锁、没有锁定。</div>
      <div class="km-legend"><span><i class="dot km-tool-dot"></i>🧰 工具 / 前置（基础乐理，可点开速补）</span></div>
    </div>
    <div class="km-galaxy" id="km-galaxy"></div>
    <div class="panel">
      <h2>📋 全部课程</h2>
      <div class="sub">下面是所有可学习的课程与方向，点任意一节直接进入，自由探索。</div>
      <div class="inst-grid" id="km-lessons"></div>
    </div>`;
  const g=$("km-galaxy");
  g.innerHTML = DOMAINS.map(d=>{
    const nn=countNodes(d)-1;
    return `<div class="km-domain" data-d="${d.id}" style="cursor:pointer">
      <div class="kmd-em">${d.em}</div>
      <div class="kmd-zh">${d.zh}</div>
      <div class="kmd-en">${d.en}</div>
      <div class="kmd-blurb">${d.blurb}</div>
      <div class="kmd-meta"><span>${nn} 个知识点</span><span class="open">▶ 进入</span></div>
    </div>`;
  }).join("");
  g.querySelectorAll(".km-domain").forEach(c=> c.onclick=()=>{ galaxySel=c.dataset.d; renderKnowledgeMap(body); });
  const list=$("km-lessons");
  const seen=new Set(); const uniq=mapFlatten().filter(id=>{ if(seen.has(id)) return false; seen.add(id); return true; })
    .map(id=>({id,l:D.LESSONS.find(x=>x.id===id)})).filter(o=>o.l);
  list.innerHTML = uniq.map(o=>{
    const l=resolveLesson(o.id);
    return `<div class="inst-card" data-lid="${o.id}" style="cursor:pointer">
      <div class="iem">${l.emoji}</div><div class="inm" style="font-size:14px">${l.title}</div>
      <div class="ild">${l.en}</div></div>`;
  }).join("");
  list.querySelectorAll(".inst-card[data-lid]").forEach(c=> c.onclick=()=>{ renderLesson(body,c.dataset.lid); });
}

function renderDomainTree(body, domain){
  const COLW=212, ROWH=126, PADX=34, PADY=42, NW=192, NH=120;
  let yc=0, maxX=0, maxY=0; const flat=[];
  function place(n, depth){
    const x=PADX+depth*COLW; let y;
    if(n.children&&n.children.length){ const kids=n.children.map(c=>place(c,depth+1)); y=(kids[0].y+kids[kids.length-1].y)/2; }
    else { y=PADY+yc*ROWH; yc++; }
    const node={n,x,y,depth}; flat.push(node); maxX=Math.max(maxX,x+NW); maxY=Math.max(maxY,y+NH); return node;
  }
  const root=place(domain,0);
  function link(node){ node.kids=(node.n.children||[]).map(c=> flat.find(f=>f.n===c)); (node.kids||[]).forEach(link); }
  link(root);
  const W=maxX+PADX, H=maxY+PADY;
  let lines="";
  function drawConn(node){ (node.kids||[]).forEach(k=>{
    const x1=node.x+NW, y1=node.y+NH/2, x2=k.x, y2=k.y+NH/2, mx=(x1+x2)/2;
    lines+=`<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" stroke="rgba(184,160,224,.55)" stroke-width="2.4" fill="none"/>`;
    drawConn(k);
  }); }
  drawConn(root);
  function nodeClass(node){
    if(node.depth===0) return "km-node km-root";
    if(node.n.tool) return "km-node km-tool";
    return "km-node km-lesson";
  }
  let nodesHtml="";
  flat.forEach(node=>{
    if(node.depth===0){
      nodesHtml+=`<div class="${nodeClass(node)}" style="left:${node.x}px;top:${node.y}px;width:${NW}px;height:${NH}px">
        <div class="km-emoji">${domain.em}</div><div class="km-title">${domain.zh}</div><div class="km-en">${domain.en}</div>
        <div class="km-sub">${domain.blurb}</div></div>`;
    } else {
      const lid = node.n.lesson || node.n.id;
      const l = resolveLesson(lid); if(!l) return;
      const ov = l.synthetic? 0 : overall(lid);
      nodesHtml+=`<div class="${nodeClass(node)}" style="left:${node.x}px;top:${node.y}px;width:${NW}px;height:${NH}px;cursor:pointer" data-lid="${lid}">
        <div class="km-top"><span class="km-emoji">${l.emoji}</span>
          <div class="km-tt"><div class="km-title">${l.title}</div><div class="km-en">${l.en}</div></div></div>
        ${l.synthetic?"":`<div class="km-bar"><div class="km-fill" style="width:${ov}%"></div></div>`}
      </div>`;
    }
  });
  body.innerHTML=`
    <button class="btn ghost sm" id="km-back">← 返回音乐能力宇宙</button>
    <div class="panel">
      <h2>${domain.em} ${domain.zh}</h2>
      <div class="sub">${domain.blurb}<br>连线表示<b>前置 → 当前 → 后续</b>。🧰 工具节点是基础乐理，可点开速补。每个节点都是一堂轻量实践课：看懂 → 听到/看到 → 亲自实践一下。</div>
      <div class="km-legend"><span><i class="dot km-tool-dot"></i>🧰 工具 / 前置（基础乐理速补）</span></div>
    </div>
    <div class="kmmap-wrap"><div class="kmmap" style="width:${W}px;height:${H}px">
      <svg width="${W}" height="${H}" style="position:absolute;top:0;left:0">${lines}</svg>${nodesHtml}</div></div>`;
  $("km-back").onclick=()=>{ galaxySel=null; renderKnowledgeMap(body); };
  body.querySelectorAll(".km-node[data-lid]").forEach(c=> c.onclick=()=>{ renderLesson(body,c.dataset.lid); });
}

/* ---------- Textbook PATH （所有课程已开放，无锁定 / 无前置门槛） ---------- */
function renderTextbook(body){
  const paths = D.PATHS.map(p=>{
    const items = p.lessons.map(lid=>{
      const l=D.LESSONS.find(x=>x.id===lid);
      return `<div class="chain-step" data-lid="${lid}" style="cursor:pointer">
        <div class="chain-dot">🎵</div>
        <div class="chain-body"><div class="ct">${l.emoji} ${l.title}</div>
        <div class="cd">${zhTier(l.tier)}</div></div>
      </div>`;
    }).join("");
    return `<div class="panel">
      <h2>${p.emoji} ${p.name}</h2>
      <div class="sub">点任意一课直接进入，自由探索。先做你最想学的那节即可。</div>
      <div class="chain">${items}</div></div>`;
  }).join("");
  body.innerHTML = `
    <div class="panel">
      <h2>📚 教材路径（TEXTBOOK PATH）</h2>
      <div class="sub">专业课程模式：基础和声 → 功能和声 → 离调转调 → 高级色彩。课程含 理论 / 练耳 / 分析 / 写作 / 演奏 / 考试。所有课程直接可学，自由探索即可。</div>
    </div>
    ${paths}
    <div class="panel">
      <h2>🔍 课程直达（任意一课）</h2>
      <div class="sub">下面是所有课程，点任意一节直接进入。</div>
      <div id="prereq-box"></div>
    </div>`;
  const box=$("prereq-box");
  box.innerHTML = D.LESSONS.map(l=>`<button class="event-opt" style="width:100%;margin-bottom:8px" data-id="${l.id}">
    <div class="eo-t">${l.emoji} ${l.title}</div>
    <div style="font-size:11px;color:#9aa3b8;margin-top:3px">直接进入 →</div></button>`).join("");
  box.querySelectorAll(".event-opt").forEach(b=> b.onclick=()=>{ renderLesson(body, b.dataset.id); });
}

/* ============================================================
   LESSON
   ============================================================ */
function phenomenonHTML(l){
  return `<div class="game-stage">
    <div class="mrow" style="justify-content:center">
      <button class="big-play" id="ph-a" style="width:70px;height:70px;font-size:26px">A</button>
      <button class="big-play" id="ph-b" style="width:70px;height:70px;font-size:26px">B</button>
    </div>
    <div id="ph-q" style="margin:10px 0;color:#cbbfa6">${l.phenomenon.question}</div>
    <div class="opt-grid" id="ph-opt"></div>
    <div class="feedback" id="ph-fb"></div>
  </div>`;
}
function wirePhenomenon(l, id){
  $("ph-a").onclick=()=> playSpec(l.phenomenon.a.audio);
  $("ph-b").onclick=()=> playSpec(l.phenomenon.b.audio);
  const optA = l.phenomenon.a.label.split("·")[0].trim();
  const optB = l.phenomenon.b.label.split("·")[0].trim();
  $("ph-opt").innerHTML = `<button class="opt-btn" data-c="0">${optA}</button><button class="opt-btn" data-c="1">${optB}</button>`;
  $("ph-opt").querySelectorAll(".opt-btn").forEach(b=> b.onclick=()=>{
    const correctIdx = (l.phenomenon.answer!=null?l.phenomenon.answer:1);
    const correct = +b.dataset.c===correctIdx;
    $("ph-opt").querySelectorAll(".opt-btn").forEach(x=>x.disabled=true);
    b.classList.add(correct?"correct":"wrong");
    const fb=$("ph-fb"); fb.className="feedback show";
    fb.innerHTML = correct? "✓ 你听到了现象！正是这个‘方向感 / 色彩’驱动了后面的理论。":"再对比听一次 A 与 B，注意 B 多出来的‘推力’或‘明暗’变化。";
    bump(id,"know",12); renderLessonMastery(id);
  });
}
function exampleHTML(l){
  const hasDiag = l.concept && l.concept.diagram;
  const hasAudio = l.exampleAudio;
  const work = (l.concept && l.concept.realWork)
    ? `<div class="lesson-body"><b class="hl">真实作品与实例</b><br>${l.concept.realWork}</div>` : "";
  if(!hasDiag && !hasAudio) return work;
  let btns=`<div class="mrow">`;
  if(hasAudio) btns+=`<button class="btn sm ghost" id="ex-play">▶ 听示例</button>`;
  if(hasDiag) btns+=`<button class="btn sm ghost" id="ex-score">🎼 看谱 / 键盘</button>`;
  btns+=`</div><div id="ex-extra"></div>`;
  return work + btns;
}
function wireExample(l){
  if(l.exampleAudio && $("ex-play")){ $("ex-play").onclick=()=> playSpec(l.exampleAudio); }
  if(l.concept && l.concept.diagram && $("ex-score")){
    const root=l.concept.diagram.root, iv=l.concept.diagram.iv;
    $("ex-score").onclick=()=>{ $("ex-extra").innerHTML=`<div class="piano-wrap" id="ex-pno" style="margin-top:12px"></div>
      <div style="text-align:center;margin-top:6px;color:#cbbfa6">${iv.map(x=>midiName(root+x)).join(" · ")}</div>${staffSVG(iv.map(x=>root+x))}`;
      buildPiano($("ex-pno")); highlightChord($("ex-pno"), root, iv); };
  } else if($("ex-piano")){
    buildPiano($("ex-piano"));
  }
}
function renderPractice(box, l, id){
  if(l.earDrill){
    renderEarDrill(box, l.earDrill, id);
    return;
  }
  if(l.interact && l.interact.type==="build"){
    chordBuilder(box, l.interact.target, l.interact.hint, (ok)=>{ if(ok){ bump(id,"play",20); renderLessonMastery(id); ML.toast("构建正确！","✓","xp"); } });
    return;
  }
  const hint = l.practice? `<div class="lab-note"><b>🎯 小练习：</b>${l.practice}</div>` : "";
  box.innerHTML=`${hint}
    <div class="lab-note">在键盘上随便弹几个音，感受它们的色彩与关系；点「回放」听一遍你刚弹的。</div>
    <div class="piano-wrap" id="pr-piano" style="margin-top:10px"></div>
    <div class="mrow"><button class="btn sm" id="pr-replay">↻ 回放</button><button class="btn ghost sm" id="pr-clear">清空</button></div>`;
  let rec=[];
  buildPiano($("pr-piano"), (m)=>{ rec.push(m); });
  $("pr-replay").onclick=()=>{ if(!rec.length){ML.toast("先弹点什么","🎹");return;} AE.playMidi(rec.map(m=>({m,d:0.4,gap:0.42}))); if(!l.synthetic){ bump(id,"play",8); renderLessonMastery(id); } };
  $("pr-clear").onclick=()=>{ rec=[]; };
}

/* ============================================================
   练耳听辨引擎（参考上海音乐学院 / 中央音乐学院 视唱练耳听辨题型）
   题型：音程 / 和弦 / 调式 / 和弦连接（功能进行）
   不再包含「相同 / 不同」这类低阶辨别。
   ============================================================ */
const EAR_BANK = {
  interval:[
    {semi:0,name:"纯一度",ref:"两音完全相同（同度），几乎融为一个音。"},
    {semi:1,name:"小二度",ref:"半音相邻，最‘挤’最紧张。参考：电影《大白鲨》危机动机。"},
    {semi:2,name:"大二度",ref:"参考：《小星星》《欢乐颂》开头，最熟悉的级进。"},
    {semi:3,name:"小三度",ref:"参考：《生日快乐》前两音之间 / 《外星人 ET》主题，柔和。"},
    {semi:4,name:"大三度",ref:"参考：《生日快乐》最前两音 / 《Kumbaya》，明亮温暖。"},
    {semi:5,name:"纯四度",ref:"参考：《婚礼进行曲》开头 / 《奇异恩典》，开阔。"},
    {semi:6,name:"增四度（三全音）",ref:"最不稳定、最‘晕’，参考：音乐剧《西区故事》Maria。"},
    {semi:7,name:"纯五度",ref:"参考：《星球大战》开头，空旷、最协和之一。"},
    {semi:8,name:"小六度",ref:"参考：《爱的罗曼史》主题，带一点忧伤。"},
    {semi:9,name:"大六度",ref:"参考：《我的太阳》/ NBC 台标，明亮舒展。"},
    {semi:10,name:"小七度",ref:"参考：《多啦A梦》主题，带跳跃的暗色。"},
    {semi:11,name:"大七度",ref:"极度不稳定、强烈待解决，参考：《带我去月球》开头。"},
    {semi:12,name:"纯八度",ref:"《小星星》首尾同高，完全融合、像同一个音。"}
  ],
  chord:[
    {iv:[0,4,7],name:"大三和弦",ref:"明亮稳定；三音为大三度（4 半音）。"},
    {iv:[0,3,7],name:"小三和弦",ref:"柔和偏暗；三音为小三度（3 半音）。"},
    {iv:[0,4,8],name:"增三和弦",ref:"尖锐漂浮；含增三度，无明确根音倾向。"},
    {iv:[0,3,6],name:"减三和弦",ref:"紧张收缩；含减三度+减五度。"},
    {iv:[0,4,7,10],name:"属七和弦",ref:"强烈需要解决到大三和弦（V7→I），最‘想回家’。"},
    {iv:[0,4,7,11],name:"大七和弦",ref:"梦幻柔和；七音紧贴根音高八度，爵士/抒情常用。"},
    {iv:[0,3,7,10],name:"小七和弦",ref:"柔和摇摆；爵士、流行最常用。"},
    {iv:[0,3,6,10],name:"半减七和弦",ref:"暗淡悬浮；含减五度，常作 ii 的替代。"},
    {iv:[0,3,6,9],name:"减七和弦",ref:"极度紧张，等音可通向多个调，古典/浪漫派爱用。"},
    {iv:[0,5,7],name:"挂四和弦",ref:"‘悬’在未解决，落到三度才安定，流行常用。"},
    {iv:[0,4,7,9],name:"大六和弦",ref:"柔和色彩，民谣/抒情常作 I6 收尾。"}
  ],
  mode:[
    {deg:[0,2,4,5,7,9,11,12],name:"自然大调",ref:"最光明稳定；主音到三级是大三度（如 C 大调）。"},
    {deg:[0,2,3,5,7,8,10,12],name:"自然小调",ref:"偏暗；主音到三级是小三度（如 a 小调）。"},
    {deg:[0,2,3,5,7,8,11,12],name:"和声小调",ref:"七级升高，导音强烈倾向主音，带‘古典/异域’紧张。"},
    {deg:[0,2,3,5,7,9,10,12],name:"多利亚(Dorian)",ref:"小调色彩但六级为大，柔和又带光，爵士/民谣常用。"},
    {deg:[0,1,3,5,7,8,10,12],name:"弗里几亚(Phrygian)",ref:"二级为半音，开头‘压抑/西班牙’感。"},
    {deg:[0,2,4,6,7,9,11,12],name:"利底亚(Lydian)",ref:"四级升高，梦幻飞行感（如《魔法奇缘》）。"},
    {deg:[0,2,4,5,7,9,10,12],name:"混合利底亚(Mixolydian)",ref:"大调但七级降低，摇滚/乡村常用，明亮不紧张。"},
    {deg:[0,2,4,7,9,12],name:"中国五声·宫调式",ref:"无小二度碰撞，东方明亮；宫=do。"},
    {deg:[0,3,5,7,10,12],name:"中国五声·羽调式",ref:"小调五声，柔和东方；羽=la。"},
    {deg:[0,1,5,7,8,12],name:"日本都节音阶",ref:"含半音与增二度，带‘忧郁/阴翳’的日本味。"}
  ],
  prog:[
    {name:"I–IV–V–I（正格进行）",ch:[{root:60,iv:[0,4,7]},{root:65,iv:[0,4,7]},{root:67,iv:[0,4,7]},{root:72,iv:[0,4,7]}],ref:"最经典‘主-下属-属-主’，像句号收束。"},
    {name:"I–V–vi–IV（万能进行）",ch:[{root:60,iv:[0,4,7]},{root:67,iv:[0,4,7]},{root:69,iv:[0,3,7]},{root:65,iv:[0,4,7]}],ref:"无数流行歌共用，卡农式忧郁与明亮交替。"},
    {name:"vi–IV–I–V（反万能）",ch:[{root:69,iv:[0,3,7]},{root:65,iv:[0,4,7]},{root:60,iv:[0,4,7]},{root:67,iv:[0,4,7]}],ref:"万能进行的变体，更柔和抒情。"},
    {name:"ii–V–I（爵士功能）",ch:[{root:62,iv:[0,3,7]},{root:67,iv:[0,4,7,10]},{root:72,iv:[0,4,7]}],ref:"爵士最标志的‘下属-属-主’，最‘解决’。"},
    {name:"I–vi–IV–V（五零年代）",ch:[{root:60,iv:[0,4,7]},{root:69,iv:[0,3,7]},{root:65,iv:[0,4,7]},{root:67,iv:[0,4,7]}],ref:"老式情歌/doo-wop 常用。"},
    {name:"I–♭VII–♭VI–V（小调摇滚）",ch:[{root:60,iv:[0,4,7]},{root:70,iv:[0,4,7]},{root:68,iv:[0,4,7]},{root:67,iv:[0,4,7]}],ref:"进行曲/史诗感，向下借用和弦。"},
    {name:"完全终止 V–I",ch:[{root:67,iv:[0,4,7]},{root:72,iv:[0,4,7]}],ref:"属到主，像句号，最稳定。"},
    {name:"半终止（停在 V）",ch:[{root:60,iv:[0,4,7]},{root:67,iv:[0,4,7]}],ref:"停在属和弦，悬而未决像逗号。"},
    {name:"变格终止 IV–I",ch:[{root:65,iv:[0,4,7]},{root:60,iv:[0,4,7]}],ref:"下属到主，教堂‘阿门’感。"},
    {name:"阻碍终止 V–vi",ch:[{root:67,iv:[0,4,7]},{root:69,iv:[0,3,7]}],ref:"属后意外落到六级，‘想收没收住’。"}
  ]
};
const EAR_TYPE_LABEL = {interval:"音程", chord:"和弦", mode:"调式", prog:"和弦连接"};
const EAR_DRILL_CFG = {
  "ear-int":{types:["interval"],label:"音程听辨"},
  "ear-chord":{types:["chord"],label:"和弦色彩听辨"},
  "ear-prog":{types:["prog"],label:"和弦连接 / 功能听辨"},
  "ear-mode":{types:["mode"],label:"调式判断"}
};
function earPick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function earShuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function earOpts(pool, correct, n){
  const set=[correct];
  while(set.length<n){ const c=earPick(pool); if(!set.includes(c)) set.push(c); }
  return earShuffle(set);
}
function earMakeQuestion(type){
  if(type==="interval"){
    const iv = earPick(EAR_BANK.interval);
    const root = 57 + Math.floor(Math.random()*8);
    const harmonic = Math.random()<0.3;
    const play = ()=> harmonic? AE.chord([0, iv.semi], root, 0.9) : AE.interval(iv.semi, root, 0.5);
    const opts = earOpts(EAR_BANK.interval.map(x=>x.name), iv.name, 4);
    return {type, play, question: harmonic? "听两个音同时响（和声音程），判断音程：" : "听两个音（低→高），判断音程：",
      options:opts, answer:opts.indexOf(iv.name), explain:iv.ref};
  }
  if(type==="chord"){
    const ch = earPick(EAR_BANK.chord);
    const root = 55 + Math.floor(Math.random()*10);
    const play = ()=> AE.chord(ch.iv, root, 1.4);
    const opts = earOpts(EAR_BANK.chord.map(x=>x.name), ch.name, 4);
    return {type, play, question:"听和弦，判断性质（大/小/七/色彩）：",
      options:opts, answer:opts.indexOf(ch.name), explain:ch.ref};
  }
  if(type==="mode"){
    const m = earPick(EAR_BANK.mode);
    const root = 57 + Math.floor(Math.random()*6);
    const up = m.deg.map(d=>root+d);
    const down = m.deg.slice(0,-1).reverse();
    const notes = up.concat(down).map(mm=>({m:mm,d:0.28,gap:0.30}));
    const play = ()=> AE.sequence(notes);
    const opts = earOpts(EAR_BANK.mode.map(x=>x.name), m.name, 4);
    return {type, play, question:"听一段音阶（以行为主），判断它属于哪种调式：",
      options:opts, answer:opts.indexOf(m.name), explain:m.ref};
  }
  // prog
  const p = earPick(EAR_BANK.prog);
  const play = ()=> AE.progression(p.ch, 0.95, 1.0);
  const opts = earOpts(EAR_BANK.prog.map(x=>x.name), p.name, 4);
  return {type:"prog", play, question:"听一段和弦连接，判断它的功能进行：",
    options:opts, answer:opts.indexOf(p.name), explain:p.ref};
}
function renderEarDrill(box, cfg, id){
  const types = (cfg && cfg.types && cfg.types.length) ? cfg.types : ["interval","chord","mode","prog"];
  box.innerHTML = `
    <div class="lab-note"><b>🎯 ${cfg&&cfg.label?cfg.label:"听辨训练"}</b> · 参考上音 / 央音视唱练耳听辨题型：${types.map(t=>EAR_TYPE_LABEL[t]).join("、")}。每次随机出题，听后作答，答对有解析。</div>
    <div class="game-meta" style="margin:10px 0"><span>答对 <b id="ed-ok">0</b></span><span>连对 <b id="ed-combo">0</b></span><span>已做 <b id="ed-n">0</b></span></div>
    <div class="game-stage">
      <div class="big-play" id="ed-play">🔊</div>
      <div id="ed-q" style="margin:8px 0;color:#cbbfa6">点击播放，听辨后作答。</div>
      <div class="opt-grid" id="ed-opts"></div>
      <div class="feedback" id="ed-fb"></div>
    </div>
    <button class="btn ghost sm" id="ed-next" style="display:none">下一题 →</button>`;
  let ok=0, combo=0, n=0, answered=false, cur=null;
  function next(){
    answered=false; n++; const nEl=$("ed-n"); if(nEl) nEl.textContent=n;
    const ne=$("ed-next"); if(ne) ne.style.display="none";
    const t = earPick(types);
    cur = earMakeQuestion(t);
    const qEl=$("ed-q"); if(qEl) qEl.textContent=cur.question;
    const fb=$("ed-fb"); if(fb){ fb.className="feedback"; fb.innerHTML=""; }
    const opts=$("ed-opts"); opts.innerHTML="";
    cur.options.forEach((label,i)=>{
      const b=document.createElement("button"); b.className="opt-btn"; b.textContent=label;
      b.onclick=()=>{
        if(answered) return; answered=true;
        const correct = i===cur.answer;
        if(correct){ b.classList.add("correct"); ok++; combo++; bump(id,"hear",10); renderLessonMastery(id); ML.toast("听辨正确！","✅"); }
        else { b.classList.add("wrong"); combo=0; opts.querySelectorAll(".opt-btn").forEach(x=>{ if(x.textContent===cur.options[cur.answer]) x.classList.add("correct"); }); ML.toast("再听一次对比","🎧"); }
        const okEl=$("ed-ok"); if(okEl) okEl.textContent=ok;
        const cb=$("ed-combo"); if(cb) cb.textContent=combo;
        const f=$("ed-fb"); if(f){ f.className="feedback show"; f.innerHTML=(correct?"✓ 正确。":"✗ 正确答案："+cur.options[cur.answer]+"。")+" <span style='color:#cbbfa6'>"+cur.explain+"</span>"; }
        const nx=$("ed-next"); if(nx) nx.style.display="inline-block";
      };
      opts.appendChild(b);
    });
  }
  const playBtn=$("ed-play"); if(playBtn) playBtn.onclick=()=>{ if(cur) cur.play(); };
  const nextBtn=$("ed-next"); if(nextBtn) nextBtn.onclick=next;
  next();
}
// 暴露给 app.js 的洞穴游戏 / 入学测验复用
window.EAR = { makeQuestion:earMakeQuestion, drill:renderEarDrill, bank:EAR_BANK, typeLabel:EAR_TYPE_LABEL };

/* ---------- 统一轻量课程页：知识讲解 → 音乐例 → 如何应用 → 实践 → 完成 ---------- */
function renderLesson(body, id){
  const l = resolveLesson(id);
  if(!l){ ML.toast("课程不存在","⚠️"); return; }
  if(!l.synthetic) mastery(id);
  const nc = (typeof NODE_CONTENT!=="undefined" && NODE_CONTENT[id]) || {};
  const appText = l.application || nc.application || "";
  const exampleSpec = l.exampleAudio || nc.audio || null;
  if(exampleSpec) l.exampleAudio = exampleSpec;
  if(!l.practice && nc.practice) l.practice = nc.practice;
  body.innerHTML = `
    <button class="btn ghost sm" id="bk">← 返回知识地图</button>
    <div class="panel">
      <div class="kicker">${l.synthetic?"探索方向":"课程"} · ${l.path} · ${l.tier}</div>
      <h2>${l.emoji} ${l.title}</h2>
      <div id="lesson-mastery">${l.synthetic?"":lessonMasteryHTML(id)}</div>
    </div>
    <div class="panel">
      <div class="sec-tag">① 讲解</div>
      <div class="mrow">
        <button class="btn sm gold" id="cn-simple">通俗</button>
        <button class="btn sm ghost" id="cn-pro">专业</button>
      </div>
      <div id="cn-text" class="lesson-body">${l.concept.simple}</div>
    </div>
    <div class="panel">
      <div class="sec-tag">② 音乐例</div>
      ${l.phenomenon? phenomenonHTML(l) : exampleHTML(l)}
    </div>
    <div class="panel">
      <div class="sec-tag">③ 如何运用</div>
      <div id="app-text" class="lesson-body">${appText||""}</div>
    </div>
    <div class="panel">
      <div class="sec-tag">④ 实践</div>
      <div id="practice-box"></div>
    </div>
    <div class="panel" id="next-panel">
      <h2>✅ 完成与复习</h2>
      <div id="next-box"></div>
    </div>`;

  // ① 概念切换
  $("cn-simple").onclick=()=>{ $("cn-text").textContent=l.concept.simple; $("cn-simple").className="btn sm gold"; $("cn-pro").className="btn sm ghost"; };
  $("cn-pro").onclick=()=>{ $("cn-text").textContent=l.concept.pro||l.concept.simple; $("cn-pro").className="btn sm gold"; $("cn-simple").className="btn sm ghost"; };

  // ② 音乐示例
  if(l.phenomenon){ wirePhenomenon(l, id); } else { wireExample(l); }

  // ③ 小实践
  renderPractice($("practice-box"), l, id);

  $("bk").onclick=()=>{ hubTab="map"; renderLearnHub(); };
  renderNext(body, id);
}
function renderNext(body, id){
  const box=$("next-box"); if(!box) return;
  const l = resolveLesson(id);
  if(!l || l.synthetic){
    box.innerHTML=`<div class="sub">这是一个探索方向。随时可以返回知识地图，选另一个感兴趣的方向继续。把学到的用在「作曲动机」「即兴实验室」里，会让它真正属于你。</div>`;
    return;
  }
  const ov=overall(id);
  const nx=nextLessonId(id);
  let html=`<div class="sub">本课当前掌握度 <b style="color:var(--gold-bright,#ffd97a)">${ov}%</b>。${ov>=40?"你已理解本课核心；也可以继续往下练得更稳。":"继续练可以让掌握度更高。"}无论是否满级，你都可以自由前往任何知识点。</div>`;
  if(nx){ const nl=D.LESSONS.find(x=>x.id===nx);
    html+=`<button class="btn gold" id="go-next" style="margin-top:10px">➡ 随便逛逛下一个：${nl.emoji} ${nl.title}</button>`;
  } else {
    html+=`<div class="feedback show" style="margin-top:10px">🏆 你已走完所有知识节点！去「作曲动机」「即兴实验室」把知识真正用起来吧。</div>`;
  }
  box.innerHTML=html;
  const g=$("go-next"); if(g) g.onclick=()=> renderLesson(body, nx);
}
function whyText(l){
  const map={
    triad:"三和弦之所以是基础，是因为‘三度堆叠’在听觉上最稳定又不空洞；它同时给出根、三（决定大小）、五（决定明暗框架），足以定义一个调的中心。",
    majmin:"大三和弦的‘亮’来自大三度（4 半音）形成的大跨度张力；小三和弦的小三度（3 半音）更接近纯律的小张力，所以偏柔和/暗。",
    dom7:"G7 含导音 B（倾向 C）与下属音 F（倾向 E），两个‘想解决’的力叠加，所以听起来‘急着回家’。这就是属功能的本质。",
    secdom:"V/V 把 G 临时当成‘主’，用 D7 给它一个属和弦，于是产生‘先去 G 再回 C’的拐弯推力。它在本调是临时出现的，解决到 V 后就‘回归’。",
    cadence:"终止式是和声的标点：V→I 因为导音强烈解决到主音，所以像‘句号’；I→V 停在属和弦的悬而未决，像‘逗号’。",
    fivescale:"五声音阶去掉了导音(7)和小二度碰撞，所以几乎任意组合都不产生强烈不协和——这正是它‘怎么弹都和谐、有留白’的原因。"
  };
  return map[l.id]||"这个知识之所以重要，是因为它让你从‘听到’走向‘能用’：理解它的功能，你才能在自己的音乐里主动运用，而不是死记。" ;
}
function lessonMasteryHTML(id){
  const m=mastery(id);
  const bar=(k,v)=>`<div class="skill-row"><div class="top"><span class="nm">${k}</span><span class="vl">${v}%</span></div>
    <div class="xp-bar"><div class="xp-fill" style="width:${v}%"></div></div></div>`;
  return `<div style="margin:8px 0 2px">${bar("KNOW 知道",m.know)}${bar("HEAR 听得出来",m.hear)}${bar("PLAY 能演奏",m.play)}${bar("APPLY 能应用",m.apply)}${bar("CREATE 能创造",m.create)}</div>
    <div class="sub" style="margin-top:6px">Overall Mastery：<b style="color:var(--gold-bright)">${overall(id)}%</b> —— ${overall(id)>=70?"你已能在音乐中较稳定地使用。":overall(id)>=40?"你理解了，但还不能在音乐中稳定使用。":"刚开始，继续练习。"}</div>`;
}
function renderLessonMastery(id){
  const el=$("lesson-mastery"); if(el) el.innerHTML=lessonMasteryHTML(id);
}

/* ============================================================
   MUSIC LAB
   ============================================================ */
function renderMusicLab(body){
  const keys=["C","D","E","F","G","A","Bb","B"];
  const scales={ "大调":[0,2,4,5,7,9,11], "小调":[0,2,3,5,7,8,10], "五声":[0,2,4,7,9], "多利亚":[0,2,3,5,7,9,10] };
  const progPresets={
    "I–V–I":[[0,4,7],[0,4,7,10],[0,4,7]],
    "I–vi–IV–V":[[0,4,7],[9,12,16],[5,9,12],[7,11,14]],
    "I–ii–V–I":[[0,4,7],[2,5,9],[7,11,14],[0,4,7]],
    "想更柔和(Cmaj7–Am7–Fmaj7–G7)":[[0,4,7,11],[9,12,16,19],[5,9,12,16],[7,11,14,17]]
  };
  let root=60, scaleName="大调", prog=[[0,4,7],[0,4,7,10],[0,4,7]];
  body.innerHTML=`
    <div class="panel">
      <h2>🎛 MUSIC LAB · 自由实验</h2>
      <div class="sub">不是课程，而是实验空间。选择调性 / 音阶 / 和弦进行，立即播放、A/B 对比、保存。理解“同样的动机，不同元素会产生完全不同的情绪”。</div>
      <div class="mrow">
        <span style="color:#cbbfa6">调性</span>
        <select id="lab-key">${keys.map(k=>`<option>${k}</option>`).join("")}</select>
        <span style="color:#cbbfa6">音阶</span>
        <select id="lab-scale">${Object.keys(scales).map(s=>`<option>${s}</option>`).join("")}</select>
      </div>
      <div class="mrow">
        <span style="color:#cbbfa6">进行预设</span>
        <select id="lab-prog">${Object.keys(progPresets).map(p=>`<option>${p}</option>`).join("")}</select>
        <button class="btn sm" id="lab-playA">▶ 播放 A</button>
        <button class="btn sm gold" id="lab-playB">⚡ 改一点再播 B</button>
      </div>
      <div class="feedback" id="lab-fb"></div>
      <div class="lab-note" style="margin-top:8px">B 版本会自动把三和弦升级为七和弦（更柔和/更复杂），听两者的差别并回答下面的问题。</div>
      <div class="opt-grid" id="lab-q"></div>
    </div>`;
  function curRoot(){ return 60 + keys.indexOf($("lab-key").value); }
  function refreshProg(){ prog = progPresets[$("lab-prog").value]; }
  $("lab-key").onchange=()=>{};
  $("lab-prog").onchange=refreshProg; refreshProg();
  $("lab-playA").onclick=()=> playSpec({type:"prog",chords:prog.map(iv=>({root:curRoot(),iv})),step:1.0,dur:0.9});
  $("lab-playB").onclick=()=>{
    const b = prog.map(iv=> iv.length>=4? iv : iv.concat([iv.length===3?iv[2]+ (iv[2]>=7?5:4):-1])); // add seventh
    const bClean = prog.map(iv=>{ const arr=iv.slice(); if(arr.length===3) arr.push(arr[2]>=7?arr[2]+5:arr[2]+4); return arr; });
    playSpec({type:"prog",chords:bClean.map(iv=>({root:curRoot(),iv})),step:1.0,dur:0.9});
    const fb=$("lab-fb"); fb.className="feedback show";
    fb.innerHTML="⚡ B 把三和弦换成了七和弦：低音相同，但上方多了一个‘色彩音’，张力/柔和度都变了。你觉得哪一个更耐听？";
    $("lab-q").innerHTML=`<button class="opt-btn" data-c="0">A 更干净稳定</button><button class="opt-btn" data-c="1">B 更柔和复杂</button>`;
    $("lab-q").querySelectorAll(".opt-btn").forEach(b2=> b2.onclick=()=>{
      $("lab-q").querySelectorAll(".opt-btn").forEach(x=>x.disabled=true);
      b2.classList.add("correct");
      const f2=$("lab-fb"); f2.innerHTML+="<br>✓ 没有固定答案——这只是‘常见表达手段’，你可以继续在实验室里实验属于自己的版本。";
    });
  };
}

/* ============================================================
   FEELING
   ============================================================ */
function renderFeeling(body){
  body.innerHTML=`
    <div class="panel">
      <h2>🎹 I WANT THIS FEELING</h2>
      <div class="sub">你不用懂术语。说出你想要的感觉，AI 把“情绪 → 音乐参数 → 实际操作”连接起来，并给你一段可修改的小实验。</div>
      <div class="mrow">
        <input id="feel-in" placeholder="例如：凌晨三点一个人在城市走路…" style="flex:1;background:#0d1424;border:1px solid var(--line);border-radius:10px;padding:10px;color:#e9e4d6"/>
        <button class="btn gold" id="feel-go">转换</button>
      </div>
      <div id="feel-out"></div>
    </div>
    <div class="panel">
      <h2>🌟 推荐情绪实验</h2>
      <div class="inst-grid" id="feel-list"></div>
    </div>`;
  $("feel-list").innerHTML=D.FEELINGS.map((f,i)=>`<div class="inst-card" data-i="${i}" style="cursor:pointer">
    <div class="iem">🎼</div><div class="inm" style="font-size:13px">${f.f}</div></div>`).join("");
  $("feel-list").querySelectorAll(".inst-card").forEach(c=> c.onclick=()=> showFeel(D.FEELINGS[+c.dataset.i]));
  $("feel-go").onclick=()=>{
    const txt=($("feel-in").value||"").trim(); if(!txt){ ML.toast("先描述你的感觉","✍️"); return; }
    // keyword mapping
    const kw={ "孤独":["低密度织体","中低音区","较慢速度","开放和弦","较大留白"],
      "温柔":["中高音域","稀疏旋律","柔和力度","延伸和弦","慢速"],
      "紧张":["不协和音","半音","密集节奏","强烈动态"],
      "空灵":["高音区","大空间混响","开放五度","延伸和弦","长延音"],
      "电影":["弦乐垫底","宽广动态","变化和声","低频铺底"],
      "明亮":["五声音阶","中高音区","轻快速度","分解和弦"],
      "悲伤":["小调","中低音区","慢速","留白"],
      "快乐":["大调","中高音区","轻快速度"] };
    let params=null;
    for(const k in kw){ if(txt.includes(k)){ params=kw[k]; break; } }
    if(!params) params=["中速","清晰织体","平衡音域","稳定的和声"];
    $("feel-out").innerHTML=`<div class="panel" style="margin:12px 0">
      <div class="qt" style="color:#f3ead6">你的感觉 → 可尝试的音乐参数：</div>
      <div>${params.map(p=>`<span class="tag">${p}</span>`).join("")}</div>
      <div class="lab-note" style="margin-top:10px">这些不是固定公式，只是常见手段。下面是一段短实验，你可以自己改。</div>
      <button class="btn sm" id="feel-play">▶ 试听这段实验</button>
      <div class="feedback show" style="margin-top:8px">🎓 导师：先别急着‘正确’，去听——你想要的那个感觉，往往就是这样几个元素叠加出来的。</div>
    </div>`;
    $("feel-play").onclick=()=> playSpec({type:"prog",chords:[{root:55,iv:[0,4,7,10]},{root:53,iv:[0,3,7]},{root:57,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:1.3,dur:1.1});
  };
}
function showFeel(f){
  const out=$("feel-out");
  out.innerHTML=`<div class="panel" style="margin-top:12px">
    <div class="qt" style="color:#f3ead6">${f.f}</div>
    <div>${f.params.map(p=>`<span class="tag">${p}</span>`).join("")}</div>
    <button class="btn sm" id="feel-play2" style="margin-top:8px">▶ 试听实验</button>
    <div class="feedback show" style="margin-top:8px">🎓 导师：调慢一点、把织体拉稀疏、留更多空白——你会发现“感觉”是可以被‘调’出来的。</div>
  </div>`;
  $("feel-play2").onclick=()=> playSpec(f.exp);
}

/* ============================================================
   VOCAB
   ============================================================ */
function renderVocab(body){
  body.innerHTML=`<div class="panel"><h2>🎨 MUSIC VOCABULARY · 音乐语言词典</h2>
    <div class="sub">把日常语言翻译成音乐语言。注意：这些不是固定公式，只是常见的音乐表达手段。</div>
    <div id="vocab-list"></div></div>`;
  $("vocab-list").innerHTML=D.VOCAB.map(v=>`
    <div class="quest-item" style="cursor:default">
      <div class="qem">🎴</div>
      <div class="qbody"><div class="qt">${v.w}</div>
      <div class="qd">${v.items.map(i=>`<span class="tag">${i}</span>`).join("")}</div>
      <div class="pm" style="color:#cbbfa6;margin-top:6px">${v.note}</div></div>
    </div>`).join("");
}

/* ============================================================
   IMPROVISATION LAB
   ============================================================ */
function renderImprov(body){
  const levels=[
    {nm:"Challenge 1 · 限定五个音",desc:"只能用 C D E G A 五个音自由弹。",allow:[60,62,64,67,69]},
    {nm:"Challenge 2 · 固定进行",desc:"在 C–Am–F–G 上进行，自由创造旋律。",allow:[60,62,64,65,67,69,71,72]},
    {nm:"Challenge 3 · 加节奏",desc:"允许改变节奏与重音。",allow:[60,62,64,65,67,69,71,72]},
    {nm:"Challenge 4 · 自由",desc:"只给情绪‘温柔’+ 调性 C，完全自由即兴。",allow:[48,50,52,53,55,57,59,60,62,64,65,67,69,71,72]}
  ];
  body.innerHTML=`
    <div class="panel"><h2>🌀 IMPROVISATION LAB</h2>
    <div class="sub">限制 → 解放。先在最窄的限制里建立“听觉→预判→反应”，逐步放开。</div>
    <div id="imp-levels"></div>
    <div class="piano-wrap" id="imp-piano" style="margin-top:12px"></div>
    <div class="lab-note" id="imp-note">选择上方挑战开始。</div>
    <div class="mrow"><button class="btn sm" id="imp-clear">清空记录</button><button class="btn ghost sm" id="imp-replay">↻ 回放刚才</button></div>
    </div>`;
  $("imp-levels").innerHTML=levels.map((l,i)=>`<button class="event-opt" style="width:100%;margin-bottom:6px" data-i="${i}">
    <div class="eo-t">${l.nm}</div><div style="font-size:11px;color:#9aa3b8;margin-top:3px">${l.desc}</div></button>`).join("");
  let rec=[];
  buildPiano($("imp-piano"), (m,k)=>{ rec.push(m); });
  $("imp-clear").onclick=()=>{ rec=[]; $("imp-note").textContent="记录已清空。"; };
  $("imp-replay").onclick=()=>{ if(!rec.length){ML.toast("先弹点什么","🎹");return;} AE.playMidi(rec.map(m=>({m,d:0.4,gap:0.42}))); };
  $("imp-levels").querySelectorAll(".event-opt").forEach(b=> b.onclick=()=>{
    const l=levels[+b.dataset.i];
    $("imp-note").innerHTML=`<b>${l.nm}</b><br>${l.desc}<br>在你允许的音里自由弹，弹完点“回放”听自己的乐句。`;
    rec=[];
    ML.toast("挑战开始：限制 "+l.allow.length+" 个音","🌀");
  });
}

/* ============================================================
   COMPOSITION MOTIF LAB
   ============================================================ */
function renderComposition(body){
  body.innerHTML=`
    <div class="panel"><h2>✍️ COMPOSITION LAB · 从动机开始</h2>
    <div class="sub">不要一开始就“写一首完整的歌”。先创造 2～4 个音的动机，再用变奏/移位/倒影/扩展发展它。</div>
    <div class="piano-wrap" id="comp-piano"></div>
    <div class="lab-note">点 2～4 个音作为你的动机。</div>
    <div class="mrow">
      <button class="btn sm" id="comp-play">▶ 动机</button>
      <button class="btn sm ghost" id="comp-var">变奏(节奏)</button>
      <button class="btn sm ghost" id="comp-trans">移位(+3)</button>
      <button class="btn sm ghost" id="comp-inv">倒影</button>
      <button class="btn sm ghost" id="comp-ext">扩展</button>
      <button class="btn sm gold" id="comp-save">💾 存为作品</button>
    </div>
    <div class="feedback" id="comp-fb"></div>
    </div>`;
  let motif=[];
  buildPiano($("comp-piano"), (m,k)=>{ if(motif.length<6 && !motif.includes(m)) motif.push(m); });
  function playArr(arr){ if(!arr.length){ML.toast("先点几个音","✍️");return;} AE.playMidi(arr.map(m=>({m,d:0.35,gap:0.38}))); }
  $("comp-play").onclick=()=> playArr(motif);
  $("comp-var").onclick=()=>{ if(!motif.length)return; const r=motif.map(m=>({m,d:0.2+Math.random()*0.3,gap:0.25+Math.random()*0.3})); AE.playMidi(r); $("comp-fb").className="feedback show"; $("comp-fb").innerHTML="🎼 变奏：改变每个音的时值，动机的‘性格’立刻不同。"; };
  $("comp-trans").onclick=()=>{ if(!motif.length)return; const t=motif.map(m=>m+3); playArr(t); $("comp-fb").className="feedback show"; $("comp-fb").innerHTML="🎼 移位：整体移高 3 半音，色彩变化但结构保留。"; };
  $("comp-inv").onclick=()=>{ if(!motif.length)return; const base=motif[0]; const inv=motif.map(m=>base-(m-base)); playArr(inv); $("comp-fb").className="feedback show"; $("comp-fb").innerHTML="🎼 倒影：以第一个音为轴上下翻转，得到‘镜像’动机。"; };
  $("comp-ext").onclick=()=>{ if(!motif.length)return; const ex=[]; motif.forEach(m=>{ex.push(m);ex.push(m+2);}); playArr(ex); $("comp-fb").className="feedback show"; $("comp-fb").innerHTML="🎼 扩展：在每个音后插入邻音，动机被拉长。"; };
  $("comp-save").onclick=()=>{ if(!motif.length){ML.toast("先创作动机","✍️");return;} const S=ML.getState(); S.works++; S.portfolio.unshift({type:"compose",title:"✍️ 动机作品",date:todayStr(),skill:"compose",time:"—",exp:60,ai:"好动机！试试用移位与倒影发展成一个乐句。",note:"在作曲动机实验室创作："+motif.map(midiName).join(" ")}); S.skills.compose=clamp(S.skills.compose+1,0,10); ML.save(); ML.renderShell(); ML.toast("动机已存入作品集 +60 EXP","🎵","xp"); };
}
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }

/* ============================================================
   Register
   ============================================================ */
ML.NAV.push({id:"learn",em:"📚",nm:"学习"});
ML.VIEWS.learn = renderLearnHub;
ML.buildNav();
/* 暴露给扩展模块（编曲 / 配器实验室等）*/
ML.registerLearnTab = function(tab, renderer){ TABS.push(tab); LEARN_RENDERERS[tab.id]=renderer; };
ML.mastery = mastery; ML.overall = overall; ML.bump = bump; ML.reqMet = reqMet;
/* 测试钩子（__ 前缀，不影响生产）：供 _smoke.js 直接驱动领域树 / 课程页 / 合成课程路径 */
ML.openLesson = function(id){
  ML.showView("learn");
  hubTab="lesson";
  $("view").innerHTML = `<div class="tabbar" id="learn-tabs"></div><div id="learn-body"></div>`;
  const tabs=$("learn-tabs");
  tabs.innerHTML = `<button class="tab" id="lt-back"><span>🗺</span>返回知识地图</button>`;
  $("lt-back").onclick=()=>{ hubTab="map"; renderLearnHub(); };
  renderLesson($("learn-body"), id);
};
ML.__test = { resolveLesson, renderKnowledgeMap, renderDomainTree, renderLesson, DOMAINS };

/* learn.js 在 app.js 之后加载：若应用已进入主界面（老用户直接进入），
   此时进度函数刚挂载完成，刷新一次外壳以便正确计算「当前方向」，且不破坏首屏渲染。 */
if (window.__mlEntered) { try { window.ML.renderShell(); } catch(e){ console.warn("refresh shell after learn load:", e); } }

})();
