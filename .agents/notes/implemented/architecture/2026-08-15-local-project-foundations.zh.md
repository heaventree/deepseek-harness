# Agent Note: 本地项目基础保持确定性并与外部系统无关

Status: implemented

English | [中文](2026-08-15-local-project-foundations.zh.md)

## 问题

Phase 1 需要 Git 感知的项目接入、有预算上限的上下文选择、模型层级决策、项目记忆、外部智能和验证检查点。若直接添加到 agent loop，会将获取工作绑定到单一执行器，把外部 Heaventree 系统合并进 Harness，并使确定性准备与模型调度无法区分。

## 决策

`@deepseek-ai/dsh-project-foundations` 负责无副作用词汇和确定性决策。它保留调用方收集的 Git 证据，仅从已观察到的分支和提交创建检查点，选择有预算上限的上下文，应用 Phase 1 来源优先顺序，并将变更路径映射到验证和专项触发器。

项目记忆存储以及 RepoHive、HT AI Brain、Niimo 和 super-router 集成均为接口。其提供方负责凭据、HTTP、重试、持久化和部署策略。LM Studio 仍是现有 pi-ai 适配器的已配置路由，而非并行提供方。

## 考虑过的替代方案

- **向 `agent-loop` 添加行为** — 拒绝，因为仓库获取和规划是可选能力，且架构要求使用插件而不是修改 loop。
- **嵌入外部客户端** — 拒绝，因为每个系统都有所有权边界和部署特定凭据。
- **创建 LM Studio 适配器** — 拒绝，因为现有 pi-ai 适配器支持手动声明的 OpenAI 兼容端点。

## 后果

后续提供方可以通过 shell seam 执行 Git，并通过本地存储持久化记忆，而无需改变规划决策。后续 Cordis 消费者必须通过会话事件记录模型可见上下文，并在成为已发布能力之前提供已组装的组合覆盖。
