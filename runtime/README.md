# runtime 目录说明

该目录用于存放**本机生成的运行时缓存**（例如打包的 Java/Python 运行时、离线 bundle）。

- GitHub 版本默认不提交这些大体积二进制文件。
- 在任意 Mac 上首次运行 `Horosa_OneClick_Mac.command` 时会自动准备所需环境和构建产物。
- 如果你需要制作“完全离线包”，可以本地执行 `tools/mac/Prepare_Runtime_Mac.command` 生成内容，再自行打包分发（不建议直接提交到 GitHub 仓库）。

## 保留策略

为避免大体积中间产物长期占用磁盘，`runtime/` 仅保留“运行 + 自检”所需的最小集合：

- `runtime/mac/`
  - 供本地启动/自检脚本复用的一键部署 runtime

主限法逐字节自检使用 `Horosa-Web/astropy/astrostudy/tests/` 下随仓发布的 golden 基线，无需额外本机数据。其余大体积本机中间文件不入库；如需在本机另行生成离线材料，本地生成即可，不提交到仓库。
