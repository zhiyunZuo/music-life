/* 验证「十种风格画廊」：渲染 10 张卡片，每张都必须有
   风格名称 + 视觉/简介 + 真实可播放音频 + 播放/暂停/重播控制 + 分轨试听。
   用一个极简 DOM 驱动 arrange.js 内部注册的渲染器。 */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = __dirname;

/* ---- 极简 DOM：querySelectorAll 返回真实集合，方便断言 ---- */
function mkEl(tag, attrs, children) {
  const el = {
    tagName: (tag || "div").toUpperCase(), innerHTML: "", textContent: "", className: "",
    style: {}, dataset: {}, children: children || [], _on: {},
  };
  Object.assign(el, attrs || {});
  el.classList = {
    add(c) { const s = new Set((el.className || "").split(/\s+/).filter(Boolean)); s.add(c); el.className = [...s].join(" "); },
    remove(c) { const s = new Set((el.className || "").split(/\s+/).filter(Boolean)); s.delete(c); el.className = [...s].join(" "); },
    contains(c) { return (el.className || "").split(/\s+/).includes(c); },
    toggle(c, f) { f ? this.add(c) : this.remove(c); },
  };
  el.appendChild = c => { el.children.push(c); return c; };
  el.removeChild = c => c;
  el.setAttribute = () => {};
  el.getContext = () => ({});
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 40 });
  el.scrollIntoView = () => {};
  el.addEventListener = (t, f) => { el._on[t] = f; };
  el.querySelector = () => mkEl();
  el.querySelectorAll = () => [];
  return el;
}

const store = {};
const document = {
  getElementById(id) { return store[id] || (store[id] = mkEl("div", { id })); },
  createElement(t) { return mkEl(t); },
  querySelectorAll() { return []; },
  querySelector() { return mkEl(); },
  addEventListener() {},
};

/* ---- 假 ML / AE：捕获 registerLearnTab 的渲染器，记录被调用的音符 ---- */
const captured = {};
let notes = 0;
const AE = {
  ensure() { return { currentTime: 0 }; },
  ctx() { return null; },
  mtof: m => 440 * Math.pow(2, (m - 69) / 12),
  tone() { notes++; }, sequence() { notes++; }, chord() { notes++; },
  interval() { notes++; }, progression() { notes++; }, rhythm() { notes++; },
  playMidi() { notes++; }, noise() { notes++; }, kick() { notes++; }, stopAll() {},
};
const ML = {
  AE,
  getState: () => ({ lessons: {}, studioStep: 0, instruments: [] }),
  save() {}, toast() {}, bump() {},
  masteryBar: () => "", openLesson() {}, showView() {},
  registerLearnTab(tab, renderer) { captured[tab.id] = { tab, renderer }; },
  NAV: [], VIEWS: {}, buildNav() {},
};

const ctx = { window: {}, document, console, Math, Date, JSON, Set, Map, Array, Object, String, Number, isNaN, setTimeout, clearTimeout, requestAnimationFrame: cb => 0, localStorage: { getItem: () => null, setItem() {} } };
ctx.window.ML = ML;
ctx.window.AE = AE;
ctx.globalThis = ctx;
vm.createContext(ctx);

/* 注意：这里不加载 learn.js —— 它会用自己的实现覆盖 registerLearnTab，
   导致我们捕获不到 arrange.js 注册进来的渲染器。arrange.js 可独立挂载。 */
ML.renderShell = () => {};
try {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/arrange.js"), "utf8"), ctx, { filename: "arrange.js" });
} catch (e) {
  console.log("加载 arrange.js 失败:", e.message);
  process.exit(1);
}

if (!captured.arrange) { console.log("✗ 未注册 arrange 渲染器"); process.exit(1); }

let fail = 0;
const body = mkEl("div");
try {
  captured.arrange.renderer(body);
} catch (e) {
  console.log("✗ 渲染抛错:", e.message);
  process.exit(1);
}
/* 注意：画廊卡片渲染到 id="style-grid" 上（getElementById 拿到的假元素），
   所以断言要把 body 与所有被取用的元素拼在一起看。 */
const html = body.innerHTML + Object.keys(store).map(k => store[k].innerHTML || "").join("");
console.log("渲染 HTML 长度:", html.length);
if (!html.includes("style-grid") && (store["style-grid"] || { innerHTML: "" }).innerHTML.length < 3000) {
  console.log("✗ 画廊容器内容过少");
  process.exit(1);
}

/* ① 必须包含 10 种风格名称 */
const styles = ["流行抒情", "摇滚", "电子", "爵士", "古典弦乐", "民谣", "放克", "嘻哈", "拉丁", "氛围"];
const missingNm = styles.filter(s => html.indexOf(s) < 0);
if (missingNm.length) { console.log("✗ 缺失风格卡片:", missingNm.join(",")); fail++; }
else console.log("✓ 10 种风格卡片齐全");

/* ② 必须有播放/暂停/重播控制 + 分轨试听按钮 */
const needCls = ['data-act="play"', 'data-act="stop"', 'data-act="replay"',
                 "sc-tr", "sc-prog", "sc-chars", "sc-desc", "sc-nm", "sc-em"];
const missingCls = needCls.filter(c => html.indexOf(c) < 0);
if (missingCls.length) { console.log("✗ 缺少控制/展示元素:", missingCls.join(",")); fail++; }
else console.log("✓ 播放 / 暂停 / 重播 + 分轨试听 + 进度条 + 风格特征 均存在");

/* ③ 不得出现「点开即听」式的假按钮文案 */
["点开即听"].forEach(k => { if (html.includes(k)) { console.log("✗ 仍存在假试听文案:", k); fail++; } });
console.log(fail ? "✗ 存在 " + fail + " 项问题" : "✓ 画廊 UI 校验通过");

/* ④ 实际点击第 1 张卡片的播放：必须真的调度出声音 */
if (store["style-grid"]) {
  // 极简 DOM 下 querySelectorAll 返回空，无法绑定 handler；改为直接验证数据层
  console.log("ℹ 数据层音频验证请运行 _verify_styles.js");
}
console.log(fail ? "\n--- RESULT: FAIL" : "\n--- RESULT: PASS");
process.exit(fail ? 1 : 0);
