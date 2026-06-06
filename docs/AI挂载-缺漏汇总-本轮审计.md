# AI 挂载「每技法全选项无遗漏」缺漏汇总（本轮地毯式审计）

> 判定标准：**技法主页面能选 + 会改挂载输出 + 但挂载齿轮抽屉选不到 = 缺漏（❌，必补）**。
> 屏显改了但挂载快照不受影响 = ⚠️（需后端/较大改动才能"选哪种挂哪种"）。
> 显示开关不进快照（快照恒输出全集）= ✅ 正确排除，非缺漏。
>
> 收齐 5 路审计 + 接线 agent 后，按本表一次性实现：加 field + 接线 + 逐项 round-trip + 全量回归。

## 已知接线机制（实现时遵循）
- 抽屉可调项 = `TECHNIQUE_SETTINGS_SCHEMA`（`utils/techniqueMountSettings.js`）。
- A 类生效链：抽屉 → `getAnalysisTechniqueContextWithOptions`(`aiAnalysisContext.js:2042`) → `mergeOptionsIntoRecord` 写 `record.*` → `regenerateAstroChartSnapshot`(:2002) → `buildFieldObject`(:289) → `fieldParams`(:346) → `fetchChart`。**只有 buildFieldObject+fieldParams 读出的字段才真生效。**
- 主页面真实落盘链：`models/astro.js fieldsToParams`(:217) → `/chart`；存盘 `localcharts.js:273` 持久 orbs/orbScale。
- `pruneOptionsToNonDefault` 当前按 `` `${v}` `` 字符串比较 → **对象型字段（如 orbs）会恒判"非默认"，需特判**。

---

## A1 西占本命/古典/容许/世俗本命 —— 已审计 ✅

### ❌ 硬缺漏
| # | 技法 | 选项 | 组件:行 | 接线方式 |
|---|---|---|---|---|
| A1-❌1 | astrochart / astrochart_like / suzhan | **容许度 orbs（逐星对象）** | `AstroOrbSetting.js:40` 写 fields.orbs；落盘 `localcharts.js:273`；下发 `models/astro.js:248` | `ASTRO_CHART_FIELDS` 加 orbs（对象型，UI 复用 AstroOrbSetting 或"沿用存盘 orbs"开关）；`buildFieldObject` 加 `orbs:{value:record.orbs}`；`fieldParams` 透传 `orbs`；`pruneOptionsToNonDefault` 对象特判 |
| A1-❌2 | 同上 | **容许度整体缩放 orbScale（0.5–2.5×，默认1）** | `AstroOrbSetting.js:52`；落盘 :274；下发 :249 | schema 加 `{name:'orbScale',type:'number',default:1,group:'容许度'}`；buildFieldObject/fieldParams 加 orbScale（数字型 prune 天然可用） |

### ⚠️ 屏显≠挂载（P2，需后端改）
- ⚠️ 寿命Hyleg 算法 method（`AstroLifespan.js:50/61`）：仅改屏显；快照 `buildLifespanSection` 用后端固定 hyleg、不收 method。要"选哪种挂哪种"须 `/chart` 支持 hyleg method 参 + 落盘 + schema。
- ⚠️ 印度盘 varga/ayanamsa（`IndiaChart.js:217 buildIndiaSnapshotForFields` 第二参在 `aiAnalysisContext.js:1037` 写死 1）：归印度盘单独处理。

### ✅ 正确覆盖/正确排除（非缺漏，已逐函数证实）
- 9 个会改 /chart 的本命开关 hsys/zodiacal/tradition/strongRecption/simpleAsp/virtualPointReceiveAsp/doubingSu28/southchart/timeAlg —— schema 全有且接线生效。
- planetDisplay/lotsDisplay/aspects/小行星勾选/阿拉伯点勾选 —— **不改挂载快照**（快照遍历全集、不进 /chart），排除正确。用户"不勾希腊点"走**内容分段勾选**（已实现），非这些显示开关。
- 12分度/主宰链/映点反映点/寿命格局段 —— 恒在快照，无需开关。世俗盘按设计 sectionsOnly 只读。

---

## A2 西占推运/星运/返照 —— 已审计 ✅（最大一块）

### 根因机制（实现时必须理解）
挂载推运正文两条路（`buildTechniqueContext`→`pickSnapshotCandidate`）：
1. **实时模块快照**（`saveModuleAISnapshot` 存的、反映用户实选）—— 仅当 `isCacheSnapshotConfidentMatch`(`aiAnalysisContext.js:1837`：出生 date+time+zone+lon+lat 全等当前源) 通过才赢。
2. **无头重算** `regenerateChartTechniqueSnapshot`(`:1026`) —— 签名不确凿匹配（换盘/清缓存/新会话）就回落；**除 primarydirect/primarydirchart 外，所有推运不收 opts、写死默认**。
- 齿轮抽屉只渲染 `TECHNIQUE_SETTINGS_SCHEMA[key].fields`(`AIAnalysisMain.js:3107`)；20 个推运 key 注册成空 `fields:[]`(`techniqueMountSettings.js:265-279`) → 抽屉无任何选项。
- **补法通则**：schema 加 fields（default===组件 DEFAULT_OPTS，守"默认即现状"）+ 多数还需给 `buildXxxSnapshotText` 加 opts 形参 + `regenerateChartTechniqueSnapshot` 把 merge 后的值传进去。`pruneOptionsToNonDefault` 对象型需特判。

### P0 零接线成本（后端已通，加 schema 即生效）
| # | 技法 | 选项 | 组件:行 | 补法 |
|---|---|---|---|---|
| A2-P0 | primarydirect/primarydirchart | **年数 pdYears 1–180 默认100** | `AstroPrimaryDirection.js:854` | `PRIMARY_DIRECT_FIELDS` 加 `{name:'pdYears',label:'年数',type:'number',default:100,min:1,max:180,step:1,group:'方位法'}`。`buildFieldObject:327`/`fieldParams:374` **已读已转发**，加 schema 即生效，**不碰 builder**。（=接线 agent 正在做的；最终核实其落点一致即可）|

### P1 高价值（层级/基点/起运法，需给 standalone builder 加 opts）
| # | 技法 | 选项 | 组件:行 | builder | 补法 |
|---|---|---|---|---|---|
| A2-P1a | zodialrelease | 推运基点 basePoint(11:福/精神/水金火木土点/ASC/DESC/MC/IC) + 输出层级 aiMode(L1全/L2/L3/L4)+L1/L2/L3钻取 idx | `AstroZR.js:500/517/531/541/552/563` | `buildZodialReleaseSnapshotText:273` 写死福点+L1_ALL+stopLevelIdx3 | builder 加 opts→透传 basePoint(→startSign)/aiMode/aiL1Idx/aiL2Idx/aiL3Idx/stopLevelIdx 进 `zrNatalParamsStandalone`+`buildZRAISnapshot`(已支持层级)；regen `:1138` 传 opts |
| A2-P1b | decennials | startMode/orderType(黄道·迦勒底)/dayMethod(Valens·Hephaistio)/calendarType(360·365.25) + aiMode+L1/L2/L3 | `AstroDecennials.js:605/617/625/633/548/558/569/580` | `buildDecennialsSnapshotText:233` 写死4设置+L1_ALL | builder 加 opts→透传进 settings+`buildDecennialAISnapshot` aiState；regen `:1143` 传 opts。常量在 `utils/decennials` |

### P2 中价值（builder 多数已收 opts、只差 regen 传参）
| # | 技法 | 选项 | 组件:行 | builder 状态 | 补法 |
|---|---|---|---|---|---|
| A2-P2a | triplicityrulers（=**三分主星**，用户点名）| 划分 division(三分/两分) + **寿命基准 lifespan 30–120（年龄）** | `AstroTriplicityRulers.js:97/103` | **已收 (chartObj,opts)** | schema 加 division(select `TRIPLICITY_DIVISIONS`)+lifespan(number 30–120)；regen `:1071` 把 opts 传进去 |
| A2-P2b | balbillus | startPlanet + yearType(solar/hellenistic) + mode(nearest/forward) | `AstroBalbillus.js:141/147/153` | **已收 opts**(`:1066`没传) | schema 加 3 field（`BALBILLUS_YEAR_TYPES`/`BALBILLUS_MODES`/七政）；regen 传 |
| A2-P2c | keypoints | 释放点 mode(soul/body) | `AstroKeypoints.js:82` | **已收 opts**(`:1076`没传) | schema 加 1 field(`RELEASE_MODES`)；regen 传 |
| A2-P2d | planetaryarc | 弧源 arcSource(月水金火木土日) + 目标时刻 datetime + 容许 asporb | `AstroPlanetaryArc.js:187`+DirectionForm | `buildPlanetaryArcSnapshotText:63` 写死MOON/today/1 | builder 加 opts；schema 加 arcSource(7星)+targetDatetime+asporb |
| A2-P2e | persiandirected | 速率 rateKey(波斯/Prophected/Naibod) + 方向 direction(direct/converse) | `AstroPersianDirected.js:227/233` | `buildPersianDirectedSnapshotText:85` 写死persian/direct | builder 加 opts；schema 加 rateKey(3)+direction(2)。（其"推运时间"只驱左盘不进snapshot，**不补**）|
| A2-P2f | vedicprog | targetDate + targetTime | `AstroVedicProgressions.js:155/156` | `buildVedicProgSnapshotText:19` 写死today/12:00 | builder 加 opts；schema 加 targetDate+targetTime |
| A2-P2g | jaynesprog | targetDate + targetTime | `AstroJaynesProgressions.js:129/130` | `buildJaynesProgSnapshotText:19` 写死today/12:00 | 同 vedicprog |

### P3 目标时刻型 5 法（共用 `buildPredictivePeriodSnapshot:976` 写死全部）
| # | 技法 | 选项 | 补法 |
|---|---|---|---|
| A2-P3 | profection/solararc/solarreturn/lunarreturn/givenyear | 目标时刻 datetime + 步进 tmType(年/月/日) + 容许 asporb + 南北交逆移 nodeRetrograde；**returns 另加 异地 dirLat/dirLon** | `buildPredictivePeriodSnapshot(chartObj,key,opts)` 加 opts 覆盖 datetime/tmType/asporb/nodeRetrograde（returns 再覆盖 dirLat/dirLon/dirZone，现写死本命经纬）；regen `:1133` 传 merge opts。schema：profection/solararc 加4 field；solarreturn/lunarreturn/givenyear 再加 dirLat/dirLon。（`inverse` 内外盘只改盘图不进文本，**不补**）|

### ✅ 正确（确无可改输出的控件，空 schema 对）
- extrareturns body（snapshot 恒列土/木/月交全3体）；firdaria/distributions/agepoint/planetaryages/yearsystem129/lunationphase（主页面 0 控件）。
- persian/returns 的"推运时间(只驱左盘)"、solarreturn 的 inverse —— 不进 snapshot 文本。

### 与参照稿偏差（采信本审计）
- pdYears **已全通**（327/374），是唯一加 schema 即生效的；参照稿"接线缺口"过时。
- triplicity/balbillus/keypoints 的 builder **已收 (chartObj,opts)**，比参照稿乐观，只差 regen 传参。

## B 紫微/七政四余/合盘/神数/河洛 —— 已审计 ✅

### ❌ 硬缺漏（builder 已就绪，纯缺 schema 字段→抽屉选不出+被 prune 剪掉）
| # | 技法 | 选项 | 组件:行 | 补法（kind 维持 record，**零 builder 改动**）|
|---|---|---|---|---|
| B-❌1 | ziwei | **四化流派 sihuaSchool**(beipai/zhongzhou/custom) | `ZiWeiInput.js:372`；消费链 `aiAnalysisContext.js:872`+`ZiWeiMain.js:299-327` 已通 | `ziwei` schema(`techniqueMountSettings.js:239`) 加 `{name:'sihuaSchool',label:'四化流派',type:'select',default:'beipai',options:[beipai/zhongzhou/custom]}` |
| B-❌2 | ziwei | **运限层 periodLevel**(''仅本命+大限/liunian/liuyue/liuri/liushi)+配套 daxianIndex/liunianYear/liuyueMonth/liuriDay/liushiHour | `ZWLuckPanel.js`；产出链 `ZiWeiMain.js:144-295 buildZiweiPeriodLines`+`aiAnalysisContext.js:821-878` 已通 | schema 加 `{name:'periodLevel',type:'select',default:'',options:[…]}`+5 个 number（default 留空=不挂）。=用户"可选时间段与运限"正解；ZWLuckPanel chips 仍纯导航⚠️但 periodLevel 字段一补即可挂载侧静态指定 |

> **接线 agent 正在做 periodLevel；务必确认它也补了 sihuaSchool**（同源同机制）。补单测：`getTechniqueSettingsDefaults('ziwei')` 含 sihuaSchool/periodLevel。

### ⚠️ 有正当理由（纯导航/需多盘/仅显示/双缺口）
- 河洛 **quHuaGong**(取化工法)：双缺口——schema(`heluo`=TIME_FIELDS)无 + 无头 builder `buildHeluoSnapshotForRecord:900` 传 `st=null` 不走 solarTermHuagong。要接需 builder 先算 solarTerm 再透传。P2。
- 合盘 relative 全选项：整技法不在 `ANALYSIS_*_TECHNIQUES`(`:170-221`)，需两盘无法单源无头复算，导出侧经缓存支持。设计取舍，非疏漏。
- 皇极 classicKey：典籍参照选择器非排盘参数，硬编 DEFAULT_CLASSIC。低优可不接。
- 紫微 ziweiXiaoxianYinyang：仅运限层挂上后才间接影响，待 periodLevel 补完再定。
- 14 路神数 per-path 选项：整批不在 ANALYSIS 列表（仅 xianqin/cetian/huangji 可挂），导出 only。按设计。

### ✅ 正确覆盖/排除
- ziwei timeAlg/after23/lateZi（TIME_FIELDS 已通）；七政 lifeMode/nodeMode（已通）+大限/神煞段恒在快照；28宿/盘式/showOthers/showSmall=显示偏好不入快照（排除正确）。

---

## C 三式（奇门/大六壬/金口诀/太乙/三式合一）—— 已审计 ✅

### ❌ 硬缺漏（按严重度）
| # | 技法 | 选项 | 组件:行 | 接线状态 | 补法 |
|---|---|---|---|---|---|
| C-❌1 | jinkou | **月将 yueJiang + 占时 zhanShi + 时间基准 timeBasis** | `JinKouMain.js:1339/1350/1361`；消费 `buildJinKouData` L1657-1659 | **未接线**：`regenerateJinkouSnapshot:577` 没把这三项传给 buildJinKouData | schema `JINKOU_FIELDS` 加 3 field（yueJiang default'auto'/zhanShi'auto'/timeBasis'direct'，顶层 optionsPath:''）+ **改 builder**：regen 把 payload.yueJiang/zhanShi/timeBasis 塞进 buildJinKouData options，`generateCaseTechniqueSnapshot:690` 同步 |
| C-❌2 | sanshiunited | **三式合一复合**：schema 误用 TAIYI_FIELDS（只暴露太乙4项）；六壬子组 `regenerateLiurengSnapshot(record)` **没传 options**→大六壬永远默认盘；奇门子组 payload.options 命名空间与太乙键冲突 | schema `:250`；regen 链 `aiAnalysisContext.js:632` | 全断 | 用 `groups:[{key:'liureng',optionsPath:'',fields:LIURENG_FIELDS},{key:'qimen',optionsPath:'options',fields:QIMEN_FIELDS},{key:'taiyi',optionsPath:'?',fields:TAIYI_FIELDS}]`（**分桶避免 payload.options 混用**）；抽屉 UI 加 groups 渲染；`regenerateSanshiUnifiedSnapshot` 给 regenerateLiurengSnapshot 传六壬 opts。**最复杂** |
| C-❌3 | taiyi | **日界 after23NewDay + 晚子时 lateZiHourUseNextDay** | `TaiYiMain.js:713`+全局；消费 `TaiYiCalc.js:275/277 fetchTaiyiPan` | 接线就绪（payload.options 透传）仅缺字段 | `TAIYI_FIELDS` 加 `{name:'after23NewDay',type:'select',options:DAY_BOUNDARY_OPTIONS,default:defaultAfter23NewDay()}`+`{name:'lateZiHourUseNextDay',type:'switch',default:defaultLateZiHourUseNextDay()}` |
| C-❌4 | liuren | **起课法 castMethod 仅 3/25** | `LiuRengMain.js:5410`，`QI_METHODS` 25 法 | 接线全通（regen 直透 p.castMethod） | `LIURENG_FIELDS.castMethod.options` 用 `LiuRengMain` 导出的 `QI_METHODS` 映射全 25 法（同源杜绝手写错值，镜像 QIMEN_FIELDS 做法）|
| C-❌5 | jinkou | **地分 diFen** | `JinKouMain.js:1323`（state 默认'子'+diFenAuto:true）| 半接线（regen:571 已读 payload.diFen 经 resolveJinKouDiFen）仅缺字段 | schema 加 `{name:'diFen',type:'select',default:'子',options:[12支(+可选auto)]}`（顶层）|
| C-❌6 | jinkou | **guireng 默认值错（真 bug）** | schema `JINKOU_FIELDS.guireng.default=2`，组件 `JinKouMain.js:592 state guireng:0` | — | **`JINKOU_FIELDS.guireng.default` 改 0**（守"默认即现状"，否则 prune 误判持久化）|

### ⚠️ 次要
- liuren 选时 xuanShiZhi/演数 yanShuNum（`:5417/5429` 条件子项，castOpts 已透传）：缺字段+抽屉无条件揭示机制，需加字段+条件显示 UI。
- 太乙 timeBasis/gameTheory：三式合一主页 SanShi 面板未暴露，按 groups 补齐可顺带。
- 奇门 yearGanZhiType/monthGanZhiType/dayGanZhiType（主页无独立控件，用户也调不了，低危）；奇门 sex（入快照 schema 无，影响极小）。

### ✅ 正确覆盖
- 奇门 paiPanType/zhiShiType/qijuMethod/yueJiaQiJuType/kongMode/yimaMode/shiftPalace/timeAlg/fengJu/after23/lateZi（全有全通）；太乙 style/tn/timeBasis/gameTheory；大六壬 wuxing/guireng/yueJiangMethod/fenZhouYe。

## D 数算/卦/择日/世俗/统摄/德国/风水 —— 已审计 ✅

### ❌ 硬缺漏（schema 错/缺，已接线，多数改 schema 即生效）
| # | 技法 | 选项 | 真值/问题 | 组件:行 | 补法 |
|---|---|---|---|---|---|
| D-❌1 | bazi | timeAlg | schema 用 2档 TIME_ALG_OPTIONS，实际 **3档**：0真太阳时/1直接时间/2春分定卯时 | `CnTraditionInput.js:333`；`BaZi.js:45-49/504` | bazi 专属 3 选项 field（勿复用 2档常量）；已接线 |
| D-❌2 | bazi | phaseType | schema [0标准/1变体]，真值 **[0长生火土同/1长生水土同/2长生阳顺阴逆]**，值2选不到 | `CnTraditionInput.js:342`；`BaZi.js:505` | 改 3 选项对齐源；已接线 |
| D-❌3 | bazi | godKeyPos | schema 只 年/日，漏 **年日**（年柱日柱都查）| `CnTraditionInput.js:349`；`BaZi.js:506` | 补 `{value:'年日'}`；已接线 |
| D-❌4 | horary(卜卦) | topicId | schema 只 8类+**假值 `lost`(实为 theft)**，实 **14类** HORARY_CATEGORIES | `HoraryMain.js:9`；`horaryEngine.js:184/201` | schema `import {HORARY_CATEGORIES}` 复用，default'general'；已接线(regenerateHorarySnapshot 读 options.topicId) |
| D-❌5 | election(择日) | topicId | schema 只 6类+**假值 construction/medical**(不存在)，实 **19类** ELECTION_TOPICS | `ElectionMain.js:18` | schema 复用 ELECTION_TOPICS，default'marriage'；已接线 |
| D-❌6 | germany(德国汉堡) | **误标 sectionsOnly** | 实际经 `buildGermanySnapshotForFields` 重算，读 hsys/zodiacal/timeAlg 改中点/90°/中点相位 | `techniqueMountSettings.js:258`；`AstroMidpoint.js:18-29/114` | 改 `kind:'record'`，fields=ASTRO_CHART_FIELDS 子集 [hsys,zodiacal,timeAlg]。**须同步改 `techniqueMountSettings.test.js:22/35` 的 SECTIONS_ONLY 断言**（去掉 germany）。TNP/盘基/orb 仍是内部常量不暴露 |

### ⚠️ 中等（真缺口，需 builder 接线）
| # | 技法 | 选项 | 补法 |
|---|---|---|---|
| D-⚠️7 | canping(数算参评数) | 取法 method(明法/古法) | builder `buildCanpingSnapshotForRecord:864-872` 写死 method:'ming'。schema 加 method field + builder/`canpingLiunianSeries` 透传 opts.method |
| D-⚠️8 | heluo(河洛) | 取化工法 quHuaGong(土王寄坤艮/直取四方伯) | =B 的 quHuaGong 同一项。builder `buildHeluoSnapshotForRecord:900` + `heluoLocal.buildSnapshotText` 不收 opts。schema 加 quHuaGong field + heluoCalc/judge/chartExtras/buildSnapshotText 串接 opts.quHuaGong |

### 维持只读（有据，不动）
- 统摄法 selection（案课式输入，类同六爻卦象）；六爻/梅花起卦法（确定卦象，存盘读 payload.gua）；世俗盘类型（需多步星历扫描凭 divTime 无法重算）；风水（无快照 builder 不可挂载）。

### ✅ 用户疑点澄清
- **chartStyle 确实不该进挂载**：横跨 horary/election/mundane/sixyao 仅传盘轮渲染，`buildAiSnapshot` 不读它 → 不改输出。近期修的是它 `e.target.value` 取值 bug，与挂载无关。

---

# ★ 全部完成 ✅（5 批 + jar + 文档 + live 验证）

- 批0-4 全做完：~30 处缺漏全部实现（含修「对不上」真 bug：八字phaseType值2/卜卦假值lost/择日假值construction-medical/金口诀guireng默认/德国汉堡误标只读）。
- **jest 55 套 / 471 测试全绿 + build Compiled successfully**（含 techniqueMountSettings.test 的每技法选项/默认/round-trip/防漂移/sanshiunited无重名/showWhen 断言）。
- **jar 重编 ✅**：JDK17(Zulu)重编 astrostudyboot fat jar，嵌套 astrostudycn jar 内 ChartController `strings` 验含 pdYears/pd_method_sync_v9（后端进程需重启加载）。
- **live preview 抽检 ✅**：齿轮抽屉按技法渲染正确选项（solarreturn 有返照地经纬、solararc/profection 没有）；三分主星快照实际输出含 division「三分(0-25/25-50/50-75)」；UI 无崩。
- 合理降级（无"对不上"）：金口诀timeBasis剔除/orbs做开关/heluo仅非默认时算/profection·solararc不带异地。
- 实现说明 已回写「AI 挂载·每技法全选项无遗漏」小节（含循环导入坑/默认即现状/不放无效选项/pdYears重编jar）。
- 未 commit/未 push/未发布。等用户手测。

---

# ★ 实现进度（实时）

- **批 0 ✅**（接线 agent）：pdYears(主限法,默认100,前端+Java ChartController转发,需重编jar) + 紫微 sihuaSchool + periodLevel(流年/月/日/时,复用ZWLuckPanel构造器)。jest 445 绿。
- **批 1 ✅**：八字 timeAlg 3档/phaseType 3档(修标准变体错标+补值2)/godKeyPos补年日；卜卦topicId复用HORARY_CATEGORIES(14,删假值lost);择日复用ELECTION_TOPICS(19,删假值construction/medical);六壬castMethod复用QI_METHODS(25);金口诀diFen+guireng默认2→0(修对不上);太乙after23/lateZi。**循环导入坑**:三大组件常量(QI_METHODS/HORARY/ELECTION)改内联镜像断循环+单测防漂移(三纯util triplicity/balbillus/keypoints无循环可import)。
- **批 2 ✅**：三分主星triplicityrulers(division+lifespan)/balbillus(startPlanet+yearType+mode)/keypoints(mode)——已是record kind,补真fields(复用builder常量)+regen传record.*→opts(builder已normalize,undefined回默认=现状);germany改record[hsys,zodiacal,timeAlg](regen分支已存在)+改测试SECTIONS_ONLY。单测加固25→26项。**jest 455 全绿 + build 绿**。
- **批 3 ✅**：给 11 项「写死默认」的推运/数算 builder 加 opts 形参 + regen 据 record.* 传入,真改快照（jest 55 套/468 全绿 + build 绿）。
  - **黄道星释 zodialrelease**：`buildZodialReleaseSnapshotText(chartObj,opts)` 加 basePoint(11,→startSign via AstroHelper.getObject)/aiMode/aiL1Idx/aiL2Idx/aiL3Idx；导出 `ZR_BASE_POINTS`/`ZR_AI_MODES` 供 schema。
  - **十年大运 decennials**：`buildDecennialsSnapshotText(chartObj,opts)` 加 startMode/orderType/dayMethod/calendarType/aiMode/idx；导出 5 个选项常量。
  - **行星弧 planetaryarc**：`buildPlanetaryArcSnapshotText(chartObj,opts)` 加 arcSource(7)/datetime/asporb；导出 `ARC_SOURCES`。
  - **波斯向运 persiandirected**：`buildPersianDirectedSnapshotText(chartObj,opts)` 加 rateKey/direction；导出 `RATE_LABEL`。
  - **恒星/赤纬推运 vedicprog/jaynesprog**：两 builder 加 targetDate/targetTime。
  - **目标时刻 5 法**：`buildPredictivePeriodSnapshot(chartObj,key,opts)` 加 datetime/tmType/asporb/nodeRetrograde；**仅 returns 型(solarreturn/lunarreturn/givenyear)** 才下发 dirLat/dirLon(与 Return 组件一致,默认=本命经纬;profection/solararc 不带 dirLat/Lon 以免改默认行为)。
  - **金口诀 yueJiang/zhanShi**：**改 builder** `buildJinKouData`(本地)加 opt.yueJiang/opt.zhanShi 覆盖 timeZi/yuejiang（原只在后端 fetchJinKouPan 生效,本地路径不消费）+ regenerateJinkouSnapshot/generateCaseTechniqueSnapshot 透传。**timeBasis 降级不入 schema**（本地 buildJinKouData 从已定四柱起盘,不重算时间→改不动输出,按铁律不放无效项）。
  - **canping method**：`buildCanpingSnapshotForRecord(record,opts)` + canpingLiunianSeries 透传 method(明法/古法)。
  - **heluo quHuaGong**：`buildHeluoSnapshotForRecord(record,opts)` **仅当显式覆盖**时据真实节气(Solar+solarTermHuagong)算化工传 judge,改[命运篇]化工行;**缺省仍传 st=null(MONTH_HG 月支近似=现状,字节级一致)**——守「默认即现状」避免全量 heluo 默认输出漂移。仅四立前18日(土用)窗口、选 siFangBoOnly 时与默认不同。
  - **orbScale**：`buildFieldObject`+`fieldParams` 加 record.orbScale 透传(对齐 models/astro.js fieldsToParams:249),数字型 prune 天然可用。
  - **orbs**：做成 **`useStoredOrbs` 开关**(默认关=现状;开→buildFieldObject 读存盘 record.orbs 下发)——规避 prune 对象恒判非默认坑（未做逐星表 UI）。
  - schema：以上全在 `techniqueMountSettings.js` 配真 fields（11 推运 key 移出 PROGRESSION_EMPTY_KEYS）;复用 builder 导出常量;orbScale/useStoredOrbs 入 ASTRO_CHART_FIELDS(astrochart/astrochart_like/suzhan);canping/heluo 在 TIME_FIELDS 基础上各加 method/quHuaGong。单测 +13 项(round-trip 默认空/非默认保留/默认对)。
- **批 4/5 ⏳**：见下。

---

# ★ 总执行序（收齐 5 路 + 接线 agent 后按此实现）

> 全部触碰 `techniqueMountSettings.js`/`aiAnalysisContext.js` → **必须串行单写**（不可并行 agent）。每批后 `npx umi-test` + 关键项 round-trip。`default===组件默认`守"默认即现状"。`pruneOptionsToNonDefault` 对象/特殊型需特判。

**批 0（接线 agent 在做）**：pdYears(A2-P0)、紫微 periodLevel(B-❌2)+sihuaSchool(B-❌1)。交付后核实落点。

**批 1 纯 schema 修（零 builder，已接线，最高 ROI 最低险）**：
- D-❌1/2/3 八字 timeAlg/phaseType/godKeyPos（修错值+补值，**消除"选了没用/选不到"真 bug**）
- D-❌4/5 卜卦/择日 topicId（复用 HORARY_CATEGORIES/ELECTION_TOPICS，删假值）
- C-❌4 大六壬 castMethod 3→25（复用 QI_METHODS）
- C-❌5 金口诀 diFen（半接线，补字段）
- C-❌6 金口诀 guireng default 2→0（**修默认值 bug**）
- C-❌3 太乙 after23/lateZi（已接线，补字段）
- A1-❌2 orbScale（已…需确认 buildFieldObject/fieldParams 读 orbScale；若未读归批3）
- D-❌6 德国汉堡 germany →record[hsys,zodiacal,timeAlg]（+改 test SECTIONS_ONLY 断言）

**批 2 schema + regen 传参（builder 已收 opts）**：
- A2-P2a 三分主星 triplicityrulers division+lifespan（regen:1071 传）
- A2-P2b balbillus startPlanet+yearType+mode（regen:1066 传）
- A2-P2c keypoints mode（regen:1076 传）

**批 3 schema + builder 加 opts（builder 写死）**：
- A2-P1a zodialrelease basePoint+aiMode(+idx)（builder:273）
- A2-P1b decennials 4设置+aiMode(+idx)（builder:233）
- A2-P2d planetaryarc arcSource+datetime+asporb（builder:63）
- A2-P2e persiandirected rateKey+direction（builder:85）
- A2-P2f/g vedicprog/jaynesprog targetDate+targetTime（builder:19/19）
- A2-P3 profection/solararc/solarreturn/lunarreturn/givenyear（buildPredictivePeriodSnapshot:976 加 opts：datetime/tmType/asporb/nodeRetrograde；returns 再加 dirLat/dirLon）
- C-❌1 金口诀 yueJiang/zhanShi/timeBasis（regenerateJinkouSnapshot:577 + generateCaseTechniqueSnapshot:690 传 buildJinKouData）
- A1-❌1 orbs（对象型：ASTRO_CHART_FIELDS + buildFieldObject/fieldParams 读 record.orbs + prune 对象特判）
- D-⚠️7 canping method、D-⚠️8/B heluo quHuaGong（builder 透传）

**批 4 复合 UI**：
- C-❌2 三式合一 sanshiunited groups（schema groups 分桶[liureng/qimen/taiyi] + 抽屉 groups 渲染 + regen 给 regenerateLiurengSnapshot 传六壬 opts）
- liuren xuanShiZhi/yanShuNum（条件揭示 UI）

**批 5 自检收尾**：补单测（ziwei 含 sihuaSchool/periodLevel；germany 不在 SECTIONS_ONLY；bazi/horary/election 选项数对）；全量 jest + build；preview round-trip 抽检；实现说明 回写。

## ⚠️ 屏显≠挂载（P2，需后端，本轮先不做或仅记录）
- 寿命 Hyleg method（A1）、印度盘 varga/ayanamsa（A1）、河洛 quHuaGong 的 solarTerm 计算依赖（B/D 已在批3处理字段层）。
