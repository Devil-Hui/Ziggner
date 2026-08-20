"""
混沌故障自动提单（大厂规范 - 混沌测试发现超卖/数据不一致 → 自动生成 JIRA 问题单）。

用法：
  python scripts/chaos_fail_issue.py --subject "订单库存超卖" --body "并发下单后 SELECT SUM(stock) 对账不一致…" \
      [--owner zhangsan]

配置（环境变量，缺失则降级为打印待办，不报错）：
  JIRA_URL / JIRA_USER / JIRA_API_TOKEN / JIRA_PROJECT（默认 TEST）
  JIRA_ISSUE_TYPE（默认 Bug）

CI 用法（chaos job 中，发现失败时调用）：
  python scripts/chaos_fail_issue.py --subject "..." --body "$(cat /tmp/oversell.txt)"
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.request


def create_issue(subject: str, body: str, owner: str | None) -> str | None:
    url = os.getenv("JIRA_URL", "")
    user = os.getenv("JIRA_USER", "")
    token = os.getenv("JIRA_API_TOKEN", "")
    project = os.getenv("JIRA_PROJECT", "TEST")
    issue_type = os.getenv("JIRA_ISSUE_TYPE", "Bug")
    if not (url and user and token):
        print("[jira] 未配置 JIRA_URL/JIRA_USER/JIRA_API_TOKEN，降级为本地待办（不创建工单）")
        return None

    payload = {
        "fields": {
            "project": {"key": project},
            "summary": subject,
            "description": body,
            "issuetype": {"name": issue_type},
        }
    }
    if owner:
        payload["fields"]["assignee"] = {"name": owner}
    auth = base64.b64encode(f"{user}:{token}".encode()).decode()
    req = urllib.request.Request(
        f"{url}/rest/api/2/issue",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
    key = data.get("key")
    print(f"[jira] 已创建问题单 {key}: {subject}")
    return key


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--subject", required=True)
    parser.add_argument("--body", required=True)
    parser.add_argument("--owner", default=os.getenv("CHAOS_OWNER", ""))
    args = parser.parse_args()
    create_issue(args.subject, args.body, args.owner or None)
    return 0  # 提单失败/降级不阻断主流程，但主流程由 chaos 测试本身的断言决定


if __name__ == "__main__":
    sys.exit(main())
