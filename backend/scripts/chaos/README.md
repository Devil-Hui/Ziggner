# Ziggner 混沌工程 / 故障演练

> 目标：主动注入故障，**验证降级策略真实生效**（而非只在测试用例里断言）。
> 全部脚本针对 **docker-compose.test.yml 测试拓扑**，不碰生产容器。

## 演练清单

| 脚本 | 注入故障 | 验证点 |
|---|---|---|
| `chaos_redis.sh` | `docker stop ziggner-test-redis` | Redis 宕机期间 Django 进程存活、接口非 5xx 崩溃；恢复后自愈 |
| `chaos_mysql.sh` | `docker stop ziggner-test-mysql` | DB 宕机期间错误被优雅封装（5xx JSON 信封）、进程不退出；恢复自愈 |
| `chaos_r2.sh` | FILE_STORAGE=r2 + 端点指向不可达地址 | R2 不可达时上传优雅失败、进程存活 |

## 用法

```bash
# 前置：测试拓扑依赖已就绪
cd backend && docker compose -f docker-compose.test.yml up -d db redis

# 逐项演练（脚本会自动起临时被测 Django 并清理）
bash scripts/chaos/chaos_redis.sh
bash scripts/chaos/chaos_mysql.sh
bash scripts/chaos/chaos_r2.sh
```

退出码：0 = 降级验证通过；1 = 存在缺口（脚本会打印失败点）。

## 生产演练注意事项（谨慎操作，需低峰 + 值班）

1. 生产 Redis / MySQL 故障注入**会中断线上服务**，必须：
   - 提前通知相关方（钉钉群/邮件），确认无进行中的大促/备份任务
   - 演练窗口建议 < 2 分钟，Redis 恢复靠 `docker start`（数据在内存，注意 `--save ""` 不持久化，演练前确认无需保留的缓存）
2. 生产 R2 演练：临时把 `FILE_STORAGE` 指向错误端点会污染运行时配置，建议改为**停 tunnel-nginx / 防火墙断连**模拟，或使用单独的测试域名。
3. 演练结束后检查：`docker ps` 全部 healthy、监控告警无残留 firing、业务日志无持续报错。

## 与监控联动

演练期间 Prometheus 应产生对应告警（`DjangoDown` / `RedisMemoryHigh` 等），
可在 Alertmanager 面板确认告警被正确路由到邮件（deaven-hui@ziggner.com）与钉钉，
作为「故障可观测」的旁证。
