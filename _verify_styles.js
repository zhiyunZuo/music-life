/* 用虚拟 DOM + 假音频引擎，验证 10 种编曲风格的每一轨是否真的能生成有效音频事件。
   关键点：不能只看代码，要实际跑 styleEvents 并检查事件数、NaN、时长。 */
const fs = require('fs'), vm = require('vm');

let src = fs.readFileSync('js/arrange.js', 'utf8');
// 在 IIFE 结束前把内部符号暴露出来（只改内存里的源码，不动磁盘文件）
const tail = '\nML.registerLearnTab({id:"orch"';
if (src.indexOf(tail) < 0) { console.log('ANCHOR MISS'); process.exit(1); }
src = src.replace(/\n\}\)\(\);\s*$/, '\n  globalThis.__ARR__ = {STYLES:STYLES, styleEvents:styleEvents};\n})();\n');

/* ---- 假音频引擎：记录所有调用，方便检查参数是否合法 ---- */
const calls = [];
function chk(name, args) {
  for (const k in args) {
    const v = args[k];
    if (typeof v === 'number' && !isFinite(v)) {
      console.log('  ✗ 非法数值', name, k, v);
    }
  }
  calls.push({ n: name, ...args });
}
const AE = {
  ensure() {}, ctxOf() { return { currentTime: 0, state: 'running', resume() {}, suspend() {} }; },
  stopAll() {},
  tone(m, d, o) { chk('tone', { m, d, when: (o && o.when) || 0, type: (o && o.type) || '?', gain: (o && o.gain) }); },
  kick(w, o) { chk('kick', { when: w, dur: (o && o.dur) || 0, gain: (o && o.gain) }); },
  noise(w, d, o) { chk('noise', { when: w, d, freq: (o && o.freq) || 0, gain: (o && o.gain) }); },
  playMidi() {}, sequence() {}, chord() {}, progression() {}, mtof() { return 440; }
};

const sb = {
  window: { ML: { AE, getState: () => ({ lessons: {} }), save() {}, toast() {}, registerLearnTab() {}, NAV: [], VIEWS: {}, buildNav() {}, showView() {}, addExp() {} } },
  document: { getElementById: () => null, querySelectorAll: () => [] },
  console, Math, Object, Array, JSON, isFinite, setTimeout, clearTimeout
};
sb.window.requestAnimationFrame = (f) => setTimeout(f, 40);
sb.window.cancelAnimationFrame = clearTimeout;
sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(src, sb);

const { STYLES, styleEvents } = sb.__ARR__;
const TRACKS = ['drums', 'bass', 'harmony', 'melody', 'mix'];
let fail = 0;
console.log('风格数:', STYLES.length, '\n');

for (const s of STYLES) {
  const row = [];
  const emptyDrum = Object.keys(s.drums || {}).length === 0;
  for (const tr of TRACKS) {
    calls.length = 0;
    const ev = styleEvents(s, tr);
    const bad = [];
    ev.forEach(e => {
      if (!isFinite(e.when) || e.when < 0) bad.push('when=' + e.when);
      if (!isFinite(e.dur) || e.dur <= 0) bad.push('dur=' + e.dur);
      if (e.kind === undefined && (!isFinite(e.m) || e.m < 20 || e.m > 108)) bad.push('m=' + e.m);
      if (e.gain != null && (!isFinite(e.gain) || e.gain <= 0)) bad.push('gain=' + e.gain);
    });
    const total = ev.reduce((mx, e) => Math.max(mx, (e.when || 0) + (e.dur || 0)), 0);
    const hasInst = !(tr === 'drums' && emptyDrum);   // 无鼓组风格（古典/氛围）不设鼓轨
    if (ev.length === 0 && hasInst) { fail++; row.push(tr + ':空!'); }
    else if (ev.length === 0) row.push(tr + ':(本风格无此轨)');
    else if (bad.length) { fail++; row.push(tr + ':非法(' + bad.slice(0, 3).join(',') + ')'); }
    else row.push(tr + ':' + ev.length + '个/' + total.toFixed(1) + '秒');
  }
  console.log(s.nm.padEnd(18), '|', row.join('  '));
}
console.log('\n--- RESULT:', fail === 0 ? 'PASS 全部 10 种风格的各轨道音频事件均有效' : ('FAIL ' + fail + ' 项异常'));
process.exit(fail === 0 ? 0 : 1);
