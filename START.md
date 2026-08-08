# Ziggner 使用指南（小白版）

> 你只需要记住 **3 件事**：怎么启动、怎么访问、怎么更新。其他全不用管。

---

## 第 1 件事：启动后端

电脑开机后，打开 PowerShell，粘贴这一行回车：

```
cd D:\下载\浏览器下载\change\Ziggner\Ziggner
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

看到「Started」就是启动成功了。之后电脑不要关机、不要关这个窗口。

> 💡 平时电脑不关机的话，这一步只需要做一次。重启电脑后重复这一步。

---

## 第 2 件事：访问网站

| 网站 | 地址 | 谁用 |
|------|------|------|
| 商城（顾客看） | `https://ziggner.huigeli666.workers.dev` | 所有人 |
| 管理后台（你运营用） | `https://ziggner.huigeli666.workers.dev/admin` | 你 |

> 手机、电脑、任何浏览器都能打开，不需要开你电脑上的程序。

---

## 第 3 件事：更新网站

改完代码后，回到项目文件夹，依次执行 3 行：

```
git add -A
git commit -m "这次改了什么"
git push origin master
```

等 **2-3 分钟**，Cloudflare 自动帮你把新页面部署上线。就这么简单。

---

## 出问题了？

**先别慌，把你看到的错误信息截图或复制给我，我来处理。**

可以提前记一下查状态的命令（出问题时用）：

```
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

（上面这行会告诉你后端是不是正常在跑。其他都不用管。）
