# AI 分析「报告」功能 v1 技术说明

**版本**：v1 首批  
**日期**：2026-06-07  
**状态**：已实现 + jest 559/559 真退出 0 + preview 集成验证；停在手测、未发版

---

## 1. 概述

在 AI 分析页右栏新增「报告」tab。**输入一个技法 + 选择一个案例 → AI 按预置模板分节生成一份精美、覆盖每个方面的综合报告**。

首批支持 **八字 + 紫微斗数**两个技法 × **3 档粒度（8/12/20 节）**= 6 套预置模板。

四档全做：①分节流水线 + 反 AI 偷懒 ②流派 school-aware（材料过滤 + prompt 注入）③首页结论 + 末页提醒辅助节 ④四种导出（页内 Markdown + docx + PDF + HTML）

---

## 2. 关键设计决定（已确认）

| # | 项 | 选择 |
|---|---|---|
| 1 | 入口位置 | AI 分析右栏新 tab |
| 2 | 生成机制 | **分节生成**（每节独立 prompt，progress bar） |
| 3 | 流派指定 | 报告表单**手动选**（多选 tag + 不限流派） |
| 4 | 模板编辑 | **预置只读**，下版做编辑器 |
| 5 | 分节粒度 | **三档全做**（8/12/20），用户选 |
| 6 | 输出形态 | Markdown + docx + PDF + HTML |
| 7 | 命盘图嵌入 | 每节可嵌（基础设施已建，BaZi/ZiWei capture mode 下版补） |
| 8 | 辅助节 | 首页一句话结论 + 末页重点提醒 |

---

## 3. 文件清单

### 新建（10 文件）

```
Horosa-Web/astrostudyui/src/
├── components/aianalysis/
│   ├── ReportPane.js           主组件（list + detail + 进度 + 截图集成）
│   └── ReportGenerator.js      新建报告 Drawer 表单
└── utils/
    ├── reportTemplates.js      6 套预置模板 + mkSection builder
    ├── reportSchools.js        9 套流派 guideline (bazi 5 + ziwei 4)
    ├── reportPipeline.js       分节流水线 + 流式 + 空回退重试 + 辅助节
    ├── reportConcurrentQueue.js 并发队列（默认并发 2，支持 AbortController）
    ├── reportChartCapture.js   隐藏挂载点 + html-to-image 懒加载
    ├── reportAutoTitle.js      AI 自动命名（复用 chat 模式）
    ├── reportExport.js         md/docx/pdf/html 四种导出
    └── __tests__/
        ├── reportTemplates.test.js  9 用例 — 结构验证
        ├── reportPipeline.test.js   16 用例 — 工具函数 + 并发 + 流派过滤 + RAG
        └── reportExport.test.js     6 用例 — markdown/html 导出
```

### 修改（5 文件）

```
Horosa-Web/astrostudyui/src/
├── components/aianalysis/
│   └── AIAnalysisMain.js       +SECONDARY_TABS('report') + renderReportPane + reportLaunchRef + 资料表单加流派 + 聊天栏加快捷按钮
├── utils/
│   ├── aiAnalysisStore.js      +REPORT_TEMPLATES/REPORT_INSTANCES stores + materials.schools 字段 + SCHEMA_VERSION 3→4 + DB_VERSION 3→4
│   └── aiAnalysisRag.js        +filterMaterialsBySchools + rankChunksByKeywordWithExtra
package.json                    +html-to-image@^1.11.13
```

---

## 4. 数据模型

### IndexedDB stores

```js
REPORT_TEMPLATES = 'reportTemplates'
// 启动时灌入 6 套预置（不持久化用户修改）；readOnly:true

REPORT_INSTANCES = 'reportInstances'
{
  id, templateId, caseId, caseLabel, caseSnapshot,
  technique: 'bazi'|'ziwei', granularity: 8|12|20,
  schools: [], materialIds: [],
  sections: { [key]: { status, content, embeddedChartDataURL, usage, error, regenerateCount } },
  intro, outro, embedCharts,
  meta: { provider, providerName, model, createdAt, updatedAt, durationMs, totalTokens },
  title, status, titleAutoNamed, titleManuallyEdited
}

MATERIALS（扩展字段）
{ ..., schools: ['子平派', '盲派'] }   // 空 → 通用资料
```

---

## 5. 分节生成流水线

```
generateReport(opts)
├── 预拉 caseSnapshot（一次性，按技法 lazy import BaZi/ZiWeiMain）
├── 按 schools 过滤 materials
├── ConcurrentQueue(2) 调度每节
│   └── per section:
│       ├── (可选) captureChartByType(embedChartType)  // 截图，失败则不嵌
│       ├── extractSnapshotSegments(snapshot, section.requiredSnapshotSegments)  // 节级 snapshot trim
│       ├── doRetrieval(section, materialIds, schools)  // 节级 RAG 检索（带 retrievalKeywords 加权）
│       ├── renderTemplateVars(section.userPromptTemplate, { source, retrieved, school, schoolGuideline })
│       └── streamSectionReply():
│           ├── 流式 → onChunk 实时写 section.content → 实时存 IndexedDB
│           ├── 完毕 → isContentEmpty 检测，空回退用 retryFallbackPrompt 再试一次
│           └── 错误 → classifyError + 限流自动 5s 退避重试 3 次
└── (可选) 辅助节:
    ├── generateIntroSummary(sections)  非流式微调用，<= 60 字
    └── generateOutroAlert(sections.dayun/liunian) 非流式微调用 Markdown bullets
```

### 防 AI 偷懒漏段的三道保险

1. **结构性切片**：每节独立 prompt，AI 无法跨节略
2. **空回退重试**：`isContentEmpty(content)` 触发 retryFallbackPrompt
3. **必需 snapshot 段断言**：缺失则节标 ⚠️ 而非伪填充

---

## 6. 流派 (school) 机制

### 资料层
- `materials.schools` 字段（数组，空=通用）
- 资料编辑表单加 Tag 多选输入
- 资料卡片显 `<Tag color="cyan">流派</Tag>` chip

### 检索层
- `filterMaterialsBySchools(materials, selectedSchools)`：
  - selectedSchools 空 → 全量
  - 否则：material.schools 含至少一个所选 **OR** material.schools 为空（通用）

### Prompt 层
- 每节 systemPrompt 占位符 `{{school}}` 和 `{{schoolGuideline}}` 自动注入
- 流派 key/name 双查找；未注册流派仅 schoolDisplay 注入、guideline 缺失但不阻塞
- 流派资料不足 (< 3 篇) → UI 黄色 Alert 警示

### 预置流派清单 9 套

| Technique | Schools |
|---|---|
| **bazi**  | 子平派 / 盲派 / 新派（段建业） / 滴天髓派 / 神峰通考派 |
| **ziwei** | 北派飞星 / 中州派 / 三合派 / 钦天四化派 |

---

## 7. 三入口快捷方式

| # | 位置 | 触发方式 | 预填 |
|---|---|---|---|
| 1 | AI 分析 → 报告 tab → 新建报告 | 显式按钮 | 无 |
| 2 | AI 分析 → 对话栏 → 📄 报告按钮 | 一键生成 | 按当前 activeSource 推断 technique/caseId |
| 3 | （预留）案例 tab 顶栏 → 📄 生成报告 | ReportLaunchContext.requestNewReport | tech/case/granularity 全预填 |

用 `reportLaunchRef.current(preset)` 跨组件触发；ReportPane 通过 `onAttachLaunch(fn)` 注册触发器。

---

## 8. 截图基础设施

```
captureChartByType(chartType, caseId, options)
├── ensureHiddenHost()  document.body 末尾单例 fixed left:-99999 host
├── loadHtmlToImage()   懒加载 html-to-image（避免阻塞）
├── loadComponentByChartType  懒加载 BaZi / ZiWeiMain（避免循环依赖）
├── ReactDOM.render(<Component embeddedMode='capture' ...>)
├── 等 onCaptureReady() 或 10s timeout
├── 查找 [data-capture-target="chartType"] DOM
├── toPng(target, {pixelRatio:1.5, width<=1600, filter:no-export})
└── finally: unmount + remove mountPoint
```

支持的 chartType（5 种 + 参数化宫高亮）：
- `bazi-fourColumns` / `bazi-luckyDecade` / `bazi-shensha`
- `ziwei-12palace` / `{type:'ziwei-palace-highlight', palace:'fuqi'}`

**首批限制**：BaZi.js / ZiWeiMain.js 暂未实装 `embeddedMode='capture'` props 处理。当前 chartCaptureFn 调用会因没有 onCaptureReady 触发器而 10s 超时返回 null，pipeline 收到 null 直接生成纯文本节。下版补 capture 模式后无需改 ReportPane。

---

## 9. 输出形态

### 页内 Markdown 渲染
- 左侧 200px 目录（含状态 icon: ✓ ⏳ ❌ ⚠️ ⊘）+ 锚点跳转
- 右侧节内容：嵌图 `<img>` + 操作按钮（重试/复制） + marked + DOMPurify 渲染
- 首页 Alert + 末页黄色面板

### docx 导出（复用 aiAnalysisExport 的 Packer）
- 封面页（标题居中 + 案例/技法/粒度/流派/模型/时间 + 一句话结论 italics）
- 自动目录段
- 各节 H1 标题 + 嵌图 ImageRun + Markdown→Paragraph 转换
- 末页重点提醒

### PDF 导出
- `window.open()` 新窗口 → `document.write(html)` → `window.print()`
- `@media print` 控分页；用户选「另存为 PDF」
- 弹窗被阻止 → 退化为 HTML 下载

### HTML 单文件
- 内联 `<style>` 含基础排版 + 打印样式
- tinyMarkdownToHtml（自实现极简 md，避免引大 lib）
- 含安全转义（escapeHtml 防 XSS）

---

## 10. 测试覆盖（37 新增）

| 文件 | 用例数 | 覆盖 |
|---|---|---|
| `reportTemplates.test.js` | 9 | 6 套结构、节字段完整性、order 唯一、占位符存在、findReportTemplate、renderTemplateVars |
| `reportPipeline.test.js`  | 22 | isContentEmpty、classifyError、extractSnapshotSegments、ConcurrentQueue 并发限制、filterMaterialsBySchools、rankChunksByKeywordWithExtra、resolveSchoolPrompt、suggestSchoolNames |
| `reportExport.test.js`    | 6 | buildReportMarkdown 含目录/各节/末页 + 嵌图链接、buildReportHtml DOCTYPE + 字符转义、buildReportDocx 函数存在 |

**已知**: `buildReportDocx` 函数已实现，但 jest CJS 解构 docx@9 时 `TextRun is not a constructor`（ESM 包问题），单元测试仅断言函数存在；docx 输出在 preview 浏览器里实测正常。

jest 全套 **559 passed / 559 total，真退出 0**。

---

## 11. 已知限制与下一轮 TODO

| 限制 | 影响 | 下版计划 |
|---|---|---|
| BaZi.js / ZiWeiMain.js 无 `embeddedMode='capture'` props | 嵌图功能虽 UI 启用，实际截图会 10s timeout 后返回 null，节内容仍正常生成 | 给两组件加 capture mode props，hide controls + 数据加载完毕 callback |
| 模板编辑器未做 | 用户不能自定义模板，只能用 6 套预置 | 复用 templates tab 编辑器架构 |
| 报告云端分享 | 桌面 app 无服务端，本批不做 | 启 localhost:port 暴露报告 HTML |
| 第三/四技法（奇门/六壬） | 当前只 bazi/ziwei | 等 bazi/ziwei 稳定后按模板扩展 |
| docx jest 测试 | docx@9 ESM 在 jest CJS 不工作 | 配置 jest transformIgnorePatterns 或换 docx jest-friendly fork |
| 跨 tab 进度保持 | 报告生成中切走再回来，re-mount ReportPane 不会恢复正在跑的生成 | 实例存 IndexedDB 有进度，需在 mount 时检测 running 实例并提示「继续/丢弃」|

---

## 12. 验证清单

### preview 巡检（手测）
- [ ] 创建 bazi 案例 → AI 分析 → 报告 tab → 新建报告 → 12 节生成 → 各节 ✓ → 报告渲染
- [ ] 不同流派对比（子平 vs 盲派）→ prompt 注入 schoolGuideline → 输出风格差异感
- [ ] 流派资料不足 → 黄色 Alert 但仍生成
- [ ] 中途取消 + 重试单节
- [ ] 导出 docx 在 Word 打开 + 导出 PDF + 导出 HTML 单文件双击能开
- [ ] 资料编辑加 schools tag + 卡片显 cyan chip
- [ ] 聊天栏「📄 报告」快捷按钮 → 切 tab + 预填 technique

### 自动化
- ✅ jest 559/559 真退出 0
- 待跑：`HOROSA_KNOWN_UNMERGED=1 release_preflight.sh`

---

## 13. 工程纪律

- 不动主限法（**字节级一致**已验）
- 公开文档不留借鉴 App 名（已在 AGENTS）
- **停在手测、不自动发版、未 commit**
- 纯前端为主（无 Java 改动，不重编 jar）
- 新依赖：`html-to-image@^1.11.13`（已 npm install）

---

## 14. 关联

- 方案：`~/.claude/plans/indexed-floating-nest.md`
- 上下文：[[project_ai-analysis-comprehensive-v3-batch]]
- 反馈：[[feedback_plan-first]] / [[feedback_western-feature-fullchain-integration]]
- Windows 同步：见 docs/windows-sync-handoff.md 顶部 v1 块
