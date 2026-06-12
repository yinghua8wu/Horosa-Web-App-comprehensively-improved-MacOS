# Windows 同步交接（给 Windows 端 Claude Code）

> 读者：在 **Windows 仓库**里干活的 Claude Code / 开发者。
> 作用：这是一份**逐版本的同步台账**——每次 macOS 端发布后，这里记录「改了什么、为什么、Windows 必须做什么才能跟上」。
> 与其它文档分工：本文是「改了啥 + 怎么跟」；通用移植/发布规范看
> [`windows-porting-and-release-checklist.md`](windows-porting-and-release-checklist.md)；每个修复的机制细节看对应的 fix 文档（下面每条都给了链接）。
> **倒序排列，最新版本在最上面。**

---

## 待发布 · 运行提速大批 + 六项界面/AI 修复（流畅度 + 退出/启动 + AI 预设连接）

> **Windows 必做两件：①拉前端源码并跑 jest；②重编 Java jar（AI 代理外呼层重写）。**
> 另有「壳层原则性移植」一节——Windows 壳层代码独立实现，按原则逐条对照落地。

### A. 纯前端（拉源码即同步，重点回归面已配 jest）
- **技法 chunk 懒加载 + 空闲预取**：`.umirc.js` 开 `dynamicImport`；`src/pages/index.js` 首帧后 2s 起空闲队列逐个预载全部技法模块。效果：首包大幅瘦身、启动显著加快、预载完成后切任何技法零等待。Windows 构建链同为 umi，照拉即生效；注意打包产物 chunk 相对路径在桌面壳内可加载（Mac 侧已实测，Windows 请在壳内实测一次）。
- **localStorage 大快照延迟落盘**：新文件 `src/utils/deferredStorage.js`（requestIdleCallback 合并写,beforeunload 强刷）。
- **AI 快照文本构建惰性化**：`moduleAiSnapshot.js`/`astroAiSnapshot.js` 新增 Lazy 入口（构建挪到空闲或首次读取时,读取强制物化保内容逐字一致）,约 40 个技法调用点已切换。新增 jest：`moduleAiSnapshotLazy/astroAiSnapshotLazy` 等价性测试。
- **紫微 rules 会话缓存 + 并行**：`services/rules.js` `ziweirulesCached`；`ZiWeiMain.requestZiWei` birth/rules 并行。
- **图面重绘签名守卫**：`AstroChart.js`/`ZiWeiChart.js` 同输入跳过整树 d3 重建（开关 drawer/点 tooltip 不再触发重绘）。
- **doHook rAF 化**：`models/astro.js` 排盘后技法面板下一帧刷新,主盘先上屏。
- 以上四类优化各有独立 kill-switch（`src/utils/perfFlags.js`,localStorage `horosa.perf.*` 设 '0' 即回旧行为）。
- **六壬方盘下端溢出修复**：`lrzhan/RengChart.js`（按中间栏最下端钳高+盘面/课传按可用高收纳,低于 360px 才回落滚动）、`lrzhan/LiuRengChart.js`（resize 读 host 真实高+ResizeObserver+隐藏页 rAF 挂起降级）。圆盘路径零改动。
- **太乙缩放顶部遮挡修复**：`taiyi/TaiYiMain.js` 页高改 `'100%'`+`minHeight:0`（对齐遁甲同款）+ 盘面可视盒实测兜底（ResizeObserver+观察目标重绑+window resize 直连）。
- **主限法四项**：分页「X 条/页」受控+持久化（此前选完被重置）;表底空白预留收准;「主/界限法」文案统一为「主限法」（**AI 导出分节匹配表已做新旧名兼容**,`aiExport.js` 同步拉取即可）;表格列筛选弹窗补主题变量覆盖（`app.less` `.ant-table-filter-dropdown` 段,暗色白边修复）。
- 启停脚本：`stop_horosa_local.sh`/`start_horosa_local.sh` 是 Mac 专用（Windows 不消费）,但其中的修法原则见 C 节。

### B. Java 必重编 jar（即 Windows repo「Kimi 测试连接失败 400」issue 的修法）
`AIAnalysisProxyService.java`（+Test,25 测）三层修复：
1. **根因一（主因）**：kimi-k2 系模型仅允许 temperature=1,代理无条件发 0.7 → 上游 400。修=kimi-k2* 纳入推理模型口径（`isReasoningModel`）,剥离 temperature/top_p 等采样参数,用模型默认值。`moonshot-v1-*` 不受影响。
2. **根因二**：预设默认模型停服——`kimi-k2-turbo-preview` 已于 2026-05-25 停服 → 前端预设改 `kimi-k2.6`/`kimi-k2.5`（`aiAnalysisProviders.js`）；gemini 嵌入默认 `text-embedding-004` 已关停 → `gemini-embedding-001`。
3. **错误可读化**：AI 代理全部非流式外呼（模型列表 GET/对话/嵌入）从框架 HTTP 工具迁到 JDK HttpClient——请求头完全自控（GET 不再发 Content-Type、无框架内部头注入）,非 2xx 时提取上游 `error.message` 前置展示（流式路径同口径）。用户看到「上游服务返回 HTTP 400：invalid temperature: …」而非不可读 dump。
   ⚠️ Windows 同步此文件后务必 `mvn clean install`（astrostudy 模块）再 package boot,否则 boot 会从本地仓库取旧 artifact（Mac 侧踩过）。

### C. 壳层原则性移植（Windows 壳层自行实现,对照逐条）
Mac 壳层本批修了「退出 not responding」与「非首次启动偶发卡进度」两类问题,根因与原则对 Windows 同样适用：
1. **退出回调禁同步子进程**：关闭/退出事件处理器里同步等待子进程清理 = 主事件循环停摆 = 系统标记无响应。清理一律 detached 启动+原子去重（多次退出回调只跑一次）,可靠性由清理脚本自含界+下次启动残留回收兜底。
2. **端口检查禁全进程扫描类工具**：按端口查监听进程时,凡需遍历全系统进程句柄的工具（Mac 的 lsof 同类）遇到卡死进程会 stall 数十秒——尤其禁止用在就绪轮询循环里。Windows 用 `Get-NetTCPConnection`/`netstat -ano`（读内核连接表,毫秒级）。
3. **启动关键路径禁无条件 O(全树) IO**：对 runtime 树的递归遍历/清理只许在安装/解压/健康缓存失效时跑,可信快路径必须跳过;就绪后后台补扫保持不变量。
4. **进度条永不静止**：任何 >0.5s 的同步段之前先切不确定态进度+说明文案;长等待期每秒刷新「已等待 N 秒」。进度静止会被用户当卡死强退,造成残留进程连锁。
5. **停止脚本提速**：进程终止等待用 0.1s 轮询（提前退出立即返回）替代固定整秒 sleep;多服务并行收割。

### 行为变化提示（同步后请验）
退出应即时（窗口立即消失,后台 1~2s 内进程清零）;首启后的后续启动明显加快且进度不冻结;技法内改设置/拖时间明显更顺;Kimi/Gemini 预设「测试连接」正常（Mac 侧已用真实 key 实测「测试成功」）;暗色 UI 主限法筛选弹窗无白边。jest 全量须绿（Mac 侧 713）。

---

## 待发布 · 算法/设置/渲染三类扫雷批次（排盘计算修正 + 设置生效链 + 图面渲染）

> **Windows 必做一件：同步 Python 排盘引擎 8 个文件 + 重启本地 Python 服务并清 ParamHashCache**（本批 Java 未动、无需重编 jar）。其余全部纯前端，拉前端即同步。

### 必须同步（Python 排盘引擎，8 个文件）
- `astropy/astrostudy/helper.py` —— 经纬度「度分」串解析改标准 `deg+min/60`（原 `deg+1.0/min` + else 分支 `*10` 均错，'116e24'→116.04 而非 116.4）；`distance`/`absDistance` 改全角度域正确的短弧/顺行弧单式；`splitDegree` 60′ 进位；`convertLat/LonToStr` 恰好 10 分时补零 off-by-one。
- `astropy/astrostudy/jieqi/realsuntime.py` —— 均时差表 3 区转录修正（2/24；4/10–13 负零时符号；12/25）+ `getBaseLonByZone` 解析「±HH:MM」分钟段（印度 +05:30 此前被当 +05:00，真太阳时差半小时）。
- `astropy/astrostudy/perpredict.py` —— 日返寻根种子步改顺行弧（5–12 月生人按年初种子不再倒走到上一年）；返照相位先归一化到 [0,180]（跨 0° 合相不漏报、`tmpdelta>1` 垃圾值消除）；骰子盘宫位判定支持跨 0° 宫。
- `astropy/astrostudy/perchart.py` —— 反平行第一个伙伴漏 add 修复；恒星合相跨 0° 折回；围攻判定改独立 `pairOrb`（原复用外层 orb 被逐对污染 + `deltaA>orb or deltaA>orb` 笔误）；时主星改 `floor(经过时长)`（原按整点跨越数）。
- `astropy/astrostudy/modern/chartcomposite.py` —— 组合中点取短弧（跨白羊点行星对不再翻到对宫）。
- `astropy/astrostudy/modern/chartcomp.py` —— 合盘相位/映点/反映点归一化（同 perpredict 口径）。
- `astropy/astrostudy/jieqi/jieqiconst.py` + `jieqi/TimeDecider.py` —— 死代码修复（dict 比较 TypeError / 缺 import）。

### ⚠️ 行为变化提示（同步后请验数）
月返/日返时刻（尤其旧版卡在种子时间或落到上一年/上一次的盘）、真太阳时（2/24、4/10–13、12/25 出生 + 半小时/三刻时区地区）、组合盘跨白羊点行星对、时主星（日出后第一小时内出生）、反平行/恒星合相/合盘相位行集——这些是**从错到对**的修正，结果会变。pytest 全量（含主限法 byte-perfect golden 540 例不变）+ jest 全绿后再发。

### 自动受益（纯前端，Win 拉前端即同步）
- **设置生效链**：`techniqueMountSettings.js` + `aiAnalysisContext.js`（AI 挂载 C 类「每技法设置」改临时写入+用毕还原，不再永久改写全局七政显示设置）；`ZiWeiMain.js`（挂载覆盖四化流派时同步失效四化缓存，快照内部不再自相矛盾）；`models/app.js`（启动层 globalSetup/AspKey 损坏自愈、相位集进 app model、移除从未写入的启动页死读）；`AstroDirectMain.js`(+测试)（PD 表格 dispatch 统一 0/1 编码）；`Astro3D.js`（3D 视图选项损坏自愈）。
- **渲染**：`Su28ChartCircle.js`（d3 回调 this 丢失致字号/间距永走小图档 + 防重叠 0° 跨界）；`AcgD3Map.js`（重建后重放 zoom 状态，点击不再错位 + paranAll 触发重绘）；`AstroChartCircle.js`（角线/宫度线 `stroke-dasharray` 拼写、星群字列旋转用防重叠后经度、界标签对齐段中点、关键行星宫位遮罩跨 0° 宫）；`fengshuiEngine.js`（Retina devicePixelRatio 适配不再发虚 + 导出 PNG 标记按分辨率放大）；`reportChartCapture.js`（截图串行锁重写：不再 30s 后弃跑第二遍/失败双跑）；`UranianDial.js`（指针箭头退化三角修复 + 卸载取消 rAF）；`utils/helper.js`（`distanceInCircleAbs` >180 误返常量）；`NongLi.js`（42 格固定索引短数据白屏防护 + 稳定 key）。

### 自检 / 测试更新
- `AstroDirectMain.test.js`：pdConverse/pdAntiscia/pdTerms 期望改 0/1 数字编码。
- 同步后跑：`python -m pytest tests/ -q` 全绿（golden 540 byte-perfect 不变）+ `npx umi-test` 全绿。

## 待发布 · Windows #24/#25 根因修复（聊天发送 [object Object]）+ 全 UI bug 扫雷批次

> **直接对应 Windows 仓 issues：#24「更新后调用gpt5.5模型无法上传」与 #25「调用gpt5.5模型 内容总是上传失败」是同一 bug 的重复上报（两截图完全相同）；#23（Gemini 400）的修法见下面「AI 报告 Gemini 参数修正」节（要重编 jar）。本批全部是共享前端，Windows 拉前端即同步，无需改 Java/Python。**

### #24/#25 根因（务必读懂再合）
- 现象截图里用户消息是字面量 `[object Object]`，AI 也只收到这串——**不是网络「上传失败」**。
- 根因：`AIAnalysisMain.js` 聊天圆形发送按钮 `onClick={handleSend}` **直挂**，antd 会把点击事件对象当第一参传给 `handleSend(overrideText)`；`overrideText` 非空即生效，模板串化后 `${事件对象}` 恰好就是 `[object Object]`，既显示在气泡里也发给上游。**与模型无关**（gpt-5.5 只是巧合）；按 Enter 发送（无参调用）不触发，所以时好时坏。
- 修复（两处都要）：① 按钮改 `onClick={()=>handleSend()}`；② `handleSend` 内加固 `overrideText` 只认字符串（`typeof overrideText === 'string' ? overrideText : null`），非字符串一律回落输入框内容。
- 自检：点「发送」按钮（不是回车）发一条，气泡与 AI 收到的都应是所输入文本。

### 自动受益（纯前端，Win 拉前端即同步）— 本批其余修复
- **聊天高级参数真正生效**：`aiAnalysisProviders.js` 新增 `isOpenAiFamily()`；`AIAnalysisMain.js` 的停止序列 / 频率·存在惩罚 / JSON 模式判定改用之。此前写 `protoFamily === 'openai'`，而预设实际取值是 `'openai-compatible'` → 判定永假，这些参数对 OpenAI/DeepSeek/Moonshot 等全部静默失效。
- **思考档覆盖新推理模型**：`applyThinkingLevel` 的 OpenAI 分支正则对齐 `isReasoningModel`（`gpt-?[567]|o[13-7]`），gpt-5.5 / gpt-6 / gpt-7、o6 / o7 不再静默丢档。
- **报告流中途错误不再吞**：`reportPipeline.js` 生成循环读取 `res.errorMessage` 并抛出走统一重试/分类（此前半截内容被标「完成」）。
- **已取消请求不再补发**：`services/aianalysis.js` `withTimeout` 对「已 abort 的外部 signal」立即熄火。
- **白屏防护**：`reader/BookReader.js`（主题/TTS/章节缓存 parse 自愈 + scroll 容器判空）、`gua/GuaSymDesc.js`、`cntradition/BaZi.js`（构造期 localStorage parse try/catch）、`astro/AstroHelper.js` + `astro/AstroChartCircle.js`（相位配置读取兜底）、`germany/Midpoint.js`（空数组）、`calendar/NongLi.js`（prevDays 不足）、`astro/LonInput.js` + `LatInput.js`（畸形经纬值）。
- **暗色可读性**：`common/ChartServiceErrorModal.js` 全面主题变量化；`astro/AstroLifespan.js` 与 `update/UpdateNotifier.less` 的 accent 实底文字改 `--horosa-on-accent`；`common/BackendStatusDot.js` 地址行改 `--horosa-muted`。（Electron 壳若有自带更新 UI，另行对照同款问题。）
- **列表 key 稳定化**：`calendar/NongLi.js` / `NongLiMain.js` / `ziwei/ZiWeiMain.js` / `deeplearn/DLFeature.js` / `germany/Midpoint.js` 把 `randomStr(8)` key 换稳定 key（randomStr 每次渲染都变 → 子树反复重挂，表单丢焦点）。

### 自检 / 测试更新
- jest：`aiAnalysisProviders.test.js` 新增 2 钉——`isOpenAiFamily` 语义（防回退 `=== 'openai'`）+ `reasoning_effort` 模型覆盖（gpt-5.5/6/7、o6/7）。同步前端后跑 `npx umi-test` 应全绿。

## v2.6.6（本地批次,未发版）· 主限法改进大批：显示窗精确化 + 宿命点应星 + 时间钥匙修真 + 年数上限 3000 + 死码清理

> Windows 端同步本批必须**重编 jar**(Java 4 控制器 _wireRev 升 v12)并重启本地 Python 服务(旧进程会静默吞新钥匙,详见 AGENTS「LIVE 实测两坑」)。

### 必须同步 ①（Python 排盘引擎,5 个文件）
- `Horosa-Web/astropy/astrostudy/perpredict.py` — 显示窗 pre-norm 判据、宿命点应星闭式、每盘时间钥匙、_extendCorePdRecurrences 多圈复发(3000 年)、死码清理
- `Horosa-Web/astropy/astrostudy/perchart.py` — pdYears 夹断 3000
- `Horosa-Web/astropy/astrostudy/pd_engine.py` — 太阳弧(黄经)钥匙正逆函数、死码清理
- `Horosa-Web/astropy/astrostudy/helper.py` / `Horosa-Web/astropy/websrv/webchartsrv.py` — PD_SYNC_REV v12
- 数据:`astropy/tests/data/pd_calibration_corpus/golden_alcabitius_ptolemy_v266.ndjson.gz` + `manifest.json`(v253 删除)

### 必须同步 ②（Java,4 控制器 → 重编 jar）
- `PredictiveController.java`、`astrostudycn/ChartController.java`、`IndiaChartController.java`、`astrostudycn/QueryChartController.java` — `_wireRev = pd_method_sync_v12`
- 重编顺序:`mvn install`(astrostudy、astrostudycn)→ `mvn clean package`(astrostudyboot),JDK17

### 自动受益（纯前端,Win 拉前端即同步）
- `primaryDirectionSync.js`(v12 + 新钥匙清单/labels)、`AstroPrimaryDirection.js`/`AstroPrimaryDirectionChart.js`(下拉/normalize/3000 上限)、`AstroDirectMain.js`(宿命点白名单)、`AstroConst.js`/`AstroText.js`(VERTEX 词条)、`techniqueMountSettings.js`(pdYears max 3000)

### 自检 / 测试更新
- pytest:`test_pd_method_matrix.py`(静态钥匙集合断言、每盘钥匙、太阳弧 round-trip、**test_pd_years_3000_multi_revolution**)、`test_pd_engine.py`(动态钥匙 round-trip)、golden 引用文件名 v266(共 4 个测试文件)
- jest:`AstroDirectMain.test.js`(宿命点行渲染)、`AstroPrimaryDirectionYears.test.js`(3000 链一致)
- `release_preflight.sh`:[32] 守卫扩展(_passesCoreDisplayWindow/_coreVertexArc/_extendCorePdRecurrences/3000 字面量)、[33] v12 字面量、CITATION.cff 条件化
- `scripts/check_horosa_full_integration.py`:5 处陈旧断言更新

### 运行时
- 改 Python 后必须重启本地排盘服务;清 ParamHashCache(磁盘 .horosa-cache/paramhash + redis)再做 LIVE 验证。

## 待发布 · AI 报告 Gemini 参数修正 + 思考档高档位 + 桌面缩放持久化

> **Windows 必做两件**：① 重编 Java jar（AI 代理改了 Gemini 请求封装）；② 在 Electron 壳实现「界面缩放持久化」（Mac 端 Tauri 已做，壳层代码各自实现）。AI 报告「思考档」高档位是共享前端，拉前端即同步。

### 必须同步（Java，需重编 jar）
- `Horosa-Web/astrostudysrv/.../service/AIAnalysisProxyService.java` —— `buildGeminiBody()`：调用 Gemini 时把 `temperature` / `maxOutputTokens` 等采样参数从请求顶层剔除（它们只应在 `generationConfig` 内），修复上游 400「格式错误」。Windows 端同步该文件后**必须 `mvn` 重编 jar**。

### 自动受益（纯前端，Win 拉前端即同步）
- **AI 报告「思考档」新增「极高 / 最大」两档** —— `aiAnalysisProviders.js`（`THINKING_LEVELS` / `THINKING_BUDGET` / `applyThinkingLevel`：OpenAI 系封顶 high、Anthropic/Gemini 提高 thinking budget、Anthropic 按 max_tokens clamp 防 400）+ `reportPipeline.js`（所选档位穿透到主章节流式生成，辅助节保持关闭）+ `ReportGenerator.js`（接口/模型选择器下方新增「思考档」下拉，localStorage 持久化）+ `ReportPane.js`（生成时透传所选档位）。

### Windows 端须自行实现（壳层，非共享）
- **界面缩放持久化** —— Mac 端 Tauri 把缩放值存进 `preferences.json`、重启恢复（修复「放大后重开复位」）。Windows 是 Electron 壳，需等价实现：把 `webContents`/`webFrame` 缩放值持久化到设置文件、启动时恢复。

---

## v2.6.5（2026-06-08 发布）· 合盘交互链全面重建 + AI「起课时间」挂载 8→13 技法 + Python 数值 geo 容错

> **Windows 必做一件：同步 Python 排盘组件**（helper.py / realsuntime.py / 5 个 Main.js builder 已是 Mac/Win 共享前端，拉前端即同步）。**Java jar 本版未改**（合盘端点恢复是前端改 URL，不需重编 jar）。其余（合盘交互链、AI 起课时间补 5 法、Python 数值 geo、导航搜索、关于框图标）都是共享前端，拉前端后自动受益。

### 必须同步（Python 排盘引擎，2 个文件）
- `astropy/astrostudy/helper.py` —— `convertLonStrToDegree / convertLatStrToDegree` 加 `isinstance(lon/lat, (int, float))` 数值分支（地图选点存的浮点经纬度，字符串路径原样）。
- `astropy/astrostudy/jieqi/realsuntime.py` —— `getBaseLonByZone` 加 `isinstance(zone, (int, float))` 数值时区分支。
- **不需重编 jar / 不需 Windows 改 Java 任何文件**（合盘端点恢复 = 前端 `AstroRelative.js` 改 URL 从 `:8899` 回 `:9999`，原来的 Java `ModernChartController` v2.6.4 就已经在了）。

### 自动受益（纯前端，Win 拉前端即同步）
- **合盘 5 子盘全可用** —— `AstroRelative.js / AstroSynastry.js / AstroMarks.js / AstroComposite.js / AstroTimeSpace.js / pages/index.js / app.less` 全链路改：端点回 `:9999`、ResizeObserver 实测高度、`chartStyle/dispatch/onChange` 透传、`handleRelativeOnChange` 直写 fields、`paramsToFields` 不再覆盖 hsys/zodiacal、删 `hidezodiacal/hidehsys` 标志、黄道 Select 局部 CSS 定宽 50/50。
- **AI 起课时间挂载补 5 法** —— `TaiXuanMain.js / JingJueMain.js / WuZhaoMain.js / ShenYiShuMain.js` 各新增 `buildXxxSnapshotForFields(fields, opts)` 导出 + `aiAnalysisContext.js` 加 5 imports + 5 switch case + `TIMEPOINT_CASTABLE_SET / listAnalysisTechniqueOptions` 两份同步含 13 项 + `buildFieldObject` 兜底 `record.divTime` + `techniqueMountSettings.js` 4 法升 `kind:'payload'` + `AIAnalysisMain.js` 一键挂载文案 / drawer hint 更新。
- **顺手修** —— `HomePageSetup.js` + `pages/index.js` 全 22 模块 navigationPages 加 keywords；`PageHeader.js` + 新 `appicon.png` 真 icon；`AstroPersianDirected.js` 应期年数联动表格；`UranianDial.js` glyph stroke:none；`app.less` cetian 字重 700→500 / 800→600；`AIAnalysisMain.js` source select 刷新案例；`AstroEphemeris.js + AstroExtraCommon.js + PlanetariumBabylon.js + xq-ui/styles.less` 一批小修。

### 自检 / 测试更新
- `release_preflight.sh` 新增 [37] / [38] / [39] 3 个 sentinel 块（分别锁起课时间 13 技法 + builder opts + divTime 兜底 / 合盘端点 + 交互链全检 + 黄道 Select 定宽 / Python helper 数值 geo）。
- `aiAnalysisContext.test.js` 新增 `listAnalysisTechniqueOptions(timepoint) 必含全 13 项` 断言。
- `techniqueMountSettings.test.js` `SECTIONS_ONLY` 常量收紧到 4 项（sixyao / tongshefa / mundane / huangji）。
- jest 657 → **658** 全过、preflight [37][38][39] 全 ✅、umi build exit 0、py 全栈 import OK。

### 运行时
- **runtime `2.6.5-runtime1`**：升级时自动下载新 runtime（因 Python 改了 helper / realsuntime，Mac/Windows 各自的桌面壳启动器走 updater 拉新 runtime tarball 即同步）。

### v2.6.5 Mac/Win 共享前端 + 隐藏「未发版功能」检查
本版**不带任何隐藏功能**（没有「这版只 Mac 发，Win 等下版」的差），Win 端拉前端 + 拉本文档列的 Python 2 个文件即与 Mac 完全一致。

---

## v2.6.4（2026-06-08 发布）· 恒星黄道 47 岁差全栈 + 西洋月宿 + 印占补齐 + AI 四同步（合并 启动健壮性#12 / AI报告v1）

> **Windows 必做两件：① 同步 8 个 Java 控制器并 JDK17 重编 jar；② 同步 Python 排盘组件。** 其余（恒星黄道 UI / 月宿 / AI 四同步 / 启动健壮性 / AI 报告）都是 Mac/Win 共享前端，拉前端后自动受益。下方原「未发版」两条（启动健壮性、AI 报告）即本版合并发布的内容。

### 必须同步 ①（Java，否则恒星黄道 ayanāṃśa 在 Windows 不生效）
- 8 个控制器 `getParams()` 各在 `put("zodiacal", ...)` 旁补 `if(TransData.containsParam("siderealAyanamsa")) put("siderealAyanamsa", ...)`：
  - `astrostudycn`：`ChartController` / `QueryChartController` / `JieQiController` / `PlanetariumController`
  - `astrostudy`：`GermanyTechController` / `ModernChartController` / `AstroExtraController` / `PredictiveController`
- **重编**：`mvn install` astrostudy + astrostudycn → `mvn clean package` astrostudyboot（**必 clean**，否则 jar:jar 跳过 repackage、嵌套 lib jar 不更新）。
- **验证**：抽 `BOOT-INF/lib/astrostudycn-*.jar` 内 `ChartController.class`，`grep -a siderealAyanamsa` 应 >0。**坑：macOS/部分 `strings` 遇 .class 的 `CAFEBABE` 魔数会误判 Mach-O 报错返 0 → 用 `grep -a` 或 `javap -p -c` 验。**

### 必须同步 ②（Python 排盘引擎）
- 新增 `astropy/astrostudy/nakshatra.py`（27 宿表）；`india/jyotish_engine.py` 改 re-import。
- `astropy/astrostudy/perchart.py`：`siderealMode` 解析（`normalize_ayanamsa`）+ 序列化 res 加 `nakshatras` / `siderealAyanamsa`。
- `astropy/astrostudy/perpredict.py`：directed `Chart(...)` 加 `sidereal_mode`、6 个 dirParams 加 `siderealAyanamsa`。
- `astropy/astrostudy/india/india_chart_kernel.py`：分宫制 4→24、黄道 6→47（SE_SIDM 0–46）。
- **响应 echo 命门**：`astropy/websrv/webchartsrv.py`（index）+ `astropy/astrostudy/helper.py`（getChartObj）的 `obj['params']` echo 加 `siderealAyanamsa`（不补则前端 `chartObj.params` 永拿不到、所有派生组件白补）。
- `astropy/websrv/webmodernsrv.py`：合盘 relative inner/outer 加 `siderealAyanamsa`（顺带修祖传 `zodical`→`zodiacal` typo）。

### 自动受益（纯前端，Win 拉前端即同步）
- 恒星黄道 47 岁差复合下拉（`AstroConst.buildZodiacOptions`）/ 西洋盘月宿行 / 印占下拉展宽 / AI 四同步（双盘双配置、挂载设置印占·七政·西洋、波斯年数、AI 导出段 `AI_EXPORT_SETTINGS_VERSION` 23→24）。
- **启动健壮性 #12**（纯前端，见下方原条目）、**AI 报告 v1**（纯前端 + 后端 `/bazi/direct`·`/ziwei/birth` 截图，**无新 Java**）。

> 机制细节见 `实现说明` §「恒星黄道 ayanāṃśa(siderealAyanamsa) 全栈透传」。

---

## 未发版（开发中）· 启动健壮性大批加固（Mac issue #12 / Win 同类历史问题）

- **性质：纯前端加性改造**（新增 2 组件 + 修改 4 文件），**无 Java 改动**，前端 Mac/Win 共享所以 Windows 自动受益。
- **修改文件**：
  - `Horosa-Web/astrostudyui/src/services/astro.js` — fetchChart 透明重试 6 → 10 次（累计 12s → 30s），覆盖慢机器 35-60s 首启窗口
  - `Horosa-Web/astrostudyui/src/models/astro.js` — showChartServiceError 委托到富对话框组件（dva model 不支持 JSX，必须 React 端独立组件）
  - `Horosa-Web/astrostudyui/src/components/common/StartupGate.js` — 分阶段文案（6s/15s/30s）+ Tauri 环境下加「重试 / 重启后端 / 诊断」按钮 + 长时间未就绪显示后端地址
  - `Horosa-Web/astrostudyui/src/components/common/ServiceStatusBanner.js` — 离线横幅加「立即重试 / 重启后端 / 打开诊断」按钮
  - `Horosa-Web/astrostudyui/src/layouts/app.js` — 挂载新增的 BackendStatusDot
- **新增组件**：
  - `Horosa-Web/astrostudyui/src/components/common/ChartServiceErrorModal.js` — 「排盘失败：本地服务未就绪」的富对话框（4 类原因 + 4 个操作按钮 + 探测后端 onOk 回调）
  - `Horosa-Web/astrostudyui/src/components/common/BackendStatusDot.js` — 右下角常驻后端健康指示灯（绿/黄/红圆点 + Popover 详情 + 60s 慢探）
- **Tauri 命令依赖**（已存在，无需新加）：`trigger_runtime_repair_command` / `open_diagnostics_window_command`
- **未发版**：本批 commit/push/打包/手测均未做，等 macOS 端用户拍板后再开同步窗口。

---

## 未发版（开发中）· AI 分析「报告」v1.4 工程师级 17 处 audit 修复

3 个并行 Explore agent 找到 19 个潜在 bug，选 17 个真实可触发的全修：

**Pipeline / Queue**:
- ConcurrentQueue 暴露 `getErrors()/getStats()`，drain 后 successRate < 40% 跳过辅助节
- isContentTruncated 加 `ELLIPSIS_END_RE` 识别 `...` `。。。` `…` `等等` 收尾视为截断
- 续写循环改 `while(true) + 头部 if(continueAttempts >= MAX_CONTINUE) break` 严格限制最多 2 次
- renderTemplateVars 防嵌套（替换值里的 `{{` 转 placeholder）
- resolveSchoolPrompt 未知流派给通用 fallback guideline
- INTRO/OUTRO maxTokens 2500→120/500（按实际产出贴近）

**Capture / Fetch**:
- ChartCaptureMount 内 fetch 加 `fetchWithTimeout` 15s + AbortController
- ChartCaptureMount readyEmitted immediate flip 防 setState error/result 接连触发双调
- reportChartCapture 加 `captureLock` 全局 Promise 串行化截图任务

**UI / Modal**:
- ChartServiceErrorModal `handleCopyDiag` async + await + 真实 success/error message
- ChartServiceErrorModal `tauriInvoke` async + await + successMsg/errorMsg 参数
- BackendStatusDot `handleRestart/handleDiag` 同步 await + 反馈
- ServiceStatusBanner `handleRestart/handleDiag` 同步 await + console.warn
- ReportGenerator useEffect 移除 form 依赖 + eslint-disable 注释
- ReportPane 跨 tab 自动恢复改 functional setState 防 stale closure race

**测试**:
- reportTruncation.test.js 加 4 用例覆盖省略号收尾（567→571 全过）

---

## 未发版（开发中）· AI 分析「报告」v1.3 截断问题彻底修复

用户截图反馈报告内容被截断（"但坐支辰土（日柱"、"甲木偏财透出，申金" 等末句没收尾）。**4 重根因式修复**：
1. **maxTokens 全节 bulk-bump**: 1000-1800 → 2500-5000（命主基本/性格/健康 2500；用神/格局/婚姻/事业 3500；大运/流年 4000-5000）
2. **`isContentTruncated` 检测 + 自动续写**: 末尾非合法终止符 → `streamSectionReply` 追发续写请求（"下面是你刚才输出的最后部分被截断了…请从这里继续写下去"），最多 2 次，用 prefixContent 累加流到 UI 不让用户感知"重新开始"
3. **per-section `temperature`/`topP`**: mkSection 加默认 0.6/0.9；streamSectionReply 加 `applySamplingParams` 按 provider 家族下发；推理模型自动跳过 temperature
4. **prompt 加「输出完整性·铁律」段**: 必须完整句号/感叹号/问号收尾、临近上限宁可省略子段、禁 "..." 收尾；retryFallbackPrompt 同步

**修改文件**:
- `Horosa-Web/astrostudyui/src/utils/reportTemplates.js` — mkSection 加 temperature/topP/完整性铁律 + 全节 maxTokens bump
- `Horosa-Web/astrostudyui/src/utils/reportPipeline.js` — streamSectionReply 重写为「首轮 + 最多 2 次自动续写」+ usage 累加
- `Horosa-Web/astrostudyui/src/utils/__tests__/reportTruncation.test.js` — 新增 8 用例（jest 559→567/567 全过）

---

## 未发版（开发中）· AI 分析「报告」v1.2 关键 bug 修复

**用户截图反馈 4 处根因（2026-06-07 第三轮）**：
1. `loadCaseSnapshot(technique, caseId)` 传 `{caseId}` 给 `buildBaziSnapshotForParams` → 后端报 `Miss date` → 所有节空跑、AI 回"没八字信息"。**修**：先 `sources[i].record` 拿 chart record → `buildChartBaziParams/buildChartZiweiParams` 转 params → 再 build。
2. **并发 2 让节乱序完成**（用户看到节 3 先于 1/2）→ 改 `concurrency: 1` 严格按 order 顺序生成。
3. **ChartCaptureMount 内部 render 错误浮到 dev overlay**（`TypeError: Cannot read properties of undefined (reading 'value')`）→ 加 `CaptureErrorBoundary` + `ReactDOM.render` 包 try/catch + onCaptureError 不 reject 让占位图被截。
4. **空 snapshot 也照跑 pipeline 浪费 12 节 token** → fail-loud 三道防线（空字符串/<20字/缺关键段 `[起盘信息]`+`[四柱与三元]`/`[宫位总览]`）+ Modal.error 列具体原因。

**修改文件**：
- `Horosa-Web/astrostudyui/src/components/aianalysis/ReportPane.js` — loadCaseSnapshot 改 record→params; handleStartGenerate fail-loud 三道防线 + 防重复触发 + concurrency 1
- `Horosa-Web/astrostudyui/src/components/common/ChartCaptureMount.js` — CaptureErrorBoundary + 错误状态也 onCaptureReady（截占位图）
- `Horosa-Web/astrostudyui/src/utils/reportChartCapture.js` — ReactDOM.render 包 try/catch
- `Horosa-Web/astrostudyui/src/utils/aiAnalysisContext.js` — export buildChartBaziParams/buildChartZiweiParams

---

## 未发版（开发中）· AI 分析「报告」v1.1 增补：嵌图实装 + e2e 验证

- **性质：纯前端加性改造**（1 个新组件 + 1 个改组件 + 1 个 utils 导出），无 Java 改动。
- **新增**: `Horosa-Web/astrostudyui/src/components/common/ChartCaptureMount.js` — 命盘图捕获挂载组件（独立非 Redux，fetch 走 `/bazi/direct` 或 `/ziwei/birth` POST + 渲染 PaiBaZi/ZiWeiChart + 紫微 palace-highlight via inline `<style>`）。
- **修改**:
  - `utils/reportChartCapture.js` — 改用 ChartCaptureMount，移除原本 lazy import BaZi/ZiWei 的设计；caseRecord 替代 caseId 传入。
  - `utils/aiAnalysisContext.js` — 导出 `buildChartBaziParams` / `buildChartZiweiParams`，供 ChartCaptureMount 复用 record→params 转换。
  - `components/aianalysis/ReportPane.js` `doChartCapture` 改成传 `sources.find(s=>s.id===caseId).record` 给 captureChartByType。
- **端到端验证**: preview 里 inject IndexedDB 测试报告实例 → 报告 tab 列表 + 详情页（26 h2 + 12 TOC + intro alert + 末页）全渲染 OK；后端断开时嵌图调用会 graceful return null 不阻塞。Windows 自动受益。
- **未发版**: 等 macOS 用户拍板后再开同步窗口。

---

## 未发版（开发中）· AI 分析「报告」功能 v1（首批）

- **性质：纯前端加性改造**（新增 8 utils + 2 React 组件 + 修改 5 文件），**无 Java 改动**。详见 [`ai-report-feature-v1.md`](ai-report-feature-v1.md)。
- **新依赖**：`html-to-image@^1.11.13`（已加入 `Horosa-Web/astrostudyui/package.json`）。Windows 同步前端时务必 `npm install`。
- **IndexedDB schema bump**: `aiAnalysisStore.js` `AI_ANALYSIS_SCHEMA_VERSION 3→4` + `DB_VERSION 3→4`（自动 migrate 创建 `report_templates` + `report_instances` 两 stores + `materials.schools` 字段）。
- **AI 分析右栏 SECONDARY_TABS 加 'report'**（在 templates 与 settings 之间）。
- **预置 6 套报告模板**（八字 8/12/20 + 紫微 8/12/20）在 `utils/reportTemplates.js` 硬编码 readOnly。
- **预置 9 套流派 guideline**（八字 5 + 紫微 4）在 `utils/reportSchools.js`。
- **资料 (materials) 加 schools 字段**：资料编辑表单新增「流派」Tag 多选输入；卡片显 `<Tag color="cyan">` chip。
- **聊天栏「📄 报告」快捷按钮**：一键切到报告 tab 并预填当前 activeSource → technique/caseId。
- **截图基础设施已建** (`utils/reportChartCapture.js`)：用 React Portal 隐藏挂载点 + html-to-image 懒加载；首批 BaZi.js / ZiWeiMain.js 未实装 `embeddedMode='capture'` props，截图会 10s timeout 后返回 null，报告生成不阻塞、章节仍正常生成纯文本。Windows 同步无需为此特别做事，等 Mac 端下版补 capture mode 时一起同步。
- **未发版**：本批 commit/push/打包/手测均未做，等 macOS 端用户拍板后再开同步窗口。

---

## v2.6.3（发版中）· AI 分析深度打磨 + 大批稳定性修复

- **性质：前端 17 项 + 后端 4 项加性改造（已重编 jar），含 Tauri `prompt() is not supported` 崩溃修复（关键）**。详见 [`ai-analysis-comprehensive-enhancements-v3.md`](ai-analysis-comprehensive-enhancements-v3.md)。
- **依赖**：`highlight.js@11.9.0` + `katex@0.16.10` 已在 `Horosa-Web/astrostudyui/package.json`；Windows 同步前端时务必 `npm install`。
- **Windows 必同步前端 `.js/.less/.json` + `npm install && npm run build && npm run build:file`**。
- **Windows 必同步后端 `AIAnalysisProxyService.java` + 重编 jar**（无聚合 pom 的坑：`cd 模块` 单独 `mvn install` 再 `cd astrostudyboot` `mvn package`）。
- **关键稳定性修复**（Tauri 桌面壳一样会犯）：
  - `window.prompt/confirm/alert` 在 Tauri 严格上下文中**直接抛 `Unhandled Rejection: prompt() is not supported`** → 全 7 处替换为 `asyncInput`/`asyncConfirm`（基于 `AntdModal.confirm`）。Windows 仓若有类似调用须一并替换。
  - antd `<Dropdown overlay={JSX}>` 已废弃且 Menu 内部 setState-on-unmount 内存泄漏 → 6 处全换 `menu={{items,onClick}}` 新 API。
- **8 个版本文件 lockstep 已 bump 2.6.2 → 2.6.3 / runtimeVersion 2.6.2-runtime1 → 2.6.3-runtime1**：`package.json` / `config/release_config.json` / `web/app.js` `APP_VERSION` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock`（仅 `horosa-desktop-installer` 条目）/ `src-tauri/tauri.conf.json` / `scripts/verify_launcher_console_states.py` / `CITATION.cff` + 3 个 README + `config/release_notes/2.6.3.md`。
- **Windows 行动**：同步上述前端 `.js/.less/.json` + `npm install` + 重建前端包；同步 `AIAnalysisProxyService.java` + 重编 jar；同步 8 版本文件相应字段；同步 README/release_notes 内容；本地跑 jest（应 522 绿）。

---

## （已并入 v2.6.3 发布）· AI 分析「再审计」全面增强（Tier 1+2+3）

- **性质：纯前端 17 项 + 后端 4 项加性改造（需重编 jar）。** 详见 [`ai-analysis-comprehensive-enhancements-v3.md`](ai-analysis-comprehensive-enhancements-v3.md)。
- **依赖**：`highlight.js@11.9.0`（语法高亮）+ `katex@0.16.10`（LaTeX 数学）已在 `Horosa-Web/astrostudyui/package.json`。Windows 同步前端时记得 `npm install`。
- **纯前端同步**（`.js`/`.less` + `npm install && npm run build && npm run build:file`）：
  - 聊天：代码块复制/高亮、上滚暂停、推理面板自动折/复制思考、对话栏拖拽+粘贴图、挂载状态条、首回自动命名、活动对话内导出、错误 Alert+重试、空状态示例 chip。
  - 设置/接口：API Key 显隐+粘贴卫生、连接 chip tooltip+延迟、高级选项三段折叠。
  - 资料：卡片/列表视图切换、列表模式 Table+导出 Dropdown。
  - 组合：「预览」按钮 + Modal 显应用影响（含技法交集）。
  - Markdown：LaTeX `$...$`/`$$...$$`/`\[...\]`/`\(...\)`。
- **后端**（必重编 jar）`AIAnalysisProxyService.java`：
  - `buildOpenAIChatBody` 加 `stream_options.include_usage`；OpenAI/Anthropic/Gemini/Ollama 四家 stream 解析器抽 `usage` 统一 SSE「usage」事件下发。
  - `buildGeminiBody` 重写：用 `generationConfig` 装 `temperature/topP/maxOutputTokens/stopSequences/responseMimeType/thinkingConfig`；多模态从 `images` 拼 `inlineData/fileData`。
  - `buildAnthropicBody` 显式 `stop_sequences/thinking`；扔掉不支持的 frequency_penalty/presence_penalty/response_format。
  - `buildOllamaNativeBody` `opts.stop` 映射 + `message.images` 抽 base64（llava 等视觉模型）。
  - `isOpenAIReasoningModel` 加 gpt-7/o6/o7；前端 `isReasoningModel` 同步 `/(^|\/)(gpt-?[567]|o[13-7])/`。
- **Windows 行动**：同步全部 `.js/.less/.json` + `npm install` + 重建前端包；同步 `AIAnalysisProxyService.java` + `cd astrostudysrv/astrostudy && mvn install && cd ../astrostudyboot && mvn package`（无聚合 pom 坑要 cd 模块），重启后端。本地跑 jest（应 522 绿）。**未发布，停在手测**。

---

## （开发中·未 bump app 版，停在手测）· AI 导出/挂载完善 + AI 分析增强 + 分至样式按钮

- **性质：前端多处 + 后端 `AIAnalysisProxyService.java` 加性改造（2F 视觉）→ Windows 同步前端 `.js` + 重建前端包 + 重编 jar。** 机制细节见 [`ai-export-mount-completeness-and-analysis-enhancements.md`](ai-export-mount-completeness-and-analysis-enhancements.md)。
- **纯前端（同步 `.js` + `npm run build && npm run build:file`）**：
  - 分至样式按钮：`pages/index.js`（`<JieQiChartsMain>` 补 `chartStyle`）+ `components/jieqi/JieQiChartsMain.js`（`<AstroChartMain>` 补 `chartStyle`+`dispatch`）。
  - 七政四余导出补段：`components/guolao/GuoLaoChartMain.js`（`buildGuolaoSnapshotTextV2` 加 `[政余格局]/[相位]`）+ `utils/aiExport.js`（guolao 预设段 + **`AI_EXPORT_SETTINGS_VERSION` 22→23**）。
  - 4 占数补挂载：`utils/techniqueMountSettings.js`（wuzhao/taixuan/jingjue/shenyishu 注册 sectionsOnly）+ `utils/aiAnalysisContext.js`（并入 `ANALYSIS_CASE_TECHNIQUES`+标签）+ 测试 `techniqueMountSettings.test.js`（`SECTIONS_ONLY` 同步）。**otherbu/fengshui/jieqi 未纳入**（不在 `CASE_TYPE_OPTIONS`，无事盘存储）。
  - AI 分析 `components/aianalysis/AIAnalysisMain.js`（+ `utils/aiAnalysisStore.js` bundle schema、`utils/aiAnalysisContext.js listAllAnalysisTechniqueOptions`）：2C 新接口自动拉模型、2D 任意用户消息编辑分支、2E 组合模板（技法/资料/设置自动套）、2B 停止序列+惩罚、2G JSON 模式、2F 图片按钮+预览+`images` 发送。
- **后端（必重编 jar）2F 视觉**：`astrostudysrv/.../AIAnalysisProxyService.java` **加性**改造（纯文本路径字节不变、零回归）——`getMessageList` 保留 `images`；新增 `imageUrlList/toOpenAIVisionMessages/anthropicImageBlock`；`buildOpenAIChatBody` 用 `toOpenAIVisionMessages`；`buildAnthropicBody` 加图片块 + 放开「仅图无文」。**Windows 同步这段 Java + 重编 jar**（Windows 若用同一 Spring 后端则直接同步；构建坑见下）。
- **构建坑（Windows 也适用）**：① `astrostudysrv` **无聚合 pom**，`mvn -pl <模块>` 会「Could not find project in reactor」→ 必 `cd 模块目录` 单独 `mvn`（astrostudy 先 `install`，再 astrostudyboot `package`）。② `umi-test ... | tail` 退出码来自 `tail`、掩盖测试失败 → 核验用 `> log; echo $?`。
- **Windows 行动**：同步上述前端全部 `.js` + 重建前端包；同步 `AIAnalysisProxyService.java` 2F 改造 + 重编 jar；本地跑 jest（应 522 全绿）。**未发布、停在手测——待 macOS 端拍板发版再同步发布动作。**

---

## v2.6.2（待发）· Issue 收尾：Mac #11 紫微补自化 + Mac #10 Java 假阴性 + Win #18 排查交接

- **性质：纯前端一处 + Mac 启动脚本一处，无 Java/jar 改动 → Windows 同步前端 `.js` + 重建前端包即可，无需重编 jar。**
- **Mac #11（前端，必同步 + 重建包）— 紫微挂载补「宫干自化」**：
  - `astrostudyui/src/components/ziwei/ZiWeiMain.js`：`formatStarSiHua` 加第 4 参 `palaceGan`，`[宫位总览]` 逐宫传入 `normalizeGan(house.ganzi)` → 星曜行追加 `自化X`（飞星核心；`getSiHua` 自动按当前流派表算，与生年/命宫四化同口径）。
  - 四同步**自动**：`buildZiWeiSnapshotText` 是挂载/储存/导出唯一构建器；自化在 `星曜` 行内（属已注册的 `宫位总览` 段）→ **不增删段、不需 `AI_EXPORT_SETTINGS_VERSION` bump**。
  - 测试：`components/ziwei/__tests__/ziweiMountSnapshot.test.js` +2（动态自化断言）。
  - **Windows 必须做**：同步该 `.js` + `npm run build && npm run build:file`。**（生年四化早已在；流年由 v2.6.1 多选挂载覆盖——确保 Windows 已同步 v2.6.1 那批前端。）**
- **Mac #10（Mac 启动脚本，Windows 不波及但要顺手核）— Java 运行时假阴性**：
  - `Horosa-Web/start_horosa_local.sh` · `java_bin_ready`：原把 `java -version` 委托 `/usr/bin/python3` 子进程；**无 CLT 的 Mac 上该桩返回非零 → 即便内置 java 完好也误判 not found → 严格模式拒回退 → 起不来**。改为直接 `java -version`。
  - **Windows 行动**：Windows 用 **Electron 主进程**（另一仓库）做 java 检测，**此具体 bug 不在 Windows 链路**；但请顺手核 Windows 启动器的 java 探测**没有「依赖无关组件（如系统 python）导致假阴性」**的同类隐患。
- **Win #18 排查交接（升级安装「Failed to uninstall old application files: 2」，v2.6.0 仍复现）**：
  - **现象**：@1574802103 称关闭 app、关机重启后再跑安装器仍报该错，只能先手动卸载旧版再装。v2.6.0 已加「覆盖前精确 taskkill `Horosa.exe` + 仅杀 `embedded-runtime` 下 java/python」，但该用户仍失败。
  - **该错含义**：electron-builder NSIS 的标准报错——**旧版本卸载器（`Uninstall Horosa.exe`）返回了非零**（`: 2`）。即覆盖安装前删旧文件这步失败。
  - **根因假设（按优先级，待用户日志/Windows 仓确认）**：
    1. **登录自启 / 残留后端重锁目录**：若 app 设了开机自启，或退出时内置 Java/Python 未随主进程退干净 → **重启后这些进程又起来、重新占用安装目录** → 卸载器删不掉 `Horosa.exe`/`embedded-runtime/*`。这最能解释「关 app + 重启仍失败」。**查**：安装目录是否有登录项/计划任务；退出时是否 100% 收掉 embedded-runtime 子进程。
    2. **杀进程逻辑覆盖不全**：v2.6.0 的 taskkill 宏是否真在「**旧版卸载器运行之前**」执行？electron-builder 的 `customUnInstall`/`installer.nsh` 宏插入点若不对（在卸载器之后），则旧卸载器先跑先失败。**查**：`build/installer.nsh`（或等价 NSIS include）里 taskkill 的插入宏是 `!macro customInit` / `customUnInstall` 还是 `customRemoveFiles`，确认在删文件前。
    3. **杀进程未覆盖中文路径 / 子进程树**：`taskkill /IM Horosa.exe` 不带 `/T` 不杀子进程树；中文安装路径（`…\星阙`）下若仍有按路径过滤的兜底，会失配。**查**：是否 `taskkill /F /T /IM Horosa.exe` 且对 embedded-runtime 的 java.exe/python.exe 也 `/F`。
    4. **杀软占用**：360/Defender 实时扫描锁文件。**查**：用户是否开杀软（但该用户已重启，可较低优先级）。
  - **需用户提供（我已起草 issue 回帖，见会话）**：① 安装器 `--verbose`/NSIS 调试日志（或 `%LocalAppData%\HorosaDesktop\logs`）；② 任务管理器里安装失败时是否还有 `Horosa.exe`/`java.exe`/`python.exe`；③ 是否设了开机自启。
  - **Windows 仓侧动作**：拿到日志后，重点改 `installer.nsh` 的 taskkill 宏——`/F /T`、覆盖 embedded-runtime 的 java/python、确保在旧卸载器执行**之前**、并对中文路径鲁棒；必要时退出时显式 `tree-kill` 内置运行时。

---

## v2.6.1 发布 · AI 挂载全选项打磨 + 多时段输出 + 风水八卦阳宅法 + 跨模块修复

- **性质：前端为主 + 后端一处（pdYears 转发，需重编 jar）。** 绝大多数改动纯前端（同步 `.js`/`.less` → `npm run build && npm run build:file`）；**唯一后端改动**是 `ChartController.getParams()` 转发 pdYears（挂载侧主限法年数选项生效的真因），**必须重编 fat jar**。
- **改了什么（后端，必重编 jar）**：
  - `astrostudysrv/astrostudycn/.../controller/ChartController.java`：`getParams()`（`/chart` 路径，AI 挂载用）原**丢弃** `pdYears` + `pdDirect/pdConverse/pdAntiscia/pdTerms` → 挂载主限法选项不生效。修法＝条件转发（缺省零回归）+ `_wireRev` `pd_method_sync_v8`→`v9`（让旧 ParamHashCache 失效）。
  - **Windows 必须做**：同步该 `.java` → **JDK17 重编**：`export JAVA_HOME=.../zulu-17.jdk/Contents/Home`（或 Windows JDK17）；`cd astrostudysrv && mvn -o -f astrostudycn/pom.xml install -DskipTests && mvn -o -f astrostudyboot/pom.xml clean package -DskipTests`；`unzip`+`javap` 验内嵌 `BOOT-INF/lib/astrostudycn-1.0.0.jar` 的 `ChartController` 含 `pdYears`/`pd_method_sync_v9`；重启后端。
- **改了什么（前端，必重建包）**：
  - **AI 挂载全选项**：新增 `utils/techniqueMountSettings.js`（`TECHNIQUE_SETTINGS_SCHEMA` 驱动齿轮抽屉）；`components/aianalysis/AIAnalysisMain.{js,less}`（抽屉渲染 + 多时段日期选择器 + 区间扫描）；`utils/{aiAnalysisContext,aiExport,localcharts,baziLunarLocal}.js`。
  - **多时段输出 / 主限法盘表拆分 / 推运多盘**：`components/astro/*`（PD chart-mount、各推运 builder）、`components/ziwei/{ZiWeiMain,ZWLuckPanel}.js`、`components/cntradition/BaZi.js`。
  - **六爻三卦全装卦 + 一键挂载**：`components/guazhan/GuaZhanMain.js`（+ `__tests__/guaSnapshot.test.js`）。
  - **风水八卦阳宅法 v2（倪海厦，纯前端）**：`components/fengshui/{FengShuiMain,fengshuiEngine}.js` + 新增 `fengshui/{baguaCore,baguaData,naqiRules,fengshuiGeom}.js`、`public/fengshui/skins/`（罗盘皮肤 PNG）；默认仍纳气盘、零回归。
  - **跨模块修复**：`components/divination/DivinationChartShell.js`（`changeChartStyle` 误把事件对象当值 → 辅盘样式切换失效，已修）、`components/astro/AstroRelative.js`（三式「时空」中点盘 `:9999→:8899` 端口兜底）、`layouts/app.less`（主题 / 布局 / 暗黑双色快修）。
- **零回归**：AI 挂载铁律「默认即现状」（等于默认的项被 prune、快照逐字节不变）；pdYears 转发缺省时行为不变；风水默认 `techMode='naqi'` 逐字节同改前。
- **所有技法命盘计算与 v2.6.0 字节级一致**：`perpredict.py`/`perchart.py` 本会话零改动；主限法 Alcabitius+Ptolemy 540 case byte-perfect 仍守。
- **为什么/坑**：见 `实现说明 §AI 挂载·每技法「设置」全选项无遗漏`（含 `🔒 pdYears 需重编 jar`）+ §风水·八卦阳宅法 + §跨模块修复。

---

## v2.6.0 发布 · 奇门「相关人员(生年干) + 命盘/事盘双库」 + AI 分析起课时间修复(Win#17)

- **性质：纯前端**（无 Java/jar 改动）。Windows 同步下列 `.js` → **重建前端包**（`npm run build && npm run build:file`）即可，**无需重编 jar**。
- **改了什么（前端）**：
  - 奇门 `components/dunjia/`：`DunJiaCalc.js`（`birthToYearGan` 按立春算生年干 + `CHART_CATEGORY_OPTIONS`）、`DunJiaFaCalc.js`（`computeProtect` 改读 `pan.faRelatedPeople`、删「示本盘年干」占位、全局兜底 `window.__horosa_qimen_related_people`）、`DunJiaMain.js`（左栏「相关人员」多选 + 「盘类」命盘/事盘选择器 R2C2 + stamp pan + `saveAsMingChart` 恒弹新增星盘抽屉 + `restoreFromCurrentChart`）。
  - 共享（均 guarded、占星零回归）：`models/astro.js`（openDrawer chartadd 透传 record）、`models/user.js`（newCurrentChart honor birth/zone/gender/经纬度）、`components/user/ChartAddFormComp.js`（透传 payload）、`utils/aiAnalysisContext.js`（regenerate/三式合一 路径补 stamp faRelatedPeople）。
  - **Win#17 修复**：`components/aianalysis/AIAnalysisMain.js`（选「起课/命盘时间」即刷新为「此刻」，此前误用组件 mount＝打开软件的时刻）。
- **零回归**：命盘走正常命盘管理、`payload.qimen` 占星不写不读；占星新增/编辑命盘、其它技法事盘行为不变。
- **Win#16（DeepSeek 思维链超时）/ Mac#10（装包安装失败）** 的修复随 v2.5.6 批次（已并入 main，`fb744a9`：AI#16 + Mac 装包优雅降级，**含已重编 jar → Windows 需同步该批后端 + 重编**）。
- 为什么/坑：见 `实现说明 §奇门法奇门叠加层` + `docs/奇门遁甲-法奇门叠加层-实现详解.md §六`。

---

## 紫微斗数 · 全面增强 P0–P2（杂曜显示 / 流派四化表 / 运限流曜 / 格局详情 / 新格局 / 天伤天使）

- **性质：前端为主（P0/P1 纯前端）+ 后端少量（P1-D/E + P2 改 `astrostudycn`，已重编 `astrostudyboot.jar`）。**
- **改了什么（前端，必重建包）**：
  - `astrostudyui/src/components/ziwei/`：`ZWHouse.js`（主四化盘补显杂吉/杂凶 starsOthersGood/Bad；十二神 starsSmall 放左下角「纳音格」`drawSihuaSmallStars`）、`ZWLuckPanel.js`（流曜下沉全层 + 流年「流将前/流岁前」+ 小限阴阳顺逆开关）、`ZWPatternPanel.js`（格局命中详情展开 + `opToText`）、`ZiWeiInput.js`（显示开关 + 四化流派 Select + 流派设置 Collapse + 自定义 Modal）、`ZiWeiHelper.js`（`resetHuaMap`/`getFlowJiangSui`/显示开关读取/`getActiveSiHuaGan` 接入）、`ZiWeiMain.js`（快照「四化流派」行 + `genParams` 非默认流派附 `sihua`）、新增 `ZWSihuaCustomModal.js`。
  - `constants/ZWConst.js`：`SiHuaTables`（beipai=现状默认 / zhongzhou=中州 / custom）+ `ZWSchool` + `getActiveSiHuaGan`/`refreshActiveSiHua`（保留 `SiHua.gan` 兼容垫片）。
  - `layouts/app.less`：格局详情、自定义四化表编辑器、流派 Collapse、流年神煞 chips 样式（全走 `--horosa-*` 变量）。
  - 新增单测 `components/ziwei/__tests__/ziweiEnhance.test.js`。
- **改了什么（后端，随 jar 重编带上）**：`astrostudycn/.../model/ZiWeiPattern.java`（detect 输出 conditions/breakers/logic；新 op `inOpp`/`sandwichHua`；`huaHouse` 优先用 `chart.mySihua`＝流派，回退全局）、`model/ZiWeiChart.java`（`setupStarsTianShangShi`：天伤守交友宫=命前7宫职、天使守疾厄宫=命前5宫职）、`helper/ziweige.json`（34→40 格局：清白格/泛水桃花/风流彩杖/羊陀夹忌/火铃照命/巨火擎羊）、`helper/zwrules.json`（RuleStars 35→108：补杂曜/神煞/十二神判语）。
- **Windows 必须做什么**：
  1. 同步上述前端 `.js`/`.less` → **重建前端包**（`npm run build && npm run build:file`）——P0/P1 大部分靠前端，单同步 jar 不生效。
  2. 同步上述 4 个后端文件 → **重编 fat jar**：`mvn -o -f astrostudycn/pom.xml install -DskipTests && mvn -o -f astrostudyboot/pom.xml clean package -DskipTests`；`javap`/`unzip` 验 `ZiWeiPattern.class` 含 `inOpp/sandwichHua`、`ZiWeiChart.class` 含 `setupStarsTianShangShi`、`ziweige.json`=40 格局、`zwrules.json` RuleStars=108；重启后端。
- **零回归保证**：四化流派默认 `beipai`＝现状写死表逐字一致；`genParams` 仅在非 beipai 时附 `sihua`（默认缓存键不变＝同一份盘）；杂曜显示默认开/十二神默认关；存档不落流派字段。
- **为什么/坑**：见 `实现说明 §紫微 全面增强 P0–P2` 与 `docs/紫微斗数-全面增强计划-P0-P3.md`。

---

## 奇门遁甲 · 法奇门叠加层（荀爽：化解 / 用神 / 取象 — **纯前端，无需重编 jar**）
- **改了什么**：新增 `astrostudyui/src/components/dunjia/DunJiaFaCalc.js`(分析引擎) + `DunJiaFaDoc.js`(判语库)；`DunJiaMain.js` 加「化解」「用神」两右栏 Tab + 神煞判语 hover + 地支/宫名取象 hover；`DunJiaCalc.js buildDunJiaSnapshotText` 追加法奇门 8 段；`QimenXiangDoc.js` 加地支/八卦宫取象；`aiExport.js` qimen 段表 +8。
- **Windows 必须做什么**：**纯前端，无 Java/Python 改动、不重编 jar**。同步上述 `.js` 后 `npm run build && npm run build:file` 即可；起盘服务(kinqimen)与 jar 都不变。
- **为什么/坑**：详见 `实现说明 §奇门遁甲·法奇门叠加层` 与 `docs/奇门遁甲-法奇门叠加层-实现详解.md`（六害化解以荀爽视频 docx 为准、八神勾雀→虎玄归一、AI 四同步只走 `buildDunJiaSnapshotText` 一个 builder）。

---

## 总则（每次同步都先看）

1. **两个仓库是平台分叉，不是同一份代码。** macOS 端在
   `Horosa-Web-App-comprehensively-improved-MacOS`；Windows 端是独立仓库。**共享的是
   `Horosa-Web/`（前端 `astrostudyui` + 后端 Java `astrostudysrv` + Python `astropy`/`vendor`）**；不共享的是
   `Horosa_Desktop_Installer/`（Tauri 外壳 + 打包链路）与 `runtime/`（平台运行时）。同步时**只搬 `Horosa-Web/` 的业务改动**，外壳/运行时各自维护。
2. **判断一次改动要不要重编后端**：看改动是否落在 `Horosa-Web/astrostudysrv/**`（Java）。是 → **必须在 Windows 重编 `astrostudyboot.jar`**（见下，这是最容易漏的）。只动前端 `astrostudyui/**` → 只需重建前端包。
3. **判断要不要重建前端**：动了 `astrostudyui/**` → `npm run build` 然后 `npm run build:file`（**顺序执行，勿并行**，两者都写 `src/.umi-production`）。
4. 同步后按每条下面的「验证」自检，再走 Windows 自己的发布链路。

---

## v2.5.6（2026-06-04 本地已改·待发）AI 分析 #16 DeepSeek reasoner 多轮 — **Java 改 → Windows 必重编 jar**

> Windows issue **#16**「深度思考思维链与 DeepSeek 兼容性差,多轮后首次请求易失败/空,需重试到缓存命中」。**真因不是超时**:① 后端丢弃 `reasoning_content`(思考期界面零输出被当失败)② deepseek-reasoner 被误发 `temperature`(可 400)。共享代码,Windows 同步即修。

### Windows 必做
1. **后端(Java,改了 → 必重编 jar)**:同步 `Horosa-Web/astrostudysrv/astrostudy/src/main/java/spacex/astrostudy/service/AIAnalysisProxyService.java`(+ 测试 `…/test/…/AIAnalysisProxyServiceTest.java`),然后
   `mvn -f astrostudy/pom.xml install -DskipTests && mvn -f astrostudyboot/pom.xml clean package -DskipTests`;`javap -p` 验 fat jar 内嵌 `astrostudy-1.0.0.jar` 有 `extractOpenAIStreamReasoning` / `isReasoningModel` / `stripReasoningUnsupportedParams` / `sendStreamWithRetry`,再 stop+start 重启 :9999。
   - 改了什么:① `extractOpenAIStreamReasoning` 取 `delta.reasoning_content`(回退 `delta.reasoning`),流式发独立 `reasoning` SSE 事件;Ollama 原生口同取 `message.thinking`。② 新 `isReasoningModel`(广义:deepseek-reasoner/*-r1/reasoning|thinking,**与前端 aiAnalysisProviders 一致**),`buildOpenAIChatBody` 对其**不发** temperature/top_p/presence/frequency/logprobs(`stripReasoningUnsupportedParams`);`isOpenAIReasoningModel` 只决定 max_completion_tokens(deepseek 仍 max_tokens)。③ 4 个 stream 站点改走 `sendStreamWithRetry`——**仅首字节前**(连接/429/5xx)指数退避+jitter 重试、尊重 Retry-After,**已出 token 的流绝不重试**(防重复计费)。④ `readErrorBody` 截断 1000→4000 字(透传上游真因)。
2. **前端**(改完 `npm run build && npm run build:file`,顺序勿并行):
   - `astrostudyui/src/services/aianalysis.js`:`requestAIAnalysisChatStream` 读流加「空闲看门狗」(有 token/心跳即重置,真静默 ~90s 才判卡死并给可重试提示)。
   - `astrostudyui/src/components/aianalysis/AIAnalysisMain.js`:onEvent 接 `reasoning` 增量 → 独立 `streamReasoningBufferRef` → 消息加 `reasoning` 字段(sidecar);气泡渲染**「思考过程」可折叠区**;两处 save 带上 reasoning。**reasoning 仅展示/存档,绝不回灌 messages**(DeepSeek 官方:input 含 reasoning_content = 硬 400;`getMessageList` 只取 role+content 已天然剥离)。
   - `astrostudyui/src/utils/__tests__/aiAnalysisProviders.test.js`:加 `isReasoningModel` 用例。

### 验证
- 后端:`mvn -f astrostudy/pom.xml test -Dtest=AIAnalysisProxyServiceTest`(20 绿,含 reasoning 解析 / reasoner 不带采样参数 / max_tokens)。
- 前端:`cd astrostudyui && npm test`(222 绿)+ `npm run build` 绿。
- **真机**:需 DeepSeek API key 验「deepseek-reasoner 多轮、首次未缓存也能逐字出思考过程+答案、不再失败/空」(本地无 key,Mac 端未活测此项)。
- **发布**:jar 变而 app 版若不变 → **必 bump runtimeVersion**(updater 按版本串判重下)。

---

## v2.5.5 / runtime1（2026-06-04）发布汇总 — **Java 0 改动 → Windows 仅同前端 + Python(测试夹具)+ preflight 脚本**

> macOS 端 v2.5.5 已发。本次为体验/流畅度 + 测试夹具修正,**无任何 Java/算法/命盘数值改动**(`astrostudyboot.jar` 维持 v2.5.4 基线,Windows **不需重编 jar**)。`runtimeVersion` 仍 bump 到 `2.5.5-runtime1`(前端打包进 runtime,用户更新即收到新前端)。

### Windows 必做（按下面三块各自同步)
1. **前端**(改完 `npm run build && npm run build:file`,顺序勿并行):
   - 天文馆投影统一 + 星宿赤道 + DPR 清晰度 → 见下方 **「天文馆 投影统一…(v11)」** 整节(原样照搬,含新增 `planetariumProjection.js`)。
   - **新增** `astrostudyui/src/components/planetarium/planetariumStarSearch.js`(点最近星 + 名称索引,纯函数)、`planetariumStarNames.js`(29 亮星中文/英文专名表)、`__tests__/planetariumStarSearch.test.js`。
   - `components/planetarium/PlanetariumBabylon.js`:加 `import { nearestPointToRay, buildStarIndex, findStarByName, starDisplayLabel }`;`updateStars` 建 `this.starIndex`;指针 `POINTERTAP` 兜底 `pickNearestStar()`(暗星可点);`flyTo` 兜底 `findStarByName` 定位无 mesh 星。
   - **新增** `astrostudyui/src/services/_requestCache.js`(同参去重 + LRU 通用工具);`services/qizheng.js` 的 `fetchKinastroQizheng` 包一层 `kinMem` LRU(48)+ 在途合并(ken `/qizhengkin/pan` 不走后端缓存 → 前端补;返回深拷贝,逐值等价)。
2. **Python(仅测试夹具/守卫,不动算法、不重启生产 srv 也可)**:
   - `astropy/tests/data/pd_calibration_corpus/golden_alcabitius_ptolemy_v253.ndjson.gz` **重生**(旧夹具自 883855d 起就与代码不一致的过期数据,导致 byteperfect 一直红但没人察觉)。重生法:读旧 golden 的 `chart_data`、用当前 PD 代码重算 `pdlist`、写回 `.ndjson.gz`(PD 代码**不动**,详见 `实现说明` §「golden stale fixture 事故」)。重生后 `pytest tests/test_pd_alcabitius_byteperfect.py` 540/540 绿。
   - **新增** `astropy/tests/test_planetarium_su28.py`。
3. **preflight 脚本**(Windows 若用同款 release_preflight):`[32]` 改为**实跑** byte-perfect 子集(默认前 12 case,`HOROSA_PD_BYTEPERFECT_LIMIT` 可调、`HOROSA_PD_PREFLIGHT_SKIP_BP=1` 跳过)——根因守卫,防过期 golden 再悄悄发布。

### 验证
- `cd astrostudyui && npm test`(planetarium 投影 + 恒星搜索 + 全套绿)+ `npm run build` 绿。
- `cd astropy && python -m pytest tests/test_pd_alcabitius_byteperfect.py tests/test_planetarium_su28.py -q`（540 + 1 绿）。
- 手测:天文馆载入 1994-05-21 02:20 / 116e00 36n26 → 点任意恒星出信息面板;搜索「织女/Vega/天狼/Sirius」能定位高亮;七政四余来回切/重开第二次起瞬时复显。

---

## 天文馆 投影统一 + 星宿坐标 + DPR 清晰度(v11,2026-06-03)— **Java 0 改动 → Windows 仅需同前端 + Python**

> 详见 `实现说明` §11。修天文馆三问题:①星座/宫位/星宿区间**标签偏移**、②时间播放**首帧瞬跳**、③**文字模糊**。根因=前端(几何/无折射)与后端 swisseph(视位置/含折射)两套投影管线不一致 + 星宿 `ra==lon` 坐标语义 bug + 画布未按 DPR 渲染。**纯前端 + 天文馆 Python srv,不重编 jar**。

### 同步要点
- **前端**(改完 `npm run build && npm run build:file`,顺序):
  - **新增** `astrostudyui/src/components/planetarium/planetariumProjection.js`(BABYLON-free 投影核:视恒星时 + Saemundsson 大气折射 + 按日期黄赤交角,复刻 swisseph `azalt`)。
  - `components/planetarium/PlanetariumBabylon.js`:删本地 `gmstDegrees/equatorialToHorizontal/eclipticToEquatorial/projectedEquatorialItem` 改 `import`;`finishStateData` 在 `updateData` 后补一次 `updateProjectedTime`(消瞬跳/消偏移);`createSu28Sectors` **保持按 `ra`(真赤经)排序/取中点 + `labelSource{ra,decl}`(二十八宿=赤道宿度,不在黄道!)**,只新增 `type==='Fixed Star'` 过滤(剔 `fillPlanetSu28` 行星标记,免 A2 重投影后污染宿界);`Engine` 加 `adaptToDeviceRatio:true` + `resizeHandler` `setHardwareScalingLevel(1/dpr)`;`createTextPlane` 标签贴图按 DPR 超采样 + TRILINEAR。
  - **新增** `components/planetarium/__tests__/planetariumProjection.test.js`。
- **后端 Python**(同步后 `pkill -9 -f cherrypy && python astrostudy/server.py &` 重启;**不需重编 jar**):
  - `astropy/websrv/webplanetariumsrv.py`:**无 su28 坐标改动**(星宿保持后端原 ra/decl=真赤道)。⚠️ 曾误加 `_relocate_ecliptic_su28` 把星宿还原到黄道——**做错了,已删**;星宿是赤道宿度,不能标到黄道。
  - **新增** `astropy/tests/test_planetarium_su28.py`(1 例:守默认 REAL 模式星宿是真赤道 ra≠lon、decl 跨南北)。
- ⚠️ **铁律(踩过坑)**:二十八宿 = **赤道**体系(赤道宿度),按距星真赤经落在天赤道附近真实星位;**黄道**只放星座/行星/宫位。别把星宿标到黄道上。

### 验证
- `cd astrostudyui && npm test`(planetariumProjection 套全绿,总 212)+ `npm run build` 绿。
- `cd astropy && python -m pytest tests/test_planetarium_su28.py tests/test_guolao_su28_moira.py -q`(1+23 绿;后者守共享 perchart 不回归)。
- 手测(需起 preview/后端):载入 1994-05-21 02:20 / 116e00 36n26 → 暂停时星座/宫位/星宿名落在各自连线、对应星上;**二十八宿落在赤道(蓝线)附近真实星位、明显偏离黄道(黄线)**;按 1x 无瞬跳、平滑旋转;60x/1000x/回到命盘时间校准不跳;文字(东/摩羯座/海王星)清晰;天球外观正确。

---

## 汉堡量化盘(Uranian)全面补全与纠错(commit `6ecac88`,2026-06-03)— **Java 0 改动 → Windows 仅需同前端 + Python**

> 详见 [`docs/汉堡量化盘-补全与纠错.md`](汉堡量化盘-补全与纠错.md)。本批**无版本号 bump**(只搬业务改动,发版由用户单独决定);GitHub `main` 已含本 commit(`883855d..6ecac88`)。

### 同步要点
- **后端 Python**(同步后 `pkill -9 -f cherrypy && python astrostudy/server.py &` 重启;**不需重编 jar**):
  - `astropy/astrostudy/germany/midpoint.py`:`MidPoint` 加 `uranian` 开关。`uranian=True`(量化盘 `/germany/midpoint` 专用)时:中点对来源纳入 **8 颗 TNP**(`flatlib_ephem.getObject` 走 Swiss Ephemeris body 40-47)**+ Asc/MC**;无序对单算近中点;相位判断**跨 0° 归一**(`d=abs(a-b)%360; if d>180: d=360-d`);**orb 可配**;TNP 也作相位目标。**`uranian=False`(默认)路径逐字节不变 → 合盘 `modern/chartcomp.py` 复用零影响**。
  - `astropy/websrv/webgermanysrv.py`:`midpoint()` 透传 `orb` + `MidPoint(..., uranian=True)`;`_build_uranian_tnp` 返 `(out, errors)`,失败写 `tnpError`(不再静默吞)。
- **前端**(改完 `npm run build && npm run build:file`,顺序):
  - 引擎 `utils/uranianDial.js`:新增 `antiscion`/`contraAntiscion`(映点)、`planetaryPictures`(A+B−C=D 解算)、`midpointList`、`spiegelContacts`。
  - `components/germany/UranianDialMain.js`:右栏改 **`Collapse` 可收放卡片** + 数量徽标;新增行星图/中点列表/映点三面板;TNP 逆行 ℞;盘基 90/45/22.5 快捷;**中点盘按实测列宽/列高最大化**(`ResizeObserver` + `_measure`)。
  - `UranianDial.js` / `UranianModulusDial.js`:逆行 ℞ 小标 + 映点空心圈标记(`showAntiscia`)。
  - `UranianDialStyle.js`:新增持久项 `showPlanetPicture/showMidpointList/showAntiscia/openPanels`。
  - **新增** `components/germany/UranianGraphicEphemeris.js` + `AstroGermany.js` 加「**图形星历**」tab(复用 `/astroextra/ephemeris` 的 `dailyPositions`)。
  - `components/germany/AstroMidpoint.js`:AI 快照 `buildGermanySnapshotText` 增 `[行星图]`/`[映点]`/`[中点列表]` 三段(调 uranianDial.js 纯函数)。
  - `utils/aiExport.js`:`AI_EXPORT_SETTINGS_VERSION` + `AI_EXPORT_SECTION_MIGRATION_VERSION` **16→17**,germany 预设增三段(union 并入式迁移,不删用户项)。
  - `layouts/app.less`:`.horosa-uranian-panels` 右栏卡片美化(圆角/阴影/pill 徽标/等宽数字)。
- **新增测试**:`astropy/tests/test_germany_midpoint.py`(6 例);`utils/__tests__/uranianDial.test.js` +5。

### 关键不变量 / 坑
- **合盘零侵入**:`MidPoint` 默认 `uranian=False` 与历史逐字节一致;只有 `/germany/midpoint` 传 `uranian=True`。同步后务必跑 `test_germany_midpoint.py::test_composite_default_path_excludes_tnp_and_angles`。
- **TNP 字形无标准 Unicode**(U+2BE0+ 经调研证伪未编码)→ 保留二字母缩写(Cu/Ha/…),勿引外部码位。
- **图形星历高度**:按 `vh` 钳位防 Dock 遮挡;`vh` 必须在 constructor + `_onResize` 都赋值(曾因只设 `vw` 漏 `vh` 致高度卡 600)。
- **中点盘最大化**:`size = min(列宽-8, 列高-28, vh-140)`,列尺寸由 `_measure` 经 `ResizeObserver` 实测(tab 隐藏→显示时 0→真实尺寸);列为 `overflow:hidden` grid 居中,故取 min 即「不超出方框」。

### 验证
- `cd Horosa-Web/astropy && python -m pytest tests/test_germany_midpoint.py -q`(6 全绿)
- `cd Horosa-Web/astrostudyui && npx umi-test`(193 全绿)+ `npm run build && npm run build:file`
- 真栈:辅盘→量化盘→「90°中点盘」右栏可收放 + 行星图/中点列表/映点出数 + TNP 逆行 ℞ + 映点盘上空心圈 + 盘填满中间栏;「图形星历」折线填满高度;「行星中点」的中点/中点相位含 TNP 与四轴。

---

## v2.5.4 — 七政四余宿度对齐(自有恒星案三制)+ 主限法方位法引擎 + time-key 公式化 + 【v10 方位法补遗】(**P0 Java 0 改动;v10 补遗 Java 改动→必重编 jar,见下补遗段**)

> **本地标记版本**:Mac 端 v2.5.4 在本地 commit + 本地 build 中,**未发到 GitHub**(GitHub 远程仍维持 v2.5.3 已发态 `49179c8`)。Windows 端无需 mirror 发布,只需把本批 Horosa-Web 改动同步进 Windows 仓库,等用户单独签字后再各自发版本。

### 七政四余 二十八宿度(主修,详见 `docs/七政四余-宿度对齐-v2.5.4.md`)
- `astropy/astrostudy/perchart.py`:`import swisseph` + 新 `MOIRA_DISTAR_J2000`(28 距星 J2000 坐标)+ `_moira_ayanamsha` + `_moira_distar_lon(s)` + 重写 `getMoiraFixedStarSu28`(回归今制=活体距星严格岁差 / 回归古制开禧=开禧基值+岁差 / 恒星制郑式=郑氏恒星基值原值)+ `getFixedStarSu28` 路由(三制沿黄道置宿)+ `fillPlanetSu28/setPlanetSu28` 加 `byLon`。
- `astrostudyui/src/components/guolao/GuoLaoMoiraWheel.js`:命度红线加宿度带一条。
- 修复:回归今制原误用郑氏恒星冻结值 15.9(偏 ~18°),现为活体距星。**实拍核对恒星制 10 颗到角分**。
- 测试:`astropy/tests/test_guolao_su28_moira.py`(23 例)。**Java 0 改动,不需重编 jar**。

### 主限法(承前)
- 方位法 strategy 注册表 `perpredict._PD_METHOD_REGISTRY`(不动 `_byZCoreKernel`)。
- **time-key 方法论纠正**:只保留公式可证的 `Ptolemy / Naibod`(暂收敛到公式可证的 `Ptolemy / Naibod`,无清晰公式的常数不收)。前端 time-key 下拉同步只剩 2 个。
- `STATIC_TIME_KEY_SCALES = {Ptolemy:1.0, Naibod:0.9856473354}`;`_pdTimeKeyScale` 统一抽象;Naibod 表格放开。
- byte-perfect:`tests/test_pd_alcabitius_byteperfect.py` 540 case 0 偏差(Ptolemy 锁 1.0)。

### 验证
- `cd astropy && python -m pytest tests/ -q` → 36 全绿(byte-perfect 540 + matrix + catalog + 七政 23)。
- `cd astrostudyui && npx umi-test` → 188 全绿。`npm run build && npm run build:file`。
- 真栈:七政四余切「回归今制」七政落宿应符合古法(日翼/火轸/木氐…),命度红线在宿度带可见;主限法 time-key 只剩 Ptolemy/Naibod。

### 本批新增
- **方位法集**(`SUPPORTED_PD_METHODS`)—— 公开版核验方位法:`core_alchabitius` / `horosa_legacy` / `meridian` / `porphyry` / `equal_ecliptic` / `equal_hour_circle`;经 `_PD_METHOD_REGISTRY` strategy 分发,未知 method 一律 fallback `core_alchabitius`(不动 `_byZCoreKernel`)。
- **新增 5 个静态时间换算 + 1 个符号时间换算**(`pdTimeKey ∈ {Cardano, Plantiko, Wollner, SymbolicDegree, SymbolicSolarArc}` + 既有 Ptolemy/Naibod) —— 缩放常量在 `perpredict.STATIC_TIME_KEY_SCALES` 表中(由各自天文/符号定义给出,Ptolemy 锁 1.0 守字节级一致)。
- **Naibod 表格放开** —— v2.5.2/v2.5.3 时为安全起见 `AstroPrimaryDirectionChart.getTablePdTimeKey` 把 Naibod 强制降级为 Ptolemy,P0 起经 `_pdTimeKeyScale` 统一抽象 + byte-perfect 测试守卫后正式放开,Naibod 选择直接作用于表格 row 的日期换算。
- **strategy 分发重构** —— `perpredict._PD_METHOD_REGISTRY` 字典分发各方位法到对应 kernel。**`_byZCoreKernel` 800 行 Alcabitius 路径完全不动**,新方位法只是注册新 handler。未知 method 一律 fallback 到 `core_alchabitius`(护铁律①)。
- **timeKey 统一抽象** —— `perpredict._pdTimeKeyScale(time_key, chart, age)` 单点替换原 Naibod 硬编码;dynamic time-key 留 hook 给 P1。
- **前端选项扩** —— `AstroPrimaryDirection.js`(表格) + `AstroPrimaryDirectionChart.js`(盘) 两 Select Option 数组由 `SUPPORTED_PD_METHODS` / 时间钥匙白名单驱动。下拉宽度用 `dropdownMatchSelectWidth={false}` 防长 label 截断。label 字典集中到 `primaryDirectionSync.PD_METHOD_LABELS/PD_TIME_KEY_LABELS` + `getPdMethodLabel/getPdTimeKeyLabel` helper。
- **AI 四同步**:`AI_EXPORT_SETTINGS_VERSION` 15→16(`aiExport.js`),触发用户旧 export presets 回收;`aiAnalysisContext.js` 主限法 case 不再硬编码覆盖 pdMethod/pdTimeKey(透传 chartObj.params 实选,LLM 上下文跟随用户选择);`mergePrimaryDirectionChartObj` 命盘事盘储存自动带新值。
- **PD_SYNC_REV 升 v9** —— `primaryDirectionSync.js` 升 `pd_method_sync_v9`,强制旧 v8 缓存重算。

### 同步要点
- **后端 Python 改动**(`Horosa-Web/astropy/astrostudy/perpredict.py` + `perchart.py`):同步整 perpredict.py + perchart.py;改完 `pkill -9 -f cherrypy && python astrostudy/server.py &` 重启 CherryPy。**Java 端 0 改动**(`PredictiveController.java:73-80` 已 pass-through 任意字符串 pdMethod/pdTimeKey,无需重编 jar)。
- **前端改动**:`utils/primaryDirectionSync.js` + `components/astro/AstroPrimaryDirection.js` + `components/astro/AstroPrimaryDirectionChart.js` + `utils/aiAnalysisContext.js` + `utils/aiExport.js` + `utils/__tests__/primaryDirectionSync.test.js`。改完 `npm run build && npm run build:file`(顺序)。
- **新增测试**:`Horosa-Web/astropy/tests/conftest.py` + `tests/test_pd_alcabitius_byteperfect.py`(540 case byte-perfect 回归,铁律①守卫,跑 ~10 秒) + `tests/test_pd_method_matrix.py`(17 test) + `tests/test_pd_method_catalog.py`(5 test) + `tests/data/pd_calibration_corpus/golden_alcabitius_ptolemy_v253.ndjson`(25 MB,540 case 真栈 snapshot)。
- **time-key 常量**:由各自天文/符号定义直接给出(早期一个辅助标定脚本后已撤除,改为按公式实现)。

### 验证
- `cd Horosa-Web/astropy && python -m pytest tests/test_pd_alcabitius_byteperfect.py tests/test_pd_method_matrix.py tests/test_pd_method_catalog.py -v`(540 case byte-perfect == + 17 + 5 全绿)
- `cd Horosa-Web/astrostudyui && npx umi-test src/utils/__tests__/primaryDirectionSync.test.js`(6 个 PD 同步 case 全绿)
- `npm test`(全 184 + 6 PD 新增 = 190 全绿)
- preflight `[32]` 阻断「Alcabitius byteperfect 失效 / Ptolemy != 1.0 / _byZCoreKernel 改名」;`[33]` 阻断「方位法白名单漂移 / PD_SYNC_REV 未升 / Naibod 表格仍降级 / aiContext 仍硬编码」。
- 真栈手测:启动 desktop app,主限法表格 + 主限法盘下拉应当出现 `SUPPORTED_PD_METHODS` 各方位法 + Ptolemy/Naibod/Cardano/Plantiko/Wollner/符号度/太阳弧符号;默认 Alchabitius+Ptolemy 表格逐行与 v2.5.3 完全一致;切换方法 + 各 timeKey 表格能渲染、盘能画。

### v2.5.4 补遗 — 主限法全方位法 v10 (2026-06-03,P1~P4 完成;**Java 改动→必重编 jar**)
> 在 P0 基础上补全:方位法引擎 + 黄道/世俗 + 顺逆同选 + 映点/界 + 真太阳弧(表格&盘) + 主限法盘投影 + AI 四同步。time-key 收敛回 **Ptolemy/Naibod/TrueSolarArc**(只收公式可证的钥匙,守「先定义、数据只验证」铁律)。
>
> **⚠️ 真因纠正(关键)**:用户报「推运方向选了没用」的最深根源是 **Java `PredictiveController.getParams()` 只透传 pdtype/pdMethod/pdTimeKey,丢弃了 pdDirect/pdConverse/pdAntiscia/pdTerms**;而 `AstroHelper.request()` 用 **ParamHashCache(键=params 哈希,24h)** 缓存,导致 direct/converse 的 params 哈希相同 → 命中同一缓存 → 切换无效果。**修法=Java getParams 补这 4 个透传 + `_wireRev` v8→v10(让旧缓存全失效)→ 重编 astrostudyboot.jar**。这与早期 P0 的「Java 0 改动」假设不同——P0 只动 pdMethod/pdTimeKey(已透传),v10 的新开关必须补 Java + 重编。

- **新增后端文件(必同步)**:`Horosa-Web/astropy/astrostudy/pd_engine.py`(自研主限法引擎:通用球面原语/数值法 house_pos + 真太阳弧正逆 + 映点/界)。
- **Java 改动(必重编 jar)**:`astrostudysrv/astrostudy/.../controller/PredictiveController.java` getParams() 补 `pdDirect/pdConverse/pdAntiscia/pdTerms` 透传 + `_wireRev` → `pd_method_sync_v10`。重编:`cd Horosa-Web/astrostudysrv && JAVA_HOME=<JDK17> mvn -f astrostudy/pom.xml install -DskipTests && mvn -f astrostudyboot/pom.xml clean package -DskipTests`(**clean 必须**),`javap -c -p` 验内嵌 `BOOT-INF/lib/astrostudy-1.0.0.jar` 的 PredictiveController 含 pdConverse/pdDirect。
- **Python 后端改动**:`perpredict.py`(ZEngine 顺逆拼接 + 真太阳弧盘 `solar_arc_for_years` + 世俗路由) + `perchart.py`(方位法白名单 + `pdDirect` 解析) + `helper.py` + `websrv/webchartsrv.py`(**PD_SYNC_REV 升 `pd_method_sync_v10`,与前端 + Java _wireRev 对齐**)。改完重启 CherryPy。
- **前端改动文件**:`utils/primaryDirectionSync.js`(SYNC v10 + 方位法白名单 + 持久化 pdDirect 等) + `components/astro/AstroPrimaryDirection.js`(顶部**单行**工具栏:方法/度数/方向类型/向运☑顺☑逆/年数/附加☐映点☐界,无第二行) + `components/astro/AstroPrimaryDirectionChart.js`(盘右栏 + 保留进阶设置不 clobber) + `components/direction/AstroDirectMain.js`(请求链贯通 + AI 快照设置段 + tab「主/界限法」→「主限法」) + `components/astro/AstroChartMain.js`(dock label) + `utils/aiAnalysisContext.js` + `utils/localcharts.js`。改完 `npm run build && npm run build:file`(顺序)。
- **新增/更新测试**:`tests/test_pd_engine.py`(+真太阳弧逆/converse负弧/映点界) + `tests/test_pd_method_matrix.py`(+pdDirect解析/顺逆拼接/皆关回退/世俗R≠C/真太阳弧日期偏移)。注:time-key 改为按公式实现,辅助标定脚本已撤除。
- **验证**:`cd Horosa-Web/astropy && python -m pytest tests/ -q`(59 全绿) ;`cd ../astrostudyui && npx umi-test`(195 全绿) ;preflight `[33]` v10 门禁(后端 SYNC 对齐 / 方位法白名单 / pdDirect / 单行工具栏 / tab 名)。
- **真栈手测**:主限法表格下拉各核验方位法 + 度数换算 Ptolemy/Naibod/真太阳弧;选 **世俗** 时不同方位法日期应不同;Ptolemy ≠ 真太阳弧(日期不同);顺+逆同勾表格行数增;盘右栏改方法/向运盘随之重绘;默认 Alchabitius+Ptolemy 逐行不变。

---

## v2.5.3 — 替代 v2.5.2(版本号与 Windows 端统一) + 汉堡 90°中点盘 + 主限法 Naibod + 大六壬挂载修复 + 中点盘布局收尾(**Java 改 → Windows 必重编 jar**)

> **替代关系**:v2.5.3 在 v2.5.2 基础上加两个布局修复(90°中点盘中间栏底部 Dock 安全 + 左右栏小窗口独立下滑),并把版本号统一回 2.5.3 以匹配 Windows 端。Mac 端 v2.5.2 release 在 GitHub 上保留(已不为 Latest);v2.5.3 是 GitHub Latest。Windows 端版本号应该已 ≥ 2.5.3 —— 若 Windows 端 v2.5.2 已发,Windows 端同步本 Mac patch 后亦应 bump 2.5.3 以保持「同 tag 同版本」铁律。

### 同步要点(与 v2.5.2 一致 + 一处布局修)
- **新增汉堡 90°中点盘技法**(`components/germany/UranianDialMain.js` + `UranianDial.js`(折叠盘)+ `UranianModulusDial.js`(多环模数盘)+ `UranianDialStyle.js` + `utils/uranianDial.js` 引擎)。`AstroGermany.js` 增加 "90°中点盘" tab。**关键不变量**(改前读 实现说明 §9 全部 6 点):字形用 `AstroChartFont`+`AstroMsg[名]`、单一透明 hit 圈 + `pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`、`getBoundingClientRect` 求中心 + 缩放比、本命环锁定、`onSaArc` 仅在 `emit=true` 才回调防死循环、TNP 关时 `filterByTnp` 出口过滤。
- **v2.5.3 新增 — UranianDialMain 布局**:state.vh + window resize 监听 + `size=Math.max(420, Math.min(height-2, vh-260, 960))`(三方钳位防底部 Dock 遮挡)+ 中栏盘容器 `paddingBottom:24` + 左右 Col 内层 `<div>` 包 `{width:'100%', maxHeight:Math.max(380, vh-220), overflowY:'auto'}`(小窗口独立下滑)。
- **主限法表格新增 Naibod**:`AstroPrimaryDirection.js` 增加 Naibod option;`AstroPrimaryDirectionChart.js` 新增 `getTablePdTimeKey()`(Naibod→Ptolemy 钳位);`perpredict.appendDateStr` Naibod 时 `arc/0.9856473354`;`getPrimaryDirectionChartByDate` Naibod `arc*0.9856473354`(互逆,表格 byte-identical)。
- **主限法盘四角赤纬归正**(`perpredict._pdChartBuildAnglesAndHouses`):ASC/MC/DESC/IC 一律 `_pdChartEqCoords(lon, 0.0, obliquity)`(原误用地理纬度作黄纬,赤纬越界)。
- **converse**: `webpredictsrv.pdchart` 读 `data['direction']=='converse'`→`getPrimaryDirectionChartByDate(..., converse)`→`directed_arc=-current_arc`。
- **Ollama 聊天+嵌入原生口**:`AIAnalysisProxyService.chatStream` 分支前置 `"ollama"`→`streamOllamaNative`(`/api/chat`+NDJSON+`options.num_ctx`);`AIAnalysisProxyService.embeddings` 同前置→`embeddingsOllamaNative`(`/api/embed`+`options.num_ctx`);新增 `ollamaNativeBase`(去 `/v1`)+ `readNdjsonStream` + `extractOllamaEmbedVectors`。其它 provider 不变。
- **大六壬/三式合一 AI 挂载修复**:`aiAnalysisContext.regenerateLiurengSnapshot` 传 `result.liureng`+`/chart` 合并(原传 null chartObj→`buildLiuRengLayout` 返 null)。
- **六爻接入时间起卦**:进入 `TIMEPOINT_CASTABLE_SET` + 新增 `regenerateSixyaoSnapshot`+`buildTimeGua`;**仍守「永不按时间重算已存卦」铁律**(只对新时点起卦)。
- **AI 四同步**:`aiExport.js` `AI_EXPORT_SETTINGS_VERSION` 14→15 + germany 预设加 `'90°中点盘'`;`AstroMidpoint.buildGermanySnapshotText` 补 `[90°中点盘]` 段(各因子 `lon mod 90` 折叠位)。
- **NaN 护栏**:`webchartsrv` 顶部 NaN 日期→`{err:invalid_date}`;`webgermanysrv` 缺参→`{err:missing_param}`;前端 `AstroDirectMain.buildPrimaryDirectionFetchFields/buildPrimaryDirectionRequest` 也加 NaN 守。
- **AI 分析 #13(聊天/嵌入解耦)+ 高级参数**:`AIAnalysisMain.js` 顶栏加嵌入模型 Select +「参数」Popover(THINKING_LEVELS/temperature/top_p);`aiAnalysisProviders.js` 加 `applyThinkingLevel`/`isReasoningModel`。
- **中点盘 UI 收尾**(用户验收口径):Δ→`-`、TNP 全链路过滤(`filterByTnp` 在 `natalPoints/buildRings` 出口而非 request 入口)、行运/SA `renderLocOverride`、删「拖动定向」废话、saKey 入 `UranianDialStyle.DEFAULTS`。
- **验证**:`npm test`(184 绿,含 11 例 `uranianDial.test.js` + §11.2 1975 金标对拍) + `npm run build` + `npm run build:file` + 重编 jar(`mvn -f astrostudy/pom.xml install -DskipTests && mvn -f astrostudyboot/pom.xml clean package -DskipTests`,`javap` 验内嵌 `astrostudy-1.0.0.jar` 含 `streamOllamaNative`+`embeddingsOllamaNative`+`extractOllamaEmbedVectors`) + `node scripts/verifyPrimaryDirectionRuntime.js`(表格 Naibod 弧同日期异、Ptolemy 不变、四角赤纬≤23.5、converse 翻转) + preview 实测「90°中点盘 tab + 两种盘式切换 + TNP 关同步隐藏读数/中点树 + Δ 全消 + 行运地点可改 + Ollama 长上下文不截 + 小窗口左右栏独立下滑 + 盘下沿与 Dock 留呼吸距离」。
- **runtimeVersion**:`2.5.3-runtime1`(同步 app 版本归零);发布命令需 `HOROSA_FORCE_RUNTIME_UPLOAD=1`(若 tag 已占)。

---

## v2.5.2 — 汉堡 90°中点盘(双形态+8虚星) + 主限法 Naibod 选项 + 主限法盘四角赤纬归正 + AI 聊天/嵌入解耦+Ollama 原生 num_ctx + 大六壬挂载修复(**Java 改 → Windows 必重编 jar**·已被 v2.5.3 替代)

> 本版**有 Java 改动**(`AIAnalysisProxyService.java` 新增 `streamOllamaNative` + `embeddingsOllamaNative` + `extractOllamaEmbedVectors`),Windows **必须重编 `astrostudyboot.jar`**(总则第 2 条)。Python 端也有 `perpredict.py` / `webchartsrv.py` / `webgermanysrv.py` / `webpredictsrv.py` 改动(主限法 A2-A5 + NaN 护栏)。前端涉及新增 6 个文件(`components/germany/UranianDial*.js` + `utils/uranianDial.js` + `utils/__tests__/uranianDial.test.js`)+ 实现说明 §9/§10 + preflight `[29]`/`[30]`/`[31]`。

### 同步要点
- **新增汉堡 90°中点盘技法**(`components/germany/UranianDialMain.js` + `UranianDial.js`(折叠盘)+ `UranianModulusDial.js`(多环模数盘)+ `UranianDialStyle.js` + `utils/uranianDial.js` 引擎)。`AstroGermany.js` 增加 "90°中点盘" tab。**关键不变量**(改前读 实现说明 §9 全部 6 点):字形用 `AstroChartFont`+`AstroMsg[名]`、单一透明 hit 圈 + `pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`、`getBoundingClientRect` 求中心 + 缩放比、本命环锁定、`onSaArc` 仅在 `emit=true` 才回调防死循环、TNP 关时 `filterByTnp` 出口过滤。
- **主限法表格新增 Naibod**:`AstroPrimaryDirection.js` 增加 Naibod option;`AstroPrimaryDirectionChart.js` 新增 `getTablePdTimeKey()`(Naibod→Ptolemy 钳位);`perpredict.appendDateStr` Naibod 时 `arc/0.9856473354`;`getPrimaryDirectionChartByDate` Naibod `arc*0.9856473354`(互逆,表格 byte-identical)。
- **主限法盘四角赤纬归正**(`perpredict._pdChartBuildAnglesAndHouses`):ASC/MC/DESC/IC 一律 `_pdChartEqCoords(lon, 0.0, obliquity)`(原误用地理纬度作黄纬,赤纬越界)。
- **converse**: `webpredictsrv.pdchart` 读 `data['direction']=='converse'`→`getPrimaryDirectionChartByDate(..., converse)`→`directed_arc=-current_arc`。
- **Ollama 聊天+嵌入原生口**:`AIAnalysisProxyService.chatStream` 分支前置 `"ollama"`→`streamOllamaNative`(`/api/chat`+NDJSON+`options.num_ctx`);`AIAnalysisProxyService.embeddings` 同前置→`embeddingsOllamaNative`(`/api/embed`+`options.num_ctx`);新增 `ollamaNativeBase`(去 `/v1`)+ `readNdjsonStream` + `extractOllamaEmbedVectors`。其它 provider 不变。
- **大六壬/三式合一 AI 挂载修复**:`aiAnalysisContext.regenerateLiurengSnapshot` 传 `result.liureng`+`/chart` 合并(原传 null chartObj→`buildLiuRengLayout` 返 null)。
- **六爻接入时间起卦**:进入 `TIMEPOINT_CASTABLE_SET` + 新增 `regenerateSixyaoSnapshot`+`buildTimeGua`;**仍守「永不按时间重算已存卦」铁律**(只对新时点起卦)。
- **AI 四同步**:`aiExport.js` `AI_EXPORT_SETTINGS_VERSION` 14→15 + germany 预设加 `'90°中点盘'`;`AstroMidpoint.buildGermanySnapshotText` 补 `[90°中点盘]` 段(各因子 `lon mod 90` 折叠位)。
- **NaN 护栏**:`webchartsrv` 顶部 NaN 日期→`{err:invalid_date}`;`webgermanysrv` 缺参→`{err:missing_param}`;前端 `AstroDirectMain.buildPrimaryDirectionFetchFields/buildPrimaryDirectionRequest` 也加 NaN 守。
- **AI 分析 #13(聊天/嵌入解耦)+ 高级参数**:`AIAnalysisMain.js` 顶栏加嵌入模型 Select +「参数」Popover(THINKING_LEVELS/temperature/top_p);`aiAnalysisProviders.js` 加 `applyThinkingLevel`/`isReasoningModel`。
- **中点盘 UI 收尾**(用户验收口径):Δ→`-`、TNP 全链路过滤(`filterByTnp` 在 `natalPoints/buildRings` 出口而非 request 入口)、行运/SA `renderLocOverride`、删「拖动定向」废话、saKey 入 `UranianDialStyle.DEFAULTS`。
- **验证**:`npm test`(184 绿,含 11 例 `uranianDial.test.js` + §11.2 1975 金标对拍) + `npm run build` + `npm run build:file` + 重编 jar(`mvn -f astrostudy/pom.xml install -DskipTests && mvn -f astrostudyboot/pom.xml clean package -DskipTests`,`javap` 验内嵌 `astrostudy-1.0.0.jar` 含 `streamOllamaNative`+`embeddingsOllamaNative`+`extractOllamaEmbedVectors`) + `node scripts/verifyPrimaryDirectionRuntime.js`(表格 Naibod 弧同日期异、Ptolemy 不变、四角赤纬≤23.5、converse 翻转) + preview 实测「90°中点盘 tab + 两种盘式切换 + TNP 关同步隐藏读数/中点树 + Δ 全消 + 行运地点可改 + Ollama 长上下文不截」。
- **runtimeVersion 必 bump**:Java 改 → `2.5.1-runtime2`→`2.5.2-runtime1`,否则 updater 不重下 runtime。发布命令需 `HOROSA_FORCE_RUNTIME_UPLOAD=1`(若旧 runtime 已上传同 tag)。

---

## v2.5.1 — AI 分析页系统性翻新 + 13 技法接入 + 起课/命盘时间入口 + 卜卦/择日挂载 + 数算流年 + atlas 全量城市 + 紫微两 bug + 天文馆沉浸（**纯前端，无需重编 jar**）

> **本版前端部分纯前端**（`astrostudyui/**` + 一个数据资产 + 文档），**前端部分无 Java/Python 后端改动 → Windows 不需为前端重编 `astrostudyboot.jar`**（总则第 2 条）；只需 `npm run build` 然后 `npm run build:file`（顺序勿并行）。含两轮：① AI 分析页大改（挂载正确性 / 13 技法接入 / 对话 Chat 化 / 地点 atlas / 起课时间入口）；② 复审整改（下列）。详细口径见 `实现说明`「AI 分析页 大改」§1–§6。
> **⚠️ re-issue 补充（2026-06-01，runtime bump → `2.5.1-runtime2`）**：Mac 端在 v2.5.1 之上**叠加了 #14 后端修复**（本地回环不走系统代理，见下「#14」子节）→ **Mac 重编了 jar、runtimeVersion 升到 `2.5.1-runtime2`**。但**该修复 Windows 端早已在 Windows v2.5.1 完成并关闭 #14（isLoopbackTarget 即 Windows Claude 先定位）→ Windows 无需再动 Java**；本子节仅作跨平台记录与一致性核对。

### 同步要点
- **新数据资产 `astrostudyui/src/data/citiesFull.json`（~2.27MB，34299 城）**：由 `astrostudyui/scripts/build-cities.js` 从 `vendor/kinastro/tools/cities/{cities.json,china_cities.json}` 生成，已随本版 commit（Windows 直接拿到）；若 Windows 仓缺该文件，在 `astrostudyui/` 跑 `node scripts/build-cities.js` 重新生成。`GeoCoordSelector` 动态 `import()` 懒加载它（不进主 chunk）。
- **改动文件（全 `astrostudyui/**`）**：`utils/{aiAnalysisContext,aiExport,preciseCalcBridge,heluoLocal,canpingLocal}.js`、`components/aianalysis/AIAnalysisMain.{js,less}`、`components/amap/{GeoCoordSelector,GeoCoordModal}.js`、`components/user/{ChartData,CaseData}.js`、`components/comp/ChartFormData.js`、`components/astro/AstroHelper.js`、`components/ziwei/ZWHouseSangHe.js`、`components/planetarium/{PlanetariumBabylon.js,planetarium.less}`、`components/shusuan/CanPingMain.js`、`components/xq-icons/index.js`、`layouts/app.less`。**重建前端包即可**。
- **关键不变量（改前读 AGENTS §6）**：起课时间软失败走本地兜底（奇门/太乙离线不缺失）、卜卦/择日 `divTime→birth` 映射、**六爻永不按时间重算**、canping/heluo 必在 `AI_EXPORT_TECHNIQUES`、河洛 `buildSnapshotText` 须调 `liuNian`、三处 `changeGeo` 对称改、紫微 redesign 皮肤更高特异性覆盖右栏空白。
- **验证**：`npm test`（147 绿，含 horary/election mock + preset⊆techniques 断言）+ `npm run build` + `npm run build:file`；preview 起后端实测 AI 分析起课时间 7 式法就绪 / 命盘时间星盘就绪 / atlas 搜 paris+度分秒 / 紫微无空块 / 天文馆沉浸。

### #14 本地回环不走系统代理（跨平台；Mac 同步 Windows 既有修复，**Windows 无需再动 Java**）
- **背景**：开系统代理（Clash/V2Ray 等）时，启动器设 `-Djava.net.useSystemProxies=true`，JVM 把 `127.0.0.1`/`localhost` 的本地排盘出站也按系统代理走 → 代理转发回环卡顿/超时 →「本地排盘服务未就绪」、重启无效。Windows #14 即此，**Mac 同因**（同一套 `boundless` 出站代码 + 同样的 useSystemProxies）。
- **修法（已在两端落地）**：`boundless/.../net/http/HttpUriRequestHystrixCommand.java` 的 `doCmd` 对回环目标 `setProxy(null)` 直连、非回环仍 `setProxy(HttpClientUtility.getHttpHost())`；判定靠新增静态 `isLoopbackTarget(request)`（host ∈ `localhost`/`127.*`/`::1`/`[::1]`/`0:0:0:0:0:0:0:1`）。外部请求（AI 等）照常走代理，#9/#10 不受影响。
- **分工**：**Windows 端 Claude 先定位并随 Windows v2.5.1 修复、已关闭 #14**；本条是 **Mac 同步同款**（2026-06-01 re-issue）。**→ Windows 端对 #14 无后续动作**；若 Windows 仓 `HttpUriRequestHystrixCommand.java` 已含 `isLoopbackTarget` 即一致，无需重编。
- **Mac 侧已做**：改 `boundless` → `mvn -f boundless/pom.xml clean install -DskipTests` → `mvn -f astrostudyboot/pom.xml clean package -DskipTests` 重编 fat jar（`javap` 验嵌套 boundless 含 `isLoopbackTarget`）→ runtimeVersion `2.5.1-runtime1`→`2.5.1-runtime2`（存量用户经软件内更新拿到新 runtime）→ 覆盖重发 v2.5.1（`HOROSA_FORCE_RUNTIME_UPLOAD=1`）。前端另有透明重试兜底（`services/astro.js` fetchChart `retry`）。preflight 哨兵 `[27]`。
- **遗留（下版）**：Win #14 日志另现 React #130（undefined 组件，排盘后交互崩），**非 #14 本体**，已向报告者要复现，留下个版本定位。

---

## v2.5.0（已发）— 推运补全 + 紫微运限深化 + 金口诀解读层 + 七政四余Moira + 六壬Phase4 + 时区/DST + 启动机制稳健化（5 分支收敛）

> 本版由 4 个 macOS 分支收敛发布。**关键:含后端 Java/Python 改动(推运补全)→ Windows 必须重编 `astrostudyboot.jar`**(见总则第 2 条);前端改动多,必须 `npm run build` 然后 `npm run build:file`(顺序勿并行)。下面先列各功能同步要点,「启动机制稳健化」细节在 A/B/C 段。

### 0. 本版各功能同步要点
- **西占推运补全 7 技法 + Balbillus + 福点整宫制**:**含后端 Java + Python 改动 → Windows 必须重编 jar**。文件:`astropy/astrostudy/{symbolicdir,yearsystem129}.py`、`astropy/astrostudy/perchart.py`(福点整宫制:`house.hsys` 须设 `const.HOUSES_WHOLE_SIGN`,否则 flatlib `inHouse` 加 -5° 偏移致落宫差一)、`astrostudysrv/**`(Java,**重编 jar**)、`astrostudyui/src/components/astro/Astro*.js`、`utils/{balbillus,planetaryAges}.js`。详解:`docs/西占新技法-逐技法实现详解-v2.5.0.md`。
- **时区/夏令时(DST)自动校正**:**新增前端依赖 `tz-lookup`**(`astrostudyui/package.json` → Windows `npm install` 会带上);`utils/timezone.js` + `components/comp/DstZoneIndicator.js` + 三表单(ChartFormData / ChartData / CaseData)。纯前端,重建前端包即可。
- **金口诀解读层 / 七政四余 Moira**:纯前端(`components/jinkou/**`、`components/guolao/**`、`components/taiyi/**`、`components/liureng/LRConst.js`),重建前端包即可。
- **紫微运限深化(运限/格局两 Tab)+ 六壬 Phase4(起课法/换将/分昼夜)**:**紫微含后端 `astrostudycn` Java 改动 → Windows 必须重编 jar**;六壬纯前端。完整同步清单见下 D 段。
- **启动机制稳健化**:根治「端口被占用→用不了 / 打开后显示后端未启动」。机制详解 [`启动机制稳健化-端口与就绪.md`](启动机制稳健化-端口与就绪.md)。**设计铁律:全部增量式,只在「今天本来就会坏」的失败路径触发,成功路径与今天逐字节一致。** 详见下 A/B/C 段。

### A. 启动稳健化·共享前端(随上面前端包一起重建)
- **新增** `astrostudyui/src/utils/serviceStatus.js`(全局在线/离线态 + 严格离线判定)、`astrostudyui/src/utils/chartFetch.js`(排盘裸 fetch 透明重试薄包装)、`astrostudyui/src/components/common/ServiceStatusBanner.js`(非阻塞重连横幅)。
- **改** `astrostudyui/src/utils/request.js`:加 `fetchWithRetryConnRefused`(`request()`/`requestRaw()` 的 fetch 经它——拿到响应即置在线;仅当传 `opts.retry` 且「后端不可达」(`TypeError`)时退避重试;最终不可达置离线)。**SSE `requestStream` 绝不接入重试**(防双发 / 重复计费)。
- **改** 四引擎排盘主路径:`components/dunjia/DunJiaCalc.js`、`components/taiyi/TaiYiCalc.js`、`components/jinkou/JinKouCalc.js`、`services/qizheng.js` 的裸 `fetch(buildKentangEndpoint…)` → `fetchChartWithRetry(…)`;其 `request()` 兜底加 `retry: { retries: 2 }`。
- **改** `layouts/app.js`:挂载 `<ServiceStatusBanner />`(与现有 `<UpdateNotifier />` 并列)。
- **改** `astrostudyui/scripts/warmHorosaRuntime.js`:加 `HOROSA_WARM_MINIMAL=1` 最小热身模式(仅 `/chart`,供启动期有界同步热身)。
- **验证**:`npm run test`(或 `umi-test`)全绿(mac 端本轮 140/140);构建后随便排个盘正常;杀掉本地后端→顶部出现「服务连接中断…」横幅、恢复请求后自动消失;save / AI / SSE 故意失败时**不**重试(无双提交/双计费)。

### B. 启动器 / 脚本逻辑(Windows 在自己的启动器里**镜像同等语义**,代码不共享)
> macOS 端落在 `Horosa-Web/start_horosa_local.sh` + Tauri `main.rs`;Windows 启动器是独立实现,需把下列语义搬过去。
- **端口冲突可重试**:端口被占 / 子进程 bind 失败 → 启动器以**可区分的失败信号**(mac 用 `exit 3`)上报;外层(mac 在 `main.rs`)**换一对全新空闲端口重试,最多 5 次**;**web / 静态服务器端口绝不参与重试环**(铁律:否则会关掉刚起的静态服务器→导航连不上,即 v2.4.0 `[9]E` 同类回归)。
- **卡死自家后端精准回收**:启动前若自家 PID 文件指向的进程仍存活,**经命令行签名核实是自家后端**(含 `astrostudyboot.jar` / `webchartsrv.py` + `-Dhorosa.runtime.owner` 标记)才 `kill -9` 续启,否则维持失败、**绝不误杀**。Windows 用 `tasklist`/`wmic` 查命令行。
- **就绪前最小同步热身**:就绪后、导航前同步跑一次最小 `/chart` 预热(`HOROSA_WARM_MINIMAL=1`),**严格非致命 + 有界**(超时即照常导航)。防 Spring 懒加载下首次排盘打冷 bean 弹「未就绪」。
- **Java 启动加** `-Dhorosa.runtime.owner=horosa-desktop`(供回收识别)。
- **curl 缺失兜底**:就绪 HTTP 探测在无 curl 时改用内置 python urllib,**绝不静默放行**(否则就绪坍缩成「仅端口监听」)。
- **铁律**:bind 错匹配只用精确 token(`Address already in use` / `Errno 48` / `BindException` / `Port N was already in use`),**绝不用裸 `port`**(否则 Spring banner / `--server.port=` 等正常输出会被误判为端口冲突)。

### C. macOS 专属(Windows 不照搬代码,只镜像语义)
- `Horosa_Desktop_Installer/src-tauri/src/main.rs`:`start_runtime_with_port_retry` / `error_is_port_conflict` / `PORT_RETRY_MAX` + 调用处。Windows 在其等价启动器里实现「失败→换口重试、web 不入环」。
- 单实例:**Mac 不加插件 / 不设 `LSMultipleInstancesProhibited`**(会破坏更新换版);若 Windows 双开是真问题,用 handoff-aware 的 `requestSingleInstanceLock`(更新换版时放行)。
### D. 紫微深度增强(运限/格局) + 六壬 Phase4 —— 共享 Horosa-Web(前端 + 紫微后端 astrostudycn,需重编 jar)

> 机制细节：[`紫微斗数-深度增强-运限格局-v2.5.8.md`](紫微斗数-深度增强-运限格局-v2.5.8.md)。
> **性质：共享 `Horosa-Web/` 改动（前端 `astrostudyui` + 后端 `astrostudycn`）→ Windows 必须同步，且因动了 Java 必须重编 `astrostudyboot.jar`。** 另含六壬 Phase4(纯前端 castOverride:起课法/换将/分昼夜,文件 `components/lrzhan/LiuRengMain.js`、`components/liureng/{LRCommChart,LRConst}.js`、`utils/aiAnalysisContext.js`)。

### 改了什么
- 紫微右栏新增 **「运限」「格局」两个 Tab**。运限做成**八字大运式级联横滑条**（大限▸流年▸流月▸流日▸流时 + 小限独立段），逐层点击向下钻取；选中层在中宫盘的「流命宫」外宫加金色描边环（**本命/大限态盘面像素级不变**）。格局=自动识别命中格局（34 格，公版古籍原创短义），卡片从顶部起排。
- 后端 `/ziwei/birth` 现返回 `patterns[]`；新增 `/ziwei/luck`（服务端等价实现，UI 当前走前端计算、此端点作 API/AI 备用）。
- 修 `ZiWeiHelper.getSmallDirectioinHouse` 女命分支历史 bug（`(idx-startidx)`→`(startidx-idx)`）。
- AI 挂载/导出/命盘储存均带 `[来因宫]`+`[命中格局]`（`buildZiWeiSnapshotText` + `aiExport.js` ziwei 预设）。

### Windows 必须做什么
1. 同步 `Horosa-Web/astrostudysrv/astrostudycn` 的：**新增** `model/ZiWeiLuck.java`、`model/ZiWeiPattern.java`、`helper/ziweige.json`、`helper/ziweiliuchangqu.json`；**改动** `controller/ZiWeiController.java`、`helper/ZiWeiHelper.java`。
2. 同步 `Horosa-Web/astrostudyui/src` 的：**新增** `components/ziwei/ZWLuckPanel.js`、`components/ziwei/ZWPatternPanel.js`；**改动** `components/ziwei/{ZiWeiMain,ZWChart,ZWHouse,ZWHouseSangHe,ZWCommHouse,ZiWeiChart,ZiWeiHelper}.js`、`utils/aiExport.js`、`layouts/app.less`。
3. **重编 `astrostudyboot.jar`**（动了 Java，铁律）：`cd Horosa-Web/astrostudysrv && mvn -f boundless/pom.xml install -DskipTests && mvn -f astrostudy/pom.xml install -DskipTests && mvn -f astrostudycn/pom.xml install -DskipTests && mvn -f astrostudyboot/pom.xml clean package -DskipTests`，`javap` 验 `ZiWeiController.luck()` / `ZiWeiLuck.build` / `ZiWeiPattern.detect` + 两 JSON 进 `BOOT-INF/lib/astrostudycn-*.jar`。
4. 重建前端：`npm run build` 然后 `npm run build:file`。

### 验证
- `release_preflight.sh [12]` 全 PASS（源齐全 + 女命分支修正 + 两 TabPane 已挂 + jar 含三新类两 JSON）。
- `npm test` 140 全绿（含 aiExport / aiAnalysisContext）。
- 预览董盘 `1985-02-13 22:38 女 +08:00 119e18 26n06`：运限 大限12·流年10·流月12·小限90 级联钻取、选中层流命环落位；格局命中「府相朝垣(富贵·破)」顶部起排；本命/大限态盘面与改前像素级一致；明暗双主题均无重叠。
- ⚠️ 紫微坑：① 后端 `getDouJun(month,timezi)` 是月名查表，斗君宫 index 用 `(子斗支+流年支)%12`，传地支会 NPE；② 紫微 `houses[]` 下标≠固定地支位，「地支→houses 下标」必须搜 `houses[].ganzi.charAt(1)`，禁用 `DIZI.indexOf`。

---

## v2.4.0（重发补丁,版本号不变）— 热修「更新后卡启动页 / 不进主界面」(真因 cleanup_state 误杀静态服务器)

> 发布后真机发现此 bug,**版本号保持 2.4.0、覆盖重发原 GitHub release**(非 2.4.1)。**前两次误诊(快路径、模态弹框)没修好,靠真机实测定位。** 机制:[`更新后卡启动页-真因cleanup_state误杀静态服务器-v2.4.0.md`](更新后卡启动页-真因cleanup_state误杀静态服务器-v2.4.0.md)。

**性质:macOS 专属(Tauri 外壳 `main.rs` + `web_shutdown`/静态服务器实现)。共享 `Horosa-Web/` 零改动 → Windows 不必同步代码、不必重编 jar。**
- **真因**:`runtime_bootstrap` 的 `first_launch_after_update` 分支里调 `cleanup_state(&app)`,它把本次刚 `start_static_server` 起的静态服务器(web_port)`web_shutdown.store(true)` 关掉 → `emit_ready` 导航的 `frontend_url` 连不上 → 停启动页 + 按钮死(实测 curl web_port=000、进程零监听)。普通启动不走此分支故正常。
- **修法**:删掉首启分支里的 `cleanup_state` 调用(顺手去掉同路径阻塞式 MessageDialog,防御性)。
- **Windows 怎么办**:**只要 Windows 没有「更新后卡启动页/不进主界面」症状,无需动作**;若有,排查其首启路径是否在起好本地 web/静态服务后又把它关掉。

---

## v2.4.0（已发 2026-05-30）— 西占技法批量补全(6 技法全链路 AI) + 更新后自启修复 + orbs 存档

> 逐技法实现详解(校对用):[`西占新技法-逐技法实现详解-v2.4.0.md`](西占新技法-逐技法实现详解-v2.4.0.md);更新自启:[`更新后自启修复-v2.3.2.md`](更新后自启修复-v2.3.2.md)(文件名沿用旧标签,实际随 2.4.0 发)。

### A. 共享后端/前端(Windows **必须**同步,含**重编 `astrostudyboot.jar`**)

- **Java `astrostudysrv`(改了 → Windows 必须重编 jar)**:
  - `astrostudy/.../controller/PredictiveController.java`:新增 `/predict/dist`(界推运)、`/predict/agepoint`(年龄推进点)路由。
  - `astrostudy/.../controller/AstroExtraController.java`:新增 `/astroextra/greatconj`(木土大合相,仅 startYear/endYear 参数,不走 getBaseParams)。
  - `astrostudy/.../helper/AstroHelper.java`:加 AgePoint/Distribution/GreatConj 常量 + getter。
  - `astrostudycn/.../controller/ChartController.java`:`getParams()` 白名单加 `orbs`/`orbScale`(容许度透传)。
  - 重编(JDK17):`mvn -f astrostudy/pom.xml install -DskipTests && mvn -f astrostudycn/pom.xml install -DskipTests && mvn -f astrostudyboot/pom.xml clean package -DskipTests`。**`clean` 必须**(否则复用 5/28 旧 astrostudy/astrostudycn 依赖 jar——本轮真踩:fat jar 20:08 重打但内嵌 astrostudy-1.0.0.jar 还是 5/28,缺路由)。**验证用 `javap`(看 dist/agepoint/greatconj 方法在)而非内嵌 jar 的 mtime——内嵌 mtime 是 Maven reproducible-build 固定戳(5/28),不反映内容新旧。**
- **Python `astropy`(共享,同步)**:`astrostudy/perpredict.py`(`getDistributions`/`getAgePoint`,模块级 `from astrostudy.termdirection import TermDirection`)、`astrostudy/agepoint.py`(**新建**,Koch 宫 `swisseph.houses_ex2(...,b'K')`)、`astrostudy/astroextra.py`(`compute_great_conjunctions`,cap≈3400年)、`websrv/webpredictsrv.py`(`dist`/`agepoint` 端点)、`websrv/webastroextrasrv.py`(`greatconj`)。`flatlib-ctrad2` 的 object.py/arabicparts.py 亦有改。
- **前端 `astrostudyui`(共享,重建前端 `npm run build` + `build:file`)**:6 技法全链路 AI——`utils/astroAiSnapshot.js`(buildDodeca/Dispositor/LifespanSection)、`utils/aiAnalysisContext.js`(distributions/agepoint wired technique)、`utils/aiExport.js`(**六张登记表** + auxchartMap/extractor，见逐技法详解 §4-6)、`components/astro/{AstroDodeca,AstroDispositor,古典寿命引擎,AstroDistributions,AstroAgePoint}.js`、`components/mundane/MundaneMain.js`、`components/divination/DivinationChartShell.js`(buildAiSnapshot prop + 刷新事件)、`utils/divinationCaseSave.js`(payload.aiSnapshot)、orbs 存档(`models/user.js`/`utils/localcharts.js`/`models/astro.js` 镜像 after23NewDay)。**勿改坏 pdMethod/主限法**。
- **验证**:`npm run build` + `build:file` 绿;`npm test` 29 套 140 全过(关键自检 `aiAnalysisContext.test` 技法 missing 契约 + `aiExport.test getAIExportAuditMatrix` 每技法六表齐)。

### B. Mac 专属(Windows N/A)— 更新后无法自动打开修复

**性质:macOS 专属(Tauri 外壳 `src-tauri/src/main.rs`),Windows 更新流不同。**
- **真因**:更新后首启被强制全量慢校验(`fast_path_enabled = !first_launch_after_update && …`),fast-path 标记只在整轮成功后才写;冷首启像卡死被强退→标记没写→下次又全量→反复(实测三启 trusted=0/0/1)。该全量冗余(`apply_update` 已 `verify_sha256`)。
- **修法**:对已验签 runtime 在 `start_runtime` 前预写标记 + 取消首启强制全量。
- **Windows 怎么办**:**只要无「更新后首启反复卡」症状,无需动作**;若有,按同思路改 Windows 自己 updater,**代码另写勿照搬 mac main.rs**。

---

## v2.3.1（发布中）— 更新后启动卡顿修复 + #10「服务不稳定」(SSE 并发竞态 + SSE 标志跨请求污染)

> 机制细节:[`服务不稳定-SSE并发与签名污染修复-v2.3.1.md`](服务不稳定-SSE并发与签名污染修复-v2.3.1.md)(#10)、[`更新后启动卡顿修复-v2.3.1.md`](更新后启动卡顿修复-v2.3.1.md)(更新卡顿)。

**性质:#10 全在共享后端 `astrostudysrv`(Java)→ Windows 必须重编 `astrostudyboot.jar`。更新卡顿部分是 Mac 外壳/启动脚本,Windows 各自维护对应实现。**

- **改了什么(#10 · 共享 · 必须同步)**:
  - `astrostudy/src/main/java/spacex/astrostudy/service/AIAnalysisProxyService.java`:新增线程安全内部类 `SseChannel`,收口**所有** SSE emitter 写(`send`/`complete`/`completeWithError` 单锁串行化 + `closed` 幂等);心跳与读流不再 race、**心跳不再自行 complete**(收尾统一在 `chatStream`)。修 AI「几句话后停止」。**保留** #8 的 `QueueLog.error` 一级异常日志 + `keep-alive` 心跳帧。
  - `boundless/src/main/java/boundless/spring/help/interceptor/RequestHeaderInterceptor.java`:`preHandle` ① 非 `REQUEST` dispatcher type **早返回**(免 async re-dispatch 用空 body 重复验签 → 消除 `signature.error`);② `REQUEST` 进来先 `TransData.setSSE(false)` **归零**(`__sse__` 存在 request 对象 attribute、Tomcat 复用 request 对象会残留 → 污染后续排盘/predict 的 `complete()`/`afterCompletion` 走 event-stream 分支)。需 `import javax.servlet.DispatcherType;`。
- **Windows 必须做什么**:同步上面两个 `.java`(共享路径完全一致)→ **JDK17 重编 `astrostudyboot.jar`**(`mvn -f boundless install → astrostudy install → astrostudyboot clean package`;gotcha #10,`clean` 必须)→ 替换 Windows 运行时 bundle 的 jar。**前端无改动、不重建前端包。**
- **更新卡顿部分(Mac 外壳/脚本 · Windows 自行对应)**:`Horosa_Desktop_Installer/src-tauri/src/main.rs`(更新标记「读取即消费」+ 首启 `emit_indeterminate_progress` 提示 + mongo 一律 skip ping)、`Horosa-Web/start_horosa_local.sh`(pid 判存活 `prune_stale_pid_file` + warmup 后台非阻塞 + 轮询 0.2s 与 trusted 解耦)。Windows 端若有相同的「更新后首启慢路径 / 残留 pid 误拦 / 更新标记残留」机制,在 Windows 对应启动器/脚本做同样修复;无对应实现则跳过。
- **验证**:重编后起服务,三套全过 = 功能零降级且验签未破坏 —— `verify_kentang_runtime_endpoints.py --root http://127.0.0.1:8899`(17 引擎 200)、`HOROSA_SERVER_ROOT=http://127.0.0.1:9999 node astrostudyui/scripts/verifyHorosaRuntimeFull.js`(exit 0)、`… verifyPrimaryDirectionRuntime.js`(exit 0,即 `/predict/pd`)。有真实 provider key 时:AI 长流完整不截断、排盘与 AI 交错不再 `signature.error`。
- **版本**:`2.3.1 / 2.3.1-runtime1`。

---

## （待发布·v2.3.0 同批·分支 `feature/heluo-school-interp`）河洛理数：取化工法（左栏选项）+ 运盘节气 label + 命运篇判断补全

> ⚠️ macOS 端**已实现、尚未发布**（分支 `feature/heluo-school-interp`）。纯前端，机制细节见
> [`河洛理数-流派与命运篇补全-v2.3.0.md`](河洛理数-流派与命运篇补全-v2.3.0.md)。先登记方便 Windows 同步。

- **改了什么**：① 取化工法做成河洛**左栏 per-技法选项**（土王寄坤艮/直取四方伯，镜像参评数古法/明法；**不入全局设置**）；② 运盘流年/流月行加**精确节气交时 label**（纯展示·不改卦序）；③ 命运篇补 5 项「可算却未显示」判断——阴阳二数命名（二十四数名）、众宗/众疾、顺/反数+季节宜、正/反对体凶、看命大法命格综合。均依《河洛理数》原文逐条审计，**主链算法零改**。
- **Windows 必须做什么**：重新同步前端 3 文件 `astrostudyui/src/utils/heluoLocal.js`、`src/components/shusuan/HeLuoMain.js`、`src/components/kinastro/KinAstroMain.js`（+ `scripts/_heluoTest.mjs`）；`npm run build` 然后 `npm run build:file`（顺序，勿并行）。**无 Java、不重编 `astrostudyboot.jar`、不重打 runtime。**
- **验证**：本机 `scripts/_heluoTest.mjs`（esbuild bundle → node）**96 断言全过**；`npm run build` 绿；preview 左栏「取化工法」可切、流年立春/流月节气 label、数名/命格/命局对体/顺逆/众宗 各行渲染（均已实测）。
- **典籍口径（已定稿）**：土用＝四立前 18 日（标准土王用事，采用·不改）；天数 39→4（「遇十用零数」规则正确）；A1 寄爻顺起**不做·已撤**（`yuanTang` 维持原始单一实现）。

---

## （待发布·分支 `feature/acg-map-upgrade`）占星地图（ACG / 地理占星）全面升级

> ⚠️ macOS 端**已本地提交、尚未发布**（分支 `feature/acg-map-upgrade`）。机制细节见
> [`acg-map-地理占星.md`](acg-map-地理占星.md)。先登记方便 Windows 同步。

**性质：前端 + Python + Java 都动了 → Windows 必须重编 `astrostudyboot.jar`。**
辅盘「占星地图」(`locastro`) 从旧的高德地图 + 迭代搜经度，整体换成 **D3-geo + 内置 GeoJSON + 赤经/赤纬解析法**。

**改动文件（都在 `Horosa-Web/`）**：
- Python：`astropy/astrostudy/acg/ACGraph.py`（重写为解析法：GMST=`sidtime`、RA/Dec=`cotrans` 真交角、四轴线全球连续+极区闭合到 MC/IC、地理参考线、Parans、Local Space、落点 `pointReport`；横线多点采样）；`astropy/websrv/webacgsrv.py`（新增 `acgpoint`）。
- Java：`controller/AcgController.java`（新增 `/location/acgpoint`）、`helper/AstroHelper.java`（`getAcg` 改 `requestNoCache` + 新增 `getAcgPoint`）。
- 前端：`astrostudyui/src/components/acg/` 改 `AstroAcg.js`，新增 `AcgD3Map.js`、`AcgPointPanel.js`、`interpretations.zh.js`、`world.geo.json`（Natural Earth 110m 开源国界，约 168KB，随源码走）。

**Windows 必做**：
1. **重编 `astrostudyboot.jar`**（动了 Java；JDK17：`mvn -f astrostudy/pom.xml install -DskipTests` → `mvn -f astrostudyboot/pom.xml clean package -DskipTests`，`clean` 必须）。
2. **重建前端**：`npm run build` 然后 `npm run build:file`（顺序，勿并行）。`world.geo.json` 会被打进包。
3. 无新增 npm/Python 依赖，无新端口（`acgpoint` 复用 `/location` 挂载）。

**验证**：辅盘→占星地图：四轴线平滑连贯（极区钩子闭合、跨180°不留缝）、白底/深底胶囊标注随明暗主题反色且**字形无描边**、参考线（赤道/黄道/回归线）可见、Parans 三态（关/日月/全部）、点击地图出落点分析；明暗主题切换地图跟随。

**关键坑（同步时照搬，勿"优化"掉）**：① 整宽横线必须多点采样（两点 `[-180..180]` 会被 d3 裁成点）；② 标注字形必须 inline `style('stroke','none')` 覆盖全局 `text{stroke}`（presentation 属性无效）；③ `getAcg` 必须 `requestNoCache`（否则改后端后同盘命中旧缓存）。详见技术文档。

---

## （待发布·v2.3.0 同批，与 ①–⑤ 合并）task⑥：辅盘新增「卜卦盘 + 择日盘」（西洋断事 + 事件盘存盘）

> ⚠️ macOS 端**已完成、已本地提交、尚未发布**（commit `d2ef43b` @ 分支 `feature/round-tasks-1-5`，52 文件 +4191/−28）。与下面 ①–⑤（`ffd0312`）**合并为同一版本发布（v2.3.0）**。先登记方便 Windows 同步，不必等发布。

**性质：纯前端（`astrostudyui/src`）零后端。** 本批里同步最简单的一项——**不动 Java/Python、不重编 `astrostudyboot.jar`、不重打 runtime**，只搬前端源码 + 重建前端包。引擎全部消费现成 `/chart` 端点字段（尊贵 / 相位含入出相 / 接纳 / 互容 / 映点 / 月空 / 日时主 / 逆行），前端只补算燃烧·角宫·月相·托勒密过滤 → 零新路由。

**新增 / 改动文件**：
- 新增目录：`src/divination/{data(17)/engine(9)/horary(6)/election(8)}`、`src/components/{divination/DivinationChartShell, horary/{HoraryMain,HoraryJudgment}, election/{ElectionMain,ElectionJudgment}}`；新增 `src/utils/divinationCaseSave.js`。
- 改动文件：`src/components/auxchart/AuxChartMain.js`（注册两子盘 TabPane+dock + `componentDidUpdate` 响应 `currentSubTab`）、`src/pages/index.js`（`auxChartTabs` 补全 `harmonic/horary/election`）、`src/utils/aiExport.js`（导出技法+设置+挂载+快照）、`src/utils/localcases.js`（`CASE_TYPE_OPTIONS`+别名加 horary/election）、`src/layouts/app.less`（`:global` 判断卡片 CSS）。

**关键变化（逐条）**：
1. **卜卦** 右栏 5 tab（裁决/征象/完成/时空/描述）：Sibly71+Dorotheus43+Sahl+Hephaistion+盗窃11步。完成 tab 把所有可能用到的征象摆出供用户自判：**光线传递明确写出「由谁在哪两星间传递」**、月亮的故事（刚离→将会）、相位全览（仅托勒密五相位）、三分法则白话解释。
2. **择日** 右栏 5 tab（总评/红线/分项/应期/建议）：13 模块 + 红线**中文分级**（严重/较重/中等/轻微）+ 0–100 评分 + 27 用事专属 + 本日逐时/未来14日扫描择优；应期相位名中文化。
3. **AI 四环节同步**：导出技法 / 导出设置（preset 含「月亮的故事」「相位全览」+ `applyUserSectionFilter` 防旧设置过滤）/ 分析挂载（`module:horary|election`）/ 快照。
4. **事件盘双向存盘**：Shell「存为事件盘」→ 事件盘库（复用 `astro/openDrawer` caseadd 管道，同六壬）；`CASE_TYPE_OPTIONS`+别名加 horary/election（`tab=auxchart`，否则 `getCaseTypeMeta` 默认落 cnyibu 路由错）；列表 `user/applyCase`（**未改、现成**）→ Shell `applyRestoreIfAny` 拉 `currentCase` 还原时间/地点/类别/设置（caseVersion 防重，六壬式拉取）；**坑**：AuxChartMain 原 `findTab()` 只读 state→加 `componentDidUpdate`(照 CnYiBuMain) 才能被 applyCase 切子盘；`index.js auxChartTabs` 原漏 harmonic/horary/election 已补。Shell 加 `_mounted` 守卫消除异步 setState 告警。
5. 删除择日右栏本命合参死代码（合参按需求归**中间栏叠盘**，属后续项）。

**Windows 端必做**：
- ✅ **同步前端源码**（上列新增目录 + 5 个改动文件 + `divinationCaseSave.js`）。纯 JS/LESS，无平台分支。
- ✅ **重建前端**：`npm run build` 然后 `npm run build:file`（顺序勿并行）。
- ⏸ **不需重编 `astrostudyboot.jar`**（没动 Java）。
- ⏸ **不需重打 Python runtime**（没动 `astropy`/`vendor`）。

**验证**：`npx umi-test src/utils/__tests__/localStorageManagement.test.js`（16/16，含覆盖新 case 类型的遍历测试）+ `aiAnalysisSelection.test.js`（3/3）；preview 辅盘 dock 出「卜卦盘/择日盘」→ 起盘出完整圆盘 + 右栏 5 tab；「存为事件盘」→ 事件盘列表见「卜卦/择日」类型 →「应用」切回对应子盘并还原时间/地点/类别；AI 导出选两盘时分段齐全（含月亮的故事/相位全览）。

**机制详见**：[`docs/horary-election-charts.md`](horary-election-charts.md)

---

## （待发布·随 task⑥ 合并）①–⑤ 修复：AI代理 Issue #9 + 六壬发三传 + 占星右栏空白块 + 风水UI + 快捷dock

> ⚠️ 本节是 macOS 端**已完成、已本地提交但尚未发布**的一轮修复（commit `ffd0312` @ 分支 `feature/round-tasks-1-5`），将与 **task⑥（辅盘加「卜卦盘」「择日盘」，另一 session 做）合并后一起发布**；**随 v2.3.0 合并发布**。先在此登记，方便 Windows 同步，不必等发布。

**改动范围**：前端（`astrostudyui`）+ Java 后端（`astrostudysrv`，**因 ① 需重编 `astrostudyboot.jar`**）+ 启动器 JVM 参数。

**关键变化（逐条）**：
1. **#9 内置 Java 走系统代理（治本）**：`boundless` `HttpClientUtility.getHttpHost()` 加 `ProxySelector.getDefault()` 回退；`astrostudy` `AIAnalysisProxyService.streamHttpClient` 加 `.proxy(ProxySelector.getDefault())`；启动器加 `-Djava.net.useSystemProxies=true`。**只加 flag 无效**（流式 JDK HttpClient 默认不走代理、`getHttpHost` 只读 `http.proxyHost` 系统属性而 flag 不填它）——三处缺一不可。
2. **六壬 / 三式合一 发三传顺序**：`components/liureng/ChuangChart.js` `getSangCuang` 把八专(isBaZhuang)移到遥克(isYaoKe)之后（按典籍 `0.基石/2.九法`：遥克第4法→八专第9法）。**六壬引擎是我们自有前端 JS，非 ken**；标准六壬与三式合一共用 `ChuangChart`，一改两修。纯前端。
3. **占星右栏 tab 下空白块**：`app.less` `.horosa-content-tabs .ant-tabs-tabpane > *{height:100%}`，内容容器填满 pane（覆盖占星/紫微/印度/果老 + 复用 AstroChartMain 的十三分盘/合盘/节气）。纯前端 CSS。
4. **风水页 UI**：选择栏对齐 + 文字间距 + 安全距离精修（语义色不动）。纯前端 CSS。
5. **快捷功能 dock**：基础 `.horosa-bottom-quick-actions` 列网格 `repeat(8)`→自适应 `grid-auto-flow:column`（兼容太乙等动态动作数）。纯前端 CSS。

**Windows 端必做**：
- ✅ **重编 `astrostudyboot.jar`**（仅 ①：`HttpClientUtility.java` + `AIAnalysisProxyService.java`），重编后**重启 Java 进程**。
- ✅ **Windows 启动器加 `-Djava.net.useSystemProxies=true`**：macOS 在 `start_horosa_local.sh` 已加；Windows 外壳不共享，需在 Electron `service-manager.js` spawn Java 处各自加（① 才算完整修复）。
- ✅ **重建前端**（`npm run build` → `npm run build:file`，顺序勿并行）：②③④⑤ 都是前端，一次重建即可。
- ⏸ Python runtime 不需重打（vendor 未动）。

**验证**：`npx umi-test src/components/liureng/ChuangChart.test.js` 期望 3/3；preview 检查 占星右栏内容填满（无 tab 下空白）/ 风水选择栏间距 / 太乙底部 dock 填满；① 真·代理需 Windows 开系统代理后在「测试连接」实测（无代理时回归不变）。

**机制详见**：[`docs/round-tasks-1-5-fixes.md`](round-tasks-1-5-fixes.md)

---

## v2.2.1 — 日界点完成版（含晚子时·时柱起干第二开关）+ ChartController 白名单 bug + AI 分析 SSE 双修复 Issue #8

**改动范围**：前端 + Java 后端（需重编 `astrostudyboot.jar`）；Python vendor 暂未动（Phase 2）。

**关键变化**：
1. **新增第二个独立全局开关「晚子时·时柱起干」**：
   - `lateZiHourMode = 'nextDay' (默认) | 'today'` （后端字段 `lateZiHourUseNextDay = 1|0`）
   - 只在 `hour ∈ [23:00, 24:00)` 影响时干；与日柱开关 `after23NewDay` 完全独立。
   - 27日 23:30 矩阵详见 `Horosa-Web/docs/global-day-boundary-v2.2.1.md`。
2. **修复 ChartController.getParams() 白名单丢字段 bug**：旧版 `getParams()` 不显式 `putAll("after23NewDay")` 导致 Java backend 永远拿默认值，本版本一并修复 + 加 `lateZiHourUseNextDay`。**Mac 端在审计中又发现 7 个同型 controller**（BaZiBirth/PaiBaZi/LiuReng/ZiWei/Nongli/JieQi/QueryChart）+ 3 个 Model（BaZiDirect/LiuReng/ZiWeiChart）也缺 `lateZiHourUseNextDay` 透传 → 全部修。Windows 同步 jar 时这一批控制器变更要一并带过去。
3. **AI 挂载**：`buildAstroSnapshotContent` 加 "排盘规则" 行，AI snapshot/导出 markdown 显式标注两个开关状态。
4. **持久化**：命盘 / 案例 schema 都加 `lateZiHourUseNextDay` 字段；保存/恢复时按用户实际选择走。
5. **jest 自检**：新增 6 个时柱开关 case，含核心新 case `after23=0 + lateZi=0 → 辛丑 戊子`。
6. **Windows Issue #8 / AI 分析"GPU 加载完后划水然后停止"修复**（`AIAnalysisProxyService.java`）：
   - **Fix 1（必须）** — catch 块第一步必须 `QueueLog.error(AppLoggers.ErrorLogger, e)` 记录一级异常，`sendEvent` / `completeWithError` 各自嵌套 `try`。修了之前"上游 Ollama 抛错 → catch 内 sendEvent 撞 `ClientAbortException` 抛 `RuntimeException` 把 `ai-analysis-chat-stream` 线程炸了 → 原始一级异常被 `safeErrorMessage` 吞掉根因黑盒"的可观测性 bug。
   - **Fix 2（治本）** — `streamOpenAICompatible` / `streamAnthropic` / `streamGemini` 三处全部包一层 `withHeartbeat`，每 15s 给 emitter 写 `: keep-alive` 注释帧，防止 Ollama 慢首 token（本地 10–60s）期间客户端/Chromium/中间件按空闲超时切断 SSE socket。心跳本身 try-catch；发现客户端断了主动 `emitter.complete()` 并停 schedule。
   - **防回归** — `release_preflight.sh` 加 [7] 哨兵：grep `QueueLog.error(AppLoggers.ErrorLogger` 与 `keep-alive` 必须命中 `AIAnalysisProxyService.java`，任一丢失阻断发布。Windows 端 `release_selfcheck.py` 建议同步同款 grep 哨兵。

**Windows 端必做**：
- ✅ **重编 `astrostudyboot.jar`**（`BaZiHelper.java`、`BaZi.java`、`NongliHelper.java`、`OnlyFourColumns.java`、`ChartController.java` 都改了）。重编后**必须重启 Java 进程**（吸取 Mac v2.2.1 教训：旧 launcher 进程残留会让新 class 形同未上线 — 用 `lsof -ti :9999` + `ps -p PID -o lstart=` 确认）。
- ✅ **重新 `npm run build`**（前端 baziLunarLocal / aiAnalysisContext / models 都改了）。
- ⏸ Python runtime 包**不需要重打**（vendor 暂未动）。
- 🔒 `release_preflight.sh` 版本门禁应升级到 2.2.1。
- 🔒 launcher version assertion 升 2.2.1。

**验证**：跑 `npx umi-test`（期望 139+ all green），preview 检查 27日 23:30 四 case 矩阵，重点验证 `after23=0 + lateZi=0 → 辛丑 戊子`（新行为）。

**机制详见**：[`Horosa-Web/docs/global-day-boundary-v2.2.1.md`](../Horosa-Web/docs/global-day-boundary-v2.2.1.md)

### v2.2.1 补充（发版前收尾这一轮——以下都要同步到 Windows）

> 机制详见 [`docs/v2.2.1-session-addendum.md`](v2.2.1-session-addendum.md)。

1. **`(1,0)` 边界四柱一致性（Java，必同步 + 重编 jar）**：`BaZiHelper.getTimeColumn`（两个重载）+ `getTimeGanziStr` + `getTimeStartGan` 共 **4 条**晚子时时柱分支,原来只写了 `after23=0 && lateZi=1` 一侧,**漏了对称的 `after23=1 && lateZi=0`**(日柱进位次日但时柱按今日干起 → 应退一位 `+9`)。补全后 `(1,0)=戊子`,与 baziLunarLocal/奇门/太乙一致(此前 Java 系技法返 庚子)。**钉定矩阵更新为 `(1,0)=壬寅 戊子`**(release notes 已改)。
2. **Moira / 金口诀 / 太乙 切换后需刷新才生效（前端，必同步）**：根因是各自 fetch 把两开关漏在 payload / client cache key 外。`guolao/GuoLaoChartMain.js normalizeChartParams`(cache key 补两开关)、`jinkou/JinKouCalc.js fetchJinKouPan`(payload 补两开关 + genGodsParams)、`taiyi/TaiYiCalc.js fetchTaiyiPan`(payload 补 lateZi)、`dunjia/DunJiaCalc.js fetchQimenPan`+`DunJiaMain getQimenOptionsKey`(已含)。后端 webqimensrv/webtaiyisrv/webjinkousrv + Java `/liureng/gods` 都已读两开关。
3. **AI 挂载之前是死代码（前端，必同步）**：`utils/aiAnalysisContext.js buildDayBoundaryMeta` 之前**定义了但从未被调用** → AI 实际看不到排盘规则。本轮在 `buildContextLayers` 加「排盘规则（日界点·晚子时）」上下文层 + `utils/aiExport.js` 导出头加同款行。之前 release notes 宣称的「AI 挂载排盘规则」现在才真正生效。
4. **AI 供应商连通性（Java + 前端，必同步）**：① `AIAnalysisProxyService.buildAnthropicBody` 的 content 块过去复用 Gemini 的 `buildTextPart`(只有 `text`)→ Anthropic 报 `messages.content: missing field type`(503),对话+测试连接全挂;新增 `buildAnthropicTextPart` 补 `type:"text"`(Mac #9)。② 前端 `AIAnalysisMain.testProfileChat` catch 把 URL 编码的裸 401 解码 + 对未登录/未配置给可操作中文提示(Mac #8)。③ `boundless/HttpClientUtility.getHttpHost` 无代理环境变量时回退读 `http(s).proxyHost` 系统属性(Win #9,**需 Windows 实测**;纯增量无属性时行为不变)。④ **Win #8 Ollama「加载后不出字」已排查 = Ollama/Windows 环境问题**(端点 `/v1` 正确、心跳+无超时已在),非应用 bug,Windows 端核查环境/GPU。
5. **软件内升级非阻塞 UX（macOS launcher 自研,Windows 壳自理；但前端 UpdateNotifier 共享）**：`main.rs` 新增 `update_check_silent`/`update_start_background`/`update_install_and_restart` + `horosa://update-*` 事件(不接管 launcher 界面);启动自动检测改 emit `update-available` 非阻塞。**前端共享件**:`components/update/UpdateNotifier.js`+`.less`(挂 `layouts/app.js`)、`utils/aiAnalysisDesktop.js` 三个 update 桥函数、`PageHeader` 设置菜单加「检查更新/关于星阙」。Windows Electron 壳的更新命令需 Win 端按同样事件/命令名自行接线。
6. **偏好设置精修（前端,纯样式/文案,必同步）**：`xq-ui` 令牌下统一 `PageHeader.less` 的 `aiSetting*` 说明卡 + 新 `about*` 样式 + 关于弹窗;不动任何数据绑定/语义色。

**本轮额外重编 jar**:Java 改了 `BaZiHelper`(getTimeColumn/getTimeGanziStr/getTimeStartGan)+ `AIAnalysisProxyService`(Anthropic type)+ `boundless/HttpClientUtility`(proxy)→ Windows 必须重编 `astrostudyboot.jar`。

**验证**:`npx umi-test` 139 green;preview 27日23:30 跑 `(1,0)=戊子` 跨技法一致;桌面壳模拟 `horosa-latest.json` 更高版本验证非阻塞卡片→后台下载可最小化→重启更新;偏好弹窗亮/暗;AI 配 Anthropic key 测试连接应成功。

---

## v2.3.0 — 全局日界点（早/晚子时换日）+ 自动更新稳定化

> 性质：**前端（`astrostudyui`）+ Java（`astrostudysrv`，4 个 Controller）+ Python（`astropy/websrv` + `vendor`，7 个引擎+service）+ macOS launcher（Tauri `main.rs`）**。
> ⚠️ **本版含 Java 改动 → Windows 必须重编 `astrostudyboot.jar`**；含 Python vendor 改动 → 重新 rsync `Horosa-Web/vendor/` 到 runtime；自动更新 P0 修复在 macOS launcher（main.rs）—— Windows Electron 壳的自动检查更新接线**属 Win 端自理**（不同 OS、不同壳）。

机制细节见 [`global-day-boundary-v2.3.0.md`](global-day-boundary-v2.3.0.md)。

### 前端 + Java（共享 `Horosa-Web/`）
- 新「设置 → 全局设置」Modal（`XQSegmented` 二选一：23点后次日 / 24点后次日），存 `app.dayBoundary`，复用 `globalSetup` localStorage。
- 新建 `utils/dayBoundary.js`：`defaultAfter23NewDay()` 实时读全局，各技法回退使用（不依赖 React/dva，纯函数）。
- **修核心 bug** `utils/baziLunarLocal.js:637` `setSect` 按 `after23NewDay` 决定（八字/河洛/参评/preciseCalcBridge 本地 nongli 受益，单测 + lunar setSect(1)/(2) 方向验证：23:30 → 己卯 / 戊寅）。
- **修核心 bug** `components/dunjia/DunJiaCalc.js` 移除 `buildGanzhiForQimen` 二次进位（避免与后端 nongli 已换日叠加成双重换日，附注释防回退）。三式合一复用 `DunJiaCalc`，自动受益。
- 各技法 `after23NewDay` 默认值统一接 `defaultAfter23NewDay()`：奇门/太乙/金口/六壬/六爻/紫微/三式/八字/河洛/参评 + `aiAnalysisContext`（3 处）。
- `fieldsToParams` 补传 `after23NewDay`：主盘 `models/astro.js`、`hellenastro/AstroChart13`、`astro/IndiaChart`、`guolao/GuoLaoChartMain`、`jieqi/JieQiChartsMain` `genParams`、`utils/preciseCalcBridge.js` `JIE_QI_YEAR_KEYS`、`utils/aiAnalysisContext.js` `buildCaseSnapshotParams`。
- `KinAstroMain.js buildPayload`（一处覆盖 shaozi/tieban/chunzi/fendjing/nanji/beiji/xianqin/cetian 等 kinastro 系）+ `WuZhaoMain` / `HuangJiMain` / `ShenYiShuMain` 各自 payload 补传。
- **Java 4 处硬编码 `false` 改读参数 → 重编 jar**：`astrostudycn/.../ChartController.java:75`、`JieQiController.java:64`、`QueryChartController.java:40`，以及 `astrostudy/.../NongliHelper.java:680`（被 `chart13`/印度盘调用）。覆盖主盘/七政底盘/紫微底盘/28宿/印度/分至/历史/中点/推运。重编链：boundless（不变可跳）→ astrostudy install → **astrostudycn install** → astrostudyboot clean package（JDK17）。

### 后端 Python vendor + websrv（rsync 同步，**无需重编 jar**，但需重打 runtime 包）

7 个技法组（详细模式见 fix 文档）：

| 技法 | 改造文件 |
|---|---|
| wuzhao（五兆） | `vendor/kinwuzhao/config.py`（gangzhi1/gangzhi 加 `after23_new_day=1` 参数 + `and` 条件）+ `astropy/websrv/webwuzhaosrv.py` 取参传引擎 |
| nanji（南极神數） | `vendor/kinastro/astro/nanji/calculator.py:465 from_solar_datetime` 加参 + `webnanjisrv.py` 传 |
| shaozi/tieban/chunzi | `vendor/kinastro/astro/shaozi/calculator.py:221 calculate_ganzhi_from_datetime` 加 `after23_new_day=1` 参数，模式 B：`if after23 and hour==23: 日期+1 算日柱`（时支保留原 hour）。一处引擎覆盖三个 service（webshaozisrv/webtiebansrv/webchunzisrv） |
| fendjing（鬼谷分定经） | `vendor/kinastro/astro/fendjing/fendjing_calculator.py:114 compute_fendjing_chart` 加参 + `webfendjingsrv.py` 传 |
| shenyishu（神易数，日柱进卦） | `vendor/shenyishu/shenyishu.py:300 Shenyishu.__init__` 加参 + `webshenyishusrv.py` 传 |
| qizheng（七政四余 kin 版） | **service 层 jd 调整**（引擎不动）：`astropy/websrv/webqizhengkinsrv.py` 算日柱前 `jd_for_day = chart.julian_day + (1.0 if dt.hour==23 and after23 else 0.0)`，shensha/get_bazi_stems_branches 用 `jd_for_day`；compute_chart 的星历 jd 不动 |
| wangji（皇极经世） | **thread-local 方案**避免深透传：`vendor/kinwangji/kinwangji/wanji.py` + `jieqi.py` 各加 `_AFTER23_LOCAL = threading.local()` + `set_after23_new_day`/`_is_after23_active`，3 处 `if hour==23 and _is_after23_active()`；`astropy/websrv/webwangjisrv.py` 在 `wanji_four_gua` 调用前 import 两个 set 函数并 set |

**豁免**（不改，避免破坏已工作的主流）：
- 奇门 kinqimen / 太乙 kintaiyi / 金口 kinjinkou 引擎内部的 `if hour==23` —— 前端 nongli/overlay 已决定日柱，引擎内部那处不影响展示。
- 京房/荆诀 jingjue（纯 seed 起卦）、太玄 taixuan（cnlunar 第三方固定 23 点换日、不可参数化）、北极 beiji（不显示日柱）、演禽 xianqin（农历定宫）：不涉及/不可控。
- 死代码/死副本：`kinastro/astro/bazi/calculator.py`、`damo`、`diqiyijue`、`liuyao_lifetime`、`kinwangji` 顶层副本、`kinastro/astro/wangji/*`（审计确认无 service import）。
- `vendor/kinastro/astro/bazi/constants.py:571` 是**时支索引**（子时 23-01 点→0），不是日柱换日，**不要动**。

### macOS launcher（`Horosa_Desktop_Installer/src-tauri/src/main.rs`）—— Windows 端不适用
自动更新 P0：接线「自动检查更新」死开关——`auto_check_updates: bool` 在 `main.rs:257/286` 定义且默认 `true`，但 setup 闭包**从不消费它**（这就是体感「自动更新不工作/不稳定」的核心）。在 setup 闭包末尾、`Ok(())` 前加 `thread::spawn`：启动延迟 10 秒，若偏好启用则静默 `resolve_update_plan`，**仅当发现新版才调 `check_for_updates`** 弹更新框，无更新/网络失败静默 `eprintln!` 写日志（避免每次启动打扰）。**需重编 launcher**（`cargo build --release`，或走完整 `npm run tauri build`）。

注：本仓自研 OTA（`reqwest` + GitHub Release + SHA256 + bash helper + `ditto` 替换 + Apple 公证装订）已确认**不迁** Tauri 官方 `tauri-plugin-updater`——自研方案承担 app + 独立 runtime.tar.gz 双更新 + 双向回滚 + 离线 pkg 兜底，官方做不到。

Windows Electron 外壳的自动更新另算（不在本仓代码内）。

### Windows 自检
1. 同步 `Horosa-Web/` 全部改动（前端 + Python vendor + Python websrv + Java 源）。
2. 重编 jar（JDK17，4 模块链：astrostudy → astrostudycn → astrostudyboot clean package）。
3. 前端：`npm run build && npm run build:file`（顺序，不并行）。
4. 启动栈，浏览器进「设置 → 全局设置」看 Modal（两个单选+当前态）；进八字页设 23:30 切换「23点算第二天/当天」下拉，日柱在 **己卯 / 戊寅**（次日 / 当天）跳变；任意命盘技法移动时间到 22:59→23:01，日柱按全局设置在 23 点边界跳变。
5. 抽查 wangji/wuzhao/shaozi 的 23:30 日柱在两个设置下不同（embedded python 直调引擎可独立验证）。

---

## v2.2.0 — 数算两新技法（邵子参评数 / 河洛理数）+ 调波盘绘制 + 风水 React 化

> 发布版本号 **2.2.0**（开发期内部标记曾用 v2.1.9；下列技术文档文件名仍带 `-v2.1.9` 但即本版内容）。

> 本版含：v2.1.8 专轮延后的两项 UI（#9 调波盘、#11 风水），以及「数算」模块两个新技法（邵子参评数 canping、河洛理数 heluo，全前端本地计算）。

**性质：前端（`astrostudyui`）+ Python（`astropy`，rsync）+ Java（`astrostudysrv`，仅 #6 AI 修复）。⚠️ 因含 Java 改动，本版**必须重编 `astrostudyboot.jar`**（#9 调波盘是 Python、#11 风水与数算两技法是纯前端；唯独 #6 的后端加固动了 Java）。数算两技法连 Python 都不涉及。**

### #9 调波盘：绘制调波盘本体（复用量化盘星盘 UI）
机制细节见 [`harmonic-chart-v2.1.9.md`](harmonic-chart-v2.1.9.md)。
- **后端 Python（rsync，无需重编 jar）**：
  - `astropy/astrostudy/thirteenthchart.py` 新增 `HarmonicChart`（与 `ThirteenthChart` 同构：逐点 `relocate(lon*harmonic%360)` + ASC/MC 变换、DESC/IC=+180、房宫 equal-30、`reinit`）。
  - `astropy/astrostudy/astroextra.py` `build_harmonic`：套用 `HarmonicChart` 后，在原有 `positions/conjunctions` 基础上**增量返回**完整盘对象 `chart`（与 `/chart` 同形）。复用现成 `/astroextra/harmonic` 端点，不新增路由。
- **前端（`build` 然后 `build:file`）**：
  - `components/auxchart/AstroHarmonicLab.js` 重写为量化盘布局（复用 `horosa-aux-module-page xq-chart-renderer-germany` + `horosa-midpoint-*` 既有 CSS）：左大盘 `astro/AstroChart value={result.chart}`，右栏调波数控件 + 两表。**最外层勿包 `Spin`**（会断开 `app.less` 填充选择器的直接子链）。
  - `components/auxchart/AuxChartMain.js`：给 `AstroHarmonicLab` 透传 `planetDisplay/chartDisplay/lotsDisplay/showAstroMeaning`。

### #11 风水：iframe → React 全重写 + 明暗 + 占屏
机制细节见 [`fengshui-react-rewrite-v2.1.9.md`](fengshui-react-rewrite-v2.1.9.md)。**纯前端，不重编 jar。**
- 新增 `components/fengshui/fengshuiEngine.js`（从 `public/fengshui/app.js` 移植的框架无关 canvas 引擎：常量/绘制/几何/判定/撤销重做/导出/快照；画布铺满工作区、图居中、纳气盘延伸出图不被裁）。
- 重写 `components/fengshui/FengShuiMain.js`（Antd 重构 + `<canvas ref>` + `ResizeObserver`→`resize` + `keydown` + AI 快照 `saveModuleAISnapshot('fengshui')`/`horosa:refresh-module-snapshot`）；**删除 iframe**。
- `layouts/app.less` 末尾 `:global { .horosa-fengshui-* }` 布局+明暗。
- **两坑**：`app.less` 是 CSS Module，全局类必须包 `:global{}`（否则被哈希）；canvas 必须 `position:absolute`（否则 in-flow + ResizeObserver 高度失控）。
- 嵌入模式本就隐藏的「项目管理/项目文件/最近/自动保存」按原样略去。`public/fengshui/` 旧独立站点无引用，可后续清理。

### 数算新技法：邵子参评数（canping）+ 河洛理数（heluo）
机制细节见 [`shusuan-canping-heluo-v2.1.9.md`](shusuan-canping-heluo-v2.1.9.md)。**纯前端本地计算，四柱来自 `utils/baziLunarLocal.js`（星阙自己的八字），不碰任何 kentang/Python 后端，不重编 jar。**
- 在「数算」既有金色技法 rail（`components/kinastro/KinAstroMain.js` `renderTechniqueRail` 内 `moduleKey==='shusuan'` 的硬编码列表）**新增两个入口**，不是另起一条 rail。
- `TECHNIQUE_CONFIG` 加 `canping`/`heluo`（`native:true`）；`fetchPan` 对 `native` 直接跳过 `postKinAstro`；`renderCenter`/`renderRightPanel` 顶部加 native 分支渲染原生组件；`constructor` state 加 `canpingMethod/canpingLiunian`。
- **邵子参评数**（金锁银匙）：`utils/canpingLocal.js` + `utils/data/canpingTiaowen.json`（五部×78）；组件 `components/shusuan/CanPingMain.js`（古法/明法开关、本命/大运/流年）。
- **河洛理数**：`utils/heluoLocal.js`（起命 天地数→卦→元堂→后天、起运 大限/流年、命运篇 元气/化工/得体等判断、爻辞查找）+ `utils/data/heluoTiaowen.json`（64卦×6爻，由 `scripts/buildHeluoData.js` 从 5 个条文 md 解析；脚本读本地 Obsidian 条文源，**仅生成的 JSON 入库**）；组件 `components/shusuan/HeLuoMain.js`（先天/后天卦象+元堂+爻辞、大限表点选联动流年、右栏命运篇判断）。
- `layouts/app.less` 末尾 `:global { .horosa-canping-* }` 与 `:global { .horosa-heluo-* }` 布局+明暗。
- 算法验证：`scripts/_heluoTest.mjs`（esbuild bundle 后 node 跑）共 72 断言全过——含算例 甲子丁卯庚申庚辰→天风姤·上九、董盘 丙戌丁酉丙寅癸巳→先天否上九/后天临六三、大限 1–45/46起、**先天/后天 5 个大限的流年逐卦逐动爻、含 临初九后天阳爻大限(起阴年)**、多年流月(2021/2052/2057/2075/2076)、流日 30 日动爻初→上、理数含/藏/覆。
- **⚠️ v2.2.0 流年算法修订（覆盖发布）**：初版 `liuNian` 的动爻位写死从初爻数（阳爻 1..6、阴爻 1..5），**只在元堂=上九时偶合**，其余大限流年全错。已按典籍重写为**从上一年動爻往上一爻链式累变**（阳爻另加首年阳年不变/阴年变元堂 + 第2、3年连变应爻）。Windows 端**重新同步 `utils/heluoLocal.js`** 即可（纯前端，无 Java，不重编 jar）；对照本机 `_heluoTest.mjs` 72 断言。

### #6 AI 分析：模型选项不能覆盖（前端 + Java）⚠️ 本版唯一 Java 改动
机制细节见 [`ai-model-selection-fix.md`](ai-model-selection-fix.md)。根因纯前端：测试连接/下拉用全量模型（含 embedding）首个、无视选中聊天模型 + Gemini 预设 `defaultChatModels: []` 导致唯一模型是 `text-embedding-004`，被当聊天模型送进 `:generateContent` → 404。后端无此 bug，加固为防御性。
- **前端（`build` 然后 `build:file`）**：
  - `utils/aiAnalysisProviders.js`：Gemini `defaultChatModels` 补 `['gemini-2.5-flash','gemini-2.5-pro']`。
  - `components/aianalysis/AIAnalysisMain.js`：新增 `normalizeProfileChatModels`（全量上剔除 embedding）；模型下拉 `modelOptions`、profile 列表「聊天模型」展示、`testProfileChat`（加 `preferredModel`，无模型时清晰提示而非静默 404）改用之；工具栏「测试连接」传选中模型；`ensureChunkEmbeddings` 的 `requestEmbeddingVectors` 补 `providerOptions`。
  - `utils/__tests__/aiAnalysisProviders.test.js`：+Gemini 默认聊天模型断言。
- **后端 Java（`astrostudysrv` → 必须重编 `astrostudyboot.jar`）**：`astrostudy/.../service/AIAnalysisProxyService.java`：`embeddings()` 两处 `buildAuthHeaders` 2 参→3 参带 `params`（修自定义鉴权头在 embeddings 失效）；`chat()`/`chatStream()` 解析 model 后加 `isEmbeddingModel` 守卫，抛 580014 可读错误。

### #7 拉取模型失败 — 本版不改码
OpenAI/OpenRouter 同时「拉取模型失败」。后端 `listModels` 链路（URL 拼接 / `Authorization: Bearer` / OpenRouter `HTTP-Referer`+`X-Title` / `extractModelIds` 解析 `data[]`）经核对无误，且 OpenRouter `/models` 为公开端点（无 key 也返回）；同时失败最可能是**上报者机器连不上外网（网络/代理）**。本版不改码，仅在 GitHub issue 给排查指引（引导用「连接诊断」DNS/TCP/HTTP）。Windows 无需同步。

### Windows 要做
同步上述 `Horosa-Web/` 改动 → **本版含 Java 改动（#6 `AIAnalysisProxyService.java`），必须重编 `astrostudyboot.jar`** → 同时重建前端（`npm run build` 然后 `npm run build:file`）；Python（`astropy`）随源码同步。数算两技法连 Python 都无关，只随前端 `src/` 同步即可（`utils/data/*.json` 务必带上）。#7 不涉及代码同步。

### 验证
- #9：辅盘→调波盘出现完整大盘（ASC/星/宫/相位按调波数变换）；改调波数盘与表即时重绘；明暗均正常。
- #11：风水→上传户型图→框选房屋→纳气盘八方(气红水蓝)外接房屋框且延伸出图不被裁→放置标记→判定列表/汇总→AI 快照写入；明暗、占满屏（无底部空隙）均正常。
- 数算：右侧金色 rail 出现「邵子参评数」「河洛理数」（不是新蓝条）；中右栏皆用 app 卡片样式。
  - 河洛理数→左输时间→中栏先后天卦象+元堂+爻辞、大限/流年表每行带「卦气」标签且点击就地展开爻辞、右栏命运篇 4 卡；化工按真实节气**准确**算（用项目既有 `lunar-javascript`，无新依赖、无后端）；顶部可正常上滑（`align-self:flex-start` 修复）。
  - 邵子参评数→「取法」古法/明法下拉在**左栏**、切换重算；中栏列 1–120 岁全表流年。
  - 二者明暗均正常。
- #6：新建 Gemini 配置预填 `gemini-2.5-flash/2.5-pro`；模型下拉不再出现 `text-embedding-004`；选中聊天模型「测试连接」走选中模型、无模型时给清晰提示；把 embedding 模型送 chat 被后端拦下报可读错误（需重编 jar 生效）。`aiAnalysisProviders.test.js` 4 断言全过。

---

## v2.1.8 — UI 几何/明暗 + 太乙四柱时间 + 主限推运年数 + Ollama 流式

**性质：前端为主,但 ⚠️ 改了 Java(`astrostudysrv/boundless` + `astrostudy`)→ Windows 必须重编 `astrostudyboot.jar`;另有 Python(`astropy`)改动随源码 rsync,无需重编 jar。** 机制细节见 [`ui-and-time-fixes-v2.1.8.md`](ui-and-time-fixes-v2.1.8.md)。

### 改了什么
- 前端(`astrostudyui` → `npm run build` 然后 `npm run build:file`):
  - 各西洋盘符号几何居中(`components/astro/{AstroChartCircle,AstroHelper}.js`:`dominant-baseline` middle→central)。
  - 太乙四柱随时间基准重算 + 同显直接/真太阳两时间(`components/taiyi/{TaiYiCalc,TaiYiMain}.js`,复用 `utils/baziLunarLocal`)。
  - 主限法:推运年数控件 + 表头/页码/去(`components/direction/AstroDirectMain.js`、`components/astro/AstroPrimaryDirection(Chart).js`、`layouts/app.less`)。
  - 紫微右栏空白/三合神煞字重/合盘选择条明亮/配置面板溢出/菜单精简(`layouts/app.less` + 相应组件、`components/homepage/PageHeader.js`)。
- 后端 Java(**重编 jar**):
  - `boundless/.../interceptor/SseHelper.java`:`new SseEmitter(120000L)` → `new SseEmitter(0L)`(去 AI 流式 120s 硬上限,修 Windows #6 Ollama「停止生成」)。
  - `astrostudy/.../service/AIAnalysisProxyService.java`:`buildJsonRequest` 流式仅在用户显式 requestTimeoutMs 时才加超时。
  - `astrostudy/.../controller/PredictiveController.java`:`getParams` 白名单透传 `pdYears`(主限法推运年数)。
- 后端 Python(rsync,**无需重编 jar**):`astropy/astrostudy/perchart.py`(`pdYears` 读取+clamp 1-180)、`perpredict.py`(主限 `max_arc=self.perchart.pdYears`)。

### Windows 要做
同步上述 `Horosa-Web/` 改动 → 因含 Java 改动,**重编 `astrostudyboot.jar`**(boundless install → astrostudy install → astrostudyboot clean package,见通用清单)→ 重建前端(`build` 然后 `build:file`)。

> 打包链路提示(`Horosa_Desktop_Installer/` 不共享,仅供参考):本版 macOS 端发现 `scripts/verify_launcher_console_states.py` 硬编码了 launcher 的 `来源 pkg <版本>` 断言(launcher 用 `APP_VERSION` 渲染该行),漏改会在「编译+签名+公证」之后才报 ready-state 失败。macOS 已把它纳入 `release_preflight.sh` 的版本 lockstep 门禁。Windows 打包链路如有同类「launcher 版本断言」,请同样每版同步、并在 preflight 里加门禁。

### 验证
占星清简盘星座质心居中;太乙切基准时日/时柱变、两时间稳定;主限法推运年数改值表格行数随之变(≤180);Ollama 慢模型不再 120s 中断(需真 Ollama)。

---

## v2.1.7 — 奇门/三式 真太阳时定盘修复

**性质：纯前端（`astrostudyui`）。⚠️ 不动 Java/Python → 不需重编 `astrostudyboot.jar`。**
机制细节全文：[`qimen-truesolar-time-fix-v2.1.7.md`](qimen-truesolar-time-fix-v2.1.7.md)。

### 改了什么
- `Horosa-Web/astrostudyui/src/components/dunjia/DunJiaCalc.js`：`fetchQimenPan` 改用既有 `resolveCalcDateTime`，选「真太阳时」(timeAlg=0) 时按 `nongli.birth` 的真太阳时刻发后端排盘（此前漏用，奇门被当直接时间排）。三式六壬级联修复；太乙/紫微本就正确。

### Windows 要做的
1. 同步该前端文件到 Windows 仓库对应路径（纯 JS，无平台分支）。
2. **不需重编 `astrostudyboot.jar`**（没动 Java/Python）。
3. **重建前端**：`npm run build && npm run build:file`（顺序）。

### 验证
应用内：三式/遁甲选「真太阳时」→ 奇门时柱按真太阳时刻（例 1993-02-01 11:24 / 真太阳时 10:46 → 丁巳，原误作 戊午）；切「直接时间」→ 戊午。

---

## v2.1.6 — 奇门历法修复（月柱交节边界 + 置闰超神接气定局）+ 印度盘地图选点修复

**性质：纯 Python（`vendor/kinqimen`）+ 纯前端（`astrostudyui`）。⚠️ 不碰 Java → 不需重编 `astrostudyboot.jar`；奇门改的是随 runtime 包 rsync 的 vendored Python。**
机制细节全文：[`qimen-calendar-fix-v2.1.6.md`](qimen-calendar-fix-v2.1.6.md)。

### 改了什么
- **奇门(#4，上游 kinqimen #53/#9/#62/#43)**——`Horosa-Web/vendor/kinqimen/`：
  - `jieqi.py`：`gangzhi` 月柱按 sxtwl 精确交节时刻校正（交节当日、交节前沿用前一日月柱；立春兼校年柱）；新增 `zhirun_jieqi`（超神接气置闰后的定局节气）。
  - `config.py`：重写 `qimen_ju_name_zhirun`（改用 `zhirun_jieqi` + `findyuen` + 既有局数表，弃用旧农历启发式）；新增 `dingju_jieqi`。
  - `kinqimen.py`：`pan()` 的「節氣」标签改用 `config.dingju_jieqi(...,option)`（拆补=历法节气，置闰=超神节气）。
  - `test_qimen_calendar.py`：新增 11 项回归测试。
- **印度盘(#3)**——`Horosa-Web/astrostudyui/src/components/astro/IndiaChartMain.js`：`changeGeo` 改传扁平 `lon/lat/gpsLon/gpsLat`(+`tm`)，对齐 `AstroChartMain.changeGeo`（原把经纬度包成 `{value:...}` 与父级 `changeCond` 不符而报错）。

### Windows 要做的
1. 同步上述 vendored Python 4 个文件 + 前端 `IndiaChartMain.js` 到 Windows 仓库对应路径（纯 Python/JS，无平台分支）。
2. **不需重编 `astrostudyboot.jar`**（没动 Java）。vendored Python 随 runtime 包发布——确认 Windows 运行时打包把 `vendor/kinqimen/` 一并带上（与 macOS 的 rsync 等价）。
3. **重建前端**（动了 `astrostudyui/**`）：`npm run build && npm run build:file`（顺序执行）。

### 验证
- Python：`cd Horosa-Web/vendor/kinqimen && python3 test_qimen_calendar.py`（11/11）。
- 关键回归：2005-05-05 16:30→月柱庚辰；2027-10-31 20:49 置闰→立冬上元六局（节气标签立冬）；2004-09-01 拆补=处暑上元一局 / 置闰=白露上元九局。
- 前端：应用内印度盘地图选点→确认→正常排盘不报错。

---

## v2.1.5 — AI 分析页全面修复（供应商切换/鉴权 + 发送安全 + 静默失败透出）

**性质：前端为主 + 后端少量（`AIAnalysisProxyService.java` 改了）。⚠️ 后端改了 → 必须重编 `astrostudyboot.jar`（同 v2.1.4 流程）。**

### 改了什么
- 后端 `AIAnalysisProxyService.java`：`buildAuthHeaders` 对 gemini 不再加 `Authorization: Bearer`（否则原生接口 `ACCESS_TOKEN_TYPE_UNSUPPORTED`）；custom 支持 `providerOptions.authHeaderName`/`authPrefix` 覆盖（两个 key 已入 body 保留键）；reasoning 前缀加 `o5`。
- 前端 `components/aianalysis/AIAnalysisMain.js`（多处）：供应商卡片可点击 + 「设为当前」按钮；切 provider 类型清空旧 apiKey；删当前供应商自动补选；切换/删除会话先 abort 流；并发发送守卫；消息自动滚到底；embedding/分块失败提示；Markdown 解析失败退回纯文本。
- 前端 `services/aianalysis.js`：请求/流式尊重 `providerOptions.requestTimeoutMs`；流式 catch flush。
- 前端 `utils/aiAnalysisStore.js`：`saveUiPrefs` 配额超限记录而非静默。

### Windows 要做的
1. 同步上述 4 个文件到 Windows 仓库对应路径（纯 Java/JS，无平台分支）。
2. **重编 `astrostudyboot.jar`**（后端改了），命令见下方 v2.1.4 第 2 条；放到 Windows 运行时打包位置。
3. **重建前端**：`npm run build && npm run build:file`。

### 验证
多供应商切换（卡片/按钮）生效、切类型不串 key、Gemini 直连不再 401、流式中回车不并发、停止/切换会话中止流、嵌入缺失有提示。

---

## v2.1.4 — AI 分析：供应商兼容 + 错误透传 + 凭据脱敏

**性质：后端 Java 为主 + 前端少量。⚠️ 必须在 Windows 重编 `astrostudyboot.jar`。**
机制细节全文：[`ai-provider-compat-and-error-surfacing.md`](ai-provider-compat-and-error-surfacing.md)。

### 改了什么（三个家族）
- **A 参数兼容**：`AIAnalysisProxyService.java` 新增 `isOpenAIReasoningModel`；`buildOpenAIChatBody` 对 `gpt-5.x`/`o1`/`o3`/`o4` 省略 `temperature`、用 `max_completion_tokens`；其它模型（如 `gpt-4.1`）行为不变。
- **B 错误透传**：后端 `ensureSuccess` 读取并并入上游错误体；前端 `AIAnalysisMain.js` 流式 `onEvent` 处理 `error` 事件，替代「模型未返回可用内容」兜底。
- **C 凭据脱敏**：`HttpUriRequestHystrixCommand.java`（**共享库 boundless**）对错误信息里的 `Authorization`/`x-api-key`/`LocalIp` 等头脱敏，日志 URL 去 `?key=`。

### Windows 要做的（按顺序）
1. 把这三处源码改动同步到 Windows 仓库对应路径（路径与 macOS 一致，纯 Java/JS，无平台分支）：
   - `Horosa-Web/astrostudysrv/astrostudy/src/main/java/spacex/astrostudy/service/AIAnalysisProxyService.java`
   - `Horosa-Web/astrostudysrv/boundless/src/main/java/boundless/net/http/HttpUriRequestHystrixCommand.java`
   - `Horosa-Web/astrostudyui/src/components/aianalysis/AIAnalysisMain.js`
   - 测试（可选但建议）：`AIAnalysisProxyServiceTest.java`、`boundless/.../HttpUriRequestHystrixCommandTest.java`
2. **重编后端 `astrostudyboot.jar`（关键，发布链路不会替你编）**。仓库**没有 root reactor pom**，模块各自独立、版本固定（boundless `1.2.1.2`、astrostudy/astrostudyboot `1.0.0`）。用 **JDK 17**：
   ```bat
   cd Horosa-Web\astrostudysrv
   mvn -f boundless\pom.xml  install -DskipTests
   mvn -f astrostudy\pom.xml install -DskipTests
   mvn -f astrostudyboot\pom.xml clean package -DskipTests
   ```
   - **`clean` 必须有**：不 clean 时 astrostudyboot 自身源码未变，maven 会增量复用旧 fat jar、不重新打包依赖 → 改动进不去 jar。
   - 产物 `astrostudyboot\target\astrostudyboot.jar`。把它放到 Windows 运行时打包链路对应位置（macOS 是 `runtime/mac/bundle/astrostudyboot.jar`；Windows 对应 `runtime/win/.../astrostudyboot.jar`，以 Windows 仓库的运行时目录模型为准）。
   - 自检 jar 内含改动：解包 `BOOT-INF/lib/astrostudy-1.0.0.jar` 看 `AIAnalysisProxyService.class` 含 `max_completion_tokens`；`boundless-1.2.1.2.jar` 的 `HttpUriRequestHystrixCommand.class` 含 `redacted`。
3. **重建前端**：`cd Horosa-Web/astrostudyui && npm run build && npm run build:file`（顺序）。
4. JDK17 编译 + JUnit（boundless 2、astrostudy +2 新例）应通过。

### 验证
- 用一个推理模型名（如 `gpt-5.5` / `openai/gpt-5.5`）跑通对话（需真实 key）。已在 macOS 用真 key 验证：推理体（无 temperature + max_completion_tokens）能正常返回，流式答案在 `delta.content` 到达（reasoning 字段被正确忽略）。
- 故意触发上游错误（错 key / 错 model）→ 应显示**真实原因**而非「模型未返回可用内容」。
- 错误信息里 key 应显示为 `***redacted***`。

---

## v2.1.3 — 八字「直接时间 / 真太阳时」显示修复

**性质：前端为主（八字盘走前端本地计算），后端仅回退路径。无需重编后端即可让显示生效，但建议后端也同步。**
机制细节全文：[`bazi-time-display-fix.md`](bazi-time-display-fix.md)。

### 改了什么
- 主修复在前端 `astrostudyui/src/utils/baziLunarLocal.js`（本地计算在 `nongli` 加入与 `timeAlg` 无关的 `clockTime`/`solarTime`）+ 四处显示组件（`cntradition/{PaiBaZi,BaZiAppInfoPanel,BaZiLegacyView,BaZi}.js`）。
- 后端回退路径同款字段：`astrostudycn/.../model/BaZi.java`。

### Windows 要做的
1. 同步上述前端文件 → **重建前端包**（`npm run build` + `build:file`）。这是关键，单改后端在 Windows 同样不生效。
2. 后端 `BaZi.java` 同步后随下次 Java 重编带上（与 v2.1.4 的 jar 重编同一套流程）。

### 验证
- 八字盘切换「时间算法」，确认「直接时间」「真太阳时」两值都不跳，仅「计算基准」随之变；经度偏离 120°E 子午线时两值不同。

---

## 同步后通用自检（两版都适用）
- 后端启动：Java + Python 服务起得来，健康检查过（参照 porting checklist 的「Windows 发布前自检顺序」）。
- kentang/kin 路由 smoke（奇门/太乙/三式合一等打到图表服务端口）。
- 前端能加载、AI 分析能发消息。
- 发布前/后自检：见 [`windows-porting-and-release-checklist.md`](windows-porting-and-release-checklist.md) 的「Windows 发布前自检顺序」「Windows 发布后回下载自检」。
