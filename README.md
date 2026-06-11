<div align="center">

简体中文 · [English](README_EN.md)

<img src="Horosa_Desktop_Installer/assets/icon-source.png" alt="星阙 Horosa" width="128" />

# 星阙 Horosa

**把占星与中国术数，收进一个原生 macOS 工作站**<br />
*Western astrology and Chinese metaphysics, in one native macOS workstation*

[![Version](https://img.shields.io/badge/version-2.6.6-2ea043?style=flat-square)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/tag/v2.6.6)
[![License](https://img.shields.io/badge/license-AGPL--3.0-dc2626?style=flat-square)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS%2012+-Apple%20Silicon-111111?style=flat-square&logo=apple&logoColor=white)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/tag/v2.6.6)
[![Signed & Notarized](https://img.shields.io/badge/Developer%20ID-signed%20%26%20notarized-1f6feb?style=flat-square)](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/tag/v2.6.6)

[下载安装包](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/download/v2.6.6/Horosa-Installer-macos-arm64-offline.pkg) ·
[完整中文说明](README_ZH.md) ·
[English Guide](README_EN.md) ·
[所有版本](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases)

</div>

---

星阙 Horosa 是一套桌面端的玄学工作站。西方占星的本命、推运、关系盘，连同八字、紫微、奇门、六壬、太乙这些中国传统术数，被放进同一个原生 macOS 应用里——不必在十几个网页排盘器之间来回切换，也不必自己拼装 Python、Java 与历表运行时。它以 Developer ID 签名、Apple 公证、离线 `.pkg` 的形式交付，下载即用。

> Horosa is a desktop workstation for traditional cosmology. Western natal, timing, and relationship astrology sit beside Chinese systems—Bazi, Ziwei, Qimen, Liuren, Taiyi—inside one native macOS app, so you stop juggling a dozen web tools and never hand-assemble a Python/Java/ephemeris runtime yourself. It ships as a Developer-ID-signed, Apple-notarized, offline `.pkg`.

## 下载 · Download

普通用户直接下载离线安装包，像任何 macOS 软件一样安装打开即可。无需自备 Python 或 Java，运行时已随包交付；更新只替换程序与共享组件，不会清空你的命例数据。

> Regular users grab the offline installer and open it like any finished macOS app. No Python or Java to install yourself—the runtime ships inside the package—and updates replace the program and shared runtime without wiping your saved charts.

**[⬇︎ Horosa-Installer-macos-arm64-offline.pkg](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/download/v2.6.6/Horosa-Installer-macos-arm64-offline.pkg)**

适合：Apple Silicon · 弱网 / 离线环境 · 首次安装 · 转发给他人。

## 截图 · Screenshots

<div align="center">
<img src="docs/assets/screenshots/horosa-astrology-workspace.png" alt="Astrology workspace" width="900" />
<p><em>占星工作区 — 左侧起盘参数，中间图盘画布，右侧信息 / 相位 / 行星 / 古典 / 格局页签。</em><br /><em>Astrology workspace — chart controls on the left, the wheel in the center, detail tabs on the right.</em></p>

<img src="docs/assets/screenshots/horosa-sanshi-workspace.png" alt="Sanshi workspace" width="900" />
<p><em>三式工作区 — 起盘参数、九宫盘面、概览 / 太乙 / 神煞 / 六壬 / 八宫页签同屏。</em><br /><em>Sanshi workspace — setup, the nine-palace plate, and overview tabs in one view.</em></p>

<img src="docs/assets/screenshots/horosa-navigation-overlay.png" alt="Navigation overlay" width="900" />
<p><em>导航弹层 — 命盘推运、易与三式、工具工作台分组，支持搜索与最近使用。</em><br /><em>Command overlay — charts, Yi & Sanshi, and tools, with search and recents.</em></p>
</div>

## 功能总览 · What's Inside

导航把所有模块归为三组：**命**（命盘与推运）、**卜**（易与三式）、**工具**。下面是各组里实际可用的内容。

> Everything lives under three groups: **命** charts & timing, **卜** divination, and **工具** tools. Here is what each one actually ships.

### 命 · Charts & Timing

| 模块 | 说明 |
| --- | --- |
| **占星 Astrology** | 本命盘与三维盘（Babylon.js 实时 3D），多种宫位制与古典 / 现代行星集 |
| **星运 Timing** | 主限法（Primary Directions）、黄道星释（Zodiacal Releasing）、法达（Firdaria）、小限（Profection）、太阳弧（Solar Arc）、太阳 / 太阴返照、十年法、推运、星历 |
| **合盘 Relationship** | 比较盘、组合盘、影响盘、时空中点盘、马克斯盘 |
| **辅盘 Specialty** | 希腊星术（界限 / 阿拉伯点）、量化盘 / 中点树（汉堡学派）、星体地图（占星地理定位）、调波盘 |
| **印占 Vedic** | 北 / 南 / 东印度盘，恒星黄道 |
| **七政 Qizheng** | 七政四余 |
| **八字 Bazi · 紫微 Ziwei** | 四柱排盘；紫微斗数含四化盘 |
| **数算 · 其他** | 邵子神数、铁板神数、演禽等数术方法 |

### 卜 · Divination

| 模块 | 说明 |
| --- | --- |
| **三式 Sanshi United** | 奇门、太乙、六壬整合面：概览、太乙、神煞、六壬、大格、小局、参考、八宫 |
| **遁甲 Qimen · 六壬 Liuren · 太乙 Taiyi** | 三式各自的独立排盘入口 |
| **六爻 Liuyao · 分至 Jieqi · 风水 Feng Shui** | 纳甲六爻、节气盘、风水工具 |
| **其他 More** | 宿盘、金口诀、统摄法、皇极经世、五兆、太玄、荆诀、神易数 |

### 工具 · Tools

| 模块 | 说明 |
| --- | --- |
| **AI 分析 AI Analysis** | 接入 OpenAI / Anthropic / Gemini / Ollama / OpenRouter / 自定义端点；支持流式对话、历史记录、资料库（向量检索）、按技法 / 页签结构化导出 |
| **天文馆 Planetarium** | Babylon.js 实时三维天象 |
| **黄历 Almanac** | 农历 / 节气 / 择日 |
| **辅助 References** | 八卦类象、十二宫、规则速查 |

命盘与事盘都能本地保存：带标签、快照、后端原始数据，可 JSON 导入导出，重开后恢复现场。

> Charts and cases save locally—tags, snapshots, raw backend payloads, JSON import/export, and full restore on reopen.

## 本次更新 · What's New in v2.6.6 beta

这一版主线是**主限法（Primary Directions）全面升级**与 **AI 报告打磨** / This release headlines a **comprehensive Primary Directions upgrade** plus **AI-report polish**:

- **主限法 · 显示窗精确化 + 世俗行集修复** —— 行星对显示窗改为单一判据（弧归一化前原值）；In-Mundo 此前缺失的行星对方向行现全数列出。/ Exact display-window semantics; previously-missing In-Mundo planet-pair rows now all listed.
- **主限法 · 宿命点（Vertex）应星** —— 黄道向运新增宿命点应星行（闭式直算）。/ Vertex significator rows (closed-form) in zodiacal directions.
- **主限法 · 时间钥匙修真 + 新钥匙** —— Simmonite / Kepler / Brahe 逐盘真算；新增 Kündig 与 太阳弧（黄经）。/ True per-chart time keys; new Kündig & Symbolic Solar Arc keys.
- **主限法 · 年数上限 3000** —— 360 → 3000，跨圈方向按整圈复发自动延展；默认 100 年行为不变。/ Year range to 3000 with per-revolution recurrences; default unchanged.
- **AI 报告打磨** —— Gemini 采样参数封装修复、思考档新增 极高/最大、界面缩放持久化。/ Gemini param-wrapping fix, Extra-High/Max thinking tiers, zoom persistence.

### 旧版 · What's New in v2.6.5 beta

这一版主线是**合盘交互链全面重建 + AI「起课时间」挂载 8→13 技法**，把上版残留的合盘失能与卜卦/数算时间起盘缺失一并补齐；默认行为与 v2.6.4 逐位一致：

- **合盘 5 子盘端到端可用** —— v2.6.1 误把 `/modern/relative` 端点切到了 chart 服务（加密 body 不解密 → 全部「用不了」），本版恢复到 Java :9999；同时 `AstroRelative` 用 ResizeObserver 实测容器高度，根治影响盘/马克斯盘下端大片空白；左栏交互链 `chartStyle/dispatch/onChange` 全链路透传 + `handleRelativeOnChange` 直写 fields 绕开本命盘 fetch（修「点了没反应」），componentDidUpdate watch fields 自动重算；「宫位制与黄道」popover 空白根治（删 hide 标志 + paramsToFields 不再覆盖 hsys/zodiacal）；长 ayanāṃśa 名（如 Lahiri ICRC（官定2022））触发框 50/50 局部 CSS 防撑大。
- **AI 分析「起课时间」挂载补全** —— 此前下拉只有 8 项（六壬/金口诀/奇门/太乙/三式合一/卜卦盘/择日盘/六爻），本版 + 5 项：**皇极经世 / 太玄筮法 / 荆诀 / 五兆 / 神易数**。4 个数算/起例法各导出 `buildXxxSnapshotForFields(fields, opts)`，挂载设置真接入：太玄/荆诀 起筮种子可改、五兆 起例模式/报数/手动分爻可改、神易数 时辰/季令 auto/manual 可改；用户在挂载齿轮改的每一项都会**真重算**（不是只显「已自定义」徽章），AI 四同步（导出/导出设置/挂载/储存）全到位。
- **Python 真太阳时辅助接受数值经纬度** —— 地图选点存的浮点 `lon:116.4074 lat:39.9042` 此前直崩 `'float' object has no attribute lower`；`convertLonStrToDegree/convertLatStrToDegree` + `getBaseLonByZone` 加 isinstance 数值分支，字符串路径原样（向后兼容字节级一致）。
- **AI 起课时间「合成 record」时间 NaN-undefined 修复** —— 起课时间源 record 用 `divTime` 字段（不是事盘的 `birth`），`buildFieldObject` 此前只读 `record.birth` 走 fallback `new DateTime({zone})` 用当前系统时间 → 后端格式化时显示 `NaN-undefined-undefined`；改为 `record.birth || record.divTime`。
- **导航搜索 + 关于框图标** —— 全 22 模块加 keywords 索引（搜「卜卦盘」出辅盘、「皇极经世」出其他卜）；关于星阙换软件真 icon（不再是占位）。
- **波斯向运「应期年数」表格联动** —— 改年数后右侧表格按新年数重算（v2.6.4 漏改）；事盘字符串快照在 AI 分析里被认（之前只认对象式）。
- **工程** —— 后端 Python 排盘组件更新（runtime `2.6.5-runtime1`，自动下载）；jest 657→658、preflight 36→39 个 sentinel 块（[37] timepoint 13 技法 + builder opts + divTime 兜底 / [38] 合盘端点+交互链全检 / [39] Python helper 数值 geo）。

> This release's headline is **Synastry chain rebuilt end-to-end + AI "Set-Time" mount expanded from 8 → 13 techniques**, fixing the carry-over Synastry breakage and the missing time-cast paths for divinatory/numerical methods. Default behavior is bit-for-bit identical to v2.6.4. Synastry — v2.6.1 had silently moved `/modern/relative` to the chart service (encrypted body never decrypted → "doesn't work" across every sub-chart); restored to the Java service. `AstroRelative` now uses a ResizeObserver to measure the real container height, fixing the large blank below Synastry/Marks; the left-panel interaction chain (chartStyle / dispatch / onChange) is forwarded end-to-end, and `handleRelativeOnChange` writes the fields directly (bypassing the natal-chart fetch that silently swallowed the change), with componentDidUpdate watching the fields to re-cast automatically; the "Houses & Zodiac" popover is no longer empty (removed the hide flags + paramsToFields no longer overrides hsys/zodiacal); long ayanāṃśa names (e.g. "Lahiri ICRC（官定2022）") now wrap with ellipsis at a fixed 50/50 grid via Synastry-scoped CSS that does not touch the natal pages. AI Analysis "Set-Time" mount — the source dropdown previously showed only 8 techniques (Liureng / Jinkou / Qimen / Taiyi / Sanshi / Horary / Election / Sixyao); this release adds **HuangJi / TaiXuan / JingJue / WuZhao / ShenYiShu**. Each of the four numerological/casting modules now exports `buildXxxSnapshotForFields(fields, opts)`; mount settings actually feed through — change the divination seed for TaiXuan/JingJue, the casting mode/seed-number/manual split for WuZhao, the hour/season auto-or-manual for ShenYiShu, and the snapshot is **truly recomputed** (not just badged "customized"). All four AI mirrors (export / export settings / mount / case storage) stay in sync. Python true-solar-time helpers accept numeric lon/lat/zone — chart records saved via map picker stored decimal-degree floats and used to crash with `'float' object has no attribute lower`; the converters now detect numeric input while leaving the DMS string path bit-for-bit unchanged. Set-Time `divTime` time NaN — the synthetic Set-Time source `record` keeps the time in `divTime` (not the case-store `birth`); `buildFieldObject` now falls back through `record.birth || record.divTime`. Engineering — Python runtime updated (`2.6.5-runtime1`, auto-downloaded on upgrade); jest 657→658; preflight 36→39 sentinel blocks ([37] Set-Time 13 techniques + builder opts + divTime fallback / [38] Synastry endpoint + interaction chain + zodiac select width / [39] Python helper numeric geo).
## 技术构成 · Under the Hood

- **前端 Frontend** — React 17 + Umi 3 + TypeScript，Ant Design；D3 绘盘，Babylon.js / Three.js 三维，Plotly 星体地图，Monaco 编辑 AI 导出模板。
- **后端 Backend** — Java 17 / Spring Boot 2.7 承载占星与中国术数核心服务；Python 3.9 服务层封装 Swiss Ephemeris（`pyswisseph`）与 vendored 的 kentang2017 传统术数引擎。
- **桌面壳 Desktop** — Tauri 2（Rust）原生外壳，Developer ID 签名 + Apple 公证，离线运行时随包交付，应用内更新。
- **发布 Distribution** — 面向 Apple Silicon（`arm64`）、macOS 12+ 的离线 `.pkg`。

## 文档 · Documentation

- [README_ZH.md](README_ZH.md) — 中文完整说明
- [README_EN.md](README_EN.md) — Full English guide
- [Horosa_Desktop_Installer/README.md](Horosa_Desktop_Installer/README.md) — 安装器与发布链路 / installer internals
- [docs/windows-porting-and-release-checklist.md](docs/windows-porting-and-release-checklist.md) — Windows 复刻与发布自检 / Windows porting checklist
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) · [SECURITY.md](SECURITY.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [CITATION.cff](CITATION.cff)
- 源码 / source: `Horosa-Web/`（前端 `astrostudyui`，后端 `astrostudysrv` / `astropy`，引擎 `vendor`）

## 致谢 · Acknowledgements

星阙的源流不能忘。最早的星阙 Horosa 由**郑大哥**一手创建，**荀爽（Herakleios，爽哥）**参与辅助设计，并把相关 App 与 Web 公开出来，后来者才有得研究、学习与延展。本项目正是在他们搭好的星阙体系、术数工作流与公开分享精神之上，继续做 macOS 交付、运行时打包、功能整合与体验改良。也感谢每一位持续测试、反馈、修复，推动 Horosa 变得更完整的人。

特别感谢 [kentang2017](https://github.com/kentang2017) 长期公开的传统术数 Python 项目。Horosa 接入或适配了其中多项计算引擎——已声明 MIT 的上游在 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 与对应 vendored 目录保留许可证；未找到明确开源声明的项目则单独标注，避免混同。

> The lineage matters. Horosa was originally created by **郑大哥**, with auxiliary design by **荀爽 (Herakleios)**, who released the App and Web that made later study and extension possible. This edition builds on that groundwork—adding macOS delivery, runtime packaging, integration, and polish—with gratitude to them and to everyone who keeps testing and fixing along the way. Special thanks to [kentang2017](https://github.com/kentang2017), whose openly shared Python projects power several of Horosa's calculation engines; licensing for each is recorded in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
