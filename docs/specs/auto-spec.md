# Auto-Spec

> 状态：实现中
> Skill：`.cursor/skills/auto-spec/`

## 定位

**Dispatch**：auto-spec 决定变更是否需要 OpenSpec，以及何时收集证据、安排 review、交给人验收。

| 层 | 负责 |
| --- | --- |
| OpenSpec | change、delta specs、官方 skills、validate、archive。 |
| auto-spec | L0/L1/L2 分级、官方 skill 调度、review 时机、跨会话路由、handoff。 |
| 人 | 验收和是否执行 OpenSpec archive。 |

auto-spec 不复制 OpenSpec 工件、change 生命周期或 archive 门禁。

## Dispatch 流

```text
classify → dispatch → evidence → review → handoff
```

1. `classify`：消费者契约不变为 L0；证据不足为 L1；契约变化为 L2。
2. `dispatch`：L2 调官方 `propose`、`apply`、`update`。
3. `evidence`：收集 OpenSpec status/validate、verify、测试与验收对照。
4. `review`：独立 review 按风险触发。
5. `handoff`：报告可人工验收或 BLOCKED；人使用官方 OpenSpec archive。

## Review 策略

| 变更 | 策略 |
| --- | --- |
| L0 | 不做独立 review。 |
| L1 | 先重分级；共享或不确定契约仍存在时才 review。 |
| 普通 L2 | tasks 100% 且证据齐全时，一次 final review。 |
| 高风险 L2 | tasks ≥80% 时一次 interim 风险 review；100% 时 final review。 |

高风险：安全/权限、支付或余额、数据写入或迁移、公共/共享 API、跨模块契约，或失败检查后的重新规划。

`last_review_snapshot` 只用于同一代码快照、同一 review 类型的去重；它不是 OpenSpec 状态。

## 目录

```text
.cursor/skills/auto-spec/
├── SKILL.md
├── commands/init.md
└── references/
    ├── classify.md
    ├── dispatch.md
    ├── review.md
    ├── handoff.md
    ├── recover.md
    ├── schedule-context.md
    └── openspec-bridge.md
```

项目安装后，`.auto-spec/changes/<name>.yaml` 只保存文件关联、关键词和 review 去重元数据。OpenSpec 的 `openspec/changes/` 与 `openspec/specs/` 是唯一工件真相。

## 配置

```yaml
version: "1.2"
openspec:
  invoke: "pnpm exec openspec"
scheduling:
  high_risk_interim_review: true
```

配置不声明 archive acceptance，因为 auto-spec 不控制 archive。

## 验证目标

Eval 覆盖：

1. L0 bugfix 不进入 OpenSpec，也不独立 review。
2. L1 先调查后重分级。
3. L2 先 propose，再 apply。
4. 普通 L2 只在 100% 时 final review。
5. 高风险 L2 在 80% 时 interim review。
6. 同一 snapshot 不重复同类 review。
7. handoff 只报告证据，不调用 archive。
