# Workflow Deploy Unblock Design

**日期：** 2026-04-10

**目标：**
停用 `quality-gate.yml` 的自动质量门禁触发，同时让 `deploy-cloudflare.yml` 与 `deploy-pages.yml` 在 `main/master` 分支推送时直接触发部署，并保留手动触发入口。

**当前问题：**
- `deploy-cloudflare.yml` 依赖 `workflow_run: Quality Gate`
- `deploy-pages.yml` 依赖 `workflow_run: Quality Gate`
- `quality-gate.yml` 会在 `push`、`pull_request`、`schedule` 下自动运行

这意味着部署链路被质量门禁前置绑定，任何质量门禁失败或停用都会阻断部署。

**采用方案：**
1. 将 `quality-gate.yml` 的触发缩减为 `workflow_dispatch`，仅保留手动执行能力。
2. 将 `deploy-cloudflare.yml` 改为 `push` 到 `main/master` 和 `workflow_dispatch` 直接触发。
3. 将 `deploy-pages.yml` 改为 `push` 到 `main/master` 和 `workflow_dispatch` 直接触发。
4. 删除两个部署 workflow 中仅为 `workflow_run` 服务的条件判断，改用当前事件上下文的 `github.sha` / `github.ref_name`。

**不做的事：**
- 不修改部署步骤、构建命令、Secrets 名称。
- 不删除 `quality-gate.yml` 文件。
- 不引入新的环境变量、分支策略或审批逻辑。

**风险与影响：**
- 变更后，主分支 push 会直接部署，质量门禁不再自动拦截。
- 如果需要保留上线前校验，只能通过手动执行 `Quality Gate`。
- 该改动是流程策略调整，不是部署逻辑调整。

**验证方式：**
- 校验三个 workflow YAML 语法可解析。
- 确认 `deploy-cloudflare.yml` 和 `deploy-pages.yml` 已不再包含 `workflow_run: Quality Gate`。
- 确认 `quality-gate.yml` 仅保留 `workflow_dispatch`。
