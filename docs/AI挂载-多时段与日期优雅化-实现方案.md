# AI 挂载·多时段输出 + 日期优雅化 + 主限法盘表格拆分 —— 实现方案（已拍板）

> 用户拍板：① 多运限=**大限/流年/流月全多选 + 流日/流时锚定到所选单一上层 + 总输出上限(~50段)+超限提示**；② 西占推运=**picker(默认显示当前时刻) + 时间段区间扫描(builder 加 from-to 循环)**。
> 全程守铁律：**默认即现状**——多选 default `[]`、datetime default `''`、range 起止 default `''`/空 → `pruneOptionsToNonDefault` 后为空 → 不追加任何段 → 快照逐字节不变。未发 GitHub。

---

## 关键扫描事实（实现照此，省去重复调研）

### 紫微（ziwei）—— 纯接线，零新算法
- `ZWLuckPanel.js` 导出 `buildDaxianItems(chart)`(整层全部大限) / `buildLiunianItems(chart, daxian)`(该限全部10流年) / `buildLiuyueItems(chart, year)`(**只需公历 year 数字**→全部12流月) / `buildLiuriItems(chart, year, liuyue)`(该月全部日) / `buildLiushiItems(chart, liuri)`(全部12时辰)。**已是整层枚举。**
- 嵌套：流月只需 year(解耦)；流日需 liuyue 对象；流时需 liuri 对象。单项形状含 `{id,level,mingIndex,ganzi,gan,zhi,top,sub}`。
- 现状 `ZiWeiMain.js:144 buildZiweiPeriodLines(chart, period)` = **单链钻取一条**（period 单值 level+各 index，缺则取该层[0]）。每层文本 `formatLuckLayerLines(chart, layer, levelLabel, subText)`（四化落宫+流曜）。
- **改造**：period 改多选集合 `{daxian:[mingIndex...], liunian:[year...], liuyue:[month...], liuri:[day...], liushi:[hourIdx...]}`；循环既有 build*Items 产多段。流年×流月笛卡尔；流日/流时锚定到所选的第一个上层(year,month)/(year,month,day)；总段数上限~50，超限截断+追加提示行。

### 八字（bazi）
- 链路：`buildChartBaziParams(record)`→`buildBaziSnapshotForParams`(`BaZi.js:203`)→`buildLocalBaziResult`(`baziLunarLocal.js`，纯前端 lunar-javascript)。
- 流年✅已输出(`direction[].subDirect[]`，`buildBaziSnapshotText` `[流年行运概略]` 段 `BaZi.js:172-198`)。
- **流月✅数据已算好未输出**：`subDirect[].flowMonths[]`(`buildFlowMonths` `baziLunarLocal.js:574`，按节气真实交接，每项含 ganzi/term/date+完整 pillar)。接线进快照即可。
- **流日/流时需各新增 ~15-20 行**：lunar-javascript 原生 `Solar.fromYmdHms(...).getLunar().getDayInGanZhi()` / `.getTimeInGanZhi()`（实测可用）；算十神纳音空亡复用本文件 `pillarFromGanzi(label,ganzi,dayGan)`(`:426`)。无新库无后端。

### 日期 picker
- `XQDatePicker`(`xq-ui/index.js:204`，封装 antd4.24 DatePicker + moment2.30 + zhCN + 暗色 class)已存在；`.RangePicker`(:214)。范例 `UranianDialMain.js:428`(单点 showTime)、`LogQryList.js:233`(RangePicker+预设区间 今天/本月/今年)。
- 抽屉接入点：`AIAnalysisMain.js:3056 renderTechniqueSettingField`（现 text/number 走 `<Input>` :3090）；import 块 `:29-42` 补 `XQDatePicker`。draft 读写仍 `updateTechniqueDraftField(name, value)`。
- **默认 now 不破 prune**：schema default **恒 `''`**；picker `value = draftStr ? moment(draftStr,'YYYY-MM-DD HH:mm') : moment()`(空→显示now)；onChange 写 `format('YYYY-MM-DD HH:mm')` 串。"now" 真实兜底已由 builder 运行时算(`aiAnalysisContext.js:1106 datetime: optDatetime || datetimeStr`)。守 `techniqueMountSettings.test.js:85` prune-empty。

### 主限法 盘 vs 表格（现状混了）
- `primarydirect`=**表格**：列未来 pdYears 年全部 direction 行（`AstroPrimaryDirection.js`，无 datetime；pdYears 经 `buildFieldObject:328`/`fieldParams:381` 透传 /chart 决定 predictives 覆盖年数）。
- `primarydirchart`=**盘**：选**一准确时刻** datetime(`AstroPrimaryDirectionChart.js:952 PlusMinusTime`)→POST `/predict/pdchart`→套盘。请求 `:787 buildRequestParams` 发 datetime+direction，**无 pdYears**。
- **Bug**：schema `:464-465` 两 key 共用 `PRIMARY_DIRECT_FIELDS`(都有 pdYears、都无 datetime)；regen `aiAnalysisContext.js:1246` 两 key fallthrough 到**同一表格 builder** `buildPrimaryDirectSnapshotText`(`AstroDirectMain.js:228`)→盘喂给 LLM 的其实是表格、datetime 没接。盘组件本地 `AstroPrimaryDirectionChart.js:310 buildSnapshotText` 才是真盘快照(`[主限法盘设置]` 含时间选择)。
- **拆分**：
  - 盘 `primarydirchart` 字段集 = `datetime`(picker,default '') + `pdMethod` + `pdTimeKey` + `direction`(direct默认/converse)，**去 pdYears**。
  - 表格 `primarydirect` 字段集 = 现 `PRIMARY_DIRECT_FIELDS` 全套(含 pdYears)，**去 datetime**。
  - regen 拆 `case 'primarydirchart'` 单独走：把 `record.datetime` 接入、产真盘快照（搬 `AstroPrimaryDirectionChart.js:310` 逻辑或 fetch `/predict/pdchart`）。
  - 测试：`techniqueMountSettings.test.js` 保留 primarydirect 有 pdYears；加 primarydirchart 有 datetime/无 pdYears。

---

## 实施阶段（串行；共享 techniqueMountSettings.js / aiAnalysisContext.js / AIAnalysisMain.js）

### P1 UI 原语 + 管线（基础，先做）
- `AIAnalysisMain.js renderTechniqueSettingField` 加分支：`datetime`(XQDatePicker showTime,空显 now)/`date`(DatePicker)/`time`(TimePicker)/`multiselect`(Select mode=multiple,value=draft数组)/`numrange`(起-止两 number 或 RangePicker)。import XQDatePicker。
- `techniqueMountSettings.js`：`pruneOptionsToNonDefault` 对数组型 field 先 normalize(排序)再 `${v}` 比较（防顺序漂移误判；空数组===''）；`mergeOptionsIntoRecord` 已透传数组(浅拷贝)✓。
- `aiAnalysisContext.js`：加 `pickFiniteNumberArray`（解析 record.* 的数组）。
- 守 `getTechniqueSettingsDefaults` 对数组默认返回新数组副本（防共享引用被改）。

### P2 紫微多运限
- schema ziwei：移除单值 periodLevel+5 number（或保留 periodLevel 当"最深开关"）；改为 `daxianSel`(multiselect 动态选项)/`liunianSel`(multiselect 或 numrange 年份)/`liuyueSel`(multiselect 1-12 或 numrange)/`liuriSel`(numrange 锚定)/`liushiSel`(multiselect 0-11)，全 default `[]`。
- `buildChartZiweiPeriodFromRecord`(aiAnalysisContext) 产多选 period；`buildZiweiPeriodLines`(ZiWeiMain) 改多段循环(笛卡尔+锚定+上限~50+超限提示)。

### P3 八字多运限
- schema bazi 加 `liunianSel`(年份多选/范围)/`liuyueSel`(1-12)/`liuriSel`(锚定范围)/`liushiSel`(0-11)，default `[]`。
- `baziLunarLocal.js` 新增 `buildFlowDays(year,month,dayGan,...)` + `buildFlowHours(year,month,day,dayGan,...)`(复用 getDayInGanZhi/getTimeInGanZhi + pillarFromGanzi)。
- `buildBaziSnapshotText` 加多时段段（流月读 flowMonths、流日/流时调新函数）；`buildChartBaziPeriodFromRecord`(新,对称 ziwei)。

### P4 推运 datetime picker + 区间扫描
- schema：`datetime`(5法)/`targetDatetime`(planetaryarc)/`targetDate`+`targetTime`(vedic/jaynes) field 标 `type:'datetime'`/`date'`/`time'`(UI 渲染 picker)，default 仍 `''`。
- **区间扫描**：每个 datetime 技法加可选 `datetimeEnd`(picker，default '')+步进`scanStep`(select 年/月/日,default '')；builder（`buildPredictivePeriodSnapshot`/planetaryarc/vedic/jaynes）当 end 非空时**循环 from→to 按 step 产多段**（每段一个推运时点），默认(end空)=单点=现状。设段数上限。
- UI：datetime 用单 picker；区间可用 `XQDatePicker.RangePicker` 一次给 from+to。

### P5 主限法盘/表格拆分
- 见上"拆分"。新增 `PRIMARY_DIRECT_TABLE_FIELDS`(=现含 pdYears) + `PRIMARY_DIRECT_CHART_FIELDS`(datetime+pdMethod+pdTimeKey+direction)；schema 两 key 各用各的。
- regen 拆 case；盘接 datetime 出真盘快照。

### P6 测试+验证
- jest：数组 round-trip(默认[]→prune空、顺序无关)、多时段输出(紫微/八字 选多个→多段、上限生效)、picker 默认 now(空→moment now 显示但 draft 仍空)、主限法盘有datetime无pdYears/表格反之、八字 buildFlowDays/Hours 干支正确。
- `npm run build:file` + `npx umi-test` 全绿；preview 抽检多运限/picker/主限法。

---

## 追加：六爻挂载两项（用户拍板）

### 六爻-1 「一键挂载全部式法」默认包含六爻 + 六爻可时间起卦
- 用户拍板：**六爻挂载 = 有存过的卦(payload.gua)就用存的；没有就默认「时间起卦」代起**（时间起卦是六爻确定性合法起法、非伪造摇卦，**护栏可放开**）。
- 现状：`TIME_CASTABLE_DIVINATION`(`aiAnalysisContext.js:230`)不含 sixyao；`TIMEPOINT_CASTABLE_SET`(:234)含 sixyao（起课时间源已提供六爻时间起卦，:808 已实现"已存读 payload.gua、否则时间起卦"）；但**已存事盘缺 gua 时的即时补算(:2422)用 TIME_CASTABLE_SET、不含 sixyao→不补六爻**。一键按钮(`AIAnalysisMain.js:3347`)用静态 `TIME_CASTABLE_DIVINATION.filter(k!=='qimen')`→既无六爻也是静态。
- 改法：① 一键按钮改用**该源实际可挂清单**（起课时间源含六爻）`− qimen`，或在静态集 `+ sixyao − qimen`；② 让"已存事盘缺 gua"也能时间起卦补六爻（放开 :2422 对 sixyao 的护栏，复用 :808 的"无 gua→buildTimeGua"逻辑）；③ **同步放开 preflight `[24]` 那条"🔒铁律破:六爻进了 TIME_CASTABLE_DIVINATION"**（用户拍板时间起卦合法——改成"六爻仅限时间起卦补算、已存优先 payload.gua"的新口径哨兵，别简单删）。**保"已存 gua 优先、不被时间重算覆盖"。**

### 六爻-2 六爻快照输出 本卦/之卦/互卦 每根爻全装卦 + 四同步
- 现状：`GuaZhanMain.js nText` 对**之卦/互卦只调 `guaText`(卦名摘要)**；本卦有逐爻(yao 数组 name=纳甲六亲、god=六兽、世应)。
- 改法：本卦/之卦/互卦三卦**都输出每根爻的 地支/五行/六亲/世应/六兽**。复用 UI 已有的装卦逻辑（截图证明 UI 给之卦/互卦都装了卦——先定位该装卦函数/组件，**复用不重造**）；之卦=动爻变后之卦、互卦=2345爻互体，各自装卦(纳甲/六亲按卦宫/世应)。
- **四同步**：① `GuaZhanMain.nText` 输出（挂载+储存共用）；② `aiExport.js AI_EXPORT_PRESET_SECTIONS.sixyao`(:73/:347 段 '六爻与动爻')确保段名匹配、过滤(:752/:980)不漏；③ AI导出/导出设置同源。新增/改段头必两处对齐。

> 这两项与多时段是不同文件主体(GuaZhanMain/aiExport/装卦组件 + 少量 aiAnalysisContext/AIAnalysisMain)，**待多时段第1遍自检 agent(只读)结束后实现**（避免与其读 aiAnalysisContext 撞），用专精 agent(需懂装卦)。

## 风险与守则
- **默认即现状**是第一铁律：每个新字段默认空→prune 空→输出不变。每阶段后必跑 prune-empty 全 schema 断言。
- 数组 prune 顺序敏感→normalize 排序。
- 多时段总量上限防快照爆。
- picker 的 now 只在显示层，schema 默认恒空。
- 循环导入坑：UI/builder 常量别从大组件 import（沿用本会话内联/纯 util 规矩）。
- 主限法拆分**勿动现有 Alchabitius+Ptolemy 计算**（只改挂载 schema/regen 分派与盘快照接线）。
