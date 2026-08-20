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

## 已知覆盖边界：MySQL 主从切换 / 只读模式

**当前生产为单实例 MySQL（命名卷 `mysql_data`，无副本拓扑）**，因此：

- ❌ 「主从切换」真实演练**不可执行**——不存在 standby/read-replica 可切换。
  若需该能力，前置条件是先构建副本拓扑（如 MySQL binlog 复制或 Group Replication）
  并在应用层实现「故障时切只读库 / 只读模式（GET 直连副本、写请求排队或拒绝）」
  后再增加 `chaos_failover.sh`（stop 主库 → 验证读流量切副本 → 写被拒/降级 → 回切）。
- ✅ 单实例设计下**最强等价演练**即 `chaos_mysql.sh`：整库宕机 → 进程存活、
  请求降级为缓存兜底（200）或业务 5xx JSON 信封（非进程崩溃）→ 恢复自愈。
- ⚠️ 在 2C4G 资源预算内，副本常驻内存（~640MB/实例）会挤压应用配额；
  建议在预算扩容后再引入副本拓扑，并将「只读降级」纳入应用层设计（当前未实现）。

> 结论：降级策略（Redis 缓存 fail-silent、DB 宕机兜底）已由三脚本在测试拓扑实测全绿；
> 主从切换属「待具备副本拓扑后补充」的演练项，已在监控告警与本文档中明确边界。
