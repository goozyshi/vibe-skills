# Auto-Spec

> 状态：实现中
> Skill：`.cursor/skills/auto-spec/`

## 定位

**Dispatch**：auto-spec 决定变更是否需要 OpenSpec，以及何时收集证据、安排 review、交给人验收。

| 层        | 负责                                                               |
| --------- | ------------------------------------------------------------------ |
| OpenSpec  | change、delta specs、官方 skills、validate、archive。              |
| auto-spec | L0/L1/L2 分级、官方 skill 调度、review 时机、跨会话路由、handoff。 |
| 人        | 验收和是否执行 OpenSpec archive。                                  |

auto-spec 不复制 OpenSpec 工件、change 生命周期或 archive 门禁。

## Dispatch 流

```text
classify → dispatch → apply return → check → review → handoff
```

1. `classify`：消费者契约不变为 L0；证据不足为 L1；契约变化为 L2。
2. `dispatch`：L2 调官方 `propose`、`apply`、`update`；`apply` 附 return ticket。
3. `apply return`：完成实现后必须回到 auto-spec `check`，不能直接结束或 handoff。
4. `check`：收集 OpenSpec status/validate、verify、测试与验收对照。
5. `review`：证据齐全时独立 review 按风险触发。
6. `handoff`：报告可人工验收或 BLOCKED；人使用官方 OpenSpec archive。

## Review 策略

| 变更      | 策略                                                                 |
| --------- | -------------------------------------------------------------------- |
| L0        | 不做独立 review。                                                    |
| L1        | 先重分级；共享或不确定契约仍存在时才 review。                        |
| 普通 L2   | tasks 100% 且证据齐全时，同一回合一次 final 子代理 review。          |
| 高风险 L2 | tasks 80%–99% 时一次 interim 风险 review；100% 时 final 子代理 review。 |

高风险：安全/权限、支付或余额、数据写入或迁移、公共/共享 API、跨模块契约，或失败检查后的重新规划。

`last_review_snapshot` 只用于同一代码快照、同一 review 类型的去重；`last_review_conclusion` 与 `last_review_report` 保存结果和报告引用。它们都不是 OpenSpec 状态。

review 不固定模型名。运行时优先选择与实现会话不同的可用模型；无可用异模型时继承。

测试、lint、build、`verify` 与实现代理自检只提供证据，不能代替 final review。缺少独立子代理报告时必须 `BLOCKED`，不能报告可人工验收。

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
6. 独立子代理优先使用不同模型，并加载匹配审查 skill。
7. 实现完成后，独立子代理产出 final review。
8. P0/P1 返回 apply 修复，再进入 check 与 review。
9. 同一 snapshot 不重复同类 review。
10. handoff 只报告证据，不调用 archive。
