# 增量更新制度(部件化 runtime)SOP

> 任何后续开发(任何 session / 任何 agent)按本文操作即可维护与演进增量更新。
> 机制三件套:打包切分(`scripts/package_runtime_payload.sh`)· 发布(`scripts/build_desktop_release.sh` + `scripts/publish_github_release.sh`)· 客户端(`src-tauri/src/main.rs`)。
> 护栏:`scripts/release_preflight.sh` 第 [74] 节 · `scripts/verify_component_release.sh` · `cargo test component_`。

## 1. 原理一页纸

- 全量 runtime tar(~600MB)按**稳定性边界**切成 7 个部件 tar;`components-lock.json` 记录每个部件的 `sha256/size/paths|files/preserve`,是切分结果的唯一产物真值源。
- 更新 manifest(`horosa-latest.json`)升到 `manifestVersion: 2`:v1 字段全保留(老客户端零影响),新增 `platforms[key].components[]` 与 `componentsLockUrl/Sha256`。
- 客户端把 manifest 部件 sha 与本地 `current/components-lock.json` 逐一比对,**只下载变化的部件**,以「clone 暂存 → 部件手术 → current/previous 原子对换」应用;任何一步失败自动回落全量 tar,current 纹丝不动。
- **全量 tar 永远照旧产出且自带 components-lock.json**(打包脚本写进 stage 根):首装 pkg、离线安装、修复、回退安装完成后本地即有增量基准,无需迁移逻辑。
- 发布时按「线上 latest manifest」做跨版本 asset 复用:sha 未变的部件不重复上传,manifest 中该部件 url 直接指向其首次发布所在 release 的资产(GitHub release 资产 URL 永久有效)。

常规版本更新(业务代码/前端改动)下载量:`web-app`(~60MB)+`java-app`(~3MB)≈ **63MB,对比全量 ~611MB 省约 90%**。

## 2. 部件边界表(唯一真值源=打包脚本内数组;本表与 preflight [74] 锚与之 lockstep)

| 部件 | 类型 | 覆盖 | 变化频率 | 压缩后体积 |
|---|---|---|---|---|
| `py-runtime` | tree | `runtime/mac/python`(解释器+site-packages) | 极少(依赖升级) | ~113MB |
| `jdk-runtime` | tree | `runtime/mac/java`(jlink JDK) | 极少 | ~25MB |
| `ephe-data` | tree | `Horosa-Web/flatlib-ctrad2/flatlib/resources`(星历) | 几乎永不 | ~100MB |
| `xuanshi-data` | tree | `Horosa-Web/astropy/astrostudy/xuanshi` | 少 | ~26MB |
| `web-app` | tree | `Horosa-Web` 整树(exclude 上两数据子树;preserve 声明) | **每版** | ~60MB |
| `java-lib` | files | `boot-exploded/BOOT-INF/lib` 中三方 jar(文件名前缀非 `astro/basecomm/boundless`) | 少(依赖升级) | ~284MB |
| `java-app` | files | bundle 其余(自家 jar+classes+META-INF+loader)+ stage 根散文件 | **每版** | ~3MB |

- `tree` 部件应用=先删 `paths` 声明的子树再解压;`web-app` 的 `preserve` 声明两个数据子树在删树前挪出、解压后放回(其 tar 不含它们)。
- `files` 部件应用=(旧清单 files − 新清单 files)逐个删除消失文件,再覆盖解压。
- 打包脚本内建**零遗漏零重叠校验**:所有部件覆盖面必须恰好等于全量 stage 文件集,漂移即打包失败。

## 3. 发版 runbook(增量视角;其余照常规发版流程)

1. 常规构建:`bash scripts/build_desktop_release.sh`(内部调 `package_runtime_payload.sh`,默认 `HOROSA_BUILD_COMPONENTS=1` 产 `dist/components/` 7 部件 + lock;manifest 自动升 v2)。
2. `bash scripts/release_preflight.sh` —— [74] 会对 lock 与部件实物做 sha 全核。
3. `bash scripts/verify_component_release.sh` —— 本地模式:部件合成树与全量树逐条目(内容 sha+symlink)等价。
4. `bash scripts/publish_github_release.sh` —— 自动:拉线上 latest manifest → sha 未变部件复用旧 url 不上传 → 变化部件+lock 上传到 runtime release → manifest 重写后上传。
5. 发布后终验:`bash scripts/verify_component_release.sh "<manifest 下载 URL>"` —— 远端模式全链路(结构/sha/树等价)。

## 4. 变更操作手册

### 4.1 新增/调整部件边界(三处 lockstep,缺一 preflight 红)
1. `package_runtime_payload.sh` 的 `tree_components` 数组或 files 段——唯一真值源;
2. 本文件 §2 边界表;
3. `release_preflight.sh` [74] 的部件名单锚。
然后:重跑打包 → preflight → `verify_component_release.sh` 本地模式必须绿(零遗漏零重叠校验会拦住切分漏洞)。客户端零改动(应用细节全部由 lock 驱动)。

### 4.2 新增排除依赖 / 调整 runtime 内容
照常改打包脚本;部件机制自动跟随(内容变化反映为对应部件 sha 变化)。注意 `test_runtime_deps_slim.py` 与排除表的既有 lockstep。

### 4.3 回退/禁用增量(故障剧本)
- **单机**:环境变量 `HOROSA_UPDATE_FULL_ONLY=1` 启动 → 客户端只走全量。
- **全网**:发布一个不带 `components` 字段的 manifest(或 `manifestVersion` 回 1)→ 所有客户端自动全量,零客户端改动。
- **部件资产损坏**:客户端 sha 校验失败 → 当次自动回落全量下载,自愈;修复方式=重传正确部件资产。
- **增量应用失败**:current/previous 原子对换协议保证 current 不动;客户端报错后用户重试即可(重试仍失败会一直回落全量路径)。

## 5. 客户端行为矩阵(降级全覆盖,均有 cargo test / 代码路径背书)

| 场景 | 行为 |
|---|---|
| manifest v1(无 components) | 全量(`plan_component_diff` 返回 None) |
| GitHub API 回退源(manifest 拉取失败) | 全量(该源恒无 components) |
| 本地无 `current/components-lock.json`(老装机) | 全量;全量 tar 自带 lock,装完即具备增量基准 |
| `HOROSA_UPDATE_FULL_ONLY=1` | 全量 |
| 多 runtime root(共享+用户修复态) | 全量(各 root 已装态可能不同) |
| 部件/lock 下载或 sha 校验失败 | 当次回落全量下载 |
| 增量应用中途失败(坏包/磁盘) | current 纹丝不动,报错;重试或回落 |
| lock 的 runtimeVersion/appName 与预期不符 | 拒绝增量(通道隔离纵深),回落全量 |
| 首装 pkg / 离线安装 | 不受影响(不走更新通道) |

## 6. 多平台

manifest 的 `platforms` 按 key 隔离(`darwin-aarch64` 等)。其他平台接入=平台侧打包脚本按同一边界表切部件、产同构 lock、manifest 平台条目加 `components`;客户端逻辑同构移植(diff/下载/应用/回退)。部件边界表(§2)是跨平台共同真值源。

## 7. 护栏清单

| 护栏 | 拦什么 |
|---|---|
| 打包内建零遗漏零重叠校验 | 切分边界漂移漏文件/重复覆盖(打包即失败) |
| preflight [74] | 机制五件套锚缺失;lock 与部件实物 sha 漂移;部件名单变更未过三处 lockstep |
| `verify_component_release.sh` | 部件合成树 ≠ 全量树(逐条目内容 sha+symlink);发布资产 sha/结构损坏 |
| `cargo test component_` | tree/preserve/files 应用语义回归;失败原子性;diff 门控矩阵 |
| build 脚本 lock 漂移闸 | 旧部件残留混入新版本 manifest(runtimeVersion/appName 不符即失败) |
| publish digest 幂等 | 同名异 sha 资产残留(删旧重传,防客户端校验失败) |
