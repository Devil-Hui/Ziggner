#!/usr/bin/env bash
# =============================================================================
# 混沌演练：MySQL 故障注入（测试拓扑，不碰生产）
#
# 目标：验证「数据库宕机 → Django 进程不崩溃、错误被优雅处理（业务 500 信封
# 而非进程退出），恢复后自愈」。
#
# 用法：
#   bash scripts/chaos/chaos_mysql.sh
# =============================================================================
set -uo pipefail

TEST_MYSQL=${TEST_MYSQL:-ziggner-test-mysql}
TEST_REDIS=${TEST_REDIS:-ziggner-test-redis}
WEB_CONTAINER=ziggner-chaos-web
PROBE_URL="http://localhost:8001/api/v1/goods/spu"
BACKEND_SRC="$(cd "$(dirname "$0")/../../.." && pwd)/backend"

PASS=0; FAIL=0
ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

cleanup() { docker rm -f "$WEB_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> [1/4] 启动被测 Django"
docker rm -f "$WEB_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$WEB_CONTAINER" --network ziggner-test-net \
  -v "$BACKEND_SRC":/backend -w /backend \
  -e DJANGO_SETTINGS_MODULE=project.config.settings.dev \
  -e DB_ENGINE=django.db.backends.mysql -e DB_HOST="$TEST_MYSQL" -e DB_PORT=3306 \
  -e DB_NAME=ziggner_test -e DB_USER=ziggner_test -e DB_PASSWORD=ziggner_test \
  -e REDIS_URL="redis://$TEST_REDIS:6379/1" -e REDIS_SLAVE_URL="redis://$TEST_REDIS:6379/1" \
  -e DJANGO_SECRET_KEY=test-only-secret-key-not-for-production \
  -e THROTTLE_RATES='{"anon":"100000/hour","user":"100000/hour"}' -e RATE_LIMITS='{}' \
  -e ENABLE_MOCK_PAYMENT=true -e FILE_STORAGE=local \
  --entrypoint python ziggner-django:v1.0.2 manage.py runserver 0.0.0.0:8001 --noreload >/dev/null 2>&1

for i in $(seq 1 30); do
  docker exec "$WEB_CONTAINER" python -c "import urllib.request; urllib.request.urlopen('$PROBE_URL', timeout=3)" >/dev/null 2>&1 && break
  sleep 1
done

echo "==> [2/4] 故障注入：停止 MySQL"
docker stop "$TEST_MYSQL" >/dev/null 2>&1
sleep 3

echo "==> [3/4] 验证：DB 宕机期间进程存活 + 错误被优雅封装"
if docker ps --format '{{.Names}}' | grep -q "^$WEB_CONTAINER$"; then
  ok "Django 进程存活（DB 宕机未导致进程退出）"
else
  bad "Django 进程退出——需要 DB 存活，降级失败"
fi

# 探活接口应返回明确的业务错误信封（5xx JSON），而非 TCP 无响应/进程崩溃
resp=$(docker exec "$WEB_CONTAINER" python -c "
import urllib.request, json
try:
    r = urllib.request.urlopen('$PROBE_URL', timeout=10)
    print(r.status, 'OK')
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', 'ignore')[:120]
    print(e.code, body)
except Exception as e:
    print('UNREACHABLE', type(e).__name__)
" 2>/dev/null)
echo "  DB 宕机时探活结果: $resp"
if echo "$resp" | grep -qE "^(200|5[0-9][0-9])"; then
  ok "降级生效（200=缓存兜底 / 5xx=错误封装，进程未崩溃）"
else
  bad "响应异常：$resp"
fi

echo "==> [4/4] 恢复并验证自愈"
docker start "$TEST_MYSQL" >/dev/null 2>&1
sleep 8
if docker exec "$WEB_CONTAINER" python -c "import urllib.request; r=urllib.request.urlopen('$PROBE_URL', timeout=5); assert r.status==200" >/dev/null 2>&1; then
  ok "自愈：DB 恢复后接口 200"
else
  bad "自愈失败：DB 恢复后接口仍异常"
fi

echo ""
echo "========== 混沌演练（MySQL）结果：PASS=$PASS FAIL=$FAIL =========="
[ "$FAIL" -eq 0 ] && echo "降级策略验证通过 ✅" || echo "降级策略存在缺口 ⚠️"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
