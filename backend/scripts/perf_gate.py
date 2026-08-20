"""
性能门禁（大厂规范 - 性能未达基线 → WARNING + 强制人工 Review）。

输入：Locust 无头模式产出的 stats CSV（--csv=prefix 生成 prefix_stats.csv）
     或 k6 的 JSON 摘要（--summary-export 生成 .json，含 metrics.http_req_duration.p95）。

判定基线（可被环境变量覆盖）：
  P95 < 500ms（PERF_P95_MS）
  TPS ≥ 设定值 80%（PERF_MIN_TPS 为设定值；实际 TPS 低于其 80% 判失败）

行为：
  - 达标     → 打印 PASS，退出 0
  - 未达标   → 打印 [PERF-WARNING] 与明细，退出 1（CI 中该 job continue-on-error，
              但会强制人工 Review：PR 评论 / 通知模块 Owner）

用法：
  python scripts/perf_gate.py --locust-csv path/to/stats.csv
  python scripts/perf_gate.py --k6-json path/to/summary.json --min-tps 100 --p95-ms 500
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path

P95_LIMIT_MS = float(os.getenv("PERF_P95_MS", "500"))
MIN_TPS = float(os.getenv("PERF_MIN_TPS", "100"))
TPS_TOLERANCE = float(os.getenv("PERF_TPS_TOLERANCE", "0.80"))  # 低于设定值 80% 即失败


def _p95_locust(csv_path: Path) -> tuple[float, float]:
    """locust stats CSV → (p95_ms, rps)。列：Name,# Requests,Failures,Median,Average,Min,Max,p95,..."""
    p95, rps = 0.0, 0.0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("Name") or "").strip()
            if name.startswith("Aggregated"):
                p95 = float(row.get("95%") or 0)
                rps = float(row.get("Requests/s") or 0)
                break
    return p95, rps


def _p95_k6(json_path: Path) -> tuple[float, float]:
    """k6 summary.json → (p95_ms, rps)。结构：metrics.http_req_duration.values.p(95.000000)"""
    data = json.loads(json_path.read_text(encoding="utf-8"))
    m = data.get("metrics", {})
    dur = m.get("http_req_duration", {}).get("values", {})
    p95 = float(dur.get("p(95.000000)", 0) or 0) * 1000.0  # k6 单位秒 → ms
    iters = m.get("iterations", {}).get("values", {})
    # rps 用 http_reqs 增量 / 时间窗
    reqs = m.get("http_reqs", {}).get("values", {})
    rps = float(reqs.get("rate", 0) or 0)
    return p95, rps


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locust-csv")
    parser.add_argument("--k6-json")
    parser.add_argument("--min-tps", type=float, default=MIN_TPS)
    parser.add_argument("--p95-ms", type=float, default=P95_LIMIT_MS)
    args = parser.parse_args()

    if args.locust_csv:
        p95, rps = _p95_locust(Path(args.locust_csv))
    elif args.k6_json:
        p95, rps = _p95_k6(Path(args.k6_json))
    else:
        print("[perf] 需要 --locust-csv 或 --k6-json 之一")
        return 2

    tps_limit = args.min_tps * TPS_TOLERANCE
    p95_ok = p95 < args.p95_ms
    tps_ok = rps >= tps_limit
    print(f"[perf] p95={p95:.0f}ms (基线 <{args.p95_ms:.0f}ms) | TPS={rps:.1f} (基线 ≥{tps_limit:.1f})")

    if p95_ok and tps_ok:
        print("[perf] PASS")
        return 0
    print("[perf][PERF-WARNING] 性能未达基线 —— 需强制人工 Review：")
    if not p95_ok:
        print(f"  - P95 {p95:.0f}ms 超过基线 {args.p95_ms:.0f}ms")
    if not tps_ok:
        print(f"  - TPS {rps:.1f} 低于设定值 {args.min_tps:.0f} 的 {TPS_TOLERANCE*100:.0f}%")
    return 1


if __name__ == "__main__":
    sys.exit(main())
