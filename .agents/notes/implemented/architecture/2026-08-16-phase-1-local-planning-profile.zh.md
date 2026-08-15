# Agent Note: 显式启用的本地优先 planning 组合将模型路由与写入权限分离

Status: implemented

[English](2026-08-16-phase-1-local-planning-profile.md) | 中文

## 问题

Phase 1 项目服务可以各自独立测试，但这不能证明它们的实际 Cordis 组合能够一起激活，也不能证明本地模型路由不会意外授予编辑权限。若 profile 扩展已交付的 agent 组合，会让实验性工作流默认可用，并继承与 planning 无关的面向模型写入能力。

## 决定

`examples/phase1-local/cordis.yml` 是一个显式启用的 Loader 组合。它在本地 shell provider 之上挂载 `dsh-project-git-local`，在本地 filesystem provider 之上挂载 `dsh-project-memory-local`，并把 `dsh-project-planning` 作为唯一 workflow consumer。它通过 `dsh-llm-pi-ai` 注册 LM Studio OpenAI-compatible 路由；该路由只提供配置，因为此组合没有挂载 agent loop 或 model consumer。

示例 runner 调用 `projectPlanning.plan()`，并验证返回的 `implementationApproval` 对 `implementation-write` 保持 `awaiting-human-approval`。它不会挂载能写入 implementation 文件的 tool 或 workflow。组装后的 Loader 测试固定已注册的 LM Studio 路由和每一个必需的本地 planning service。

## 曾考虑的替代方案

- **扩展 `headless` 或 `web`**：这些已交付 profile 有意拥有 agent loop 和面向模型的工具，因此仅供 planning 的演示会扩大默认安装的能力集合。
- **让 planning consumer 派发已配置的 LM Studio 路由**：planning 需要选择证据并暴露后续模型路由，而不应拥有请求日志、模型执行或 implementation 权限。
- **内联 API key**：凭据仍由环境拥有，绝不提交到组合文件；文档中的占位符满足要求 authorization header 的本地 OpenAI-compatible endpoint。

## 影响

Operator 可以用与 Phase 1 路径相同的 provider 检查本地 repository，同时源树没有可调用的 implementation-write consumer。LM Studio 配置可由后续 session-aware planning-board consumer 复用；该 consumer 必须自行加入 model-visible logging 和验证。示例的 memory document 是可配置的本地文件，在所演示的请求中只会被读取。
