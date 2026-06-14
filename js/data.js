/**
 * IVL监管者人格测试 - 题库与选手数据库
 * 数据来源：测试题.xlsx — 17位真实IVL选手答题数据
 * 第五人格IVL职业联赛
 */

// ==================== 测试题目（来自Excel） ====================
const QUESTIONS = [
  {
    id: 1,
    title: '当队伍陷入绝境，而你必须四抓，你会？',
    options: [
      { key: 'A', text: '相信版本强势，版本就是一切！', scores: {} },
      { key: 'B', text: '相信绝活，不要小看我和TA的羁绊啊！', scores: { aggression: 1 } }
    ]
  },
  {
    id: 2,
    title: '你更认可？',
    options: [
      { key: 'A', text: '年少成名，老将不死！', scores: { achievement: 1 } },
      { key: 'B', text: '青春风暴，未来可期！', scores: { achievement: 0 } }
    ]
  },
  {
    id: 3,
    title: '你认为什么更能证明你的实力？',
    options: [
      { key: 'A', text: '客观数据，六边形战士！', scores: {} },
      { key: 'B', text: '荣誉大于一切！', scores: { tactical: 1 } }
    ]
  },
  {
    id: 4,
    title: '当你被遛了2分钟，才把求生挂上椅，你更倾向于？',
    options: [
      { key: 'A', text: '守椅或者打拦截，先保平再说', scores: {} },
      { key: 'B', text: '直接出去管密码机，只要我击倒得够快，就不用守椅', scores: { aggression: 1 } }
    ]
  },
  {
    id: 5,
    title: '你更喜欢哪个季节？',
    options: [
      { key: 'A', text: '春天', scores: {} },
      { key: 'B', text: '夏天', scores: {} },
      { key: 'C', text: '秋天', scores: {} },
      { key: 'D', text: '随便', scores: { flexibility: 1 } }
    ]
  },
  {
    id: 6,
    title: '你更擅长哪类监管？',
    options: [
      { key: 'A', text: '追击类', scores: {} },
      { key: 'B', text: '控场类', scores: { tactical: 1 } },
      { key: 'C', text: '无所谓', scores: { tactical: 0.5 } }
    ]
  },
  {
    id: 7,
    title: '你更倾向于？',
    options: [
      { key: 'A', text: '极致的手法', scores: {} },
      { key: 'B', text: '无懈的思路', scores: { tactical: 1 } },
      { key: 'C', text: '两者兼有', scores: { tactical: 0.5 } }
    ]
  },
  {
    id: 8,
    title: '在别人眼里，你是？',
    options: [
      { key: 'A', text: '天赋型选手', scores: { selfCognition: 1 } },
      { key: 'B', text: '努力型选手', scores: { selfCognition: 0 } },
      { key: 'C', text: '天赋与努力并存', scores: { selfCognition: 0.5 } }
    ]
  },
  {
    id: 9,
    title: '现在有一波很难打出来的操作，但是打出来就赢，你会？',
    options: [
      { key: 'A', text: '不管了，直接冲！', scores: { aggression: 1 } },
      { key: 'B', text: '算了，稳扎稳打', scores: {} }
    ]
  },
  {
    id: 10,
    title: '赛前喊话，你属于哪种类型？',
    options: [
      { key: 'A', text: '谦虚型', scores: { preMatch: 0 } },
      { key: 'B', text: '玩梗型', scores: { preMatch: 0.5 } },
      { key: 'C', text: '降维打击型', scores: { preMatch: 1 } }
    ]
  }
];

// ==================== 六维定义 ====================
// label: 详情展示用 | radarLabel: 雷达图各角用（第五人格主题）
const DIMENSIONS = [
  { key: 'aggression',    label: '进攻性',   radarLabel: '追击本能', max: 3, icon: '⚔️', desc: '衡量选手在劣势或关键时刻是冒险进攻还是保守求稳' },
  { key: 'tactical',      label: '战术偏好', radarLabel: '控场博弈', max: 2, icon: '♟️', desc: '衡量选手更注重微观操作/数据还是宏观思路/荣誉' },
  { key: 'achievement',   label: '成就取向', radarLabel: '巅峰渴望', max: 1, icon: '🏆', desc: '衡量选手更认可"年少成名"的即战力还是"青春风暴"的未来潜力' },
  { key: 'selfCognition', label: '自我认知', radarLabel: '天赋定位', max: 1, icon: '🪞', desc: '衡量选手认为自己在他人眼中是天赋型、努力型还是两者并存' },
  { key: 'flexibility',   label: '灵活性',   radarLabel: '应变力',   max: 1, icon: '🍃', desc: '衡量选手对非游戏因素的随性程度与适应性' },
  { key: 'preMatch',      label: '赛前姿态', radarLabel: '喊话气场', max: 1, icon: '🔥', desc: '衡量选手在赛前喊话中的自信或幽默程度' }
];

// ==================== 类型名生成 ====================
const TYPE_NAME_RULES = [
  { cond: s => s.aggression >= 2 && s.tactical >= 1.5 && s.preMatch >= 0.5,
    names: ['赛场暴君', '峡谷统治者', '绝对主宰'] },
  { cond: s => s.aggression >= 2 && s.tactical < 1,
    names: ['暴走刺客', '狂战士', '血色追猎者'] },
  { cond: s => s.aggression <= 1 && s.tactical >= 1.5,
    names: ['战术棋手', '冰霜谋士', '冷静指挥官'] },
  { cond: s => s.flexibility >= 0.5 && s.preMatch >= 0.5,
    names: ['逍遥游侠', '不羁之才', '随性猎手'] },
  { cond: s => s.selfCognition >= 0.5 && s.achievement >= 0.5,
    names: ['天赋收割者', '天命之人', '天才少年'] },
  { cond: s => s.selfCognition < 0.5 && s.achievement < 0.5,
    names: ['努力型天才', '卷王猎手', '勤勉追光者'] },
  { cond: s => s.aggression >= 1 && s.aggression <= 2 && s.tactical >= 0.5 && s.tactical <= 1.5,
    names: ['全能六边形', '均衡战神', '完美猎手'] },
  { cond: s => s.flexibility >= 0.5 && s.aggression <= 1,
    names: ['云淡风轻者', '随遇而安猎手', '佛系监管'] },
  { cond: s => s.preMatch >= 0.5,
    names: ['张扬新星', '自信猎手', '降维打击者'] },
  { cond: s => s.preMatch === 0,
    names: ['沉默刺客', '低调王者', '深藏不露'] }
];

function generateTypeName(scores) {
  for (const rule of TYPE_NAME_RULES) {
    if (rule.cond(scores)) {
      return rule.names[Math.floor(Math.random() * rule.names.length)];
    }
  }
  return '神秘监管者';
}

// ==================== 选手数据库（Excel完整数据） ====================
const PLAYERS = [
  {
    id: 'qiyan', name: '祈颜', team: 'GG', status: '现役',
    photo: '祈颜.png',
    answers: ['B','A','A','B','D','B','A','B','B','A'],
    intro: '祈颜长期处于监管者榜前，是一名绝活女巫玩家，之前曾达到过万分女巫。在2021 IVL 夏季赛中，帮助所在战队JHS获得仅有的三场胜利，他也拿下了全部三个"光明之星"。祈颜已于2023年5月29日从Reborn俱乐部转会至GG俱乐部，后租借给DOU5俱乐部。'
  },
  {
    id: 'menghuanxiaomi', name: '梦幻小弥', team: 'DOU5', status: '现役',
    photo: '梦幻小弥.png',
    answers: ['A','B','A','B','D','A','A','A','A','A'],
    intro: '梦幻小弥，榜前知名监管者玩家。于2025 IVL 夏季赛前加入DOU5俱乐部担任队内的监管者选手。'
  },
  {
    id: 'dongxuan', name: '东玄', team: 'FPX.ZQ', status: '现役',
    photo: '东玄.png',
    answers: ['B','A','A','B','B','B','C','C','B','A'],
    intro: '东玄，中国大陆赛区监管者阵营选手，擅长鹿头、红蝶、宿伞之魂、梦之女巫、红夫人、使徒、雕刻家、破轮、渔女、蜡像师、记录员、守夜人、歌剧演员、时空之影、跛脚羊、喧嚣等角色，20年夏季赛前加入DOU5俱乐部，在2023秋季赛转会加入FPX.ZQ俱乐部。深渊的呼唤Ⅵ - DOU5 - 冠军。2021 IVL 夏季赛常规赛 - DOU5 - 第一名。2022 IVL 夏季赛常规赛 - DOU5 - 第一名。2022 IVL 夏季赛总决赛 - DOU5 - 冠军。2023 IVL 秋季赛常规赛 - FPX.ZQ - 第一名。2024 IVL 夏季赛常规赛 - FPX.ZQ - 第一名。2020 IVS中日对抗赛 - DOU5 - 冠军。IVL首位最佳演绎次数达到100次的选手。IVL首位淘汰人数次数达到50人、100人、200人、300人、400人、500人、600人、700人、800人、900人、1000人、1100人、1200人、1300人、1400人、1500人、1600人、1700人的监管者选手。IVL首位个人恐惧震慑次数达到100次、200次、400次的监管者选手。IVL首位击倒次数达到500次、1000次、1500次、2000次、3000次的监管者选手。IVL首位四杀次数达到50次、100次、200次的监管者选手。多次获得常规赛监管者MVP（2020夏/秋、2021夏/秋、2022夏、2023夏、2024夏）。深渊的呼唤Ⅵ - FMVP。2022 IVL 夏季赛总决赛FMVP。第五人格五周年年度震慑大师。第五人格五周年年度最佳演绎。'
  },
  {
    id: 'xinanzhimeng', name: '心安勿梦', team: 'GG', status: '现役',
    photo: '心安勿梦.png',
    answers: ['B','A','B','B','A','B','C','C','B','B'],
    intro: '心安勿梦，曾常用名觉觉、睡觉觉，是一名榜前屠夫玩家，擅长破轮、雕刻家、26号守卫、红夫人、歌剧演员等角色，自IVL创建伊始便加入GG战队。深渊的呼唤Ⅳ - GG - 冠军。深渊的呼唤Ⅶ - GG - 冠军。2022 IVL 秋季赛总决赛 - GG - 冠军。2023 IVL 夏季赛常规赛 - GG - 第一名。2023 IVL 夏季赛总决赛 - GG - 冠军。2024 IVL 夏季赛总决赛 - GG - 冠军。2023 IVS 亚洲洲际赛总决赛 - 中国大陆赛区代表队 - 冠军。2023 骁龙电竞先锋赛 精英邀请赛 - GG - 冠军。2024 IVL 夏季赛人气监管者。2024 IVL 秋季赛人气监管者。2022 IVL 秋季赛常规赛监管者MVP。2023 IVL 夏季赛总决赛FMVP。2024 IVL 夏季赛总决赛FMVP。2023 IVS 亚洲洲际赛总决赛FMVP。深渊的呼唤Ⅶ - FMVP。第五人格七周年年度最佳演绎。'
  },
  {
    id: 'nianjin', name: '年锦', team: 'Gr', status: '现役',
    photo: '年锦.png',
    answers: ['B','B','A','B','D','C','C','C','A','B'],
    intro: '年锦，中国大陆赛区监管者选手，擅长26号守卫、歌剧演员、红蝶等角色。2024 IVL 秋季赛开赛前加入Gr电子竞技俱乐部。2024 IVL 秋季赛常规赛 - Gr - 第一名。2025 IVL 夏季赛常规赛 - Gr - 第一名。2025 IVL 秋季赛常规赛 - Gr - 第一名。2023 港澳台IVT - RD - 冠军。2024 IVS 洲际邀请赛 - Gr - 冠军。2026 濮院电竞节 国际邀请赛 - Gr - 冠军。2024 IVL 秋季赛最佳新秀。「夜莺杯」第五人格X哔哩哔哩明星主播赛-XXS-冠军。2025 IVL 夏季赛常规赛监管者MVP。2025 IVL 秋季赛常规赛监管者MVP。2025 IVL 秋季赛人气监管者。'
  },
  {
    id: 'xiaocheng', name: '小程', team: 'MRC', status: '现役',
    photo: '小程.png',
    answers: ['A','A','A','B','C','B','B','B','B','B'],
    intro: '小程，中国大陆赛区监管者选手，擅长女巫、时空之影、红夫人、红蝶、记录员、蜘蛛、使徒等角色，是梦之女巫绝活玩家，常踞屠榜前十。深渊的呼唤Ⅸ - MRC - 冠军。2024 IVL 秋季赛总决赛 - MRC - 冠军。2025 IVL 秋季赛总决赛 - MRC - 冠军。2022 IVS 群星挑战赛 - MRC - 冠军。2025 电竞上海大师赛 第五人格项目 - MRC - 冠军。2020 IVL 夏季赛最佳人气监管者。2022 IVS 群星挑战赛 - FMVP。2024 IVL 秋季赛总决赛FMVP。第五人格七周年年度人气监管者。'
  },
  {
    id: 'bailu', name: '白露', team: 'MRC', status: '现役',
    photo: '白露.png',
    answers: ['B','B','A','B','C','C','C','C','A','B'],
    intro: '白露，中国大陆赛区监管者选手。擅长歌剧演员、红蝶、跛脚羊，同时是绝活红夫人。深渊的呼唤Ⅷ开赛前加入ITZY战队，后于2025 IVL 夏季赛前加入MRC俱乐部。深渊的呼唤Ⅸ - MRC - 冠军。2025 IVL 秋季赛总决赛 - MRC - 冠军。2024 港澳台IVT - RD - 冠军。2025 电竞上海大师赛 第五人格项目 - MRC - 冠军。2025 IVL 夏季赛最佳新秀。2025 IVL 秋季赛总决赛FMVP。'
  },
  {
    id: 'peipei', name: '配配', team: 'TE', status: '现役',
    photo: '配配.png',
    answers: ['B','B','A','A','D','A','B','C','A','B'],
    intro: '配配，中国大陆赛区监管者选手。擅长渔女、台球手、歌剧演员等角色。他的S1绝活渔女非常亮眼，同时在青训营的表现让赛训组看到了潜能。深渊的呼唤Ⅵ加入WL担任监管者。于2023 IVL 夏季赛开赛前宣布加入TE溯电子竞技俱乐部，在深渊的呼唤Ⅶ期间，凭借熟练度极高的歌剧演员与极其亮眼的绝活渔女吸引了观众的视线。'
  },
  {
    id: 'nienie', name: '捏捏', team: 'WBG', status: '现役',
    photo: '捏捏.png',
    answers: ['A','A','A','A','D','A','A','B','B','A'],
    intro: '雪碧捏捏，中国大陆赛区监管者选手。擅长使用邦邦等角色。曾是FTD战队的监管者。于2023年11月9日宣布加入Gr电子竞技俱乐部。2025 IVL 夏季赛开赛前宣布转会至WBG电子竞技俱乐部。2024 IVL 秋季赛常规赛 - Gr - 第一名。2024 IVS 洲际邀请赛 - Gr - 冠军。2024 骁龙电竞先锋赛 精英邀请赛 - Gr - 冠军。2024 重庆电子竞技大赛 第五人格项目 - Gr - 冠军。2022 巅峰杯 - FTD - 冠军。2022 巅峰杯 - 最佳演绎。'
  },
  {
    id: 'chongai', name: '宠爱', team: 'Wolves', status: '现役',
    photo: '宠爱.png',
    answers: ['B','A','B','B','D','A','C','C','A','B'],
    intro: '宠爱，中国大陆赛区监管者选手。他是一名绝活小丑玩家，同时精通26号守卫、隐士、破轮、守夜人等角色。深渊的呼唤Ⅵ开赛前宣布加入Hy战队，结束后退出。2023 IVL 夏季赛开赛前加入Wolves电子竞技俱乐部。2023 IVL 秋季赛总决赛 - Wolves - 冠军。2025 IVL 夏季赛总决赛 - Wolves - 冠军。2023 IVL 夏季赛常规赛进步最快选手。2023 IVL 秋季赛常规赛监管者MVP。2024 IVL 秋季赛常规赛监管者MVP。2025 IVL 夏季赛人气监管者。第五人格六周年年度震慑大师。第五人格七周年年度震慑大师。'
  },
  {
    id: 'tuzhiming', name: '兔纸英明', team: 'GW', status: '现役',
    photo: '兔纸英明.png',
    answers: ['B','A','A','B','D','B','A','B','A','C'],
    intro: '兔纸英明，又叫做兔纸。擅长守夜人、歌剧演员、宿伞之魂等角色。曾在深渊的呼唤Ⅶ开赛前加入HHDG战队，并用一手宿伞之魂带来四抓惊艳了观众。于2024 IVL 夏季赛开赛前加入DOU5俱乐部担任队内的首发监管者选手，并于2024 IVL 夏季赛结束后退出DOU5俱乐部。后在深渊的呼唤Ⅷ开赛前加入Meow战队。2025 IVL 夏季赛开赛前加入GW俱乐部担任队内的监管者选手。'
  },
  {
    id: 'yangmouren', name: '杨某人', team: 'ZQ', status: '退役',
    photo: '杨某人.png',
    answers: ['B','A','B','A','D','B','B','A','A','C'],
    intro: '杨某人，中国大陆赛区监管者选手，擅长梦之女巫、渔女、红夫人、摄影师等角色。2020 IVL 夏季赛开赛前宣布加入ZQ电子竞技俱乐部，主打客场局。深渊的呼唤Ⅳ结束后宣布转会至Weibo电子竞技俱乐部，后逐渐担任队内首发监管者。2023 IVL 夏季赛结束后，宣布退出WBG电子竞技俱乐部。在2025 IVS 洲际邀请赛开赛前宣布加入东南亚赛区FT战队担任教练，现已退出。2019-2020年全球深渊总决赛亚军。2020-2021年职业联赛夏季赛冠军。2020-2021年职业联赛秋季赛冠军。2021-2022年全球深渊总决赛亚军。2021-2022年职业联赛夏季赛最佳MVP监管者。2021-2022年职业联赛秋季赛百分百胜率女巫。世界第一渔女。2023年职业联赛夏季赛最佳人气监管Ymm。说起杨某人，就不得不提到他的信仰之光约瑟夫，在第五人格赛事职业化前，杨某人已多次使用约瑟夫拿下四抓，两度创造出属于他和约瑟夫的赛场奇迹。2019年4月，杨某人以TZC战队监管者的身份参加了COA2，大陆赛区预选赛时TZC战队对决AS战队失利，杨某人在只有四抓才能加赛的情况下，他果断选择了约瑟夫，即使上一局他用约瑟夫被三跑，但他还是相信，他的信仰会给他四抓的力量。'
  },
  {
    id: 'pipixian', name: '皮皮限', team: 'Gr', status: '退役',
    photo: '皮皮限.png',
    answers: ['A','A','B','A','A','C','C','C','B','A'],
    intro: '2021年上海市电子竞技运动员。皮皮限是第五人格里的一名元老级选手，早在深渊的呼唤Ⅰ就与VE的队友们夺得了亚军，后来加入了当初的冠军战队Gr，并在之后的赛事中拿到了三冠一亚的好成绩，是职业化前公认的顶尖手搓屠夫之一。从远古版本的红蝶，到现在的绝活26号守卫、梦之女巫。目前为Gr电子竞技俱乐部效力，擅长角色为26号守卫、梦之女巫、红蝶、破轮、红夫人、雕刻家。2023 IVL 秋季赛Gr俱乐部公布大名单时，宣布皮皮限（ID：Gr_ppx）将暂离赛场，回家修整。暂离赛场后，皮皮限在深渊的呼唤Ⅶ期间加入了TWT战队（ID：TWT_ppx）。2024年5月28日，Gr电子竞技俱乐部宣布原Gr战队最后一名队员皮皮限正式退出俱乐部，恢复自由人身份。至此皮皮限正式退役，Gr战队正式落幕。深渊的呼唤Ⅱ - Gr战队 - 冠军。深渊的呼唤Ⅲ - Gr战队 - 冠军。2019 IVC 夏季精英赛 - Gr战队 - 冠军。2019 NeXT 秋季赛 - Gr战队 - 冠军。第一届西瓜演绎杯 - WD - 冠军。2019年度至高殿堂最佳演绎。2019年度至高殿堂震慑大师。2019年度人气主播。2019年度最佳战队 - Gr战队。2020 IVL 秋季赛总决赛最佳人气监管者。2021/2022 IVL 夏季赛/秋季赛人气监管者。三周年年度人气主播。2021十大影响力电竞选手。IVL首位击倒次数达到200次的选手。'
  },
  {
    id: 'pipixia', name: '皮皮虾', team: 'GG', status: '现役',
    photo: '皮皮虾.png',
    answers: ['A','A','B','A','A','A','C','C','B','A'],
    intro: '皮皮虾擅长26号守卫、小提琴家、雕刻家等角色，曾在多个赛季中维持了S1邦邦的位置，监管者总榜上也曾冲到过榜一，并且一直保持在榜前，更是在历届Next比赛中发挥优异。并且在十四赛季中达到人屠双七阶。跟GG战队的多数队友一样，2020 IVL 夏季赛是皮皮虾参加的第一个大型赛事，但其在赛场上的进步却有目共睹，并在深渊的呼唤Ⅳ获得了FMVP的称号。深渊的呼唤Ⅳ - GG - 冠军。深渊的呼唤Ⅶ - GG - 冠军。'
  },
  {
    id: 'yusheng', name: '鱼生', team: 'ZQ', status: '退役',
    photo: '鱼生.png',
    answers: ['A','A','B','A','D','A','B','C','B','A'],
    intro: '鱼生，全名昏迹鱼生，中国大陆赛区监管者玩家，擅长蜘蛛、杰克、26号守卫等追击型监管者。曾经活跃于IVC等民间赛事，职业化后加入ZQ俱乐部。2020 IVL 夏季赛常规赛 - ZQ - 第一名。2020 IVL 夏季赛总决赛 - ZQ - 冠军。2020 IVL 秋季赛常规赛 - ZQ - 第一名。2020 IVL 秋季赛总决赛 - ZQ - 冠军。2020 IVL 夏季赛总决赛 - FMVP。'
  },
  {
    id: 'aili', name: '爱丽', team: 'WBG', status: '退役',
    photo: '爱丽.png',
    answers: ['A','A','B','A','D','C','C','C','B','A'],
    intro: '爱丽，又名艾利克斯，中国大陆赛区监管者选手。擅长破轮、雕刻家、歌剧演员等角色。爱丽最初是PC端的玩家，第一次打比赛是在6M战队，深渊的呼唤Ⅱ时受到蓝胖子的邀请加入当时的Gr战队，但因为不熟练手搓，爱丽在整个深渊的呼唤Ⅱ期间相当于吉祥物，并没有上场，后续也没有再打比赛。之后的深渊的呼唤Ⅲ，爱丽以教练的身份加入XGG战队提供帮助。深渊的呼唤Ⅳ结束后，爱丽选择转手搓，并在2021 IVL 夏季赛前加入狼队担任监管者，深渊的呼唤Ⅵ后宣布离开狼队。2023 IVL 秋季赛前加入WBG战队，深渊的呼唤Ⅷ后宣布离开WBG战队。深渊的呼唤Ⅱ - Gr战队 - 冠军。深渊的呼唤Ⅴ - Wolves - 冠军。2021 IVL 夏季赛总决赛 - Wolves - 冠军。2021 IVL 秋季赛常规赛 - Wolves - 第一名。2021 IVL 秋季赛总决赛 - Wolves - 冠军。2022 IVL 秋季赛常规赛 - Wolves - 第一名。2021 IVL 夏季赛总决赛 - FMVP。深渊的呼唤Ⅴ - FMVP。第五人格三周年年度人气主播。第五人格四周年年度震慑大师。2023 IVL 秋季赛人气监管者。'
  },
  {
    id: 'zhenzhen9', name: '针针9', team: 'ACT', status: '现役',
    photo: '针针9.png',
    answers: ['B','A','A','A','D','B','A','A','B','A'],
    intro: '针针9，中国大陆赛区监管者选手，擅长女巫、歌剧演员、时空之影角色。2025年2月加入ACT俱乐部。'
  }
];

// ==================== 预计算选手六维得分 ====================
(function calcPlayerScores() {
  PLAYERS.forEach(player => {
    const scores = { aggression: 0, tactical: 0, achievement: 0, selfCognition: 0, flexibility: 0, preMatch: 0 };
    player.answers.forEach((ans, idx) => {
      const q = QUESTIONS[idx];
      const opt = q.options.find(o => o.key === ans);
      if (opt && opt.scores) {
        for (const [dim, val] of Object.entries(opt.scores)) {
          if (scores[dim] !== undefined) scores[dim] += val;
        }
      }
    });
    scores.tactical = Math.min(scores.tactical, 2);
    player.scores = scores;
  });
})();

// ==================== 匹配算法 ====================
// 基于六维数据欧几里得距离匹配最相似选手
function findBestMatch(userAnswers, userScores) {
  const normalizedUser = normalizeScores(userScores);
  let bestPlayer = null;
  let bestDistance = Infinity;

  for (const player of PLAYERS) {
    const np = normalizeScores(player.scores);
    const dist = euclideanDistance(normalizedUser, np);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestPlayer = player;
    }
  }

  return bestPlayer;
}

function normalizeScores(scores) {
  return {
    aggression: scores.aggression / 3,
    tactical: scores.tactical / 2,
    achievement: scores.achievement,
    selfCognition: scores.selfCognition,
    flexibility: scores.flexibility,
    preMatch: scores.preMatch
  };
}

function euclideanDistance(a, b) {
  const keys = ['aggression', 'tactical', 'achievement', 'selfCognition', 'flexibility', 'preMatch'];
  let sum = 0;
  for (const k of keys) {
    sum += Math.pow((a[k] || 0) - (b[k] || 0), 2);
  }
  return Math.sqrt(sum);
}
