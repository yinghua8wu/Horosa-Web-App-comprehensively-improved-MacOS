# AI 分析「再审计」全面增强（Tier 1+2+3）—— 技术说明

> 本批为 AI 分析的第二轮系统增强（上一轮：导出/挂载差集 + 分至按钮 + 历史 tab）。
> 落点全部在 `Horosa-Web/astrostudyui/src/components/aianalysis/AIAnalysisMain.js` + `AIAnalysisMain.less` + `utils/aiAnalysisProviders.js` 与后端 `astrostudysrv/.../AIAnalysisProxyService.java`。
> Java jar 已重编（Jun 7）。jest 522/522 真退出 0。停在手测、未 commit。

---

## Context（为什么）

用户「再次全面检查 AI 分析相关功能看看还有何处可以改进」。三路 Explore 出 ~58 项可改清单；用户拍板 **四档全做**（聊天体验快赢 + 设置/接口体验 + 后端补齐重编 jar + Tier-3 大件 UX）。本方案按风险/依赖切阶段：纯前端先行、Java 加性改造一次重编 jar、Tier-3 投入做高 ROI 三项。

---

## 阶段 1 — 聊天体验快赢（纯前端，10 项）

1. **代码块复制 + 语言徽章** — `mdRenderer.code` 重写包 `.xq-code-block` + 左上 `.xq-code-lang` + 右上 `.xq-code-copy`；chatLog 容器级事件委托 `navigator.clipboard.writeText(code.textContent)`，hover 才显、复制成功打绿。
2. **代码块语法高亮** — `import hljs from 'highlight.js/lib/common'`（~50KB gzipped）+ `atom-one-dark` 主题；新 useEffect 对 `pre > code:not(.hljs)` 跑 `hljs.highlightElement`，流式期间也跑（textContent 不变、复制不破坏）。
3. **上滚暂停自动滚动 + 浮动「跳到最新」** — 新 state `autoFollow`；chatLog 加 `onScroll` 阈值 40px；新外壳 `.chatLogShell` + 右下浮按钮 `.scrollToLatestBtn`，仅在暂停跟随且有消息时显。
4. **推理面板流完自动折叠 + 单独「复制思考」按钮** — `<Collapse>` 改 controlled `key={item.id}-${streamStatus}`，streaming→done 时重挂载、defaultActiveKey 回 `[]`；Panel extra 加 `<Tooltip>复制思考</Tooltip>`，独立于全文复制。
5. **对话栏拖拽 + 粘贴图片** — `.composerBubble` 加 `onDragOver/onDragLeave/onDrop/onPaste`，filter `image/*` 走既有 `handlePickImages`；`.composerBubbleDragOver` 给虚线高亮。
6. **挂载状态条** — `renderContextBanner()` 紧贴 composer 上方，显示「📊 案例 · 🧮 N 技法 · 📚 M 资料 · 编辑」；未挂载时显「未挂载案例 · 选择案例」暗灰链。Landing/dock 同步。
7. **首回 AI 完整后自动命名对话** — `streamReply` 成功分支在 saveMessage 后判 `!conversation.titleAutoNamed && !titleManuallyEdited && finalContent`：取首回前 28 字清洗后写入 title + `titleAutoNamed=true`。重命名时 `titleManuallyEdited=true`。
8. **活动对话内导出** — `chatThreadHead` 右侧加 `<Dropdown>导出 ▾</Dropdown>`，复用既有 `exportConversation(conv, 'md'|'json'|'docx')`。
9. **错误 UX 升级** — 新 `classifyStreamError(raw)` 按 401/403/429/400/5xx/network 分 `{category, status, message, hint, retriable}`；不再拼进 message.content；改 `errorInfo` 字段 + 渲染 `<Alert>` + 条件「重试」按钮。
10. **空状态示例提问 chip** — `renderLandingExamples()` 按 source 类型动态出 3 个示例；点 chip 只填 prompt、不自动发。

---

## 阶段 2 — 设置/接口体验（纯前端，3 项；item 12 provider 密度列表延后）

11. **API Key 显隐 + 粘贴卫生** — Form.Item 改 `<AntdInput.Password>`（自带眼睛）；`onChange` 去末尾空白 + 前导空格；placeholder 按 providerType 动态（`sk-...`/`sk-ant-...`/`可留空`）。
12. **(延后) Provider 列表卡片密度切换 / 表格视图** — 加 `<Switch>` + 持久化态；列表模式 1 行 1 接口。改动较大单独迭代。
13. **连接 chip 错误详情 tooltip** — `connState` 扩 `error: {category, status, message, hint, raw}` + `latencyMs`；`testProfileChat` 失败分支跑 `classifyStreamError`；`renderConnChip` 包 `<Tooltip placement="bottom">` + 成功 chip 显「测试成功 · 234ms」。
14. **Provider 编辑「高级」分组** — 把 6 个扁平字段拆 3 个 `<Collapse.Panel forceRender>`：「模型清单 / 请求调优」「鉴权定制」「请求体覆盖」；不动字段语义、纯排版减负。

---

## 阶段 3 — 后端补齐（**需重编 jar**，4 项）

> 入口 `AIAnalysisProxyService.java`。改完 `cd astrostudy && mvn install -DskipTests`；`cd ../astrostudyboot && mvn package -DskipTests`。

15. **2A 用量 / 费用计量** —
    - `buildOpenAIChatBody`：stream 时加 `stream_options:{include_usage:true}`。
    - 各家 stream 解析器（OpenAI/Anthropic/Gemini/Ollama）新增 `extractXxxUsage(payload)` 抽 `{input_tokens, output_tokens, total_tokens}`，统一 `channel.event("usage", usage)` SSE 下发。
    - Anthropic 抽 `message_start.message.usage`（输入）+ `message_delta.usage`（输出累加）。
    - Gemini 抽 `usageMetadata.{promptTokenCount, candidatesTokenCount, totalTokenCount}`。
    - Ollama 抽末帧 `prompt_eval_count + eval_count`。
    - 前端 `streamUsageRef` 缓存 → 保入 message.usage；`utils/aiAnalysisProviders.js` 新增 `MODEL_PRICING` 表 + `estimateUsageCost(model, in, out)`；消息底加 `↑ N ↓ M · $X` Tooltip。

16. **2B Gemini 视觉 + 多模态消息体** — `buildGeminiBody` 重写：从 `messages[i].images` 抽 `data:image/...;base64,XYZ` → `{inlineData:{mimeType, data}}`；http(s) → `{fileData:{mimeType, fileUri}}`。无图消息原 parts 不变。

17. **JSON 模式 / 停止序列 / 思考档显式映射** —
    - **Anthropic body**：抽 `providerOptions.stop` + `stop_sequences` → 合并到 body.stop_sequences；抽 `providerOptions.thinking` → body.thinking；drop frequency_penalty/presence_penalty/response_format（不支持）。
    - **Gemini body**：组 `generationConfig: { temperature, topP, topK, maxOutputTokens, stopSequences, responseMimeType, thinkingConfig }`。从 `providerOptions.stop` 映射 stopSequences；`response_format.type === 'json_object'` → `responseMimeType:'application/json'`；`thinkingConfig` 透传。drop penalties。
    - **Ollama 原生 body**：`opts.stop` 映射；`images` 抽出 base64 给 `message.images` 数组（llava 等视觉模型）；drop response_format/penalties/thinking。

18. **`isReasoningModel` 前后端同步 + 未来模型规则** — 前端正则 `/(^|\/)(gpt-?[567]|o[13-7])/` 覆盖 gpt-5/6/7 + o1/3/4/5/6/7；后端 `isOpenAIReasoningModel` 加 gpt-7/o6/o7。

---

## 阶段 4 — 大件 UX 投入（已做 3 项；20/22/23 延后）

21. **资料 grid → 表格 list 视图切换** — 新 state `materialView`（持久化）；toolbar 加 `<Select>卡片/列表</Select>`；list 模式渲 `<Table>`（名称 ellipsis / 类型 / 文件夹 / 标签 / 时间 / 操作）；列宽显式、`tableLayout:'fixed'`、操作收成 Dropdown「导出 ▾」。
24. **组合包应用预览 Modal** — 卡片新增「预览」按钮；新 state `bundlePreview` 控制 Modal；展示「系统提示 / 默认模型 / 温度 / top_p / 思考档 / 检索策略 / 挂载资料 N / 挂载技法 M（按当前 source 取交集，跳过不适用的）」。
25. **Markdown LaTeX** — `import katex from 'katex'` + `katex/dist/katex.min.css`；`renderMarkdownToHtml` 前先 `preRenderLatex` 替换 `$$...$$`/`\[...\]`/`\(...\)`/`$...$` 为占位符再 marked → 还原。DOMPurify ADD_TAGS 放过 KaTeX 输出 MathML/HTML。

### 四轮 — AI 自动起名升级为「真 AI 生成短标题」

**之前的实现**：流式结束后取 AI 回复前 28 字 + activeSource 标题前缀拼接 → 历史里满屏「好的，我们来分析一下您当前的姿势」「抱歉，我目前依据的参考资料内容有限」等截 AI 开头的废话。
**用户反馈**：「AI自动给对话起名完善了吗？」—— 不完善。

**成熟修法**：在 streamReply 流式结束后异步触发一个**独立的非流式微调用** `generateAndApplyAutoTitle({conversation, profile, model, userPrompt, aiReply})`：
- System prompt：「你是对话标题生成器。根据用户问题和 AI 第一次回复，给出一个 6-14 个汉字的简短中文对话标题。仅返回标题文本本身，不要加引号、标点结尾、序号、表情、或任何前后缀。」
- User content：用户问题 600 字截断 + AI 回复前 400 字 + 「请生成标题：」
- 用 `requestTimeoutMs: 15000` 超时。
- 返回的标题做清洗（去引号/Markdown/标题:/末尾标点），长度 4-30 字才接受。
- 失败/超时/无 Provider → 退化到「截首回前 16 字」兜底。
- 不阻塞 streamReply 主流程（不 await），完成后再 `updateConversationMeta`。
- `titleAutoNamed` 置 true 防再触发；`titleManuallyEdited`（手动重命名时设）一旦为 true 永不再触发。
- `isMountedRef` 守门防 unmount 后 setState 警告。

**preview 实测**：发送「请用简短一句话回答：太阳代表什么星座的守护？」→ AI 回复后 ~5s 标题变成 **「太阳与狮子座守护关系」**（10 字、精准、专业）。对比之前同样的 deepseek-v4-pro 生成的旧条目：「好的，我们来分析一下您当前的姿势」「抱歉，我目前依据的参考资料内容有限」「您好，我是星阙的 AI 分析助手」—— 全是截断废话。新机制肉眼可见好于旧实现。

### 三轮严重 bug 修复 — 历史 tab 数据行被「拉伸+居中」

**现象**：历史 tab 单行数据被推到 body 中央，上方一大片空白（截图清晰可见）。
**根因**：上一轮为「空状态居中」加了三条强力 CSS 互相打架——
1. `.historyTable .ant-table-body > table { height: 100% }` 把内层 `<table>` 拉到 body 高
2. `.ant-table-placeholder { height: 100% }` 把占位 tr 拉到 100% 高
3. `.ant-table-tbody td { vertical-align: middle }` 让 td 内容垂直居中
当**有 1 行数据**时，规则 1+3 让单行被垂直居中在拉伸后的 100% 高 table 里——视觉上就是「行卡在中间」。

**成熟修法（detection-based）**：
1. **外层条件渲染独立空态**：`filteredConversations.length === 0 ? <Empty centered/> : <Table/>`——与 materials pane 同范式。Table 自己只管有数据时的渲染，不再让它兼顾空状态居中。
2. **去掉 inner-table 高度 hack**：`.ant-table-body > table { height: 100% }` 删；占位 tr 也不再强制 100% 高。
3. **数据行 vertical-align: top**：单/多行数据都从顶部排列，符合表格常识。
4. **空态 wrapper**：`.historyEmpty { flex:1; display:flex; align-items:center; justify-content:center }` 与 `<Empty/>` 一起在 wrap 内垂直居中。

**验证**：preview 实测——有数据时行紧贴 thead 下方左对齐 ✓；无数据时 `<Empty>` 居中 ✓。jest 522/522 全绿。

### 二轮严重 bug 修复 — Dropdown overlay 内存泄漏 + 4 个真 bug + AI 示例改成动态生成

**真实抓到的 bug（控制台 + 引擎复审）**：

1. **Dropdown `overlay={JSX}` 内存泄漏**：6 处使用 antd 已废弃的 `overlay` prop（控制台连续刷「Can't perform a React state update on an unmounted component」），切 tab 时 Menu 内部 Overflow 在 unmount 后还 setState。**修法**：全部 6 处改成 `menu={{ items, onClick }}` API（chatThread 导出/history 导出/material 移动/material 导出/grid 移动到）。**复测**：连续切 tab + 打开/关闭 dropdown，warning 计数稳定 0 新增 ✓。
2. **`ingestFiles` 末段 unmount 后 setState**：长批次中途 unmount 后 for-await 循环继续 `setMaterialIngestQueue` → 重复内存泄漏 warning。**修法**：加 `isMountedRef`+`safeSetQ` wrapper，每个 await 后 `if(!isMountedRef.current) break`。Modal `m.destroy()` 加 try/catch 防 double-destroy。
3. **`renderTemplateVersionDiff` null deref**：`allVs.find(...).versionNumber` 在版本被删后 crash。**修法**：fallback 到 `allVs[1]/allVs[0]`，再加 `(left && left.versionNumber) || '?'`，外层加「模板已不存在」「版本不足两个」Empty 兜底。
4. **`handlePickImages` 无 onerror + 无大小限制**：FileReader 失败静默；超大图（base64 ~33% 膨胀）写 IndexedDB 卡死。**修法**：加 `reader.onerror`/`onabort`、外层 try/catch；硬上限 **10MB/张**，超限给 warning。
5. **`renderMaterialsPane` 用函数静态属性做 dragCounter**（`renderMaterialsPane.__dc`）→ 热重载/多实例下乱串。**修法**：改 `materialDragCounterRef = React.useRef(0)`。

**ALL src/ 全扫**：`grep -rn "window\.\(prompt\|confirm\|alert\)("` = 0 残留；`overlay={` Dropdown = 0 残留。

**AI 示例提问改成动态生成**：landing 页 3 个示例提问不再写死——`useEffect` 监听 `(sourceId, modelSelection, messages.length, activeProviderProfile)` 变化，命中 `(sourceKey + provider + model)` 缓存键则跳过；否则用一个最便宜的非流式 `requestAIAnalysisChat` 调当前 Provider，system prompt 强制返回 3 条 JSON 数组的 8-18 字简短提问。`requestTimeoutMs: 20000` 上限。失败/缺 Provider 静默回退到静态示例。UI 显示「AI 生成示例中…」/「· AI 根据案例生成」hint。

### 一轮严重 bug 修复 — `window.prompt() is not supported`

**根因**：Tauri 桌面壳（与某些严格的浏览器模式）**不支持** `window.prompt/confirm/alert`。我之前用了 7 处会直接抛 `Unhandled Rejection (Error): prompt() is not supported`，让整个应用崩。

**修法**：新增两个异步 Helper，全部 7 处替换：
- `asyncInput({ title, defaultValue, placeholder, multiline, maxLength })` → 用 `AntdModal.confirm` 内嵌 `Input`/`Input.TextArea`，回车快捷确认；返回 `Promise<string|null>`。
- `asyncConfirm({ title, content, okText, cancelText, danger })` → `AntdModal.confirm` 包装；返回 `Promise<boolean>`。
- 资料 ingest 重复处理因要 4 个按钮（覆盖/跳过/全部覆盖/全部跳过）单独用自定义 `AntdModal.confirm` + `footer` 渲染。

**全局扫描**：`grep -rn "window\.\(prompt\|confirm\|alert\)("` 整 `src/` 后 0 命中（除 4 处注释）。AIAnalysisMain.js 是唯一文件，其余模块原本就没有用过。

### 余下 5 项（同批补做）

⑫ **Provider 列表密度切换** — 设置 pane 顶栏新增 `<Select>卡片视图/紧凑列表</Select>`，state `providerListDense` 持久化；列表模式渲 `<Table>`（配置名 / 类型 / Base URL / 模型数 / 状态 / 操作）紧凑 padding。

⑳ **资料 folder 管理 Drawer** — 新「管理文件夹」按钮 → Drawer：输入框+新建/枚举每个 folder（名称 + 内含资料数 + 重命名/删除）。删除 folder 时把内含资料自动移到「未分类」。资料卡片+列表各增「移动到 ▾」Dropdown（未分类 + 全部 folder 列表）。

㉒ **模板变量推断侧栏 + JSON Schema 实时校验** — 模板编辑 Modal 改成 1fr/240px grid：右侧 `.templateVarSidebar` 实时扫 `\{\{var\}\}`，列出 5 个已知变量 + 高亮「未知变量」⚠；JSON 格式时额外做 `JSON.parse` 即时校验、显示 ✓/❌。

㉓ **模板版本 diff** — 已有 `templateVersions` store；模板卡片新增「版本对比」按钮（仅当 ≥2 个版本可用）→ Modal 显左右选版本切换 + 增/删/同 计数 + LCS-based line-level diff（snapshot 序列化为 JSON 后比对，max 1500 行截断）。

**资料拖拽彻底改进**（按你反馈补做）—
- 旧 Dragger 只接收小卡片区域 → 现 **全 pane 拖拽**：`paneShell` 加 dragCounter + onDragEnter/Over/Leave/Drop，全屏覆盖虚线浮层「放下即上传」。
- 旧 `window.prompt` 在每个重复文件阻塞 → 新 `ingestFiles(fileList)` 非阻塞批量队列：每文件状态 `parsing→importing→done/skip/error` 渲染为 Tag 进度条，重复文件由 `confirm` 一次决策（不再 prompt 反复弹）。
- 仍兼容点击「选文件上传」按钮（antd `<Upload>` `beforeUpload` 一次接收整批转给 ingestFiles）。

---

## 跨阶段工程注意

- **重编 jar**：阶段 3 全部触发。运行 `start_horosa_local.sh` 重新拉起 Java :9999 即可生效（已现场重启）。
- **回归基线**：jest **522/522 真退出 0**（用 `> log; echo $?` 避免 `|tail` 退出码假象的老坑）。
- **依赖新增**：`highlight.js@11.9.0`（~50KB gz common 子集）+ `katex@0.16.10`（~120KB gz）。
- **纪律**：`HOROSA_KNOWN_UNMERGED=1 release_preflight.sh` 全绿；公开文档不留借鉴 App 名；主限法字节级不动；本批改完**停在手测、未发**；提交按你拍板。

---

## 验证

1. **In-app preview（:8000）已实测**：landing 出示例 chip + 状态条 + 新 placeholder；资料 tab 出「卡片视图/列表视图」选择器；compile 全程 green。
2. **测试**：jest **522/522** 全绿真退出 0；Java install + package exit 0；jar mtime Jun 7 02:06。
3. **后端**：dev backend 已用新 jar 重启在 :9999；SSE `usage` 事件 / Gemini 视觉 / stop_sequences / JSON 模式 / 思考档显式映射均落地（需真 API key 端到端验证）。

---

## 改了哪些文件

```
M  Horosa-Web/astrostudyui/src/components/aianalysis/AIAnalysisMain.js     # 主入口（10+ items 的 JSX/handler 改）
M  Horosa-Web/astrostudyui/src/components/aianalysis/AIAnalysisMain.less   # 新 .xq-code-block / .scrollToLatestBtn / .contextBanner / .landingExampleChip 等
M  Horosa-Web/astrostudyui/src/utils/aiAnalysisProviders.js                # MODEL_PRICING + estimateUsageCost + reasoning 正则扩
M  Horosa-Web/astrostudyui/package.json                                    # highlight.js + katex 依赖
M  Horosa-Web/astrostudysrv/astrostudy/.../AIAnalysisProxyService.java     # usage 抽取 + Gemini 视觉 + 显式 stop/JSON/思考 映射 + isReasoningModel 同步
```
