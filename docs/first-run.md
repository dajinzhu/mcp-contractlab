# Safe first run / 安全首次运行

From a built source checkout, run `npm run cli -- init --output mcpcl.config.yaml` (or use `mcpcl init --output mcpcl.config.yaml` when running an installed candidate). Select `--lang en` or `--lang zh-CN`; normal language precedence applies. The destination must be a new file in an existing, non-aliased directory. No existing file or link is replaced. The template has version 1, an empty allowlist, zero call budget and no cases. It does not start a process, connect to a server, discover tools, read credentials or authorize execution.

Edit the server name, command and arguments to point at your own disposable test server. Review its process permissions and side effects. Once reviewed, run `mcpcl inspect -c mcpcl.config.yaml --allow-exec` for stdio; this starts that process and lists tools without calling them. For HTTPS, configure the exact reviewed endpoint and host and explicitly use `--allow-http` instead. Choose a harmless tool, add a matching allowlist entry, increase `maxToolCalls`, and add an explicit case with expected results; then run `mcpcl test -c mcpcl.config.yaml --allow-exec` for stdio. Neither command is run automatically. An empty suite returns a nonzero exit code.

在源码构建后运行 `npm run cli -- init --output mcpcl.config.yaml --lang zh-CN`；安装候选包后可使用 `mcpcl init --output mcpcl.config.yaml --lang zh-CN`。目标必须是已有、无路径别名目录中的新文件；现有文件和链接不会被替换。模板版本为 1，白名单为空，调用预算为零且没有用例。初始化不会启动进程、连接服务器、发现工具、读取凭据或授权执行。

将服务器名称、命令和参数改为您自己的临时测试服务器，审查进程权限和副作用。确认安全后，stdio 可运行 `mcpcl inspect -c mcpcl.config.yaml --allow-exec`；它会启动进程并列出工具，但不调用工具。HTTPS 需要配置经审查的精确端点和主机，并单独使用 `--allow-http`。选择无害工具，添加相应白名单项、增加 `maxToolCalls` 并添加具有预期结果的明确用例，然后使用 `mcpcl test -c mcpcl.config.yaml --allow-exec` 运行 stdio 测试。工具不会自动执行上述命令，空测试集返回非零退出码。

The directory must be trusted against concurrent replacement: portable Node APIs do not provide directory-handle-relative atomic publication. The exclusive final link prevents overwriting an existing destination, including a concurrent file or link. / 目录必须可信且不能被其他进程并发替换；可移植的 Node API 不提供基于目录句柄的原子发布。最终独占链接可防止覆盖已有目标，包括并发创建的文件或链接。
