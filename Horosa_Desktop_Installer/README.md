# Horosa Desktop Installer

这是 星阙 Horosa 的独立 macOS 桌面安装器工程，和主业务代码隔离。它负责把应用、共享运行时与 Tauri 桌面外壳打成单个签名、公证、离线的 `.pkg`，并维护应用内自动更新链路。

> 本文中所有命令均默认从本工程目录执行：先 `cd` 到仓库内的 `Horosa_Desktop_Installer/`，再运行对应脚本。

## 普通用户下载入口

如果你要告诉别人“去哪里下载一键安装包”，优先给这两个地址：

- Release 页面：
  [https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/latest](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/latest)
- 离线安装包（弱网 / 转手分发）：
  [Horosa-Installer-macos-arm64-offline.pkg](https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-MacOS/releases/latest/download/Horosa-Installer-macos-arm64-offline.pkg)

普通用户不要自己猜文件名，直接下载 `Horosa-Installer-macos-arm64-offline.pkg`：

- 适合：所有普通用户，尤其是中国大陆、弱网、离线拷给别人安装
- 特点：已签名、已公证、安装后可直接打开使用

安装步骤要说明清楚：

1. 下载 `Horosa-Installer-macos-arm64-offline.pkg`
2. 双击 `.pkg` 开始安装
3. 从 `/Applications/星阙.app` 启动
4. 如果检测到这台 Mac 上已有 app、本机组件或旧缓存，先在 app 内完成“安装审查”，手动勾选这次要替换的资产
5. 离线安装完成后必须可直接打开，不再走联网准备
6. 如果系统提示安全确认，按标准 macOS 路径在“系统设置 → 隐私与安全性”中放行

其他 release 资产都不是给普通用户手动挑选的，应放在说明后面、不要干扰他们。`DMG` 公开入口已取消，不再分发。

目标：

- 交付离线 `.pkg` 作为唯一公开安装入口。
- 日常启动使用原生 `.app`，内置浏览窗口，不弹 Terminal。
- 菜单栏提供“检查更新”，支持自动下载、校验、替换、重开。
- 应用安装在 `/Applications` 时，应用内更新会按 macOS 标准弹出管理员密码框完成替换。
- 更新过程不删除用户数据。

## 目录

- `src-tauri/`：原生桌面壳、更新器、后台启动管理
- `web/`：首次初始化、修复、更新事务显示页
- `config/release_config.json`：GitHub Release 与运行时资产配置（版本号、资产名、共享根目录名）
- `config/release_notes/`：GitHub Release 正文模板
- `installer-scripts/postinstall.template`：`.pkg` 安装后部署 runtime 的脚本模板
- `installer-scripts/distribution.xml.template`：安装器分发清单（系统版本 / 架构门槛）
- `scripts/package_runtime_payload.sh`：打包 runtime payload
- `scripts/build_desktop_release.sh`：构建 `.app zip`、离线 `.pkg`、`horosa-latest.json`
- `scripts/verify_desktop_packaging.sh`：一键验收脚本
- `scripts/generate_icon.sh`：从透明圆角星空图标源生成 macOS app icon / iconset / icns

## 安装模型

用户侧只认一个文件：`Horosa-Installer-macos-arm64-offline.pkg`。

离线路径：

1. 双击 `Horosa-Installer-macos-arm64-offline.pkg`
2. `.pkg` 把 `星阙.app` 安装到 `/Applications`
3. `postinstall` 优先使用包内自带 runtime 归档，部署到共享目录 `/Users/Shared/Horosa/runtime/current`，并把共享树设为可写（多用户 / 换账号首启也能写 pid 与首启缓存）

首次打开 `星阙.app` 后：

1. 原生窗口展示正式安装 / 初始化页
2. 所有安装、修复、更新都会先进入“安装审查”，列出 app、本机组件和缓存等已安装资产
3. 优先复用已部署的共享 runtime；离线路径下不再回退到联网准备
4. 只有被勾选为“替换”的资产才会被处理，未勾选的内容会尽量保留
5. 后台启动 Python / Java 服务（就绪探测对系统代理免疫、以 HTTP 探活为准）
6. 内置 WebView 自动切到星阙主界面

离线 `.pkg` 例外：

1. `postinstall` 直接确保共享本机组件可用
2. 首次打开时不再回退到联网下载本机组件
3. 离线安装结果损坏时，app 只提示重新安装离线包，不会偷偷转为联网修复
4. 启动页把恢复动作放在主视图里，日志和原始错误默认退到第二层
5. 离线安装完整可用时，主视图直接显示“已准备好，可直接打开使用”

正常流程下用户不会看到 Terminal。

## 更新模型

更新入口：`星阙 → 检查更新`

更新策略：

- 优先读取固定清单 `horosa-latest.json`（记录最新版本、各平台 `.zip` / `.pkg` / runtime URL 与 SHA-256）
- 开始下载前先显示“安装审查”，列出本次将要替换的 app、本机组件和缓存
- 客户端下载后先做 SHA-256 校验，再执行替换
- `.app` 替换采用备份旧包再写入新包的方式，失败自动回滚
- 目标应用位于 `/Applications` 时，更新阶段请求 macOS 管理员授权，再完成替换与重开
- runtime 切换采用 `current → previous → current` 事务式切换，失败自动回滚
- 替换完成后自动重开到原 `.app` 位置

数据保留：应用更新只替换 `.app`；runtime 更新只替换被勾选的共享或用户态本机组件；用户数据目录不会被删除。

## 如何确保客户端每次都能准确抓到更新

这套方案依赖固定 manifest，而不是“最新 release 的某个随机资产名”。发布时保持以下规则：

1. 版本号多文件 lockstep：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 与 `config/release_config.json` 的 `runtimeVersion`
2. Git tag 使用严格递增的 semver（如 `v2.6.6`）
3. 对外只保留一个公开安装入口：`Horosa-Installer-macos-arm64-offline.pkg`
4. 发布资产至少同时上传：`Horosa-Desktop-macos-arm64.zip`、`Horosa-Installer-macos-arm64-offline.pkg`、`horosa-latest.json`，以及 runtime 独立 release 中的 `horosa-runtime-macos-arm64.tar.gz`
5. `horosa-latest.json` 指向同一 tag 下的版本化资产 URL
6. Release 是正式版 latest，不要把预发布误当最新稳定版
7. 发布前用 `HOROSA_DESKTOP_SKIP_REBUILD=1 ./scripts/verify_desktop_packaging.sh` 验收，避免重复触发 Apple 签名与公证

只要这几条不破，客户端就会优先抓到固定 manifest，再按其中的准确 URL 和哈希完成更新。

## Apple Developer 正式分发准备

把离线 `.pkg` 作为面向陌生用户的正式外部分发包前，先准备好 Apple Developer 材料：

- `Developer ID Application`
- `Developer ID Installer`
- `notarytool` keychain profile（默认约定为 `horosa-notary`）

在发布机执行只读检查：

```bash
cd Horosa_Desktop_Installer
./scripts/check_apple_signing_prereqs.sh
```

脚本会检查：当前用户 keychain 中是否存在唯一可用的 `Developer ID Application` 与 `Developer ID Installer`，以及 `xcrun notarytool` 能否通过 `horosa-notary` 连到 Apple notarization 服务。三项都过即可进入正式外部分发模式。需要手动指定时：

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_INSTALLER_IDENTITY="Developer ID Installer: Your Name (TEAMID)"
export NOTARYTOOL_KEYCHAIN_PROFILE="horosa-notary"
```

## 本地构建与验收

```bash
cd Horosa_Desktop_Installer
./scripts/build_desktop_release.sh
./scripts/verify_desktop_packaging.sh
```

启动页与窗口状态是桌面交付的一部分，必须一并检查：

- 启动控制台只保留一套 Daily / Offline Ready / Failed 共用骨架，真实进度由后端 `__horosaProgress(pct, message, indeterminate)` 实时驱动，不允许只写死几个展示状态
- 三种语义状态都要检查进度数字、状态 chip、Pipeline、日志、CTA 与标题文案是否自洽；正在启动（indeterminate）时不得提前显示“已就绪”
- 错误态不能弹旧的大恢复面板遮住主进度区，恢复动作回到同一页面内的绿色主 CTA、日志与诊断入口
- 启动页统一使用最终星阙 icon，不混用临时 SVG 或旧图标
- 窗口大小恢复必须采样首个可见窗口帧；出现先大后小或跳动则阻断发布

```bash
python3 scripts/verify_launcher_console_states.py
```

正式外部分发构建：

```bash
cd Horosa_Desktop_Installer
HOROSA_PUBLIC_DISTRIBUTION=1 ./scripts/build_desktop_release.sh
HOROSA_DESKTOP_SKIP_REBUILD=1 ./scripts/verify_desktop_packaging.sh
./scripts/verify_public_distribution_readiness.sh
```

第一条是唯一会触发 Apple 正式签名、公证与 staple 的步骤；后两条只复用已生成的产物做验收，不重新构建、不重新提交 notarization。

正式构建额外动作：

- `.app` 用 `Developer ID Application` + hardened runtime + timestamp 签名
- 离线 `.pkg` 用 `Developer ID Installer` 签名
- 对 `星阙.app` 与 `Horosa-Installer-macos-arm64-offline.pkg` 分别提交 notarization 并 `staple`
- `.app` 完成 `staple` 后再生成 `Horosa-Desktop-macos-arm64.zip`

发布脚本会根据当前版本号、安装入口、自动更新资产和内置双语模板生成 GitHub Release 正文，无需仓库内单独的版本说明文件。

发布到 GitHub Release：

```bash
cd Horosa_Desktop_Installer
./scripts/publish_github_release.sh
# 正式外部分发：
HOROSA_PUBLIC_DISTRIBUTION=1 ./scripts/publish_github_release.sh
```

这个脚本会：先以 `HOROSA_DESKTOP_SKIP_REBUILD=1` 跑一遍本地验收（复用已签名、公证、staple 的产物）→ 创建或更新当前版本的 GitHub Release → 覆盖上传离线 PKG、桌面 app zip、manifest 与 runtime → 轮询校验 `releases/latest/download/horosa-latest.json` → 确认客户端更新入口能抓到当前版本。

验收脚本会检查：Rust 项目 `cargo fmt --check` 与 `cargo check`；runtime payload / `.zip` / `.pkg` / `horosa-latest.json` 是否生成；版本号是否同步；manifest 中的平台、URL、SHA-256 是否完整；离线 `.pkg` 能否把 bundled runtime 正确部署到 shared runtime；shared runtime 能否真实拉起 Horosa 后端服务；以及全量技法 smoke 后普通命盘接口仍必须成功（防 Swiss Ephemeris 全局路径被污染后退化成 `param error`）。

## 当前产物

默认输出目录：`dist/`

- `Horosa-Desktop-macos-arm64.zip`
- `Horosa-Installer-macos-arm64-offline.pkg`
- `horosa-runtime-macos-arm64.tar.gz`
- `horosa-latest.json`

## 说明

本工程支持两种模式：

- 默认模式：ad-hoc 本地构建，适合开发与自测
- `HOROSA_PUBLIC_DISTRIBUTION=1`：Developer ID 签名 + notarization，适合正式对外分发

正式分发前务必通过：

- `./scripts/check_apple_signing_prereqs.sh`
- `./scripts/verify_desktop_packaging.sh`
- `./scripts/verify_public_distribution_readiness.sh`
