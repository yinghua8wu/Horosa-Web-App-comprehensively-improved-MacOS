# AI 导出/挂载完善 + AI 分析增强 + 分至样式按钮修复（技术说明）

> 本批为开发中改良，未 bump app 版本（停在手测）。前端全绿 jest 522/522；后端 `astrostudy` 编译通过、`astrostudyboot.jar` 重编。
> `AI_EXPORT_SETTINGS_VERSION` 22→23（仅七政四余新增 2 段的迁移版本，非 app 版本）。

## 背景
用户三项诉求：① 逐技法把「中栏/右栏已算出来显示、但导不出/设不了/挂不上」的补全（其余不动）；② AI 分析对齐成熟软件补 Tier-1 + 视觉输入 + 组合模板；③ 修「分至」页星盘样式按钮失效。

---

## 任务 3 — 分至「星盘样式」按钮失效（根因+修复）
**根因**：`pages/index.js` 给 `<JieQiChartsMain>` 传了 `dispatch` 却漏 `chartStyle`；`components/jieqi/JieQiChartsMain.js` 内 `<AstroChartMain>` 两者都没传 → `changeChartStyle()` 的 `if(this.props.dispatch)`（`AstroChartMain.js:222`）恒假，点击空转。
**修复**：`pages/index.js` 的 `<JieQiChartsMain>` 补 `chartStyle={chartStyle}`（已于 L164 解构）；`JieQiChartsMain.js` 的 `<AstroChartMain>` 补 `chartStyle={this.props.chartStyle}` + `dispatch={this.props.dispatch}`。chartStyle 为全局态（顶栏统一），与占星一致、非回归。

## 任务 1A — 七政四余导出补「政余格局 / 相位」
右栏 Moira 面板「格局/相位」已显示却从未进快照/导出。`GuoLaoChartMain.js buildGuolaoSnapshotTextV2` 末尾新增同步段：
- `[政余格局]`：复用 `buildLocalMoiraPatterns`（`styleSource=moira-dsl-local-evaluated`，本地已评估、非屏蔽态），喜/忌/察看分组；异常降级「无」。
- `[相位]`：复用 `buildAspectRows(getChart(result).aspects)`，与盘面相位表同源。
两段均**同步取值（无 async 重存）**，4-sync 自动入挂载/储存/导出。`aiExport.js` guolao 预设段补两段名 + 升 v23（guolao 已在迁移键，旧用户 union 并入）。化曜/虚实/命曜/流曜需后端 Moira 异步规则（与既有「宫位星曜」段重叠），本批未纳入。

## 任务 1B — 4 个可存事盘的占数补「AI 挂载」
`wuzhao/taixuan/jingjue/shenyishu` 早已在 `localcases.js CASE_TYPE_OPTIONS` 可存事盘 + `saveModuleAISnapshot` 存模块快照，却**此前不在挂载下拉**（可存却挂不上）。补：
- `techniqueMountSettings.js` 注册 4 个 `sectionsOnly`（缓存挂载、不重算，同 sixyao/tongshefa/mundane）。
- `aiAnalysisContext.js` 并入 `ANALYSIS_CASE_TECHNIQUES` + 补 4 个 `ANALYSIS_TECHNIQUE_LABELS`。
- 守门测试 `techniqueMountSettings.test.js SECTIONS_ONLY` 显式加这 4 个（防误标只读）。
**otherbu(随机)/fengshui/jieqi(节气盘) 暂不挂载**：不在 `CASE_TYPE_OPTIONS`（无事盘存储），强行并入会破「CASE 技法↔事盘存储」不变式（aiExport.test 守）。它们导出仍可用；挂载需先做事盘存储，列为后续。

## 任务 2 — AI 分析增强（落点见括号）
- **2C 新建接口自动拉模型**（`AIAnalysisMain.js saveProvider` 末）：仅新建档、有 key/baseUrl 时非阻塞 `fetchModelsAndEmbeddings(saved)`。
- **2D 任意用户消息可编辑重发**：抽出 `handleEditMessageAndBranch(target)`，旧「编辑上一条」改为薄委托；每条用户消息气泡操作区加「编辑」。
- **2E 组合模板（combo-preset）**：bundle 扩 `defaultTechniqueKeys/defaultChatTemperature/defaultChatTopP/defaultThinkingLevel`（store 归一化 + 编辑表单多选/数值项）；`applyBundle` 套用时设资料/系统提示/生成设置，并把技法缓存到 `pendingBundleTechniqueKeys`——**待选案例后 effect 取「该 source 支持集」交集落入挂载**（解决「先选模板、未选案例时技法被现有 effect 清空」）。
- **2B 停止序列 + 频率/存在惩罚**（「参数」Popover）：state + 发送时按接口家族注入 `chatProviderOptions`（OpenAI 兼容下发 `stop`/`frequency_penalty`/`presence_penalty`；Anthropic 停止序列映射 `stop_sequences`）。**纯前端**——后端 `buildProviderBodyOptions` 透传 providerOptions，无需改 jar。
- **2G JSON 输出模式**（「参数」Popover 开关）：OpenAI 家族注入 `response_format:{type:'json_object'}`。纯前端透传。
- **2F 多媒体（图片）输入**：对话栏工具条加「图片」按钮（隐藏 `input[type=file][accept=image/*]`）→ 读 dataURL 暂存 + 预览条（可删）→ 随用户消息以 **`images` 字段**发送（用户气泡渲染缩略图）。
  - 后端**加性改造**（零回归：纯文本无 images 字段、行为不变）：`getMessageList` 保留 `images`；新增 `imageUrlList / toOpenAIVisionMessages / anthropicImageBlock`；`buildOpenAIChatBody` 用 `toOpenAIVisionMessages`（含图→多模态 content）；`buildAnthropicBody` 加图片块 + 放开「仅图无文」不再 skip。**需重编 jar**（已重编）。Gemini/Ollama 视觉、外部重排序、用量/费用计量、RAG 结构化引用为后续。

---

## 验证
- 前端 `npm test`（umi-test）：**522/522 全绿**（含新增 SECTIONS_ONLY 守门、aiExport 跨系统自检）。坑记录：`umi-test ... | tail` 的退出码来自 `tail`、会掩盖失败——**核验测试必用 `> log; echo $?` 取真实退出码**。
- 后端 `astrostudy` 模块 `mvn clean compile` 通过；`astrostudyboot.jar` 重新 package。坑：本仓**无聚合 pom**，`mvn -pl astrostudy` 会「Could not find project in reactor」——必须 `cd 模块目录` 单独 `mvn`（astrostudy 先 `install` 到本地仓，再 astrostudyboot `package`）。
- in-app preview（umi dev :8000）热编译全程 Compiled successfully。
- 手测建议：分至切样式实时重绘；AI 挂载抽屉见 五兆/太玄/荆诀/神易数；guolao 导出见政余格局/相位；「参数」见停止序列/惩罚/JSON 并对 OpenAI 生效；新接口自动拉模型；任意用户消息可编辑；组合套用后选盘自动挂技法+资料+设置；对话栏「图片」对视觉模型可分析。
