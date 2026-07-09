# Ziggner Git Commit Convention

## Commit Message Format

每条 commit 使用 **Conventional Commits** 格式：

```
<type>: <简短描述>

<详细说明（可选）>
```

### Type

| Type | 说明 |
|------|------|
| `feat` | 新功能（feature） |
| `fix` | Bug 修复 |
| `chore` | 构建、依赖、工具配置等杂项 |
| `docs` | 文档更新 |
| `refactor` | 重构（既不修复 bug 也不增加功能） |
| `test` | 测试相关 |
| `style` | 代码格式调整（不影响逻辑） |
| `perf` | 性能优化 |

### 示例

```
feat: add user login API with JWT authentication

Implements POST /api/users/login endpoint with access/refresh token flow.
```

```
fix: resolve cart total calculation overflow

Fixed rounding error when discount coupon is applied to bulk items.
```

```
chore: upgrade django to 5.1.4

Pins Django 5.1.4 with security patch CVE-2024-xxxxx.
```

```
docs: update API endpoint list in README
```

---

## Branch Naming

```
<type>/<简短描述>
```

| 示例 | 说明 |
|------|------|
| `feat/user-auth` | 新功能 |
| `fix/login-redirect` | Bug 修复 |
| `chore/deps-update` | 依赖/工具更新 |
| `docs/api-readme` | 文档更新 |
| `refactor/order-service` | 重构 |

> 使用 kebab-case（短横线连接），全部小写。

---

## PR 规范

1. **PR 标题**：与 commit message 风格一致，如 `feat: add user login API`
2. **PR 描述**：使用 PR template 填写，说明改动内容和原因
3. **PR 大小**：尽量保持小型、聚焦 —— 一个 PR 只做一件事
4. **合并方式**：**Squash merge** —— PR 的所有 commit 压缩为一条合并到 master
5. **Review 要求**：至少 1 人 approve 后方可合并

---

## 工作流

```
master ─────●────●────●────●────●─── (始终可部署)
             \  /      \  /
              ●         ●          (短期 feature 分支)
```

### 开发流程

1. 从最新 master 切分支：
   ```bash
   git fetch origin
   git checkout -b feat/my-feature origin/master
   ```
2. 开发并提交（可多次 commit）
3. PR 前与 master 对齐：
   ```bash
   git fetch origin
   git rebase origin/master
   ```
4. 推送并创建 PR
5. 通过 review → squash merge 合入 master
6. 删除远程分支

---

*一份干净的历史，比一份快速的历史更有价值。*
