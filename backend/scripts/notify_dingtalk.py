"""
钉钉机器人通知（大厂规范 - 每日回归结果推送）。

用法：
  python scripts/notify_dingtalk.py "标题" "内容markdown" [--webhook URL] [--secret SECRET]

- webhook 默认取环境变量 DINGTALK_WEBHOOK（CI secret 注入）
- 若配置了加签 secret（DINGTALK_SECRET），自动按钉钉签名算法计算 sign
- 未配置 webhook 时仅打印消息（本地调试/降级），不报错

CI 用法（nightly 回归 job）：
  python scripts/notify_dingtalk.py "Ziggner 每日回归 $(date)" "$(cat allure-summary.md)"
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import os
import time
import urllib.request
import urllib.parse
import json
import sys


def _sign(secret: str, timestamp: int) -> str:
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(
        secret.encode("utf-8"), string_to_sign.encode("utf-8"), digestmod=hashlib.sha256
    ).digest()
    return urllib.parse.quote_plus(base64.b64encode(hmac_code))


def send(title: str, markdown: str, webhook: str, secret: str | None = None) -> None:
    payload = {
        "msgtype": "markdown",
        "markdown": {"title": title, "text": markdown},
    }
    url = webhook
    if secret:
        ts = int(round(time.time() * 1000))
        url = f"{webhook}&timestamp={ts}&sign={_sign(secret, ts)}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        if body.get("errcode") != 0:
            raise RuntimeError(f"钉钉返回错误: {body}")


def main() -> int:
    parser = argparse.ArgumentParser(description="推送 markdown 消息到钉钉机器人")
    parser.add_argument("title")
    parser.add_argument("content")
    parser.add_argument("--webhook", default=os.getenv("DINGTALK_WEBHOOK", ""))
    parser.add_argument("--secret", default=os.getenv("DINGTALK_SECRET", ""))
    args = parser.parse_args()

    if not args.webhook:
        print("[dingtalk] 未配置 DINGTALK_WEBHOOK，仅本地打印（降级不报错）：")
        print(f"[dingtalk] title={args.title}\n{args.content}")
        return 0

    try:
        send(args.title, args.content, args.webhook, args.secret or None)
        print("[dingtalk] 已推送")
        return 0
    except Exception as exc:  # noqa: BLE001 - 通知失败不应阻断 CI 主流程
        print(f"[dingtalk] 推送失败（降级不报错）: {exc}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
