[English](README.md) · [简体中文](README.zh-CN.md)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-dark.svg">
  <img src="assets/brand/logo-horizontal.svg" width="420" height="112" alt="MCP ContractLab — 相连的契约括号与核验标记">
</picture>

# MCP ContractLab

**在你的智能体信任 MCP 工具之前，先测试这些工具。**

把工具的预期行为写成可提交到仓库的示例，运行可重复的断言和保守的接口兼容性检查。
仅运行显式授权的用例，用可离线阅读的报告记录通过、失败与未运行的结果。
这是独立的 MIT 开源项目，仅需 CPU。

[![main 分支 CI](https://github.com/dajinzhu/mcp-contractlab/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dajinzhu/mcp-contractlab/actions/workflows/ci.yml)

**尚未发布的测试版。** npm 包保持私有，尚未公开发布。
请按下方步骤从源码安装，不要使用 `npx mcp-contractlab` 或 npm 全局安装。
项目尚未达到生产就绪状态。使用官方拆分版 TypeScript SDK **2.4.0**，目标协议为
**MCP 2026-07-28**。需要 Node.js **>=22.13.0**，CI 测试 Node **22 和 24**；
旧协议版本未验证。不需要 LLM 密钥、GPU、数据库或账号。

## 创建自己的配置

从源码构建后，使用新文件名创建不执行操作的模板：

```sh
npm run cli -- init --output mcpcl.config.yaml --lang zh-CN
```

编辑服务器占位符，审查进程和工具权限；确认命令安全后，使用 `npm run cli -- inspect -c mcpcl.config.yaml --allow-exec` 检查测试服务器。检查会启动配置的进程，但不会调用工具。添加经过审查的无害用例、对应白名单项和足够的调用预算，再运行 `npm run cli -- test -c mcpcl.config.yaml --allow-exec`。未编辑的模板没有用例，测试不会通过。使用 HTTPS 时请审查端点并使用单独的 HTTP 授权。详见[首次运行说明](docs/first-run.md)。

## 从源码快速开始

```sh
git clone https://github.com/dajinzhu/mcp-contractlab.git
cd mcp-contractlab
npm ci
npm run build
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --lang zh-CN
```

三个无外部副作用的本地 `sum` 用例通过，退出码为 **0**。
服务器相对路径按配置文件所在目录解析。`--allow-exec` 仅授权启动进程，
不会提供沙箱，也不会自动授予工具调用权限。

把双语、单文件报告保存到一个**新的**文件名：

```sh
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --report html --output report.html --lang zh-CN
```

双击 `report.html`，或使用浏览器的**打开文件**功能。
English / 简体中文切换、明暗主题、搜索和筛选均可离线使用。
没有 CDN、字体下载、遥测或后端。HTML 必须写入新文件，不覆盖已有文件或链接；
整个文件的上限为 **4 MiB**。再次运行时请换一个新文件名。
参见[报告及限制](docs/reports.md)和[语言选择](docs/i18n.md)。

## 查看真实产品

下图来自**故意失败的本地 fixture**：三个失败、退出码 **1**，展示预期值、实际值和
JSON Pointer。这是真实生成的报告，不是界面模型、客户案例或生产准确率测量。

![真实失败 fixture 的桌面深色报告：三个契约失败，退出码 1](docs/examples/html/screenshots/failed-desktop-dark.png)

| Fixture               | 实际结果                           | 报告                                       |
| --------------------- | ---------------------------------- | ------------------------------------------ |
| 通过的本地 `sum` 用例 | 3 个通过；退出码 0                 | [HTML](docs/examples/html/passed.html)     |
| 故意错误的预期值      | 3 个失败；退出码 1                 | [HTML](docs/examples/html/failed.html)     |
| 未授权启动进程        | 3 个已阻止；退出码 3；覆盖情况未知 | [HTML](docs/examples/html/blocked.html)    |
| 本地服务器崩溃        | 1 个失败、1 个未运行；退出码 2     | [HTML](docs/examples/html/incomplete.html) |

GitHub 会显示 HTML 源码，请下载报告后在本地打开。
[来源说明和复现步骤](docs/examples/html/README.md)。

<details>
<summary>更多真实截图：通过的桌面报告与已阻止的中文移动报告</summary>

![真实通过 fixture 的桌面浅色报告](docs/examples/html/screenshots/passed-desktop-light.png)

<img src="docs/examples/html/screenshots/blocked-mobile-zh.png" width="300" alt="真实已阻止 fixture 的中文移动报告：三个已阻止用例、退出码 3、覆盖情况未知">

</details>

复现失败或安全阻止：

```sh
npm run cli -- test -c examples/mcpcl.broken.yaml --allow-exec --lang zh-CN
npm run cli -- test -c examples/mcpcl.config.yaml --lang zh-CN
```

这两条命令会故意以 **1** 和 **3** 退出。错误 YAML 修改的是预期值，
并没有暗中更改服务器。下一个示例才会改变服务器实现。

## 变更前后：检测工具被移除

| 变更前                         | 变更后                                | 兼容性检查                       |
| ------------------------------ | ------------------------------------- | -------------------------------- |
| 本地服务器声明 `echo` 和 `sum` | 第二个本地实现移除 `sum`，保留 `echo` | `sum` → `BREAKING`；退出码 **1** |

```sh
npm run cli -- snapshot -c examples/mcpcl.config.yaml --allow-exec --output before.snapshot.json
npm run cli -- diff -c examples/mcpcl.removed-tool.yaml --allow-exec --baseline before.snapshot.json --report console --lang zh-CN
```

diff 发现两个实现的接口，**不调用任何工具**。`test` 和 `diff` 不会更新基线。
请为上方基线选择新文件路径。[实际 diff JSON 与复现说明](docs/demos/README.md)
记录了这次故意的本地实现变更；没有往基线中人为插入“曾存在的工具”。
复杂 schema 仍标记为 `UNKNOWN`；`--strict` 也会让 `UNKNOWN` 导致检查失败。
简单的 schema diff 不能证明任意 JSON Schema 的兼容性。

## 当前已实现的功能

- 显式用例和工具白名单；顺序调用，不自动重试。
- JSON Pointer 的 `equals`、`exists`、`type` 断言；缺失与 `null` 不同。
- 在有资源边界的 worker 中以 JSON Schema 2020-12 验证输入和声明的结构化输出；
  绝不下载外部引用。
- 参数化用例行、规范化快照和保守的接口 diff。
- 中英文 console 和离线 HTML；供 CI 使用的稳定 JSON 与 JUnit。
- 区分已发现、已尝试、已完成和未测试的**工具**；记录符合条件的根属性枚举观测。
  这不代表完整的 schema 或语义覆盖率。
- 支持 stdio 和经审查的 Streamable HTTP 端点；需要显式进程／网络授权、
  精确的 HTTPS 主机和端点授权、公共 DNS 地址固定以及资源限制。
  HTTP 示例使用占位主机；未实现 OAuth。

```sh
npm run cli -- inspect -c examples/mcpcl.config.yaml --allow-exec
npm run cli -- test -c examples/mcpcl.parameterized.yaml --allow-exec --report json
npm run cli -- test -c examples/mcpcl.config.yaml --allow-exec --report junit --output report.xml
```

`inspect` 和 `diff` 默认输出 JSON；`--report console` 提供本地化的人类可读视图。
HTML 目前仅支持 `test`。语言不会改变机器字段、快照、授权或退出语义。

## 安全边界与退出码

| 退出码 | 含义                                             |
| ------ | ------------------------------------------------ |
| **0**  | 请求的检查通过                                   |
| **1**  | 契约失败或声明的兼容性检查失败                   |
| **2**  | 配置无效、空套件、操作／传输失败、中断或报告错误 |
| **3**  | 安全策略阻止执行                                 |

启动 stdio 需要 `--allow-exec`；调用还需要显式用例和 `safety.allowToolCalls`。
任一用例未获授权或预检预算不足，都会在启动前阻止整个套件。
`inspect`、`snapshot` 和 `diff` 从不调用工具。
传输失败会停止后续调用；未运行用例不等于通过。

**授权不会为程序或其副作用提供沙箱。** 请审查可执行文件路径及端点权限，
使用可丢弃的环境和只读凭据。未经副作用审查，不要测试生产工具。
报告会脱敏已知秘密，但基线保留服务器声明的 schema 和默认值，提交前务必审查。
参见[安全边界](docs/security.md)。

## 与其他 MCP 工具的关系

| 工具                                                                          | 适用重点                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| MCP ContractLab                                                               | 可重复、显式授权的应用行为示例，以及保守的接口兼容性检查 |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector)            | 连接、探索与调试 MCP 服务器，包括 CLI 工作流             |
| [官方 conformance suite](https://github.com/modelcontextprotocol/conformance) | 协议场景和规范要求                                       |

这是互补的侧重点，不是功能独占或优越性的证明。
ContractLab 不认证协议合规性，也不替代 Inspector。
[已记录的功能重叠与带日期的观察](docs/competitive-notes.md)还包含 mcpward 和 MCPLint。
不声称已有外部用户采用，也不声称真实场景准确率。

## 开发与贡献

先构建：集成测试使用编译后的本地 fixture。

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:unit
npm run test:smoke
npm run test:package
npm run docs:check
npx playwright install chromium
npm run test:browser
```

CI 运行 Node 22、Node 24 和 Chromium。独立的上游 fixture 检查要求 Node 24；
它是额外检查，不是主套件里被跳过的测试。请阅读[贡献指南](CONTRIBUTING.md)，
了解首个 PR、浏览器设置、负向退出验证、独立 fixture 和证据要求。

## 常见问题

**可以从 npm 安装吗？** 目前不可以。请使用源码检出或经审查的本地 tarball。
`private: true` 保持启用；发布需要单独批准。

**绿色报告能证明服务器安全或已完全覆盖吗？** 不能。
它仅描述显式用例和已测量分支。未测量的覆盖仍然未知；
合成 fixture 结果不能作为生产准确率声明。

**为什么报告或比较失败？** 请查看退出码和诊断。
断言失败不同于传输失败；已阻止不同于通过。
HTML 目标必须是新文件。参见[报告详情](docs/reports.md)。

**支持哪些协议和凭据？** 产品仅以 2026-07-28 为目标。
stdio 环境注入和可选 HTTP Bearer 认证都使用显式变量名；
未实现 OAuth 或旧协议自动回退。

## 文档与后续方向

以下技术参考文档主要为英文，原始资料保持可用。

[配置](docs/configuration.md) · [报告](docs/reports.md) ·
[兼容性](docs/compatibility.md) · [架构](docs/architecture.md) ·
[语言策略](docs/i18n.md) · [研究限制](docs/research.md) ·
[项目概览与 GitHub 元数据建议](docs/project-overview.md) ·
[路线图](docs/roadmap.md) · [发布门槛](docs/releasing.md) ·
[工程规则](AGENTS.md) · [原始计划](CODEX_BUILD_PLAN.md) · [MIT 许可证](LICENSE)

后续重点是外部复现与反馈、所有者控制的真实 HTTPS 互操作验证，以及审慎的发布准备。
本 PR 不代表已有公开测试版、公共主机 TLS 验证、外部反馈或生产就绪状态。

发布准备和未来 npm 安装草案与当前未发布的源码说明分开：
[发布就绪评估](docs/releases/README.md)。
