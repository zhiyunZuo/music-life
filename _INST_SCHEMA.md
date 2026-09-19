# 乐器知识库文件规范（必须严格遵守）

每个乐器一个文件：`js/inst-<id>.js`，用 IIFE 挂到 `window.INSTRUMENT_LIB`。

```js
/* ============================================================
   <中文名> <English> —— 独立知识体系
   ============================================================ */
(function () {
  const LIB = window.INSTRUMENT_LIB || (window.INSTRUMENT_LIB = {});
  LIB.<id> = {
    nm: "中文名", em: "一个 emoji", ds: "一句话定位（20 字内，讲清它最独特的地方）",
    intro: "200-350 字。讲这件乐器最核心的思维模型是什么，与其它乐器的根本区别在哪。不要写成百科第一句。",
    meta: { family:"", range:"", notation:"", key:"" },   // 4 项，每项简短
    kb: {
      history:    "300-500 字。真实可靠的沿革。**不得编造具体年份/人名**，不确定就写'具体年代难以确证'。",
      structure:  "300-500 字。物理结构分解，用真实术语，可加中文括注原文。",
      acoustics:  "250-450 字。发声原理。",
      range:      "200-350 字。音域 + 记谱法 + 是否移调乐器。用 MIDI 音高号说明更准。",
      timbre:     "300-450 字。分区描述音色（低/中/高），以及如何改变音色。",
      technique:  "300-500 字。核心演奏技术总纲。",
      skills:     "250-450 字。编号列举常见技巧：① ② ③ ……（8 条左右）",
      repertoire: "250-450 字。真实曲目（作曲家 + 作品名 + 作品号）。**只写确有此曲的**。",
      styles:     "250-450 字。在各音乐风格中的角色。",
      ensemble:   "250-400 字。合奏中如何不盖人、如何配合。",
      compose:    "250-400 字。为这件乐器写作时要注意什么。",
      arrange:    "250-400 字。改编时的具体手法。",
      production: "250-400 字。音乐制作/音源中的处理与常见错误。",
      sources:    "150-300 字。**必须写**。列出可信资料类型或具体书名/机构名，如 Grove Music Online、Rimsky-Korsakov《管弦乐法原理》、某某博物馆乐器馆藏等。若某部分缺乏可靠资料，明确写 'XX 部分待权威资料补充'。"
    },
    panels: [ /* 3 张乐器总览图，见下方 symbol 说明 */ ],
    nodes: [ /* 12-20 个学习节点，见下方 */ ]
  };
  if (window.ML_DATA && window.ML_DATA.INSTRUMENTS) {
    window.ML_DATA.INSTRUMENTS.push({ id:"<id>", nm:"中文名", em:"emoji", ds:"一句话", detLevels:6 });
  }
})();
```

---

## nodes：学习节点

每乐器 **至少 14 个节点**，覆盖：入门姿势/持琴 → 发声/触键/运弓/气息 → 手型指法 → 音阶 → 和弦/双音 → 核心技术 → 音色控制 → 视奏 → 即兴 → 风格 → 合奏 → 代表作品处理 → **大师课**（至少 3 个）。

```js
{
  id: "<前缀>-xxx",           // 唯一，前缀见各乐器任务
  t: "节点标题（8-16 字）",
  em: "一个 emoji",
  lv: "入门" | "进阶" | "高级" | "大师课",
  explain: "350-600 字。核心讲解。可用 **加粗** 强调关键词（会被渲染为 <b>）。用 + 号拼接多个字符串以分段。",
  demo: "250-450 字。可照做的具体示范/实验，要有具体参数（如节拍器 60、手指第几关节、弓段几分）。",
  apply: "250-450 字。在真实音乐中怎么用：曲目、织体、与其它声部的关系。",
  task: "150-300 字。编号任务，可验证：① ② ③",
  panels: [ /* 0-2 张图 */ ]
}
```

**大师课节点**（lv:"大师课"）必须这样写：选定一个真实存在的技术难点或作品片段，讲清楚
① 难点到底难在哪（物理/生理原因）② 三种不同处理方式 ③ 各自的声音结果 ④ 练习路径。
例如钢琴："同一句旋律，用手指贴键 vs 抬指 vs 用手臂重量，声音有何不同"。

---

## panels：图解规格（SVG 矢量图，不是 AI 生图）

```js
{ n:"①", t:"图标题", type:"<下面的 type>", ...参数 }
```

可用 type 与参数（**只准用这些，参数名必须完全一致**）：

| type | 用途 | 参数 |
|---|---|---|
| `spec` | 速览表格 | `title,sub,rows:[[标签,值],...]` |
| `range` | 音域对照条 | `title,sub,note, ranges:[{nm,from,to,c}]` from/to 是 MIDI 音高号（钢琴最低 A0=21，中央 C=60，A4=69，最高 C8=108）；c ∈ gold/pink/violet/good/neon/dim |
| `compare` | 左右对比 | `l:{t,items:[]}, r:{t,items:[]}, note,cap` |
| `steps` | 步骤流程 | `title, items:[{t,d}]` |
| `flow` | 流程链 | `items:[{t,d}], loop, loopLb` |
| `stack` | 音堆叠（和弦/音程） | `items:[{n,sb,c,iv,gapLb}], titles:[], caps:[], top, gap` items 也可以是数组=多列 |
| `keys` | **钢琴/键盘图** | `lo,hi` MIDI 范围；`marks:[{m,lb,c}]` 标音；`spans:[{a,b,lb,c}]` 画弧标音程；`top,kh,noNames` |
| `fret` | **吉他指板（和弦图）** | `strings:[{n,lb}], tuning, dots:[{s,f,lb}], frets, root, note, nums` |
| `fretpos` | **指板坐标（把位/音阶）** | `frets, marks:[{s,f,lb}], note` — 纵弦横品，适合画五声音阶把位 |
| `staff` | **五线谱** | `notes:[{n,oct,lb,c}], clef, gap, cap` |
| `harp` | 竖琴踏板 | `pos:[{state:'n'\|'b'\|'s',lb}], note` |
| `bowzone` | **运弓分区** | `zones:[{a,b,lb,c}], bow:[{a,b,lb}]` |
| `pipes` | **管乐指孔/箫指法** | `holes:[{n,lb,st:'o'\|'x'}], bottom` |
| `sheng` | 笙管位圆环 | `center, groups:[{r,items:[{n,c}]}], notes:[]` |
| `mallet` | **木琴/马林巴音板排列** | `from,to`(MIDI), `zones:[{a,b,lb}]` |
| `grip` | 握槌示意 | `views:[{nm,twy:'two'\|'cross'\|'four',note}]` |
| `handpan` | **手碟音面** | `ding, fields:[{n,lb}], notes:[]` |
| `bars` | 柱状对比 | `rows:[{nm,v,c,lb}], max, unit` |
| `axes` | 坐标曲线 | `xName,yName,xl0,xl1,yl0,yl1, points:[[x,y],...]` |
| `timeline` | 时间轴 | `items:[{t,lb,s,c}], base, zig` |
| `tracks` | 多轨视图 | `total,beats,tracks:[{n,blocks:[{x,w,t,c}]}], marks:[]` |
| `roll` | 钢琴卷帘 | `len, rows:[音名字符串], notes:[{r,x,w,t,c}], note` |
| `note` | 要点卡 | `title, items:[]` |
| `cycle` | 圆环 | `items:[{t,c}], center` |
| `spectrum` | 频谱 | `bands:[{lo,hi,nm,c,lb}]` |
| `env` | 包络曲线 | `stages:[{t,v,lb}], y0,y1,h` |
| `wave` | 波形对比 | `rows:[{nm,lb,...}]` |
| `daw` | DAW 界面 | `title,topbar:[],total,beats,tracks:[{n,r,blocks:[{x,w,t}]}],notes:[{x,y,lb,tail}]` |
| `prog` | 和弦进行格 | `bars:[{rn,cells:[]}], beats` |
| `stage` | 舞台/乐队座位平面 | `blocks:[{x,y,w,h,nm,c}], conductor, grid` |

**总览 3 张图必配**：① 结构/部件图 ② 音域对照 `range` ③ `spec` 速览。
**每个节点 0-2 张**，优先画：姿势/手型/技术动作/音域位置/频谱/名师没有就算了，宁缺毋滥。

---

## 绝对禁止

1. **不得出现中英文混排的无意义英文 token**（上一版曾出现 `Empirical`、`vtuber`、`空高い` 之类）。写完后必须自检：
   `node -e "global.window={ML_DATA:{INSTRUMENTS:[]}};new Function('window',require('fs').readFileSync('js/inst-xxx.js','utf8'))(global.window);console.log(Object.keys(global.window.INSTRUMENT_LIB.xxx.nodes).length)"`
   再用正则扫一遍可疑 ASCII 词。
2. **不得编造**历史人物的话、年份、作品编号、曲目。不确定就写"待资料补充"或"据通行说法"。
3. **不得**用同一套模板只换乐器名——每件乐器的节点标题、技术名词必须属于它自己。
4. **不要**用大量 emoji 装点正文；emoji 只出现在 `em` 字段和图 legend 里。
5. 文件必须 UTF-8，**不要**出现 `\u2581` 这类方块控制字符或日文假名/韩文。
6. 字符串里如果要写双引号请用中文引号「」或转义，避免 JS 语法错误。

## 完成后自检
```
cd 项目根目录
node -e "global.window={ML_DATA:{INSTRUMENTS:[]}};new Function('window',require('fs').readFileSync('js/inst-xxx.js','utf8'))(global.window);const L=global.window.INSTRUMENT_LIB.xxx;console.log('nodes',L.nodes.length,'kb',Object.keys(L.kb).length);"
```
再检查全文件无非中日文异常字符。
