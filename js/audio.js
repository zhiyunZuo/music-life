/* ============================================================
   MUSIC LIFE · 音频引擎（Web Audio API）
   ============================================================ */
window.AudioEngine = (function(){
  let ctx = null;
  let master = null;
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if(ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // MIDI -> Hz
  function mtof(m){ return 440 * Math.pow(2,(m-69)/12); }

  /* 正在发声 / 已排程的音源，用于 stopAll（暂停与切换试听时需要立刻掐断） */
  const active = [];
  function track(node){
    active.push(node);
    node.onended = ()=>{ const i=active.indexOf(node); if(i>=0) active.splice(i,1); };
  }

  // 单个音，带 ADSR
  function tone(midi, dur, opt){
    ensure();
    opt = opt || {};
    const t0 = ctx.currentTime + (opt.when||0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const type = opt.type || "triangle";
    osc.type = type;
    osc.frequency.value = mtof(midi);
    const peak = opt.gain!=null?opt.gain:0.9;
    const atk = opt.atk!=null?opt.atk:0.012;
    const rel = opt.rel!=null?opt.rel:Math.min(0.4,dur*0.6);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+atk);
    g.gain.setValueAtTime(peak,t0+Math.max(atk,dur-rel));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0+dur+0.02);
    track(osc);
  }

  // 播放一连串音符 [{m,d,type,gap}]
  function sequence(notes){
    ensure();
    let t = 0;
    notes.forEach(n=>{
      tone(n.m, n.d, {when:t, type:n.type, gain:n.gain});
      t += (n.gap!=null?n.gap:n.d);
    });
  }

  // 和弦
  function chord(intervals, rootMidi, dur, when){
    ensure();
    intervals.forEach(iv=> tone(rootMidi+iv, dur, {when:when||0, type:"triangle"}));
  }

  // 音程：根音 + 上方音
  function interval(semi, rootMidi, dur, when){
    ensure();
    const w = when||0;
    tone(rootMidi, dur, {when:w});
    tone(rootMidi+semi, dur, {when:w+dur+0.12});
  }

  // 和弦连接 / 和声进行：依次播放若干和弦 [{root,iv}]
  function progression(chords, step, dur){
    ensure();
    step = step||0.95; dur = dur||1.0;
    let t = 0;
    chords.forEach(c=>{
      const root = c.root, iv = c.iv;
      iv.forEach(ivv=> tone(root+ivv, dur, {when:t, type:"triangle"}));
      t += step;
    });
  }

  // 节奏：beats 为 1/0 序列，bpm 控制速度
  function rhythm(pattern, bpm){
    ensure();
    const beat = 60/bpm;
    pattern.forEach((on,i)=>{
      if(on){
        tone(on===2?62:60, beat*0.5, {when:i*beat, type:"sine", gain:on===2?1:0.7});
      }
    });
  }

  // 播放 MIDI 片段（用于和声实验室 / 作曲试听）
  function playMidi(arr){
    ensure();
    let t=0;
    arr.forEach(ev=>{
      tone(ev.m, ev.d||0.4, {when:t, type:ev.type||"triangle"});
      t += ev.gap!=null?ev.gap:(ev.d||0.4);
    });
  }

  /* ---------- 打击乐原语：白噪（军鼓 / 踩镲 / shaker）与底鼓 ---------- */
  let noiseBuf = null;
  function getNoise(){
    ensure();
    if(noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    return noiseBuf;
  }
  /* 过滤后的白噪：freq 高 → 踩镲般细碎；freq 中 → 军鼓般有体感 */
  function noise(when, dur, opt){
    ensure();
    opt = opt || {};
    const t0 = ctx.currentTime + (when||0);
    const src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.playbackRate.value = opt.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = opt.filter || "highpass";
    f.frequency.value = opt.freq || 6000;
    f.Q.value = opt.q || 1;
    const g = ctx.createGain();
    const peak = opt.gain!=null?opt.gain:0.3;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+(opt.atk||0.004));
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0+dur+0.02);
    track(src);
  }
  /* 底鼓：低频向下扫频的 sine，decay 越长越沉 */
  function kick(when, opt){
    ensure();
    opt = opt || {};
    const t0 = ctx.currentTime + (when||0);
    const dur = opt.dur || 0.28;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(opt.from || 125, t0);
    osc.frequency.exponentialRampToValueAtTime(opt.to || 44, t0+(opt.pitchT || 0.09));
    const peak = opt.gain!=null?opt.gain:0.85;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(peak,t0+0.006);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0+dur+0.02);
    track(osc);
  }
  /* 立刻掐断所有正在发声或已排程的音（切换试听 / 停止时用） */
  function stopAll(){
    if(!ctx) return;
    active.slice().forEach(n=>{
      try{ n.stop(); }catch(e){}
      try{ n.disconnect(); }catch(e){}
    });
    active.length = 0;
  }
  /* 暴露 ctx：上层用 suspend/resume 做「暂停 / 继续」 */
  function ctxOf(){ ensure(); return ctx; }

  return {ensure,mtof,tone,sequence,chord,interval,progression,rhythm,playMidi,
    noise,kick,stopAll,ctxOf};
})();
