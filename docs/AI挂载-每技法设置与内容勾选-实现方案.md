# AI 挂载 · 每技法设置 + 内容段勾选 — 实现方案

> 目标：在 AI 分析页「挂载设置」抽屉里，给**每个挂载技法卡**加一个「设置」入口，能（1）调整该技法在自己技法页里有的全部排盘/推运/起卦/起局选项，保存后用新设置**重算该技法挂载快照**，并让同类**默认沿用**该配置；（2）像「AI 导出设置」一样**按技法勾选要纳入挂载的内容段**。**默认＝现状**，调整是另存的、不破坏默认。导出 / 导出设置 / AI 挂载 / 命盘事盘储存**四处同步、稳定、全面**。
>
> 本文档为只读调研后的可执行方案。所有路径为绝对路径或相对 `Horosa-Web/astrostudyui/src` 的模块路径。**实现前先按本文「分阶段计划」逐阶段做、逐阶段过自检。**

---

## 0. 现状全景（调研结论）

### 0.1 挂载链路（要点 A）

挂载面板＝`components/aianalysis/AIAnalysisMain.js`（4052 行，函数组件 `AIAnalysisMain`）。关键状态与流程：

- 抽屉 `renderMountDrawer()`（`:2843`），标题「挂载设置」，`open={mountDrawerOpen}`，由顶栏「挂载」按钮（`:3164`）打开。
- **源（source）**：下拉 `activeSource`（`:812`）。三类：
  - 命盘 `sourceType:'chart'`（来自 `localCharts`，`record` 带 `birth`）；
  - 事盘 `sourceType:'case'`（来自 `localCases`，`record` 带 `payload`/`divTime`）；
  - 两个**合成源**（不持久化）：`NATAL_SOURCE_ID='natal:current'`（命盘时间·此刻）、`TIMEPOINT_SOURCE_ID='timepoint:current'`（起课时间·此刻）。
- **「使用技法」多选**：`<Select mode="multiple">`（`:2920`），选项来自 `techniqueOptions = listAnalysisTechniqueOptions(activeSource)`（`utils/aiAnalysisContext.js:1940`），值写入 state `selectedTechniqueKeys`（持久到 UI prefs）。
- **技法卡（snapshot 卡）**：`lockedContextItems`（`:1057`）里 `type:'technique'` 的项，标题「技法 · {label}」、Tag 状态「已就绪/缺失/…」（`CONTEXT_STATUS_META` `:594`），渲染为 `Collapse.Panel`（`:2970`）。卡内容＝该技法快照正文。
- **快照生成**：`useEffect`（`:1246`）对每个 `activeTechniqueKey` 调
  `getAnalysisTechniqueContexts(activeSource, [key], { sourceContext })`（`aiAnalysisContext.js:1955`）→ 写入 state `techniqueContexts`。**这是现算（regenerate）路径，不是简单读 `moduleAiSnapshot`**：
  - `getAnalysisTechniqueContexts` → `buildTechniqueContext(source, key, baseSourceContext)`（`:1828`）；
  - **命盘类**：先 payload 命中（`getTechniqueSnapshotFromPayload`）→ 再兼容缓存（`getTechniqueSnapshotFromCache`，读 `moduleAiSnapshot`）→ 都没有才 `regenerateChartTechniqueSnapshot(record, key)`（`:970`，按 `record` 出生数据**无头复算**，内部多走 `fetchChart` / 各技法 `buildXxxSnapshotForFields`）；
  - **事盘类**：先本案例 payload 重建（`generateCaseTechniqueSnapshot`，`:611`）→ 时间确定式法可按起课时间补算（`regenerateCaseTechniqueSnapshot`，`:706`）；六爻等不在白名单不按时间重算；
  - **起课时间合成源**：白名单（`TIMEPOINT_CASTABLE_SET`）按默认设置即时起盘。
  - 重算出的文本经 `saveGeneratedTechniqueSnapshot(key, content, record, meta)`（`:412`）写回 `moduleAiSnapshot`（仅会话/全局/localStorage 缓存，**不写回 record/payload**）。

> 结论：**挂载快照的「设置」入口实质是改变喂给 `buildFieldObject(record)` / `buildCaseSnapshotParams(record)` / `payload.options` 的参数，然后强制走 regenerate 分支重算。** 见 §C 与 §阶段二。

- **拼装上下文**：`buildContextLayers({ sourceContext, techniqueContexts, ... })`（`aiAnalysisContext.js:2035`）→ 每个技法一层 `技术：{title}`，**当前不做任何按段过滤**，技法快照整文进 LLM 上下文。`clipContextLayers` 只按字符上限裁剪。
  → **内容段勾选要在这里加一步过滤**（见 §阶段一）。

### 0.2 内容段选择现状（要点 B）

`utils/aiExport.js`（5393 行）已有完整「按技法选段」机制：

- 段表：`AI_EXPORT_PRESET_SECTIONS`（`:313`，覆盖 50+ 技法）+ 技法登记表 `AI_EXPORT_TECHNIQUES`（`:247`）。
- 用户设置：`localStorage['horosa.ai.export.settings.v1']`（`AI_EXPORT_SETTINGS_KEY` `:105`），结构 `{ version, sections:{key:[选中段]}, planetInfo:{key:{showHouse,showRuler}}, astroMeaning:{key:{enabled}} }`。
- 版本/迁移：`AI_EXPORT_SETTINGS_VERSION=21`（`:112`），`normalizeAIExportSettings`（`:703`）做迁移；升 `SETTINGS_VERSION` 回收旧设置、升 `MIGRATION_VERSION`（+ `AI_EXPORT_SECTION_MIGRATION_KEYS` `:114`）把新段 union 进既有预设（不删用户项）。
- 读写：`loadAIExportSettings()`（`:2265`）/ `saveAIExportSettings()`（`:2280`）。
- 列技法可选项：`listAIExportTechniqueSettings()`（`:2291`）→ `[{key,label,options,supportsPlanetInfo,planetInfo,supportsAstroMeaning,astroMeaning,...}]`，options 来自 preset ∪ 当前页缓存里实际出现的段头。
- **有效段计算（关键复用点）**：`getAIExportEffectiveSectionsForTechnique(key, settings)`（`:2433`，已 export）→ 返回某技法实际生效的段标题数组（用户选了就用选中、没选用 preset，并剔除 forbidden）。
- **段过滤原语**：`filterContentByWantedSections(content, wantedSet)`（`:900`，**未 export**）+ `extractSectionTitles`（`:691`）+ `normalizeSectionTitle`（`:662`）。快照文本以 `[段头]` 或 `【段头】` 行分段（`parseSectionTitleLine` `:676`）。
- 「后天信息」与「术语含义」两种二次过滤：`trimPlanetInfoBySetting`（`:1178`）、`applyAstroMeaningFilterByContext`（`:4758`）；适用技法集合 `AI_EXPORT_PLANET_INFO_TECHNIQUES`（`:184`）/`AI_EXPORT_ASTRO_MEANING_TECHNIQUES`（`:220`）/`AI_EXPORT_HOVER_MEANING_TECHNIQUES`（`:226`）。

> 结论：**挂载完全可以复用同一套「按技法选段」机制**（同一份 `sections` 设置 + `getAIExportEffectiveSectionsForTechnique` + `filterContentByWantedSections`）。只需把后两个函数（段过滤原语）export 出来，或新增一个面向「整段快照文本 + 技法 key」的封装导出函数。

UI 范本：`components/homepage/PageHeader.js` 的「AI导出设置」XQModal（`:625`）：选技法（`:639`）→ 全选/清空/恢复默认（`:649`）→ 分段勾选 `XQCheckList`（`:656`）→ 后天信息/术语含义勾选（`:671`/`:692`）。逻辑 handler `onAISetting*`（`:227`–`:337`）。**挂载侧的「纳入内容」勾选直接照搬这套交互**。

### 0.3 每技法"自己的设置"在哪（要点 C）

快照重算的参数来源链：

```
record (localCharts/localCases item)
  └─ buildFieldObject(record)        # 命盘类 fields，aiAnalysisContext.js:269
  └─ buildCaseSnapshotFields(record) # 事盘类 fields，:368
  └─ payload.options / payload.<tech>.options  # 事盘类技法专属选项
        ↓
  fieldParams(fields) / buildChartBaziParams(record) / buildChartZiweiParams(record) / buildCaseSnapshotParams(record)
        ↓
  fetchChart(...) 或 各技法 buildXxxSnapshotForFields(fields) / calcDunJia(fields,nongli,options) / fetchTaiyiPan(fields,nongli,options) / ...
```

`buildFieldObject`（`:269`）已把不少**命盘排盘选项**从 `record.*` 读出（默认即现状）：
`hsys`(宫制) `zodiacal`(回归/恒星) `doubingSu28` `timeAlg`(真太阳时/钟表时) `after23NewDay` `lateZiHourUseNextDay` `gender`，以及**主限法整组**：`pdtype/pdMethod/pdTimeKey/pdDirect/pdConverse/pdAntiscia/pdTerms/pdaspects`（注释明确"优先读 record、缺省回退默认"）。但 `tradition/strongRecption/simpleAsp/virtualPointReceiveAsp/southchart/orbs` 等仍**硬编码默认**，未从 record 读。

各主要技法的"选项 state"（实现时按此清单逐项接，详见 §阶段二 schema）：

| 技法 key | 组件 | 选项 state 名 | 影响路径 | 重算可行性 |
|---|---|---|---|---|
| `astrochart` / `astrochart_like` / `indiachart` | `astro/*` | `fields.{hsys,zodiacal,tradition,strongRecption,simpleAsp,virtualPointReceiveAsp,doubingSu28,southchart,orbs,...}` | `fieldParams`→`fetchChart` | **通用**（扩 `buildFieldObject`/`fieldParams` 读 record） |
| 星运全系（`primarydirect`/`firdaria`/`profection`/`solararc`/`zodialrelease`/`decennials`/`distributions`/`agepoint`/`planetaryages`/`vedicprog`/`balbillus`/`triplicityrulers`/`keypoints`/`lunationphase`/`extrareturns`/`yearsystem129`/`planetaryarc`/`persiandirected`/`jaynesprog`/`solarreturn`/`lunarreturn`/`givenyear`） | `direction/*`、`astro/*` | 主限法组 `pd*`；其余多为默认参数 | `fetchChartResultForRecord(record,{includePrimaryDirection})` + `buildXxxSnapshotText(chartObj)` | 主限法**已通**；其余推运参数多固定（默认即现状），按需扩 |
| `bazi` | `cntradition/BaZi` | `params.{timeAlg,phaseType,godKeyPos,after23NewDay,lateZiHourUseNextDay,adjustJieqi}` | `buildChartBaziParams`→`buildBaziSnapshotForParams(params)` | **通用**（params 已含这些，扩 record 读取即可） |
| `ziwei` | `ziwei/ZiWeiMain` | `params.{timeAlg,after23NewDay,lateZiHourUseNextDay}` + 流派四化/盘式（组件内部 state，未入 params） | `buildChartZiweiParams`→`buildZiweiSnapshotForParams(params)` | 时间类**通用**；流派/四化表需扩 params + builder（**特判**） |
| `guolao` | `guolao/GuoLaoChartMain` | `fields` + 内部 localStorage `horosa.guolao.engineMode` 等显示选项 | `buildGuolaoSnapshotForFields(fields)` | builder 只收 fields，显示选项走自有 localStorage（**特判**：设置面板写这些 localStorage key 即可） |
| `germany` | `germany/AstroMidpoint` | `fields` + TNP/中点显示选项 | `buildGermanySnapshotForFields(fields)` | 同上（**特判**） |
| `suzhan` | `suzhan/SuZhanMain` | `fields`（随西洋盘 28 宿） | `buildSuzhanSnapshotText(chartObj,fields,null)` | **通用**（跟随 astro fields） |
| `huangji`/`xianqin`/`cetian` | `huangji/*`、`kinastro/*` | `fields`（ken 后端起盘） | `buildKinAstroSnapshotForFields(fields,key)` / `buildHuangJiSnapshotForFields(fields)` | **通用**（跟随出生 fields） |
| `canping`/`heluo` | `shusuan/*`（纯前端） | 由本盘四柱推（`buildChartShusuanBazi`），自身还有 `method`/`qiyunAge` 等（现写死 `'ming'`/`1`） | `buildCanpingSnapshotForRecord`/`buildHeluoSnapshotForRecord` | 时间类**通用**；数算流派选项需扩（**特判**，当前写死） |
| `qimen` | `dunjia/DunJiaMain` | `DEFAULT_OPTIONS`（`:81`，15+ 键：`dateType/jieQiType/paiPanType/zhiShiType/qijuMethod/kongMode/yimaMode/shiftPalace/fengJu/sex/...`）+ `faRelatedPeople`（相关人员·生年干） | 事盘：`payload.options`/`payload.qimen.options`→`regenerateQimenSnapshot`→`calcDunJia(fields,nongli,options)` | **通用**（regenerate 已读 `payload.options`，只需让设置面板写 options） |
| `taiyi` | `taiyi/TaiYiMain` | `state.options`（`sex/积年/盘式/...`） | `payload.options`→`regenerateTaiyiSnapshot`→`fetchTaiyiPan(fields,nongli,options)` | **通用** |
| `liureng` | `liureng/LiuRengMain` | 起课法组：`castMethod/xuanShiZhi/yanShuNum/yueJiangMethod/fenZhouYe` + `guireng`(贵人)/`wuxing`(遁干) | 事盘：从 `payload.{castMethod,...}`/`payload.guireng` 读；`regenerateLiurengSnapshot(record)` 走默认 | 事盘 payload 命中**通用**；起课时间重算需把 options 传入 `regenerateLiurengSnapshot`（**小改**） |
| `jinkou` | `jinkou/JinKouMain` | `diFen`(地分)/`guireng`/`wuxing` | `regenerateJinkouSnapshot(record,payload)` 读 `payload.{diFen,guireng,wuxing}` | **通用**（已读 payload） |
| `sixyao` | `guazhan/GuaZhanMain` | 起卦方式（时间/数字/自定义；摇卦结果） | 事盘读 `payload.gua`；起课时间走 `regenerateSixyaoSnapshot`(时间起卦) | **不可任意重算**：摇卦/数字卦是确定结果，"设置"仅起卦时刻的时区/经度（影响真太阳时/神煞），**不重摇卦**（GuaZhanInput.js:82 已注明）。设置面板对 sixyao 应**只暴露内容段勾选 + 起卦时刻**，不暴露"重起卦象" |
| `tongshefa` | `tongshefa/*` | `payload.selection`（已起卦选择） | `buildTongSheFaSnapshot(buildTongSheFaModel(selection))` | 同六爻，**只读已存**，无重算 |
| `sanshiunited` | `sanshi/*` | = liureng+qimen+taiyi 三者 options 合并 | `regenerateSanshiUnifiedSnapshot(record,payload)` | 复合**通用**（各子式法 options 透传） |
| `horary`/`election` | `horary/*`、`election/*` | 类别 `topicId`（现写死 `'general'`/`'marriage'`） | `regenerateHorarySnapshot`/`regenerateElectionSnapshot` | 时间起盘**通用**；类别选项需让 record/options 携带（**小改**） |
| `mundane` | `mundane/*` | 多类型（入宫/新月/食…），快照存于 `payload.aiSnapshot` | 直接读 `payload.aiSnapshot`，**不按时间重算** | **只读已存**，无重算 |

**统一可行路径**：
- **A 类（fields 驱动，可通用）**：命盘/星运/八字/紫微时间项/宿占/数算时间项/演禽/策天/皇极 — 把更多选项从 `record.*` 读进 `buildFieldObject`/`buildChartBaziParams`/`buildChartZiweiParams`，再强制走 regenerate。
- **B 类（payload.options 驱动，已通用）**：奇门/太乙/金口诀/三式 — regenerate 已读 `payload.options`/`payload.<sub>`，设置面板只需把新 options 写进**重算用的临时 record/payload**。
- **C 类（builder 自读 localStorage 全局）**：七政四余/量化盘显示选项 — 设置面板写对应 localStorage key（如 `horosa.guolao.engineMode`），builder 自然读到。
- **D 类（不可重算，只读已存 + 仅段勾选）**：六爻/统摄法/世俗盘 — 设置面板**隐藏"重算类设置"**，只给「纳入内容」勾选（+ 六爻可调起卦时刻）。

### 0.4 命盘事盘储存（要点 D）

- 命盘：`utils/localcharts.js`，`buildLocalChartRecord(values)`（`:235`）/`upsertLocalChart`（`:294`）。**已持久化的"per-技法选项"**：`hsys`(经 fields)、`doubingSu28`、`after23NewDay`、`lateZiHourUseNextDay`、`timeAlg`、`orbs`、`orbScale`、主限法组 `pdMethod/pdTimeKey/pdtype/pdDirect/pdConverse/pdAntiscia/pdTerms`（注释：present 才落库、AI 挂载时复原）。
- 事盘：`utils/localcases.js`，`buildLocalCaseRecord(values)`（`:321`）/`upsertLocalCase`（`:350`），技法专属配置进 `payload`（如 `payload.options`、`payload.faRelatedPeople`、`payload.{castMethod,guireng,wuxing,diFen}`）。`CASE_TYPE_OPTIONS` 是事盘类型登记表。

> 结论：储存层**已有承载 per-技法配置的位置**（命盘 record 字段 / 事盘 payload），但只覆盖了"被人接过线"的几项。**新方案不必另建存储**：
> - **per-技法默认配置**（"以后同类沿用"）→ 存 **localStorage 新键** `horosa.ai.mount.techniqueDefaults.v1`（结构 `{ [techKey]: optionsObject }`），与 `aiExport` 设置并列、独立版本号。挂载重算时把它 merge 进 record/payload。
> - **某张盘/案例的一次性覆盖**（"这次挂这张盘用 Placidus"）→ 不写回 record（合成源/他人盘不可写），只在**会话内**保存在 `AIAnalysisMain` 的一个 state `techniqueOptionOverrides`（`{[techKey]:options}`）。若用户在命盘源上点"另存为命盘"，再落 record（复用现成 `buildLocalChartRecord` 字段）。

### 0.5 四同步落点（要点 E）

`utils/__tests__/aiExport.test.js`（302 行）已钉死四套注册表交叉一致（导出 / 导出设置 / AI 挂载 / 命盘事盘储存）：
- `getAIExportAuditMatrix()`（`aiExport.js:2417`）每项必有 preset/options/extractionKind/structuredSnapshotKeys/snapshotModuleKey；
- 所有 `ANALYSIS_CHART_TECHNIQUES ∪ ANALYSIS_CASE_TECHNIQUES`（`aiAnalysisContext.js:162`/`:201`）⊆ 导出技法表且有中文标签；
- 事盘类落到 `CASE_TYPE_OPTIONS`（含 `sixyao↔liuyao` 别名）；
- 有 preset 的技法都进 migration。

> 结论：新增"每技法配置 + 内容勾选"必须**接进同一份审计矩阵**，并加新断言（见 §阶段三）。

---

## 1. 分阶段实现计划（先低风险、后高风险）

### 阶段一：内容段勾选（复用 aiExport 段机制，风险低）✅ 先做

让挂载也按技法勾选纳入的内容段，**完全复用** `aiExport` 现成设置（同一份 `sections`，用户在"AI导出设置"调的段，挂载也照用；同时在挂载抽屉里也能直接调）。

**1.1 在 `utils/aiExport.js` 暴露段过滤封装（唯一新 export）**

新增并 export 一个面向"整段快照文本 + 技法 key"的纯函数（内部复用现成 `getAIExportEffectiveSectionsForTechnique` + `filterContentByWantedSections` + `trimPlanetInfoBySetting` + `applyAstroMeaningFilterByContext` + `stripForbiddenSections`）：

```js
// aiExport.js（新增 export）：给定某技法的整段快照文本 + 技法 key，按当前 AI导出设置(sections/planetInfo/astroMeaning)
// 过滤出"纳入"的段。挂载与导出共用同一份设置，保证一致。settings 可注入(便于挂载侧用合并后的设置/测试)。
export function applyAIExportSectionFilterToSnapshot(content, key, settings = loadAIExportSettings()){
    const exportKey = normalizeExportKey(key);
    let out = applyUserSectionFilterByContext(`${content || ''}`, exportKey); // 段勾选 + jieqi 特例 + forbidden
    if(isPlanetInfoTechnique(exportKey)){
        out = trimPlanetInfoBySetting(out, getPlanetInfoSettingByTechnique(settings, exportKey));
    }
    if(isAstroMeaningTechnique(exportKey) || isHoverMeaningTechnique(exportKey)){
        out = applyAstroMeaningFilterByContext(out, exportKey);
    }
    return `${out || ''}`.trim();
}
```
> 注意：`applyUserSectionFilterByContext`/`trimPlanetInfoBySetting`/`applyAstroMeaningFilterByContext` 当前内部各自 `loadAIExportSettings()`。为支持挂载侧"导出设置 + 挂载临时覆盖"的合并设置注入，**实现时把这些内部读设置改为可选入参**（默认仍 `loadAIExportSettings()`，不破坏导出现状），或在 `applyAIExportSectionFilterToSnapshot` 里临时 `saveAIExportSettings` 不可取——**改为入参透传**。最小改：给这三个函数加 `settings = loadAIExportSettings()` 形参并透传。

**1.2 挂载侧应用过滤**

在 `aiAnalysisContext.js` 拼装上下文处加过滤。两个落点二选一（推荐 B，集中、单点）：

- **落点 A（在 `buildTechniqueContext` 返回前过滤）**：技法卡预览与最终上下文都已过滤，所见即所挂。需 `import { applyAIExportSectionFilterToSnapshot } from './aiExport'`，在每个 return 的 `content` 外包一层。**缺点**：6 处 return 都要包。
- **落点 B（在 `buildContextLayers` 里过滤，推荐）**：`buildContextLayers`（`:2076`）遍历 `techniqueContexts` 时，对每层 `item.content` 调 `applyAIExportSectionFilterToSnapshot(item.content, item.key, mergedSettings)`。**单点、覆盖最终送 LLM 的文本**。技法卡预览若也要显示过滤后文本，则 `lockedContextItems`（`AIAnalysisMain.js:1080`）里 technique 项的 `content` 也包一层（展示用）。
- **推荐组合**：B（保证送 LLM 一致）+ 卡预览同步过滤（保证所见即所挂）。两处都调同一函数。

> `sixyao/guazhan` 别名：技法 key 是 `sixyao`，导出 key 也是 `sixyao`，`normalizeExportKey` 已兼容；快照模块名是 `guazhan`，但段过滤是对**文本**做，不受模块名影响。

**1.3 挂载抽屉里的"纳入内容"勾选 UI（阶段一可先只读导出设置，阶段二再做可视编辑）**

阶段一最小：挂载直接吃"AI导出设置"里的 `sections`（用户改导出设置 → 挂载同步生效），抽屉里加一行说明 + "打开 AI 导出设置"快捷。
阶段二完整：把勾选 UI 搬进每技法设置面板（见 §阶段二 UI）。

**阶段一自检**：
- 新增 `applyAIExportSectionFilterToSnapshot` 单测（构造带 `[起盘信息]/[希腊点]` 的文本，设 `sections.astrochart=['起盘信息']`，断言结果含起盘信息、不含希腊点；空 wanted 回退原文不致空白）。
- `npm test`（`utils/__tests__/aiExport.test.js` 全绿，不回归）。
- preview 实测：挂载某命盘，去 AI导出设置取消"希腊点"，挂载预览卡不再含希腊点。

---

### 阶段二：每技法设置面板（按技法 schema，风险中—高）

#### 2.1 统一抽象 `TECHNIQUE_SETTINGS_SCHEMA`

新建 `utils/techniqueMountSettings.js`，集中定义"技法 → 可调项 → 默认值 → 如何套用重算"。结构建议：

```js
// utils/techniqueMountSettings.js
// 每技法的"挂载可调设置" schema。字段分两类:
//  - recordFields: 写进重算用 record.* 的键(A 类:fields 驱动)
//  - payloadOptions: 写进重算用 payload.options / payload.<path> 的键(B 类:事盘 options 驱动)
//  - localStorageKeys: 写进全局 localStorage 的键(C 类:builder 自读)
//  - 'sectionsOnly': true 表示该技法不可重算,只暴露内容段勾选(D 类)
// field 描述: { name, label, type:'select|switch|number|text', options?, default, group? }
// default 必须 === 现状默认(buildFieldObject/DEFAULT_OPTIONS 里的值),保证"不调=现状"。
export const TECHNIQUE_SETTINGS_SCHEMA = {
  astrochart: {
    kind: 'record',
    fields: [
      { name:'hsys', label:'宫制', type:'select', options:HSYS_OPTIONS, default:0 },
      { name:'zodiacal', label:'黄道', type:'select', options:[{value:0,label:'回归'},{value:1,label:'恒星'}], default:0 },
      { name:'tradition', label:'传统择宫', type:'switch', default:0 },
      { name:'doubingSu28', label:'斗柄28宿', type:'switch', default:0 },
      { name:'timeAlg', label:'时间算法', type:'select', options:[{value:0,label:'真太阳时'},{value:1,label:'钟表时'}], default:0 },
      // ... strongRecption/simpleAsp/virtualPointReceiveAsp/southchart/orbScale ...
    ],
  },
  bazi: { kind:'record', fields:[ /* timeAlg, phaseType, godKeyPos, adjustJieqi, after23NewDay, lateZiHourUseNextDay */ ] },
  primarydirect: { kind:'record', fields:[ /* pdMethod, pdTimeKey, pdDirect, pdConverse, pdAntiscia, pdTerms, pdtype */ ] },
  qimen: { kind:'payload', optionsPath:'options', fields:[ /* 镜像 DunJiaMain DEFAULT_OPTIONS 各键 */ ] },
  taiyi: { kind:'payload', optionsPath:'options', fields:[ /* TaiYiMain state.options */ ] },
  liureng: { kind:'payload', optionsPath:'', fields:[ /* castMethod,xuanShiZhi,yanShuNum,yueJiangMethod,fenZhouYe,guireng,wuxing 直接铺在 payload 顶层 */ ] },
  jinkou: { kind:'payload', optionsPath:'', fields:[ /* diFen,guireng,wuxing */ ] },
  guolao: { kind:'localStorage', fields:[ { name:'engineMode', storageKey:'horosa.guolao.engineMode', ... } ] },
  germany: { kind:'localStorage', fields:[ /* TNP/中点显示 localStorage keys */ ] },
  sixyao: { kind:'sectionsOnly' },     // 不可重算卦象
  tongshefa: { kind:'sectionsOnly' },
  mundane: { kind:'sectionsOnly' },
  // ... 其余技法 ...
};
```

辅助导出：
- `getTechniqueSettingsSchema(key)` → 该技法 schema（无则 `null` → 设置面板只显示"纳入内容"勾选）。
- `getTechniqueSettingsDefaults(key)` → 由 schema 抽 `{name:default}`，**必须逐个对齐组件里的现状默认**（实现时打开各组件比对：`DunJiaMain.js:81` `DEFAULT_OPTIONS`、`buildFieldObject` `aiAnalysisContext.js:269`、`TaiYiMain.js:55` options 等）。
- `loadMountTechniqueDefaults()` / `saveMountTechniqueDefaults(key, options)` → 读写 localStorage `horosa.ai.mount.techniqueDefaults.v1`（带 `version`，结构 `{version, techniques:{[key]:options}}`，缺省 `{}` = 全默认）。
- `mergeOptionsIntoRecord(record, key, options)` / `mergeOptionsIntoPayload(payload, key, options)` → 把用户配置叠加到重算用的临时 record/payload（**不改原对象，返回副本**）。`localStorage` 类则 `applyLocalStorageSettings(key, options)`（重算前临时写、可选重算后还原——但因这些就是"全局默认"，写入即视为新默认，不还原）。

> **哪些通用 / 哪些特判**（明确）：
> - **通用（A/B 类，占绝大多数）**：astrochart 系、星运系、bazi、ziwei(时间项)、suzhan、huangji、xianqin、cetian、canping/heluo(时间项)、qimen、taiyi、jinkou、liureng、sanshiunited、horary、election。统一走"options → merge 进 record/payload → 强制 regenerate"。
> - **特判**：
>   - `guolao`/`germany`：builder 只收 fields，显示选项走自有 localStorage → schema 用 `kind:'localStorage'`。
>   - `ziwei` 流派四化/盘式、`canping`/`heluo` 数算流派：当前 builder 用写死值（ziwei 流派在组件 state、canping `method:'ming'`）→ 若要可调，需扩 `buildZiweiSnapshotForParams`/`canpingCalculate` 入参（**列为 P2 增强，阶段二可先不暴露这些项，只暴露时间类**）。
>   - `sixyao`/`tongshefa`/`mundane`：`kind:'sectionsOnly'`，**不出重算项**。
>   - `liureng` 起课时间重算：`regenerateLiurengSnapshot(record)`（`:491`）当前不收 options → 需加可选 options 形参透传 `buildLiuRengSnapshotText`（**小改**）。
>   - `horary`/`election` 类别：`regenerateHorarySnapshot`/`regenerateElectionSnapshot` 写死 `'general'`/`'marriage'` → 改为读 `options.topicId`（**小改**）。

#### 2.2 让重算"认"新设置（核心改造，`aiAnalysisContext.js`）

现状问题：`buildTechniqueContext`（`:1828`）命盘类**优先 payload 命中 / 兼容缓存**，只有都没有才 regenerate。一旦用户改了设置，必须**绕过 payload/cache、强制按新设置重算**。

新增"覆盖驱动"的重算入口（不动现有默认路径）：
```js
// aiAnalysisContext.js（新增 export）。当 options 非空时,强制按新设置重算该技法快照(绕过 payload/cache 命中),
// 并把结果连同"配置指纹"返回。options 为空 → 走原 buildTechniqueContext(默认即现状,字节不变)。
export async function getAnalysisTechniqueContextWithOptions(source, techniqueKey, options, baseSourceContext){
    const key = normalizeTechniqueKey(techniqueKey);
    if(!source || !key) return null;
    const opts = options && typeof options === 'object' && Object.keys(options).length ? options : null;
    if(!opts){
        return buildTechniqueContext(source, key, baseSourceContext); // 默认路径,零行为变化
    }
    const record = source.record || {};
    if(isChartTechnique(key)){
        const mergedRecord = mergeOptionsIntoRecord(record, key, opts);
        applyLocalStorageSettings(key, opts); // C 类:写全局显示选项
        const text = await regenerateChartTechniqueSnapshot(mergedRecord, key); // 强制重算
        return wrapTechnique(key, text, mergedRecord, { mountOverride:true, optionFingerprint:hash(opts) });
    }
    // 事盘/起课时间类:把 options 叠进 payload,强制走 regenerateCaseTechniqueSnapshot
    const payload = mergeOptionsIntoPayload(parsePayload(record), key, opts);
    const text = await regenerateCaseTechniqueSnapshot(record, key, payload);
    return wrapTechnique(key, text, record, { mountOverride:true, optionFingerprint:hash(opts) });
}
```
- `isChartTechnique(key)` = `ANALYSIS_CHART_TECHNIQUES.includes(key)`。
- `regenerateChartTechniqueSnapshot` 已按 `buildFieldObject(record)` 读 record → 只要 `mergeOptionsIntoRecord` 把 options 写进 record.*，且 `buildFieldObject` 读了这些字段（**部分字段需扩 `buildFieldObject`/`fieldParams` 读取**，见 §2.3），即生效。
- 重算结果**也写默认缓存** `saveGeneratedTechniqueSnapshot`（带 mountOverride meta），方便后续命中。
- **默认即现状铁律**：`opts` 为空就调原 `buildTechniqueContext`，**一行不改默认路径**（守 AGENTS 主限法 540 byte-perfect 同精神）。

`AIAnalysisMain.js` 改 `useEffect`（`:1246`）：调 `getAnalysisTechniqueContextWithOptions(activeSource, key, effectiveOptionsFor(key), sourceContext)`，其中 `effectiveOptionsFor(key)` = 会话覆盖 `techniqueOptionOverrides[key]` ?? `loadMountTechniqueDefaults().techniques[key]` ?? `{}`（空＝默认）。

#### 2.3 扩 `buildFieldObject` / `fieldParams` 读更多 record 字段（A 类技法生效前提）

`aiAnalysisContext.js:269` `buildFieldObject` 与 `:318` `fieldParams`：把 schema 里列入的命盘排盘选项从硬编码默认改为"读 record、缺省回退默认"，对齐已有 `pd*` 的写法（如 `tradition:{value: record.tradition!==undefined?record.tradition:0}`）。同步在 `localcharts.js buildLocalChartRecord`（`:235`）补这些字段的 present-才落库（对齐 `pdMethod` 等写法），保证"另存为命盘"能持久化。

> **风险控制**：每加一个字段，默认值必须 === 现状（`0`/对应默认），并跑命盘快照回归（无 override 时输出与改前逐字一致）。

#### 2.4 小改若干 regenerate 函数收 options

- `regenerateLiurengSnapshot(record, options?)`（`:491`）：把 `options.{castMethod,xuanShiZhi,yanShuNum,yueJiangMethod,fenZhouYe,guireng,wuxing}` 透传 `buildLiuRengSnapshotText`。
- `regenerateHorarySnapshot(record, options?)` / `regenerateElectionSnapshot(record, options?)`（`:885`/`:901`）：`runHorary(chart, options.topicId||'general')` / `runElection(chart, options.topicId||'marriage')`。
- `regenerateCaseTechniqueSnapshot(record, key, payload)`（`:706`）：分发处把 payload 里的 options 取出传给上述函数。

#### 2.5 UI：每卡「设置」按钮 + 设置抽屉/弹窗

在技法卡（`AIAnalysisMain.js:2970` 的 `Collapse.Panel` header，type==='technique' 时）右上加「设置」按钮（`Button size="small" icon=settings`），点击 `openTechniqueSettings(item.key)` → 打开**二级抽屉/弹窗**（`Drawer` placement right 或 `Modal`），含两个分区：

1. **「该技法设置」**：按 `getTechniqueSettingsSchema(key)` 渲染表单（`type` → `Select/Switch/InputNumber/Input`，按 `group` 分组）。底部按钮：
   - 「应用并重算」→ 写 `techniqueOptionOverrides[key]`（会话级）→ 触发该技法 useEffect 重算 → 卡状态转「已按盘重算」（`CONTEXT_STATUS_META.regenerated`，已存在 `:596`）。
   - 「设为同类默认」→ `saveMountTechniqueDefaults(key, options)`（持久，以后该技法默认用它）。
   - 「恢复默认」→ 删 override + 删该 key 的 mount default → 回现状。
   - `kind:'sectionsOnly'` 技法此分区显示"该技法快照按已存卦象/盘面生成，不支持重算设置"。
2. **「纳入内容」**：照搬 `PageHeader.js:654`–`:703` 的 `XQCheckList` 段勾选 + 后天信息/术语含义勾选，handler 复用同款逻辑，写**同一份** `aiExport` 设置（`saveAIExportSettings`）→ 挂载与导出同步。技法 key 用本卡 key。

> 入口也可在「使用技法」多选每个 tag 上加齿轮；但**按卡放**更贴需求（"每个挂载技法卡右上角"）。

**阶段二自检**：
- `techniqueMountSettings` 单测：每个 `ANALYSIS_CHART_TECHNIQUES ∪ ANALYSIS_CASE_TECHNIQUES` 都能 `getTechniqueSettingsSchema` 返回 schema 或显式 `sectionsOnly`（无遗漏）；`getTechniqueSettingsDefaults(key)` 每字段 default 与组件常量一致（对 qimen 断言 === `DEFAULT_OPTIONS` 子集）。
- 重算等价性：`getAnalysisTechniqueContextWithOptions(source, key, {})` 结果 === `buildTechniqueContext(source, key)`（空 options 不改行为）。
- preview 实测：挂载命盘 → astrochart 卡设置改"恒星黄道"→ 重算 → 快照里星座变恒星制；不调的卡逐字不变。

---

### 阶段三：四同步加固 + 自检

**3.1 接进审计矩阵**：`getAIExportAuditMatrix()`（`aiExport.js:2417`）每项加 `supportsMountSettings`（= schema 非 `sectionsOnly` 且非空）、`mountSettingsKind`。`aiAnalysisContext` 侧导出 `getMountableTechniqueAuditMatrix()`（技法 → 是否可重算 / schema 字段数 / 默认指纹）。

**3.2 新增四同步断言**（`utils/__tests__/aiExport.test.js` 或新 `techniqueMountSettings.test.js`）：
- 每个可挂载技法（`ANALYSIS_CHART_TECHNIQUES ∪ ANALYSIS_CASE_TECHNIQUES`）在 `TECHNIQUE_SETTINGS_SCHEMA` 有登记（schema 或 `sectionsOnly`），**无遗漏**（防新增技法漏接设置）。
- `sectionsOnly` 集合 = `{sixyao,tongshefa,mundane}`（变更需显式改测试，防误把可重算技法标成只读）。
- schema 里每个 `recordFields[].name` 都能在 `buildFieldObject` / `fieldParams` 找到对应读取（grep 守 or 反射）；每个 `payload` 类技法对应 `regenerateCaseTechniqueSnapshot` 有 case。
- mount default 的 localStorage 键与 `aiExport` 设置键不冲突（独立版本号）。
- `applyAIExportSectionFilterToSnapshot` 对每个有 preset 的技法：空 wanted 不致全空（回退原文）。

**3.3 preflight 守门**（`Horosa-Web/release_preflight.sh`，对齐现有 `[33]` 主限法 grep 套路）：
- 加一条：`grep` 确认 `getAnalysisTechniqueContextWithOptions` 在 `opts` 为空时调 `buildTechniqueContext`（默认路径未被破坏）。
- 加一条：确认 `TECHNIQUE_SETTINGS_SCHEMA` 覆盖 `ANALYSIS_*_TECHNIQUES`（可用 node 跑断言）。

**3.4 文档/AGENTS 回写**：在 `实现说明` 加「AI 挂载·每技法设置 + 内容勾选」节，记本方案的坑（默认即现状铁律、payload/cache 命中需绕过、buildFieldObject 默认对齐、sixyao 不可重算、四同步审计点）；在 `Horosa-Web/docs/西占新功能-AI导出与储存接入清单.md`（若存在）补"挂载设置"列。

---

## 2. 确切文件:函数清单（实现 checklist）

**新增**
- `utils/techniqueMountSettings.js`：`TECHNIQUE_SETTINGS_SCHEMA`、`getTechniqueSettingsSchema`、`getTechniqueSettingsDefaults`、`loadMountTechniqueDefaults`、`saveMountTechniqueDefaults`、`mergeOptionsIntoRecord`、`mergeOptionsIntoPayload`、`applyLocalStorageSettings`、`isChartTechnique`、`getMountableTechniqueAuditMatrix`。
- `utils/__tests__/techniqueMountSettings.test.js`：schema 覆盖 / 默认对齐 / 空 options 等价 / sectionsOnly 集合。

**修改**
- `utils/aiExport.js`
  - 新 export `applyAIExportSectionFilterToSnapshot(content, key, settings?)`（`:2433` 附近）。
  - 给 `applyUserSectionFilterByContext`（`:1162`）/`applyUserSectionFilter`（`:1087`）/`trimPlanetInfoBySetting`（`:1178`）/`applyAstroMeaningFilterByContext`（`:4758`）加可选 `settings` 形参透传（默认 `loadAIExportSettings()`，导出现状不变）。
  - `getAIExportAuditMatrix`（`:2417`）加 `supportsMountSettings`/`mountSettingsKind`。
- `utils/aiAnalysisContext.js`
  - 新 export `getAnalysisTechniqueContextWithOptions(source, key, options, baseSourceContext)`。
  - `buildFieldObject`（`:269`）/`fieldParams`（`:318`）：A 类技法新增字段读 record（默认回退）。
  - `regenerateLiurengSnapshot`（`:491`）/`regenerateHorarySnapshot`（`:885`）/`regenerateElectionSnapshot`（`:901`）/`regenerateCaseTechniqueSnapshot`（`:706`）：收 options 透传。
  - `buildContextLayers`（`:2035`）：技法层 content 过 `applyAIExportSectionFilterToSnapshot`。
- `utils/localcharts.js`：`buildLocalChartRecord`（`:235`）补 A 类新字段 present-才落库。
- `components/aianalysis/AIAnalysisMain.js`
  - 新 state `techniqueOptionOverrides`（`{[key]:options}`，会话级）、`techniqueSettingsKey`（当前打开设置的技法）、`techniqueSettingsOpen`。
  - `useEffect`（`:1246`）改调 `getAnalysisTechniqueContextWithOptions(..., effectiveOptionsFor(key), ...)`。
  - `lockedContextItems`（`:1080`）technique 项 content 过 `applyAIExportSectionFilterToSnapshot`（卡预览同步）。
  - 技法卡 header（`:2970`）加「设置」按钮 + `renderTechniqueSettingsDrawer()`（两分区：该技法设置 + 纳入内容）。
- `components/homepage/PageHeader.js`：无需改（导出设置 UI 复用其交互模式，逻辑搬到 AIAnalysisMain）。

**测试/守门**
- `utils/__tests__/aiExport.test.js`：加段过滤封装单测 + 四同步新断言。
- `Horosa-Web/release_preflight.sh`：加默认路径 grep + schema 覆盖断言。
- `实现说明` / `docs/西占新功能-AI导出与储存接入清单.md`：回写。

---

## 3. "默认即现状"如何保证（铁律）

1. **段过滤**：用户没在 `sections` 里登记某 key → `getAIExportEffectiveSectionsForTechnique` 回 preset（全段）→ `filterContentByWantedSections` 保留全部 → 与现状逐字一致。`applyAIExportSectionFilterToSnapshot` 对空/无段文本回退原文（已有 `if(sections.length===0) return content`）。
2. **设置重算**：`getAnalysisTechniqueContextWithOptions` 在 `options` 为空时**直接调原 `buildTechniqueContext`**，不进任何新分支 → 行为零变化。
3. **buildFieldObject 扩字段**：每个新读字段 `record.X !== undefined ? record.X : <现状默认>`，老 record 无该字段 → 用现状默认 → 输出不变（对齐已落地的 `pd*` 写法，AGENTS 有 540 byte-perfect 先例）。
4. **mount defaults / overrides**：默认空 `{}`，不调任何设置时永不进 merge/override 路径。
5. **localStorage 类（guolao/germany）**：未设置时不写任何 key，builder 读到的仍是现有全局默认。
6. **回归门**：`npm test` 既有 302 行 aiExport 自检 + 新增"空 options 等价"断言；preview 抽检"不调设置的命盘/事盘快照逐字不变"。

---

## 4. 四同步自检如何加（落点汇总）

| 同步面 | 现状注册表 | 新增"配置+勾选"接入点 | 自检断言 |
|---|---|---|---|
| **AI 导出** | `aiExport.js` preset/extractor | 段勾选共用 `sections`；导出本就按段过滤，无新增 | 既有 |
| **AI 导出设置** | `listAIExportTechniqueSettings` + PageHeader UI | 不变（挂载复用同份 `sections`） | 既有 |
| **AI 分析挂载** | `aiAnalysisContext` `ANALYSIS_*_TECHNIQUES` + `getAnalysisTechniqueContexts` | 新 `getAnalysisTechniqueContextWithOptions` + `TECHNIQUE_SETTINGS_SCHEMA` + 段过滤 | 新增：schema 覆盖全部可挂载技法；空 options 等价 |
| **命盘事盘储存** | `localcharts.buildLocalChartRecord` / `localcases` payload / `CASE_TYPE_OPTIONS` | A 类新字段 present-才落库；mount defaults 走独立 localStorage | 新增：schema.recordFields ⊆ buildLocalChartRecord 持久字段（A 类） |

核心不变量（写进测试）：**任一可挂载技法若新增，必须同时在（导出技法表 / 中文标签 / CASE_TYPE_OPTIONS[事盘] / TECHNIQUE_SETTINGS_SCHEMA）四处登记**，缺一即红（扩展现有 `aiExport.test.js:244` 的「四同步」describe 块为"五同步"）。

---

## 5. UI 成熟方案（交互细节）

- **入口**：技法卡（`Collapse.Panel` header）右上「设置」`Button`（齿轮 icon，`size="small"`，`type="text"`，`onClick` 阻止冒泡避免触发折叠）。仅 `type==='technique'` 卡显示；`sectionsOnly` 技法仍显示（只是面板内"该技法设置"区给只读提示，"纳入内容"区正常）。
- **面板**：右侧二级 `Drawer`（`width=480`，盖在挂载抽屉之上）或居中 `Modal`。标题「{label} · 挂载设置」。两个分区用 `XQSectionTitle` 分隔：
  - **该技法设置**：`Form` + schema 渲染（`Select`/`Switch`/`InputNumber`）。按 `field.group` 折叠分组（如主限法分"方位法/时间换算/方向"）。底栏：`应用并重算` `设为同类默认` `恢复默认`。改动后卡 Tag 转「已按盘重算」（蓝）。
  - **纳入内容**：`XQCheckList columns={2}`（段勾选）+ `全选/清空/恢复默认` + 后天信息/术语含义勾选（按 `supportsPlanetInfo`/`supportsAstroMeaning`）。即时写 `saveAIExportSettings`（与导出设置同源）。
- **状态反馈**：重算中卡 Tag「待生成」(default)→ 成功「已按盘重算」(blue)/「已就绪」(green)；失败「缺失」(red)。沿用 `CONTEXT_STATUS_META`（`:594`）。
- **持久化语义**：会话覆盖（仅本次）vs 同类默认（持久）两个按钮分明，避免用户误以为"应用"= 永久改默认。

---

## 6. 风险与坑（实现时盯紧）

1. **payload/cache 命中遮蔽新设置**：命盘类 `buildTechniqueContext` 优先 payload/缓存命中，改设置必须走 `getAnalysisTechniqueContextWithOptions` 的强制 regenerate 分支，否则"调了没反应"。
2. **builder 只收 fields**：`buildGuolaoSnapshotForFields`/`buildGermanySnapshotForFields`/`buildBaziSnapshotForParams`/`buildZiweiSnapshotForParams` 不收自由 options → A 类靠扩 `buildFieldObject`/params 读 record；ziwei 流派、数算流派要改 builder 签名（列 P2）。
3. **buildFieldObject 默认必须逐字对齐**：漏一个默认值或写错回退 → 破坏"不调=现状"。每加字段单独回归。
4. **六爻/统摄/世俗不可重算**：强行按时间/options 重算 = 伪造卦象/盘面（`aiAnalysisContext.js` Part F 注释、`GuaZhanInput.js:82` 已警示）。schema 标 `sectionsOnly`。
5. **设置注入需透传而非全局写**：阶段一段过滤封装若临时 `saveAIExportSettings` 会污染全局 → 必须用入参透传 settings。
6. **mount defaults 与 export settings 分离**：两套 localStorage 键、两套版本号，互不迁移；段勾选共用 export `sections`，技法重算配置走 mount defaults。
7. **合成源/他人盘不可写 record**：override 只存会话 state；要持久必须经"另存为命盘/事盘"。
8. **qimen faRelatedPeople（相关人员·生年干）**：是 `pan.faRelatedPeople` 单源（`DunJiaMain.js:867`），属"内容/数据"非"排盘选项"，挂载重算时若走起课时间补算需显式置空或从 payload 取（现 `regenerateQimenSnapshot` 已处理 `:670`）；设置面板**不要**把它当普通 option 覆盖。
9. **四同步测试先行**：先写"schema 覆盖全部可挂载技法"断言（会红），再补全 schema，避免遗漏任一命盘/事盘技法（canping/heluo 曾因漏登记隐身——`aiExport.test.js:105` 即此哨兵）。

---

## 7. 实现顺序建议（最小风险增量）

1. 阶段一全做（段过滤封装 + 挂载吃 export `sections` + 卡预览过滤）→ 自检 → preview → 可单独成一版。
2. `techniqueMountSettings.js` 骨架 + 四同步断言（先红）→ 补全 schema（先只 A/B 通用类 + sectionsOnly）→ 断言转绿。
3. `getAnalysisTechniqueContextWithOptions` + 扩 `buildFieldObject` + 小改 regenerate → "空 options 等价"回归 → preview 单技法（先 astrochart + qimen 两条代表链路）。
4. 设置抽屉 UI（先 astrochart/qimen）→ 全技法铺开 → localStorage 类（guolao/germany）→ P2 增强（ziwei 流派 / 数算流派 / horary 类别）。
5. preflight + AGENTS 回写。
