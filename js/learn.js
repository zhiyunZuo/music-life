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
  const desc = node.desc || node.blurb || "这个方向正在持续建设中。先用下面的钢琴自由探索，或向右栏 AI 导师提问获取例子。";
  const simple = c.simple || desc;
  const pro = c.pro || simple;
  const realWork = c.realWork || "（该方向的真实作品示例正在整理）";
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
  {id:"lab",em:"🎛",nm:"音乐实验室"},
  {id:"feel",em:"🎹",nm:"我要这种感觉"},
  {id:"vocab",em:"🎨",nm:"音乐词典"},
  {id:"improv",em:"🌀",nm:"即兴实验室"},
  {id:"compose",em:"✍️",nm:"作曲动机"}
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
  if(hubTab==="map"){ if(ML.bindMentor) ML.bindMentor(null); renderKnowledgeMap(body); }
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
    blurb:"动机 → 乐句 → 发展 → 对比 → 张力 → 高潮 → 结构 → 叙事。AI 提问、给限制、分析，不直接代写。",
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
  /* ---- 钢琴应用 ---- */
  "p-acc":{ simple:"伴奏型（accompaniment pattern）就是你用来托住旋律的固定音型。它决定一首歌的‘呼吸’和能量：柱式和弦（几个音一起弹）稳重，分解和弦（把和弦音依次弹）流动，琶音更轻盈，Ostinato（固定重复的音型）则很有律动感。学它的意义在于：绝大多数弹唱、现场、church 司琴都不是在弹独奏，而是在用合适的音型把旋律托住。",
    pro:"Accompaniment pattern = 持续声部中重复的组织方式，决定 groove 与能量分配。常见类型：block（柱式）、broken（分解）、arpeggio（琶音）、Alberti bass（阿尔贝蒂低音，低-高-中-高）、Ostinato（固定音型）。选择依据是速度、情绪与织体密度。",
    realWork:"Beatles《Let It Be》用近乎全程的柱式和弦营造庄严；莫扎特钢琴奏鸣曲的阿尔贝蒂低音让左手既流动又不抢旋律；无数 gospel 的 Ostinato 制造循环推动。",
    application:"弹唱时左手用分解和弦让节奏更流动，抒情节奏用柱式更稳。先确定和弦，再选一个音型反复。现场时根据人声呼吸留白：人声延长音你补 fill，别抢拍。写歌 demo 时先用最简单柱式把和声定下来，再考虑换音型。",
    practice:"用 C–Am–F–G 这个进行，分别用柱式、分解、琶音三种音型各弹一遍，注意听：柱式最稳、分解最流动、琶音最轻盈。再试着在每小节第 4 拍加一个 fill 音。",
    audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:57,iv:[0,3,7]},{root:53,iv:[0,4,7]},{root:55,iv:[0,4,7]}],step:0.9,dur:0.8} },
  "p-sight":{ simple:"视奏（sight-reading）就是第一次看到谱子就能边看边弹。关键不是手快，而是‘提前看’——眼睛永远比手快一小节，并把音符归到和弦、音阶、琶音这些模式里，而不是一个一个认。它是钢琴手最实用的能力之一：能视奏，你就能快速消化新谱、参与排练、即兴跟弹。",
    pro:"Sight-reading = 实时读谱演奏，依赖模式识别（和弦、音阶、琶音轮廓）与视幅（eye span，一次看一组而非一个音）。训练目标是把低级‘认音’自动化，把注意力留给读下一小节与手位规划。",
    realWork:"钢琴考级、乐团排练、教堂司琴、音乐剧替补都靠视奏；职业钢琴手每天视奏短谱保持状态。",
    application:"拿到新谱先扫：调号、拍号、最高最低音、临时记号、反复记号；手小的段落提前安排指法。不要在第一个音就停，错了继续走，保持节奏比弹对每一个音更重要。",
    practice:"找一段你没见过的简单谱（如车尔尼 599 一级），限时一遍弹下来：错音不停、继续走，弹完再回看错在哪。每天 5 分钟短谱比一次练 1 小时更有效。" },
  "p-pop":{ simple:"流行钢琴不是弹得难，而是弹得‘对味’：左手简单的律动，右手旋律加和弦点缀，大量留白和延音（sustain）。它的审美是‘服务歌曲’而不是炫技——多数流行歌钢琴版靠三和弦加七和弦加简单音型就能还原八九成。",
    pro:"Pop piano 强调 groove、voicing（省略/转位让和弦更顺手更现代）、comping（伴奏切分）与空间感，常避开复杂古典技巧，追求一听就‘对’的声响。",
    realWork:"绝大多数流行歌钢琴版（如《Perfect》《Someone Like You》）靠三和弦加七和弦加简单音型即可还原；原曲的‘高级感’常来自 vocal 与留白而非钢琴难度。",
    application:"先听原曲鼓点和贝斯走向，左手模仿贝斯根音加和弦，右手补旋律与切分。副歌可以加密一点，主歌保持稀疏。用延音踏板把和声连起来，但别让低音糊成一团。",
    practice:"选一首你喜欢的流行歌，只用 I–V–vi–IV 四个和弦，配出你的钢琴伴奏版：主歌用分解、副歌用柱式加切分，录下来对比原曲的‘味’差在哪。" },
  "p-impro":{ simple:"即兴伴奏（comping）就是别人唱、你当场配和弦与音型。核心能力是‘听到旋律落在哪个和弦上并立刻反应’。它和独奏即兴不同：你的第一任务是托住人声、跟住拍子、留出空间，而不是展示自己。",
    pro:"Comping = 同时为旋律提供和声与节奏支撑，需要快速听辨和弦功能并选择 voicing 与节奏型；爵士标准曲、Live house 驻唱、教堂司琴天天在用。",
    realWork:"爵士标准曲现场、驻唱、音乐剧排练都是高强度 comping；好的伴奏者能让业余歌手也唱得稳。",
    application:"先抓旋律的骨干音落在哪个和弦（看它停在 1/3/5 还是 2/4/6），然后用该和弦的左手音型托住。人声长音时你加 fill，换气时你留白。跟不准就简化：只弹根音加三音也行。",
    practice:"让朋友或录音唱一段简单旋律，你只用 C、G、Am、F 即兴配伴奏：不必完美，先跟住拍子，每小节只弹 2 拍、留 2 拍给人声呼吸。" },

  /* ---- 和声 ---- */
  "h-conn":{ simple:"和弦连接不是把和弦堆在一起，而是让四个声部（高音/中音/次中音/低音）平滑地‘搬家’。好的连接里每个声部只动最小的距离，共同音保持不动，避免突然跳很远或撞出平行五度/八度（那样声部会失去独立感）。这是从‘会弹和弦’走向‘会写和声’的关键。",
    pro:"Voice leading = 各声部以最小音程移动；避免平行五度/八度（声部独立感丧失）、常用共同音保持与平稳解决；四部和声（SATB）是训练的黄金范本。",
    realWork:"巴赫 chorale 是四部和声范本；流行歌的贝斯线、钢琴左手其实也是一种 voice leading；电影配乐的弦乐写法高度依赖它。",
    application:"弹两个和弦时让每个手指尽量只动一步；低音走根音或五音，上方尽量保持共同音。写歌时副歌前的连接要‘拉满推力’，可以用旋律音做经过。",
    practice:"在键盘上弹 C–G–Am–F，要求每次换和弦时只移动最少的手指（共同音不动），听是否比‘整只手跳’更顺、更连。" },
  "h-borrow":{ simple:"借用和弦（modal interchange）是从平行小调或关系调‘借’一个和弦过来，瞬间换一种色彩，却不改变调性。比如大调里突然用 ♭VI 大三和弦（如 C 大调用的 A♭ 大三和弦），会立刻有史诗或电影感；用 ♭VII（B♭）会有摇滚的力量感。它是让和声‘有故事’最便宜的手段。",
    pro:"Modal interchange = 借用同主音平行调（如 C 大调借 C 小调）的和弦，引入调外音（如 ♭6、♭3、♭7）制造色彩对比，调性中心不变，所以既新鲜又安全。",
    realWork:"《Bohemian Rhapsody》《Creep》的 ♭VI/♭VII；无数电影转场、游戏 Boss 战都用它制造戏剧转折。",
    application:"在明亮的大调进行里，把某个大调和弦临时换成同名小调版（如 C→Cmi），或插入 I→♭VII→♭VI→V，立刻变暗或变史诗。写歌副歌想‘炸’可以走 ♭VI–♭VII–I。",
    practice:"弹 I–♭VII–♭VI–V（如 C–B♭–A♭–G），听这种摇滚/史诗色彩，然后回到 I 感受‘回家’。再试在主歌用大调、副歌插入 ♭VI 的对比。",
    diagram:{root:58,iv:[0,4,7]} },
  "h-extend":{ simple:"延伸和弦是在七和弦上继续往上叠九度、十一度、十三度。多出来的音不改变和弦的功能，但让它的色彩更柔、更现代、更‘爵士/R&B’。比如 Cmaj7 加 9 音（D）变 Cmaj9，会更奶油；属七加 9/13 会更顺滑。理解它，你就能写出那种‘高级但不刺耳’的和声。",
    pro:"Extended chords = 在 7th 上叠加 9/11/13；可按避免音规则省略或改音（如 maj7#11、dom9、dom13）。色彩更丰富、张力更柔，常配合 drop-2/drop-3 voicing 让钢琴好弹。",
    realWork:"无数 bossa nova（如 Jobim）、R&B pad、电影铺底都用 maj9 / 13；现代流行也大量用 add9 增加光泽。",
    application:"把普通七和弦加花：Cmaj7 加 9 音变 Cmaj9 更柔和；属七加 9/13 更顺滑。注意 11 音常与 3 音打架（属七常用 13 代替 11，或把 11 升高成 #11）。钢琴上用转位让延伸音在旋律上方更好听。",
    practice:"弹 Cmaj7，再依次加 9 音、13 音，对比‘干净’和‘奶油感’的差别；再弹 G7 与 G13，听属七加 13 后的顺滑度。",
    diagram:{root:60,iv:[0,4,7,11,14]} },
  "h-subst":{ simple:"替代和弦是用另一个‘功能相同但音色不同’的和弦替换原来的和弦。最常用两种：三全音替代（把属七换成根音下移半音增四度的属七，如 G7→D♭7，它们共享 3 音和 7 音）和五度/三度替换（如用 iii 替 I、vi 替 I）。它能让低音线条更顺、色彩更新鲜。",
    pro:"Substitution：tritone sub（♭II7 替 V7，共享 3/7 音）、iii 替 I、vi 替 I 等，目的是保持功能的同时增加低音线条的半音下行或色彩对比。",
    realWork:"爵士里 G7 常换成 D♭7，让低音半音下行更丝滑；流行里用 vi 替 I 制造柔和的开头。",
    application:"遇到 V7→I，试试把 V7 换成它的三全音替代（如 G7→D♭7），低音会半音下行到 I 的根音，更丝滑。写歌时用 vi 替 I 开头，可以避免‘太满’的大调感。",
    practice:"弹 G7→C，再试 D♭7→C，听低音线条（G→C 与 D♭→C）的不同顺滑度；再在一段 I–vi–IV–V 里把 I 开头换成 vi 听柔和感。",
    diagram:{root:61,iv:[0,4,7,10]} },
  "h-rhythm":{ simple:"和声节奏（harmonic rhythm）是和弦多久换一次。它和‘和弦是什么’一样重要：换得快→紧张/推动；换得慢→稳定/舒展。同一个进行，节奏变了，情绪就完全变了。很多歌‘推不起来’不是因为和弦难，而是和声节奏没设计。",
    pro:"Harmonic rhythm = 和弦变化的频率与位置；它与旋律节奏、节拍重音互动，塑造音乐的呼吸与张力曲线。快节奏和声常见于 disco、后节拍流行；慢节奏见于颂歌、抒情 ballad。",
    realWork:"颂歌每小节一和弦（慢），disco 每拍一和弦（快），许多抒情歌在副歌把和声节奏加密来‘推’。",
    application:"想抒情就拉长每个和弦（两到四小节一个）；想推动就在每拍换和弦或在后半拍切分。写副歌时把和声节奏加密，是常用的‘能量提升’手法。",
    practice:"用 C–G–Am–F 这个进行，先每小节换一次，再每拍换一次，对比‘稳’和‘冲’的差别；再试只在反拍换和弦的切分感。",
    audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:55,iv:[0,4,7]},{root:57,iv:[0,3,7]},{root:53,iv:[0,4,7]}],step:1.0,dur:0.9} },
  "h-modal":{ simple:"调式（mode）是用同一组音、却以不同的音当主音，色彩就不同。比如 C 大调音阶，从 D 开始弹就是 D 多利亚（更柔和的小调感），从 G 开始是 G 混合利底亚（更亮的属调感）。爵士大量用调式：核心语汇是 II–V–I，配合延伸音、替代与贝斯/和弦分离。",
    pro:"Modal harmony = 以调式（而非大小调功能）组织；爵士核心语汇 II-V-I、三全音替代、延伸音、贝斯与和弦的分离（comping vs walking bass）。",
    realWork:"《So What》（D Dorian）、《Autumn Leaves》（II-V-I）都是代表；很多 lo-fi、city pop 也用调式色彩。",
    application:"在 C 大调白键上，分别以 D 为主音（Dorian）和以 C 为主音（Ionian）各弹几句，听明暗差别。爵士即兴时先找 II-V-I，再为每个和弦选对应音阶（如 V7 用 Mixolydian）。",
    practice:"用 C 大调白键，分别以 D 为主音（Dorian）和以 C 为主音（Ionian）各弹几句旋律，对比明暗；再在一段 II-V-I 上给每个和弦配对应音阶。",
    audio:{type:"seq",notes:[{m:62,d:0.3,gap:0.34},{m:64,d:0.3,gap:0.34},{m:65,d:0.3,gap:0.34},{m:67,d:0.3,gap:0.34},{m:69,d:0.3,gap:0.34},{m:71,d:0.3,gap:0.34},{m:72,d:0.5}]} },
  "h-modern":{ simple:"现代/电影和声爱用挂留（sus）、加九（add9）、半音贴靠（chromatic approach）、低音持续（pedal point）来制造悬浮与画面感，而且常常故意‘不解决’。它的美学是‘情绪优先于功能’——听起来不一定‘回家’，但非常贴合画面。",
    pro:"Modern/film harmony = pandiatonic（泛自然音）、sus/added tones、parallel motion（平行进行）、pedal point、计划性不解决，服务情绪与画面而非传统终止。",
    realWork:"Thomas Newman、Hans Zimmer 的 pad 与脉冲低音；无数 trailer、游戏探索段都用这种悬浮和声。",
    application:"在铺底和弦上让某个音悬着不解决（sus），或用持续低音让上方和弦自由变换，制造悬停感。写游戏探索音乐时，用 pedal point + 缓慢和声变化最合适。",
    practice:"左手持续弹 C，右手依次弹 C major、Cadd9、Csus2、Cm(add9)，听同一低音上的不同‘天空’；再写一段 8 小节 pedal point 铺底。" },
  "h-personal":{ simple:"个人和声语言是你反复使用的那套偏爱进行、音色与解决方式。它让你写的歌‘一听就是你的’——就像人的笔迹。它来自大量听、模仿、内化之后的沉淀，不是刻意设计出来的。意识到自己的偏好，你就能主动经营它。",
    pro:"Personal harmonic language = 由习惯性的进行、voicing、色彩与解决偏好构成的签名，源自大量听与模仿后的内化；大师们都有极鲜明的个人语汇。",
    realWork:"比如有人总爱用 I–V–vi–IV，另一人爱用小调借用和弦；Coldplay 的钢琴味、某 R&B 制作人的 voicing 都是签名。",
    application:"收集你最爱 5 首歌的进行，找出你反复被吸引的那几个和弦，把它们变成你创作的默认词汇。写歌时先试这些‘你的和弦’，比硬找新鲜进行更自然。",
    practice:"写下你最喜欢的 3 首歌的和弦进行，圈出共同的和弦或走向，下次创作时先试它们；再用这些和弦写一段 8 小节，听是不是‘像你’。" },

  /* ---- 即兴 ---- */
  "im-mimic":{ simple:"模仿是即兴的第一步：先复制你听到的乐句，再改它。就像学说话先学复述。你不可能跳过‘输入’直接‘输出’——大量模仿大师的乐句，它们会沉淀成你的肌肉记忆和语汇，之后才能自然地说自己的话。",
    pro:"Imitation = 听觉到动作的内化训练；call-and-response（问答句）建立音阶/节奏语汇与即时反应速度，是爵士教育的核心方法。",
    realWork:"所有爵士大师（Parker、Coltrane）都从 transcribe（记谱模仿）开始；传统音乐（印度、非洲）也靠口传模仿。",
    application:"听一段 solo，先整句跟唱、跟弹，再改一两个音。别急着原创，先把别人的句子变成你的‘库存’。模仿时先抓它的节奏型，再抓音。",
    practice:"用录音放一句 4 小节的简单旋律，你立刻模仿弹或唱出来，连续做 5 遍；再试着把最后两音改成音阶邻近音，体会‘模仿→改造’。" },
  "im-limit":{ simple:"限制是给自己设规矩（只用 5 个音、只用一种节奏、只在一个把位），反而更容易弹出不慌的东西。选择太多会让人 paralysis——不知道弹什么。限制像画框，框住了反而自由。这是即兴入门最有效的练习法。",
    pro:"Constrained improvisation = 用限制降低选择焦虑，聚焦动机发展与句法，而非炫技；常用于教学与日常热身。",
    realWork:"爵士练习常用只用一个音阶或一种节奏型；很多现代即兴作曲家也用严格限制法创作。",
    application:"下次不知道弹什么，就限定只弹 C-D-E-G-A 五声，你会发现反而流畅了。写旋律卡住时，也用限制逼出乐句。",
    practice:"只用一个五声音阶，在 C 上进行 2 分钟即兴，不允许用其他音；再试‘只用一个节奏型’的 2 分钟即兴，体会限制带来的松弛。",
    audio:{type:"seq",notes:[{m:60,d:0.3,gap:0.34},{m:62,d:0.3,gap:0.34},{m:64,d:0.3,gap:0.34},{m:67,d:0.3,gap:0.34},{m:69,d:0.5}]} },
  "im-motif":{ simple:"动机即兴是先想一个短小的‘种子乐句’（2–4 个音），然后重复它、移位它、变形它，而不是漫无目的地乱弹。听众听到的是‘有主题的发展’，而不是一串随机音。这是让即兴‘有逻辑、好听’的核心技巧。",
    pro:"Motivic improvisation = 以一个核心动机做变化（重复/倒影/逆行/节奏变奏/移位），保证音乐有内在逻辑与可记忆性。",
    realWork:"贝多芬第五交响曲的开头就是 3 音动机；Charlie Parker 的 solo 大量靠动机发展。",
    application:"即兴前先哼一个 2–3 音的动机，整段都围绕它变：移位到不同音高、倒过来弹、拉宽节奏。听众会觉得‘有主题’，而不是炫技堆砌。",
    practice:"定一个 3 音动机（如 C-E-G），即兴 1 分钟，全程只重复/移位/变节奏这个动机；再录下来听它是不是像‘一句话在发展’。" },
  "im-harm":{ simple:"和声即兴是即兴时主动换和弦、改和声，而不只是弹旋律。它常见于伴奏、自由爵士、以及你想给一段固定旋律‘重新上色’的时候。和一般的旋律即兴不同，你操控的是底层的和声走向。",
    pro:"Harmonic improvisation = 实时重构和声进行与 voicing，常出现在伴奏（reharmonize 旋律）与自由爵士中；需要对和弦替代非常熟。",
    realWork:"教堂司琴给圣诗重新配和声、爵士 trio 的钢琴手在 solo 时改和声，都是它。",
    application:"在固定旋律上，试着把某个和弦临时换成借用和弦或替代和弦，听整体色彩怎么变。给一首熟歌‘重新和声’是极好的练习。",
    practice:"弹一段固定旋律，每次反复时把其中一个和弦换成 ♭VII 或属七替代，对比效果；再试把整段大调进行临时借成小调听明暗变化。" },
  "im-mel":{ simple:"旋律即兴是用音阶/琶音在和弦上进行上‘讲故事’：有起承转合，而不是一串随机音。好的旋律即兴像说话——有问句、有答句、有张力、有解决。核心是‘围绕和弦音装饰，用经过音连接’。",
    pro:"Melodic improvisation = 以音阶/琶音为素材，用句法（question/answer）、张力（离调/半音经过）、resolution 构建有方向的线条，而非音阶上下跑。",
    realWork:"任何独奏（sax、吉他、人声 scat）都是旋律即兴；好的 solo 能被人唱出来。",
    application:"每个和弦上先想它允许哪些音（和弦音+可用音阶音），再围绕和弦音做邻近音装饰；用‘问答句’组织乐句：先上行提问，再下行解决。",
    practice:"在 C–Am–F–G 上，每小节弹一个问句再接答句（音高回落解决），做 4 小节循环；录下来听是否像‘在说话’而非‘在爬音阶’。" },
  "im-free":{ simple:"自由即兴是没有固定和声、没有固定拍子，完全凭当下感觉与彼此‘对话’，像两个人聊天。它考验的是倾听与呼应，而不是技术库存。常用于现代室内乐、声音艺术，也是训练耳朵和反应的最佳练习。",
    pro:"Free improvisation = 脱离预设调/拍，依赖倾听、呼应、能量管理（谁强谁弱、谁进谁退），常见于现代/实验音乐。",
    realWork:"现代室内乐、声音艺术现场、许多即兴戏剧配乐都建立在自由即兴上。",
    application:"和一个朋友轮流弹‘一句话’，注意留白与呼应，而不是比谁弹得多。你的回应应该接住上一个人的最后一个音或情绪。",
    practice:"与同伴（或录音）做 3 分钟无拍子即兴，规则只有一条：每次只回应上一个人的最后一个音或情绪；结束后讨论哪里‘对话’成功了。" },

  /* ---- 即兴钢琴 ---- */
  "ip-detect":{ simple:"水平自检是快速判断你现在的钢琴能力在哪：音阶速度、和弦转位、视奏、即兴反应各如何。它的意义不是打击你，而是让你决定‘直接进高阶’还是‘先补基础’，不浪费时间。很多人卡住是因为在不该练的地方死磕。",
    pro:"Level check = 用几条小测试（12 调音阶速度、和弦转位流畅度、视奏、blues 句型）定位能力区间，匹配合适路线（古典→爵士 / 弹唱→即兴）。",
    realWork:"音乐学院入学、线上课程常做 placement test；专业老师第一节课也先评估。",
    application:"用能否不看谱弹 12 个大小调音阶、能否边弹边跟拍快速自评，再选路线。如果和弦转位都不熟，先补这个再进即兴，会快很多。",
    practice:"计时弹 C 大调音阶（左右手八度），记录速度；再弹一个属七琶音（G7 的 0-4-7-10 上下行），看是否流畅。两项都顺再进 ii-V-I。" },
  "ip-adv":{ simple:"高级路线是直接练 Dm7–G7–Cmaj7 这类 ii–V–I 的层层变奏：先顺弹，再加替换、加延伸、加离调、加节奏错位。它是爵士钢琴的‘主菜’——把这一条练透，你就能在大多数标准曲上即兴。",
    pro:"Advanced = 在 ii-V-I 框架上做 reharmonization、side-slipping（临时滑到邻调再回来）、三全音替代、polyrhythm 与节奏错位，构建个人 vocabulary。",
    realWork:"爵士标准曲现场 solo 几乎都建立在这条语汇上；Chet Baker、Bill Evans 都是 ii-V-I 大师。",
    application:"把一段简单的 ii-V-I 反复弹，每次加一个新手法：先加 9 音，再加替代，再加切分，最后加 side-slip。一层层叠加比一次全上更容易吸收。",
    practice:"弹 Dm7–G7–Cmaj7，第一遍原样，第二遍把 G7 换成 D♭7（三全音替代），第三遍全部加 9/13 音，第四遍在每拍后半拍切入，体会层层升级。" },
  "ip-pianist":{ simple:"‘不会即兴的钢琴家’指技术很溜、但一离开谱就不会自己‘说话’的钢琴手。专项训练就是把技术变成即时语言：练 ear-to-hand（听到就能弹）、句型词汇、comping 和简单 blues 句式。目标是让你在任何情况下都能‘接一句’。",
    pro:"针对 reading-only 钢琴手：训练 ear-to-hand、pattern vocabulary、comping 与简单 blues 句式，打破‘必须看谱’的依赖。",
    realWork:"很多古典钢琴转爵士会遇到这堵墙——手在但耳朵没接上。",
    application:"从 blues 12 小节开始，背几个句型，强迫自己跟录音‘填空’而不是看谱。先能跟，再能改，最后能原创。每天 10 分钟跟录音填空比练 1 小时练习曲更练即兴。",
    practice:"放一段 12 小节 blues 伴奏，你只在每小节末尾弹 2 拍回应句，连续跟 5 遍；再试着把回应句从‘跟和弦音’改成‘加蓝调音’。" },

  /* ---- 即兴伴奏 / 现场 ---- */
  "ac-detect":{ simple:"听调性是先判断这首歌在啥调、根音是谁，再判断当前和弦。它是即兴伴奏的地基——你不能在不知道调的情况下配和弦。方法上先听贝斯根音定调，再听旋律骨干音落在哪个和弦（停在 1/3/5 常是 I，停在 2/4/6 常是 ii/vi）。",
    pro:"Key & harmony perception = 抓主音、调式、低音根音与和弦功能，常靠 bass line 与 cadence（终止式）定位；是 relative pitch 训练的高阶应用。",
    realWork:"驻唱、司琴、KTV 键盘手天天做；扒带第一步也是定调。",
    application:"先听贝斯根音定调，再听旋律骨干音落在哪个和弦（1/3/5 是 I，2/4/6 常是 vi/ii）。不确定就试弹根音，看是否‘对’。",
    practice:"放一首熟悉歌，只写前 4 小节每小节的根音，再试着配和弦；再放一首陌生歌，用钢琴找它的主音（弹一下听是否‘回家’）。" },
  "ac-follow":{ simple:"跟随歌手是你的弹法要服务人声：它快你跟、它换气你留白、它跑调你兜住。好的伴奏者是‘隐形的’——听众注意的是歌手，不是你。这比炫技难，因为它要求你时刻监听并调整。",
    pro:"Following = 实时监听人声的音高/呼吸/速度，动态调整 voicing、节奏与能量；本质是‘以人声为中心’的 comping。",
    realWork:"现场驻唱、音乐剧排练、婚礼演出都靠这个；好的伴奏能让业余歌手也唱得稳。",
    application:"弹得轻一点、空一点，把中高频留给嗓音；歌手延长音时你加 fill，别抢拍。速度上跟着歌手走，她慢你也慢。",
    practice:"跟一段人声录音伴奏，刻意在前两拍留白、只在句尾补和弦，体会‘托’而不是‘压’；再试在她长音时加一个琶音 fill。" },
  "ac-emerg":{ simple:"突发情况是歌手提前进、忘词、升调、突然停。好伴奏要能兜住：提前进入、延长、停顿、变速、临时升调。演出翻车绝大多数发生在这些‘意外’，练好应对就能救场。",
    pro:"Emergency handling = 预设应对策略（提前一小节、loop 最后两小节、cue 手势、transpose on the fly），靠经验与监听而非慌乱。",
    realWork:"婚礼、现场演出最常翻车的地方；职业伴奏者的价值很大程度体现在救场上。",
    application:"提前想好：如果她忘词，我就 loop 最后两小节；随身记住原调可整体移高或移低半音的方法（全曲 transposition）。保持冷静，跟着人声走。",
    practice:"让同伴故意在某句忘词或停，你练习用‘循环最后两小节’把它接住，直到自然；再练一次整曲临时升半音（所有和弦根音 +1）。" },

  /* ---- 作曲 ---- */
  "co-motif":{ simple:"动机（motif）是最短的有性格的乐思（2–4 个音）；乐句（phrase）就是动机长成的一句话。先有动机，歌才不会散——整首歌都从它变出来，听众才有记忆点。贝多芬第五交响曲开头那‘噔噔噔—噔’就是动机的极致。",
    pro:"Motif & phrase = 核心音型与其句法展开；乐句常 2/4 小节，有明确的呼吸（phrase ending，常停在弱拍或属和弦）。动机是统一全曲的‘基因’。",
    realWork:"贝多芬第五命运动机就是 3 个音；几乎所有名曲都有一个可被记住的核心动机。",
    application:"写歌先写一句 4 小节的钩子，确保它好记；后面段落都从它变出来（移位、变节奏、倒影）。别一上来就写一大片，先抓那一句。",
    practice:"写 4 个音的动机，发展成一个 8 小节乐句（重复加移位一次），录下来听是否像‘一句话’；再试把动机倒过来（逆行）做对比。" },
  "co-dev":{ simple:"发展是把动机‘换衣服’：变节奏、移位、倒影、加音、拆开，让材料既统一又推进。很多初学者的问题是一直写‘新东西’，结果歌散；高手是‘榨干旧材料’——同一个动机做出 10 种样子。",
    pro:"Development = 动机的变形技术（sequence 模进、inversion 倒影、augmentation 放大、fragmentation 拆碎）构建张力与统一。奏鸣曲展开部核心就是发展。",
    realWork:"奏鸣曲展开部、变奏曲、许多EDM的build都是发展技术的体现。",
    application:"同一动机先做上行移位推进，再用留白加长音制造落差；别总写新东西，先榨干旧材料。发展的本质是‘熟悉中有变化’。",
    practice:"拿上一条动机，做 4 种变体（移位/倒影/变节奏/加音），各 2 小节连成一段；听完判断哪种变体最适合放在‘高潮前’。" },
  "co-form":{ simple:"曲式是歌的骨架：主歌–副歌–桥段怎么排。结构清楚，听众才跟得上、才记得住。流行歌最常用的就是 Verse–Chorus–Bridge：主歌低能量铺垫、副歌释放、桥段用新和弦或转调把能量再推一层。",
    pro:"Form = 段落组织（verse/chorus/bridge/intro/outro），靠重复与对比管理注意力与能量；常见结构 ABABCB、AA'B 等。",
    realWork:"绝大多数流行歌是 Verse–Chorus–Bridge；古典有奏鸣曲式、变奏曲式、回旋曲式。",
    application:"先用‘主歌低能量铺垫、副歌释放’的默认结构写；桥段用新和弦或转调把能量再推一层。写之前先画段落图，比边写边想高效。",
    practice:"把一个动机排成 A（主歌）–B（副歌）–A–桥–B 的结构草图，只写和弦与 1 个动机；再检查每次能量变化是否发生在‘进入副歌/桥’时。" },
  "co-emotion":{ simple:"情绪与叙事是你想让听众经历什么：从哪里紧张、哪里释放。音乐是讲故事，不只是堆音符。专业作曲/配乐的核心能力，就是设计一条‘张力曲线’——用音域、和声复杂度、配器密度、节奏来制造听觉旅程。",
    pro:"Emotion & narrative = 用张力曲线（能量/音域/配器/和声复杂度）设计听觉旅程；电影配乐、概念专辑都在做叙事弧线。",
    realWork:"电影配乐、广告歌、概念专辑都建立在情绪叙事上；一段好的配乐能让你‘看见画面’。",
    application:"先画一条能量曲线：哪里起、哪里落、哪里爆发；再让和声与配器跟着这条线走。比如前 4 小节稀疏低音铺垫孤独，后 4 小节加和声与上行旋律到坚定。",
    practice:"选一种情绪（如从孤独到坚定），写 8 小节：前 4 小节稀疏低音、后 4 小节加和声与上行旋律；再换一种情绪（愤怒→平静）重做。" },

  /* ---- 编曲 ---- */
  "ar-mel":{ simple:"编曲第一步是先确定旋律线和支撑它的和声骨架，其它乐器都围着它长。很多新手一上来就加一堆音色，结果糊成一团——因为没先锁定‘主角是谁’。编曲的本质是‘为已有的歌安排声部’，不是重新作曲。",
    pro:"Melody & harmony framework = 锁定 lead 与 chord progression，作为所有声部的坐标；任何编曲都从 demo 的旋律加和弦开始。",
    realWork:"任何编曲都从 demo 的旋律加和弦开始；remix、改编也是先抓原曲骨架。",
    application:"拿到旋律先写最简和声（每 1–2 小节一个和弦），确认走向再分配乐器。旋律音要落在和弦音上（或经过音），否则会‘打架’。",
    practice:"给定一条 4 小节旋律，写出它的基础和声（标注每小节和弦），再检查旋律音是否落在和弦音上；把打架的音改成经过音或换和弦。" },
  "ar-groove":{ simple:"Groove 是让人想动的律动。它来自鼓、贝斯、节奏乐器的‘咬合’，而不是音符多。很多编曲‘不好听’其实是因为律动不对——鼓和贝斯的对话没做好，再加多少和声也白搭。",
    pro:"Groove = 节奏层的微观时值（swing、ghost note、syncopation）与声部分工产生的身体感；是 funk、hip-hop、latin 的灵魂。",
    realWork:"funk、hip-hop、latin 都靠 groove 吃饭；同一套和弦，groove 不同就是不同歌。",
    application:"编曲时先把鼓加贝斯的对位做对（syncopation 落在哪、ghost note 在哪），再加旋律；律动不对，再多和声也白搭。贝斯跟底鼓，旋律跟军鼓的反拍。",
    practice:"只用底鼓加军鼓加贝斯写一个 4 小节 groove，循环听，确认身体会想点脚；再试着把贝斯从‘跟拍’改成‘反拍切分’听区别。" },
  "ar-texture":{ simple:"织体（texture）是声音怎么织在一起（厚/薄、密/疏）。配器决策就是‘这里该谁出声、为什么’。留白往往比堆满更高级：副歌让弦乐进、主歌只留钢琴加人声，对比就出来了。",
    pro:"Texture & orchestration = 决定声部分层（节奏/和声/旋律/铺底）与音色分配，管理频谱与能量；是编曲的‘空间艺术’。",
    realWork:"留白往往比堆满更高级：副歌让弦乐进，主歌只留钢琴加人声；很多大师编曲靠‘抽走’而非‘加上’。",
    application:"问自己‘加这个乐器解决了什么’；副歌让弦乐进，主歌只留钢琴加人声。频率上别让所有声部挤中频，高/中/低分工。",
    practice:"同一段和声，分别做极简（钢琴加人声）和饱满（加鼓加弦加合成）两版，对比能量差别；再试‘副歌比主歌多一层’的留白法。" },
  "ar-versions":{ simple:"同一旋律多种版本是把一首旋律分别编成不插电、电子、弦乐四重奏、Lo-fi 等，训练编曲想象力。它是检验你‘编曲能力’而非‘作曲能力’的最好练习——素材相同，比的是你怎么重新诠释。",
    pro:"One melody many arrangements = 同一素材在不同风格/编制下的再诠释，检验编曲而非作曲能力；remix、改编都建立在此。",
    realWork:"改编、remix、同一主题的不同编曲版本（如《生日快乐》的无数编法）都是它。",
    application:"拿一段旋律，先去掉所有伴奏只留人声，再逐步加风格化元素（每种版本换一套音色与节奏）。重点是‘换语境’而非‘换音符’。",
    practice:"选一首熟歌旋律，做 3 个版本：钢琴独奏、电子 beat、弦乐垫，各 8 小节；对比哪个版本最贴合该旋律的‘性格’。" },

  /* ---- DAW / 制作 ---- */
  "dw-setup":{ simple:"DAW 第一步是建工程、设 tempo/调号、建 MIDI 轨并画音符。关键概念：MIDI 是‘谱面’不是‘声音’——它记录的是音高和时值，真正出声靠插件（合成器/采样）。把工程管理好（分层、命名）能省下后面无数麻烦。",
    pro:"Project setup = 工程组织（tracks、tempo、key、routing）、MIDI 编辑（音符/力度/quantize）；是一切电脑音乐制作的地基。",
    realWork:"任何电脑音乐制作都从这开始；专业工程会把鼓/贝斯/和弦/旋律/人声分轨命名清楚。",
    application:"建轨时按鼓/贝斯/和弦/旋律/人声分层，命名清楚；先定 tempo 再录音，避免事后拉伸破坏音质。用颜色区分声部。",
    practice:"新建工程，设 120 BPM、C 大调，建 4 条 MIDI 轨（鼓/贝斯/和弦/旋律）并各写 1 小节；再试给每轨设不同颜色和轨道颜色。" },
  "dw-edit":{ simple:"编辑是把弹错、弹歪的音修好。量化（quantize）把节奏对齐网格，力度（velocity）让强弱有表情。但量化别开到 100%——那会机械得像机器人；留 5–10% 的‘人性化’偏移，听起来才活。",
    pro:"Editing = quantize（对齐）、velocity（力度曲线）、legato/overlap 修正，使演奏更紧更有生命；是现代制作的必经步骤。",
    realWork:"现代制作几乎 100% 经过编辑；你听到的‘完美’现场录音也常经过后期修正。",
    application:"量化别开到 100%（会机械），留 5–10% 人性化；力度按旋律重音调（重拍强、弱拍弱），别全 100。用 swing 让律动更自然。",
    practice:"录一段乱的 MIDI 旋律，先量化到 90%，再手调几个关键音的力度，对比‘死板’和‘活’；再试加一点 swing 听律动变化。" },
  "dw-mix":{ simple:"混音是把多层音轨调成清楚又好听：各就各位（频率）、各占空间（声像）、有主有次（音量）。它的目标是让每个声音都听得清、又融合成整体。很多人‘写得好听但混得糊’，就是卡在这一步。",
    pro:"Mixing = 平衡（level）、pan、EQ（频率分离）、compression（动态）、reverb（空间），服务于歌曲而非炫技。",
    realWork:"成品歌的必经步骤；同一段编曲，混音不同就是不同成品。",
    application:"先调音量平衡（人声最上），再用 EQ 削掉互相打架的频率（如人声和吉他抢中频），用一点点压缩让节奏更稳。别一上来就加一堆插件。",
    practice:"拿一段 4 轨 demo，先只调音量让各声部都听得清，再加一个总体混响，听空间感；再试着用 EQ 把人声从吉他里‘挖’出来。" },
  "dw-master":{ simple:"母带是最后一层抛光：让整首歌响度够、各处音量一致、能在耳机和车载都好听，然后导出。它要‘轻手’——常用限制器把峰值压住、整体提响，但别压爆（留 -1 dBTP 余量）。母带不是‘再混一次’，而是‘统一与提响’。",
    pro:"Mastering = 整体 EQ、多段压缩、限制器提升响度、校验立体声宽度，输出发行格式；是发行前的最后一步。",
    realWork:"发行前的最后一步；流媒体平台对响度有标准（如 -14 LUFS）。",
    application:"母带要轻：常用限制器把峰值压住、整体提响，但别压爆（留 -1 dBTP）。先用参考曲对比响度，再决定提多少。",
    practice:"导出你的小样为 WAV，用限制器把整体音量提到接近但不超过 0 dB，听不同设备（耳机/外放）上的统一感；对比参考曲的响度。" },

  /* ---- 配器 ---- */
  "or-string":{ simple:"弦乐组是小提琴/中提/大提/低音提琴。它音域宽、最‘人声化’，能同时做旋律、和声铺底和节奏。写法上常用分部（divisi）、连弓（legato）、颤音（tremolo）。电影配乐 80% 靠弦乐铺情绪，因为它是‘会呼吸的’音色。",
    pro:"Strings = 分声部（vl1/vl2/va/vc/cb）、弓法（连/跳/顿）、divisi 与 tremolo，频谱连续可塑；是所有配器里最灵活的一组。",
    realWork:"电影配乐 80% 靠弦乐铺情绪；从《星球大战》到独立短片都如此。",
    application:"写弦乐 pad 时让中提/大提走和弦内声部，小提琴奏旋律；避免所有声部同节奏齐奏到底（会很‘块’）。用 tremolo 加紧张，用 pizzicato 加轻巧。",
    practice:"写一个 C–G–Am–F 的弦乐 pad：vl1 旋律、vl2 三音、va 五音、vc 根音，听‘厚’的感觉；再试把 vl1 改成 tremolo 听紧张度变化。" },
  "or-wood":{ simple:"木管（长笛/双簧/单簧/大管）音色通透、有呼吸感，常用作色彩独奏或柔和填充。它不像弦乐那样‘铺满’，而像‘会说话的声部’——适合给一段旋律加灵气或童话感。注意它有换气限制，别写太长不换气。",
    pro:"Woodwinds = 各自音域与换气限制；适合旋律对位、柔和 inner voice 与色彩点缀；是古典与动画配乐的‘表情组’。",
    realWork:"古典交响、动画配乐爱用木管做‘会说话的声部’；《彼得与狼》每个角色配一种木管。",
    application:"想加一点灵气或童话感时让长笛奏高音旋律，单簧管补中音；注意换气记号别写太长（一般 4–8 拍一换气）。",
    practice:"在一段和声上，让长笛奏一条轻快高音旋律（不超过其换气极限），听木管的‘空气感’；再试双簧管奏中音承接。" },
  "or-brass":{ simple:"铜管（小号/圆号/长号/大号）有力量、能‘喊’。适合高潮、号角、推进，但别一直响——会累且刺耳。圆号偏柔和，常做暖色内声部；小号/长号留给爆发点。史诗、胜利、进行曲都靠它。",
    pro:"Brass = 强力度与辉煌音色，需考虑嘴唇负荷与和声填充；圆号偏柔和可内声部，小号/长号适合旋律与号角。",
    realWork:"史诗/胜利/进行曲的核心；游戏 Boss 战、电影高潮都靠铜管引爆。",
    application:"把铜管留给爆发点：副歌高潮或转场；平时用圆号做暖色内声部即可。写号角长音时让小号在上、长号在中、大号在根音。",
    practice:"在副歌段写小号加长号的和弦长音作为号角，主歌则去掉，对比能量；再试铜管做‘渐强上行’引爆结尾。" },
  "or-energy":{ simple:"能量曲线是整首曲子从安静到宏大的配器进入顺序。设计好它，听众才会被带着走。经典做法是‘逐步叠加’：先钢琴，再加弦乐，再加打击，最后铜管引爆；回落时反向抽离。trailer 音乐、电影配乐靠它制造‘渐强到爆’。",
    pro:"Energy curve = 用配器/织体/音域/密度的逐步叠加或抽离管理动态弧线；是配乐叙事的工程化表达。",
    realWork:"trailer 音乐、电影配乐靠它制造渐强到爆；很多‘燃’的片段本质是能量曲线设计。",
    application:"别一上来全编制；先钢琴，加弦乐，加打击，最后铜管引爆；回落时反向抽离。写之前先画能量曲线，再决定每段加/减什么。",
    practice:"写一个 16 小节的渐强：每 4 小节加一层乐器（钢琴→弦→鼓→铜管），再写 8 小节渐弱（反向抽离）；听‘被带着走’的感觉。" },

  /* ---- 练耳 ---- */
  "ear-int":{ simple:"音程听辨是听两个音距离多远：纯五度空、大三度亮、小二度挤。它是所有听觉训练的基础——能把音程听准，你才能扒谱、移调、跟弹。方法是给每个音程找一首‘提示歌’（如小星星开头是大二度），听到就能反应。",
    pro:"Interval training = 建立音程到参考曲（如小星星=大二度、星球大战=纯五度）的联想，训练相对音感与快速反应。",
    realWork:"扒谱、移调、即兴、视唱练耳考试全都靠它；职业乐手的‘耳朵’底层就是音程。",
    application:"给每个音程找一首提示歌（纯五度=星球大战，大三度=生日快乐前两句），听到就能反应。练耳时先分辨‘协和/不协和’再细分类别。",
    practice:"用软件或键盘随机播两个音，你猜音程并匹配提示歌，每天 10 题；再升级为‘唱出音程’——听到后立刻唱出来。" },
  "ear-chord":{ simple:"和弦听辨是听出大/小/属七/挂留等色彩。大三亮、小三暗、属七紧张、maj7 梦幻。它是伴奏、扒带、和声分析的必备——你得像认颜色一样认和弦。方法是先抓第三音决定大小，再抓第七音决定是否有属七/maj7。",
    pro:"Chord quality ID = 听辨三和弦属性、七和弦类型与 added/sus 色彩，依赖三音（大小）与七音（是否属七/maj7）的听感标签。",
    realWork:"伴奏、扒带、和声分析必备；很多爵士乐手能‘听一个和弦就知道怎么配’。",
    application:"先抓第三音决定大小，再抓第七音决定是否有属七/maj7；多听对比建立标签（如 sus4 的‘悬’、add9 的‘光泽’）。从三和弦开始，再到七和弦。",
    practice:"随机播大三/小三/属七/maj7，你只报‘大小’加‘是否属七’，连续 10 题；再升级为听出 sus4 与 add9。" },
  "ear-prog":{ simple:"进行听辨是听出这段往哪走：是不是 I–V–vi–IV，哪里是终止，哪里离调了。它是‘和声语法直觉’——扒整首歌、现场跟弹都靠它。方法上先听 bass 根音走向定和弦，再听终止式判断是否收束。",
    pro:"Progression ID = 听辨功能进行与 cadence、副属/借用等色彩变化，建立和声语法直觉；是相对高级的练耳。",
    realWork:"扒整首歌和声、现场跟弹都靠它；能听进行，你就能‘跟着弹’而不用看谱。",
    application:"听 bass 根音走向定和弦，听终止式判断是否收束；先练最通用的 4 个进行（I–V–vi–IV / vi–IV–I–V / ii–V–I / I–♭VII–♭VI–V）。再练听出离调。",
    practice:"随机播 I–V–vi–IV / I–vi–IV–V / ii–V–I / I–♭VII–♭VI–V，你说出是哪一个；再升级为‘边听边在键盘上跟弹根音’。" },
  "ear-mode":{ simple:"调式判断是听一段音阶或旋律，分辨它属于哪种调式：自然大/小调、和声小调、七种教会调式（多利亚、弗里几亚……），还是中国五声/日本都节等民族调式。同一组音、不同主音，色彩就不同——这是音乐学院视唱练耳里‘调式听辨’的核心。方法是先抓主音，再听三级/六级/七级这几个‘色彩音’决定了明暗与异域感。",
    pro:"Mode ID = 听辨主音与调式色彩音（三级大小、六级、七级升降）确定调式；涵盖大小调、教会调式与民族调式（五声/都节），是相对音感的高阶应用。",
    realWork:"扒带时判断一首歌是‘小调还是多利亚’、配器时选对调式决定整体氛围；中国/日本/中东风格辨识都靠它。",
    application:"先确定主音（最常出现、最稳定的音），再看色彩音：三级是大=大调感、三级是小=小调感；六级大=多利亚、二级半音=弗里几亚、七级降=混合利底亚；无导音且级进柔和=五声。",
    practice:"随机播一段音阶，你说出它属于哪种调式（大调 / 小调 / 和声小调 / 多利亚 / 弗里几亚 / 利底亚 / 混合利底亚 / 五声宫 / 五声羽 / 都节），连续 10 题；再升级为听‘旋律片段’判断调式。" },

  /* ---- 音乐分析 ---- */
  "an-deconstruct":{ simple:"拆解是把一首作品拆开看零件：结构、调性、和声、旋律、节奏、编曲、声音、表达各一层。它的高级版是 REBUILD——拆解完自己用同样的‘配方’重做一版。这是向大师学习最高效的方法：不是抄，而是理解‘它为什么好’。",
    pro:"Deconstruction = 多维度分析（形式/调性/和声/旋律/节奏/编曲/混音/表达）并 REBUILD 重做一版；是学习大师的核心方法。",
    realWork:"扒带、remake、学习大师都靠拆解；很多制作人的‘风格’来自拆解别人再内化。",
    application:"选一首你爱的歌，逐层记：intro 用什么音色、副歌怎么提能量、bridge 怎么离调。然后自己 REBUILD 一版，用你的音色走同样的‘配方’。",
    practice:"选一首 8 小节段落，写出它的和弦加旋律加配器，再用你的音色 REBUILD 一遍，对比学到了什么；重点问‘它哪一步让我想循环’。" },
  "an-form":{ simple:"曲式分析是看一首歌怎么分段、怎么重复、怎么对比。常见的主歌/副歌/桥怎么排。它是‘理解音乐结构’的底层能力——你写歌时用它规划，听歌时用它欣赏。核心是找‘相同与不同’：哪些段重复、哪些段对比。",
    pro:"Formal analysis = 标定段落（A/B/C）、重复与对比、调性布局与能量管理；是研究任何一首歌结构的第一步。",
    realWork:"研究任何一首歌的结构都先做这个；音乐学、作曲分析都建立在曲式上。",
    application:"听歌时随手标 A/B，找出副歌比主歌高了什么（通常更高、更密、配器更多）；写歌时反过来用：先画段落图再填内容。",
    practice:"选一首流行歌，画出它的段落图（A–B–A–C–B），标出每次能量变化发生在哪；再对比两首不同歌的曲式差异。" },
  "an-harm":{ simple:"和声分析是给每个和弦标罗马数字（I ii V），看它们怎么制造紧张与解决。它让你从‘听到和声’升级到‘读懂和声’。方法是拿到谱先标级数，找出不寻常的那一个和弦（常为副属/借用），它就是情绪转折点。",
    pro:"Harmonic analysis = 功能标号（tonic/subdominant/dominant）、离调/转调、voice leading 评估；是扒带、改编、考试的必备技能。",
    realWork:"扒带、改编、和声考试必备；分析一首歌的‘转折点’几乎都落在非 diatonic 和弦。",
    application:"拿到谱先标级数，找出不寻常的那一个和弦（常为副属/借用），它就是情绪转折点。写歌时也可以用‘突然的借用和弦’做转折。",
    practice:"给一段 8 小节和声标罗马数字，圈出所有非 diatonic 的和弦并说明它干了什么（如 V/V 制造离调推力）；再听一遍验证。" },

  /* ---- 古典 ---- */
  "cl-baroque":{ simple:"巴洛克（1600–1750）是复调的时代：很多条旋律同时跑、互相模仿，加上通奏低音（数字低音）和大量装饰音。代表是巴赫。它的美在于‘理性而精密’——像建筑。想写巴洛克风，用 imitation（模仿）和清晰对位，避免浪漫派的大块和声。",
    pro:"Baroque = 通奏低音（figured bass）、对位（counterpoint）、舞曲组曲与数字低音织体；强调线条的独立与模仿。",
    realWork:"巴赫《平均律》、维瓦尔第《四季》是范本；许多教材用巴赫练‘多声部思维’。",
    application:"写巴洛克风：用 imitation（第二声部晚 1 小节重复第一声部）、持续低音、清晰对位，避免浪漫派的大块和声与自由速度。",
    practice:"写 4 小节二声部模仿（第二声部晚 1 小节重复第一声部），体会对位；再试加一个通奏低音声部。" },
  "cl-classic":{ simple:"古典主义（1750–1820）是清爽的旋律加清晰的主调织体加奏鸣曲式。莫扎特、海顿是代表，‘平衡’是关键词——对称、克制、优雅。和巴洛克比，它更‘歌唱’；和浪漫比，它更‘理性’。写古典风就是给一个好记的旋律配清楚的终止。",
    pro:"Classical = 主调为主、奏鸣曲式（呈示–展开–再现）、明确终止式与动态对比；强调平衡与清晰。",
    realWork:"莫扎特钢琴奏鸣曲、海顿交响曲；所有古典奏鸣曲的模板。",
    application:"写古典风：给一个好记的旋律，配清楚的 I–V–I 终止，结构对称（4+4 乐句）。用阿尔贝蒂低音让左手流动。",
    practice:"写 8 小节古典乐句：4 小节问（停在 V）、4 小节答（回到 I），旋律对称；再试加一个阿尔贝蒂低音。" },
  "cl-rom":{ simple:"浪漫主义（1820–1900）是更浓的情绪、更自由的和声（半音、远关系转调）、更厚的织体。肖邦、李斯特是代表。它的美在于‘个人情感的极致表达’——速度自由（rubato）、和声大胆。想要深情或戏剧时，它是首选参考。",
    pro:"Romantic = 半音化、装饰和弦、远关系转调、标题音乐与个体情感表达；织体更厚、动态更极端。",
    realWork:"肖邦夜曲、柴可夫斯基；许多电影抒情段都借浪漫派语汇。",
    application:"想要深情或戏剧时，用大量下属/属的延伸、突然的转调、自由的速度（rubato）。左手用分散和弦（如肖邦式）制造流动。",
    practice:"写 8 小节浪漫片段：用一个突然的远关系转调加左手分散和弦，体会情绪拉满；再试加 rubato（某些音故意拖长）。" },
  "cl-imp":{ simple:"印象主义（德彪西等）不强调功能和声，多用全音阶、平行和弦、模糊色彩，像‘声音的画’。它故意避免 V–I 的强终止，追求朦胧、光影、水波感。想制造‘氛围’而非‘解决’时，它是宝库。",
    pro:"Impressionism = 全音阶（whole-tone）、平行进行（planing）、九和弦/挂留、避免 V–I 强终止；追求色彩与光影而非功能。",
    realWork:"德彪西《月光》《大海》；许多氛围电子、游戏水景音乐受其影响。",
    application:"想制造朦胧或水波感，用全音阶和平行九和弦，故意不解决。平行和弦（同一 shape 整体移动）是它的标志性手法。",
    practice:"用全音阶（C D E F# G# A#）写 4 小节平行和弦进行，避免任何 V–I 终止；再试加一个持续低音制造‘悬’。" },

  /* ---- 爵士 ---- */
  "jz-blues":{ simple:"Blues 是 12 小节固定框架加小调五声/蓝调音（加 ♭5）。它是爵士与摇滚的根——情绪直接、能即兴。12 小节的和声很简单（I–I–I–I, IV–IV, V–V–I–I），但蓝调音给了它那种‘又痛又酷’的味道。练即兴从 12 小节 blues 起最稳。",
    pro:"Blues = 12-bar form、blues scale（小调五声加 ♭5）、shuffle 节奏与 call-response；是爵士、摇滚、R&B 的共同地基。",
    realWork:"几乎所有早期爵士、摇滚、节奏布鲁斯都 built on it；从 Robert Johnson 到 Hendrix 都扎根 blues。",
    application:"练即兴从 12 小节 blues 起：先背句型，再在蓝调音上自由发挥。shuffle 节奏（三连音感）是它的灵魂，别弹成直八分。",
    practice:"跟一段 12 小节 blues 伴奏，每小节弹 2 拍回应句，连续 3 遍；再试把回应句从‘跟和弦音’改成‘加蓝调音 ♭5’。" },
  "jz-iivi":{ simple:"II–V–I 是爵士最常用进行：ii（小七）→V（属七）→I（大七）。它是‘回家的爵士说法’，比单纯的 V–I 更丰富、更有推动力。几乎所有爵士标准曲的骨架都是它，而且可以在任意调上转调使用。",
    pro:"ii-V-I = 最自然的功能解决链（ii 的下属感 → V 的属感 → I 的 tonic），常配延伸音与替代（三全音 sub）在任意调上转调。",
    realWork:"绝大多数爵士标准曲（如《Autumn Leaves》《All The Things You Are》）的骨架。",
    application:"在任何调上先练顺 ii-V-I，再给每个和弦加 9/13 音，最后尝试三全音替代 V。转调时整套 ii-V-I 移到新调即可。",
    practice:"在 C、F、B♭ 三个调上各弹 4 小节 ii-V-I，逐步加延伸音；再试把 V 换成三全音替代（如 C 调的 G7→D♭7）。",
    audio:{type:"prog",chords:[{root:62,iv:[0,3,7,10]},{root:55,iv:[0,4,7,10]},{root:60,iv:[0,4,7,11]}],step:1.0,dur:0.9} },
  "jz-impro":{ simple:"爵士即兴是在 ii-V-I 上‘说话’：用音阶（对应每类和弦）、琶音、蓝调句，围绕和弦音装饰。它的精髓是‘和弦音阶对应’——每个和弦上选对的音阶（如 V7 用 Mixolydian 或 Lydian♭7），先琶音后加经过音。",
    pro:"Jazz improv = chord-scale 选用、琶音、side-slipping、节奏错位与 personal vocabulary；是爵士即兴的系统方法。",
    realWork:"任何爵士 solo；从 Louis Armstrong 到现代爵士都建立在这套语汇上。",
    application:"每个和弦上选对应音阶（如 V7 用 mixolydian/lydian♭7），先琶音后加经过音。练习时先‘慢而准’——每个音都想着它属于哪个和弦。",
    practice:"在一段 ii-V-I 上，先只弹和弦琶音（把和弦音连起来），再混进蓝调音与半音经过音做乐句；录下来对比‘准’和‘活’。" },

  /* ---- 流行 ---- */
  "pp-prog":{ simple:"流行进行是被反复使用的几套和弦走向（如 I–V–vi–IV、vi–IV–I–V）。它们的共同点是有‘情绪切换’——比如 I–V–vi–IV 在‘亮（I/V）’和‘暗（vi）’之间来回，所以好听、好唱、好记。理解它，你写歌就不会在和弦上卡太久。",
    pro:"Pop progressions = 基于 diatonic 循环与消极/积极情绪切换的少量高复用进行；是流行歌‘听起来耳熟’的根本原因。",
    realWork:"上千首热歌共享这几个进行（如 4-chord song 梗）；《Let It Be》《Someone Like You》都在此列。",
    application:"写歌先用一个流行进行打底，把创意放在旋律与编曲，而不是和弦多复杂。想‘暗’一点就用 vi 开头，想‘亮’就用 I 开头。",
    practice:"用 I–V–vi–IV 写一段 8 小节，换 3 种编曲（钢琴/电子/不插电）体会进行复用；再试把 vi 提前到开头听情绪反转。",
    audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:55,iv:[0,4,7]},{root:57,iv:[0,3,7]},{root:53,iv:[0,4,7]}],step:0.9,dur:0.85} },
  "pp-prod":{ simple:"流行制作是把一首歌做成‘电台能播’：清晰的人声、稳的鼓、简洁的和声 pad、干净的混音。它的美学是‘vocal-first’——其他所有声音都为人声让位。副歌加一层和声或 doubling 提能量，但别糊。",
    pro:"Pop production = vocal-first 混音、节奏组（鼓/贝斯）做 groove、克制使用合成与空间；追求干净、明亮、有记忆点。",
    realWork:"任何榜单热歌；从 Max Martin 到 K-pop 都遵循 vocal-first 逻辑。",
    application:"制作时把人声当主角（其他都让位）；副歌加一层和声或 doubling 提能量，但别糊。鼓贝斯做稳 groove，pad 只填空不抢。",
    practice:"拿一段人声加和弦 demo，做一版电台感混音：人声最上、鼓贝斯稳、加一点 pad；再试副歌叠加和声层听能量提升。" },

  /* ---- 影视 ---- */
  "fm-cue":{ simple:"Cue 是为画面写的一段配乐。写之前先看画面要什么情绪、什么节奏点，音乐去服务它——不是反过来。专业做法是对着时间码（picture）配乐，管理 hit point（音乐撞上画面的关键时刻）、mood 和 tempo。",
    pro:"Cue writing = 对着时间码（picture）配乐，管理 hit point、mood、tempo 与画面节奏对位；是电影/游戏/广告配乐的基本单位。",
    realWork:"电影/游戏/广告配乐的基本单位；一段 30 秒的 cue 可能改十几版才对画面。",
    application:"拿到画面先标情绪变化点和动作点（hit point），音乐在这些点给 accent，平时铺情绪。别让音乐盖过对白，除非刻意。",
    practice:"找一段 30 秒无声视频，写一段 cue：紧张处用低音脉冲，舒缓处用弦乐长音；再对着画面回放检查 hit point 是否对齐。" },
  "fm-leit":{ simple:"主题动机（Leitmotif）是给某个人物/地点/情感一个专属旋律，每次它出现音乐就提醒你。这是瓦格纳发明的叙事手法——用音乐建立‘记忆点’。电影配乐里几乎必有：主角有主题，反派有主题，爱情也有主题。",
    pro:"Leitmotif = 瓦格纳式的主导动机，通过变形在不同场景呼应，构建叙事记忆；是配乐叙事的核心技术。",
    realWork:"《星球大战》每个角色有主题；《指环王》《哈利波特》都用 leitmotif 建立情感记忆。",
    application:"给主角写一个 2–3 音动机，在关键场景用不同配器或调性‘变脸’重现，建立记忆点。变形（变调/变节奏/变配器）比原样重复更高级。",
    practice:"写一个角色的 3 音主题，分别在平静/危险/胜利三种情境下用不同音色与速度重现；对比哪种变形最‘认得出又不一样’。" },

  /* ---- 游戏 ---- */
  "gm-adapt":{ simple:"自适应音乐是游戏里跟着玩法变的音乐：战斗时紧张、探索时舒缓，切换要无缝。它不用‘单曲循环’，而是把音乐拆成层（stems/layers），按游戏状态实时混音或转段。这是游戏配乐和电影配乐最大的技术区别。",
    pro:"Adaptive music = 用 stems/layers 与状态机，按游戏事件实时混音/转段（crossfade、vertical/horizontal remix），而非单曲循环。",
    realWork:"《塞尔达》《最后的生还者》《Hades》等；好的自适应音乐玩家几乎注意不到‘换曲’。",
    application:"把一首曲子拆成鼓层/和声层/旋律层，按战斗/探索状态分别开关，过渡用 crossfade。设计状态机：进入战斗→加鼓层，脱离→抽离。",
    practice:"写一段 8 小节，拆成‘只有 pad’和‘加鼓加旋律’两版，用一个开关模拟探索↔战斗切换；再试加一个短 crossfade 让切换无缝。" },
  "gm-loop":{ simple:"无缝 Loop 是首尾能无限接上的音乐。游戏 BGM 常循环，接不上会‘咔哒’一下出戏。写 loop 的关键是让最后一小节的和弦自然引回第一小节，节拍对齐网格，尾音延到开头。",
    pro:"Seamless loop = 设计与弦/节拍在 loop 首尾自然衔接，常用相同 material 起止或 crossfade；是重复 BGM 的硬要求。",
    realWork:"所有重复 BGM；手机游戏、独立游戏背景乐几乎都是无缝 loop。",
    application:"写 loop 时让最后一小节的和弦引回第一小节，节拍对齐网格，尾音延到开头。导出后无缝播放检查‘接缝’是否在弱拍/气口。",
    practice:"写 8 小节循环，确保第 8 小节末尾的和弦能自然接第 1 小节，导出后无缝播放检查；再试在接缝处放一个镲片填充掩盖。" },

  /* ---- 音色 / 声音设计 ---- */
  "sd-synth":{ simple:"合成是用振荡器加滤波器加包络‘捏’出声音。改波形（sine/triangle/saw/square）、滤波（低通截止）、起音/衰减（ADSR）就能得到完全不同音色。它是电子、游戏、电影音效的基础——你不必采样，自己就能‘造’声音。",
    pro:"Synthesis = oscillator→filter→amp（ADSR）信号链；subtractive/FM/additive 等合成法；是声音设计的核心工具。",
    realWork:"电子、游戏、电影音效都靠它；从 Moog 到 Serum，合成器定义了现代音色。",
    application:"想要暖 pad 就用慢 attack 加低通滤波；想要 pluck 就用快 attack 加快 decay。先调波形，再调低通截止，最后调 ADSR 塑形。",
    practice:"在一个合成器上，把同一个振荡器分别设为 sine/triangle/saw，再调低通截止，对比音色；再做一个‘慢 attack 暖 pad’和一个‘快 pluck’。" },
  "sd-space":{ simple:"空间感是声音在什么‘房间’里。混响（reverb）让声音有远近/大小——太干像耳机贴耳，太湿像浴室回声。它是混音里塑造‘纵深’的关键：人声给一点大空间显空灵，节奏组通常少混响保‘近’。",
    pro:"Space/reverb = 用卷积/算法混响塑造距离、尺寸与融合；与 delay 配合做纵深；是混音空间感的核心。",
    realWork:"任何有氛围的音乐；从教堂混响到人声 plate reverb 都是空间设计。",
    application:"人声/独奏给一点大空间混响显远/空灵；节奏组通常少混响保近/清晰。用 pre-delay 把声音‘推开’又不糊。",
    practice:"同一段人声，分别加小房间和大教堂混响，对比距离感；再试‘人声大空间 + 鼓几乎干’的纵深组合。" },

  /* ---- 混音 ---- */
  "mx-balance":{ simple:"平衡是各轨的音量比例（谁在前）；声像（pan）是声音放左/中/右。两者决定声音舞台清不清楚。很多混音‘糊’不是因为插件，而是平衡没做好——主唱不够前、乐器全挤中间。先调平衡，再谈别的。",
    pro:"Balance & pan = 建立清晰的层级（lead 最前）与立体声场分布，避免拥挤在中频；是混音的第一步也是最重要的一步。",
    realWork:"任何混音第一步；很多新手直接上 EQ/压缩，反而把简单问题复杂化。",
    application:"人声置中、贝斯置中、吉他与键盘分置左右、镲片稍偏，舞台就开了。先用推子把平衡调好，再上处理。",
    practice:"拿 4 轨 demo，先只调音量让主唱最清楚；再给乐器分配左右声像，听‘舞台打开’的感觉；再对比全置中的拥挤感。" },
  "mx-fx":{ simple:"EQ 削掉打架的频率；压缩把动态压平让节奏更稳；空间（reverb/delay）给纵深。三者是混音三宝。新手常犯的错是‘每个都加很多’——其实少量精准的 EQ + 一点压缩 + 恰当的混响就够。",
    pro:"EQ/comp/space = 频率分离、动态控制与空间塑造的组合技术；是成品混音的核心处理链。",
    realWork:"成品混音的核心处理链；同一段素材，这三件套用得好坏决定成品质量。",
    application:"人声用 EQ 削鼻音、压缩稳住、一点 delay 增宽；鼓用压缩提冲击。原则：先听问题在哪，再针对性处理，别‘全加上’。",
    practice:"选人声轨，做：①高通加削 3–5k 刺耳 ②轻压缩 ③加短 delay，三步对比变化；再试不加任何 FX 的‘干’版对比。" },

  /* ---- 母带 ---- */
  "ms-loud":{ simple:"响度是整首歌有多响/多满；宽度是立体声多宽。母带在最后平衡它们，让歌在哪都好听。关键是‘轻手’：用限制器把整体提到接近 0 但不爆（留 headroom），宽度别过头（低频通常保持单声道更稳）。",
    pro:"Loudness & width = 限制器提整体响度（留 headroom）、stereo widener/MS 处理控制宽度；是发行前最后一步。",
    realWork:"发行前的最后一步；流媒体平台对响度有参考标准（如 -14 LUFS）。",
    application:"用限制器把整体提到接近 0 但不爆；宽度别过头（会虚），低频通常保持单声道更稳。先用参考曲对比再决定提多少。",
    practice:"导出小样，用限制器统一响度，再轻量加宽高频，听不同设备上的统一感；对比‘过压缩’的泵浦感和‘适度’的区别。" },

  /* ---- 吉他 ---- */
  "gt-chord":{ simple:"吉他和弦是左手按、右手扫或拨。开放和弦（如 C、G、Am、D）是流行/民谣根基；扫弦节奏决定风格（朋克的下下上下、民谣的分解）。移调用 capo（变调夹）最方便。先练熟 8 个开放和弦，你就能弹唱无数歌。",
    pro:"Guitar chords = 开放性/封闭和弦、voicing 与 strum/pick 节奏型，驱动流行/民谣；封闭和弦（barre）可移调。",
    realWork:"无数 campfire/流行歌；从《Wonderwall》到《情非得已》都建立在开放和弦上。",
    application:"先练 8 个开放和弦（C G Am F D Em Dm E），再配常用扫弦型；移调用 capo。写歌时用吉他思维和弦进行更‘弹唱友好’。",
    practice:"用 C–G–Am–F 配 3 种扫弦（下下上上下上等），弹唱一遍；再试把其中一两个和弦换成封闭和弦练习移调。" },
  "gt-impro":{ simple:"吉他即兴是在和弦进行上跑音阶/琶音，常用五声与布鲁斯，靠推弦（bend）/滑音（slide）/揉弦（vibrato）出味道。和键盘即兴不同，吉他的‘语气’很大程度来自这些演奏技法而非音符本身。",
    pro:"Guitar improv = 五声/布鲁斯/调式音阶加 bends/slides/vibrato 等演奏技法塑句；是摇滚/蓝调 solo 的核心。",
    realWork:"摇滚/蓝调 solo；从 Clapton 到 SRV 都建立在五声 + 推弦上。",
    application:"在 12 小节 blues 上用小调五声，重点练乐句加推弦收尾而不是速度。一个‘有语气’的音胜过一串快音。",
    practice:"跟 blues 伴奏，用 A 小调五声做 4 小节 solo，每句结尾用推弦；再试加 slide 连接乐句。" },

  /* ---- 小提琴 ---- */
  "vl-bow":{ simple:"运弓是怎么拉（连/跳/顿）决定语气；揉弦（vibrato）是左手手指快速颤动让音‘变暖/有感情’。它是小提琴的表达核心——同一个音，直拉和揉弦听起来完全是两种情绪。长音一定要揉弦才‘活’。",
    pro:"Bow & vibrato = 弓法（legato/staccato/spiccato）与左手揉弦控制音色、表情与连贯；是小提琴表达的两大支柱。",
    realWork:"任何弦乐独奏；从帕格尼尼到电影独奏都靠运弓与揉弦塑句。",
    application:"想抒情就用慢连弓加揉弦；想轻巧用跳弓（spiccato）；长音一定要揉弦才不死。换弦时保持连弓不断。",
    practice:"拉一个长音，先无揉弦（直）再开揉弦，对比冷与暖；练习连弓换弦不断；再试跳弓的轻巧感。" },

  /* ---- 民族 ---- */
  "fk-mode":{ simple:"民族调式是中国七声/雅乐、日本都节、中东等非大小调的音阶，各有独特味道。比如中国五声（宫商角徵羽）没有导音，所以‘怎么弹都不撞’、有留白；日本都节含半音和增二度，带‘忧郁/异域’感；中东 Hijaz 带增二度很‘亮又野’。",
    pro:"Folk modes = 如中国七声调式（加清角/变宫）、日本都节（半音加增二度）、中东 Hijaz 等色彩音阶；是国风/和风/中东音乐的标识。",
    realWork:"国风、和风、中东音乐的标志；《彩云追月》《樱花》（日本）都建立在各自音阶上。",
    application:"想写中国风用五声加偶尔清角/变宫；想日本感用都节音阶（含半音）；想中东感用 Hijaz（含增二度）。音阶选对，味道就对了八成。",
    practice:"用中国五声加一个变宫（7）写 4 小节，再换成日本都节音阶写 4 小节，对比味道；再试在中东 Hijaz 上写一句听增二度的张力。",
    audio:{type:"seq",notes:[{m:60,d:0.3,gap:0.34},{m:62,d:0.3,gap:0.34},{m:64,d:0.3,gap:0.34},{m:67,d:0.3,gap:0.34},{m:69,d:0.5}]} },

  /* ---- 音乐史 ---- */
  "hi-era":{ simple:"音乐史不是背年代，而是理解每个时代‘为什么那样写’：技术（有什么乐器）、社会（音乐服务谁）、审美（什么算好听）共同推动。比如没有钢琴制造业的进步，就没有浪漫派的炫技。学史让你写复古风时‘用对声音’。",
    pro:"Eras & context = 把作品放回创作语境（乐器可用、社会功能、审美观），理解风格成因；是严肃学习音乐的底层框架。",
    realWork:"任何严肃学习音乐的底层框架；作曲/配乐/演奏都受益于‘懂时代’。",
    application:"写复古风之前，先弄清那个时代有什么乐器/什么禁忌，别用错声音（如给巴洛克加大编制铜管）。用时代语汇写，比‘现代套复古皮’更真。",
    practice:"选一个时代（如巴洛克），列出它能用的乐器与典型织体，再据此写 4 小节；再对比用现代音色弹同样素材的违和感。" },

  /* ---- 审美 ---- */
  "ae-judge":{ simple:"审美判断是训练‘什么是好、为什么好’的耳朵。它不是口味（我喜欢/不喜欢），而是能说出道理的判断力——用具体术语（织体/和声/动态/结构）而非感觉。它是制作/编曲/创作自我审查的核心能力。",
    pro:"Aesthetic judgement = 建立基于结构/创新/表达的评价框架，而非单纯喜好；是专业音乐人自我审查与决策的基础。",
    realWork:"制作/编曲/创作都需要自我审查；能判断‘哪里可以更好’比‘觉得不好’有用得多。",
    application:"听到一首歌先问它好在哪、哪里可以更好，用具体术语（织体/和声/动态）而非‘好听’。建立你自己的评价清单，写歌时自审。",
    practice:"选两首同风格歌，各写 3 条具体好或不好的理由，逼自己用音乐术语而非感觉；再交换立场，训练‘反向审美’。" },

  /* ---- 表达 ---- */
  "ex-param":{ simple:"把‘孤独/温柔/紧张’拆成可调的音乐参数：音域、速度、和声、节奏密度、留白、音色。情绪不是玄学，而是可调的变量。比如想表达紧张就加不协和加半音加密节奏；想空灵就高音区加大空间加开放五度。",
    pro:"Emotion→parameter = 建立情绪到音乐变量（register/tempo/harmony/density/space/timbre）的映射；是电影配乐、广告歌的核心方法。",
    realWork:"电影配乐、广告歌的核心方法；一段配乐‘对不对’本质是参数映射对不对。",
    application:"想表达紧张就加不协和加半音加密节奏；想空灵就高音区加大空间加开放五度。先列出情绪的 4 个参数，再写。",
    practice:"选一种情绪，列出 4 个要调的参数，再用这些参数写 4 小节并试听；再换情绪重做，对比参数变化如何改变‘感觉’。" },
  "ex-lab":{ simple:"表达实验室是给你一个情绪，让你当场调参数、试听、再改，把‘感觉’变成‘可操作的声音’。它的价值在于逼你校准：‘我以为的温柔’和‘实际听到的温柔’往往有差距，反复试听就能缩小这个差距。",
    pro:"Expression lab = 交互式把情绪拆解并实时试听不同参数组合，训练耳朵到参数的直觉；是本站‘我要这种感觉’板块的方法论。",
    realWork:"本站的‘我要这种感觉’板块就是它；很多配乐课程也用类似训练。",
    application:"拿到一个情绪词，先猜参数再试听，对比‘我以为’和‘实际听’的差距，反复校准。从极端参数开始（极慢/极密）更容易听清每个变量的作用。",
    practice:"给情绪‘温柔但孤独’，先自己定参数写一版，再听系统示例，比较两个版本的差异；再试着只改一个参数（如速度）听整体情绪如何变。" },

  /* ---- 风格 ---- */
  "st-lab":{ simple:"风格实验室是听→拆→分析→模仿→改造→融合。先学会‘像’，再长出自己的东西。很多新手一上来就想‘原创风格’，结果四不像；正确路径是先 1:1 模仿一种风格，理解它的语汇，再改造、再融合。",
    pro:"Style lab = 通过 transcribe/分析掌握某风格的语汇（节奏/和声/音色/结构），再改造与跨文化融合；是风格化创作的系统方法。",
    realWork:"所有风格化创作（lo-fi、city pop、国风电子）都这样来；制作人的‘风格’来自大量模仿后内化。",
    application:"选一种风格，先 1:1 模仿一首，再换音色/节奏做‘我的版本’，最后混入另一种风格。模仿时抓它的‘标志性元素’（如 city pop 的七和弦 + 放克贝斯）。",
    practice:"选 city pop，先扒一段和声与节奏，再把它改写成国风 city pop（换五声旋律）；对比原版和改造版的‘魂’还在不在。" },
  "st-fuse":{ simple:"风格融合是把两种风格‘焊’在一起：比如电子加民乐、爵士加嘻哈。关键是找到共同底座——通常是共享的律动（如四四拍舞曲）或调式，再把另一种风格的标志音色/音阶叠上去。生硬拼接会违和，找到底座才自然。",
    pro:"Fusion = 跨风格嫁接（如 jazz-funk、EDM+民乐），需识别可共用的律动/调式/结构；是现代主流流行的常态。",
    realWork:"现代主流流行的常态；从 Panjabi MC 到国风电子都建立在融合上。",
    application:"先确定底座（如四四拍舞曲律动），再把另一种风格的标志音色/音阶叠上去。比如国风电子：底座是 EDM 节拍，上面叠五声旋律与笛声。",
    practice:"用电子四四拍做底座，叠一段中国五声旋律与笛声，做 8 小节国风电子；再试爵士加嘻哈（swing 嗨哈 beats + 七和弦）。" },

  /* ---- 真实课程补 application/practice（这些 lesson 已有 phenomenon/concept，这里只补应用与练习提示） ---- */
  "triad":{ application:"任何歌曲的柱式和弦就是三和弦。先能在键盘上一眼看出一个和弦的 1/3/5，再练转位让低音更顺——比如 C 大三和弦的第一转位（E-G-C）让低音离下一个和弦更近。写歌时三和弦是 90% 进行的基础。",
    practice:"给一段简单旋律，用最基础的大/小三和弦为每个重拍配一个和声；再把这些和弦都弹成‘根音在最低音’和‘第一转位’两种，听低音线条的差异。" },
  "majmin":{ application:"想让段落‘亮/暗’切换，就互换大三/小三。副歌用大三提能量，桥段用小三制造低落或悬念。先听熟两者差别（大三的 3 音更‘开’，小三的 3 音更‘收’）再用于写作。",
    practice:"同一旋律分别配大调和小调和弦，听情绪变化；再试在主歌用小三、副歌用大三，体会‘暗→亮’的释放。" },
  "dom7":{ application:"任何‘想回家’的位置用属七。它含导音与下属音两个推力，解决到主和弦极自然。先练 G7→C 的解决手感（导音 B→C，F→E），再扩展到其他调与移调。",
    practice:"在终止处用 V7 替代 V，体会更强的解决推力；再在键盘上把 G7→C 连弹十遍，让手和耳都记住‘回家’的倾向。" },
  "secdom":{ application:"想让进行‘拐个弯’更有推动，插入 V/V（如 C 大调里的 D7，它解决到 G）。它在本调是临时出现的‘外地属和弦’，解决到 V 后就‘回归’。写歌副歌前用它制造离调推力很常用。",
    practice:"在 I–V–I 里插入 D7→G（即 C 大调的 V/V→V），听临时离调的推力；再试在一段进行中连续用两个副属和弦制造更长的‘绕路’。" },
  "cadence":{ application:"写歌时副歌前用半终止（停在 V，‘逗号’）吊胃口，段落结束用完全终止（V–I，‘句号’）。不同终止式决定音乐的‘标点’。想‘意犹未尽’就用半终止收句。",
    practice:"给一段旋律设计终止：哪里用半终止（停在属和弦）、哪里用完全终止（V–I）；再对比两种收尾带来的‘停’与‘不停’感。" },
  "fivescale":{ application:"写国风/游戏旋律直接用五声，怎么弹都不撞（没有导音和小二度碰撞）。先练在五声里即兴，再试着加一个变宫（7）制造色彩变化或‘现代国风’感。",
    practice:"用五声音阶即兴一段，再试着加一个变宫（7）制造色彩变化；再用五声写一条 4 小节旋律，检查是否‘怎么弹都和谐’。" }
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
  g.querySelectorAll(".km-domain").forEach(c=> c.onclick=()=>{ galaxySel=c.dataset.d; if(ML.bindMentor) ML.bindMentor(null); renderKnowledgeMap(body); });
  const list=$("km-lessons");
  const seen=new Set(); const uniq=mapFlatten().filter(id=>{ if(seen.has(id)) return false; seen.add(id); return true; })
    .map(id=>({id,l:D.LESSONS.find(x=>x.id===id)})).filter(o=>o.l);
  list.innerHTML = uniq.map(o=>{
    const l=resolveLesson(o.id);
    return `<div class="inst-card" data-lid="${o.id}" style="cursor:pointer">
      <div class="iem">${l.emoji}</div><div class="inm" style="font-size:14px">${l.title}</div>
      <div class="ild">${l.en}</div></div>`;
  }).join("");
  list.querySelectorAll(".inst-card[data-lid]").forEach(c=> c.onclick=()=>{ ML.bindMentor(c.dataset.lid); renderLesson(body,c.dataset.lid); });
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
  $("km-back").onclick=()=>{ galaxySel=null; if(ML.bindMentor) ML.bindMentor(null); renderKnowledgeMap(body); };
  body.querySelectorAll(".km-node[data-lid]").forEach(c=> c.onclick=()=>{ ML.bindMentor(c.dataset.lid); renderLesson(body,c.dataset.lid); });
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
  box.querySelectorAll(".event-opt").forEach(b=> b.onclick=()=>{ ML.bindMentor(b.dataset.id); renderLesson(body, b.dataset.id); });
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
  if(!hasDiag && !hasAudio){
    return `<div class="lab-note"><b>🎼 真实作品：</b>${l.concept? l.concept.realWork : ""}</div>
      <div class="lab-note" style="margin-top:10px">这个方向的完整音响示例正在持续整理。你可以先点下方的键盘自由探索，或向右栏 AI 导师提问获取例子。</div>`;
  }
  let btns=`<div class="mrow">`;
  if(hasAudio) btns+=`<button class="btn sm ghost" id="ex-play">▶ 听示例</button>`;
  if(hasDiag) btns+=`<button class="btn sm ghost" id="ex-score">🎼 看谱 / 键盘</button>`;
  btns+=`</div><div id="ex-extra"></div>
    <div class="lab-note" style="margin-top:10px"><b>🎼 真实作品：</b>${l.concept? l.concept.realWork : ""}</div>`;
  return btns;
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

/* ---------- 统一轻量课程页：知识讲解 → 音乐例 → 如何应用 → 实践 → AI 提问 → 完成 ---------- */
function renderLesson(body, id){
  const l = resolveLesson(id);
  if(!l){ ML.toast("课程不存在","⚠️"); return; }
  if(l.synthetic){ if(ML.bindMentor) ML.bindMentor(null); }
  else { mastery(id); if(ML.bindMentor) ML.bindMentor(id); }
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
      <div class="sec-tag">① 知识讲解</div>
      <h2>这个知识是什么？</h2>
      <div class="sub">简单、清楚地解释核心概念。</div>
      <div class="mrow">
        <button class="btn sm gold" id="cn-simple">简单解释</button>
        <button class="btn sm ghost" id="cn-pro">专业解释</button>
      </div>
      <div id="cn-text" class="lab-note" style="margin-top:12px">${l.concept.simple}</div>
    </div>
    <div class="panel">
      <div class="sec-tag">② 音乐例</div>
      <h2>听一听 / 看一看</h2>
      <div class="sub">给一个实际音乐例子，让你听或看。</div>
      ${l.phenomenon? phenomenonHTML(l) : exampleHTML(l)}
    </div>
    <div class="panel">
      <div class="sec-tag">③ 如何应用</div>
      <h2>在音乐里怎么用？</h2>
      <div class="sub">这个知识在钢琴、和声、即兴、伴奏、编曲、作曲等实践中如何落地。</div>
      <div id="app-text" class="lab-note" style="margin-top:12px">${appText||"（这个方向的应用正在补充，你也可以在右侧 AI 导师继续追问。）"}</div>
    </div>
    <div class="panel">
      <div class="sec-tag">④ 实践</div>
      <h2>亲自实践一下</h2>
      <div class="sub">弹一下、听一下、或分析一下，完成一个非常简单的小任务。</div>
      <div id="practice-box"></div>
    </div>
    <div class="panel">
      <div class="sec-tag">⑤ AI 提问</div>
      <h2>有疑问？直接问 AI</h2>
      <div class="sub">把不懂的地方告诉右侧 AI 导师，它会结合你现在的进度回答。</div>
      <div class="mrow">
        <input id="ask-in" placeholder="例如：为什么这个和弦听起来忧伤？" style="flex:1;background:#0d1424;border:1px solid var(--line);border-radius:10px;padding:10px;color:#e9e4d6"/>
        <button class="btn gold" id="ask-go">问 AI</button>
      </div>
      <div class="feedback" id="ask-fb"></div>
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

  // ④ AI 提问
  $("ask-go").onclick=()=>{ const t=($("ask-in").value||"").trim(); if(!t){ ML.toast("先输入你的问题","✍️"); return; }
    if(window.ML.mentorAsk) window.ML.mentorAsk(t);
    const fb=$("ask-fb"); fb.className="feedback show"; fb.innerHTML="✅ 已发送给 AI 导师（右侧），它正在结合你的进度回答。";
    $("ask-in").value=""; };
  $("ask-in").onkeydown = e=>{ if(e.key==="Enter") $("ask-go").click(); };

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
ML.__test = { resolveLesson, renderKnowledgeMap, renderDomainTree, renderLesson, DOMAINS };

/* learn.js 在 app.js 之后加载：若应用已进入主界面（老用户直接进入），
   此时进度函数刚挂载完成，刷新一次外壳以便正确计算「当前方向」，且不破坏首屏渲染。 */
if (window.__mlEntered) { try { window.ML.renderShell(); } catch(e){ console.warn("refresh shell after learn load:", e); } }

})();
