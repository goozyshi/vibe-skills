# OpenSpec 桥接

schedule 层调 engine 的唯一入口。CLI 细节以此文件为准，workflow 不重复。

## invoke 解析

按优先级解析 `<openspec>` 调用前缀：

```
1. 项目 `.auto-spec.yaml` 的 openspec.invoke
2. package.json devDependencies 含 @fission-ai/openspec → `pnpm exec openspec`（按项目包管理器换 npx/yarn）
3. 全局 `openspec`（PATH 可解析）
4. 均不可用 → 停止，提示 `/auto-spec init`
```

## CLI 命令表

| 用途 | 命令 |
|------|------|
| 初始化 engine | `<openspec> init --tools <ids>` |
| 列出 change | `<openspec> list --json` |
| change 状态 | `<openspec> status --change <name> --json` |
| 结构校验 | `<openspec> validate <name> --strict --json` |
| 归档 | `<openspec> archive <name>` |

CLI 参数以 `<openspec> --help` 输出为准；上表与本地版本不符时信环境。

## 工具 invoke 表

`openspec init --tools` 生成的官方 slash，按工具 ID 映射：

| 工具 | propose | apply | archive |
|------|---------|-------|---------|
| Cursor | `/opsx-propose` | `/opsx-apply` | `/opsx-archive` |
| Claude | `/opsx:propose` | `/opsx:apply` | `/opsx:archive` |
| Codex | `$openspec-propose` | `$openspec-apply` | `$openspec-archive` |

## propose 桥接

workflow `l2-setup` 第 2 步按以下顺序选择：

1. 当前工具的官方 propose slash 可用 → 调用之，传入从用户消息提取的结构化内容。
2. 不可用 → 直接按 OpenSpec 目录约定手写 `openspec/changes/<name>/` 的 `proposal.md` / `tasks.md` / delta specs，再用 `<openspec> validate <name> --strict` 校验。

## devDep vs 全局

- 团队项目 → devDep（`package.json` 加 `@fission-ai/openspec`），版本锁定，CI 可复现。
- 个人/多仓库复用 → 全局 `npm i -g @fission-ai/openspec`。
- 选择结果写入 `.auto-spec.yaml` 的 `openspec.invoke`，后续会话不再检测。

## 红线

不手改 `openspec-*` 官方 skill 正文；官方产物由 `openspec init` / `openspec update` 管理。自定义逻辑只放 `auto-spec` / `auto-spec-*`。
