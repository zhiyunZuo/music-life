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

  return {ensure,mtof,tone,sequence,chord,interval,progression,rhythm,playMidi};
})();
