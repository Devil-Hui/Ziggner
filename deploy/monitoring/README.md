# Ziggner 生产监控（Prometheus + Grafana + Alertmanager）

## 快速开始

```bash
cd deploy/monitoring
cp .env.monitoring.example .env.monitoring   # 填写 SMTP / 钉钉凭据（已 gitignored）
docker compose -f docker-compose.monitoring.yml up -d
```

## 组件与入口

| 服务 | 容器 | 宿主端口 | 说明 |
|---|---|---|---|
| Prometheus | ziggner-prometheus | 9090 | 抓取 + 告警规则（30 天存储） |
| Alertmanager | ziggner-alertmanager | 9093 | 告警路由：邮件 + 钉钉 |
| dingtalk-hook | ziggner-dingtalk-hook | 8060 | 钉钉 webhook 转换（未配 DINGTALK_WEBHOOK 时勿启动） |
| Grafana | ziggner-grafana | 3000 | 预置 Dashboard（Ziggner 生产概览） |
| node-exporter | ziggner-node-exporter | 9100 | 宿主 load/mem/disk |
| cadvisor | ziggner-cadvisor | 8080 | 容器级 CPU/内存 |
| redis-exporter | ziggner-redis-exporter | 9121 | Redis 内存/命中率 |

## 告警规则（alerts.yml）

| 规则 | 表达式 | 阈值 | 渠道 |
|---|---|---|---|
| HostLoadHigh | `node_load1` | >2.0 持续 5m | 邮件+钉钉 |
| ContainerMemoryHigh | 容器内存/限额 | >75% 持续 5m | 邮件+钉钉 |
| RedisMemoryHigh | `redis_memory_used_bytes` | >512MB 持续 5m | 邮件+钉钉 |
| DjangoDown | `up{job="django"}` | 0 持续 3m | 邮件+钉钉 |

告警邮件统一发到 **deaven-hui@ziggner.com**（SMTP 复用生产 163 账户，凭据在 `.env.monitoring`）。

## 钉钉告警（可选）

`.env.monitoring` 配置 `DINGTALK_WEBHOOK`（+ 加签 `DINGTALK_SECRET`）后重启 dingtalk-hook 即生效。
未配置时**不要**启动 dingtalk-hook（启动会失败），删除该服务或留空即可——告警仍走邮件。

## 验证

```bash
# Prometheus targets 全部 up
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'
# 手动触发测试告警（会真实发邮件到 deaven-hui@ziggner.com）
curl -s -XPOST localhost:9093/api/v2/alerts -d '[{"labels":{"alertname":"TestAlert"},"annotations":{"summary":"监控链路测试"}}]'
# Grafana 查看 Ziggner 生产概览
open http://localhost:3000   # admin / ${GF_ADMIN_PASSWORD}
```

## 混沌演练联动

故障注入脚本（backend/scripts/chaos/）执行期间监控应触发对应告警，作为降级/自愈的旁证。
