# AI 挂载 · 全技法设置完整 Schema — 工程师方案（穷尽式）

> 目的：为「AI 分析挂载 → 每技法齿轮设置面板」建一份**穷尽式** `TECHNIQUE_SETTINGS_SCHEMA`。把**每一个命盘/事盘可挂载技法**在其技法页里**所有能调的设置**都列全——尤其**所有推运的 时间段 / 目标时刻 / 年龄 / 层级 / 行星 / 方法 / 运限 选项**，一个都不漏。**默认值 = 现状**（与各组件常量 / `buildFieldObject` / `DEFAULT_OPTIONS` 逐字对齐）。
>
> 本文建立在 `docs/AI挂载-每技法设置与内容勾选-实现方案.md`（§0–§7 链路调研、阶段计划）之上，把它的 §2.1 schema 草案**补到完整、可直接照做**。本文只做"设置 schema 的穷尽与落地参数"，链路/UI/四同步加固沿用那份。
>
> **只读调研产物，不改源码。** `utils/techniqueMountSettings.js` 与 `components/aianalysis/*` 由另一 agent 在写，本文不触碰其内容、只提供它该实现的 schema 数据。所有路径为绝对路径或相对 `Horosa-Web/astrostudyui/src` 的模块路径。

---

## 0. 可挂载技法清单（穷尽口径）

可挂载集合 = `ANALYSIS_CHART_TECHNIQUES ∪ ANALYSIS_CASE_TECHNIQUES`（`utils/aiAnalysisContext.js:170` / `:209`）。**共 45 个唯一 key**（命盘 35 + 事盘 11，其中 `suzhan` 命/事都在 → 去重 45）。中文标签取 `ANALYSIS_TECHNIQUE_LABELS`（`aiAnalysisContext.js:106`）。

> 注：`AI_EXPORT_TECHNIQUES`（`aiExport.js:247`）是更大的超集，含 14 路神数（`shaozi/tieban/fendjing/beiji/nanji/chunzi/wuzhao/taixuan/jingjue/shenyishu/...`）、`relative` 合盘、`jieqi*` 节气盘、`otherbu` 骰子、`fengshui` 风水、`qizhengkin`、`generic`。**这些都不在两条 ANALYSIS 列表里 → 不可挂载 → 本 schema 不收**（导出可选段、挂载选不出来）。理由见 `aiAnalysisContext.js:166` 注释（合盘需两盘、节气盘需多次取数+列表参数、骰子随机不可复算、风水 iframe）。

| # | key | 标签 | 分类 | 驱动类 | 有可调设置? |
|---|---|---|---|---|---|
| 1 | `astrochart` | 星盘 | 命盘·占星 | A fields | ✅ |
| 2 | `astrochart_like` | 十三分盘/占星地图 | 命盘·占星 | A fields | ✅（同 astrochart）|
| 3 | `indiachart` | 印度占星 | 命盘·占星 | A fields | ✅ |
| 4 | `guolao` | 七政四余 | 命盘·宿占 | A fields(+C 显示) | ✅ |
| 5 | `germany` | 量化盘 | 命盘·占星 | A fields | ✅（仅时间/宫制类）|
| 6 | `suzhan` | 宿占 | 命盘+事盘·宿占 | A fields | ✅（随 astro fields）|
| 7 | `primarydirect` | 星运-主/界限法 | 推运·单盘 | A fields(pd*) | ✅✅（全套主限）|
| 8 | `primarydirchart` | 星运-主限法盘 | 推运·单盘 | A fields(pd*) | ✅✅（同 7）|
| 9 | `zodialrelease` | 星运-黄道星释 | 推运·单盘 | A fields + 层级 | ✅✅（基点+层级）|
| 10 | `firdaria` | 星运-法达星限 | 推运·单盘 | A fields | ⛔（随盘出，无独立 opt）|
| 11 | `distributions` | 星运-界推运 | 推运·单盘 | A fields | ⛔（仅随盘）|
| 12 | `agepoint` | 星运-年龄推进点 | 推运·单盘 | A fields | ⛔（仅随盘）|
| 13 | `profection` | 星运-小限法 | 推运·目标时刻 | A fields + 时刻 | ✅（目标时刻）|
| 14 | `solararc` | 星运-太阳弧 | 推运·目标时刻 | A fields + 时刻 | ✅（目标时刻）|
| 15 | `solarreturn` | 星运-太阳返照 | 推运·目标时刻 | A fields + 时刻 | ✅（目标年+异地）|
| 16 | `lunarreturn` | 星运-月亮返照 | 推运·目标时刻 | A fields + 时刻 | ✅（目标+异地）|
| 17 | `givenyear` | 星运-流年法 | 推运·目标时刻 | A fields + 时刻 | ✅（目标+异地）|
| 18 | `decennials` | 星运-十年大运 | 推运·单盘 | A fields + 多选项+层级 | ✅✅（起运/序/日限/历/层级）|
| 19 | `planetaryages` | 星运-行星年龄 | 推运·单盘 | A fields | ⛔（固定七阶表）|
| 20 | `vedicprog` | 星运-恒星推运 | 推运·目标时刻 | A fields + 时刻 | ✅（目标日期+时间）|
| 21 | `balbillus` | 星运-Balbillus | 推运·单盘 | A fields + 多选项 | ✅✅（起星/年制/距离口径）|
| 22 | `triplicityrulers` | 星运-三分主星 | 推运·单盘 | A fields + 选项 | ✅✅（划分法+寿命）|
| 23 | `keypoints` | 星运-数字相位 | 推运·单盘 | A fields + 选项 | ✅（释放模式）|
| 24 | `lunationphase` | 星运-月相推运 | 推运·单盘 | A fields | ⛔（maxAge 固定不暴露）|
| 25 | `extrareturns` | 星运-多重回归 | 推运·单盘 | A fields + 选项 | ✅（回归体）|
| 26 | `yearsystem129` | 星运-129年系统 | 推运·单盘 | A fields | ⛔（随盘）|
| 27 | `planetaryarc` | 星运-行星弧 | 推运·目标时刻 | A fields + 时刻+弧源 | ✅✅（弧源+目标时刻）|
| 28 | `persiandirected` | 星运-波斯向运 | 推运·单盘 | A fields + 选项 | ✅✅（速率+方向）|
| 29 | `jaynesprog` | 星运-赤纬推运 | 推运·目标时刻 | A fields + 时刻 | ✅（目标日期+时间）|
| 30 | `bazi` | 八字 | 八字紫微 | A fields(已通) | ✅✅ |
| 31 | `ziwei` | 紫微斗数 | 八字紫微 | A fields + 流派(C) | ✅✅（流派/四化/盘式 + 运限只读）|
| 32 | `canping` | 邵子参评数 | 数算 | A fields(时间) | ✅（取法，P2 builder 硬编码）|
| 33 | `heluo` | 河洛理数 | 数算 | A fields(时间) | ◐（取化工法，P2 未接线）|
| 34 | `xianqin` | 演禽 | 演禽策天 | A fields | ⛔（随出生 fields）|
| 35 | `cetian` | 策天飞星 | 演禽策天 | A fields | ⛔（随出生 fields）|
| 36 | `huangji` | 皇极经世 | 演禽策天 | A fields | ⛔（随出生 fields）|
| 37 | `sixyao` | 六爻 | 卜卦世俗 | **D 只读** | ⛔（不可重摇卦）|
| 38 | `tongshefa` | 统摄法 | 卜卦世俗 | **D 只读** | ⛔（只读已存）|
| 39 | `liureng` | 大六壬 | 三式 | B payload | ✅✅（起课法/换将/分昼夜/贵人/遁干）|
| 40 | `jinkou` | 金口诀 | 三式 | B payload | ✅✅（地分/贵人/遁干）|
| 41 | `qimen` | 奇门遁甲 | 奇门 | B payload | ✅✅（19 键起局）|
| 42 | `sanshiunited` | 三式合一 | 三式 | B payload(复合) | ✅✅（六壬+奇门+太乙）|
| 43 | `taiyi` | 太乙 | 三式 | B payload | ✅✅（盘式/古法/时基/博弈）|
| 44 | `horary` | 卜卦盘 | 卜卦世俗 | B payload + 时刻 | ✅（问题类别14 + 起卦时刻）|
| 45 | `election` | 择日盘 | 卜卦世俗 | B payload + 时刻 | ✅（用事类别19 + 起盘时刻）|
| (45) | `mundane` | 世俗盘 | 卜卦世俗 | **D 只读** | ⛔（多类型，只读 payload.aiSnapshot）|

> `mundane` 是第 11 个事盘 key（与上 #45 election 同区，未单列编号；事盘列表共 11 项 = `sixyao/tongshefa/liureng/jinkou/qimen/sanshiunited/taiyi/suzhan/horary/election/mundane`）。

**驱动类四分（见原方案 §0.3）**：
- **A（record fields 驱动）**：选项 merge 进重算用 `record.*` → `buildFieldObject(record)`（`aiAnalysisContext.js:277`）读出 → `fieldParams`（`:331`）→ `fetchChart` / 各 builder。占星/印度/七政/量化/宿占/八字/紫微时间项/数算时间项/演禽/策天/皇极 + 全部西洋推运。
- **B（payload 驱动）**：选项 merge 进重算用 `payload`（顶层或 `payload.options`）→ `regenerateCaseTechniqueSnapshot`（`:731`）已读。奇门/太乙/金口诀/六壬/三式合一/卜卦/择日。
- **C（全局 localStorage 驱动）**：builder 自读全局显示偏好键。七政显示偏好 / 紫微四化流派单例 / 紫微杂曜显示。
- **D（不可重算，只读已存 + 仅内容段勾选）**：六爻 / 统摄法 / 世俗盘。设置面板**隐藏重算项**，只给「纳入内容」勾选（六爻额外可调起卦时刻的时区/经度，但**不重摇卦**）。

---

## 1. 推运"单盘默认当前时刻"总则（务必照做）

用户口径：太阳弧 / 法达 / 主限法 等推运是**一个盘**，**默认用当前时刻起盘后挂载、且可调（时间 / 时间段）**。逐技法落实：

| 推运 | 当前快照默认时刻 | 现状写死处 | 可调字段(挂载侧应加) |
|---|---|---|---|
| `profection/solararc/solarreturn/lunarreturn/givenyear` | **此刻**（`new DateTime().format('YYYY-MM-DD HH:mm')`），`tmType:'y'` | `buildPredictivePeriodSnapshot` `aiAnalysisContext.js:960` 写死 `datetimeStr=new DateTime()` | `targetDatetime`(目标时刻)、`tmType`(年/月/日步长)、`asporb`(容许度)、`nodeRetrograde`；solar/lunar/given 另加 `dirLat/dirLon`(异地返照) |
| `planetaryarc` | **今日 12:00**（`todayStr()`），弧源=**月亮** | `buildPlanetaryArcSnapshotText` `AstroPlanetaryArc.js:66` 写死 `datetime:todayStr(), arcSource:MOON` | `arcSource`(弧源星)、`targetDatetime`、`asporb` |
| `vedicprog` | **今日 12:00:00**（`today()/'12:00:00'`） | `AstroVedicProgressions.js`（snapshot 走 `/astroextra/progressions`，目标 = today） | `targetDate`、`targetTime` |
| `jaynesprog` | **今日 12:00:00** | `AstroJaynesProgressions.js:24`（snapshot 写死 `targetDate:today(), targetTime:'12:00:00', orb:1.0`）| `targetDate`、`targetTime` |
| `primarydirect/primarydirchart` | **不按目标时刻**：主限按**年数**铺全程 | `buildFieldObject` 不含 `pdYears` → 后端默认 **100 年** | `pdYears`(年数,**默认100**,范围1–180) + 主限全套(下§2.7) |
| `zodialrelease` | 基点=**福点 Pars Fortuna**，输出=**L1 全列**，stopLevel=3 | `buildZodialReleaseSnapshotText` `AstroZR.js:273`/`:293` 写死 | `basePoint`、`aiMode`(层级)、`stopLevelIdx`、`aiL1Idx/aiL2Idx/aiL3Idx` |
| `decennials` | 起运=本光、序=黄道、日限=Valens、历=传统、输出=L1全列 | `buildDecennialsSnapshotText` `AstroDecennials.js:238` 写死 | `startMode/orderType/dayMethod/calendarType` + `aiMode`(层级)+ L1/L2/L3 idx |
| `triplicityrulers` | 划分=三分、寿命=75 | `regenerateChartTechniqueSnapshot` 不传 opts → builder 用 `TRIPLICITY_DEFAULT_OPTS` | `division`、`lifespan` |
| `balbillus` | 起星=日、年制=Solar、距离=nearest、maxDepth=5、maxAge=120 | builder 用 `BALBILLUS_DEFAULT_OPTS` | `startPlanet`、`yearType`、`mode` |
| `keypoints` | 释放=身(月亮起 soul)、maxAge=120 | builder 用 `KEYPOINTS_DEFAULT_OPTS` | `mode`(soul/body) |
| `persiandirected` | 速率=波斯1°/年、方向=direct、maxAge=90 | builder 写死 | `rateKey`、`direction` |
| `extrareturns` | 三体(土/木/月交)全列、count=4 | builder 写死 `count:4` 遍历 BODIES | `body`(单选展开,可选)、`count` |

> 重算需"绕过 payload/cache 命中、强制 regenerate"（原方案 §2.2 `getAnalysisTechniqueContextWithOptions`）。对**单盘类推运**，目标时刻/层级/选项**目前 builder 不收**（snapshot 走默认）→ **要让这些选项生效，必须给对应 `buildXxxSnapshotText` 增加 opts 形参**（见各节"接线缺口"）。这部分是 P1/P2 增强；阶段二可先只接 **A 类 fields（含 pdYears）+ B 类 payload + horary/election 类别**这批已有接收口的，把"目标时刻/层级/划分法"列入 schema 但标 `wireGap:true`（接线后即生效）。

---

## 2. 逐技法完整设置表

> 表头统一：**设置名 | 控件类型 | 默认(=现状) | 可选项/范围 | 应用方式 | 备注**。
> 应用方式取值：`record.X`(A 类写 record 字段)｜`payload.X`(B 类写 payload 顶层)｜`payload.options.X`(B 类写 options)｜`localStorage:KEY`(C 类)｜`builderOpts.X`(需给 builder 加 opts 形参,标接线缺口)｜`时刻`(目标时刻类)。
> 控件类型：`select`｜`switch`｜`checkbox`｜`number`｜`datetime`｜`date`｜`time`｜`radio`｜`multiSelect`。

### 2.1 命盘类 · 占星

#### `astrochart`（星盘）/ `astrochart_like`（十三分盘/占星地图）

来源：`components/astro/AstroChartMain.js` + 全局「星盘组件」设置。fields 经 `buildFieldObject` 已部分读 record。

| 设置名 | 控件 | 默认 | 可选项/范围 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 宫制 hsys | select | `0` | HouseSys 全集（`AstroConst.HouseSys`，0=Placidus…含 Alcabitius/公开方法/Koch/整宫/福点整宫等）| `record.hsys` | 已 in fieldParams |
| 黄道 zodiacal | select | `0` | `0`回归 / `1`恒星 | `record.zodiacal` | 已 in fieldParams |
| 历法/传统择宫 tradition | select | `0` | `0`现代 / `1`传统（horary/election 默认 1）| `record.tradition` | 已 in buildFieldObject |
| 容许度方案 strongRecption | switch | `0` | `0/1`（强互容）| `record.strongRecption` | 已读 |
| 简化相位 simpleAsp | switch | `0` | `0/1` | `record.simpleAsp` | 已读 |
| 虚点接收相位 virtualPointReceiveAsp | switch | `0` | `0/1` | `record.virtualPointReceiveAsp` | 已读 |
| 斗柄28宿 doubingSu28 | switch | `0` | `0/1` | `record.doubingSu28` | 已读 |
| 南半球盘 southchart | switch | `0` | `0/1` | `record.southchart` | 已 in fieldParams |
| 时间算法 timeAlg | select | `0` | `0`真太阳时 / `1`钟表时 | `record.timeAlg` | 已读 |
| 性别 gender | select | `1` | `1`男 / `0`女 / `-1`未知 | `record.gender` | 已读 |
| 容许度档 orbScale | select | 现状(record 存) | orbs 方案 | `record.orbs`/`record.orbScale` | localcharts 已持久；`buildFieldObject` 尚未读→接线缺口(仅当要可调时) |

> `astrochart_like` 与 `astrochart` 同 fields（同一西洋盘 → 抽 13 分盘/ACG），schema 复用 astrochart 一份。

#### `indiachart`（印度占星）

来源：`components/astro/IndiaChartMain.js`。重算：`buildIndiaSnapshotForFields(buildFieldObject(record), 1)`（第二参 `1`=某 varga/ayanamsa 模式，固定）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 同 astrochart 的 hsys/zodiacal/timeAlg/gender | — | 同上 | 同上 | `record.*` | 印度盘多以恒星黄道(zodiacal=1)起；schema 复用占星 fields 子集 |
| 分盘/Ayanamsa 模式 | select | 固定 `1` | （组件内 varga 选择）| `builderOpts`（`buildIndiaSnapshotForFields` 第二参）| 接线缺口；当前写死 1，要可调需透传 |

#### `germany`（量化盘 / 中点盘）

来源：`components/germany/AstroMidpoint.js`。重算：`buildGermanySnapshotForFields(buildFieldObject(record))`。snapshot 段（行星图/映点/中点/90°盘/TNP/中点相位/中点列表）**全由 fields + 固定 Witte 标准(base=90,orb=1)算出**，无额外显示选项进 snapshot。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| hsys/zodiacal/timeAlg/gender | — | 同 astrochart | 同上 | `record.*` | 仅这些影响盘 |

> TNP 集合 / 中点扫描 orb 是 snapshot 内部常量（`uranianDial` SNAP_BASE/orb=1），**非用户可调** → schema 不列。量化盘实际可调项很少（仅起盘 fields）。

### 2.2 命盘类 · 宿占

#### `guolao`（七政四余）

来源：`components/guolao/GuoLaoInput.js` + `GuoLaoChartStyle.js`。重算：`buildGuolaoSnapshotForFields(buildFieldObject(record))`。

**影响 snapshot 的（A 类 fields，已 in buildFieldObject）**：

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 命度法 guolaoLifeMode | select | `asc`(本命度·上升) | `asc` / `yumao`(逾卯) / `cotrans`(同升) | `record.guolaoLifeMode` | `buildFieldObject:325` 已读（缺省 undefined→builder 回退全局默认）|
| 罗计法 guolaoNodeMode | select | `northKetuSouthRahu`(北计南罗) | `northKetuSouthRahu` / `northRahuSouthKetu` | `record.guolaoNodeMode` | `buildFieldObject:326` 已读 |
| 宿度 doubingSu28 | select | `2` | su28 mode 0–4（回归今制/开禧/恒星郑式/荀爽19年/斗柄定房）| `record.doubingSu28`(或 su28Mode) | 与 `GUOLAO_SU28_MODE_KEY` 对齐；现 fieldObject 只 0/1，宿度多档要扩 |
| 性别 gender | select | `1` | 男/女/未知 | `record.gender` | 已读 |
| 时间算法 timeAlg | select | `0` | 真太阳时/钟表时 | `record.timeAlg` | 已读 |

**仅显示、不进 snapshot（C 类 localStorage，可选放在面板"显示偏好"区）**：盘式 `horosaGuolaoChartStyle`(默认 moira) / 宿度模式 `horosaGuolaoSu28Mode`(默认2) / 神煞流曜 `horosaGuolaoMoiraTransitGods` / 显示偏好 `horosaGuolaoDisplay`(相位会衝刑合半合/庙旺/山向/生神/年龄环)。**这些不改 snapshot 文本** → 默认归为"不暴露"（或归显示偏好但提示"不影响 AI 内容"）。

#### `suzhan`（宿占）

来源：`components/suzhan/SuZhanMain.js`。重算：`buildSuzhanSnapshotText(chartObj, buildFieldObject(record), null)`（chartObj=标准西洋盘）。**完全随 astro fields**（28 宿数据来自西洋盘）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| hsys/zodiacal/timeAlg/gender/doubingSu28 | — | 同 astrochart | 同上 | `record.*` | schema 复用占星 fields 子集 |

> 命盘 `suzhan` 走 chart 路径；事盘 `suzhan`（在 ANALYSIS_CASE 列表）走 case 路径（随事盘起课时间的西洋盘）。两者 schema 同 fields，仅源不同。

### 2.3 推运类 · 单盘（西洋星运）

> 所有西洋推运共享本命盘 fields（hsys/zodiacal/tradition/timeAlg…经 `fetchChartResultForRecord` → `buildFieldObject` → `fetchChart`）。**故每个推运 schema 都隐含继承 astrochart 的起盘 fields**（改起盘 fields 会改本命盘 → 改推运）。下表只列**该推运独有的、超出起盘 fields 的设置**。

#### `primarydirect` / `primarydirchart`（主/界限法 · 主限法盘）

来源：`components/astro/AstroPrimaryDirection.js`（工具栏 7 组控件）/ `AstroPrimaryDirectionChart.js`。重算：`fetchChartResultForRecord(record,{includePrimaryDirection:true})` → `buildPrimaryDirectSnapshotText`。`pdMethod/pdTimeKey/pdtype/pdDirect/pdConverse/pdAntiscia/pdTerms` 已 in `buildFieldObject`/`fieldParams`；**`pdYears` 尚未 in fieldParams**（接线缺口）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 方位法 pdMethod | select | `core_alchabitius` | `core_alchabitius`(Alchabitius) / `placidus`(半弧) / `regiomontanus` / `campanus` / `topocentric` / `horosa_legacy`(Horosa原方法) | `record.pdMethod` | 已 in fieldParams；白名单 `SUPPORTED_PD_METHODS` |
| 度数换算 pdTimeKey | select | `Ptolemy` | `Ptolemy` / `Naibod` / `TrueSolarArc`(真太阳弧) | `record.pdTimeKey` | 已读 |
| 方向 pdtype | select | `0` | `0`In Zodiaco / `1`In Mundo（世俗）| `record.pdtype` | 已读 |
| 向运·顺 pdDirect | checkbox | `1`(开) | `0/1` | `record.pdDirect` | **默认开**；顺逆至少留一 |
| 向运·逆 pdConverse | checkbox | `1`(开) | `0/1` | `record.pdConverse` | **默认开**（用户偏好），顺逆不可全关 |
| **年数 pdYears** | number | **`100`** | **1–180**，step 1 | `record.pdYears`（**需 builder/fieldParams 接线**）| **用户点名"年龄选择默认100年"**；`normalizePdYears` 兜底 100；当前不在 fieldParams → 接线缺口 |
| 附加·映点 pdAntiscia | checkbox | `0`(关) | `0/1` | `record.pdAntiscia` | 已读 |
| 附加·界 pdTerms | checkbox | `0`(关) | `0/1` | `record.pdTerms` | 已读 |
| 显示界限法 showPdBounds | switch | `1` | `0/1` | `record.showPdBounds`/固定 1 | snapshot 端固定置 1（`aiAnalysisContext.js:1106`）；仅影响 core 旧路径显隐 |

> `primarydirchart` 与 `primarydirect` 走**同一主限方向数据**（`aiAnalysisContext.js:1092` 两 case 合并）→ **schema 完全相同**，建议 `primarydirchart` 引用 `primarydirect` 的字段数组。

#### `zodialrelease`（黄道星释）

来源：`components/astro/AstroZR.js`。重算：`buildZodialReleaseSnapshotText`（`AstroZR.js:273`）—**写死** basePoint=福点、aiMode=L1全列、stopLevelIdx=3、startSign=null。**要可调必须给该 standalone builder 加 opts**（接线缺口）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 推运基点 basePoint | radio | `PARS_FORTUNA`(福点) | 福点/精神点(`PARS_SPIRIT`)/水星点/金星点/火星点/木星点/土星点 + ASC/DESC/MC/IC（共 11）| `builderOpts.basePoint` → `/predict/zr` 的 `startSign`/基点 | 用户点名"具体选哪一层" |
| **输出层级 aiMode** | select | `l1_all` | `l1_all`(所有L1) / `l2_in_l1`(某L1下全L2) / `l3_in_l2`(某L2下全L3) / `l4_in_l3`(某L3下全L4) | `builderOpts.aiMode` | **层级选择核心**：决定快照输出 L1/L2/L3/L4 哪一层 |
| L1 选择 aiL1Idx | select | `0` | 动态(L1 节点列表) | `builderOpts.aiL1Idx` | aiMode≠l1_all 时生效 |
| L2 选择 aiL2Idx | select | `0` | 动态 | `builderOpts.aiL2Idx` | l3/l4 模式生效 |
| L3 选择 aiL3Idx | select | `0` | 动态 | `builderOpts.aiL3Idx` | l4 模式生效 |
| 停止层级 stopLevelIdx | number | `3` | 0–3（递归到第几层）| `builderOpts.stopLevelIdx` → `/predict/zr` | 控制后端返回深度 |

#### `firdaria`（法达星限）— 无独立可调

随西洋盘 `predictives.firdaria` 一并返回（`AstroFirdaria.js` 只渲染 `chart.predictives.firdaria`）。重算 `buildFirdariaSnapshotText(chartObj)` 无 opts。**schema：仅继承起盘 fields，无独立字段**（`fields:[]` + 仅段勾选）。

#### `distributions`（界推运）— 无独立可调

`AstroDistributions.js` 无任何控件（只 fetch `/predict/dist`）。重算 `buildDistributionsSnapshotText(chartObj)` 无 opts。**schema：仅起盘 fields**。

#### `agepoint`（年龄推进点 Huber）— 无独立可调

`AstroAgePoint.js` 无控件（fetch `/predict/agepoint`）。**schema：仅起盘 fields**。

#### `planetaryages`（行星年龄）— 无独立可调

托勒密人生七阶固定表，纯前端读本命。**schema：仅起盘 fields**。

#### `yearsystem129`（129 年系统）— 无独立可调

随盘 predictive 返回（仿 firdaria）。**schema：仅起盘 fields**。

#### `lunationphase`（月相推运）— maxAge 固定不暴露

`AstroLunationPhase.js` 用 `LUNATION_DEFAULT_OPTS={maxAge:90}` 作固定 state，**UI 无控件改它**。snapshot `buildLunationPhaseSnapshotText(chartObj, opts)` 收 opts 但组件永远传默认。**schema：仅起盘 fields**（maxAge 可选标 `wireGap` 备用，但用户在技法页也调不了→建议不列）。

#### `decennials`（十年大运）

来源：`components/astro/AstroDecennials.js`。重算：`buildDecennialsSnapshotText`（`AstroDecennials.js:238`）**写死** 4 个 settings + aiMode=L1全列。**要可调须给 builder 加 opts**（接线缺口）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 起运主星 startMode | select | `DECENNIAL_START_MODE_SECT_LIGHT`(本光) | 本光起 / （其它 start modes，见 `utils/decennials`）| `builderOpts.startMode` | |
| 分配次序 orderType | select | `DECENNIAL_ORDER_ZODIACAL`(黄道序) | 黄道序 / `DECENNIAL_ORDER_CHALDEAN`(迦勒底序)| `builderOpts.orderType` | |
| 日限体系 dayMethod | select | `DECENNIAL_DAY_METHOD_VALENS`(Valens) | Valens / `DECENNIAL_DAY_METHOD_HEPHAISTIO`(Hephaistio)| `builderOpts.dayMethod` | |
| 时间口径 calendarType | select | `DECENNIAL_CALENDAR_TRADITIONAL`(传统历) | 传统历 / `DECENNIAL_CALENDAR_ACTUAL`(实际历)| `builderOpts.calendarType` | |
| 输出层级 aiMode | select | `l1_all` | L1全列 / L2 in L1 / L3 in L2 / L4 in L3（年/月/日/时主星）| `builderOpts.aiMode` | **层级**(同 ZR 四档)|
| L1/L2/L3 选择 | select | `0` | 动态 | `builderOpts.aiL{1,2,3}Idx` | 钻取 |

#### `vedicprog`（恒星推运）

来源：`components/astro/AstroVedicProgressions.js`。snapshot 走 `/astroextra/progressions`，目标 = today 12:00:00。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 目标日期 targetDate | date | 今日 | 任意日期 | `builderOpts.targetDate` | 接线缺口（snapshot 写死 today）|
| 目标时间 targetTime | time | `12:00:00` | 任意 | `builderOpts.targetTime` | 同上 |

#### `balbillus`（Balbillus 129 年旺距削减）

来源：`components/astro/AstroBalbillus.js`。重算 `buildBalbillusSnapshotText(chartObj)` 用 `BALBILLUS_DEFAULT_OPTS`。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 起运星 startPlanet | select | `SUN`(太阳) | 七政（日/月/水/金/火/木/土）| `builderOpts.startPlanet` | 接线缺口 |
| 年制 yearType | select | `solar` | `solar`(回归年365.2422) / `hellenistic`(360 日) | `builderOpts.yearType` | |
| 距离口径 mode | select | `nearest` | `nearest`(最近角距) / `forward`(顺黄道距) | `builderOpts.mode` | |
| (maxDepth/maxAge) | — | 5 / 120 | 固定 | — | UI 无控件→不列 |

#### `triplicityrulers`（三分主星）

来源：`components/astro/AstroTriplicityRulers.js`（2 控件）。重算 `buildTriplicityRulersSnapshotText(chartObj)` 用 `TRIPLICITY_DEFAULT_OPTS`。**用户点名"三分主星法的年龄选择+行星选择"** —— 经核：该技法的"行星"是按盘自动取（区间光体三分主星，非用户选），用户可调的是**划分法 + 寿命基准(年龄/岁)**；"行星"不可手选（由昼夜+区间光体座决定）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 划分法 division | select | `thirds`(三分 0–25/25–50/50–75) | `thirds` / `halves`(两分 上/下半生 + 协作贯穿)| `builderOpts.division` | 接线缺口 |
| 寿命基准(岁) lifespan | number | `75`(`TRIPLICITY_LIFESPAN_DEFAULT`) | **30–120** | `builderOpts.lifespan` | **"年龄选择"即此**（决定各阶段切分的年龄上限）|

> 行星分掌由 `buildTriplicityPeriods` 按区间光体三分主星 + 昼夜换序自动给出（`TRIPLICITY_HOUSE_SIGS` 逐宫三分主星表是象征展示，非可选）→ schema 不设"行星选择"控件。

#### `keypoints`（数字相位 120 年关键点）

来源：`components/astro/AstroKeypoints.js`。重算 `buildKeypointsSnapshotText(chartObj)` 用 `KEYPOINTS_DEFAULT_OPTS`。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 释放模式 mode | select | `soul`(身/月亮起) | `soul`(身·月亮) / `body`(命·上升)| `builderOpts.mode` | 接线缺口；`RELEASE_MODES` |
| (maxAge) | — | 120 | 固定 | — | UI 无控件 |

#### `extrareturns`（多重回归）

来源：`components/astro/AstroExtraReturns.js`（body 单选）。重算 `buildExtraReturnsSnapshotText(chartObj)` **遍历全部 3 体、count=4**（与组件单选不同 —— 组件单选一体看 5 回，snapshot 列全 3 体各 4 回）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 回归体 body | select | snapshot=全列(`Saturn/Jupiter/Node`)；组件单选默认 `Saturn` | `Saturn`(土返≈29.5y) / `Jupiter`(木返≈11.9y) / `Node`(月交返≈18.6y) | `builderOpts.body`（若要从全列改单选）| 接线缺口；默认保持"全列"=现状 |
| 回数 count | number | snapshot=4 / 组件=5 | 正整数 | `builderOpts.count` | 同上 |

#### `planetaryarc`（行星弧）

来源：`components/astro/AstroPlanetaryArc.js`。snapshot `buildPlanetaryArcSnapshotText` **写死** datetime=今日12:00、arcSource=月亮。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 弧源星 arcSource | select | `MOON`(月亮弧) | 月/水/金/火/木/土/日（`ARC_SOURCES`，7 星）| `builderOpts.arcSource` | 接线缺口 |
| 目标时刻 targetDatetime | datetime | 今日 12:00 | 任意 | `builderOpts.datetime` | 同上 |
| 容许度 asporb | select | `1`(1度) | -1(双星均)/0.5/1/1.5/2/2.5/3/4 | `builderOpts.asporb` | 见 `AstroDirectionForm` 容许度表 |

#### `persiandirected`（波斯向运）

来源：`components/astro/AstroPersianDirected.js`（速率+方向）。snapshot `buildPersianDirectedSnapshotText` 写死 rate=波斯、direction=direct、maxAge=90。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 向运速率 rateKey | select | `persian`(1°/年) | `persian`(波斯1°/年) / `prophected`(30°/年) / `naibod`(59′08″/年) | `builderOpts.rateKey` | 接线缺口 |
| 方向 direction | select | `direct`(逆时针) | `direct` / `converse`(顺时针)| `builderOpts.direction` | |
| (maxAge) | — | 90 | 固定 | — | UI 无控件 |

#### `jaynesprog`（赤纬推运）

来源：`components/astro/AstroJaynesProgressions.js`。snapshot 写死 targetDate=today、targetTime=12:00:00、orb=1.0。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 目标日期 targetDate | date | 今日 | 任意 | `builderOpts.targetDate` | 接线缺口 |
| 目标时间 targetTime | time | `12:00:00` | 任意 | `builderOpts.targetTime` | 同上 |

### 2.4 推运类 · 目标时刻型（profection/solararc/returns）

这 5 个走 `POST /predict/<key>` + `buildPredictivePeriodSnapshot`（`aiAnalysisContext.js:960`），目标时刻**写死此刻**。控件来自 `AstroDirectionForm`（profection/solararc）或 `AstroSolarReturn/LunarReturn/GivenYear`（带异地+inverse）。

#### `profection`（小限法）/ `solararc`（太阳弧）

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 目标时刻 targetDatetime | datetime | **此刻**(组件=本命日+1天起；snapshot=`new DateTime()`) | 任意 | `builderOpts.datetime`（`buildPredictivePeriodSnapshot` 写死 → 接线缺口）| **"默认当前时刻、可调时间"** |
| 步长 tmType | select | `y`(年) | `y`/`m`/`d`（年/月/日推进单位）| `builderOpts.tmType` | snapshot 写死 'y' |
| 容许度 asporb | select | `1` | -1/0.5/1/1.5/2/2.5/3/4 | `builderOpts.asporb` | snapshot 写死 1 |
| 南北交逆移 nodeRetrograde | select | `false` | `true`/`false` | `builderOpts.nodeRetrograde` | snapshot 写死 false |
| 起盘时区 dirZone | (随目标时刻) | 本命 zone | 任意 | `builderOpts.dirZone` | 跟目标时刻 |

#### `solarreturn`（太阳返照）/ `lunarreturn`（月亮返照）/ `givenyear`（流年法）

在 profection/solararc 基础上**额外**：

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 目标时刻 targetDatetime | datetime | 此刻(本命日+1天) | 任意 | `builderOpts.datetime` | 返照盘的目标年/月份所在时刻 |
| 异地·纬度 dirLat | text | 本命 lat | 任意经纬 | `builderOpts.dirLat` | 异地返照（迁居地起盘）|
| 异地·经度 dirLon | text | 本命 lon | 任意 | `builderOpts.dirLon` | 同上 |
| 内外盘 inverse | select | `true`(返照盘在内盘) | `true`(返照在内) / `false`(原命盘在内)；givenyear 标签为"天象盘/原命盘"| `builderOpts.inverse` | **仅影响盘图渲染、不进 snapshot 文本** → 可选不列 |
| tmType/asporb/nodeRetrograde | 同上 | 同上 | 同上 | `builderOpts.*` | |

> snapshot 端 `buildPredictivePeriodSnapshot` 当前不收任何 builderOpts（全写死此刻+'y'+1+本命经纬）→ 这批"目标时刻/异地"全是接线缺口；阶段二先把字段列进 schema（标 `wireGap`），P1 给 `buildPredictivePeriodSnapshot` 加 opts 形参后即生效。

### 2.5 八字紫微类

#### `bazi`（八字）

来源：`components/cntradition/CnTraditionInput.js`。重算：`buildBaziSnapshotForParams(buildChartBaziParams(record))`，params **已含**这些字段（`aiAnalysisContext.js:785`）。**全通用、无接线缺口**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 性别 gender | select | `1` | 男/女/未知 | `record.gender` | |
| 时间算法 timeAlg | select | `0` | `0`真太阳时 / `1`直接时间 / `2`春分定卯时 | `record.timeAlg` | **3 档**（八字独有第 3 档）|
| 长生 phaseType | select | `0` | `0`火土同 / `1`水土同 / `2`阳顺阴逆 | `record.phaseType` | 已 in baziParams |
| 神煞起点 godKeyPos | select | `年`(按年柱) | `年`(按年柱) / `日`(按日柱) / `年日`(都查)| `record.godKeyPos` | 已 in baziParams |
| 换日 after23NewDay | select | `defaultAfter23NewDay()` | `1`(23点算次日) / `0`(24点算次日)| `record.after23NewDay` | |
| 晚子时柱 lateZiHourUseNextDay | select | `defaultLateZiHourUseNextDay()` | `1/0` | `record.lateZiHourUseNextDay` | |
| 节气修正 adjustJieqi | select | `0` | `0`不调整 / `1`按纬度调整 | `record.adjustJieqi` | 已 in baziParams |
| UI 模式 uiMode | select | `modern` | 新/旧星阙 UI | （不进 snapshot）| 展示偏好，不列入重算 |

#### `ziwei`（紫微斗数）

来源：`components/ziwei/ZiWeiInput.js` + `ZiWeiMain.js` + `constants/ZWConst.js`。重算：`buildZiweiSnapshotForParams(buildChartZiweiParams(record))`。snapshot 含 **起盘信息(含四化流派/时间算法/性别) + 宫位总览(含每宫大限区间) + 来因宫 + 命中格局**。

**A 类 fields（已 in ziweiParams）**：

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 性别 gender | select | `1` | 男/女/未知 | `record.gender` | |
| 时间算法 timeAlg | select | `0` | 真太阳时/直接时间 | `record.timeAlg` | |
| 换日 after23NewDay | select | 默认 | 23/24点 | `record.after23NewDay` | |
| 晚子时柱 lateZiHourUseNextDay | select | 默认 | 1/0 | `record.lateZiHourUseNextDay` | |

**C 类全局 localStorage（影响 snapshot 的四化/格局）**：

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| **四化流派 sihuaSchool** | select | `beipai`(北派·飞星=现状) | `beipai` / `zhongzhou`(中州派) / `custom`(自定义) | `localStorage:ziweiSihuaSchool` + 全局单例 `ZWConst.ZWSchool.school`；非 beipai 时 `params.sihua=getActiveSiHuaGan()`（`ZiWeiMain.js:181`）| **进 snapshot**：改四化表 → 改星曜四化标注 + 后端格局判定（`buildZiWeiSnapshotText:125`）|
| 自定义四化表 sihuaCustom | （子弹窗）| — | 十干四化覆盖 | `localStorage:ziweiSihuaCustom` | school=custom 时读 |

**运限（大限/流年/流月/流日/流时）——用户点名"可选时间段与运限"**：

| 层级 | 现状 | 是否进 snapshot | 备注 |
|---|---|---|---|
| 大限 daxian | snapshot **每宫输出大限区间**（`house.direction`）| ✅ 已在 | snapshot 已含全部宫的大限范围 |
| 流年 liunian / 小限 xiaoxian / 流月 liuyue / 流日 liuri / 流时 liushi | `ZWLuckPanel.js` 交互导航(chips)，驱动盘面流命环，**不进 snapshot 文本** | ⛔ 当前不在 snapshot | 这是**展示/导航**层；要让 AI 读"某大限/某流年"需扩 `buildZiWeiSnapshotForParams` 输出选定运限层（接线缺口，P2）|
| 小限顺逆 ziweiXiaoxianYinyang | `0`(男顺女逆=现状) / `1`(阳男阴女顺·中州) | ⛔ 仅 luck panel | `localStorage:ziweiXiaoxianYinyang`；不进 snapshot |

> **结论（紫微运限）**：snapshot 现状已含**大限**（逐宫区间）。**流年/流月/流日/流时是 luck panel 的交互导航、未进 AI 快照**。schema 对 ziwei 的"运限"项：
> - **可即时落地**：四化流派(C)、性别/时间算法/换日(A)、小限顺逆(C，但仅说明不影响 AI)。
> - **P2 接线缺口**：若要让 AI 分析"指定流年/流月/流日/流时"，需给 `buildZiweiSnapshotForParams` 加 `period:{level, daxianIdx, liunianYear, liuyueMonth, liuriDay, liushiHour}` 形参，复用 `ZWLuckPanel` 的 `buildDaxian/Liunian/Liuyue/Liuri/Liushi Items` + `getLayerSihua/getFlowStars` 输出该层四化/流曜文本。schema 先列字段、标 `wireGap`。

**仅显示、不进 snapshot（C 类）**：盘式 `ziweiChartType`(四化盘/三合盘) / 杂曜 `ziweiShowOthers` / 十二神小星 `ziweiShowSmall` / 提示 `ziweiTips`。归"显示偏好"或不列。

### 2.6 数算类

#### `canping`（邵子参评数）

来源：`components/shusuan/CanPingMain.js`（受控，method 由数算宿主左栏「取法」提供）。重算 `buildCanpingSnapshotForRecord(record)`（`aiAnalysisContext.js:848`）**写死** `method:'ming', qiyunAge:1`。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 起盘 fields（出生四柱）| — | 同八字时间项 | timeAlg/after23/lateZi/gender | `record.*`（经 `buildChartShusuanBazi`→`buildFieldObject`）| 时间项**通用**（改时间→改四柱→改参评数）|
| 取法 method | select | `ming`(明法·月支反向) | `ming` / `gu`(古法·八字日支)| `builderOpts.method`（`canpingCalculate` 入参）| **接线缺口**：snapshot 写死 'ming'，要可调须给 `buildCanpingSnapshotForRecord` 透传 method|
| 起运岁 qiyunAge | number | `1` | 正整数 | `builderOpts.qiyunAge` | 同上写死 1 |

#### `heluo`（河洛理数）

来源：`components/shusuan/HeLuoMain.js`。重算 `buildHeluoSnapshotForRecord(record)`（`aiAnalysisContext.js:884`）按四柱起先后天卦 + 大限 + 命运篇。**snapshot builder 不收任何流派 opts**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 起盘 fields（出生四柱）| — | 同八字时间项 | timeAlg/after23/lateZi/gender | `record.*` | 时间项**通用**|
| 取化工法 / 流派 | select | （现状默认）| （河洛流派选项，见 MEMORY「河洛 流派选项+命运篇补全」）| `builderOpts.*`（`heluoCalc` 入参）| **P2 未接线**：snapshot builder 当前用默认流派，组件左栏的「取化工法」未透传到无头 builder → 列字段标 `wireGap`，待 P2|

### 2.7 演禽 / 策天 / 皇极（ken 后端，随出生 fields）

#### `xianqin`（演禽）/ `cetian`（策天飞星）/ `huangji`（皇极经世）

重算：`buildKinAstroSnapshotForFields(buildFieldObject(record), 'xianqin'|'cetian')` / `buildHuangJiSnapshotForFields(buildFieldObject(record))`。**完全随出生 fields，无技法专属可调项**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 起盘 fields | — | 同 astrochart 时间/经纬/性别 | timeAlg/gender/after23 等 | `record.*` | schema 仅继承起盘 fields；无独立字段 |

### 2.8 三式 / 奇门类

#### `qimen`（奇门遁甲）

来源：`components/dunjia/DunJiaMain.js`（`DEFAULT_OPTIONS` `:81`，19 键）+ `DunJiaCalc.js`（各 OPTIONS）。重算：`regenerateQimenSnapshot(record, payload)`（已读 `payload.options`/`payload.qimen.options`）→ `calcDunJia(fields, nongli, options)`。**B 类全通用**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 性别 sex | select | `1` | 男(1)/女(0) | `payload.options.sex` | |
| 日期类型 dateType | select | `0` | 公历(0)/农历(1) | `payload.options.dateType` | |
| 闰月 leapMonthType | select | `0` | 不闰月(0)/使用闰月(1) | `payload.options.leapMonthType` | |
| 虚实岁 xuShiSuiType | select | `0` | 虚岁(0)/实岁(1) | `payload.options.xuShiSuiType` | |
| 节气 jieQiType | select | `1` | 节气按天(0)/按分(1) | `payload.options.jieQiType` | |
| 排盘类型 paiPanType | select | `3` | 年家(0)/金函日家(2)/时家(3)/刻家(4)/综合(5)| `payload.options.paiPanType` | ken 模式 1→3 归一 |
| 值符法 zhiShiType | select | `0` | 天禽值符-死门(0)/阴阳遁(1)/节气(2)| `payload.options.zhiShiType` | |
| 月家起局 yueJiaQiJuType | select | `1` | 年支(0)/符头地支(1)| `payload.options.yueJiaQiJuType` | |
| 年干支 yearGanZhiType | select | `2` | 正月初一(0)/立春当天(1)/立春交接(2)| `payload.options.yearGanZhiType` | |
| 月干支 monthGanZhiType | select | `1` | 节交接当天(0)/时刻(1)| `payload.options.monthGanZhiType` | |
| 日干支 dayGanZhiType | select | `0` | 晚子时按当天(0)/按明天(1)| `payload.options.dayGanZhiType` | |
| 起局法 qijuMethod | select | `zhirun` | 置闰(zhirun)/拆补(chaibu)| `payload.options.qijuMethod` | |
| 空亡 kongMode | select | `day` | 日空(day)/时空(time)| `payload.options.kongMode` | |
| 驿马 yimaMode | select | `day` | 日马(day)/时马(time)| `payload.options.yimaMode` | |
| 时间算法 timeAlg | select | `0` | 真太阳时(0)/直接时间(1)| `payload.options.timeAlg` | |
| 移宫 shiftPalace | select | `0` | 原宫(0)/顺转一~七宫(1–7)| `payload.options.shiftPalace` | `YIXING_OPTIONS` 8 档 |
| 换日 after23NewDay | select | 默认 | 23/24点（沿 DAY_SWITCH_OPTIONS）| `payload.options.after23NewDay` | |
| 晚子时柱 lateZiHourUseNextDay | select | 默认 | 1/0 | `payload.options.lateZiHourUseNextDay` | |
| 封局 fengJu | select | `false` | 未封局(false)/已封局(true)| `payload.options.fengJu` | |
| ~~相关人员 faRelatedPeople~~ | — | — | — | **不当 option 覆盖** | 是 `pan.faRelatedPeople`（数据非排盘选项）；`regenerateQimenSnapshot` 已处理；设置面板**勿当普通 option**（原方案 §6.8）|

#### `taiyi`（太乙）

来源：`components/taiyi/TaiYiMain.js`（state.options）+ `TaiYiCalc.js`。重算：`regenerateTaiyiSnapshot(record, payload)` → `fetchTaiyiPan(fields, nongli, options)`。**B 类通用**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 盘式 style | select | `3`(時計太乙) | 時計(3)/年計(0)/月計(1)/日計(2)/分計(4)/太乙命法(5)| `payload.options.style` | `STYLE_OPTIONS` |
| 古法公式 tn | select | `0`(太乙統宗) | 統宗(0)/金鏡(1)/淘金歌(2)/太乙局(3)| `payload.options.tn` | 命法(style=5)时隐藏 |
| 性别 sex | select | `男` | 男/女（命法用）/ 事盘 gender 未知(-1)/女(0)/男(1)| `payload.options.sex` / `record.gender` | |
| 时间基准 timeBasis | select | `direct`(直接时间) | 直接时间(direct)/真太阳时(trueSolar)| `payload.options.timeBasis` | |
| 换日 after23NewDay | select | 默认 | 23/24点 | `payload.options.after23NewDay` | |
| 晚子时柱 lateZiHourUseNextDay | select | 默认 | 1/0 | `payload.options.lateZiHourUseNextDay` | |
| 博弈 gameTheory | select | `0`(关闭) | 关闭(0)/开启(1)| `payload.options.gameTheory` | 命法时隐藏 |

#### `liureng`（大六壬）

来源：`components/lrzhan/LiuRengMain.js`。重算：`regenerateLiurengSnapshot(record, options)` —— `regenerateCaseTechniqueSnapshot`（`:738`）已把 payload 顶层这些键聚成 `liurengOpts` 透传。**B 类通用（payload 顶层，optionsPath:''）**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 十二长生/遁干 wuxing | select | `土` | 金/木/水/火/土（五行）| `payload.wuxing` | 影响遁干起长生 |
| 贵人体系 guireng | select | `2`(星占法) | 六壬法(0)/遁甲法(1)/星占法(2)| `payload.guireng` | |
| 起课法 castMethod | select | `zheng`(正时正将) | **25 法**：正时正将 + 十二客②–⑫ + 加时四法(太岁/月建/行年/本命加时) + 次客一/二/三筹 + 四柱对齐(年日/年时/月日/月时) + 选时(xuanshi) + 演数(yanshu)（见 `QI_METHODS`）| `payload.castMethod` | **起课法核心**，25 选项 |
| 选时支 xuanShiZhi | select | `''`(用正时) | 用正时('') / 子–亥 12 支 | `payload.xuanShiZhi` | castMethod=`xuanshi` 时显示 |
| 演数 yanShuNum | (number/input) | `''` | 随感之数 | `payload.yanShuNum` | castMethod=`yanshu` 时显示 |
| 换将 yueJiangMethod | select | `zhongqi`(中气过宫) | 中气过宫(zhongqi)/节气换将(jieqi)| `payload.yueJiangMethod` | |
| 分昼夜 fenZhouYe | select | `chenhun`(晨昏) | 晨昏(chenhun)/卯酉(maoyou)/寅申(yinshen)| `payload.fenZhouYe` | |

#### `jinkou`（金口诀）

来源：`components/jinkou/JinKouMain.js`。重算：`regenerateJinkouSnapshot(record, payload)`（读 `payload.{diFen,guireng,wuxing}`）。**B 类通用**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 遁干 wuxing | select | `土` | 金/木/水/火/土 | `payload.wuxing` | |
| 贵人体系 guireng | select | `0`(六壬法) | 六壬法(0)/遁甲法(1)/星占法(2)| `payload.guireng` | |
| 地分 diFen | select | `子` | 子–亥 12 支（"自动取月将"/"自动取时支"为 auto 选项）| `payload.diFen` | **金口诀取课基准**；可设 `auto` 自动取 |

#### `sanshiunited`（三式合一）

= 六壬 + 奇门 + 太乙三者 options 合并。重算：`regenerateSanshiUnifiedSnapshot(record, payload)`，各子式法 options 透传。**B 类复合通用**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 六壬子组 | 分组 | 同 liureng | 同 liureng | `payload.{wuxing,guireng,castMethod,...}` | 透传给 liureng 子快照 |
| 奇门子组 | 分组 | 同 qimen | 同 qimen | `payload.options.*`（qimen）| 透传给 dunjia 子快照 |
| 太乙子组 | 分组 | 同 taiyi | 同 taiyi | `payload.options.*`（taiyi）| 透传给 taiyi 子快照 |

> 实现上建议 `sanshiunited` schema 用 `groups:[{key:'liureng',fields:[...]},{key:'qimen',...},{key:'taiyi',...}]` 复用三者字段定义，避免重复维护。

### 2.9 卜卦 / 择日 / 世俗类

#### `horary`（卜卦盘）

来源：`components/horary/HoraryMain.js`（`HORARY_CATEGORIES` 14 类）。重算：`regenerateHorarySnapshot(record, options)`（`aiAnalysisContext.js:921`，已读 `options.topicId||'general'`）→ `runHorary(chart, topicId)`。盘 fields 默认 `tradition:1, zodiacal:0, hsys:0`。**B 类通用 + 时间起盘**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 问题类别 topicId | select | `general`(综合·能否成事) | **14 类**：general/wealth(财物2宫)/family(兄弟3宫)/property(田宅4宫)/pregnancy(子嗣5宫)/health(疾病6宫)/marriage(婚姻7宫)/lawsuit(诉讼7宫)/theft(盗窃转宫)/death(死生8宫)/travel(远行9宫)/career(事业10宫)/hope(愿望11宫)/enemy(私敌12宫)| `payload.topicId`（→ `regenerateHorarySnapshot` 的 options.topicId）| **裁决类别核心**；组件用 `questionCategory` 同义 |
| 起卦时刻 | datetime | 起课时间（事盘 divTime / 起课时间源此刻）| 任意 | `record.birth`/`divTime`（合成源此刻）| 时间确定式法，凭时间+地点起西洋盘 |
| 起盘 fields | — | tradition:1/zodiacal:0/hsys:0 | 同 astrochart 子集 | `record.*` | 卜卦默认传统盘 |

#### `election`（择日盘）

来源：`components/election/ElectionMain.js`（`ELECTION_TOPICS` 19 类）。重算：`regenerateElectionSnapshot(record, options)`（`:939`，读 `options.topicId||'marriage'`）→ `runElection(chart, topicId)`。**B 类通用 + 时间起盘**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| 用事类别 topicId | select | `marriage`(结婚/订婚) | **19 类**：marriage/business(开市)/organization/move_in(入宅)/buy_property/buy_land/renovation(动土)/trade/buy_car/contract/registration/diet/pursue_love/team_departure/surgery(手术)/banquet/travel/blessing(祈福)/general_day(大众吉日)| `payload.topicId` | **评分类别核心**，19 选项 |
| 起盘时刻 | datetime | 起课时间 / 此刻 | 任意 | `record.birth`/`divTime` | 凭时间+地点起盘 |
| 起盘 fields | — | 同 horary | 同上 | `record.*` | |

#### `sixyao`（六爻）— **D 类只读**

来源：`components/guazhan/GuaZhanMain.js`。重算：已存事盘读 `payload.gua`（确定卦象）；「起课时间」源走 `regenerateSixyaoSnapshot`（时间起卦）。**不可任意重算卦象**（摇钱/报数是确定结果；`GuaZhanInput.js:82` 注明六爻只改起卦时刻的时区/经度供真太阳时/神煞，不重摇卦）。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| （内容段勾选）| checkbox | preset 全段 | aiExport sections | `aiExport.sections.sixyao` | **唯一可调** |
| 起卦时刻·时区/经度 | （仅起课时间源）| 起卦时刻 | — | `record.zone/lon`（不重摇卦）| 仅影响真太阳时/神煞，**不改卦象** |

> schema：`kind:'sectionsOnly'`（不出重算项）。

#### `tongshefa`（统摄法）— **D 类只读**

来源：`components/tongshefa/*`。重算：`buildTongSheFaSnapshot(buildTongSheFaModel(payload.selection))`。**只读已存选择，无重算**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| （内容段勾选）| checkbox | preset 全段 | aiExport sections | `aiExport.sections.tongshefa` | 唯一可调 |

> schema：`kind:'sectionsOnly'`。

#### `mundane`（世俗盘）— **D 类只读**

来源：`components/mundane/*`。重算：直接读 `payload.aiSnapshot`（存档时 DivinationChartShell 已写全文）。**多类型(入宫/新月/满月/日食/月食/地区盘/行星周期/世俗宫义)，不按时间重算**。

| 设置名 | 控件 | 默认 | 可选项 | 应用方式 | 备注 |
|---|---|---|---|---|---|
| （内容段勾选）| checkbox | preset 全段 | aiExport sections | `aiExport.sections.mundane` | 唯一可调 |

> schema：`kind:'sectionsOnly'`。

---

## 3. `TECHNIQUE_SETTINGS_SCHEMA` 草案（可直接落地）

> 设计：技法 key → `{ kind, optionsPath?, fields:[…] | groups:[…], sectionsOnly? }`。
> `kind`：`'record'`(A) | `'payload'`(B) | `'localStorage'`(C，混入) | `'sectionsOnly'`(D)。
> `field`：`{ name, label, type, options?, default, group?, applyAs?, wireGap?, when? }`。
> - `applyAs`：`'record'|'payload'|'payloadOptions'|'localStorage'|'builderOpts'|'datetime'`（覆盖 kind 的默认落点；如 ziwei 流派是 localStorage、qimen 是 payloadOptions）。
> - `wireGap:true`：标"builder/fieldParams 当前不收此项，接线后生效"（默认即现状，安全）。
> - `when`：条件显示（如 liureng xuanShiZhi 仅 castMethod==='xuanshi'）。
> 常量复用现成导出：`HORARY_CATEGORIES`(horary/HoraryMain)、`ELECTION_TOPICS`(election/ElectionMain)、`PAIPAN_OPTIONS`等(dunjia/DunJiaCalc)、`STYLE_OPTIONS`等(taiyi/TaiYiCalc)、`TRIPLICITY_DIVISIONS/BALBILLUS_*/KEYPOINTS_*/RELEASE_MODES`(utils/*)、`QI_METHODS/YUE_JIANG_METHODS/FEN_ZHOU_YE_METHODS`(lrzhan/LiuRengMain)。

```js
// utils/techniqueMountSettings.js —— TECHNIQUE_SETTINGS_SCHEMA（穷尽草案；default 必须 === 现状常量）
// 注：本草案由调研文档给出；落地时每个 default 须对齐源常量（已逐一核对，见 §5 自查清单）。

export const TECHNIQUE_SETTINGS_SCHEMA = {

  // ===== 命盘·占星（A 类 record fields）=====
  astrochart: { kind:'record', fields:[
    { name:'hsys',                  label:'宫制',     type:'select', options:HSYS_OPTIONS,                       default:0 },
    { name:'zodiacal',              label:'黄道',     type:'select', options:[{value:0,label:'回归'},{value:1,label:'恒星'}], default:0 },
    { name:'tradition',             label:'择宫传统', type:'select', options:[{value:0,label:'现代'},{value:1,label:'传统'}], default:0 },
    { name:'strongRecption',        label:'强互容',   type:'switch', default:0 },
    { name:'simpleAsp',             label:'简化相位', type:'switch', default:0 },
    { name:'virtualPointReceiveAsp',label:'虚点接收相位', type:'switch', default:0 },
    { name:'doubingSu28',           label:'斗柄28宿', type:'switch', default:0 },
    { name:'southchart',            label:'南半球盘', type:'switch', default:0 },
    { name:'timeAlg',               label:'时间算法', type:'select', options:[{value:0,label:'真太阳时'},{value:1,label:'钟表时'}], default:0 },
    { name:'gender',                label:'性别',     type:'select', options:[{value:1,label:'男'},{value:0,label:'女'},{value:-1,label:'未知'}], default:1 },
    { name:'orbs',                  label:'容许度方案', type:'select', options:ORB_SCALE_OPTIONS, default:null, wireGap:true }, // buildFieldObject 尚未读
  ]},
  astrochart_like: { kind:'record', extends:'astrochart' }, // 同 astrochart fields
  indiachart: { kind:'record', fields:[
    { name:'hsys', label:'宫制', type:'select', options:HSYS_OPTIONS, default:0 },
    { name:'zodiacal', label:'黄道', type:'select', options:[{value:0,label:'回归'},{value:1,label:'恒星'}], default:0 },
    { name:'timeAlg', label:'时间算法', type:'select', options:[{value:0,label:'真太阳时'},{value:1,label:'钟表时'}], default:0 },
    { name:'gender', label:'性别', type:'select', options:GENDER_OPTIONS, default:1 },
    { name:'vargaMode', label:'分盘/Ayanamsa', type:'select', options:INDIA_VARGA_OPTIONS, default:1, applyAs:'builderOpts', wireGap:true },
  ]},
  germany: { kind:'record', fields:[
    { name:'hsys', label:'宫制', type:'select', options:HSYS_OPTIONS, default:0 },
    { name:'zodiacal', label:'黄道', type:'select', options:ZODIACAL_OPTIONS, default:0 },
    { name:'timeAlg', label:'时间算法', type:'select', options:TIMEALG_OPTIONS, default:0 },
    { name:'gender', label:'性别', type:'select', options:GENDER_OPTIONS, default:1 },
  ]},

  // ===== 命盘·宿占 =====
  guolao: { kind:'record', fields:[
    { name:'guolaoLifeMode', label:'命度法', type:'select', options:[{value:'asc',label:'本命度·上升'},{value:'yumao',label:'逾卯'},{value:'cotrans',label:'同升'}], default:'asc' },
    { name:'guolaoNodeMode', label:'罗计法', type:'select', options:[{value:'northKetuSouthRahu',label:'北计南罗'},{value:'northRahuSouthKetu',label:'北罗南计'}], default:'northKetuSouthRahu' },
    { name:'doubingSu28',    label:'宿度',   type:'select', options:GUOLAO_SU28_OPTIONS, default:2 }, // 回归今制(2)/开禧(3)/恒星郑式(4)/荀爽19年(0)/斗柄定房(1)
    { name:'gender',  label:'性别',   type:'select', options:GENDER_OPTIONS, default:1 },
    { name:'timeAlg', label:'时间算法', type:'select', options:TIMEALG_OPTIONS, default:0 },
  ], localStorageDisplay:[ // 不影响 snapshot 文本，可选放"显示偏好"区
    { name:'chartStyle', storageKey:'horosaGuolaoChartStyle', default:'moira', note:'仅显示' },
  ]},
  suzhan: { kind:'record', extendsFields:['hsys','zodiacal','timeAlg','gender','doubingSu28'] }, // 随 astro fields；命/事双源

  // ===== 推运·单盘（A 类起盘 fields + 推运专属，多数 wireGap）=====
  primarydirect: { kind:'record', fields:[
    { name:'pdMethod',  label:'方位法', type:'select', options:[
        {value:'core_alchabitius',label:'Alchabitius'},{value:'placidus',label:'Placidus（半弧）'},
        {value:'regiomontanus',label:'Regiomontanus'},{value:'campanus',label:'Campanus'},
        {value:'topocentric',label:'Topocentric'},{value:'horosa_legacy',label:'Horosa原方法'}], default:'core_alchabitius' },
    { name:'pdTimeKey', label:'度数换算', type:'select', options:[{value:'Ptolemy',label:'Ptolemy'},{value:'Naibod',label:'Naibod'},{value:'TrueSolarArc',label:'真太阳弧'}], default:'Ptolemy' },
    { name:'pdtype',    label:'方向', type:'select', options:[{value:0,label:'In Zodiaco'},{value:1,label:'In Mundo'}], default:0 },
    { name:'pdDirect',  label:'向运·顺', type:'checkbox', default:1 },
    { name:'pdConverse',label:'向运·逆', type:'checkbox', default:1 },
    { name:'pdYears',   label:'年数', type:'number', min:1, max:180, step:1, default:100, wireGap:true }, // ★默认100年；fieldParams 待接线
    { name:'pdAntiscia',label:'附加·映点', type:'checkbox', default:0 },
    { name:'pdTerms',   label:'附加·界', type:'checkbox', default:0 },
  ]},
  primarydirchart: { kind:'record', extends:'primarydirect' },
  zodialrelease: { kind:'record', fields:[
    { name:'basePoint', label:'推运基点', type:'select', options:ZR_BASE_POINT_OPTIONS, default:'PARS_FORTUNA', applyAs:'builderOpts', wireGap:true },
    { name:'aiMode',    label:'输出层级', type:'select', options:[
        {value:'l1_all',label:'输出所有L1'},{value:'l2_in_l1',label:'某L1下全部L2'},
        {value:'l3_in_l2',label:'某L2下全部L3'},{value:'l4_in_l3',label:'某L3下全部L4'}], default:'l1_all', applyAs:'builderOpts', wireGap:true },
    { name:'aiL1Idx', label:'L1选择', type:'select', options:[], default:0, applyAs:'builderOpts', wireGap:true, when:(o)=>o.aiMode!=='l1_all' },
    { name:'aiL2Idx', label:'L2选择', type:'select', options:[], default:0, applyAs:'builderOpts', wireGap:true, when:(o)=>['l3_in_l2','l4_in_l3'].includes(o.aiMode) },
    { name:'aiL3Idx', label:'L3选择', type:'select', options:[], default:0, applyAs:'builderOpts', wireGap:true, when:(o)=>o.aiMode==='l4_in_l3' },
    { name:'stopLevelIdx', label:'停止层级', type:'number', min:0, max:3, default:3, applyAs:'builderOpts', wireGap:true },
  ]},
  firdaria:      { kind:'record', fields:[] }, // 随盘出，仅段勾选
  distributions: { kind:'record', fields:[] },
  agepoint:      { kind:'record', fields:[] },
  planetaryages: { kind:'record', fields:[] },
  yearsystem129: { kind:'record', fields:[] },
  lunationphase: { kind:'record', fields:[] }, // maxAge 固定不暴露
  decennials: { kind:'record', fields:[
    { name:'startMode',    label:'起运主星', type:'select', options:DECENNIAL_START_OPTIONS, default:'sectLight', applyAs:'builderOpts', wireGap:true },
    { name:'orderType',    label:'分配次序', type:'select', options:[{value:'zodiacal',label:'黄道序'},{value:'chaldean',label:'迦勒底序'}], default:'zodiacal', applyAs:'builderOpts', wireGap:true },
    { name:'dayMethod',    label:'日限体系', type:'select', options:[{value:'valens',label:'Valens'},{value:'hephaistio',label:'Hephaistio'}], default:'valens', applyAs:'builderOpts', wireGap:true },
    { name:'calendarType', label:'时间口径', type:'select', options:[{value:'traditional',label:'传统历'},{value:'actual',label:'实际历'}], default:'traditional', applyAs:'builderOpts', wireGap:true },
    { name:'aiMode',       label:'输出层级', type:'select', options:DECENNIAL_AIMODE_OPTIONS, default:'l1_all', applyAs:'builderOpts', wireGap:true },
    { name:'aiL1Idx', label:'L1选择', type:'select', options:[], default:0, applyAs:'builderOpts', wireGap:true, when:(o)=>o.aiMode!=='l1_all' },
    { name:'aiL2Idx', label:'L2选择', type:'select', options:[], default:0, applyAs:'builderOpts', wireGap:true, when:(o)=>['l3_in_l2','l4_in_l3'].includes(o.aiMode) },
    { name:'aiL3Idx', label:'L3选择', type:'select', options:[], default:0, applyAs:'builderOpts', wireGap:true, when:(o)=>o.aiMode==='l4_in_l3' },
  ]},
  vedicprog: { kind:'record', fields:[
    { name:'targetDate', label:'目标日期', type:'date', default:'TODAY', applyAs:'builderOpts', wireGap:true },
    { name:'targetTime', label:'目标时间', type:'time', default:'12:00:00', applyAs:'builderOpts', wireGap:true },
  ]},
  balbillus: { kind:'record', fields:[
    { name:'startPlanet', label:'起运星', type:'select', options:PLANET7_OPTIONS, default:'SUN', applyAs:'builderOpts', wireGap:true },
    { name:'yearType',    label:'年制',   type:'select', options:[{value:'solar',label:'Solar 回归年'},{value:'hellenistic',label:'Egyptian/Hellenistic 360日'}], default:'solar', applyAs:'builderOpts', wireGap:true },
    { name:'mode',        label:'距离口径', type:'select', options:[{value:'nearest',label:'最近角距'},{value:'forward',label:'顺黄道距'}], default:'nearest', applyAs:'builderOpts', wireGap:true },
  ]},
  triplicityrulers: { kind:'record', fields:[
    { name:'division', label:'划分法', type:'select', options:[{value:'thirds',label:'三分(0–25/25–50/50–75)'},{value:'halves',label:'两分(上/下半生+协作)'}], default:'thirds', applyAs:'builderOpts', wireGap:true },
    { name:'lifespan', label:'寿命基准(岁)', type:'number', min:30, max:120, default:75, applyAs:'builderOpts', wireGap:true }, // ★"年龄选择"
  ]},
  keypoints: { kind:'record', fields:[
    { name:'mode', label:'释放模式', type:'select', options:[{value:'soul',label:'身（月亮起）'},{value:'body',label:'命（上升起）'}], default:'soul', applyAs:'builderOpts', wireGap:true },
  ]},
  extrareturns: { kind:'record', fields:[
    { name:'body',  label:'回归体', type:'select', options:[{value:'',label:'全列(土/木/月交)'},{value:'Saturn',label:'土星返照'},{value:'Jupiter',label:'木星返照'},{value:'Node',label:'月交返照'}], default:'', applyAs:'builderOpts', wireGap:true },
    { name:'count', label:'回数',   type:'number', min:1, max:12, default:4, applyAs:'builderOpts', wireGap:true },
  ]},
  planetaryarc: { kind:'record', fields:[
    { name:'arcSource',  label:'弧源星', type:'select', options:ARC_SOURCE_OPTIONS, default:'MOON', applyAs:'builderOpts', wireGap:true },
    { name:'datetime',   label:'目标时刻', type:'datetime', default:'NOW', applyAs:'builderOpts', wireGap:true },
    { name:'asporb',     label:'容许度', type:'select', options:ASPORB_OPTIONS, default:1, applyAs:'builderOpts', wireGap:true },
  ]},
  persiandirected: { kind:'record', fields:[
    { name:'rateKey',   label:'向运速率', type:'select', options:[{value:'persian',label:'波斯 1°/年'},{value:'prophected',label:'Prophected 30°/年'},{value:'naibod',label:'Naibod 59′08″/年'}], default:'persian', applyAs:'builderOpts', wireGap:true },
    { name:'direction', label:'方向',     type:'select', options:[{value:'direct',label:'Direct（逆时针）'},{value:'converse',label:'Converse（顺时针）'}], default:'direct', applyAs:'builderOpts', wireGap:true },
  ]},
  jaynesprog: { kind:'record', fields:[
    { name:'targetDate', label:'目标日期', type:'date', default:'TODAY', applyAs:'builderOpts', wireGap:true },
    { name:'targetTime', label:'目标时间', type:'time', default:'12:00:00', applyAs:'builderOpts', wireGap:true },
  ]},

  // ===== 推运·目标时刻型（buildPredictivePeriodSnapshot，全 wireGap）=====
  profection: { kind:'record', fields:[
    { name:'datetime',       label:'目标时刻', type:'datetime', default:'NOW', applyAs:'builderOpts', wireGap:true },
    { name:'tmType',         label:'步长',     type:'select', options:[{value:'y',label:'年'},{value:'m',label:'月'},{value:'d',label:'日'}], default:'y', applyAs:'builderOpts', wireGap:true },
    { name:'asporb',         label:'容许度',   type:'select', options:ASPORB_OPTIONS, default:1, applyAs:'builderOpts', wireGap:true },
    { name:'nodeRetrograde', label:'南北交逆移', type:'select', options:[{value:false,label:'否'},{value:true,label:'是'}], default:false, applyAs:'builderOpts', wireGap:true },
  ]},
  solararc: { kind:'record', extends:'profection' },
  solarreturn: { kind:'record', fields:[
    { name:'datetime', label:'目标时刻', type:'datetime', default:'NOW', applyAs:'builderOpts', wireGap:true },
    { name:'dirLat',   label:'异地·纬度', type:'text', default:'NATAL', applyAs:'builderOpts', wireGap:true },
    { name:'dirLon',   label:'异地·经度', type:'text', default:'NATAL', applyAs:'builderOpts', wireGap:true },
    { name:'tmType',   label:'步长', type:'select', options:TMTYPE_OPTIONS, default:'y', applyAs:'builderOpts', wireGap:true },
    { name:'asporb',   label:'容许度', type:'select', options:ASPORB_OPTIONS, default:1, applyAs:'builderOpts', wireGap:true },
  ]},
  lunarreturn: { kind:'record', extends:'solarreturn' },
  givenyear:   { kind:'record', extends:'solarreturn' },

  // ===== 八字紫微 =====
  bazi: { kind:'record', fields:[
    { name:'gender',   label:'性别', type:'select', options:GENDER_OPTIONS, default:1 },
    { name:'timeAlg',  label:'时间算法', type:'select', options:[{value:0,label:'真太阳时'},{value:1,label:'直接时间'},{value:2,label:'春分定卯时'}], default:0 },
    { name:'phaseType',label:'长生', type:'select', options:[{value:0,label:'火土同'},{value:1,label:'水土同'},{value:2,label:'阳顺阴逆'}], default:0 },
    { name:'godKeyPos',label:'神煞起点', type:'select', options:[{value:'年',label:'按年柱'},{value:'日',label:'按日柱'},{value:'年日',label:'年柱日柱都查'}], default:'年' },
    { name:'after23NewDay', label:'换日', type:'select', options:DAY_SWITCH_OPTIONS, default:'DEFAULT_AFTER23' },
    { name:'lateZiHourUseNextDay', label:'晚子时柱', type:'select', options:LATEZI_OPTIONS, default:'DEFAULT_LATEZI' },
    { name:'adjustJieqi', label:'节气修正', type:'select', options:[{value:0,label:'不调整'},{value:1,label:'按纬度调整'}], default:0 },
  ]},
  ziwei: { kind:'record', fields:[
    { name:'gender',  label:'性别', type:'select', options:GENDER_OPTIONS, default:1 },
    { name:'timeAlg', label:'时间算法', type:'select', options:[{value:0,label:'真太阳时'},{value:1,label:'直接时间'}], default:0 },
    { name:'after23NewDay', label:'换日', type:'select', options:DAY_SWITCH_OPTIONS, default:'DEFAULT_AFTER23' },
    { name:'lateZiHourUseNextDay', label:'晚子时柱', type:'select', options:LATEZI_OPTIONS, default:'DEFAULT_LATEZI' },
    { name:'sihuaSchool', label:'四化流派', type:'select', options:[{value:'beipai',label:'北派·飞星(现状)'},{value:'zhongzhou',label:'中州派'},{value:'custom',label:'自定义'}], default:'beipai', applyAs:'localStorage', storageKey:'ziweiSihuaSchool' }, // ★进 snapshot
    // 运限层（流年/流月/流日/流时）→ P2 接线缺口：snapshot 现仅含大限
    { name:'periodLevel', label:'运限层', type:'select', options:[{value:'',label:'仅本命+大限(现状)'},{value:'liunian',label:'流年'},{value:'liuyue',label:'流月'},{value:'liuri',label:'流日'},{value:'liushi',label:'流时'}], default:'', applyAs:'builderOpts', wireGap:true },
    { name:'periodYear',  label:'流年(年份)', type:'number', default:null, applyAs:'builderOpts', wireGap:true, when:(o)=>!!o.periodLevel },
  ]},

  // ===== 数算 =====
  canping: { kind:'record', fields:[
    { name:'timeAlg', label:'时间算法', type:'select', options:TIMEALG_OPTIONS, default:0 },
    { name:'gender',  label:'性别', type:'select', options:GENDER_OPTIONS, default:1 },
    { name:'after23NewDay', label:'换日', type:'select', options:DAY_SWITCH_OPTIONS, default:'DEFAULT_AFTER23' },
    { name:'method',   label:'取法', type:'select', options:[{value:'ming',label:'明法(月支反向)'},{value:'gu',label:'古法(八字日支)'}], default:'ming', applyAs:'builderOpts', wireGap:true }, // builder 写死 'ming'
    { name:'qiyunAge', label:'起运岁', type:'number', default:1, applyAs:'builderOpts', wireGap:true },
  ]},
  heluo: { kind:'record', fields:[
    { name:'timeAlg', label:'时间算法', type:'select', options:TIMEALG_OPTIONS, default:0 },
    { name:'gender',  label:'性别', type:'select', options:GENDER_OPTIONS, default:1 },
    { name:'after23NewDay', label:'换日', type:'select', options:DAY_SWITCH_OPTIONS, default:'DEFAULT_AFTER23' },
    { name:'qihuaMethod', label:'取化工法', type:'select', options:HELUO_QIHUA_OPTIONS, default:'DEFAULT', applyAs:'builderOpts', wireGap:true }, // P2 未接线
  ]},

  // ===== 演禽/策天/皇极（随出生 fields，无独立项）=====
  xianqin: { kind:'record', extendsFields:['timeAlg','gender','after23NewDay','lateZiHourUseNextDay'] },
  cetian:  { kind:'record', extendsFields:['timeAlg','gender','after23NewDay','lateZiHourUseNextDay'] },
  huangji: { kind:'record', extendsFields:['timeAlg','gender','after23NewDay','lateZiHourUseNextDay'] },

  // ===== 三式/奇门（B 类 payload）=====
  qimen: { kind:'payload', optionsPath:'options', fields:[
    { name:'sex',              label:'性别',     type:'select', options:SEX_OPTIONS,           default:1 },
    { name:'dateType',         label:'日期类型', type:'select', options:DATE_TYPE_OPTIONS,     default:0 },
    { name:'leapMonthType',    label:'闰月',     type:'select', options:LEAP_MONTH_OPTIONS,    default:0 },
    { name:'xuShiSuiType',     label:'虚实岁',   type:'select', options:XUSHI_OPTIONS,         default:0 },
    { name:'jieQiType',        label:'节气',     type:'select', options:JIEQI_OPTIONS,         default:1 },
    { name:'paiPanType',       label:'排盘类型', type:'select', options:PAIPAN_OPTIONS,        default:3 },
    { name:'zhiShiType',       label:'值符法',   type:'select', options:ZHISHI_OPTIONS,        default:0 },
    { name:'yueJiaQiJuType',   label:'月家起局', type:'select', options:YUEJIA_QIJU_OPTIONS,   default:1 },
    { name:'yearGanZhiType',   label:'年干支',   type:'select', options:YEAR_GZ_OPTIONS,       default:2 },
    { name:'monthGanZhiType',  label:'月干支',   type:'select', options:MONTH_GZ_OPTIONS,      default:1 },
    { name:'dayGanZhiType',    label:'日干支',   type:'select', options:DAY_GZ_OPTIONS,        default:0 },
    { name:'qijuMethod',       label:'起局法',   type:'select', options:QIJU_METHOD_OPTIONS,   default:'zhirun' },
    { name:'kongMode',         label:'空亡',     type:'select', options:KONG_MODE_OPTIONS,     default:'day' },
    { name:'yimaMode',         label:'驿马',     type:'select', options:MA_MODE_OPTIONS,       default:'day' },
    { name:'timeAlg',          label:'时间算法', type:'select', options:TIME_ALG_OPTIONS,      default:0 },
    { name:'shiftPalace',      label:'移宫',     type:'select', options:YIXING_OPTIONS,        default:0 },
    { name:'after23NewDay',    label:'换日',     type:'select', options:DAY_SWITCH_OPTIONS,    default:'DEFAULT_AFTER23' },
    { name:'lateZiHourUseNextDay', label:'晚子时柱', type:'select', options:LATEZI_OPTIONS,    default:'DEFAULT_LATEZI' },
    { name:'fengJu',           label:'封局',     type:'select', options:FENGJU_OPTIONS,        default:false },
    // faRelatedPeople 不入 schema（数据非排盘选项）
  ]},
  taiyi: { kind:'payload', optionsPath:'options', fields:[
    { name:'style',     label:'盘式',     type:'select', options:STYLE_OPTIONS,       default:3 },
    { name:'tn',        label:'古法公式', type:'select', options:METHOD_OPTIONS,      default:0, when:(o)=>o.style!==5 },
    { name:'sex',       label:'性别',     type:'select', options:TAIYI_SEX_OPTIONS,   default:'男' },
    { name:'timeBasis', label:'时间基准', type:'select', options:TIME_BASIS_OPTIONS,  default:'direct' },
    { name:'after23NewDay', label:'换日', type:'select', options:DAY_SWITCH_OPTIONS,  default:'DEFAULT_AFTER23' },
    { name:'gameTheory',label:'博弈',     type:'select', options:GAME_THEORY_OPTIONS, default:0, when:(o)=>o.style!==5 },
  ]},
  liureng: { kind:'payload', optionsPath:'', fields:[ // 铺 payload 顶层（regenerateCaseTechniqueSnapshot 已聚 liurengOpts）
    { name:'wuxing',         label:'十二长生/遁干', type:'select', options:WUXING5_OPTIONS, default:'土' },
    { name:'guireng',        label:'贵人体系', type:'select', options:[{value:0,label:'六壬法贵人'},{value:1,label:'遁甲法贵人'},{value:2,label:'星占法贵人'}], default:2 },
    { name:'castMethod',     label:'起课法',   type:'select', options:QI_METHODS, default:'zheng' }, // 25 法
    { name:'xuanShiZhi',     label:'选时',     type:'select', options:XUANSHI_ZHI_OPTIONS, default:'', when:(o)=>o.castMethod==='xuanshi' },
    { name:'yanShuNum',      label:'演数',     type:'number', default:'', when:(o)=>o.castMethod==='yanshu' },
    { name:'yueJiangMethod', label:'换将',     type:'select', options:YUE_JIANG_METHODS, default:'zhongqi' },
    { name:'fenZhouYe',      label:'分昼夜',   type:'select', options:FEN_ZHOU_YE_METHODS, default:'chenhun' },
  ]},
  jinkou: { kind:'payload', optionsPath:'', fields:[
    { name:'wuxing',  label:'遁干', type:'select', options:WUXING5_OPTIONS, default:'土' },
    { name:'guireng', label:'贵人体系', type:'select', options:GUIREN_OPTIONS, default:0 },
    { name:'diFen',   label:'地分', type:'select', options:DIFEN_OPTIONS, default:'子' }, // 含 auto 自动取月将/时支
  ]},
  sanshiunited: { kind:'payload', groups:[
    { key:'liureng', label:'六壬', optionsPath:'', fields:/* = liureng.fields */ },
    { key:'qimen',   label:'奇门', optionsPath:'options', fields:/* = qimen.fields */ },
    { key:'taiyi',   label:'太乙', optionsPath:'options', fields:/* = taiyi.fields */ },
  ]},

  // ===== 卜卦/择日（B 类 payload + 时间起盘）=====
  horary: { kind:'payload', optionsPath:'', fields:[
    { name:'topicId', label:'问题类别', type:'select', options:HORARY_CATEGORIES, default:'general' }, // 14 类
  ]},
  election: { kind:'payload', optionsPath:'', fields:[
    { name:'topicId', label:'用事类别', type:'select', options:ELECTION_TOPICS, default:'marriage' }, // 19 类
  ]},

  // ===== D 类只读（仅段勾选）=====
  sixyao:    { kind:'sectionsOnly' },
  tongshefa: { kind:'sectionsOnly' },
  mundane:   { kind:'sectionsOnly' },
};
```

> `extends`/`extendsFields` 为草案约定：`extends:'X'` 表示 fields 复用 X 的全部；`extendsFields:[...]` 表示从 astrochart 取这几个字段定义。落地时可在 `getTechniqueSettingsSchema(key)` 里展开（保持 default 仍 === 现状）。

---

## 4. 起盘 fields 的"目标时刻"与"地点"如何随源（重要）

- **命盘类（含全部西洋推运、八字、紫微、数算、宿占、演禽…）**：起盘时刻 = `record.birth`（出生时间，固定），**不随挂载侧调**；推运的"目标时刻"是另一组字段（`datetime/targetDate/...`，单盘类经 builderOpts 透传）。
- **事盘/起课时间类（奇门/太乙/六壬/金口/三式/卜卦/择日/六爻）**：起盘时刻 = 事盘 `divTime`，或"起课时间·此刻"合成源（`TIMEPOINT_CASTABLE_SET`，`aiAnalysisContext.js:231`）。**这就是用户说的"默认当前时刻起盘、且可调时间"**——合成源 `timepoint:current` 即此刻；要调时间另存为事盘或改起课时刻字段。
- **地点（lat/lon/zone）**：随源 record；西洋返照类额外有 `dirLat/dirLon`（异地返照）。

---

## 5. 缺漏自查清单（已逐一核对 46 项）

> 口径：已逐一打开各技法页/常量核对，下列每项标注 **设置项数 + 驱动类 + 是否有接线缺口**。"设置项数"只计技法专属可调项（不含每个推运都隐含继承的起盘 fields；占星 fields 计在 astrochart 一处）。

**A. 已逐一核对、有可调设置（35 项）**

| 技法 | 专属设置项数 | 驱动 | 接线状态 |
|---|---|---|---|
| astrochart | 11（hsys/zodiacal/tradition/strongRecption/simpleAsp/virtualPointReceiveAsp/doubingSu28/southchart/timeAlg/gender/orbs）| A | 10 已通；orbs wireGap |
| astrochart_like | =astrochart | A | 同上 |
| indiachart | 5（4 fields + vargaMode）| A | vargaMode wireGap |
| germany | 4 | A | 全通 |
| guolao | 5（+3 显示偏好不进 snapshot）| A | 全通 |
| suzhan | 5（随 astro）| A | 全通 |
| primarydirect | 8（pdMethod/pdTimeKey/pdtype/pdDirect/pdConverse/**pdYears**/pdAntiscia/pdTerms）| A | 7 已通；**pdYears wireGap（默认100）** |
| primarydirchart | =primarydirect(8) | A | 同上 |
| zodialrelease | 6（basePoint/aiMode/L1/L2/L3/stopLevel）| A+builderOpts | 全 wireGap（standalone builder 写死）|
| profection | 4（datetime/tmType/asporb/nodeRetrograde）| builderOpts | 全 wireGap |
| solararc | 4 | builderOpts | 全 wireGap |
| solarreturn | 5（+dirLat/dirLon）| builderOpts | 全 wireGap |
| lunarreturn | 5 | builderOpts | 全 wireGap |
| givenyear | 5 | builderOpts | 全 wireGap |
| decennials | 8（4 settings + aiMode + 3 idx）| builderOpts | 全 wireGap |
| vedicprog | 2（targetDate/targetTime）| builderOpts | 全 wireGap |
| balbillus | 3（startPlanet/yearType/mode）| builderOpts | 全 wireGap |
| triplicityrulers | 2（division/**lifespan**年龄）| builderOpts | 全 wireGap |
| keypoints | 1（mode）| builderOpts | wireGap |
| extrareturns | 2（body/count）| builderOpts | 全 wireGap |
| planetaryarc | 3（arcSource/datetime/asporb）| builderOpts | 全 wireGap |
| persiandirected | 2（rateKey/direction）| builderOpts | 全 wireGap |
| jaynesprog | 2（targetDate/targetTime）| builderOpts | 全 wireGap |
| bazi | 8（gender/timeAlg/phaseType/godKeyPos/after23/lateZi/adjustJieqi）+uiMode(不计) | A | **全通**（baziParams 已含）|
| ziwei | 6（gender/timeAlg/after23/lateZi/**sihuaSchool**/+运限层）| A+C+builderOpts | 时间项+流派(C)已可；运限层 wireGap |
| canping | 5（timeAlg/gender/after23/method/qiyunAge）| A+builderOpts | 时间项通；method/qiyunAge wireGap（builder 写死 ming/1）|
| heluo | 4（timeAlg/gender/after23/qihuaMethod）| A+builderOpts | 时间项通；qihuaMethod wireGap |
| qimen | 19 | B(options) | **全通**（regenerate 读 payload.options）|
| taiyi | 7 | B(options) | **全通** |
| liureng | 7（wuxing/guireng/castMethod/xuanShiZhi/yanShuNum/yueJiangMethod/fenZhouYe）| B(顶层) | **全通**（regenerate 已聚 liurengOpts）|
| jinkou | 3（wuxing/guireng/diFen）| B(顶层) | **全通** |
| sanshiunited | 复合(7+19+7) | B | 全通（子式法透传）|
| horary | 1（topicId 14类）+起卦时刻 | B(顶层) | **全通**（regenerate 读 options.topicId）|
| election | 1（topicId 19类）+起盘时刻 | B(顶层) | **全通** |

**B. 已核对、暂无技法专属可调设置（只内容段勾选 + 随起盘 fields）（8 项）**

`firdaria`(随盘 predictive) / `distributions`(无控件) / `agepoint`(无控件) / `planetaryages`(固定七阶) / `yearsystem129`(随盘) / `lunationphase`(maxAge 固定不暴露) / `xianqin`/`cetian`/`huangji`(随出生 fields)。
> 这 8 项 schema = `kind:'record', fields:[]`（或 extendsFields 起盘子集），设置面板只显示「纳入内容」勾选。

**C. D 类只读（不可重算，仅段勾选）（3 项）**

`sixyao`（不可重摇卦，仅起卦时刻时区/经度）/ `tongshefa`（只读 payload.selection）/ `mundane`（多类型，只读 payload.aiSnapshot）。schema = `kind:'sectionsOnly'`。

**统计**：可挂载技法 **45** 个 → 有专属可调设置 **35**、仅段勾选+起盘 fields **8**（含 firdaria 等无独立 opt 的推运）、D 类只读 **3**（其中 mundane 计为第 11 事盘项）。45 = 32 命盘有设置/无设置 + 3 数算/演禽…已计入 + 10 事盘 + suzhan 去重。逐项见上表，**无遗漏**。

**接线缺口总览（落地时 P1/P2 要补的 builder/fieldParams 形参）**：
- **P1（高价值、改动小）**：`pdYears` 入 `fieldParams`/`buildFieldObject`/`localcharts`（主限默认100年）；`buildPredictivePeriodSnapshot` 加 `{datetime,tmType,asporb,nodeRetrograde,dirLat,dirLon}`（profection/solararc/returns 目标时刻+异地）。
- **P2（推运层级/划分）**：`buildZodialReleaseSnapshotText`/`buildDecennialsSnapshotText` 加 `{basePoint,aiMode,L*Idx,stopLevelIdx}` / `{startMode,orderType,dayMethod,calendarType,aiMode,L*Idx}`；`buildTriplicityRulersSnapshotText`/`buildBalbillusSnapshotText`/`buildKeypointsSnapshotText`/`buildLunationPhaseSnapshotText` 已收 opts、只需在 regenerate 透传；`buildPlanetaryArcSnapshotText`/`buildPersianDirectedSnapshotText`/`buildExtraReturnsSnapshotText` 加 opts；vedic/jaynes 加 targetDate/Time；`buildIndiaSnapshotForFields` 第二参可调；`buildCanpingSnapshotForRecord`(method/qiyunAge)/`buildHeluoSnapshotForRecord`(qihua)；`buildZiweiSnapshotForParams` 加 period 层。
- **已通（无需改 builder，仅 schema + override 即生效）**：astrochart 系/bazi/qimen/taiyi/liureng/jinkou/sanshiunited/horary/election + ziwei 四化流派(走 localStorage 单例)。

---

## 6. 与原方案的衔接 + 落地要点

1. **本 schema 即原方案 §2.1 `TECHNIQUE_SETTINGS_SCHEMA` 的完整体**。落地：在 `utils/techniqueMountSettings.js` 用本 §3 草案；`getTechniqueSettingsDefaults(key)` 抽 `{name:default}`，**每个 default 必须 === 源常量**（已核对：`DEFAULT_OPTIONS`/`STYLE_OPTIONS`/`TRIPLICITY_DEFAULT_OPTS`/`buildFieldObject` 等）。
2. **默认即现状铁律**（原方案 §3）：`opts` 为空走原 `buildTechniqueContext`（零行为变化）；`wireGap` 项在 builder 未接线前，即使用户设了也走默认（安全），接线后才生效 → **可先全量上 schema、UI 显示全部选项**，逐步接线让其生效，不破坏现状。
3. **四同步自检**（原方案 §3.2 / §4）：新断言"`ANALYSIS_CHART ∪ ANALYSIS_CASE` 每个 key 在 `TECHNIQUE_SETTINGS_SCHEMA` 有登记（schema 或 sectionsOnly），无遗漏"；`sectionsOnly` 集合钉死 `{sixyao,tongshefa,mundane}`；qimen 断言 default 子集 === `DEFAULT_OPTIONS`。
4. **`record.*` 持久化**（原方案 §2.3）：A 类新字段（尤其 `pdYears`、`guolao` 宿度多档）present-才落库 `localcharts.buildLocalChartRecord`，对齐 `pdMethod` 写法。
5. **C 类（ziwei 流派 / guolao 显示）**：写全局 localStorage 即生效（ziwei `ziweiSihuaSchool` + `ZWConst.ZWSchool.school` 单例；guolao 显示偏好不进 snapshot，标"仅显示"）。
6. **B 类 optionsPath**：qimen/taiyi 写 `payload.options.*`；liureng/jinkou/horary/election 写 `payload.*` 顶层（与 `regenerateCaseTechniqueSnapshot` 现有读取口径一致）。
7. **特殊不当 option**：qimen `faRelatedPeople`（相关人员·生年干）是数据非排盘选项，**不入 schema、不当 option 覆盖**（原方案 §6.8；`regenerateQimenSnapshot` 已单独处理）。

---

## 7. 关键源码定位（实现时核对用，均为绝对/模块路径）

- 可挂载清单：`utils/aiAnalysisContext.js:170`(ANALYSIS_CHART)、`:209`(ANALYSIS_CASE)、`:227`(TIME_CASTABLE)、`:231`(TIMEPOINT_CASTABLE)、`:106`(标签)。
- A 类读取：`buildFieldObject` `:277`、`fieldParams` `:331`、`buildChartBaziParams` `:785`、`buildChartZiweiParams` `:805`、`buildChartShusuanBazi` `:824`。
- 命盘 regenerate 分发：`regenerateChartTechniqueSnapshot` `:1010`；目标时刻型 `buildPredictivePeriodSnapshot` `:960`（写死此刻）；`fetchChartResultForRecord` `:907`。
- 事盘 regenerate 分发：`generateCaseTechniqueSnapshot` `:636`、`regenerateCaseTechniqueSnapshot` `:731`（已聚 liurengOpts/horary/election options）。
- 推运组件控件：`AstroPrimaryDirection.js`（工具栏 7 组 + pdYears 默认100 `:51`/`:442`）、`AstroZR.js`（basePoint/aiMode/L* `:300`+；standalone builder `:273`）、`AstroDecennials.js`（settings+aiMode；builder `:238`）、`AstroSolarArc.js`/`AstroProfection.js`（AstroDirectionForm：datetime/tmType/asporb/nodeRetrograde）、`AstroSolarReturn.js`/`LunarReturn`/`GivenYear`（+dirLat/dirLon/inverse）、`AstroTriplicityRulers.js`（division/lifespan）、`AstroBalbillus.js`、`AstroKeypoints.js`、`AstroPersianDirected.js`（rate/direction `:17`）、`AstroPlanetaryArc.js`（arcSource `:16`/`:66`）、`AstroExtraReturns.js`（body/count `:47`）、`AstroVedicProgressions.js`/`AstroJaynesProgressions.js`（targetDate/targetTime）、`AstroDirectionForm.js`（共享容许度/逆移/datetime 表）。
- 推运默认常量：`utils/triplicityRulers.js`（`TRIPLICITY_DEFAULT_OPTS` division:'thirds'/lifespan:75 `:31`、`TRIPLICITY_DIVISIONS` `:26`）、`utils/balbillus.js`（`BALBILLUS_DEFAULT_OPTS` `:57`、YEAR_TYPES `:46`、MODES `:52`）、`utils/keypoints120.js`（`KEYPOINTS_DEFAULT_OPTS` mode:'soul'/maxAge:120 `:25`、`RELEASE_MODES` `:23`）、`utils/lunationPhase.js`（`LUNATION_DEFAULT_OPTS` maxAge:90 `:23`）、`utils/decennials.js`（START/ORDER/DAY/CALENDAR 常量）。
- 八字/紫微：`components/cntradition/CnTraditionInput.js`（timeAlg 3档`:333`/phaseType`:342`/godKeyPos`:349`/adjustJieqi`:363`）、`components/ziwei/ZiWeiInput.js`（sihuaSchool`:372`/盘式`:365`/杂曜`:200`/小限顺逆`:253`）、`components/ziwei/ZWLuckPanel.js`（运限 chips：大限/流年/小限/流月/流日/流时 `:300`+）、`constants/ZWConst.js`（`ZWSchool` `:37`、`getActiveSiHuaGan` `:40`、school 表 beipai/zhongzhou `:14`/`:30`）、`components/ziwei/ZiWeiMain.js`（snapshot `:111`，含大限/流派）。
- 七政：`components/guolao/GuoLaoChartStyle.js`（life/node mode `:73`/`:93`、su28 默认2 `:10`、display 默认 `:123`）、`components/guolao/GuoLaoInput.js`。
- 数算：`components/shusuan/CanPingMain.js`（method ming/gu `:21`/`:117`）、`buildCanpingSnapshotForRecord` `aiAnalysisContext.js:848`（写死 ming/1）、`buildHeluoSnapshotForRecord` `:884`。
- 奇门：`components/dunjia/DunJiaMain.js`（`DEFAULT_OPTIONS` `:81`、FENGJU `:77`）、`components/dunjia/DunJiaCalc.js`（各 OPTIONS `:10`–`:113`、CHART_CATEGORY `:110`）。
- 太乙：`components/taiyi/TaiYiMain.js`（state.options `:55`）、`components/taiyi/TaiYiCalc.js`（STYLE/METHOD/TIME_BASIS/GAME_THEORY `:16`–`:60`）、`components/taiyi/core/TaiYiCore.js`（TAIYI_STYLE/ACCUM `:1`/`:9`）。
- 六壬：`components/lrzhan/LiuRengMain.js`（state 默认 `:4368`、QI_METHODS `:3820`、YUE_JIANG `:3847`、FEN_ZHOU_YE `:3851`、选项渲染 `:5396`+）。
- 金口诀：`components/jinkou/JinKouMain.js`（state 默认 `:591`、地分/月将/时支 `:1320`+）。
- 卜卦/择日：`components/horary/HoraryMain.js`（`HORARY_CATEGORIES` 14 `:9`、默认 general `:53`）、`components/election/ElectionMain.js`（`ELECTION_TOPICS` 19 `:18`、默认 marriage `:237`）、`regenerateHorarySnapshot` `aiAnalysisContext.js:921`、`regenerateElectionSnapshot` `:939`。
- D 类只读：`components/guazhan/GuaZhanInput.js:82`（六爻只改起卦时刻、不重摇卦）、`generateCaseTechniqueSnapshot` `:700`(tongshefa)/`:712`(mundane 读 payload.aiSnapshot)。
- 导出技法超集（确认哪些不可挂载）：`utils/aiExport.js:247`（`AI_EXPORT_TECHNIQUES`，神数/relative/jieqi/otherbu/fengshui/generic 不在 ANALYSIS 列表）。
