# Agent Note: 本地项目记忆保持提炼并经由文件系统

Status: implemented

[English](2026-08-15-local-project-memory.md) | 中文

## 问题

Phase 1 规划需要持久的项目事实和决策检索，同时不能把原始模型 transcript、外部系统响应或直接宿主文件系统访问混入 Harness core。

## 决定

`ProjectMemoryService` 是项目记忆的 Service Definition。`@deepseek-ai/dsh-project-memory-local` 通过 `ctx.fs` 用一个本地 JSON 文档提供它。它只接受和返回分离的 `ProjectMemoryRecord` 值；记录包含调用方拥有的标识符、分类后的提炼概述、支持证据和时间戳。搜索要求具体词语，在保留的规划证据中匹配这些词语，并按最新时间戳、再按标识符排序结果。

本地提供方通过已配置的字节上限读取完整文档，校验 UTF-8 和每条持久记录，并在写入时使用受保护的原子替换。无效的持久数据和写入方竞争都会快速失败。提供方中没有会话事件、模型注入、工具注册、外部服务调用、Git 操作或实现写入。

## 影响

项目记忆可供经过批准门控的规划路径使用，而不会耦合到数据库、云服务或特定宿主文件系统 API。由于消费方使用 Service Definition，提供方可替换为 RepoHive、HT AI Brain 或其他存储。原始 transcript 留在持久项目记忆之外；并发的本地写入方必须从新的读取结果重试，不能静默覆盖另一条记录。

## 曾考虑的替代方案

- **直接使用 `node:fs` 持久化**：会绕过 Harness 文件系统执行环境，也使沙箱或远程文件系统提供方无法拥有项目记忆 I/O。
- **使用会话日志存储**：会让每个保留的项目事实获得模型可见的持久性，并在消费方尚未需要这种耦合时把跨任务记忆绑定到一个会话的生命周期。
- **立即集成 RepoHive 或 HT AI Brain**：会让 Phase 1 本地规划依赖外部可用性，并重复这些系统各自负责的传输和凭据工作。
