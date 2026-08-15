# @deepseek-ai/dsh-project-git-local

[English](README.md) | 中文

本包是 `@deepseek-ai/dsh-project-foundations` 的本地 Git Service Provider。它通过已配置的 `ctx.shell` 执行器获取只读项目证据，并在内存中保留由调用方创建的检查点。

## 行为

- `inspect()` 以请求的 worktree 作为 `workdir`，通过 `ctx.shell.resolve()` 和 `ctx.shell.run()` 运行固定的只读 Git 命令。
- 接入记录当前提交、已附着时的已检出分支、已配置远程、本地分支和 porcelain status 路径。它拒绝输出被截断、非零退出、被取消或在收集期间提交发生变化的 Git 结果。
- 在成为规划证据之前，会从 HTTP 远程 URL 中移除 userinfo。该 provider 从不启动后台进程。
- `save()` 和 `get()` 保留并返回分离的内存检查点副本。它们不创建 ref、提交、分支、tag 或文件。

## 配置

| 键 | 默认值 | 含义 |
| --- | ---: | --- |
| `timeoutMs` | `15000` | 传递给 shell 执行器的每条命令截止时间。 |
| `stdoutMaxBytes` | `256000` | 每条命令的标准输出上限；输出截断时将拒绝结果。 |

## 模型体验

### 项目证据

#### 模型看到的内容

没有直接内容。后续经过批准门控的规划消费方决定是否将返回的接入事实加入已记录的上下文包。

#### Token 影响

在消费方将选定的 Git 事实序列化到模型可见上下文之前，token 消耗为零。

#### KV Cache 影响

此 Service Provider 不产生影响。消费方会在可复用请求前缀之后添加选定事实。

## 已知限制与延期工作

- 检查点是进程本地锚点，不是持久 Git ref 或回滚执行器。
- 本包只提供 Service Provider 角色。Phase 1 规划消费方负责批准门控、会话记录和任何实现写入。
