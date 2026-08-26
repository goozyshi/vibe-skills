# OpenSpec 1.10 桥接

**Engine owns artifacts.** auto-spec 只调用 OpenSpec 1.10.0 的 CLI 与官方 skills；不复制 schema、DAG、工件模板或生命周期。

## 版本与调用

要求精确版本 `1.10.0`。先运行 `<openspec> --version`；不匹配则停止，要求执行 `/auto-spec init` 升级或降级。

按优先级解析 `<openspec>`：

```
1. package.json devDependencies 必须精确包含 @fission-ai/openspec@1.10.0：
   - pnpm：`pnpm exec openspec`
   - npm：`npx --no-install openspec`
   - yarn：`yarn openspec`
   - bun：`bunx --no-install openspec`
2. `.auto-spec.yaml` 的 openspec.invoke 仅在它是上述项目本地调用时采用
3. 不满足 → 停止，提示 `/auto-spec init`
```

调用 `init` 或 `update` 后再次运行 `<openspec> --version`；不是 `1.10.0` 则停止。

## CLI 命令表

| 用途          | 命令                                         |
| ------------- | -------------------------------------------- |
| 配置 profile | `<openspec> config profile` |
| 初始化 engine | `<openspec> init --tools <ids>` |
| 生成官方 skills | `<openspec> update` |
| 列出 change   | `<openspec> list --json`                     |
| change 状态   | `<openspec> status --change <name> --json`   |
| 结构校验      | `<openspec> validate <name> --strict --json` |
| 语义核验      | 调用官方 verify skill；不是 CLI 子命令        |

仅在 1.10.0 内，CLI 参数以 `<openspec> --help` 为准。

## 官方 skills

custom profile 由 `<openspec> config profile` 选择。auto-spec 的调度集是 `propose`、`apply`、`verify`、`update`；`explore`、`sync`、`archive` 由人按 OpenSpec 官方流程使用。调度层直接调用已生成的官方 skill；不要重写其内容。

Cursor 的官方命令名为 `/opsx-propose`、`/opsx-apply`、`/opsx-verify`、`/opsx-update`、`/opsx-sync`、`/opsx-archive`。其他工具使用初始化生成的等价命令。

缺少调度集时停止 L2：重新配置 custom profile 包含缺失 skill，再运行 `<openspec> update`。

## propose 桥接

workflow `setup` 只走此链路：

1. 调用当前工具初始化生成的官方 `propose`。
2. 不可调用时，提示重新配置 custom profile 补齐缺失 skill，并运行 `<openspec> update` 后复验版本。
3. 仍不可调用时停止，提示运行 `/auto-spec init`。

禁止手写 change 目录中的 OpenSpec 工件。官方 skill 是 schema 与依赖的唯一来源。

用户显式请求 `sync` 或 `archive` 时，使用官方 OpenSpec skill。auto-spec 只报告现有证据与 review 结论，不决定或拦截这些操作。

## 安装方式

- 团队项目：devDependency 精确锁定 `@fission-ai/openspec@1.10.0`，CI 可复现。
- auto-spec 只支持项目 devDependency，保证 engine 与 CI 同版本。
- 将项目本地调用前缀写入 `.auto-spec.yaml`。

## 红线

不手改 `openspec-*` 官方 skill 正文。官方产物由 `openspec init` 管理；自定义逻辑只放 `auto-spec`。
