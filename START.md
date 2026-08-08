# Ziggner 本地 vs 云端（先看这张图）

| | **云端（Cloudflare）** | **本地（你的电脑）** |
|---|---|---|
| 是什么 | 商城网页（顾客看到的） | 后端（存数据、处理订单） |
| 在哪 | 网上，全世界都能访问 | 你电脑里，Docker 装着 |
| 谁管它 | 你不用管，自动运行 | 电脑关机它就停 |
| 怎么更新 | 改代码 → `git push origin master` → 等 2-3 分钟自动上线 | 见下面"启动后端" |

> 一句话：**云端是门面，本地是仓库**。仓库不开门，门面就没货。

---

## 你唯一要做的操作：启动后端

电脑开机后，打开 PowerShell，粘贴这行回车：

```
cd D:\下载\浏览器下载\change\Ziggner\Ziggner
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

看到「Started」= 后端起来了，商城就有数据了。

## 访问地址

- 商城：`https://ziggner.huigeli666.workers.dev`
- 管理后台：`https://ziggner.huigeli666.workers.dev/admin`

## 出问题？

把错误截图或文字发给我，我来处理。
