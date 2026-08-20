"""Ziggner 告警渠道中继（Alertmanager webhook → 企业微信 / QQ）。

- /wechat : 转企业微信群机器人（微信生态官方 webhook，markdown 消息）
- /qq     : 转 QQ（OneBot HTTP API，需自建 go-cqhttp/NoneBot 等；未配置则静默 200）

环境变量（.env.monitoring，gitignored）：
  WECHAT_WEBHOOK  企业微信群机器人 webhook（留空则 /wechat 静默 200）
  QQBOT_API       OneBot HTTP 地址，如 http://127.0.0.1:5700
  QQBOT_TOKEN      OneBot access_token
  QQBOT_GROUP_ID  目标 QQ 群号

Alertmanager payload 结构（官方 webhook v4）：
  { status, alerts:[{status, labels, annotations, startsAt, endsAt, generatorURL, fingerprint }], externalURL }
"""
from __future__ import annotations

import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.getenv("RELAY_PORT", "8081"))
WECHAT_WEBHOOK = os.getenv("WECHAT_WEBHOOK", "").strip()
QQBOT_API = os.getenv("QQBOT_API", "").strip()
QQBOT_TOKEN = os.getenv("QQBOT_TOKEN", "").strip()
QQBOT_GROUP_ID = os.getenv("QQBOT_GROUP_ID", "").strip()

SEV_CN = {"critical": "🔴 Critical", "warning": "🟠 Warning", "info": "🔵 Info"}
STATUS_CN = {"firing": "🔥 触发 FIRING", "resolved": "✅ 恢复 RESOLVED"}

SUGGESTIONS = {
    "HostLoadHigh": "检查宿主 top 定位高负载进程；docker stats 看容器占用；持续 >3.0 值班介入",
    "ContainerMemoryHigh": "docker stats 看该容器内存；查日志找泄漏；必要时重启并评估扩容",
    "RedisMemoryHigh": "redis-cli info memory 看构成；--bigkeys 清大键；确认 maxmemory 策略",
    "DjangoDown": "检查 django-app 容器状态与日志；确认 DB/Redis 健康后重启",
}


def _suggestion(alert: dict) -> str:
    name = alert.get("labels", {}).get("alertname", "")
    return SUGGESTIONS.get(name, "查看 Prometheus 面板与容器日志定位根因；critical 立即处理、warning 4h 内处理")


def _render(alert: dict) -> str:
    labels = alert.get("labels", {})
    annotations = alert.get("annotations", {})
    status = alert.get("status", "firing")
    sev = labels.get("severity", "warning")
    name = labels.get("alertname", "Unknown")
    tags = " ".join(f"{k}={v}" for k, v in labels.items())
    when = alert.get("startsAt", "-").replace("T", " ").replace("Z", "")
    end = alert.get("endsAt", "-").replace("T", " ").replace("Z", "")
    tail = f"\n> 恢复时间：{end}" if status == "resolved" else ""
    return (
        f"## {STATUS_CN.get(status, status)} {name}\n"
        f"> 级别：{SEV_CN.get(sev, sev)}　来源：Ziggner 监控\n\n"
        f"**概要**：{annotations.get('summary', '-')}\n"
        f"**详情**：{annotations.get('description', '-')}\n"
        f"**标签**：{tags}\n"
        f"**触发时间**：{when}{tail}\n"
        f"**处理建议**：{_suggestion(alert)}\n"
    )


def _send_wechat(markdown: str) -> None:
    payload = {"msgtype": "markdown", "markdown": {"content": markdown}}
    req = urllib.request.Request(
        WECHAT_WEBHOOK,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        if body.get("errcode") != 0:
            raise RuntimeError(f"企业微信返回 errcode={body.get('errcode')} {body.get('errmsg')}")


def _send_qq(text: str) -> None:
    # OneBot v11 HTTP API：send_group_msg
    url = f"{QQBOT_API.rstrip('/')}/send_group_msg"
    headers = {"Content-Type": "application/json"}
    if QQBOT_TOKEN:
        headers["Authorization"] = f"Bearer {QQBOT_TOKEN}"
    payload = {"group_id": int(QQBOT_GROUP_ID), "message": text}
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        resp.read()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # 静默访问日志
        pass

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            self._resp(400, {"error": "bad json"})
            return

        alerts = payload.get("alerts", [])
        if self.path == "/wechat":
            if not WECHAT_WEBHOOK:
                print("[relay] 未配置 WECHAT_WEBHOOK，跳过微信推送")
                self._resp(200, {"skipped": "wechat not configured"})
                return
            try:
                for a in alerts:
                    _send_wechat(_render(a))
                print(f"[relay] 微信推送 {len(alerts)} 条成功")
                self._resp(200, {"ok": len(alerts)})
            except Exception as exc:
                print(f"[relay] 微信推送失败: {exc}")
                self._resp(502, {"error": str(exc)})
        elif self.path == "/qq":
            if not (QQBOT_API and QQBOT_GROUP_ID):
                print("[relay] 未配置 QQBOT_API/QQBOT_GROUP_ID，跳过 QQ 推送")
                self._resp(200, {"skipped": "qq not configured"})
                return
            try:
                for a in alerts:
                    _send_qq(_render(a))
                print(f"[relay] QQ 推送 {len(alerts)} 条成功")
                self._resp(200, {"ok": len(alerts)})
            except Exception as exc:
                print(f"[relay] QQ 推送失败: {exc}")
                self._resp(502, {"error": str(exc)})
        else:
            self._resp(404, {"error": f"unknown path {self.path}"})

    def _resp(self, code: int, obj: dict):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    print(f"[relay] 启动 :{PORT}  wechat={bool(WECHAT_WEBHOOK)} qq={bool(QQBOT_API)}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
