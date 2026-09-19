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

/* ---------- 播放引擎：真正的 transport（播放 / 暂停 / 继续 / 重播 / 停止） ---------- */
const RAF = (typeof window!=="undefined" && window.requestAnimationFrame)
  ? window.requestAnimationFrame.bind(window)
  : function(f){ return setTimeout(f, 40); };
const CAF = (typeof window!=="undefined" && window.cancelAnimationFrame)
  ? window.cancelAnimationFrame.bind(window) : clearTimeout;

const PLAYER = { id:null, track:"mix", playing:false, paused:false, t0:0, total:0, raf:null, tick:null };

function stopAllAudio(){
  try{ AE.stopAll(); }catch(e){}
  if(PLAYER.raf){ CAF(PLAYER.raf); PLAYER.raf=null; }
  PLAYER.playing=false; PLAYER.paused=false; PLAYER.id=null; PLAYER.track="mix";
}
function durOf(ev){ let mx=0; ev.forEach(e=>{ const d=(e.when||0)+(e.dur||0); if(d>mx) mx=d; }); return mx; }

function playEvents(id, ev, tick){
  stopAllAudio();
  AE.ensure();
  const ctx = AE.ctxOf();
  if(ctx.state==="suspended"){ try{ ctx.resume(); }catch(e){} }
  ev.forEach(e=>{
    if(e.kind==="kick"){
      AE.kick(e.when, {gain:e.gain, from:e.from, to:e.to, dur:e.dur});
    } else if(e.kind==="noise"){
      AE.noise(e.when, e.dur, {gain:e.gain, freq:e.freq, filter:e.filter, q:e.q});
    } else {
      AE.tone(e.m, e.dur, {when:e.when, type:e.type, gain:e.gain});
    }
  });
  PLAYER.id = id; PLAYER.playing = true; PLAYER.paused = false;
  PLAYER.t0 = ctx.currentTime; PLAYER.total = durOf(ev); PLAYER.tick = tick || null;
  const step = ()=>{
    if(!PLAYER.playing) return;
    let el = 0;
    try{ el = AE.ctxOf().currentTime - PLAYER.t0; }catch(e){ el = 0; }
    if(el < 0) el = 0;
    if(el > PLAYER.total) el = PLAYER.total;
    if(PLAYER.tick) PLAYER.tick(el, PLAYER.total);
    if(el >= PLAYER.total - 0.03){
      PLAYER.playing=false; PLAYER.raf=null;
      if(PLAYER.tick) PLAYER.tick(PLAYER.total, PLAYER.total);
      return;
    }
    PLAYER.raf = RAF(step);
  };
  PLAYER.raf = RAF(step);
}
function togglePause(id){
  if(PLAYER.id!==id) return false;
  const ctx = AE.ctxOf();
  if(PLAYER.paused){ try{ ctx.resume(); }catch(e){} PLAYER.paused=false; }
  else { try{ ctx.suspend(); }catch(e){} PLAYER.paused=true; }
  return PLAYER.paused;
}

/* ---------- 把一种风格渲染成分轨事件表 ----------
   which: drums | bass | harmony | melody | mix
   所有时间以「拍」为单位，最后统一乘秒长因此 tempo 变化时整体同步。 */
function styleEvents(s, which){
  const beat = 60/s.tempo;
  const ev = [];
  const reg = s.reg||0;
  const allow = t => (which==="mix" || which===t);
  const nb = s.chords.length;
  const REP = s.rep || 2;
  const BB = s.barBeats || 4;
  function note(m, b, d, type, gain){
    if(!isFinite(m) || !isFinite(b) || !isFinite(d)) return;
    ev.push({m:m, when:b*beat, dur:d*beat, type:type, gain:gain});
  }
  for(let rp=0; rp<REP; rp++){
    for(let bar=0; bar<nb; bar++){
      const c = s.chords[bar];
      const base = (rp*nb + bar) * BB;          /* 该小节第 0 拍，以拍为单位 */
      const up = (rp===1 && s.octUp) ? 12 : 0;

      /* ---- 和声层 ---- */
      if(allow("harmony") && s.harmony && s.harmony!=="none"){
        let iv = c.iv.slice();
        if(s.ext!=null && iv.indexOf(s.ext)<0) iv.push(s.ext);
        const hw = s.hWave||"triangle", hg = s.hGain!=null?s.hGain:0.40;
        if(s.harmony==="pad"){
          iv.forEach(k=> note(c.r+k+reg, base, BB*0.96, hw, hg));
        } else if(s.harmony==="long"){
          iv.forEach(k=> note(c.r+k+reg, base, BB*1.9, hw, hg));
        } else if(s.harmony==="arp"){
          const N = iv.length, step = BB/(N*2);
          for(let q=0; q<N*2; q++){
            const k = iv[q%N] + (q>=N?12:0);
            note(c.r+k+reg, base+q*step, step*0.92, hw, hg);
          }
        } else if(s.harmony==="stab"){
          const at = s.stabAt || [0,1,2,3];
          const sd = s.stabDur || 0.3;
          at.forEach(b=> iv.forEach(k=> note(c.r+k+reg, base+b, sd, hw, hg)));
        } else if(s.harmony==="strum"){
          iv.forEach((k,j)=> note(c.r+k+reg, base+j*0.05, BB*0.55, hw, hg));
          if(s.strumBack){
            iv.slice().reverse().forEach((k,j)=> note(c.r+k+reg, base+2+j*0.05, BB*0.30, hw, hg*0.75));
          }
        }
      }

      /* ---- 贝斯层 ---- */
      if(allow("bass") && s.bass && s.bass[bar]){
        const bw = s.bWave||"sine", bg = s.bGain!=null?s.bGain:0.62;
        s.bass[bar].forEach(n=> note(n[1], base+n[0], n[2], bw, bg));
      }

      /* ---- 旋律层 ---- */
      if(allow("melody") && s.melody && s.melody[bar]){
        const mw = s.mWave||"triangle", mg = s.mGain!=null?s.mGain:0.55;
        s.melody[bar].forEach(n=> note(n[1]+up, base+n[0], n[2], mw, mg));
      }

      /* ---- 鼓组 / 打击层 ---- */
      if(allow("drums") && s.drums){
        const D = s.drums;
        const K = D.k||[], S = D.s||[], H = D.h||[], O = D.o||[], CL = D.c||[];
        K.forEach(b=> ev.push({kind:"kick", when:(base+b)*beat, dur:D.kdur||0.28,
          gain:D.kg!=null?D.kg:0.85, from:D.kfrom, to:D.kto}));
        S.forEach(b=> ev.push({kind:"noise", when:(base+b)*beat, dur:D.sd||0.16,
          freq:D.sfreq||1900, filter:"bandpass", q:0.9, gain:D.sg!=null?D.sg:0.30}));
        H.forEach(b=> ev.push({kind:"noise", when:(base+b)*beat, dur:D.hd||0.05,
          freq:D.hfreq||8200, filter:"highpass", q:1, gain:D.hg!=null?D.hg:0.12}));
        O.forEach(b=> ev.push({kind:"noise", when:(base+b)*beat, dur:D.od||0.22,
          freq:D.ofreq||6500, filter:"highpass", q:1, gain:D.og!=null?D.og:0.15}));
        CL.forEach(b=> ev.push({kind:"noise", when:(base+b)*beat, dur:D.cd||0.10,
          freq:D.cfreq||3600, filter:"bandpass", q:1.5, gain:D.cg!=null?D.cg:0.20}));
      }
    }
  }
  ev.sort((a,b)=>a.when-b.when);
  return ev;
}

/* ---------- 10 种编曲风格：每种都有独立的和声 / 旋律 / 贝斯 / 鼓型 ---------- */
const STYLES = [
  {id:"ballad", nm:"流行抒情 Ballad", em:"🎤", tempo:72, bars:"4/4",
    harmony:"pad", hWave:"triangle", hGain:0.34, reg:0, octUp:true,
    bWave:"sine", bGain:0.45, mWave:"triangle", mGain:0.42,
    chords:[{r:60,iv:[0,4,7]},{r:55,iv:[0,4,7]},{r:57,iv:[0,3,7]},{r:53,iv:[0,4,7]}],
    bass:[[[0,48,2],[2,48,2]],[[0,43,2],[2,43,2]],[[0,45,2],[2,45,2]],[[0,41,2],[2,41,2]]],
    melody:[
      [[0,67,1],[1,69,1],[2,71,1.5],[3.5,72,0.5]],
      [[0,71,1.5],[1.5,69,0.5],[2,67,2]],
      [[0,69,1],[1,67,1],[2,64,1],[3,65,1]],
      [[0,65,1.5],[1.5,67,1],[2.5,69,1.5]]],
    drums:{k:[0,2.5],s:[2],h:[0,0.5,1,1.5,2,2.5,3,3.5],kg:0.55,sg:0.20,hg:0.09},
    desc:"钢琴长音铺底 + 极简鼓组，把中高频的空间全部让给旋律。最常见的思路，也最容易被做成「平淡」——区别就在留白有没有被填满。",
    char:{drum:"底鼓落在 1 拍与 3 拍后半，军鼓只在 3 拍，其余留白",
      bass:"根音长音，几乎不流动，只做地基",
      chord:"四声部长音 pad，内声部级进平滑移动",
      texture:"稀疏，和声层薄而宽，旋律独占中高音区",
      dynamic:"起伏平缓，能量靠第二遍旋律高八度抬升"}},

  {id:"rock", nm:"摇滚 Rock", em:"🎸", tempo:140, bars:"4/4",
    harmony:"stab", stabAt:[0,1,2,3], stabDur:0.26, hWave:"sawtooth", hGain:0.20, reg:0, octUp:true,
    bWave:"square", bGain:0.34, mWave:"sawtooth", mGain:0.30,
    chords:[{r:52,iv:[0,7,12]},{r:52,iv:[0,7,12]},{r:55,iv:[0,7,12]},{r:57,iv:[0,7,12]}],
    bass:[
      [[0,40,0.5],[0.5,40,0.5],[1,40,0.5],[1.5,47,0.5],[2,40,0.5],[2.5,40,0.5],[3,47,0.5],[3.5,40,0.5]],
      [[0,40,0.5],[0.5,40,0.5],[1,40,0.5],[1.5,47,0.5],[2,40,0.5],[2.5,40,0.5],[3,47,0.5],[3.5,47,0.5]],
      [[0,43,0.5],[0.5,43,0.5],[1,43,0.5],[1.5,50,0.5],[2,43,0.5],[2.5,43,0.5],[3,50,0.5],[3.5,50,0.5]],
      [[0,45,0.5],[0.5,45,0.5],[1,45,0.5],[1.5,52,0.5],[2,45,0.5],[2.5,45,0.5],[3,52,0.5],[3.5,52,0.5]]],
    melody:[
      [[0,64,0.5],[0.5,64,0.5],[1,67,1],[2,64,0.5],[3,59,1]],
      [[0,64,0.5],[1,71,0.5],[1.5,71,0.5],[2,69,1],[3,64,1]],
      [[0,67,0.5],[0.5,67,0.5],[1,71,1],[2,67,0.5],[3,62,1]],
      [[0,69,0.5],[1,72,0.5],[1.5,72,0.5],[2,71,1],[3,64,1]]],
    drums:{k:[0,1.5,2,3.5],s:[1,3],h:[0,0.5,1,1.5,2,2.5,3,3.5],kg:0.85,sg:0.32,hg:0.10},
    desc:"失真锯齿波强力和弦（根音+五度+八度）+ 驱动感八分贝斯 + 四件套鼓。能量全部来自「密度 × 速度」，而不是音高变化。",
    char:{drum:"底鼓 1、2 拍外加切分推进，军鼓锁定 2、4 拍",
      bass:"八分音符持续驱动，根音与五音交替",
      chord:"强力和弦（无三音），每拍一次 stab",
      texture:"密集、中低音区堆叠，旋律是「喊」出来的短句",
      dynamic:"整段保持高能量，几乎不衰减"}},

  {id:"edm", nm:"电子 EDM", em:"🔊", tempo:128, bars:"4/4",
    harmony:"arp", hWave:"square", hGain:0.13, reg:12, octUp:true,
    bWave:"sawtooth", bGain:0.30, mWave:"square", mGain:0.16,
    chords:[{r:57,iv:[0,3,7]},{r:53,iv:[0,4,7]},{r:60,iv:[0,4,7]},{r:55,iv:[0,4,7]}],
    bass:[
      [[0,45,0.5],[0.5,45,0.5],[1,45,0.5],[1.5,45,0.5],[2,45,0.5],[2.5,45,0.5],[3,45,0.5],[3.5,45,0.5]],
      [[0,41,0.5],[0.5,41,0.5],[1,41,0.5],[1.5,41,0.5],[2,41,0.5],[2.5,41,0.5],[3,41,0.5],[3.5,41,0.5]],
      [[0,48,0.5],[0.5,48,0.5],[1,48,0.5],[1.5,48,0.5],[2,48,0.5],[2.5,48,0.5],[3,48,0.5],[3.5,48,0.5]],
      [[0,43,0.5],[0.5,43,0.5],[1,43,0.5],[1.5,43,0.5],[2,43,0.5],[2.5,43,0.5],[3,43,0.5],[3.5,43,0.5]]],
    melody:[
      [[0,81,0.5],[1,79,0.5],[2,76,1],[3,79,0.5]],
      [[0,77,0.5],[1,76,0.5],[2,72,1],[3,76,0.5]],
      [[0,79,0.5],[1,81,0.5],[2,84,1],[3,81,0.5]],
      [[0,79,0.5],[1,77,0.5],[2,74,1],[3,71,0.5]]],
    drums:{k:[0,1,2,3],s:[1,3],o:[0.5,1.5,2.5,3.5],h:[0.25,0.75,1.25,1.75,2.25,2.75,3.25,3.75],
      kg:0.85,sg:0.26,og:0.14,hg:0.07},
    desc:"四踩底鼓 + off-beat 开镲 + 方波琶音 + 低八度贝斯。明亮、机械、不断跳动，能量来自严格的格子感而不是旋律起伏。",
    char:{drum:"四踩（每拍一个底鼓），军鼓在 2、4 拍，反拍开镲",
      bass:"与和声根音同步的持续低音，刻意低于琶音两个八度",
      chord:"方波琶音跑十六分，铺满高音区",
      texture:"垂直分层清晰：低音-贝斯 / 中音-和弦根音 / 高音-琶音",
      dynamic:"靠音色进出而非力度起伏，段落感来自滤波与层数增减"}},

  {id:"jazz", nm:"爵士 Jazz", em:"🎷", tempo:120, bars:"4/4",
    harmony:"stab", stabAt:[0.66,2.33], stabDur:0.55, hWave:"triangle", hGain:0.24, reg:0, octUp:false,
    bWave:"sine", bGain:0.50, mWave:"triangle", mGain:0.40,
    chords:[{r:62,iv:[0,3,7,10]},{r:55,iv:[0,4,7,10]},{r:60,iv:[0,4,7,11]},{r:57,iv:[0,4,7,10]}],
    bass:[
      [[0,50,1],[1,53,1],[2,57,1],[3,59,1]],
      [[0,43,1],[1,47,1],[2,50,1],[3,53,1]],
      [[0,48,1],[1,52,1],[2,55,1],[3,57,1]],
      [[0,45,1],[1,49,1],[2,52,1],[3,55,1]]],
    melody:[
      [[0,69,0.66],[0.66,72,0.66],[1.33,74,1.33],[2.66,72,0.66]],
      [[0,71,0.66],[0.66,69,0.66],[1.33,67,1.33],[2.66,65,0.66]],
      [[0,67,1],[1,64,0.66],[1.66,62,1.66],[3.33,64,0.66]],
      [[0,69,0.66],[0.66,71,0.66],[1.33,72,2]]],
    drums:{k:[0],s:[2],h:[0,0.66,1.33,2,2.66,3.33],kg:0.40,sg:0.18,hg:0.09,hd:0.10,hfreq:9000},
    desc:"摇摆八分 + 七/九和弦 + 行走贝斯 + 切分 comping。松弛而复杂——能量来自和声色彩与节奏弹性，不是音量和速度。",
    char:{drum:"ride 摇摆三点 Pattern（0 / 0.66 / 1.33…），底鼓极轻只标点",
      bass:"行走贝斯每拍一个音，走的是和弦音+经过音的路线",
      chord:"七和弦与九和弦，comping 落在切分位而非正拍",
      texture:"中音区密集和声，贝斯与旋律之间留出中低空档",
      dynamic:"句法级起伏，随乐句呼吸而非持续推进"}},

  {id:"classical", nm:"古典弦乐 Classical", em:"🎻", tempo:88, bars:"4/4",
    harmony:"arp", hWave:"sine", hGain:0.26, reg:-12, octUp:true,
    bWave:"sine", bGain:0.42, mWave:"sine", mGain:0.46,
    chords:[{r:60,iv:[0,4,7]},{r:57,iv:[0,3,7]},{r:53,iv:[0,4,7]},{r:55,iv:[0,4,7]}],
    bass:[[[0,48,2],[2,55,2]],[[0,45,2],[2,52,2]],[[0,41,2],[2,48,2]],[[0,43,2],[2,50,2]]],
    melody:[
      [[0,72,1],[1,71,0.5],[1.5,72,0.5],[2,74,2]],
      [[0,72,1],[1,71,0.5],[1.5,69,0.5],[2,67,2]],
      [[0,65,1],[1,69,0.5],[1.5,72,0.5],[2,69,2]],
      [[0,67,1],[1,71,0.5],[1.5,74,0.5],[2,71,2]]],
    drums:{},
    desc:"完全无鼓。分解和弦做伴奏织体，低音区大提琴式根音，旋律连绵不断。靠音色纯净与声部线条取胜。",
    char:{drum:"无鼓组，律动完全由分解和弦的均匀运动提供",
      bass:"低音区根音+五音长句，像大提琴的持续支撑",
      chord:"阿尔贝蒂式分解和弦，把和声摊平成运动",
      texture:"四声部各自独立，横向线条比纵向音响更重要",
      dynamic:"长线条渐强渐弱，乐句之间有呼吸与收束"}},

  {id:"folk", nm:"民谣 Folk", em:"🪕", tempo:96, bars:"4/4",
    harmony:"strum", strumBack:true, hWave:"triangle", hGain:0.22, reg:0, octUp:true,
    bWave:"triangle", bGain:0.42, mWave:"triangle", mGain:0.44,
    chords:[{r:60,iv:[0,4,7]},{r:55,iv:[0,4,7]},{r:57,iv:[0,3,7]},{r:53,iv:[0,4,7]}],
    bass:[
      [[0,48,1],[1,48,1],[2,55,1],[3,55,1]],
      [[0,43,1],[1,43,1],[2,50,1],[3,50,1]],
      [[0,45,1],[1,45,1],[2,52,1],[3,52,1]],
      [[0,41,1],[1,41,1],[2,48,1],[3,48,1]]],
    melody:[
      [[0,67,1],[1,64,1],[2,65,1.5],[3.5,64,0.5]],
      [[0,67,1],[1,71,1],[2,67,2]],
      [[0,69,1],[1,72,1],[2,69,1.5]],
      [[0,65,1],[1,69,1],[2,67,2]]],
    drums:{h:[0.5,1.5,2.5,3.5],hg:0.09,hd:0.07,hfreq:7000},
    desc:"尼龙弦吉他式扫弦（每拍一次下扫、第三拍回扫）+ 朴素根音贝斯 + 沙锤。刻意不加修饰，突出人声与歌词。",
    char:{drum:"只用一个沙锤式打点在反拍，替代全套鼓",
      bass:"根音与五音轮流，每拍一音，绝不炫技",
      chord:"扫弦——琶音间隔极短（约 0.05 拍），听感像拨片刮过",
      texture:"单层伴奏 + 单旋律，几乎没有中层填充",
      dynamic:"随歌词起伏，力度变化直接而朴素"}},

  {id:"funk", nm:"放克 Funk", em:"🕺", tempo:112, bars:"4/4",
    harmony:"stab", stabAt:[0.75,1.5,2.25,3.5], stabDur:0.16, hWave:"sawtooth", hGain:0.15, reg:0, octUp:false,
    bWave:"square", bGain:0.34, mWave:"sawtooth", mGain:0.26,
    chords:[{r:64,iv:[0,3,7,10,14]},{r:64,iv:[0,3,7,10,14]},{r:57,iv:[0,4,10,14]},{r:57,iv:[0,4,10,14]}],
    bass:[
      [[0,52,0.25],[0.5,52,0.2],[0.75,64,0.2],[1.5,52,0.25],[2,52,0.2],[2.75,55,0.2],[3.25,59,0.3]],
      [[0,52,0.25],[0.5,52,0.2],[0.75,64,0.2],[1.5,52,0.25],[2,52,0.2],[2.75,59,0.2],[3.25,62,0.3]],
      [[0,45,0.25],[0.5,45,0.2],[0.75,57,0.2],[1.5,45,0.25],[2,45,0.2],[2.75,49,0.2],[3.25,52,0.3]],
      [[0,45,0.25],[0.5,45,0.2],[0.75,57,0.2],[1.5,45,0.25],[2,45,0.2],[2.75,52,0.2],[3.25,57,0.3]]],
    melody:[
      [[0.5,71,0.25],[1,72,0.25],[1.5,74,0.5],[2.5,71,0.25],[3,76,0.5]],
      [[0.5,74,0.25],[1,76,0.25],[1.5,71,0.5],[2.5,74,0.5]],
      [[0.5,69,0.25],[1,72,0.25],[1.5,76,0.5],[2.5,73,0.25],[3,72,0.5]],
      [[0.5,76,0.25],[1,73,0.25],[1.5,69,0.5],[2.5,72,0.5]]],
    drums:{k:[0,0.75,2.5],s:[1,3,3.75],h:[0,0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,3.25,3.5,3.75],
      kg:0.80,sg:0.24,hg:0.08,hd:0.04},
    desc:"关键不在音多，而在每个音都卡在十六分格子的「缝」里。短促和弦刺点、跳跃贝斯、密集鬼音鼓点，三位一体构成 groove。",
    char:{drum:"底鼓落在 1 与 2.5 拍附近的切分位，军鼓夹带十六分鬼音",
      bass:"十六分跳跃 + 八度穿插，本身就是一个独立旋律声部",
      chord:"极短的和弦刺点（约 0.16 拍），只给一下打击不给延音",
      texture:"每层都很短、很干，靠错位互相咬合而非叠加",
      dynamic:"整体平稳，力度对比很小，groove 来自位置而非音量"}},

  {id:"hiphop", nm:"嘻哈 Hip-Hop", em:"🎧", tempo:88, bars:"4/4",
    harmony:"pad", hWave:"triangle", hGain:0.26, reg:0, octUp:false,
    bWave:"sine", bGain:0.55, mWave:"triangle", mGain:0.30,
    chords:[{r:57,iv:[0,3,7,10,14]},{r:53,iv:[0,4,7,11]},{r:57,iv:[0,3,7,10]},{r:55,iv:[0,4,7,10]}],
    bass:[[[0,33,2],[2,33,2]],[[0,29,2],[2,29,2]],[[0,33,2],[2,33,2]],[[0,31,2],[2,31,2]]],
    melody:[
      [[0,72,1.5]],
      [],
      [[1,69,1],[2.5,72,1]],
      []],
    drums:{k:[0,0.75,2.5],s:[1,3],h:[0,0.5,1,1.5,2,2.5,3,3.5],kg:0.80,sg:0.28,hg:0.08},
    desc:"boom-bap 鼓组（底鼓错位、军鼓沉在 2、4 拍）+ 极低频贝斯 + 暗色九和弦垫底。旋律大量留白，氛围与律动比旋律重要。",
    char:{drum:"底鼓第 1 拍后半抢进，军鼓稳锁 2、4 拍，hi-hat 八分平铺",
      bass:"极低频长音（约 30–40Hz 区间），只给地基不给线条",
      chord:"小九、大七等暗色和弦长音，几乎不做节奏",
      texture:"低层厚重、中层空旷，旋律只偶尔闪现一两个音",
      dynamic:"整体压暗，动态起伏集中在鼓组的强弱拍"}},

  {id:"latin", nm:"拉丁 Latin", em:"🌴", tempo:120, bars:"4/4",
    harmony:"arp", hWave:"square", hGain:0.10, reg:0, octUp:true,
    bWave:"triangle", bGain:0.40, mWave:"square", mGain:0.18,
    chords:[{r:50,iv:[0,3,7,10]},{r:55,iv:[0,4,7,10]},{r:60,iv:[0,4,7,11]},{r:50,iv:[0,3,7,10]}],
    bass:[
      [[0,38,0.75],[1.5,45,0.5],[2,38,0.75],[3.5,45,0.5]],
      [[0,31,0.75],[1.5,38,0.5],[2,31,0.75],[3.5,38,0.5]],
      [[0,36,0.75],[1.5,43,0.5],[2,36,0.75],[3.5,43,0.5]],
      [[0,38,0.75],[1.5,45,0.5],[2,38,0.75],[3.5,45,0.5]]],
    melody:[
      [[0,74,0.5],[0.5,77,0.5],[1,81,1],[2,77,0.5],[2.5,74,0.5],[3,77,1]],
      [[0,79,0.5],[0.5,77,0.5],[1,74,1],[2,71,0.5],[2.5,74,0.5],[3,77,1]],
      [[0,76,0.5],[0.5,79,0.5],[1,83,1],[2,79,0.5],[2.5,76,0.5],[3,72,1]],
      [[0,77,0.5],[0.5,74,0.5],[1,69,1],[2,74,0.5],[2.5,77,0.5],[3,81,1]]],
    drums:{k:[0,2.5],h:[0.5,1.5,2.5,3.5],c:[0,0.75,1.5,2.5,3.25],
      kg:0.55,sg:0,hg:0.10,cg:0.20,hd:0.06,cd:0.10},
    desc:"montuno 钢琴琶音 + tumbao 贝斯 + clave 骨架。热情与推动力来自固定音型（clave）之上各层的错位叠加。",
    char:{drum:"以 clave 音型为骨架（0 / 0.75 / 1.5 / 2.5 / 3.25 拍），conga 与沙锤填充",
      bass:"tumbao 音型，避开第 1 拍后半，落在 1.5 与 3.5 制造向前感",
      chord:"双手八度 montuno 琶音，持续不断地点状运动",
      texture:"多层固定音型错位咬合，每层都在循环但互不对齐",
      dynamic:"整段稳定推进，靠层数增减制造段落变化"}},

  {id:"ambient", nm:"氛围 Ambient", em:"🌌", tempo:60, bars:"4/4",
    harmony:"long", hWave:"sine", hGain:0.24, reg:0, octUp:false,
    bWave:"sine", bGain:0.30, mWave:"sine", mGain:0.26,
    chords:[{r:48,iv:[0,7,12,14]},{r:45,iv:[0,7,12,14]},{r:53,iv:[0,7,12,14]},{r:50,iv:[0,7,12,14]}],
    bass:[[[0,36,4]],[[0,33,4]],[[0,41,4]],[[0,38,4]]],
    melody:[
      [[2,84,2]],
      [],
      [[1,88,3]],
      []],
    drums:{},
    desc:"几乎没有节奏可言。开放排列的 sus 和弦长音层层叠化，上方偶尔落下孤立的音。靠留白、衰减与空间感而非旋律存在。",
    char:{drum:"无鼓、无打击，时间感由和声更替提供",
      bass:"极低音区持续 drone，只做地基的「空气压」",
      chord:"开放排列的二度/五度叠置，延音跨越小节彼此重叠",
      texture:"极稀疏，音与音之间留巨大的空隙",
      dynamic:"几乎平直， 变化 只在音色的进出与泛音的明暗"}}
];

const STYLE_BY_ID = {}; STYLES.forEach(s=> STYLE_BY_ID[s.id]=s);

/* ============================================================
   编曲实验室 HUB
   ============================================================ */
function renderArrangeHub(body){
  stopAllAudio();
  body.innerHTML = `
    <div class="panel">
      <div class="kicker">ARRANGEMENT LAB · 编曲实验室</div>
      <h2>🎚 同一段音乐，十种编曲</h2>
      <div class="sub">编曲 = 把同样的“和声 + 旋律”，用不同的 <b>乐器音色 / 织体密度 / 速度 / 音区 / 留白</b> 重新包装。<b>写歌靠动机，编曲决定它听起来像什么。</b>下面先用同一个种子，听 10 种风格的差别。</div>
    </div>
    <div class="panel">
      <h2>① 十种风格画廊</h2>
      <div class="sub">10 种风格各有<b>独立</b>的和声、旋律、贝斯与鼓型，每段约 14–36 秒。每张卡片都可播放 / 暂停 / 重播，并能单独试听<b>鼓组 / 贝斯 / 和声 / 旋律</b>四条分轨。听的时候请盯住这几件事：鼓是疏还是密、贝斯是走动还是铺底、和弦是长音还是琶音、旋律占哪个音区。</div>
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

  // ① 画廊：每种风格 = 名字 + 简介 + 编曲特征 + 真实可播放音频 + 播放控制 + 分轨试听
  function cardOf(id){ return $("style-grid") && $("style-grid").querySelector('.style-card[data-id="'+id+'"]'); }
  function settleCard(card){
    if(!card) return;
    card.classList.remove("playing");
    const b = card.querySelector('[data-act="play"]'); if(b) b.textContent = "▶ 播放";
    const bar = card.querySelector(".sc-bar"); if(bar) bar.style.width = "0%";
  }
  function playStyle(s, track, card){
    const ev = styleEvents(s, track);
    playEvents(s.id, ev, (el, tot)=>{
      const c = card || cardOf(s.id);
      if(!c) return;
      const bar = c.querySelector(".sc-bar");
      if(bar) bar.style.width = (tot ? (el/tot*100) : 0) + "%";
      if(el >= tot - 0.03){
        settleCard(c);
        const bb = c.querySelector('[data-act="play"]'); if(bb) bb.textContent = "▶ 重播";
      }
    });
    PLAYER.track = track;
    const c = card || cardOf(s.id);
    if(c){
      c.classList.add("playing");
      const b = c.querySelector('[data-act="play"]'); if(b) b.textContent = "⏸ 暂停";
    }
    $("style-grid").querySelectorAll(".style-card").forEach(x=>{ if(x.dataset.id!==s.id) settleCard(x); });
    bump("arrange","hear",6);
  }

  $("style-grid").innerHTML = STYLES.map(s=>{
    const hasDrum = Object.keys(s.drums||{}).length>0;
    return `<div class="style-card" data-id="${s.id}" data-tr="mix">
      <div class="sc-top">
        <div class="sc-em">${s.em}</div>
        <div class="sc-head">
          <div class="sc-nm">${s.nm}</div>
          <div class="sc-meta">${s.tempo} BPM · ${s.bars||"4/4"} · 8 小节</div>
        </div>
      </div>
      <div class="sc-desc">${s.desc}</div>
      <div class="sc-chars">
        <div><i>鼓组</i>${s.char.drum}</div>
        <div><i>贝斯</i>${s.char.bass}</div>
        <div><i>和弦</i>${s.char.chord}</div>
        <div><i>织体</i>${s.char.texture}</div>
        <div><i>动态</i>${s.char.dynamic}</div>
      </div>
      <div class="sc-prog"><div class="sc-bar"></div></div>
      <div class="sc-ctrl">
        <button class="btn sm gold" data-act="play">▶ 播放</button>
        <button class="btn ghost sm" data-act="stop">■ 停止</button>
        <button class="btn ghost sm" data-act="replay">↻ 重播</button>
      </div>
      <div class="sc-tracks">
        <span class="sc-tl">分轨试听</span>
        <button class="sc-tr on" data-tr="mix">全混音</button>
        ${hasDrum?`<button class="sc-tr" data-tr="drums">鼓组</button>`:""}
        <button class="sc-tr" data-tr="bass">贝斯</button>
        <button class="sc-tr" data-tr="harmony">和声</button>
        <button class="sc-tr" data-tr="melody">旋律</button>
      </div>
    </div>`;
  }).join("");

  $("style-grid").querySelectorAll(".style-card").forEach(card=>{
    const s = STYLE_BY_ID[card.dataset.id];
    const playBtn = card.querySelector('[data-act="play"]');
    playBtn.onclick = ()=>{
      if(PLAYER.id===s.id && PLAYER.playing){
        const paused = togglePause(s.id);
        playBtn.textContent = paused ? "▶ 继续" : "⏸ 暂停";
        return;
      }
      stopAllAudio();
      playStyle(s, card.dataset.tr || "mix", card);
      ML.toast("正在播放："+s.nm+" · "+(trackName(card.dataset.tr||"mix")),"🎚","xp");
    };
    card.querySelector('[data-act="stop"]').onclick = ()=>{
      stopAllAudio();
      settleCard(card);
    };
    card.querySelector('[data-act="replay"]').onclick = ()=>{
      stopAllAudio();
      settleCard(card);
      playStyle(s, card.dataset.tr || "mix", card);
      playBtn.textContent = "⏸ 暂停";
      ML.toast("从头重播："+s.nm+" · "+(trackName(card.dataset.tr||"mix")),"🎚","xp");
    };
    card.querySelectorAll(".sc-tr").forEach(b=>{
      b.onclick = ()=>{
        card.querySelectorAll(".sc-tr").forEach(x=>x.classList.remove("on"));
        b.classList.add("on");
        card.dataset.tr = b.dataset.tr;
        if(PLAYER.id===s.id){ stopAllAudio(); playStyle(s, b.dataset.tr, card); }
      };
    });
  });
  wireReveal();

  // ② A/B
  renderAB($("ab-box"), 0);

  // ③ quiz
  renderArrQuiz($("arr-quiz"));
}

const TRACK_NM = {mix:"全混音", drums:"鼓组", bass:"贝斯", harmony:"和声", melody:"旋律"};
function trackName(id){ return TRACK_NM[id] || "全混音"; }
/* 首次滚入视野时给卡片一个轻淡入场，避免一次性铺满造成压迫感 */
function wireReveal(){
  const grid = $("style-grid"); if(!grid) return;
  grid.querySelectorAll(".style-card").forEach((c,i)=>{
    c.style.opacity = "0";
    c.style.transform = "translateY(10px)";
    c.style.transition = "opacity .45s ease, transform .45s ease";
    setTimeout(()=>{ c.style.opacity="1"; c.style.transform="none"; }, 60*i);
  });
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
    btn.onclick = ()=>{
      const s = btn.dataset.p==="a"?sa:sb;
      stopAllAudio();
      playEvents(s.id+"-ab", styleEvents(s,"mix"));
      bump("arrange","hear",4);
      ML.toast("正在播放："+s.nm,"🎚");
    };
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
