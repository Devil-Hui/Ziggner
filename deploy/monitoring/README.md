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
| Alertmanager | ziggner-alertmanager | 9093 | 告警路由：邮件 + 微信/QQ + 钉钉（多渠道并行） |
| webhook-relay | ziggner-webhook-relay | — | 渠道中继：Alertmanager → 企业微信 / QQ |
| dingtalk-hook | ziggner-dingtalk-hook | 8060 | 钉钉 webhook 转换（未配 DINGTALK_WEBHOOK 时勿启动） |
| Grafana | ziggner-grafana | 3000 | 预置 Dashboard（Ziggner 生产概览） |
| node-exporter | ziggner-node-exporter | 9100 | 宿主 load/mem/disk |
| cadvisor | ziggner-cadvisor | 8080 | 容器级 CPU/内存 |
| redis-exporter | ziggner-redis-exporter | 9121 | Redis 内存/命中率 |

## 告警规则（alerts.yml）

| 规则 | 表达式 | 阈值 | 渠道 |
|---|---|---|---|
| HostLoadHigh | `node_load1` | >2.0 持续 5m | 邮件 + 微信/QQ/钉钉 |
| ContainerMemoryHigh | 容器内存/限额 | >75% 持续 5m | 邮件 + 微信/QQ/钉钉 |
| RedisMemoryHigh | `redis_memory_used_bytes` | >512MB 持续 5m | 邮件 + 微信/QQ/钉钉 |
| DjangoDown | `up{job="django"}` | 0 持续 3m | 邮件 + 微信/QQ/钉钉 |

## 告警渠道（多渠道并行）

| 渠道 | 配置（.env.monitoring） | 说明 |
|---|---|---|
| 邮件（必达） | `ALERT_EMAIL_*`（163 SMTP） | 大厂规范 HTML 模板（templates/alertmanager-email.tmpl），发至 deaven-hui@ziggner.com |
| 企业微信 | `WECHAT_WEBHOOK` | 企业微信群 → 添加群机器人 → 复制 Webhook；中继 ziggner-webhook-relay 转 markdown |
| QQ | `QQBOT_API` / `QQBOT_TOKEN` / `QQBOT_GROUP_ID` | 需自建 OneBot 实例（go-cqhttp/NoneBot）；未配置自动跳过 |
| 钉钉（可选） | `DINGTALK_WEBHOOK`（+`DINGTALK_SECRET`） | 保留并行，未配则不启动 dingtalk-hook |

> 注意：个人微信无官方 API、QQ 无官方告警 Webhook。微信渠道的合规落地=**企业微信群机器人**；
> QQ 渠道需 OneBot 兼容服务（涉及账号风控，评估后使用）。所有渠道独立失败互不影响。

### 邮件模板（大厂规范）

`templates/alertmanager-email.tmpl`：结构化字段（告警级别/名称/触发时间/恢复时间/当前状态/
标签 Labels/注解 Annotations/来源链接/处理建议）+ 层级排版（深色头部 + 状态徽章 + 表格 + 建议高亮）。
修改模板后：`docker compose -f docker-compose.monitoring.yml up -d alertmanager` 生效。

## 验证

```bash
# Prometheus targets 全部 up
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'
# 手动触发测试告警（会真实发邮件到 deaven-hui@ziggner.com + 微信/QQ/钉钉）
curl -s -XPOST localhost:9093/api/v2/alerts -d '[{"labels":{"alertname":"TestAlert"},"annotations":{"summary":"监控链路测试"}}]'
# Grafana 查看 Ziggner 生产概览
open http://localhost:3000   # admin / ${GF_ADMIN_PASSWORD}
```

## 混沌演练联动

故障注入脚本（backend/scripts/chaos/）执行期间监控应触发对应告警，作为降级/自愈的旁证。
