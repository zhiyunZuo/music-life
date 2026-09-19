/* Verifies that target instrument knowledge nodes have task fields
   between 80 and 140 characters (inclusive). */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = __dirname;

const targets = {
  "js/inst-cello.js": ["cl-shift","cl-bowhold","cl-vibrato","cl-harmonics","cl-double","cl-m5"],
  "js/inst-flute.js": ["flute-range","flute-legato","flute-flutter","flute-gliss","flute-singplay"],
  "js/inst-handpan.js": ["hp-body","hp-mic"],
  "js/inst-marimba.js": ["mb-resonator","mb-chord","mb-roll-1h","mb-timbre","mb-ensemble","mb-production","mb-m2"],
  "js/inst-sheng.js": ["sh-trill","sh-dayin","sh-gliss","sh-transpose","sh-ensemble","sh-production"],
  "js/inst-voice.js": ["vc-breath","vc-phonation","vc-registers","vc-fach","vc-vowel","vc-consonant","vc-chinese","vc-vibrato","vc-messa","vc-coloratura","vc-mic","vc-choir","vc-pop","vc-chinese-style","vc-repertoire","vc-phrasing","vc-m2","vc-m3","vc-m4"],
  "js/inst-xiao.js": ["xiao-tuning"],
  "js/inst-xylophone.js": ["xy-ensemble","xy-compose","xy-production","xy-m1","xy-m4"],
};

const sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of Object.keys(targets)) {
  const code = fs.readFileSync(path.join(ROOT, f), "utf8");
  vm.runInContext(code, sandbox, { filename: f });
}
const LIB = sandbox.window.INSTRUMENT_LIB;

let bad = 0, checked = 0;
for (const f of Object.keys(targets)) {
  const key = f.replace(/^js\/inst-/, "").replace(/\.js$/, "");
  const L = LIB[key];
  if (!L) { console.log("MISSING LIB for", f); continue; }
  const want = new Set(targets[f]);
  (L.nodes || []).forEach(n => {
    if (!want.has(n.id)) return;
    checked++;
    const len = (n.task || "").length;
    const flag = (len < 80 || len > 140) ? "  <-- OUT OF RANGE" : "";
    if (flag) bad++;
    console.log(`${key}/${n.id}: len=${len}${flag}`);
  });
}
console.log(`\nchecked=${checked}, out_of_range=${bad}`);
