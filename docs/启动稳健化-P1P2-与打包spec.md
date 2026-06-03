# 启动稳健化 P1/P2 — 处置与打包/发布 spec

> 配套 `docs/windows-启动稳健化-镜像清单.md`(Windows 壳)与 P0 已落地代码(commit 起于 `feature/startup-runtime-hardening`)。
> 本文记录 **P1/P2 各项的最终处置**:已被现有机制覆盖的、以及只能在「打包环境 / 真发布 / Windows 仓库」里安全完成的(附 turnkey 步骤)。
> **总纲(用户两条硬要求)**:傻瓜式零配置 + **绝不降级**。凡无法在本仓库当前环境安全验证的,**不盲改**,改为精确 spec 交对应环境执行——这是「绝不降级」的直接体现。

---

## 全 Phase 处置总表

| 项 | 处置 | 说明 |
|---|---|---|
| P0 白屏兜底 StartupGate | ✅ 已做 | `components/common/StartupGate.js` + 挂载,preview 实测零回归 |
| P0 后端就绪契约(/healthz + HOROSA_READY) | ✅ 已做 | `webchartsrv.py` |
| P0 Java 绑 127.0.0.1(防火墙) | ✅ 已做 | `start_horosa_local.sh` 启动器 arg(无需重编 jar) |
| P0 Windows 镜像清单 | ✅ 已做 | `docs/windows-启动稳健化-镜像清单.md` |
| P0 preflight gate [35] | ✅ 已做 | `release_preflight.sh` |
| **P1-2 mac 单实例** | ✅ **已被覆盖,无需改** | macOS LaunchServices 对 `.app` 原生单实例;且两端均**动态端口**(mac `choose_free_port` / Win `findPort`)→ 即便边缘双开也各取空口、**不抢端口**;Windows 另有 `requestSingleInstanceLock`。加 Tauri 插件=改关键 `main.rs` + cargo + 不可手测,**风险>收益,故不动**。 |
| **P2 结构化启动日志** | ✅ **已存在** | `start_horosa_local.sh` 已有 `diag_log` 全阶段:选口/起 py/起 java/就绪/超时/`exit 3` vs `exit 1`/run-end + 端口态 + 日志尾。无需新增。 |
| **P2 doctor / 可操作错误** | ✅ **大体已覆盖** | StartupGate(连接中覆盖层 + 自动退避重试 + 手动重试 + 重启提示)+ 启动器失败页「重建 Runtime」CTA + 自动 reclaim(端口自愈)+ 上述 diag 日志。专门「doctor 页一键全自动修」属增量,见下「可选」。 |
| **P0/P1 冷启动 AppCDS** | 📦 **打包 spec(JDK17)** | 见下。**关键:bundled JDK=17,`AutoCreateSharedArchive` 是 19+,误用会致 JVM 起不来=严重回归**;必须用打包期归档生成。 |
| 冷启动 .pyc | ❎ **不做** | `package_runtime_payload.sh:165` 故意删 `.pyc`(体积/可复现);且 Python 冷启动被 PD warmup 主导,.pyc 收益边际。如确需:改用运行期 `PYTHONPYCACHEPREFIX` 指向可写缓存(不入包),但不推荐。 |
| **P1-3 loopback 鉴权令牌** | 🔭 **可选,默认不做** | 已绑 `127.0.0.1` 是真正防护;令牌是同机进程隔离的纵深防御,**跨 Java+Python+前端+启动器**改动、任一请求路径漏带即破=回归风险。spec 见下,仅当威胁模型需要再做。 |
| **P1-4 自动更新原子+回滚** | 🔭 **专项 spec(需真发布测)** | 盲改更新路径若出错会**令用户无法更新=严重回归**,故不在此环境盲改。spec 见下,需在真发布链路验证。 |

---

## AppCDS 冷启动(打包环境执行,JDK 17)

> 目的:缩短 JVM 冷启动(进一步压缩 StartupGate 覆盖层停留时长)。**bundled JDK=17 → 不可用 `-XX:+AutoCreateSharedArchive`(19+),用打包期归档生成 + 启动期只读引用**。

1. **打包期生成归档**(`package_runtime_payload.sh`,jar 落位后):用 **bundled** java 跑一次代表性 warmup 后退出,`-XX:ArchiveClassesAtExit` 写出 `app.jsa`,放进 runtime 包(随 jar)。warmup 须触发 Spring 起 + 关键路由(可复用 `warmHorosaRuntime.js` 的最小集),跑完发 SIGTERM 优雅退出(有 shutdown hook 才写归档)。**best-effort `|| true`,失败不阻断打包**(无归档=不加速、不报错)。
2. **启动期引用**(`start_horosa_local.sh` 与 Windows `buildJavaArgs`):**仅当 `app.jsa` 存在**才加 `-XX:SharedArchiveFile="${JSA}" -Xshare:auto`(`-Xshare:auto`=归档失效自动退普通启动,**绝不阻断**)。JVM 标志须在 `-jar` 之前。
3. **验证(打包环境)**:加标志后 JVM 必须正常起(JDK17 接受这两个标志);对比加载前后 Java 就绪耗时应下降;删/坏 `app.jsa` 时仍能正常起(回退验证)。

## (可选)loopback 鉴权令牌 spec
- 启动器(mac `start_horosa_local.sh` / Win `buildJavaArgs`)生成随机 token,经 env 传两后端;前端经 `?srv=` 同样拿到(或注入)。后端(Java 拦截器 + Python 装饰器)校验 `X-Horosa-Token`,缺失/不符 401。**必须覆盖所有请求路径**(含 SSE/AI/SAVE/排盘),任一漏带即回归 → 上线前全路径 smoke。

## 自动更新原子+回滚 spec(需真发布测)
- mac `main.rs`:已有 ditto backup;改为**保留备份至新版「首次成功启动」**(就绪事件)后再清;新版启动失败(N 秒内未就绪/崩溃)→ 自动 `ditto` 还原备份 + 重启旧版 + 提示。Win `update-flow.js` 同义。
- **必须在真发布链路验证**(下载/校验/替换/回滚全流程),不可盲改。

## doctor(可选增量)
- 现有已覆盖常见自愈;若要「设置页一键体检+修复」:复用 `start_horosa_local.sh` 的 `reclaim_stale_port`/`ensure_chart_port_free` + runtime 校验,壳(mac main.rs / Win main.js)加一个 IPC 命令触发并展示结果。属增量,优先级低。
