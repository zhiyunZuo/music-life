/* ============================================================
   MUSIC LIFE · 游戏数据层
   ============================================================ */
window.ML_DATA = (function(){
  /* ---------- 技能树 ---------- */
  const SKILL_TREE = [
    {
      key:"PIANO", name:"PIANO 钢琴", em:"🎹", color:"#e0a96d",
      desc:"从基础指法到古典大师与即兴演奏的完整钢琴路线。",
      nodes:[
        {id:"p1",nm:"基础指法",em:"🎹",lv:1,exp:60,req:null,desc:"手型、音阶、连奏与断奏。"},
        {id:"p2",nm:"视奏入门",em:"📖",lv:2,exp:90,req:"p1",desc:"快速读谱并弹奏简单作品。"},
        {id:"p3",nm:"古典演奏",em:"🎼",lv:3,exp:140,req:"p2",desc:"巴赫、莫扎特等古典曲目。"},
        {id:"p4",nm:"和声伴奏",em:"🎵",lv:3,exp:140,req:"p2",desc:"为旋律配左手伴奏型。"},
        {id:"p5",nm:"即兴伴奏",em:"✨",lv:4,exp:200,req:"p4",desc:"现场为歌手实时伴奏。"},
        {id:"p6",nm:"Jazz Piano",em:"🎷",lv:5,exp:280,req:"p3",desc:"摇摆、蓝调与爵士和声。"},
        {id:"p7",nm:"流行钢琴",em:"🎤",lv:5,exp:260,req:"p4",desc:"弹唱编配与流行织体。"},
        {id:"p8",nm:"钢琴编配",em:"🎛",lv:6,exp:340,req:"p5",desc:"为乐队/弦乐编写钢琴声部。"},
        {id:"p9",nm:"即兴钢琴",em:"🌀",lv:7,exp:420,req:"p6",desc:"自由即兴与动机发展。"},
        {id:"p10",nm:"钢琴大师",em:"👑",lv:8,exp:560,req:"p9",desc:"PIANO MASTER MODE 精通。"}
      ]
    },
    {
      key:"THEORY", name:"THEORY 乐理", em:"🎼", color:"#9d4edd",
      desc:"音程、和弦、和声、对位与曲式的理论体系。",
      nodes:[
        {id:"t1",nm:"音程",em:"↔",lv:1,exp:50,req:null,desc:"识别与构写各种音程。"},
        {id:"t2",nm:"音阶调式",em:"📏",lv:1,exp:60,req:null,desc:"大小调与教会调式。"},
        {id:"t3",nm:"三和弦",em:"🔺",lv:2,exp:90,req:"t1",desc:"大/小/减/增三和弦。"},
        {id:"t4",nm:"七和弦",em:"🔻",lv:3,exp:140,req:"t3",desc:"属七、小七、半减七等。"},
        {id:"t5",nm:"和声基础",em:"🧱",lv:3,exp:150,req:"t3",desc:"I–IV–V 与正三和弦。"},
        {id:"t6",nm:"四部和声",em:"🎼",lv:4,exp:210,req:"t5",desc:"声部进行与禁忌。"},
        {id:"t7",nm:"终止式",em:"🔚",lv:4,exp:200,req:"t5",desc:"正格、变格、半终止。"},
        {id:"t8",nm:"转调离调",em:"🔀",lv:5,exp:300,req:"t6",desc:"共同和弦与离调。"},
        {id:"t9",nm:"复调对位",em:"🎭",lv:6,exp:380,req:"t7",desc:"二/三声部对位法则。"},
        {id:"t10",nm:"曲式分析",em:"🗺",lv:7,exp:460,req:"t8",desc:"奏鸣曲式、变奏曲式等。"}
      ]
    },
    {
      key:"EAR", name:"EAR 听觉", em:"👂", color:"#00f5d4",
      desc:"单音、音程、和弦、和声进行与听写训练。",
      nodes:[
        {id:"e1",nm:"单音模唱",em:"🎯",lv:1,exp:50,req:null,desc:"听辨并唱出音高。"},
        {id:"e2",nm:"音程听辨",em:"↔",lv:2,exp:90,req:"e1",desc:"识别各类音程。"},
        {id:"e3",nm:"和弦听辨",em:"🔺",lv:2,exp:100,req:"e2",desc:"分辨和弦性质。"},
        {id:"e4",nm:"和声进行",em:"🔗",lv:3,exp:150,req:"e3",desc:"识别 I–IV–V 等走向。"},
        {id:"e5",nm:"节奏听写",em:"🥁",lv:3,exp:140,req:"e1",desc:"记录节拍与节奏型。"},
        {id:"e6",nm:"旋律听写",em:"🎵",lv:4,exp:210,req:"e4",desc:"听记短旋律。"},
        {id:"e7",nm:"和声听写",em:"🎼",lv:5,exp:300,req:"e6",desc:"听记四部和声。"},
        {id:"e8",nm:"内心听觉",em:"🧠",lv:6,exp:380,req:"e7",desc:"不发声也能想象音响。"},
        {id:"e9",nm:"绝对音感",em:"🌟",lv:8,exp:600,req:"e8",desc:"听音即知名（稀有）。"}
      ]
    },
    {
      key:"PROD", name:"PRODUCTION 制作", em:"💻", color:"#ff5d8f",
      desc:"从 DAW 新手到完整作品产出的电脑音乐路线。",
      nodes:[
        {id:"d1",nm:"DAW 新手",em:"🖥",lv:1,exp:60,req:null,desc:"认识 DAW / MIDI / BPM。"},
        {id:"d2",nm:"MIDI 编辑",em:"🎹",lv:2,exp:100,req:"d1",desc:"Piano Roll / 量化 / 力度。"},
        {id:"d3",nm:"鼓组编排",em:"🥁",lv:3,exp:150,req:"d2",desc:"Kick/Snare/Hi-hat 律动。"},
        {id:"d4",nm:"Bass 编写",em:"🎸",lv:3,exp:150,req:"d2",desc:"根音与 Walking Bass。"},
        {id:"d5",nm:"和弦铺陈",em:"🎛",lv:4,exp:210,req:"d3",desc:"为旋律配和弦织体。"},
        {id:"d6",nm:"编曲",em:"🎼",lv:5,exp:300,req:"d5",desc:"多声部分层编曲。"},
        {id:"d7",nm:"混音",em:"🎚",lv:6,exp:380,req:"d6",desc:"EQ / 压缩 / 混响 / 声场。"},
        {id:"d8",nm:"完整作品",em:"💿",lv:7,exp:480,req:"d7",desc:"Intro→Chorus→Outro。"},
        {id:"d9",nm:"制作人",em:"🎧",lv:8,exp:600,req:"d8",desc:"独立发行与母带。"}
      ]
    },
    {
      key:"PERF", name:"PERFORM 演出", em:"🎤", color:"#f2c879",
      desc:"舞台经验、合奏、即兴现场与演出心理。",
      nodes:[
        {id:"f1",nm:"舞台基础",em:"🎪",lv:1,exp:60,req:null,desc:"站姿、眼神与紧张管理。"},
        {id:"f2",nm:"合奏协作",em:"🤝",lv:2,exp:100,req:"f1",desc:"与乐队/乐团配合。"},
        {id:"f3",nm:"现场即兴",em:"⚡",lv:4,exp:220,req:"f2",desc:"Solo 与互动。"},
        {id:"f4",nm:"专场演出",em:"🌟",lv:6,exp:400,req:"f3",desc:"策划并交付个人专场。"},
        {id:"f5",nm:"音乐人品牌",em:"📣",lv:7,exp:480,req:"f4",desc:"建立受众与形象。"}
      ]
    }
  ];

  /* ---------- 世界地图 ---------- */
  const REGIONS = [
    {id:"classical",nm:"Classical City",em:"🎼",ds:"古典演奏与作曲家故居",unlock:1,grad:"linear-gradient(135deg,#1c2942,#3a2a55)"},
    {id:"harmony",nm:"Harmony Forest",em:"🌲",ds:"四部和声与调性迷宫",unlock:1,grad:"linear-gradient(135deg,#16302a,#1c2942)"},
    {id:"earcave",nm:"Ear Training Cave",em:"👂",ds:"听觉试炼洞窟",unlock:1,grad:"linear-gradient(135deg,#0d1424,#22304f)"},
    {id:"proddist",nm:"Producer District",em:"💻",ds:"电脑音乐工作室街区",unlock:3,grad:"linear-gradient(135deg,#3a1830,#1c2942)"},
    {id:"guitar",nm:"Guitar Street",em:"🎸",ds:"街头吉他手与六线谱",unlock:2,grad:"linear-gradient(135deg,#2a1c10,#1c2942)"},
    {id:"orchestra",nm:"Orchestra Hall",em:"🎻",ds:"交响乐团排练厅",unlock:4,grad:"linear-gradient(135deg,#241a3a,#1c2942)"},
    {id:"eastern",nm:"Eastern Music Village",em:"🎋",ds:"东方民乐与五声调式",unlock:2,grad:"linear-gradient(135deg,#103024,#1c2942)"},
    {id:"stage",nm:"Performance Stage",em:"🎤",ds:"聚光灯下的舞台",unlock:2,grad:"linear-gradient(135deg,#3a2a10,#1c2942)"},
    {id:"film",nm:"Film Music Studio",em:"🎬",ds:"影视配乐棚",unlock:5,grad:"linear-gradient(135deg,#10243a,#1c2942)"},
    {id:"game",nm:"Game Music Lab",em:"🎮",ds:"游戏音乐实验场",unlock:5,grad:"linear-gradient(135deg,#1a1030,#22304f)"},
    {id:"jazz",nm:"Jazz Club",em:"🎷",ds:"午夜爵士俱乐部",unlock:4,grad:"linear-gradient(135deg,#2a1030,#1c2942)"},
    {id:"exp",nm:"Experimental Lab",em:"🌌",ds:"先锋与电子实验",unlock:6,grad:"linear-gradient(135deg,#102a3a,#2a1030)"}
  ];

  /* ---------- 乐器学院 ---------- */
  const INSTRUMENTS = [
    {id:"piano",nm:"钢琴",em:"🎹",ds:"键盘之王，音乐能力核心",mentor:"古典导师",detLevels:8},
    {id:"guitar",nm:"吉他",em:"🎸",ds:"和弦、扫弦与即兴",mentor:"吉他导师",detLevels:8},
    {id:"violin",nm:"小提琴",em:"🎻",ds:"持弓、音准与弓法",mentor:"弦乐导师",detLevels:8},
    {id:"sheng",nm:"笙",em:"🎋",em2:true,ds:"簧片和声乐器",mentor:"民乐导师",detLevels:6},
    {id:"xiao",nm:"箫",em:"🪈",ds:"气声与意境",mentor:"民乐导师",detLevels:6},
    {id:"flute",nm:"长笛",em:"🎶",ds:"木管明亮音色",mentor:"弦乐导师",detLevels:6},
    {id:"cello",nm:"大提琴",em:"🎻",ds:"低音弦乐歌唱性",mentor:"弦乐导师",detLevels:6},
    {id:"voice",nm:"声乐",em:"🎤",ds:"人声乐器与气息",mentor:"表演导师",detLevels:6}
  ];

  /* ---------- 职业树 ---------- */
  const CAREERS = [
    {id:"pianist",name:"钢琴家路线",em:"🎹",nodes:[
      {nm:"音乐毕业生",ds:"起点"},
      {nm:"钢琴陪练 / 教师",ds:"积累教学经验"},
      {nm:"职业伴奏者",ds:"舞台与录音伴奏"},
      {nm:"音乐会演奏者",ds:"独奏音乐会"},
      {nm:"职业钢琴家",ds:"巡演与唱片"}
    ]},
    {id:"composer",name:"作曲路线",em:"🎼",nodes:[
      {nm:"音乐毕业生",ds:"起点"},
      {nm:"独立作曲",ds:"短片与委托"},
      {nm:"游戏音乐",ds:"互动配乐"},
      {nm:"影视配乐",ds:"电影电视剧"},
      {nm:"职业作曲家",ds:"署名作品集"}
    ]},
    {id:"producer",name:"制作人路线",em:"💻",nodes:[
      {nm:"音乐毕业生",ds:"起点"},
      {nm:"Bedroom Producer",ds:"卧室制作"},
      {nm:"独立制作人",ds:"接单制作"},
      {nm:"编曲人",ds:"商业编曲"},
      {nm:"资深音乐制作人",ds:"厂牌与艺人"}
    ]},
    {id:"teacher",name:"教育路线",em:"🎓",nodes:[
      {nm:"音乐毕业生",ds:"起点"},
      {nm:"陪练",ds:"一对一指导"},
      {nm:"音乐教师",ds:"机构任教"},
      {nm:"高级教师",ds:"教研与考级"},
      {nm:"音乐教育工作者",ds:"体系化教学"}
    ]},
    {id:"indie",name:"综合音乐人",em:"🎤",nodes:[
      {nm:"音乐毕业生",ds:"起点"},
      {nm:"Independent Musician",ds:"自创作自演"},
      {nm:"音乐工作室",ds:"个人品牌工作室"},
      {nm:"多栖音乐人",ds:"演出+制作+教学"}
    ]}
  ];

  /* 职业属性模拟值（游戏数据，非现实保证） */
  const CAREER_STATS = {
    "高校教师":{income:4,stable:5,free:3,create:4,perf:2},
    "职业演奏者":{income:5,stable:2,free:3,create:2,perf:5},
    "编曲人":{income:4,stable:3,free:4,create:5,perf:2},
    "音乐制作人":{income:5,stable:2,free:4,create:5,perf:3},
    "音乐教师":{income:4,stable:4,free:3,create:3,perf:2},
    "独立音乐人":{income:5,stable:1,free:5,create:5,perf:5}
  };
  const CAREER_ROWS = [
    {name:"高校教师"},{name:"职业演奏者"},{name:"编曲人"},
    {name:"音乐制作人"},{name:"音乐教师"},{name:"独立音乐人"}
  ];

  /* ---------- 每日任务模板 ---------- */
  const QUEST_TEMPLATES = [
    {em:"🎹",t:"练习钢琴 30 分钟",d:"保持手指与乐感",exp:30,act:"piano"},
    {em:"👂",t:"听觉训练 10 分钟",d:"音程与和弦听辨",exp:20,act:"ear"},
    {em:"🎼",t:"完成一个和声挑战",d:"在和声实验室配一段进行",exp:40,act:"harmony"},
    {em:"💻",t:"完成 8 小节编曲",d:"在音乐工作室产出片段",exp:80,act:"studio"},
    {em:"🎵",t:"完成一首小作品",d:"记录到作品集",exp:200,act:"compose"},
    {em:"🎸",t:"练习吉他 20 分钟",d:"和弦转换与节奏型",exp:30,act:"guitar"},
    {em:"🎻",t:"小提琴音准练习",d:"空弦与音阶",exp:30,act:"violin"},
    {em:"🎋",t:"笙箫呼吸练习",d:"长音与音色控制",exp:25,act:"eastern"},
    {em:"🎧",t:"听音乐 15 分钟",d:"分析一首作品的结构",exp:15,act:"listen"},
    {em:"🌀",t:"即兴挑战 1 次",d:"为一个动机即兴",exp:50,act:"improv"}
  ];

  /* ---------- 随机事件 ---------- */
  const EVENTS = [
    {em:"🎤",title:"朋友突然问你能不能帮忙伴奏",
     desc:"周末一场小型聚会，朋友临时需要钢琴伴奏，曲目未知。",
     opts:[
       {t:"爽快接下",need:{piano:3},ok:"你顺利完成了伴奏，大家很开心。",gold:200,exp:80,rep:5,port:"🎹 第一次临时伴奏"},
       {t:"先问曲目再决定",need:{piano:2},ok:"你确认是熟悉风格后接下，轻松搞定。",gold:150,exp:60,rep:3,port:null},
       {t:"婉拒",need:null,ok:"你今天想专注练习，礼貌拒绝。",gold:0,exp:0,rep:0,port:null}
     ]},
    {em:"🎬",title:"一个短视频团队寻找配乐",
     desc:"需要一段 30 秒氛围音乐，要求 DAW ≥ 5、作曲 ≥ 4。",
     opts:[
       {t:"接下项目",need:{prod:5,compose:4},ok:"你交付了配乐，获得报酬与好评。",gold:800,exp:200,rep:8,port:"💻 第一笔配乐收入"},
       {t:"推荐朋友",need:null,ok:"你介绍了合适的人选，维持了人脉。",gold:0,exp:20,rep:2,port:null},
       {t:"暂不接单",need:null,ok:"你评估时间后选择专注提升。",gold:0,exp:0,rep:0,port:null}
     ]},
    {em:"🎼",title:"社区合唱团招募伴奏",
     desc:"长期合作，每周一次，要求和声 ≥ 4、钢琴 ≥ 4。",
     opts:[
       {t:"加入",need:{piano:4,theory:4},ok:"稳定的实践机会，声望与人脉双增长。",gold:500,exp:120,rep:10,port:"🎹 合唱团驻团伴奏"},
       {t:"先试一次",need:{piano:3},ok:"试奏成功，对方希望长期合作。",gold:200,exp:60,rep:4,port:null},
       {t:"不考虑",need:null,ok:"你暂时不想被固定排期占用。",gold:0,exp:0,rep:0,port:null}
     ]},
    {em:"💸",title:"设备促销：一款心仪的 MIDI 键盘",
     desc:"限时折扣，但会支出一笔钱。",
     opts:[
       {t:"立刻入手",need:null,ok:"新键盘让录入效率大增，制作更顺手。",gold:-600,exp:30,rep:0,port:"🎹 新 MIDI 键盘"},
       {t:"再等等",need:null,ok:"你决定把钱留作项目周转。",gold:0,exp:0,rep:0,port:null}
     ]},
    {em:"🏆",title:"本地音乐比赛报名开启",
     desc:"需要提交一段演奏视频，要求钢琴 ≥ 6 或 小提琴 ≥ 6。",
     opts:[
       {t:"报名参赛",need:{piano:6},ok:"你精心准备并获奖，履历添一笔。",gold:1000,exp:260,rep:15,port:"🏆 第一次音乐比赛"},
       {t:"再练练",need:null,ok:"你觉得还没准备好，继续打磨。",gold:0,exp:40,rep:0,port:null}
     ]}
  ];

  /* ---------- 徽章 ---------- */
  const BADGES = [
    {id:"piano_m",em:"🎹",nm:"Piano Master",cond:s=>s.skills.piano>=8},
    {id:"sharp_e",em:"👂",nm:"Sharp Ear",cond:s=>s.skills.ear>=6},
    {id:"harm_w",em:"🎼",nm:"Harmony Wizard",cond:s=>s.skills.theory>=7},
    {id:"producer",em:"💻",nm:"Producer",cond:s=>s.skills.prod>=7},
    {id:"composer",em:"🎵",nm:"Composer",cond:s=>s.portfolio.filter(p=>p.type==="compose").length>=1},
    {id:"performer",em:"🎤",nm:"Performer",cond:s=>s.performances>=1},
    {id:"first_income",em:"💰",nm:"First Income",cond:s=>s.income>0},
    {id:"world_exp",em:"🌌",nm:"Explorer",cond:s=>s.level>=6}
  ];

  /* ---------- 导师知识（关键词 → 回答） ---------- */
  const MENTOR_KB = [
    {k:["忧伤","悲伤","为什么忧伤","小调"],a:"小调（尤其是自然小调）以 '6 1 2 3 4 5 6' 为主音关系，三级音比大调低半音，色彩天然偏暗。加上 '降' 的六级、七级（和声/旋律小调）会更‘叹息’。你可以试听 a 小调 vs A 大调，体会三级音那半音的差别。"},
    {k:["解决","不能这样解决","导音"],a:"在功能和声中，导音（VII 级）强烈倾向主音，属七和弦的 3 个下属方向音需‘解决’到主和弦。若让导音跳到其他音，听觉上像‘没回家’。这是为什么 V→I 最稳定、而 vii° 也常解决到 I。"},
    {k:["肖邦","chopin","为什么这么写"],a:"肖邦常把和声‘色彩化’而非功能化——比如用拿波里和弦、增六和弦制造延宕，再用 rubato（自由速度）让旋律‘呼吸’。他写的不只是音符，而是‘语气’。建议你对照作品分析里的夜曲 op.9 no.2 看他的左手分解与右手装饰。"},
    {k:["不会即兴","怎么即兴","即兴"],a:"即兴不是‘凭空发明’，而是‘在框架里说话’。先固定一个和弦进行（如 I–vi–IV–V），左手弹简单伴奏型，右手只用调内音阶‘造句’，像聊天一样有问有答。每天 5 分钟比一次练 1 小时更有效。"},
    {k:["配和弦","怎么配","这段旋律","harmony"],a:"给旋律配和弦先看‘强拍音’落在哪个和弦音上。一般：落在 1/3/5 多用 I；落在 6 多用 vi；落在 4 多用 IV；落在 2 多用 ii 或 V。注意每小节换和弦别太密，让低音有‘方向感’。"},
    {k:["编曲","很空","太空","编曲空"],a:"‘空’通常是因为：① 只有旋律没有中声部填充；② 节奏全在一样的位置；③ 缺少低频（Bass）与高频（Hi-hat/Pad）。试试加一层 Pad 铺底、一个 Bass 给根音、再用轻打击乐点出节拍。"},
    {k:["钢琴好但不会即兴"],a:"你已有扎实的技术底子，这是优势。即兴缺的往往不是手指，而是‘和声词汇’和‘乐句语感’。建议从‘给已知旋律换伴奏型’开始，再逐步加经过音，别急着炫技。"},
    {k:["收入","能赚多少","赚钱","报价"],a:"游戏里的收入是模拟值，受职业、等级、地区、声望、客户数影响，且会有淡季与项目失败。现实里音乐收入高度不稳定，请把它当作‘人生模拟’的乐趣，而非职业保证。"},
    {k:["练什么","今天练","计划","每天"],a:"根据你现在的状态，我建议：先完成今日任务里的听力与钢琴练习保住手感，再挑一个技能树节点推进。想高效就‘短时高频’，想突破就周末做完整作品。"},
    {k:["转调","离调","modulation"],a:"转调是‘换家’，离调是‘出门逛一圈再回来’。常用手法：用共同和弦（两调共享的和弦）做桥梁，比如 C 大调的 Am 同时也是 a 小调的 VI 级，可自然滑入 a 小调。"},
    {k:["混音","eq","压缩","混响","reverb"],a:"混音三件套：EQ 负责‘各自占位’（切掉打架的频段），压缩负责‘控制动态’，混响负责‘空间感’。新手口诀：先 EQ 清理，再轻微压缩，最后一点点混响，别一上来就加很多。"},
    {k:["五声","宫商角徵羽","民乐","笙","箫"],a:"中国五声调式是 宫(1) 商(2) 角(3) 徵(5) 羽(6)，没有小二度碰撞，天然和谐。笙擅长‘和音铺底’，箫擅长‘气韵线条’，和钢琴/弦乐叠在一起会很有东方电影感。"}
  ];

  /* ---------- 能力检测结构 ---------- */
  const ASSESS = {
    intervals:[
      {semi:1,name:"小二度"},{semi:2,name:"大二度"},{semi:3,name:"小三度"},
      {semi:4,name:"大三度"},{semi:5,name:"纯四度"},{semi:7,name:"纯五度"},
      {semi:8,name:"小六度"},{semi:9,name:"大六度"},{semi:12,name:"纯八度"}
    ],
    chords:[
      {type:"maj",name:"大三和弦",iv:[0,4,7]},
      {type:"min",name:"小三和弦",iv:[0,3,7]},
      {type:"dom7",name:"属七和弦",iv:[0,4,7,10]},
      {type:"dim7",name:"减七和弦",iv:[0,3,6,9]}
    ]
  };

  /* ---------- 教学系统：课程 / 教材路径 / 词典 ---------- */
  const PATHS = [
    {id:"h1",name:"HARMONY I · 基础和声",emoji:"🎼",lessons:["triad","majmin","dom7","cadence"]},
    {id:"h2",name:"HARMONY II · 离调与副属",emoji:"🎼",lessons:["secdom"]},
    {id:"eas",name:"EASTERN · 东方音乐",emoji:"🎋",lessons:["fivescale"]}
  ];
  const LESSONS = [
    {
      id:"triad", title:"三和弦", en:"Triad", emoji:"🔺", path:"Harmony I", tier:"Beginner", prereq:[],
      phenomenon:{ question:"先听两个例子：A 是单个音，B 是一组音。你听到的是‘一个音’还是‘一组音（和弦）’？",
        a:{label:"A · 单个音 C", audio:{type:"seq",notes:[{m:60,d:1.1}]}},
        b:{label:"B · 一组音 C-E-G", audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:1.1,dur:1.0}} },
      concept:{
        simple:"三和弦就是把三个音按‘三度’叠起来：根音、三音、五音。比如 C-E-G。",
        pro:"Triad = 根音(root) + 三度音 + 五度音 的纵向结合，是大多数西方和声的最小单位。大三和弦 = 根+大三度+纯五度；小三和弦 = 根+小三度+纯五度。",
        realWork:"贝多芬《致爱丽丝》开头就是 a 小调的三和弦分解；绝大多数流行歌的‘柱式和弦’也是三和弦。",
        diagram:{root:60,iv:[0,4,7]} },
      interact:{type:"build", root:60, target:[60,64,67], hint:"在键盘上依次点出 C · E · G（根音 三音 五音）。"},
      practices:[
        {type:"hear", prompt:"听这个和弦，它是大三还是小三？", audio:{type:"chord",root:60,iv:[0,4,7]}, options:["大三和弦","小三和弦"], answer:0},
        {type:"hear", prompt:"再听一个，判断大/小：", audio:{type:"chord",root:60,iv:[0,3,7]}, options:["大三和弦","小三和弦"], answer:1},
        {type:"build", target:[60,63,67], note:"构建一个 C 小三和弦（把三音降低半音）。"}
      ],
      challenge:{type:"build", target:[60,64,67], note:"挑战：不看提示，独立构建 C 大三和弦。"}
    },
    {
      id:"majmin", title:"大三和弦 / 小三和弦", en:"Major vs Minor Triad", emoji:"🌗", path:"Harmony I", tier:"Beginner", prereq:["triad"],
      phenomenon:{ question:"A 与 B 都是三和弦，但色彩不同。哪一个听起来更明亮/温暖？",
        answer:0,
        a:{label:"A", audio:{type:"chord",root:60,iv:[0,4,7]}},
        b:{label:"B", audio:{type:"chord",root:60,iv:[0,3,7]}} },
      concept:{
        simple:"区别只在‘中间那个音’：大三和弦中间是大三度（亮），小三和弦中间是小三度（暗）。",
        pro:"第三音与主音的音程决定和弦的‘大小’属性。大三度=4 半音，小三度=3 半音。这是色彩明暗的物理来源。",
        realWork:"同一首歌换成小三和弦瞬间变忧伤（如《生日快乐》结尾）。",
        diagram:{root:60,iv:[0,4,7]} },
      interact:{type:"build", root:60, target:[60,63,67], hint:"构建 C 小三和弦：C · E♭ · G。"},
      practices:[
        {type:"hear", prompt:"听辨：明亮的是大三还是小三？", audio:{type:"chord",root:62,iv:[0,3,7]}, options:["大三和弦","小三和弦"], answer:1},
        {type:"hear", prompt:"再听：", audio:{type:"chord",root:65,iv:[0,4,7]}, options:["大三和弦","小三和弦"], answer:0},
        {type:"build", target:[62,65,69], note:"构建 D 大三和弦。"}
      ],
      challenge:{type:"build", target:[60,63,67], note:"挑战：凭听觉构建 C 小三和弦。"}
    },
    {
      id:"dom7", title:"属七和弦", en:"Dominant 7th", emoji:"🔻", path:"Harmony I", tier:"University", prereq:["triad"],
      phenomenon:{ question:"A 在 C 上停留；B 经过一个‘紧张’和弦再回到 C。哪一种更有‘回家/解决’的方向感？",
        a:{label:"A · C – C", audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:1.1,dur:1.0}},
        b:{label:"B · G7 → C", audio:{type:"prog",chords:[{root:55,iv:[0,4,7,10]},{root:60,iv:[0,4,7]}],step:1.2,dur:1.1}} },
      concept:{
        simple:"属七和弦 = 大三和弦再叠一个‘小七度’。在 C 大调里是 G7（G-B-D-F）。它很‘想回家’到 C。",
        pro:"V7 = 属和弦叠加小七度，含导音(7)与下属方向音(4)，双重拉力使其强烈解决到 I。是功能和声的核心张力来源。",
        realWork:"几乎每首流行/古典作品的终止都用到 V7→I（如《欢乐颂》结尾）。",
        diagram:{root:55,iv:[0,4,7,10]} },
      interact:{type:"build", root:55, target:[55,59,62,65], hint:"构建 G7：G · B · D · F（根 三 五 小七）。"},
      practices:[
        {type:"hear", prompt:"听这个和弦，它是普通大三还是属七（更紧张）？", audio:{type:"chord",root:55,iv:[0,4,7,10]}, options:["大三和弦","属七和弦"], answer:1},
        {type:"hear", prompt:"再听：", audio:{type:"chord",root:55,iv:[0,4,7]}, options:["大三和弦","属七和弦"], answer:0},
        {type:"build", target:[55,59,62,65], note:"构建 G7。"}
      ],
      challenge:{type:"build", target:[57,60,64,67], note:"挑战：构建 A7（A-C♯-E-G）。"}
    },
    {
      id:"secdom", title:"副属和弦", en:"Secondary Dominant", emoji:"🧭", path:"Harmony II", tier:"University", prereq:["dom7"],
      phenomenon:{ question:"A 是普通 I–IV–V–I；B 在 V 之前插入一个‘临时属和弦’。哪一种更有‘临时想去别处再回来’的推动力？",
        a:{label:"A · I–IV–V–I", audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:53,iv:[0,4,7]},{root:55,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:0.9,dur:0.8}},
        b:{label:"B · V/V → V → I", audio:{type:"prog",chords:[{root:62,iv:[0,4,7,10]},{root:55,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:1.0,dur:0.9}} },
      concept:{
        simple:"副属和弦就是‘临时把别的和弦当成主，给它配一个属和弦’。V/V 就是‘V 的属’，在 C 调里是 D7，它急着解决到 G。",
        pro:"Secondary dominant = 对调内非主和弦(通常是 ii,iii,vi)建立的属/属七，制造离调。V/V 因含 #4 音产生强烈的‘去 V’拉力。",
        realWork:"流行歌《Hello》副歌、爵士标准曲大量使用；让和声‘拐个弯’再回来。",
        diagram:{root:62,iv:[0,4,7,10]} },
      interact:{type:"build", root:62, target:[62,66,69,72], hint:"构建 D7（V/V）：D · F♯ · A · C。"},
      practices:[
        {type:"hear", prompt:"听：这段结尾停在 V/V→V 还是普通 V→I？", audio:{type:"prog",chords:[{root:62,iv:[0,4,7,10]},{root:55,iv:[0,4,7]}],step:1.0,dur:0.9}, options:["普通 V→I","V/V→V（有副属）"], answer:1},
        {type:"mcq", prompt:"在 C 大调，V/V 是哪一个和弦？", options:["G7","D7","A7","C7"], answer:1},
        {type:"build", target:[62,66,69,72], note:"构建 D7（V/V）。"}
      ],
      challenge:{type:"build", target:[64,68,71,74], note:"挑战：构建 E7（V/vi 的属）。"}
    },
    {
      id:"cadence", title:"终止式", en:"Cadence", emoji:"🔚", path:"Harmony I", tier:"Beginner", prereq:["triad"],
      phenomenon:{ question:"A 停在 V（开放感）；B 停在 I（收束感）。哪一个更像‘句子结束’？",
        a:{label:"A · I → V（半终止）", audio:{type:"prog",chords:[{root:60,iv:[0,4,7]},{root:55,iv:[0,4,7]}],step:1.0,dur:1.0}},
        b:{label:"B · V → I（完全终止）", audio:{type:"prog",chords:[{root:55,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:1.0,dur:1.0}} },
      concept:{
        simple:"终止式就是‘和弦的标点符号’。V→I 是句号（完全终止）；I→V 是逗号（半终止）。",
        pro:"Cadence = 和声进行的收束方式。正格终止(V–I)、变格终止(IV–I)、半终止(…–V)、假终止(V–vi)各有不同语法功能。",
        realWork:"作曲家靠终止式划分乐句；你写歌时‘副歌前用半终止吊胃口’就是它。",
        diagram:{root:55,iv:[0,4,7]} },
      interact:{type:"build", root:55, target:[55,59,62], hint:"构建 V 和弦 G（为 V→I 做准备）。"},
      practices:[
        {type:"hear", prompt:"听：这是收束的完全终止，还是开放的半终止？", audio:{type:"prog",chords:[{root:55,iv:[0,4,7]},{root:60,iv:[0,4,7]}],step:1.0,dur:1.0}, options:["半终止(…V)","完全终止(V–I)"], answer:1},
        {type:"mcq", prompt:"‘句号’一样的终止通常是？", options:["I→V","V→I","I→IV","IV→II"], answer:1},
        {type:"build", target:[55,59,62], note:"构建 G 大三和弦。"}
      ],
      challenge:{type:"build", target:[60,64,67], note:"挑战：构建 I 和弦 C，完成 V→I。"}
    },
    {
      id:"fivescale", title:"五声调式", en:"Pentatonic", emoji:"🎋", path:"Eastern", tier:"Beginner", prereq:[],
      phenomenon:{ question:"A 是自然大调音阶；B 去掉了容易‘碰撞’的音。哪一个更有‘东方/留白’的意境？",
        a:{label:"A · C 大调音阶", audio:{type:"seq",notes:[{m:60,d:0.3,gap:0.32},{m:62,d:0.3,gap:0.32},{m:64,d:0.3,gap:0.32},{m:65,d:0.3,gap:0.32},{m:67,d:0.3,gap:0.32},{m:69,d:0.3,gap:0.32},{m:71,d:0.3,gap:0.32},{m:72,d:0.5}]}},
        b:{label:"B · 五声音阶", audio:{type:"seq",notes:[{m:60,d:0.32,gap:0.36},{m:62,d:0.32,gap:0.36},{m:64,d:0.32,gap:0.36},{m:67,d:0.32,gap:0.36},{m:69,d:0.32,gap:0.36},{m:72,d:0.5}]}} },
      concept:{
        simple:"五声调式只有 5 个音（宫商角徵羽 = 1 2 3 5 6），没有小二度‘撞击’，所以怎么弹都和谐、有东方韵味。",
        pro:"Pentatonic = 去掉导音与小二度碰撞的五声集合，形成‘无半音紧张’的音响，是横跨中国与凯尔特等传统的共同语汇。",
        realWork:"《茉莉花》、无数国风/游戏配乐都建立在五声音阶上；它与钢琴/弦乐叠会更‘电影感’。",
        diagram:{root:60,iv:[0,2,4,7,9]} },
      interact:{type:"build", root:60, target:[60,62,64,67,69], hint:"在键盘上点出 C · D · E · G · A（五声）。"},
      practices:[
        {type:"hear", prompt:"听：这段是五声（柔和东方）还是七声大调？", audio:{type:"seq",notes:[{m:60,d:0.32,gap:0.36},{m:62,d:0.32,gap:0.36},{m:64,d:0.32,gap:0.36},{m:67,d:0.32,gap:0.36},{m:69,d:0.32,gap:0.36},{m:72,d:0.5}]}, options:["五声音阶","七声大调"], answer:0},
        {type:"mcq", prompt:"五声调式不含下面哪个音级？", options:["宫(1)","角(3)","徵(5)","导音(7)"], answer:3},
        {type:"build", target:[62,64,66,69,71], note:"构建 D 五声音阶（D-E-F♯-A-B）。"}
      ],
      challenge:{type:"build", target:[60,62,64,67,69], note:"挑战：凭听觉构建 C 五声音阶。"}
    }
  ];
  const VOCAB = [
    {w:"温柔",items:["Legato 连奏","柔和力度","中高音域","稀疏织体","6/7/9 延伸和弦","较慢或中速"],note:"这些只是常见手段，不是固定公式——同一感觉也可用不同手法实现。"},
    {w:"紧张",items:["不协和音","半音进行","密集节奏","强烈动态","不稳定和声(增/减)"],note:"紧张通常来自‘未解决的不协和’，解决后听众才松一口气。"},
    {w:"空灵",items:["高音区","大空间混响","开放五度/四度","延伸和弦","长延音"],note:"空灵 ≠ 什么都不弹，而是用‘留白 + 高频 + 空间’制造悬浮感。"},
    {w:"电影感",items:["弦乐垫底","宽广动态","半音/变化和声","低频铺底","留白与突变"],note:"电影感常靠‘铺垫—突变’的张力曲线，而非单一音色。"},
    {w:"孤独",items:["低密度织体","中低音区","较慢速度","开放和弦","较大留白"],note:"孤独常与‘少而远’的音响有关：东西不多，但每个音都听得见。"}
  ];
  const FEELINGS = [
    {f:"凌晨三点，一个人在城市走路", params:["低密度织体","较慢速度(≈58 BPM)","中低音区","开放和弦","较大留白"],
      exp:{type:"prog",chords:[{root:49,iv:[0,3,7]},{root:57,iv:[0,4,7,10]},{root:53,iv:[0,3,7]},{root:55,iv:[0,4,7]}],step:1.3,dur:1.1}},
    {f:"很温柔，但有一点孤独", params:["中高音域","稀疏旋律","柔和力度","延伸和弦","慢速"],
      exp:{type:"prog",chords:[{root:60,iv:[0,4,7,11]},{root:57,iv:[0,3,7,10]},{root:53,iv:[0,4,7,9]},{root:55,iv:[0,4,7]}],step:1.4,dur:1.2}},
    {f:"自由、明亮，像风一样", params:["五声音阶","中高音区","轻快速度","分解和弦","留白"],
      exp:{type:"seq",notes:[{m:72,d:0.25,gap:0.28},{m:74,d:0.25,gap:0.28},{m:76,d:0.25,gap:0.28},{m:79,d:0.25,gap:0.28},{m:81,d:0.4}]}},
    {f:"电影感 / 史诗", params:["弦乐垫底","宽广动态","变化和声","低频铺底"],
      exp:{type:"prog",chords:[{root:48,iv:[0,7,12]},{root:53,iv:[0,4,7]},{root:55,iv:[0,4,7,10]},{root:60,iv:[0,4,7]}],step:1.5,dur:1.3}}
  ];

  return {SKILL_TREE,REGIONS,INSTRUMENTS,CAREERS,CAREER_STATS,CAREER_ROWS,
    QUEST_TEMPLATES,EVENTS,BADGES,MENTOR_KB,ASSESS,PATHS,LESSONS,VOCAB,FEELINGS};
})();
