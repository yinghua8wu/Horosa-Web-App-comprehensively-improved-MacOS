# Issue 修复技术文档 · Mac #10（Java 假阴性）+ Mac #11（紫微挂载补自化）

> 目标版本：**v2.6.2（待发）**。两条均来自「已关闭但用户仍留言」的 issue。
> 性质：**纯前端 + Mac 启动脚本**，无 Java/jar 改动、不需重编 jar。
> 铁律守护：主限法计算本体零改动；占星/公开文档无借鉴 App 名。

---

## Mac #11 — 紫微 AI 挂载补「宫干自化」

### 用户诉求（issue #11，@mctl）
> 「已有挂载信息没问题，问题是**挂载信息不够**，目前只有宫位、大限、格局等，没有流年信息……能否把排盘信息全部挂载，比如**流年、生年四化、自化**等，或者加一个可选开关？」

owner 已承诺「下个版本会增加额外排盘信息」。

### 三项逐一核对（修复前现状）
| 诉求 | 修复前 | 处置 |
|---|---|---|
| **生年四化** | **已在**：`formatStarSiHua` 给每颗星打 `生年X` 标注（`ZiWeiMain.js:88-92`），命宫四化 `命宫X` 也在 | 无需改 |
| **流年** | **已在（v2.6.1）**：AI 挂载「每技法设置」可多选大限/流年/流月/流日/流时，`buildZiweiPeriodLines` 产 `[运限]` 段含四化落宫 + 流曜。mctl 当时在 **v2.6.0**、尚无此选项 | 无需改（v2.6.1 已覆盖） |
| **自化（宫干自化）** | **缺失**：`formatStarSiHua` 只算生年干、命宫干，未算「星所落宫位本身的天干」 | ✅ **本次新增** |

### 根因 / 实现
- 宫干自化＝**飞星紫微核心**：一颗星落在某宫，若该宫的**宫干**（天干）按当前流派四化表会引动这颗星化禄/权/科/忌，则该星「自化」。
- `ZiWeiHelper.getSiHua(star, gan)` 已存在且**自动按当前流派表**取值（北派/中州/自定义），所以自化用「宫干」复算即可，与生年/命宫四化完全同口径、零新算法。
- 改动（`components/ziwei/ZiWeiMain.js`）：
  1. `formatStarSiHua(starName, yearGan, lifeGan, palaceGan)` 新增第 4 参 `palaceGan`，非空时 `getSiHua(starName, palaceGan)` → 命中则追加 `自化X` 标注。
  2. `[宫位总览]` 逐宫循环里 `const palaceGan = ganzi ? normalizeGan(ganzi) : ''`，传入 `formatStarSiHua(..., palaceGan)`。
- 输出示例：`星曜：武曲（生年权，自化禄）、贪狼…`。

### 四同步（自动，无需新段 / 无需版本号 bump）
`buildZiWeiSnapshotText` 是**唯一**快照构建器，三路共用：
- **AI 挂载**：`buildZiweiSnapshotForParams` → `buildZiWeiSnapshotText`；
- **命盘/事盘储存**：`saveModuleAISnapshot('ziwei', buildZiWeiSnapshotText(...))`；
- **AI 导出 / 导出设置**：`aiExport.js` 按**段标题**解析，自化在 `星曜` 行内（属已注册的 `宫位总览` 段，`aiExport.js:347`）→ 自动包含，**不增删段、不需 `AI_EXPORT_SETTINGS_VERSION` bump**。

### 验证
- 新增 2 条单测（`ziweiMountSnapshot.test.js`）：①动态断言——用真实四化表在夹具里找确定自化的 (星,宫干) 再断言快照含 `自化X`（不硬编码流派表）；②武曲@己宫同段承载「生年四化 + 自化」。
- jest **522/522** 全绿（含新 2 条）；默认快照逐字基线测试仍过（自化为加法、稀疏出现，不破坏「默认即现状」）。

---

## Mac #10 — Java 运行时「假阴性」误报 not found

### 用户现象（issue #10，@mctl，v2.6.0）
报错：`本机组件 · 星阙 backend start failed (exit 1) stdout: java runtime not found: /Users/Shared/Horosa/runtime/current/runtime/mac/java/bin/java install java 17+ or run ../Horosa_OneClick_Mac.command`。
但 mctl 的 AI 实测证实：**该路径的 java 完全正常**（ARM64 原生、Java 17.0.2、可执行）。即「java 本身没问题，是检测误判」。

### 根因
启动脚本 `Horosa-Web/start_horosa_local.sh` 的就绪检测链：
1. `resolve_java_bin`：非 `TRUSTED_RUNTIME` 时调 `java_bin_ready "${JAVA_BIN}"`（首次启动 / 信任未建立时 `trusted_runtime=0`，走这条）。
2. `java_bin_ready` 原实现把 `java -version` **委托给 `/usr/bin/python3` 子进程**执行（`subprocess.run([java,'-version'])`）。
3. **致命点**：在**未安装 Xcode Command Line Tools** 的 Mac 上，`/usr/bin/python3` 只是个**会弹「需安装开发者工具」并返回非零的桩**——于是即便内置 java 完好，`java_bin_ready` 也被这个桩拖成失败。
4. 紧接着 `REQUIRE_EMBEDDED_RUNTIME=1` 进入严格模式（`return 1`，拒绝回退系统 java）→ 脚本 `echo "java runtime not found"` + `exit 1` → `main.rs` 包成 `backend start failed (exit 1)`。

> 该 python 包装并**无超时**等任何额外保护，与直接 `java -version` 行为等价——纯属脆弱的多余依赖。mctl「改了脚本就好了」也印证：问题在检测、不在 java。

### 修复（`start_horosa_local.sh` · `java_bin_ready`）
去掉 `/usr/bin/python3` 间接层，**直接** `"${java_bin}" -version >/dev/null 2>&1`：
```sh
java_bin_ready() {
  local java_bin="$1"
  if [ ! -x "${java_bin}" ]; then
    return 1
  fi
  "${java_bin}" -version >/dev/null 2>&1
}
```
- 严格模式 / 回退策略（`REQUIRE_EMBEDDED_RUNTIME`）**不动**——这是与主限法/打包一致性的刻意设计，只修「检测假阴性」。
- 残留的 `/usr/bin/python3`（`repair_embedded_python_runtime`）是 repair 路径、已自带 `-x /usr/bin/python3` 守卫、非承重，不动。

### 验证
- `bash -n start_horosa_local.sh` 通过；脚本内已无承重的 `/usr/bin/python3` 依赖（仅 repair 路径保留且 guarded）。
- 真机端到端（无 CLT 的 Mac 上首启）待打包后手测。

---

## 影响面 / 平台
- **Mac #11（前端 `ZiWeiMain.js`）**：共享前端 → **Windows 同步该 `.js` + 重建前端包即受益**（见 windows-sync-handoff）。
- **Mac #10（`start_horosa_local.sh`）**：Mac 启动器专属；Windows 用 Electron 主进程做 java 检测（另一仓库），**此具体 bug 不波及 Windows**，但应顺手核 Windows 启动器的 java 检测无类似「依赖无关组件导致假阴性」。
