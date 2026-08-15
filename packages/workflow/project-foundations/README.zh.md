# @deepseek-ai/dsh-project-foundations

English | [中文](README.zh.md)

这个包为 Phase 1 本地优先规划路径提供确定性、无副作用的基础。调用方收集仓库事实和外部证据；该包不执行 Git、不写入工作树、不发起网络请求，也不调度模型。

## 职责

- 保存 Git 感知的项目接入证据，并且仅从已观察到的分支和提交创建回滚检查点。
- 从调用方估算的候选项中选择有预算上限的上下文包。
- 在模型请求前选择成本最低且允许的知识来源。
- 描述项目记忆存储及 RepoHive、HT AI Brain、Niimo 和 super-router 的薄适配器，而不导入这些系统。
- 从变更路径中选择基础验证和风险触发的专项审查。

## LM Studio

LM Studio 已通过 `@deepseek-ai/dsh-llm-pi-ai` 作为手动声明的 `openai-completions` 路由工作。在现有适配器中配置其本地端点和模型目录；本包将该路由归类为 `local-llm`，且不负责传输配置。

```yaml
providers:
  lm-studio:
    displayName: LM Studio
    api: openai-completions
    baseURL: http://127.0.0.1:1234/v1
    models:
      - id: local-model
        contextWindow: 32768
```

## 已知限制与延期工作

- `@deepseek-ai/dsh-project-git-local` 通过 shell seam 提供本地只读 Git 接入和进程本地检查点保留。`@deepseek-ai/dsh-project-memory-local` 通过文件系统 seam 持久化提炼记录。后续消费方仍负责模型可见会话事件、批准门控和实现写入。
- 适配器接口不包含凭据、重试策略或传输细节。每个外部系统提供方负责这些问题。
- 上下文 token 估算由调用方提供；精确的提供方计量仍由 `@deepseek-ai/dsh-token-meter` 负责。
