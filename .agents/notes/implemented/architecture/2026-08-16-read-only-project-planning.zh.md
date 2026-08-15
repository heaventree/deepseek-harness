# Agent Note: 只读项目规划保留批准边界

Status: implemented

[English](2026-08-16-read-only-project-planning.md) | 中文

## 问题

Phase 1 需要一项统一的规划操作，用于检索 Git 接入、提炼后的项目记忆和可选外部证据，同时不向调用方提供实现写入路径，也不把 Heaventree 服务嵌入 Harness。

## 决策

`@deepseek-ai/dsh-project-planning` 是项目接入和项目记忆 Service Definition 的只读消费方。它读取一次接入，检索匹配的本地记忆，接收调用方提供的本地候选项，并且只通过类型化接口调用可选的 RepoHive、HT AI Brain、Niimo 和 super-router 适配器。该包没有传输、凭据、文件系统、shell、模型、会话、工具或 agent loop 依赖。

该消费方通过 `buildContextPack()` 构建紧凑上下文，并通过 `governTokens()` 选择后续模型来源。token 估算和远程使用权限仍由调用方输入。它只在选中模型来源后解析 super-router 路由，并且从不调度该路由。

每个结果都将 `implementationApproval` 声明为等待对实现写入的人工批准。该包既不接受批准断言，也不组合实现消费方，因此后续写入路径必须通过 Harness 的批准和 sandbox 能力建立自己的人工批准和强制执行。

## 考虑过的替代方案

- **向 `agent-loop` 添加规划逻辑**：拒绝，因为项目规划是可选的，且 Git 接入、记忆检索或部署特定证据提供方并不归 loop 所有。
- **直接连接 RepoHive、HT AI Brain、Niimo 和 super-router**：拒绝，因为其凭据、传输、重试和服务可用性归各自提供方所有。
- **接受一个布尔批准标志**：拒绝，因为调用方可控的值无法为后续实现写入建立人工批准边界。

## 后果

规划结果标明选中的证据、省略的证据、已观察到的 worktree 和模型路由风险以及验收条件，而不产生模型请求或可变仓库状态。该包有聚焦服务测试和已说明的空 invariant，因为它不拥有已发布事件流或持久化可变关系。未来具备会话感知能力的规划 board 消费方必须先记录模型可见上下文、组装真实 profile 并添加 snapshot 覆盖，之后才能呈现生成的 PRD 或实现内容。
