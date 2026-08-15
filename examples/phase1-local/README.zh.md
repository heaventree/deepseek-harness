# phase1-local

[English](README.md) | 中文

这个显式启用的组合装配本地 Git intake provider、基于文件系统的精炼项目记忆，以及只读 project planning consumer。它还通过 `@deepseek-ai/dsh-llm-pi-ai` 注册一个 LM Studio OpenAI-compatible 路由，但本示例不派发模型请求。

## 运行

启动 LM Studio 本地服务器，然后提供一个 API key 占位符，因为 OpenAI-compatible adapter 总会发送凭据。本 Phase 1 组合中的 runner 不会连接该服务器。

```powershell
$env:LM_STUDIO_API_KEY = 'lm-studio'
$env:LM_STUDIO_MODEL = 'your-loaded-model' # 可选；默认：local-model
$env:LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234/v1' # 可选
pnpm exec tsx examples/phase1-local/start.ts --root . --task 'Inspect this repository and propose a narrow change.'
```

`DSH_PHASE1_MEMORY_PATH` 可覆盖默认的 `.dsh/phase1-project-memory.json` 位置。项目记忆只保存精炼记录；本示例会读取它，但不会创建或更新它。

## 审批边界

Runner 会输出一个 `ProjectPlanningResult`，其 `implementationApproval` 始终为 `{ status: 'awaiting-human-approval', operation: 'implementation-write' }`。组合中没有 agent loop、面向模型的写入工具、implementation-write consumer 或外部服务客户端。后续 implementation workflow 必须取得人工批准并组合自己的 write consumer；它不能从此 planning result 推断出该权限。
