# @deepseek-ai/dsh-project-planning

[English](README.md) | 中文

此包是 Phase 1 项目路径的只读规划消费方。它将 `ctx.projectIntake`、`ctx.projectMemory`、调用方提供的本地候选项和可选薄适配器结果组合成一个有预算上限的上下文包。它不组合实现写入消费方、不调度模型、不注入会话上下文，也不直接调用外部客户端。

## 行为

- `plan()` 读取一次本地接入和相关项目记忆记录。服务在结果离开前复制返回的证据。
- RepoHive、HT AI Brain、Niimo 和 super-router 是由调用方提供的可选类型化适配器。缺少适配器时不贡献证据；已配置适配器仍负责凭据、传输、重试策略和可用性失败。
- 调用方提供所有生成证据的 token 估算和 governor 输入。上下文 broker 会拒绝超出预算的必需任务，并省略无法放入预算的低优先级证据。
- 结果始终公开 `implementationApproval: { status: 'awaiting-human-approval', operation: 'implementation-write' }`。单独经过人工批准的消费方负责每一次实现写入。
- 在 token governor 选择模型来源后，super-router 适配器可以解析后续路由。此包不调用该路由或任何模型。

## 模型体验

### 规划证据

#### 模型看到什么

没有直接内容。后续具备会话感知能力的消费方必须先记录选中的 `context` 条目，再将其序列化进模型请求。

#### Token 影响

`context.usedTokens` 受调用方提供的 `contextBudgetTokens` 限制；省略的证据列在 `context.omitted` 中。

#### KV Cache 影响

此包没有影响。后续模型消费方决定已记录上下文包在请求中的位置。

## 已知限制与延期工作

- 返回的 outputs 描述选中的证据和模型来源决定；规划 board 模型消费方仍负责生成 PRD、架构和执行计划。
- 批准要求是显式结果边界，并不替代强制执行写入的 Harness sandbox 或批准策略服务。
- 此包没有 session event、已组装 profile、工具或模型调度。未来面向模型的消费方必须连同真实组合和 snapshot 覆盖一起添加这些内容。
