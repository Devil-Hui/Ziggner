# Ziggner Git 工作流规范（小白版）

> 这是给整个团队用的 Git 操作指南。如果你是第一次用 Git，按这个步骤来就行。

---

## 📝 一、每次提交写什么？（Commit Message）

每条提交都要写清楚**做了什么事**，格式如下：

```
<类型>: <简短的描述>
```

### 类型（选一个）

| 类型 | 什么时候用 | 例子 |
|------|-----------|------|
| `feat` | **加新功能** | `feat: add user login API` |
| `fix` | **修 Bug** | `fix: fix cart total calculation` |
| `chore` | **改工具/配置/依赖** | `chore: upgrade django to 5.1.4` |
| `docs` | **写文档** | `docs: add commit convention guide` |
| `refactor` | **重构代码**（不改功能也不修 Bug） | `refactor: simplify order service` |
| `test` | **写测试** | `test: add login API test cases` |
| `style` | **改格式**（缩进、分号等，不影响代码逻辑） | `style: format code with prettier` |
| `perf` | **性能优化** | `perf: cache product list query` |

### 示例（新手照着写）

```
# 加功能
feat: add user login API

# 修 Bug
fix: resolve cart total calculation overflow

# 改配置/工具
chore: upgrade django to 5.1.4

# 写文档
docs: add commit convention guide

# 重构
refactor: extract payment logic to service class
```

> 💡 描述用**英文**，简短（别超过 50 个字符）。如果一行写不完说明这个提交太大了，拆分成多个。

---

## 🌿 二、分支怎么命名？（Branch Naming）

每次开发新东西，都从 master 切出一个**新分支**，命名规则：

```
<类型>/<简短描述>
```

| 示例 | 说明 |
|------|------|
| `feat/user-auth` | 加登录功能 |
| `fix/login-redirect` | 修登录跳转 Bug |
| `chore/deps-update` | 更新依赖 |
| `docs/readme-update` | 更新 README |
| `refactor/order-service` | 重构订单服务 |

> 全部**小写**，单词之间用**短横线**连（kebab-case）。

---

## 🔁 三、完整工作流程（从开始到结束）

### 第一步：开始一个新功能

```bash
# 1. 切换到 master，拉取最新代码
git checkout master
git pull origin master

# 2. 从 master 创建新分支
git checkout -b feat/你的功能名 origin/master

# 3. 开始写代码...
```

### 第二步：提交你的修改

```bash
# 看改了哪些文件
git status

# 添加文件（逐个添加，保持每个提交只做一件事）
git add 文件名

# 提交（写清楚做了什么）
git commit -m "feat: 这里写你做了什么"
```

### 第三步：推送并创建 PR

```bash
# 1. 推送你的分支到 GitHub
git push origin feat/你的功能名

# 2. 打开 GitHub，会看到一个黄色的提示条，点 "Compare & pull request"
#    或者手动去 https://github.com/Devil-Hui/Ziggner/pulls 点 "New pull request"

# 3. 填写 PR（Pull Request）：
#    - 标题：和 commit message 一样
#    - 描述：写你改了啥、为什么改
#    - Reviewers：选团队成员
```

### 第四步：等 CI 检查通过

PR 创建后，GitHub 会自动运行 CI 检查（代码检测 + 测试）。

**在哪里看 CI 结果？**

- 在 PR 页面往下翻，看到 **「Checks」** 或 **「All checks have passed」**
- 或者去 GitHub 顶部菜单点 **「Actions」** 标签页
- 三个检查全部绿色 ✔️ 才能合并

### 第五步：合并到 master

CI 全部通过后：

1. 在 PR 页面找到绿色的 **「Merge pull request」** 按钮
2. 点它旁边的 ▼ 下拉箭头，选择 **「Squash and merge」**（一定要选这个！）
3. 点 **「Squash and merge」** 按钮
4. 再点 **「Confirm merge」**

> ⚠️ 一定要选 **Squash and merge**，不要选 "Create a merge commit" 或 "Rebase and merge"

### 第六步：收尾

```bash
# 1. 切回 master 拉取最新代码
git checkout master
git pull origin master

# 2. 删除本地分支（代码已经合进去了，分支可以删了）
git branch -d feat/你的功能名
```

---

## 🚫 四、安全红线（绝对不能做的事）

| ❌ 禁止做的事 | 为什么 |
|:-------------|:-------|
| **直接 push 到 master** | master 受保护，必须走 PR |
| **Force push（强制推送）** | `git push --force` 会覆盖别人的代码 |
| **合并方式选错** | 只能用 **Squash and merge** |
| **一个 PR 改太多东西** | 每个 PR 只做一件事，方便回滚 |
| **提交信息乱写** | 比如 "fix bug"、"update"、"test" 这些都没用 |
| **不拉最新代码就开发** | 不 pull master 就开始写，合并时冲突一大堆 |

---

## 🛡️ 五、安全红线补充（Git 层面）

| 规则 | 说明 |
|:----|:------|
| **Atomic commits（原子提交）** | 每个提交只做一件事，可以独立回滚 — 绝不把"加功能"和"改格式"混在一起 |
| **force-push（强制推送）** | 永远不要在共享分支上 force push。如果真的必须用，用 `--force-with-lease`（安全版 force push） |
| **Branch from latest（从最新版本切分支）** | 开新分支前，先 `git pull origin master`，确保从最新代码开始 |
| **Conventional Commits** | 提交信息用上面规定的格式，团队统一 |
| **Rebase before PR（PR 前对齐）** | PR 合入前先用 `git rebase origin/master` 把分支和 master 对齐 |

---

## 🤔 六、常见问题（小白必看）

### Q：我提交错了怎么办？

```bash
# 如果只是最近一次提交写错了字，可以改：
git commit --amend -m "fix: 正确的提交信息"
git push origin 分支名 --force-with-lease

# 如果已经提交了好几次想重来：
# 找我来帮你
```

### Q：我的分支落后 master 了怎么办？

```bash
git fetch origin
git rebase origin/master
# 如果有冲突，解决后 git add 再 git rebase --continue
git push origin 分支名 --force-with-lease
```

### Q：CI 失败了怎么看？

1. 打开你的 PR 页面
2. 往下翻到 **「Checks」** 区域
3. 看到红色 ❌ 的地方，点 **「Details」** 看具体错误

或者去 GitHub → **Actions** 标签页，找到最新的 run，点进去看是哪个 Job 红了。

### Q：PR 合并后要不要删分支？

要！GitHub 上合并后会有个 **「Delete branch」** 按钮，点一下。
本地也要删：

```bash
git checkout master
git pull origin master
git branch -d 你的分支名
```

---

*一份干净的历史，比一份快速的历史更有价值。*
