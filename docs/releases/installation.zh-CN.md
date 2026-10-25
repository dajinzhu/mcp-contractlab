# 安装说明——未来公开测试版草案

[English](installation.en.md) · [简体中文](installation.zh-CN.md)

**尚未发布。今天不要执行下方“未来 npm 安装”命令。** 包仍为私有状态。
发布必须经过单独批准的发布 PR；本文不代表已取得名称、所有权、可用性或生产就绪认证。

## 当前可用：经审查的源码或本地候选包

需要 Node >=22.13.0；CI 验证 Linux Node 22/24。产品仅以 MCP 2026-07-28 为目标，
没有旧协议自动回退。源码安装请使用[当前 README](../../README.zh-CN.md)。
按[候选包工作流](README.md)构建候选包，再使用同一 CI 产物中的 `SHA256SUMS`
核对下载文件的 SHA-256。

```sh
npm install --prefix ./mcpcl-consumer --ignore-scripts --no-audit --no-fund /absolute/path/to/mcp-contractlab-0.1.0-beta.1.tgz
./mcpcl-consumer/node_modules/.bin/mcpcl --version
./mcpcl-consumer/node_modules/.bin/mcpcl --help
./mcpcl-consumer/node_modules/.bin/mcpcl --lang zh-CN --help
```

上述加固安装禁用包脚本。CI 还会先确认解析后的依赖树没有安装钩子，再验证一次
全新的、使用锁文件和默认生命周期的离线重装。依赖必须先下载并缓存。

## 仅供未来：获批发布并独立确认之后

拟议首个测试版版本为 `0.1.0-beta.1`，使用 `beta` 标签，不自动提升为 `latest`。
执行前必须重新核对实际版本、所有权、许可证归属和 provenance 证明：

```sh
npm install --global mcp-contractlab@0.1.0-beta.1
mcpcl --version
mcpcl --lang zh-CN --help
```

这些命令是发布草案，不是当前可用的安装承诺。真正发布后，应在实际 npm 页面
核对版本、CLI 入口和证明信息。确认之前不要替换 README 中仅从源码安装的说明。

## 第一个契约

在经审查的源码检出目录中，当前示例已经可用：

```sh
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec
npm run cli -- test -c examples/mcpcl.broken.yaml --allow-exec
npm run cli -- test -c examples/mcpcl.config.yaml
```

预期退出码依次为 0（三个通过）、1（三个故意失败）、3（已阻止）。
连接自己的服务器时，复制并审查配置模板、命令和显式工具白名单，不要盲目复制授权。
`inspect` 只发现、不调用工具，但启动 stdio 仍需进程授权。HTTP 另需精确端点和主机授权；
尚未实现 OAuth 或旧协议回退。

HTML 需要 `--report html --output NEW_PATH`，可离线使用并保留套件退出码；
文件／报告错误以 2 退出。不要覆盖已有报告。JSON/JUnit 和快照保持机器稳定性。
授权不会提供沙箱；请使用可丢弃的环境和无危险权限的凭据。[安全说明](../security.md)。
